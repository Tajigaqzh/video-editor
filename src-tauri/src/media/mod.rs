use std::fs;
use std::path::{Path, PathBuf};
use anyhow::{Result, Context};

/// 媒体文件管理
pub struct MediaManager {
    temp_dir: PathBuf,
}

impl MediaManager {
    /// 创建新的媒体管理器（使用应用数据目录）
    pub fn new(app_data_dir: PathBuf) -> Result<Self> {
        let temp_dir = app_data_dir.join("temp");
        
        // 创建 temp 目录
        fs::create_dir_all(&temp_dir)
            .context("Failed to create temp directory")?;
        
        Ok(Self { temp_dir })
    }

    /// 创建新的媒体管理器（兼容旧版本，使用项目目录）
    #[deprecated(since = "0.2.0", note = "Use `new` with app_data_dir instead")]
    pub fn new_with_project_dir(project_dir: PathBuf) -> Result<Self> {
        let temp_dir = project_dir.join("temp");
        fs::create_dir_all(&temp_dir)
            .context("Failed to create temp directory")?;
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
        fs::copy(source, &target_path)
            .context("Failed to copy media file")?;

        // 返回相对路径
        Ok(format!("temp/{}", target_name))
    }

    /// 获取媒体文件的完整路径
    pub fn get_media_path(&self, relative_path: &str) -> PathBuf {
        self.temp_dir.join(relative_path.strip_prefix("temp/").unwrap_or(relative_path))
    }

    /// 清理 temp 文件夹中的过期文件
    pub fn cleanup_temp(&self, keep_files: &[String]) -> Result<()> {
        let entries = fs::read_dir(&self.temp_dir)
            .context("Failed to read temp directory")?;

        for entry in entries {
            let entry = entry.context("Failed to read directory entry")?;
            let path = entry.path();
            
            if path.is_file() {
                let file_name = path
                    .file_name()
                    .unwrap()
                    .to_string_lossy()
                    .to_string();
                
                // 如果文件不在保留列表中，删除它
                if !keep_files.iter().any(|f| f.ends_with(&file_name)) {
                    fs::remove_file(&path)
                        .context("Failed to remove file")?;
                }
            }
        }

        Ok(())
    }

    /// 删除 temp 文件夹中的特定文件
    pub fn remove_media_from_temp(&self, relative_path: &str) -> Result<()> {
        let file_name = relative_path
            .split('/')
            .last()
            .unwrap_or(relative_path);
        
        let path = self.temp_dir.join(file_name);
        
        if path.exists() {
            fs::remove_file(&path)
                .context("Failed to remove media file")?;
        }

        Ok(())
    }

    /// 获取 temp 文件夹大小（字节）
    pub fn get_temp_size(&self) -> Result<u64> {
        let mut total_size = 0u64;
        
        let entries = fs::read_dir(&self.temp_dir)
            .context("Failed to read temp directory")?;

        for entry in entries {
            let entry = entry.context("Failed to read directory entry")?;
            let path = entry.path();
            
            if path.is_file() {
                let metadata = fs::metadata(&path)
                    .context("Failed to get file metadata")?;
                total_size += metadata.len();
            }
        }

        Ok(total_size)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

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
}
