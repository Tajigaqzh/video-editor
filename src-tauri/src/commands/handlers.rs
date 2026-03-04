use crate::commands::AppState;
use crate::ffmpeg::{self, VideoInfo};
use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager, State};

/// 初始化 FFmpeg
#[tauri::command]
pub async fn init_ffmpeg(app: AppHandle, state: State<'_, AppState>) -> Result<(), String> {
    let mut initialized = state.ffmpeg_initialized.lock().unwrap();

    if !*initialized {
        let ffmpeg_cmd = ffmpeg::path::get_ffmpeg_command(&app);
        ffmpeg::handler::init_ffmpeg(&ffmpeg_cmd)
            .map_err(|e| format!("Failed to initialize FFmpeg: {}", e))?;
        *initialized = true;
    }

    Ok(())
}

/// 获取视频信息
#[tauri::command]
pub async fn get_video_info(app: AppHandle, path: String) -> Result<VideoInfo, String> {
    let ffprobe_cmd = ffmpeg::path::get_ffprobe_command(&app);
    ffmpeg::handler::get_video_info(&path, &ffprobe_cmd)
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
    let ffmpeg_cmd = ffmpeg::path::get_ffmpeg_command(&app);
    ffmpeg::handler::extract_frame(&path, timestamp, &output_path, &ffmpeg_cmd)
        .map_err(|e| format!("Failed to extract frame: {}", e))
}

/// 提取视频帧到临时文件并返回文件路径（推荐）
#[tauri::command]
pub async fn extract_frame_to_temp(
    app: AppHandle,
    path: String,
    timestamp: f64,
) -> Result<String, String> {
    let ffmpeg_cmd = ffmpeg::path::get_ffmpeg_command(&app);
    ffmpeg::handler::extract_frame_to_temp(&path, timestamp, &ffmpeg_cmd)
        .map_err(|e| format!("Failed to extract frame: {}", e))
}

/// 提取视频帧并返回 base64 编码的数据 URL
#[tauri::command]
pub async fn extract_frame_to_base64(
    app: AppHandle,
    path: String,
    timestamp: f64,
) -> Result<String, String> {
    let ffmpeg_cmd = ffmpeg::path::get_ffmpeg_command(&app);
    ffmpeg::handler::extract_frame_to_base64(&path, timestamp, &ffmpeg_cmd)
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
    let ffmpeg_cmd = ffmpeg::path::get_ffmpeg_command(&app);
    ffmpeg::handler::trim_video(&input_path, start, duration, &output_path, &ffmpeg_cmd)
        .map_err(|e| format!("Failed to trim video: {}", e))
}

/// 合并视频
#[tauri::command]
pub async fn merge_videos(
    app: AppHandle,
    input_paths: Vec<String>,
    output_path: String,
) -> Result<(), String> {
    let ffmpeg_cmd = ffmpeg::path::get_ffmpeg_command(&app);
    ffmpeg::handler::merge_videos(input_paths, &output_path, &ffmpeg_cmd)
        .map_err(|e| format!("Failed to merge videos: {}", e))
}

/// 批量提取视频帧
#[tauri::command]
pub async fn batch_extract_frames(
    app: AppHandle,
    path: String,
    timestamps: Vec<f64>,
    output_dir: String,
) -> Result<(), String> {
    let ffmpeg_cmd = ffmpeg::path::get_ffmpeg_command(&app);
    ffmpeg::handler::batch_extract_frames(&path, timestamps, &output_dir, &ffmpeg_cmd)
        .map_err(|e| format!("Failed to batch extract frames: {}", e))
}

/// 流式解码视频帧（返回 base64 编码的 JPEG）
#[tauri::command]
pub async fn stream_decode_frame(
    app: AppHandle,
    path: String,
    timestamp: f64,
) -> Result<String, String> {
    let ffmpeg_cmd = ffmpeg::path::get_ffmpeg_command(&app);
    let streamer = ffmpeg::VideoStreamer::new(ffmpeg_cmd);

    let frame_data = streamer
        .decode_frame(&path, timestamp)
        .map_err(|e| format!("Failed to decode frame: {}", e))?;

    // 编码为 base64
    use base64::{engine::general_purpose, Engine as _};
    let base64_str = general_purpose::STANDARD.encode(&frame_data);

    Ok(format!("data:image/jpeg;base64,{}", base64_str))
}

/// 启动 WebSocket 服务器
#[tauri::command]
pub async fn start_websocket_server(app: AppHandle) -> Result<String, String> {
    let ffmpeg_cmd = ffmpeg::path::get_ffmpeg_command(&app);
    let mut server = crate::server::WebSocketServer::new(ffmpeg_cmd);

    server
        .start("127.0.0.1:9001")
        .await
        .map_err(|e| format!("Failed to start WebSocket server: {}", e))?;

    // 在后台接受连接
    tokio::spawn(async move {
        loop {
            if let Err(e) = server.accept_connection().await {
                eprintln!("Error accepting connection: {}", e);
            }
        }
    });

    Ok("WebSocket server started on ws://127.0.0.1:9001".to_string())
}

