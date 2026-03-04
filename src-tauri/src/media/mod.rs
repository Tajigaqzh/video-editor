use anyhow::{Context, Result};
use std::collections::HashSet;
use std::fs;
use std::path::{Component, Path, PathBuf};
use std::time::{Duration, SystemTime};

const SECONDS_PER_DAY: u64 = 24 * 60 * 60;

#[derive(Debug, Clone)]
struct TempFileEntry {
    path: PathBuf,
    relative_path: String,
    size: u64,
    modified: SystemTime,
}

#[derive(Debug, Clone, Default, serde::Serialize)]
pub struct TempCleanupReport {
    pub scanned_files: usize,
    pub keep_candidates: usize,
    pub removed_by_unused: usize,
    pub removed_by_ttl: usize,
    pub removed_by_size: usize,
    pub removed_bytes: u64,
    pub total_size_before: u64,
    pub total_size_after: u64,
}

fn normalize_slashes(path: &str) -> String {
    path.replace('\\', "/")
}

fn sanitize_relative_path(relative_path: &str) -> Option<String> {
    let mut parts: Vec<String> = Vec::new();
    for component in Path::new(relative_path).components() {
        match component {
            Component::Normal(part) => parts.push(part.to_string_lossy().to_string()),
            Component::CurDir => {}
            Component::ParentDir | Component::RootDir | Component::Prefix(_) => return None,
        }
    }

    if parts.is_empty() {
        return None;
    }

    Some(parts.join("/"))
}

fn normalize_temp_relative(path: &str) -> Option<String> {
    let normalized = normalize_slashes(path);
    let trimmed = normalized.trim();
    if trimmed.is_empty() {
        return None;
    }

    let from_temp = if let Some(index) = normalized.find("/temp/") {
        &normalized[(index + "/temp/".len())..]
    } else if let Some(rest) = normalized.strip_prefix("temp/") {
        rest
    } else if let Some(rest) = normalized.strip_prefix("./temp/") {
        rest
    } else {
        normalized.trim_start_matches('/')
    };

    sanitize_relative_path(from_temp)
}

fn modified_epoch_seconds(modified: SystemTime) -> u64 {
    modified
        .duration_since(SystemTime::UNIX_EPOCH)
        .unwrap_or(Duration::ZERO)
        .as_secs()
}

fn is_kept_path(relative_path: &str, keep_set: &HashSet<String>) -> bool {
    keep_set.iter().any(|keep| {
        relative_path == keep
            || relative_path
                .strip_prefix(keep)
                .is_some_and(|rest| rest.starts_with('/'))
    })
}

/// 媒体文件管理
pub struct MediaManager {
    temp_dir: PathBuf,
}

impl MediaManager {
    /// 创建新的媒体管理器（使用应用数据目录）
    pub fn new(app_data_dir: PathBuf) -> Result<Self> {
        let temp_dir = app_data_dir.join("temp");

        // 创建 temp 目录
        fs::create_dir_all(&temp_dir).context("Failed to create temp directory")?;

        Ok(Self { temp_dir })
    }

    /// 创建新的媒体管理器（兼容旧版本，使用项目目录）
    #[deprecated(since = "0.2.0", note = "Use `new` with app_data_dir instead")]
    pub fn new_with_project_dir(project_dir: PathBuf) -> Result<Self> {
        let temp_dir = project_dir.join("temp");
        fs::create_dir_all(&temp_dir).context("Failed to create temp directory")?;
        Ok(Self { temp_dir })
    }

    /// 复制媒体文件到 temp 文件夹
    pub fn copy_media_to_temp(&self, source_path: &str) -> Result<String> {
        let source = Path::new(source_path);

        if !source.exists() {
            anyhow::bail!("Source file does not exist: {}", source_path);
        }

        // 生成目标文件名（保留原始扩展名）
        let file_name = source
            .file_name()
            .context("Invalid file name")?
            .to_string_lossy();

        let timestamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis();

        let target_name = format!("{}_{}", timestamp, file_name);
        let target_path = self.temp_dir.join(&target_name);

        // 复制文件
        fs::copy(source, &target_path).context("Failed to copy media file")?;

        // 返回相对路径
        Ok(format!("temp/{}", target_name))
    }

