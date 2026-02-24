use crate::ffmpeg_handler::{self, VideoInfo};
use crate::ffmpeg_path;
use tauri::{AppHandle, State};
use std::sync::Mutex;

/// 应用状态
pub struct AppState {
    pub ffmpeg_initialized: Mutex<bool>,
}

/// 初始化 FFmpeg
#[tauri::command]
pub async fn init_ffmpeg(app: AppHandle, state: State<'_, AppState>) -> Result<(), String> {
    let mut initialized = state.ffmpeg_initialized.lock().unwrap();
    
    if !*initialized {
        let ffmpeg_cmd = ffmpeg_path::get_ffmpeg_command(&app);
        ffmpeg_handler::init_ffmpeg(&ffmpeg_cmd)
            .map_err(|e| format!("Failed to initialize FFmpeg: {}", e))?;
        *initialized = true;
    }
    
    Ok(())
}

/// 获取视频信息
#[tauri::command]
pub async fn get_video_info(app: AppHandle, path: String) -> Result<VideoInfo, String> {
    let ffprobe_cmd = ffmpeg_path::get_ffprobe_command(&app);
    ffmpeg_handler::get_video_info(&path, &ffprobe_cmd)
        .map_err(|e| format!("Failed to get video info: {}", e))
}

/// 提取视频帧
#[tauri::command]
pub async fn extract_frame(
    app: AppHandle,
    path: String,
    timestamp: f64,
    output_path: String,
) -> Result<(), String> {
    let ffmpeg_cmd = ffmpeg_path::get_ffmpeg_command(&app);
    ffmpeg_handler::extract_frame(&path, timestamp, &output_path, &ffmpeg_cmd)
        .map_err(|e| format!("Failed to extract frame: {}", e))
}

/// 提取视频帧到临时文件并返回文件路径（推荐）
#[tauri::command]
pub async fn extract_frame_to_temp(
    app: AppHandle,
    path: String,
    timestamp: f64,
) -> Result<String, String> {
    let ffmpeg_cmd = ffmpeg_path::get_ffmpeg_command(&app);
    ffmpeg_handler::extract_frame_to_temp(&path, timestamp, &ffmpeg_cmd)
        .map_err(|e| format!("Failed to extract frame: {}", e))
}

/// 提取视频帧并返回 base64 编码的数据 URL
#[tauri::command]
pub async fn extract_frame_to_base64(
    app: AppHandle,
    path: String,
    timestamp: f64,
) -> Result<String, String> {
    let ffmpeg_cmd = ffmpeg_path::get_ffmpeg_command(&app);
    ffmpeg_handler::extract_frame_to_base64(&path, timestamp, &ffmpeg_cmd)
        .map_err(|e| format!("Failed to extract frame: {}", e))
}

/// 裁剪视频
#[tauri::command]
pub async fn trim_video(
    app: AppHandle,
    input_path: String,
    start: f64,
    duration: f64,
    output_path: String,
) -> Result<(), String> {
    let ffmpeg_cmd = ffmpeg_path::get_ffmpeg_command(&app);
    ffmpeg_handler::trim_video(&input_path, start, duration, &output_path, &ffmpeg_cmd)
        .map_err(|e| format!("Failed to trim video: {}", e))
}

/// 合并视频
#[tauri::command]
pub async fn merge_videos(
    app: AppHandle,
    input_paths: Vec<String>,
    output_path: String,
) -> Result<(), String> {
    let ffmpeg_cmd = ffmpeg_path::get_ffmpeg_command(&app);
    ffmpeg_handler::merge_videos(input_paths, &output_path, &ffmpeg_cmd)
        .map_err(|e| format!("Failed to merge videos: {}", e))
}
