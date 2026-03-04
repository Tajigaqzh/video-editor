#!/bin/bash

# 为不同平台打包 FFmpeg/FFprobe 二进制文件

PLATFORM=$(uname -s)
ARCH=$(uname -m)

echo "Bundling FFmpeg for $PLATFORM $ARCH"

# 创建资源目录
mkdir -p src-tauri/resources/bin

if [ "$PLATFORM" = "Darwin" ]; then
    # macOS
    if [ "$ARCH" = "arm64" ]; then
        # Apple Silicon
        FFMPEG_PATH="/opt/homebrew/bin/ffmpeg"
        FFPROBE_PATH="/opt/homebrew/bin/ffprobe"
    else
        # Intel
        FFMPEG_PATH="/usr/local/bin/ffmpeg"
        FFPROBE_PATH="/usr/local/bin/ffprobe"
    fi

    if [ -f "$FFMPEG_PATH" ] && [ -f "$FFPROBE_PATH" ]; then
        cp "$FFMPEG_PATH" src-tauri/resources/bin/ffmpeg
        chmod +x src-tauri/resources/bin/ffmpeg
        cp "$FFPROBE_PATH" src-tauri/resources/bin/ffprobe
        chmod +x src-tauri/resources/bin/ffprobe
        echo "✓ FFmpeg bundled from $FFMPEG_PATH"
        echo "✓ FFprobe bundled from $FFPROBE_PATH"
    else
        echo "✗ FFmpeg/FFprobe not found at $FFMPEG_PATH / $FFPROBE_PATH"
        echo "Please install FFmpeg: brew install ffmpeg"
        exit 1
    fi

elif [ "$PLATFORM" = "Linux" ]; then
    # Linux
    FFMPEG_PATH=$(which ffmpeg)
    FFPROBE_PATH=$(which ffprobe)
    if [ -n "$FFMPEG_PATH" ] && [ -n "$FFPROBE_PATH" ]; then
        cp "$FFMPEG_PATH" src-tauri/resources/bin/ffmpeg
        chmod +x src-tauri/resources/bin/ffmpeg
        cp "$FFPROBE_PATH" src-tauri/resources/bin/ffprobe
        chmod +x src-tauri/resources/bin/ffprobe
        echo "✓ FFmpeg bundled from $FFMPEG_PATH"
        echo "✓ FFprobe bundled from $FFPROBE_PATH"
    else
        echo "✗ FFmpeg/FFprobe not found"
        echo "Please install FFmpeg: sudo apt install ffmpeg"
        exit 1
    fi

fi

echo "FFmpeg/FFprobe bundled successfully"