    /// 获取媒体文件的完整路径
    pub fn get_media_path(&self, relative_path: &str) -> PathBuf {
        self.temp_dir
            .join(relative_path.strip_prefix("temp/").unwrap_or(relative_path))
    }

    fn collect_temp_files(&self) -> Result<Vec<TempFileEntry>> {
        let mut entries = Vec::new();
        let mut dirs = vec![self.temp_dir.clone()];

        while let Some(dir) = dirs.pop() {
            let children =
                fs::read_dir(&dir).with_context(|| format!("Failed to read directory: {:?}", dir))?;

            for child in children {
                let child = child.context("Failed to read directory entry")?;
                let path = child.path();
                let file_type = child.file_type().context("Failed to read file type")?;

                if file_type.is_dir() {
                    dirs.push(path);
                    continue;
                }

                if !file_type.is_file() {
                    continue;
                }

                let metadata = fs::metadata(&path)
                    .with_context(|| format!("Failed to get file metadata: {:?}", path))?;
                let modified = metadata.modified().unwrap_or(SystemTime::UNIX_EPOCH);
                let relative_path = match path.strip_prefix(&self.temp_dir) {
                    Ok(rel) => rel.to_string_lossy().replace('\\', "/"),
                    Err(_) => continue,
                };

                let Some(sanitized_relative) = sanitize_relative_path(&relative_path) else {
                    continue;
                };

                entries.push(TempFileEntry {
                    path,
                    relative_path: sanitized_relative,
                    size: metadata.len(),
                    modified,
                });
            }
        }

        Ok(entries)
    }

    fn collect_keep_set(&self, keep_files: &[String]) -> HashSet<String> {
        keep_files
            .iter()
            .filter_map(|path| normalize_temp_relative(path))
            .collect()
    }

    fn cleanup_empty_dirs(&self) -> Result<()> {
        let mut dirs = Vec::new();
        let mut stack = vec![self.temp_dir.clone()];

        while let Some(dir) = stack.pop() {
            let children =
                fs::read_dir(&dir).with_context(|| format!("Failed to read directory: {:?}", dir))?;
            for child in children {
                let child = child.context("Failed to read directory entry")?;
                let path = child.path();
                let file_type = child.file_type().context("Failed to read file type")?;
                if file_type.is_dir() {
                    stack.push(path.clone());
                    dirs.push(path);
                }
            }
        }

        dirs.sort_by_key(|dir| std::cmp::Reverse(dir.components().count()));
        for dir in dirs {
            let is_empty = fs::read_dir(&dir)
                .with_context(|| format!("Failed to read directory: {:?}", dir))?
                .next()
                .is_none();
            if is_empty {
                if let Err(err) = fs::remove_dir(&dir) {
                    eprintln!("[temp-cleanup] Failed to remove empty dir {:?}: {}", dir, err);
                }
            }
        }

        Ok(())
    }