/// 保存项目到 .hpve 文件
#[tauri::command]
pub async fn save_project(
    project_data: serde_json::Value,
    file_path: String,
    password: Option<String>,
    compress: Option<bool>,
) -> Result<(), String> {
    let options = crate::project::SaveOptions {
        password,
        compress: compress.unwrap_or(true),
        include_cache: true,
        encryption_level: crate::project::EncryptionLevel::Standard,
    };

    crate::project::save_project(&project_data, &file_path, options)
        .map_err(|e| format!("Failed to save project: {}", e))
}

/// 加载项目从 .hpve 文件
#[tauri::command]
pub async fn load_project(
    file_path: String,
    password: Option<String>,
) -> Result<serde_json::Value, String> {
    crate::project::load_project(&file_path, password.as_deref())
        .map_err(|e| format!("Failed to load project: {}", e))
}

/// 验证 .hpve 文件格式
#[tauri::command]
pub async fn validate_hpve_file(file_path: String) -> Result<bool, String> {
    crate::project::validate_hpve_file(&file_path)
        .map_err(|e| format!("Failed to validate file: {}", e))
}

/// 复制媒体文件到应用 temp 文件夹
#[tauri::command]
pub async fn copy_media_to_temp(app: AppHandle, source_path: String) -> Result<String, String> {
    // 获取应用数据目录
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;

    let manager = crate::media::MediaManager::new(app_data_dir)
        .map_err(|e| format!("Failed to create media manager: {}", e))?;

    manager
        .copy_media_to_temp(&source_path)
        .map_err(|e| format!("Failed to copy media: {}", e))
}

/// 获取 temp 文件夹大小
#[tauri::command]
pub async fn get_temp_size(app: AppHandle) -> Result<u64, String> {
    // 获取应用数据目录
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;

    let manager = crate::media::MediaManager::new(app_data_dir)
        .map_err(|e| format!("Failed to create media manager: {}", e))?;

    manager
        .get_temp_size()
        .map_err(|e| format!("Failed to get temp size: {}", e))
}

/// 清理 temp 文件夹中的过期文件
#[tauri::command]
pub async fn cleanup_temp_files(
    app: AppHandle,
    keep_files: Vec<String>,
    max_size_bytes: Option<u64>,
    ttl_days: Option<u32>,
) -> Result<(), String> {
    // 获取应用数据目录
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;

    let manager = crate::media::MediaManager::new(app_data_dir)
        .map_err(|e| format!("Failed to create media manager: {}", e))?;

    manager
        .cleanup_temp_with_policy(&keep_files, max_size_bytes, ttl_days)
        .map_err(|e| format!("Failed to cleanup temp: {}", e))
        .map(|_| ())
}

/// 删除 temp 文件夹中的特定文件
#[tauri::command]
pub async fn remove_media_from_temp(app: AppHandle, relative_path: String) -> Result<(), String> {
    // 获取应用数据目录
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;

    let manager = crate::media::MediaManager::new(app_data_dir)
        .map_err(|e| format!("Failed to create media manager: {}", e))?;

    manager
        .remove_media_from_temp(&relative_path)
        .map_err(|e| format!("Failed to remove media: {}", e))
}

/// 解析媒体路径：若为 temp 相对路径则映射到 app_data/temp 下的绝对路径
#[tauri::command]
pub async fn resolve_media_path(app: AppHandle, path: String) -> Result<String, String> {
    let normalized = path.replace('\\', "/");

    if normalized.starts_with("temp/") {
        let app_data_dir = app
            .path()
            .app_data_dir()
            .map_err(|e| format!("Failed to get app data dir: {}", e))?;
        let absolute = app_data_dir.join(normalized);
        return Ok(absolute.to_string_lossy().to_string());
    }

    Ok(path)
}

/// 生成波形缓存，输出到 app_data/temp/waveforms/
#[tauri::command]
pub async fn generate_waveform(
    app: AppHandle,
    input_path: String,
    media_id: String,
    step_ms: Option<u32>,
    sample_rate: Option<u32>,
) -> Result<String, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;

    let waveform_dir = app_data_dir.join("temp").join("waveforms");
    std::fs::create_dir_all(&waveform_dir)
        .map_err(|e| format!("Failed to create waveform dir: {}", e))?;

    let output_file = format!("{}.json", media_id);
    let output_path = waveform_dir.join(output_file);

    let ffmpeg_cmd = ffmpeg::path::get_ffmpeg_command(&app);
    let waveform = ffmpeg::handler::generate_waveform_peaks(
        &input_path,
        &ffmpeg_cmd,
        sample_rate.unwrap_or(44_100),
        step_ms.unwrap_or(20),
    )
    .map_err(|e| format!("Failed to generate waveform: {}", e))?;

    let content = serde_json::to_string(&waveform)
        .map_err(|e| format!("Failed to serialize waveform: {}", e))?;
    std::fs::write(&output_path, content)
        .map_err(|e| format!("Failed to write waveform file: {}", e))?;

    let file_name = output_path
        .file_name()
        .map(|s| s.to_string_lossy().to_string())
        .ok_or_else(|| "Invalid waveform file name".to_string())?;

    Ok(format!("temp/waveforms/{}", file_name))
}

