#!/bin/bash

# 为不同平台打包 FFmpeg 二进制文件

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
    else
        # Intel
        FFMPEG_PATH="/usr/local/bin/ffmpeg"
    fi
    
    if [ -f "$FFMPEG_PATH" ]; then
        cp "$FFMPEG_PATH" src-tauri/resources/bin/ffmpeg
        chmod +x src-tauri/resources/bin/ffmpeg
        echo "✓ FFmpeg bundled from $FFMPEG_PATH"
    else
        echo "✗ FFmpeg not found at $FFMPEG_PATH"
        echo "Please install FFmpeg: brew install ffmpeg"
        exit 1
    fi
    
elif [ "$PLATFORM" = "Linux" ]; then
    # Linux
    FFMPEG_PATH=$(which ffmpeg)
    if [ -n "$FFMPEG_PATH" ]; then
        cp "$FFMPEG_PATH" src-tauri/resources/bin/ffmpeg
        chmod +x src-tauri/resources/bin/ffmpeg
        echo "✓ FFmpeg bundled from $FFMPEG_PATH"
    else
        echo "✗ FFmpeg not found"
        echo "Please install FFmpeg: sudo apt install ffmpeg"
        exit 1
    fi
    
fi

echo "FFmpeg bundled successfully"