    /// 清理 temp 文件夹中的缓存文件（支持 keep 列表 + TTL + 目录总大小上限）
    pub fn cleanup_temp_with_policy(
        &self,
        keep_files: &[String],
        max_size_bytes: Option<u64>,
        ttl_days: Option<u32>,
    ) -> Result<TempCleanupReport> {
        let keep_set = self.collect_keep_set(keep_files);
        let mut files = self.collect_temp_files()?;
        let mut report = TempCleanupReport {
            scanned_files: files.len(),
            keep_candidates: keep_set.len(),
            total_size_before: files.iter().map(|entry| entry.size).sum(),
            ..TempCleanupReport::default()
        };

        println!(
            "[temp-cleanup] start scanned={} keep={} ttl_days={:?} max_size_bytes={:?}",
            report.scanned_files, report.keep_candidates, ttl_days, max_size_bytes
        );

        if ttl_days.is_none() && max_size_bytes.is_none() {
            files.retain(|entry| {
                if is_kept_path(&entry.relative_path, &keep_set) {
                    return true;
                }

                match fs::remove_file(&entry.path) {
                    Ok(_) => {
                        report.removed_by_unused += 1;
                        report.removed_bytes = report.removed_bytes.saturating_add(entry.size);
                        println!(
                            "[temp-cleanup] removed_by_unused path={} size={}",
                            entry.relative_path, entry.size
                        );
                        false
                    }
                    Err(err) => {
                        eprintln!(
                            "[temp-cleanup] failed_remove_by_unused path={} err={}",
                            entry.relative_path, err
                        );
                        true
                    }
                }
            });
        } else if let Some(days) = ttl_days {
            let ttl_seconds = u64::from(days).saturating_mul(SECONDS_PER_DAY);
            let cutoff = SystemTime::now()
                .checked_sub(Duration::from_secs(ttl_seconds))
                .unwrap_or(SystemTime::UNIX_EPOCH);

            files.retain(|entry| {
                if is_kept_path(&entry.relative_path, &keep_set) {
                    return true;
                }

                if entry.modified <= cutoff {
                    match fs::remove_file(&entry.path) {
                        Ok(_) => {
                            report.removed_by_ttl += 1;
                            report.removed_bytes = report.removed_bytes.saturating_add(entry.size);
                            println!(
                                "[temp-cleanup] removed_by_ttl path={} size={}",
                                entry.relative_path, entry.size
                            );
                            false
                        }
                        Err(err) => {
                            eprintln!(
                                "[temp-cleanup] failed_remove_by_ttl path={} err={}",
                                entry.relative_path, err
                            );
                            true
                        }
                    }
                } else {
                    true
                }
            });
        }

        if let Some(max_size) = max_size_bytes {
            let mut current_total_size: u64 = files.iter().map(|entry| entry.size).sum();
            if current_total_size > max_size {
                let mut removable: Vec<TempFileEntry> = files
                    .iter()
                    .filter(|entry| !is_kept_path(&entry.relative_path, &keep_set))
                    .cloned()
                    .collect();

                removable.sort_by(|a, b| {
                    modified_epoch_seconds(a.modified)
                        .cmp(&modified_epoch_seconds(b.modified))
                        .then_with(|| a.relative_path.cmp(&b.relative_path))
                });

                let mut removed_paths = HashSet::new();

                for entry in removable {
                    if current_total_size <= max_size {
                        break;
                    }

                    match fs::remove_file(&entry.path) {
                        Ok(_) => {
                            current_total_size = current_total_size.saturating_sub(entry.size);
                            report.removed_by_size += 1;
                            report.removed_bytes = report.removed_bytes.saturating_add(entry.size);
                            removed_paths.insert(entry.relative_path.clone());
                            println!(
                                "[temp-cleanup] removed_by_size path={} size={} current_total={}",
                                entry.relative_path, entry.size, current_total_size
                            );
                        }
                        Err(err) => {
                            eprintln!(
                                "[temp-cleanup] failed_remove_by_size path={} err={}",
                                entry.relative_path, err
                            );
                        }
                    }
                }

                files.retain(|entry| !removed_paths.contains(&entry.relative_path));
            }
        }

        self.cleanup_empty_dirs()?;
        let remaining = self.collect_temp_files()?;
        report.total_size_after = remaining.iter().map(|entry| entry.size).sum();

        println!(
            "[temp-cleanup] done removed_unused={} removed_ttl={} removed_size={} removed_bytes={} total_before={} total_after={}",
            report.removed_by_unused,
            report.removed_by_ttl,
            report.removed_by_size,
            report.removed_bytes,
            report.total_size_before,
            report.total_size_after
        );

        Ok(report)
    }

    /// 清理 temp 文件夹中的过期文件（兼容旧接口：仅按 keep 列表清理）
    pub fn cleanup_temp(&self, keep_files: &[String]) -> Result<()> {
        self.cleanup_temp_with_policy(keep_files, None, None)?;
        Ok(())
    }

    /// 删除 temp 文件夹中的特定文件
    pub fn remove_media_from_temp(&self, relative_path: &str) -> Result<()> {
        let Some(sanitized_relative) = normalize_temp_relative(relative_path) else {
            return Ok(());
        };
        let path = self.temp_dir.join(sanitized_relative);

        if path.exists() && path.is_file() {
            fs::remove_file(&path).context("Failed to remove media file")?;
        }

        Ok(())
    }

