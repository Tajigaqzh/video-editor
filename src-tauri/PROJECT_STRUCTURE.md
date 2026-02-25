# Rust 项目结构说明

## 目录结构

```
src-tauri/src/
├── lib.rs                 # 主入口 - 应用初始化和 Tauri 配置
├── main.rs               # 二进制入口 - 调用 lib.rs 的 run() 函数
│
├── ffmpeg/               # FFmpeg 相关模块 - 视频处理核心
│   ├── mod.rs            # 模块导出
│   ├── handler.rs        # FFmpeg 命令处理 - 视频信息获取、帧提取、视频编辑等
│   ├── path.rs           # FFmpeg 路径管理 - 获取 FFmpeg/FFprobe 命令路径
│   └── streamer.rs       # 视频流解码 - 实时解码视频帧
│
├── server/               # 服务器相关模块
│   ├── mod.rs            # 模块导出
│   └── websocket.rs      # WebSocket 服务器 - 实时视频帧流传输
│
├── commands/             # Tauri 命令模块 - 前端调用的 API
│   ├── mod.rs            # 模块导出
│   ├── handlers.rs       # 命令处理器 - 所有 Tauri 命令的实现
│   └── state.rs          # 应用状态 - 全局状态管理
```

## 模块职责

### ffmpeg 模块
负责所有 FFmpeg 相关的操作：
- **handler.rs**: 高级 FFmpeg 操作（获取视频信息、提取帧、编辑视频等）
- **path.rs**: 管理 FFmpeg 命令路径（跨平台支持）
- **streamer.rs**: 低级视频流解码（直接调用 FFmpeg 管道）

### server 模块
负责后端服务：
- **websocket.rs**: WebSocket 服务器实现，用于实时视频帧流传输

### commands 模块
负责 Tauri 命令接口：
- **handlers.rs**: 所有 Tauri 命令的实现，作为前端和后端的桥梁
- **state.rs**: 应用全局状态（如 FFmpeg 初始化状态）

## 数据流

```
前端 (React/TypeScript)
    ↓
Tauri 命令 (commands/handlers.rs)
    ↓
FFmpeg 模块 (ffmpeg/*)
    ↓
FFmpeg 进程
    ↓
视频文件
```

## 关键特性

### 跨平台支持
- Windows: 使用 `ffmpeg.exe` 和 `ffprobe.exe`
- macOS/Linux: 使用 `ffmpeg` 和 `ffprobe`

### 性能优化
- 流式解码：直接从 FFmpeg 管道读取数据，避免文件 I/O
- Base64 编码：将二进制数据转换为可传输的格式
- 帧缓存：前端缓存已解码的帧，减少重复解码

### 实时流传输
- WebSocket 服务器在应用启动时自动启动
- 支持实时视频帧流传输
- 异步处理，不阻塞主线程

## 添加新功能的步骤

1. **如果是 FFmpeg 操作**：在 `ffmpeg/handler.rs` 中添加新函数
2. **如果需要新的 Tauri 命令**：在 `commands/handlers.rs` 中添加 `#[tauri::command]` 函数
3. **如果需要新的服务**：在 `server/` 中创建新模块
4. **更新 lib.rs**：在 `invoke_handler` 中注册新命令

## 编译和运行

```bash
# 编译
cargo build --manifest-path src-tauri/Cargo.toml

# 运行（开发模式）
pnpm start

# 构建发布版本
pnpm tauri build
```