/// 读取波形缓存 JSON
#[tauri::command]
pub async fn load_waveform(
    app: AppHandle,
    path: String,
) -> Result<ffmpeg::handler::WaveformData, String> {
    let normalized = path.replace('\\', "/");
    let absolute_path = if normalized.starts_with("temp/") {
        let app_data_dir = app
            .path()
            .app_data_dir()
            .map_err(|e| format!("Failed to get app data dir: {}", e))?;
        app_data_dir.join(normalized)
    } else {
        std::path::PathBuf::from(path)
    };

    let content = std::fs::read_to_string(&absolute_path)
        .map_err(|e| format!("Failed to read waveform file: {}", e))?;
    serde_json::from_str::<ffmpeg::handler::WaveformData>(&content)
        .map_err(|e| format!("Failed to parse waveform JSON: {}", e))
}

/// 生成代理视频，输出到 app_data/temp/proxy/
#[derive(Serialize)]
pub struct ThumbnailBatchResponse {
    pub dir: String,
    pub first_frame: Option<String>,
    pub count: usize,
}

/// 生成缩略图（mode: first_screen/full），输出到 app_data/temp/thumbs/{media_id}
#[tauri::command]
pub async fn generate_thumbnails(
    app: AppHandle,
    input_path: String,
    media_id: String,
    mode: Option<String>,
    interval_sec: Option<f64>,
) -> Result<ThumbnailBatchResponse, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;
    let thumbs_dir = app_data_dir.join("temp").join("thumbs").join(&media_id);
    std::fs::create_dir_all(&thumbs_dir)
        .map_err(|e| format!("Failed to create thumbnail dir: {}", e))?;

    let ffmpeg_cmd = ffmpeg::path::get_ffmpeg_command(&app);
    let mode_value = mode.unwrap_or_else(|| "first_screen".to_string());
    let interval = interval_sec.unwrap_or(1.0);
    let result = ffmpeg::handler::generate_thumbnails(
        &input_path,
        &thumbs_dir.to_string_lossy(),
        &ffmpeg_cmd,
        &mode_value,
        interval,
    )
    .map_err(|e| format!("Failed to generate thumbnails: {}", e))?;

    let dir_relative = format!("temp/thumbs/{}", media_id);
    let first_relative = result
        .first_frame
        .and_then(|path| absolute_to_temp_relative(&app_data_dir, &path));

    Ok(ThumbnailBatchResponse {
        dir: dir_relative,
        first_frame: first_relative,
        count: result.count,
    })
}

fn absolute_to_temp_relative(
    app_data_dir: &std::path::PathBuf,
    absolute_or_relative: &str,
) -> Option<String> {
    let normalized = absolute_or_relative.replace('\\', "/");
    if normalized.starts_with("temp/") {
        return Some(normalized);
    }

    let base = app_data_dir.to_string_lossy().replace('\\', "/");
    normalized
        .strip_prefix(&(base + "/"))
        .map(std::string::ToString::to_string)
}
#[tauri::command]
pub async fn generate_proxy_video(
    app: AppHandle,
    input_path: String,
    media_id: String,
    profile: String,
) -> Result<String, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;

    let proxy_dir = app_data_dir.join("temp").join("proxy");
    std::fs::create_dir_all(&proxy_dir)
        .map_err(|e| format!("Failed to create proxy dir: {}", e))?;

    let output_file = format!("{}_{}.mp4", media_id, profile);
    let output_path = proxy_dir.join(output_file);
    let output_path_str = output_path
        .to_str()
        .ok_or_else(|| "Invalid proxy output path".to_string())?
        .to_string();

    #[derive(Serialize, Clone)]
    struct ProxyProgressEvent {
        media_id: String,
        progress: f64,
    }

    let ffmpeg_cmd = ffmpeg::path::get_ffmpeg_command(&app);
    let app_handle = app.clone();
    let media_id_for_event = media_id.clone();
    ffmpeg::handler::generate_proxy_video_with_progress(
        &input_path,
        &output_path_str,
        &profile,
        &ffmpeg_cmd,
        Some(move |progress| {
            let _ = app_handle.emit(
                "proxy-progress",
                ProxyProgressEvent {
                    media_id: media_id_for_event.clone(),
                    progress,
                },
            );
        }),
    )
    .map_err(|e| format!("Failed to generate proxy video: {}", e))?;

    let file_name = output_path
        .file_name()
        .map(|s| s.to_string_lossy().to_string())
        .ok_or_else(|| "Invalid proxy file name".to_string())?;

    Ok(format!("temp/proxy/{}", file_name))
}