    /// 获取 temp 文件夹大小（字节）
    pub fn get_temp_size(&self) -> Result<u64> {
        let files = self.collect_temp_files()?;
        Ok(files.iter().map(|entry| entry.size).sum())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use std::thread::sleep;
    use std::time::Duration as StdDuration;

    #[test]
    fn test_copy_media_to_temp() {
        let temp_dir = tempfile::tempdir().unwrap();
        let project_dir = temp_dir.path().to_path_buf();

        // 创建测试文件
        let source_file = project_dir.join("test.mp4");
        let mut file = fs::File::create(&source_file).unwrap();
        file.write_all(b"test content").unwrap();

        let manager = MediaManager::new(project_dir.clone()).unwrap();
        let result = manager.copy_media_to_temp(source_file.to_str().unwrap());

        assert!(result.is_ok());
        let relative_path = result.unwrap();
        assert!(relative_path.starts_with("temp/"));

        let full_path = manager.get_media_path(&relative_path);
        assert!(full_path.exists());
    }

    fn write_file(path: &Path, size: usize) {
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent).unwrap();
        }
        let mut file = fs::File::create(path).unwrap();
        file.write_all(&vec![1u8; size]).unwrap();
    }

    #[test]
    fn test_cleanup_temp_recursive_keep_files() {
        let root = tempfile::tempdir().unwrap();
        let manager = MediaManager::new(root.path().to_path_buf()).unwrap();

        let keep_file = manager.get_media_path("temp/proxy/keep.mp4");
        let remove_file_a = manager.get_media_path("temp/thumbs/m1/t_1.jpg");
        let remove_file_b = manager.get_media_path("temp/waveforms/a.json");

        write_file(&keep_file, 4);
        write_file(&remove_file_a, 4);
        write_file(&remove_file_b, 4);

        let report = manager
            .cleanup_temp_with_policy(&[String::from("temp/proxy/keep.mp4")], None, None)
            .unwrap();

        assert_eq!(report.removed_by_ttl, 0);
        assert_eq!(report.removed_by_size, 0);
        assert!(keep_file.exists());
        assert!(!remove_file_a.exists());
        assert!(!remove_file_b.exists());
    }

    #[test]
    fn test_cleanup_temp_by_size_oldest_first() {
        let root = tempfile::tempdir().unwrap();
        let manager = MediaManager::new(root.path().to_path_buf()).unwrap();

        let file_a = manager.get_media_path("temp/a.bin");
        write_file(&file_a, 5);
        sleep(StdDuration::from_millis(1100));
        let file_b = manager.get_media_path("temp/b.bin");
        write_file(&file_b, 5);
        sleep(StdDuration::from_millis(1100));
        let file_c = manager.get_media_path("temp/c.bin");
        write_file(&file_c, 5);

        let report = manager
            .cleanup_temp_with_policy(&[], Some(10), None)
            .unwrap();

        assert_eq!(report.removed_by_size, 1);
        assert!(!file_a.exists());
        assert!(file_b.exists());
        assert!(file_c.exists());
    }

    #[test]
    fn test_cleanup_temp_by_ttl_days_zero() {
        let root = tempfile::tempdir().unwrap();
        let manager = MediaManager::new(root.path().to_path_buf()).unwrap();

        let stale_file = manager.get_media_path("temp/old/stale.dat");
        write_file(&stale_file, 6);

        let report = manager
            .cleanup_temp_with_policy(&[], None, Some(0))
            .unwrap();

        assert_eq!(report.removed_by_ttl, 1);
        assert!(!stale_file.exists());
    }

    #[test]
    fn test_get_temp_size_recursive() {
        let root = tempfile::tempdir().unwrap();
        let manager = MediaManager::new(root.path().to_path_buf()).unwrap();

        write_file(&manager.get_media_path("temp/r1.bin"), 3);
        write_file(&manager.get_media_path("temp/proxy/r2.bin"), 7);
        write_file(&manager.get_media_path("temp/thumbs/m1/r3.bin"), 11);

        let size = manager.get_temp_size().unwrap();
        assert_eq!(size, 21);
    }
}
