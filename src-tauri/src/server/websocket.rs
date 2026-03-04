use anyhow::{Context, Result};
use futures::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::net::{TcpListener, TcpStream};
use tokio_tungstenite::accept_async;

use crate::ffmpeg::VideoStreamer;

#[derive(Debug, Serialize, Deserialize)]
pub struct PlayCommand {
    pub path: String,
    pub start_time: f64,
    pub end_time: f64,
    pub fps: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FrameMessage {
    pub timestamp: f64,
    pub frame_data: String, // base64-encoded JPEG data
}

/// WebSocket 服务器 - 用于实时视频帧流传输
pub struct WebSocketServer {
    listener: Option<TcpListener>,
    ffmpeg_cmd: String,
}

impl WebSocketServer {
    pub fn new(ffmpeg_cmd: String) -> Self {
        Self {
            listener: None,
            ffmpeg_cmd,
        }
    }

    /// 启动 WebSocket 服务器
    pub async fn start(&mut self, addr: &str) -> Result<()> {
        let listener = TcpListener::bind(addr)
            .await
            .context("Failed to bind WebSocket server")?;

        println!("WebSocket server listening on: {}", addr);
        self.listener = Some(listener);

        Ok(())
    }

    /// 接受一个新的连接
    pub async fn accept_connection(&self) -> Result<()> {
        if let Some(listener) = &self.listener {
            let (stream, _) = listener
                .accept()
                .await
                .context("Failed to accept connection")?;

            let ffmpeg_cmd = self.ffmpeg_cmd.clone();
            tokio::spawn(async move {
                if let Err(e) = handle_connection(stream, ffmpeg_cmd).await {
                    eprintln!("Connection error: {}", e);
                }
            });
        }

        Ok(())
    }
}

/// 处理单个 WebSocket 连接
async fn handle_connection(stream: TcpStream, ffmpeg_cmd: String) -> Result<()> {
    let ws_stream = accept_async(stream)
        .await
        .context("Failed to accept WebSocket connection")?;

    println!("New WebSocket connection established");

    let (mut ws_sender, mut ws_receiver) = ws_stream.split();
    let streamer = Arc::new(VideoStreamer::new(ffmpeg_cmd));

    while let Some(msg) = ws_receiver.next().await {
        match msg {
            Ok(tokio_tungstenite::tungstenite::Message::Text(text)) => {
                // 解析播放命令
                match serde_json::from_str::<PlayCommand>(&text) {
                    Ok(cmd) => {
                        println!("Received play command: {:?}", cmd);

                        // 流式解码并发送帧
                        if let Err(e) = stream_frames(
                            &mut ws_sender,
                            &streamer,
                            &cmd.path,
                            cmd.start_time,
                            cmd.end_time,
                            cmd.fps,
                        )
                        .await
                        {
                            eprintln!("Error streaming frames: {}", e);
                            break;
                        }
                    }
                    Err(e) => {
                        eprintln!("Failed to parse command: {}", e);
                    }
                }
            }
            Ok(tokio_tungstenite::tungstenite::Message::Close(_)) => {
                println!("WebSocket connection closed");
                break;
            }
            Err(e) => {
                eprintln!("WebSocket error: {}", e);
                break;
            }
            _ => {}
        }
    }

    Ok(())
}

/// 流式发送视频帧
async fn stream_frames(
    ws_sender: &mut futures::stream::SplitSink<
        tokio_tungstenite::WebSocketStream<TcpStream>,
        tokio_tungstenite::tungstenite::Message,
    >,
    streamer: &Arc<VideoStreamer>,
    path: &str,
    start_time: f64,
    end_time: f64,
    fps: f64,
) -> Result<()> {
    use base64::{engine::general_purpose, Engine as _};

    let frame_interval = 1.0 / fps;
    let mut current_time = start_time;
    let mut frame_count = 0;

    println!(
        "🎬 Starting frame stream: {:.2}s - {:.2}s @ {:.0} fps",
        start_time, end_time, fps
    );

    while current_time < end_time {
        // 解码帧
        let frame_data = streamer.decode_frame(path, current_time)?;

        // 编码为 base64
        let base64_str = general_purpose::STANDARD.encode(&frame_data);

        // 创建帧消息
        let frame_msg = FrameMessage {
            timestamp: current_time,
            frame_data: format!("data:image/jpeg;base64,{}", base64_str),
        };

        // 序列化为 JSON
        let json = serde_json::to_string(&frame_msg)?;

        // 发送到前端
        ws_sender
            .send(tokio_tungstenite::tungstenite::Message::Text(json))
            .await
            .context("Failed to send frame")?;

        frame_count += 1;
        current_time += frame_interval;

        // 让出控制权，避免阻塞
        tokio::task::yield_now().await;
    }

    println!("✅ Stream finished: {} frames sent", frame_count);

    // 发送完成信号
    ws_sender
        .send(tokio_tungstenite::tungstenite::Message::Text(
            r#"{"type":"done"}"#.to_string(),
        ))
        .await
        .context("Failed to send done message")?;

    Ok(())
}
