use std::path::PathBuf;
use tauri::Manager;

/// 获取打包的 FFmpeg 路径
pub fn get_bundled_ffmpeg_path(app: &tauri::AppHandle) -> Option<PathBuf> {
    let resource_path = app.path().resource_dir().ok()?;
    let ffmpeg_path = resource_path.join("bin").join("ffmpeg");
    
    if ffmpeg_path.exists() {
        Some(ffmpeg_path)
    } else {
        None
    }
}

/// 获取打包的 FFprobe 路径
pub fn get_bundled_ffprobe_path(app: &tauri::AppHandle) -> Option<PathBuf> {
    let resource_path = app.path().resource_dir().ok()?;
    let ffprobe_path = resource_path.join("bin").join("ffprobe");
    
    if ffprobe_path.exists() {
        Some(ffprobe_path)
    } else {
        None
    }
}

/// 获取 FFmpeg 命令（优先使用打包的，否则使用系统的）
pub fn get_ffmpeg_command(app: &tauri::AppHandle) -> String {
    if let Some(bundled) = get_bundled_ffmpeg_path(app) {
        bundled.to_string_lossy().to_string()
    } else {
        "ffmpeg".to_string()
    }
}

/// 获取 FFprobe 命令（优先使用打包的，否则使用系统的）
pub fn get_ffprobe_command(app: &tauri::AppHandle) -> String {
    if let Some(bundled) = get_bundled_ffprobe_path(app) {
        bundled.to_string_lossy().to_string()
    } else {
        "ffprobe".to_string()
    }
}

