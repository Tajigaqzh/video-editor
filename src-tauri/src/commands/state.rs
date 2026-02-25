use std::sync::Mutex;

/// 应用全局状态
pub struct AppState {
    pub ffmpeg_initialized: Mutex<bool>,
}
