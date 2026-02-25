use tauri::AppHandle;

/// 获取 FFmpeg 命令路径
pub fn get_ffmpeg_command(_app: &AppHandle) -> String {
    #[cfg(target_os = "windows")]
    {
        "ffmpeg.exe".to_string()
    }
    #[cfg(not(target_os = "windows"))]
    {
        "ffmpeg".to_string()
    }
}

/// 获取 FFprobe 命令路径
pub fn get_ffprobe_command(_app: &AppHandle) -> String {
    #[cfg(target_os = "windows")]
    {
        "ffprobe.exe".to_string()
    }
    #[cfg(not(target_os = "windows"))]
    {
        "ffprobe".to_string()
    }
}
