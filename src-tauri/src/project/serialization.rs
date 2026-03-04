use anyhow::{Context, Result};
use serde_json::Value;
use std::fs;
use std::io::Write;
use std::path::Path;
use zip::write::FileOptions;
use zip::ZipWriter;

/// 项目元数据
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ProjectMetadata {
    pub version: String,
    pub min_supported_version: String,
    pub created_at: String,
    pub modified_at: String,
    pub encrypted: bool,
    pub encryption_version: u32,
    pub compression_enabled: bool,
}

impl Default for ProjectMetadata {
    fn default() -> Self {
        Self {
            version: "1.0.0".to_string(),
            min_supported_version: "1.0.0".to_string(),
            created_at: chrono::Utc::now().to_rfc3339(),
            modified_at: chrono::Utc::now().to_rfc3339(),
            encrypted: false,
            encryption_version: 1,
            compression_enabled: true,
        }
    }
}

/// 项目保存选项
#[derive(Debug, Clone)]
pub struct SaveOptions {
    pub password: Option<String>,
    pub compress: bool,
    pub include_cache: bool,
    pub encryption_level: EncryptionLevel,
}

#[derive(Debug, Clone, Copy)]
pub enum EncryptionLevel {
    None,
    Standard,
    High,
}

impl Default for SaveOptions {
    fn default() -> Self {
        Self {
            password: None,
            compress: true,
            include_cache: true,
            encryption_level: EncryptionLevel::Standard,
        }
    }
}

/// 保存项目到 .hpve 文件
pub fn save_project(project_data: &Value, file_path: &str, options: SaveOptions) -> Result<()> {
    let path = Path::new(file_path);

    // 创建父目录
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).context("Failed to create parent directory")?;
    }

    // 创建 ZIP 文件
    let file = fs::File::create(path).context("Failed to create project file")?;
    let mut zip = ZipWriter::new(file);

    // 准备元数据
    let mut metadata = ProjectMetadata::default();
    metadata.encrypted = options.password.is_some();
    metadata.compression_enabled = options.compress;
    metadata.modified_at = chrono::Utc::now().to_rfc3339();

    // 准备项目数据
    let project_json =
        serde_json::to_string_pretty(project_data).context("Failed to serialize project data")?;

    let metadata_json =
        serde_json::to_string_pretty(&metadata).context("Failed to serialize metadata")?;

    // 加密数据（如果提供了密码）
    let project_content = if let Some(password) = &options.password {
        super::encryption::encrypt_data(&project_json, password)
            .context("Failed to encrypt project data")?
    } else {
        project_json
    };

    let metadata_content = if let Some(password) = &options.password {
        super::encryption::encrypt_data(&metadata_json, password)
            .context("Failed to encrypt metadata")?
    } else {
        metadata_json
    };

    // 添加项目文件到 ZIP
    let options = FileOptions::default();
    zip.start_file("project.json", options)
        .context("Failed to add project.json to ZIP")?;
    zip.write_all(project_content.as_bytes())
        .context("Failed to write project.json")?;

    // 添加元数据文件到 ZIP
    zip.start_file("metadata.json", options)
        .context("Failed to add metadata.json to ZIP")?;
    zip.write_all(metadata_content.as_bytes())
        .context("Failed to write metadata.json")?;

    // 完成 ZIP 文件
    zip.finish().context("Failed to finalize ZIP file")?;

    Ok(())
}

/// 加载项目从 .hpve 文件
pub fn load_project(file_path: &str, password: Option<&str>) -> Result<Value> {
    let path = Path::new(file_path);

    if !path.exists() {
        anyhow::bail!("Project file not found: {}", file_path);
    }

    let file = fs::File::open(path).context("Failed to open project file")?;

    let mut zip = zip::ZipArchive::new(file).context("Failed to read ZIP file")?;

    // 读取项目数据
    let mut project_file = zip
        .by_name("project.json")
        .context("project.json not found in archive")?;

    let mut project_content = String::new();
    std::io::Read::read_to_string(&mut project_file, &mut project_content)
        .context("Failed to read project.json")?;

    // 解密数据（如果需要）
    let project_json = if let Some(pwd) = password {
        super::encryption::decrypt_data(&project_content, pwd)
            .context("Failed to decrypt project data - invalid password or corrupted file")?
    } else {
        project_content
    };

    // 解析 JSON
    let project_data: Value =
        serde_json::from_str(&project_json).context("Failed to parse project JSON")?;

    Ok(project_data)
}

/// 验证 .hpve 文件格式
pub fn validate_hpve_file(file_path: &str) -> Result<bool> {
    let path = Path::new(file_path);

    if !path.exists() {
        return Ok(false);
    }

    let file = fs::File::open(path).context("Failed to open file")?;

    // 尝试作为 ZIP 文件打开
    match zip::ZipArchive::new(file) {
        Ok(mut archive) => {
            // 检查必要的文件
            let has_project = archive.by_name("project.json").is_ok();
            let has_metadata = archive.by_name("metadata.json").is_ok();

            Ok(has_project && has_metadata)
        }
        Err(_) => Ok(false),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_metadata_default() {
        let metadata = ProjectMetadata::default();
        assert_eq!(metadata.version, "1.0.0");
        assert!(!metadata.encrypted);
    }

    #[test]
    fn test_save_options_default() {
        let options = SaveOptions::default();
        assert!(options.password.is_none());
        assert!(options.compress);
        assert!(options.include_cache);
    }
}
