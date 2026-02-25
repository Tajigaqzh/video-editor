#!/usr/bin/env python3
"""
创建示例 HPVE 项目文件
"""

import json
import base64
import os
import hashlib
import hmac
import secrets
import zipfile
from datetime import datetime

try:
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    HAS_CRYPTO = True
except ImportError:
    HAS_CRYPTO = False

def pbkdf2_hmac(password: str, salt: bytes, iterations: int = 100000) -> bytes:
    """使用 PBKDF2 派生密钥"""
    return hashlib.pbkdf2_hmac('sha256', password.encode(), salt, iterations, dklen=32)

def encrypt_data(data: str, password: str) -> str:
    """加密数据"""
    if not HAS_CRYPTO:
        raise ImportError("cryptography library required. Install with: pip install cryptography")
    
    # 生成随机盐值和 IV
    salt = secrets.token_bytes(16)
    iv = secrets.token_bytes(12)
    
    # 派生密钥
    key = pbkdf2_hmac(password, salt)
    
    # 加密
    cipher = AESGCM(key)
    ciphertext = cipher.encrypt(iv, data.encode(), None)
    
    # 组合: salt + iv + ciphertext
    result = salt + iv + ciphertext
    
    # Base64 编码
    return base64.b64encode(result).decode()

def create_sample_project():
    """创建示例项目数据"""
    project = {
        "metadata": {
            "name": "Sample Video Project",
            "description": "A sample video editing project created with HPVE format",
            "version": "1.0.0",
            "createdAt": "2024-02-25T10:00:00Z",
            "modifiedAt": "2024-02-25T15:30:00Z"
        },
        "timeline": {
            "fps": 30,
            "resolution": {
                "width": 1920,
                "height": 1080
            },
            "duration": 15.0,
            "playheadPosition": 0
        },
        "media": [
            {
                "id": "media_001",
                "name": "sample_video.mp4",
                "type": "video",
                "path": "/path/to/sample_video.mp4",
                "duration": 10.5,
                "width": 1920,
                "height": 1080,
                "fps": 30,
                "codec": "h264",
                "fileSize": 52428800,
                "createdAt": "2024-02-25T10:00:00Z"
            },
            {
                "id": "media_002",
                "name": "background_music.mp3",
                "type": "audio",
                "path": "/path/to/background_music.mp3",
                "duration": 15.0,
                "codec": "aac",
                "fileSize": 2097152,
                "createdAt": "2024-02-25T10:05:00Z"
            }
        ],
        "tracks": [
            {
                "id": "track_video_001",
                "name": "Video Track 1",
                "type": "video",
                "order": 1,
                "height": 100,
                "visible": True,
                "locked": False,
                "clips": [
                    {
                        "id": "clip_001",
                        "mediaId": "media_001",
                        "trackId": "track_video_001",
                        "startTime": 0,
                        "duration": 5,
                        "trimStart": 0,
                        "trimEnd": 5,
                        "position": {"x": 0, "y": 0},
                        "scale": {"x": 1.0, "y": 1.0},
                        "rotation": 0,
                        "opacity": 1.0,
                        "effects": []
                    },
                    {
                        "id": "clip_002",
                        "mediaId": "media_001",
                        "trackId": "track_video_001",
                        "startTime": 6,
                        "duration": 4.5,
                        "trimStart": 5,
                        "trimEnd": 9.5,
                        "position": {"x": 0, "y": 0},
                        "scale": {"x": 1.0, "y": 1.0},
                        "rotation": 0,
                        "opacity": 1.0,
                        "effects": [
                            {
                                "id": "effect_001",
                                "type": "brightness",
                                "enabled": True,
                                "params": {
                                    "value": 1.2
                                }
                            }
                        ]
                    }
                ],
                "transitions": [
                    {
                        "id": "transition_001",
                        "type": "fade",
                        "duration": 0.5,
                        "fromClipId": "clip_001",
                        "toClipId": "clip_002",
                        "params": {
                            "easing": "easeInOut"
                        }
                    }
                ]
            },
            {
                "id": "track_audio_001",
                "name": "Audio Track 1",
                "type": "audio",
                "order": 2,
                "height": 60,
                "visible": True,
                "locked": False,
                "clips": [
                    {
                        "id": "audio_clip_001",
                        "mediaId": "media_002",
                        "trackId": "track_audio_001",
                        "startTime": 0,
                        "duration": 15.0,
                        "trimStart": 0,
                        "trimEnd": 15.0,
                        "effects": [
                            {
                                "id": "audio_effect_001",
                                "type": "volume",
                                "enabled": True,
                                "params": {
                                    "volume": 0.8
                                }
                            }
                        ]
                    }
                ],
                "transitions": []
            }
        ],
        "settings": {
            "autoSave": True,
            "autoSaveInterval": 300,
            "snapToGrid": True,
            "snapThreshold": 5,
            "showRuler": True,
            "showGuides": True,
            "defaultTransitionDuration": 0.5,
            "theme": "dark"
        },
        "history": {
            "undoStack": [],
            "redoStack": [],
            "maxHistorySize": 100
        }
    }
    return project

def create_metadata():
    """创建元数据"""
    return {
        "version": "1.0.0",
        "minSupportedVersion": "1.0.0",
        "createdAt": datetime.utcnow().isoformat() + "Z",
        "modifiedAt": datetime.utcnow().isoformat() + "Z",
        "encrypted": True,
        "encryptionVersion": 1,
        "compressionEnabled": True
    }

def save_hpve_file(output_path: str, password: str = "demo123"):
    """保存 HPVE 文件"""
    print("📝 Creating sample project...")
    project = create_sample_project()
    metadata = create_metadata()
    
    # 转换为 JSON
    project_json = json.dumps(project, indent=2)
    metadata_json = json.dumps(metadata, indent=2)
    
    print("🔐 Encrypting data...")
    # 加密
    encrypted_project = encrypt_data(project_json, password)
    encrypted_metadata = encrypt_data(metadata_json, password)
    
    print("📦 Creating ZIP file...")
    # 创建 ZIP 文件
    with zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED) as zf:
        zf.writestr('project.json', encrypted_project)
        zf.writestr('metadata.json', encrypted_metadata)
    
    # 获取文件大小
    file_size = os.path.getsize(output_path)
    
    print(f"\n✅ Sample project created successfully!")
    print(f"📄 File: {output_path}")
    print(f"📊 Size: {file_size} bytes")
    print(f"🔐 Password: {password}")
    print(f"📝 Project name: {project['metadata']['name']}")
    print(f"⏱️  Duration: {project['timeline']['duration']} seconds")
    print(f"📹 Resolution: {project['timeline']['resolution']['width']}x{project['timeline']['resolution']['height']}")
    print(f"🎬 FPS: {project['timeline']['fps']}")
    print(f"🎵 Tracks: {len(project['tracks'])} (1 video, 1 audio)")
    print(f"📦 Media files: {len(project['media'])}")

if __name__ == '__main__':
    output_file = 'sample_project.hpve'
    password = 'demo123'
    
    try:
        save_hpve_file(output_file, password)
        print(f"\n💡 To load this file, use:")
        print(f"   await loadProject('{output_file}', '{password}');")
    except ImportError as e:
        print(f"❌ Error: {e}")
    except Exception as e:
        print(f"❌ Error: {e}")
