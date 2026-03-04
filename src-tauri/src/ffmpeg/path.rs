use tauri::AppHandle;
use tauri::Manager;

fn resolve_bundled_binary(app: &AppHandle, binary_name: &str) -> Option<String> {
    let resource_dir = app.path().resource_dir().ok()?;
    let bin_dir = resource_dir.join("bin");

    #[cfg(target_os = "windows")]
    let candidates = [format!("{binary_name}.exe"), binary_name.to_string()];

    #[cfg(not(target_os = "windows"))]
    let candidates = [binary_name.to_string(), format!("{binary_name}.exe")];

    for file_name in candidates {
        let path = bin_dir.join(file_name);
        if path.is_file() {
            return Some(path.to_string_lossy().to_string());
        }
    }

    None
}

/// 获取 FFmpeg 命令路径
pub fn get_ffmpeg_command(app: &AppHandle) -> String {
    if let Some(path) = resolve_bundled_binary(app, "ffmpeg") {
        return path;
    }

    #[cfg(target_os = "windows")]
    return "ffmpeg.exe".to_string();

    #[cfg(not(target_os = "windows"))]
    return "ffmpeg".to_string();
}

/// 获取 FFprobe 命令路径
pub fn get_ffprobe_command(app: &AppHandle) -> String {
    if let Some(path) = resolve_bundled_binary(app, "ffprobe") {
        return path;
    }

    #[cfg(target_os = "windows")]
    return "ffprobe.exe".to_string();

    #[cfg(not(target_os = "windows"))]
    return "ffprobe".to_string();
}
