// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

mod commands;
mod ffmpeg;
pub mod media;
pub mod project;
mod server;

use std::sync::Mutex;

use commands::{
    batch_extract_frames, cleanup_temp_files, copy_media_to_temp, extract_frame,
    extract_frame_to_base64, extract_frame_to_temp, generate_proxy_video, generate_thumbnails,
    generate_waveform, get_temp_size, get_video_info, init_ffmpeg, load_project, load_waveform,
    merge_videos, remove_media_from_temp, resolve_media_path, save_project, start_websocket_server,
    stream_decode_frame, trim_video, validate_hpve_file, AppState,
};
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(AppState {
            ffmpeg_initialized: Mutex::new(false),
        })
        .invoke_handler(tauri::generate_handler![
            init_ffmpeg,
            get_video_info,
            extract_frame,
            extract_frame_to_temp,
            extract_frame_to_base64,
            trim_video,
            merge_videos,
            batch_extract_frames,
            stream_decode_frame,
            start_websocket_server,
            save_project,
            load_project,
            validate_hpve_file,
            copy_media_to_temp,
            get_temp_size,
            cleanup_temp_files,
            remove_media_from_temp,
            resolve_media_path,
            generate_waveform,
            load_waveform,
            generate_thumbnails,
            generate_proxy_video,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
