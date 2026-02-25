## 视频编辑项目文件格式规范

### 概述
本规范定义了视频编辑项目的 JSON 数据结构，用于保存编辑状态、素材信息、轨道数据等。

**核心概念澄清：**
- **Media（素材）** - 原始的媒体文件（视频、音频、图片）
- **Clip（片段）** - 在时间线上放置的素材段，包含位置、时间、特效等信息
- **Frame（帧）** - 视频中的单个画面，是视频的最小单位（通常不在 JSON 中存储，而是动态生成或缓存）
- **Track（轨道）** - 包含多个 Clips 的容器，可以是视频轨道、音频轨道或文本轨道

### 顶层结构

```yaml
项目信息 (Project)
  ├─ 项目元数据
  │   ├─ 项目名称
  │   ├─ 创建时间
  │   ├─ 修改时间
  │   ├─ 项目版本
  │   └─ 项目描述
  │
  ├─ 素材库 (Media Library)
  │   ├─ 视频文件列表
  │   ├─ 音频文件列表
  │   ├─ 图片文件列表
  │   └─ 素材分类/文件夹结构
  │
  ├─ 轨道列表 (Tracks)
  │   ├─ 视频轨道 (Video Track)
  │   │   ├─ 轨道 ID
  │   │   ├─ 轨道名称
  │   │   ├─ 轨道顺序
  │   │   ├─ 轨道高度
  │   │   ├─ 片段列表 (Clips)
  │   │   │   ├─ 片段 ID
  │   │   │   ├─ 素材 ID（关联到素材库）
  │   │   │   ├─ 开始时间
  │   │   │   ├─ 持续时间
  │   │   │   ├─ 入点（trim start）
  │   │   │   ├─ 出点（trim end）
  │   │   │   ├─ 位置信息（x, y, 宽, 高）
  │   │   │   ├─ 缩放信息
  │   │   │   ├─ 旋转角度
  │   │   │   ├─ 透明度
  │   │   │   └─ 特效列表
  │   │   │
  │   │   └─ 转场列表 (Transitions)
  │   │       ├─ 转场 ID
  │   │       ├─ 转场类型
  │   │       ├─ 持续时间
  │   │       └─ 参数
  │   │
  │   └─ 音频轨道 (Audio Track)
  │       ├─ 轨道 ID
  │       ├─ 轨道名称
  │       ├─ 轨道顺序
  │       ├─ 片段列表
  │       │   ├─ 片段 ID
  │       │   ├─ 素材 ID
  │       │   ├─ 开始时间
  │       │   ├─ 持续时间
  │       │   ├─ 入点
  │       │   ├─ 出点
  │       │   ├─ 音量
  │       │   ├─ 平衡
  │       │   └─ 特效列表
  │       │
  │       └─ 转场列表
  │
  ├─ 时间线配置 (Timeline Config)
  │   ├─ 总时长
  │   ├─ 帧率 (FPS)
  │   ├─ 分辨率 (宽 x 高)
  │   ├─ 缩放级别
  │   └─ 播放头位置
  │
  └─ 临时文件信息 (Temp Files)
      ├─ 缓存目录
      ├─ 帧缓存列表
      └─ 临时文件清单
```

### 详细字段说明

#### 媒体文件对象
```json
{
  "id": "media_001",
  "name": "video.mp4",
  "type": "video",  // video | audio | image
  "path": "/path/to/file",
  "duration": 10.5,
  "width": 1920,
  "height": 1080,
  "fps": 30,
  "codec": "h264",
  "fileSize": 52428800,
  "createdAt": "2024-02-25T10:00:00Z",
  "thumbnailUrl": "cache://thumb_001.jpg"
}
```

#### 片段对象
```json
{
  "id": "clip_001",
  "mediaId": "media_001",
  "trackId": "track_video_001",
  "startTime": 0,           // 在时间线上的开始时间（秒）
  "duration": 5,            // 片段在时间线上的持续时间（秒）
  "trimStart": 0,           // 素材的入点（秒）
  "trimEnd": 5,             // 素材的出点（秒）
  "position": {
    "x": 0,
    "y": 0
  },
  "scale": {
    "x": 1.0,
    "y": 1.0
  },
  "rotation": 0,            // 旋转角度（度）
  "opacity": 1.0,           // 透明度 0-1
  "effects": [
    {
      "id": "effect_001",
      "type": "brightness",
      "params": {
        "value": 1.2
      }
    }
  ]
}
```

#### 转场对象
```json
{
  "id": "transition_001",
  "type": "fade",           // fade | dissolve | wipeLeft | wipeRight 等
  "duration": 0.5,          // 转场持续时间（秒）
  "fromClipId": "clip_001",
  "toClipId": "clip_002",
  "params": {
    "easing": "easeInOut"
  }
}
```

#### 轨道对象
```json
{
  "id": "track_video_001",
  "name": "视频 1",
  "type": "video",          // video | audio
  "order": 1,               // 显示顺序
  "height": 80,             // 轨道高度（像素）
  "visible": true,
  "locked": false,
  "clips": [],              // 片段列表
  "transitions": []         // 转场列表
}
```


### 补充说明

#### 1. 特效对象详细定义
```json
{
  "id": "effect_001",
  "type": "brightness",     // brightness | contrast | saturation | hue | blur | etc
  "enabled": true,
  "startTime": 0,           // 特效开始时间（相对于片段）
  "duration": 5,            // 特效持续时间
  "params": {
    "value": 1.2,
    "keyframes": [
      {
        "time": 0,
        "value": 1.0
      },
      {
        "time": 2.5,
        "value": 1.5
      },
      {
        "time": 5,
        "value": 1.0
      }
    ]
  }
}
```

#### 2. 音频特效对象
```json
{
  "id": "audio_effect_001",
  "type": "volume",         // volume | fade | equalize | reverb | etc
  "enabled": true,
  "startTime": 0,
  "duration": 8,
  "params": {
    "volume": 0.8,
    "keyframes": [
      {
        "time": 0,
        "value": 0
      },
      {
        "time": 1,
        "value": 0.8
      },
      {
        "time": 7,
        "value": 0.8
      },
      {
        "time": 8,
        "value": 0
      }
    ]
  }
}
```

#### 3. 导出配置
```json
{
  "exportConfig": {
    "format": "mp4",        // mp4 | webm | mov | avi | etc
    "codec": "h264",        // h264 | h265 | vp9 | etc
    "bitrate": "5000k",
    "fps": 30,
    "resolution": {
      "width": 1920,
      "height": 1080
    },
    "audioCodec": "aac",
    "audioBitrate": "192k",
    "audioSampleRate": 48000,
    "quality": "high"       // low | medium | high
  }
}
```

#### 4. 撤销/重做历史
```json
{
  "history": {
    "undoStack": [
      {
        "id": "action_001",
        "type": "addClip",
        "timestamp": "2024-02-25T10:00:00Z",
        "data": {
          "clipId": "clip_001",
          "trackId": "track_video_001"
        }
      }
    ],
    "redoStack": [],
    "maxHistorySize": 100
  }
}
```

#### 5. 项目设置
```json
{
  "settings": {
    "autoSave": true,
    "autoSaveInterval": 300,  // 秒
    "snapToGrid": true,
    "snapThreshold": 5,       // 像素
    "showRuler": true,
    "showGuides": true,
    "defaultTransitionDuration": 0.5,
    "defaultClipDuration": 5,
    "theme": "dark"           // dark | light
  }
}
```

#### 6. 关键帧动画
```json
{
  "keyframes": [
    {
      "time": 0,
      "properties": {
        "x": 0,
        "y": 0,
        "scale": 1.0,
        "opacity": 1.0,
        "rotation": 0
      },
      "easing": "linear"      // linear | easeIn | easeOut | easeInOut | etc
    },
    {
      "time": 2.5,
      "properties": {
        "x": 100,
        "y": 50,
        "scale": 1.2,
        "opacity": 0.8,
        "rotation": 45
      },
      "easing": "easeInOut"
    },
    {
      "time": 5,
      "properties": {
        "x": 0,
        "y": 0,
        "scale": 1.0,
        "opacity": 1.0,
        "rotation": 0
      },
      "easing": "easeOut"
    }
  ]
}
```

#### 7. 文本/字幕轨道
```json
{
  "id": "track_text_001",
  "name": "字幕",
  "type": "text",
  "order": 3,
  "visible": true,
  "locked": false,
  "clips": [
    {
      "id": "text_clip_001",
      "trackId": "track_text_001",
      "startTime": 0,
      "duration": 5,
      "content": "欢迎观看",
      "style": {
        "fontFamily": "Arial",
        "fontSize": 48,
        "fontWeight": "bold",
        "color": "#FFFFFF",
        "backgroundColor": "rgba(0,0,0,0.5)",
        "textAlign": "center",
        "position": {
          "x": 960,
          "y": 540
        }
      }
    }
  ]
}
```

#### 8. 色彩校正
```json
{
  "colorCorrection": {
    "brightness": 0,        // -100 to 100
    "contrast": 0,          // -100 to 100
    "saturation": 0,        // -100 to 100
    "hue": 0,               // -180 to 180
    "temperature": 0,       // -100 to 100
    "tint": 0,              // -100 to 100
    "shadows": 0,
    "midtones": 0,
    "highlights": 0,
    "curves": {
      "red": [],
      "green": [],
      "blue": [],
      "luminance": []
    }
  }
}
```

### 数据验证规则

1. **时间值** - 必须为非负数，单位为秒
2. **ID 唯一性** - 所有 ID 在项目内必须唯一
3. **引用完整性** - 所有 mediaId、trackId、clipId 必须存在
4. **时间线顺序** - 片段应按 startTime 排序
5. **持续时间** - duration 必须大于 0
6. **范围值** - opacity、volume 等范围值必须在 0-1 之间
7. **文件路径** - 必须是有效的相对或绝对路径

### 文件保存建议

1. **文件格式** - 使用 `.veproj` 作为项目文件扩展名
2. **压缩** - 可选使用 ZIP 压缩，包含 JSON 和缓存文件
3. **版本控制** - 在 metadata.version 中记录格式版本
4. **备份** - 自动保存备份文件（.veproj.bak）
5. **加密** - 敏感项目可选加密存储

### 扩展性考虑

- 预留 `customData` 字段用于第三方插件扩展
- 支持插件系统的特效和转场类型
- 允许自定义轨道类型
- 支持嵌套项目（子项目）


### 概念详解

#### Media vs Clip vs Frame

```
┌─────────────────────────────────────────────────────────────┐
│ 素材库 (Media Library)                                       │
│ ┌──────────────────────────────────────────────────────────┐│
│ │ media_video_001: video.mp4 (10秒, 300帧)                 ││
│ │ - 这是原始文件，未被编辑                                  ││
│ └──────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
                            ↓ 拖入时间线
┌─────────────────────────────────────────────────────────────┐
│ 时间线 (Timeline)                                            │
│ ┌──────────────────────────────────────────────────────────┐│
│ │ Track: 视频轨道 1                                         ││
│ │ ┌────────────────────────────────────────────────────────┐││
│ │ │ Clip: clip_001                                         │││
│ │ │ - mediaId: media_video_001                             │││
│ │ │ - startTime: 0秒                                       │││
│ │ │ - duration: 5秒                                        │││
│ │ │ - trimStart: 0秒 (使用素材的前5秒)                     │││
│ │ │ - trimEnd: 5秒                                         │││
│ │ │ - 包含 150 个 Frames (5秒 × 30fps)                     │││
│ │ │ - 特效、位置、缩放等编辑信息                            │││
│ │ └────────────────────────────────────────────────────────┘││
│ │                                                            ││
│ │ ┌────────────────────────────────────────────────────────┐││
│ │ │ Clip: clip_002                                         │││
│ │ │ - mediaId: media_video_001                             │││
│ │ │ - startTime: 6秒 (与前一个Clip有1秒间隔)               │││
│ │ │ - duration: 4秒                                        │││
│ │ │ - trimStart: 5秒 (使用素材的5-9秒部分)                 │││
│ │ │ - trimEnd: 9秒                                         │││
│ │ │ - 包含 120 个 Frames (4秒 × 30fps)                     │││
│ │ └────────────────────────────────────────────────────────┘││
│ └──────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
                            ↓ 播放时
┌─────────────────────────────────────────────────────────────┐
│ 渲染引擎 (Render Engine)                                     │
│ ┌──────────────────────────────────────────────────────────┐│
│ │ 时间 0.0s: 渲染 clip_001 的 frame_0                      ││
│ │ 时间 0.033s: 渲染 clip_001 的 frame_1                    ││
│ │ 时间 0.066s: 渲染 clip_001 的 frame_2                    ││
│ │ ...                                                       ││
│ │ 时间 5.0s: 渲染 clip_001 的 frame_150                    ││
│ │ 时间 5.0-6.0s: 空白 (两个Clip之间的间隔)                 ││
│ │ 时间 6.0s: 渲染 clip_002 的 frame_0                      ││
│ │ ...                                                       ││
│ └──────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

#### 数据流向

```
用户操作
  ↓
拖入视频文件到时间线
  ↓
创建 Clip 对象 (包含 mediaId, startTime, duration 等)
  ↓
保存到 JSON (Clip 信息)
  ↓
播放时:
  ├─ 读取 Clip 信息
  ├─ 根据 mediaId 找到原始媒体文件
  ├─ 根据 trimStart/trimEnd 确定要使用的部分
  ├─ 动态解码生成 Frames
  ├─ 应用特效和变换
  └─ 渲染到屏幕
```

#### 为什么不在 JSON 中存储 Frames？

1. **文件大小** - 一个 1 小时的视频有 108,000 帧，存储所有帧数据会非常庞大
2. **冗余** - 帧数据已经在原始媒体文件中，无需重复存储
3. **灵活性** - 可以动态调整帧率、分辨率等参数
4. **缓存** - 帧可以按需生成并缓存到临时文件中

#### 帧缓存机制

```json
{
  "tempFiles": {
    "frameCaches": [
      {
        "clipId": "clip_001",
        "cacheDir": "/tmp/video-editor-cache/clips/clip_001",
        "frameCount": 150,
        "frameInterval": 0.1,
        "frames": [
          {
            "index": 0,
            "timestamp": 0,
            "filePath": "cache://frame_0.jpg"
          },
          {
            "index": 1,
            "timestamp": 0.033,
            "filePath": "cache://frame_1.jpg"
          }
        ]
      }
    ]
  }
}
```

这样做的好处：
- 快速预览（不需要重新解码）
- 减少 CPU 使用
- 支持离线编辑
- 可以清理缓存释放空间


### 重复压缩机制 (Repetition Compression)

#### 概念
当相邻的多个 Clips 使用相同的媒体、特效、变换等属性时，可以将它们合并为一个 Clip，并记录重复次数。

#### 示例

**未压缩的情况：**
```json
{
  "clips": [
    {
      "id": "clip_001",
      "mediaId": "media_image_001",
      "startTime": 0,
      "duration": 1,
      "trimStart": 0,
      "trimEnd": 1,
      "opacity": 1.0,
      "effects": []
    },
    {
      "id": "clip_002",
      "mediaId": "media_image_001",
      "startTime": 1,
      "duration": 1,
      "trimStart": 0,
      "trimEnd": 1,
      "opacity": 1.0,
      "effects": []
    },
    {
      "id": "clip_003",
      "mediaId": "media_image_001",
      "startTime": 2,
      "duration": 1,
      "trimStart": 0,
      "trimEnd": 1,
      "opacity": 1.0,
      "effects": []
    }
  ]
}
```

**压缩后的情况：**
```json
{
  "clips": [
    {
      "id": "clip_001",
      "mediaId": "media_image_001",
      "startTime": 0,
      "duration": 1,
      "trimStart": 0,
      "trimEnd": 1,
      "opacity": 1.0,
      "effects": [],
      "repeatCount": 3,
      "repeatMode": "sequential"
    }
  ]
}
```

#### 压缩规则

Clips 可以被合并的条件（所有条件都必须满足）：
1. **相邻** - 前一个 Clip 的结束时间 = 后一个 Clip 的开始时间
2. **同一轨道** - 都在同一个 Track 中
3. **同一媒体** - mediaId 相同
4. **相同的编辑参数**：
   - duration 相同
   - trimStart 相同
   - trimEnd 相同
   - position 相同
   - scale 相同
   - rotation 相同
   - opacity 相同
5. **相同的特效** - effects 数组完全相同
6. **相同的关键帧** - keyframes 完全相同

#### 压缩后的 Clip 结构

```json
{
  "id": "clip_001",
  "mediaId": "media_image_001",
  "startTime": 0,
  "duration": 1,
  "trimStart": 0,
  "trimEnd": 1,
  "position": { "x": 0, "y": 0 },
  "scale": { "x": 1.0, "y": 1.0 },
  "rotation": 0,
  "opacity": 1.0,
  "effects": [],
  "keyframes": [],
  
  // 新增字段：重复压缩信息
  "repeatCount": 3,           // 重复次数（包括原始的1次）
  "repeatMode": "sequential", // sequential | pattern
  "originalClipIds": [        // 原始的 Clip IDs（用于撤销/重做）
    "clip_001",
    "clip_002",
    "clip_003"
  ]
}
```

#### 解压缩算法

```typescript
function decompressClips(compressedClips: Clip[]): Clip[] {
  const decompressed: Clip[] = [];
  
  for (const clip of compressedClips) {
    if (clip.repeatCount && clip.repeatCount > 1) {
      // 解压缩重复的 Clips
      for (let i = 0; i < clip.repeatCount; i++) {
        const newClip = {
          ...clip,
          id: clip.originalClipIds?.[i] || `${clip.id}_${i}`,
          startTime: clip.startTime + (i * clip.duration),
          repeatCount: undefined,  // 移除重复信息
          repeatMode: undefined,
          originalClipIds: undefined
        };
        decompressed.push(newClip);
      }
    } else {
      decompressed.push(clip);
    }
  }
  
  return decompressed;
}
```

#### 压缩算法

```typescript
function compressClips(clips: Clip[]): Clip[] {
  const compressed: Clip[] = [];
  let i = 0;
  
  while (i < clips.length) {
    const currentClip = clips[i];
    let repeatCount = 1;
    const originalClipIds = [currentClip.id];
    
    // 检查相邻的重复 Clips
    while (i + repeatCount < clips.length) {
      const nextClip = clips[i + repeatCount];
      
      // 检查是否可以合并
      if (canMerge(currentClip, nextClip, repeatCount)) {
        originalClipIds.push(nextClip.id);
        repeatCount++;
      } else {
        break;
      }
    }
    
    // 如果有重复，添加压缩信息
    if (repeatCount > 1) {
      compressed.push({
        ...currentClip,
        repeatCount,
        repeatMode: 'sequential',
        originalClipIds
      });
    } else {
      compressed.push(currentClip);
    }
    
    i += repeatCount;
  }
  
  return compressed;
}

function canMerge(clip1: Clip, clip2: Clip, offset: number): boolean {
  // 检查相邻性
  if (clip1.startTime + clip1.duration !== clip2.startTime) {
    return false;
  }
  
  // 检查其他条件
  return (
    clip1.mediaId === clip2.mediaId &&
    clip1.duration === clip2.duration &&
    clip1.trimStart === clip2.trimStart &&
    clip1.trimEnd === clip2.trimEnd &&
    JSON.stringify(clip1.position) === JSON.stringify(clip2.position) &&
    JSON.stringify(clip1.scale) === JSON.stringify(clip2.scale) &&
    clip1.rotation === clip2.rotation &&
    clip1.opacity === clip2.opacity &&
    JSON.stringify(clip1.effects) === JSON.stringify(clip2.effects) &&
    JSON.stringify(clip1.keyframes) === JSON.stringify(clip2.keyframes)
  );
}
```

#### 优势

1. **文件大小减少** - 重复内容可以减少 50-90%
2. **加载速度快** - 需要解析的数据更少
3. **易于编辑** - 修改一个重复的 Clip 会影响所有重复
4. **撤销/重做** - 保留原始 ID 便于恢复

#### 使用场景

- **幻灯片** - 多张相同的图片连续显示
- **字幕** - 相同的字幕在多个时间段显示
- **背景** - 相同的背景视频重复播放
- **音效** - 相同的音效多次播放
- **转场** - 相同的转场效果多次使用

#### 注意事项

1. **保存时自动压缩** - 导出 JSON 时自动执行压缩
2. **编辑时自动解压** - 加载 JSON 时自动解压缩
3. **修改时重新压缩** - 编辑后需要重新检查是否可以压缩
4. **兼容性** - 旧版本的编辑器可能不支持 repeatCount，需要先解压缩


### 文件格式与加密

#### 文件扩展名
- **`.hpve`** - HyperVideo Editor Project（超级视频编辑器项目）
- 对外隐藏 JSON 数据结构，提供专有格式

#### 文件结构

`.hpve` 文件是一个加密的 ZIP 压缩包，包含：

```
project.hpve
├── metadata.json (加密)
├── project.json (加密)
├── cache/
│   ├── thumbnails/
│   │   ├── thumb_001.jpg
│   │   └── thumb_002.jpg
│   └── frames/
│       ├── clip_001/
│       │   ├── frame_0.jpg
│       │   └── frame_1.jpg
│       └── clip_002/
│           └── frame_0.jpg
└── manifest.json (加密)
```

#### 加密方案

**使用 AES-256-GCM 加密：**

```typescript
import crypto from 'crypto';

// 加密配置
const ENCRYPTION_CONFIG = {
  algorithm: 'aes-256-gcm',
  keyLength: 32,           // 256 bits
  ivLength: 16,            // 128 bits
  saltLength: 16,
  tagLength: 16,
  iterations: 100000       // PBKDF2 迭代次数
};

// 生成密钥
function deriveKey(password: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(
    password,
    salt,
    ENCRYPTION_CONFIG.iterations,
    ENCRYPTION_CONFIG.keyLength,
    'sha256'
  );
}

// 加密数据
function encryptData(data: string, password: string): string {
  const salt = crypto.randomBytes(ENCRYPTION_CONFIG.saltLength);
  const key = deriveKey(password, salt);
  const iv = crypto.randomBytes(ENCRYPTION_CONFIG.ivLength);
  
  const cipher = crypto.createCipheriv(
    ENCRYPTION_CONFIG.algorithm,
    key,
    iv
  );
  
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // 格式: salt + iv + authTag + encrypted
  const result = Buffer.concat([salt, iv, authTag, Buffer.from(encrypted, 'hex')]);
  return result.toString('base64');
}

// 解密数据
function decryptData(encryptedData: string, password: string): string {
  const buffer = Buffer.from(encryptedData, 'base64');
  
  const salt = buffer.slice(0, ENCRYPTION_CONFIG.saltLength);
  const iv = buffer.slice(
    ENCRYPTION_CONFIG.saltLength,
    ENCRYPTION_CONFIG.saltLength + ENCRYPTION_CONFIG.ivLength
  );
  const authTag = buffer.slice(
    ENCRYPTION_CONFIG.saltLength + ENCRYPTION_CONFIG.ivLength,
    ENCRYPTION_CONFIG.saltLength + ENCRYPTION_CONFIG.ivLength + ENCRYPTION_CONFIG.tagLength
  );
  const encrypted = buffer.slice(
    ENCRYPTION_CONFIG.saltLength + ENCRYPTION_CONFIG.ivLength + ENCRYPTION_CONFIG.tagLength
  );
  
  const key = deriveKey(password, salt);
  
  const decipher = crypto.createDecipheriv(
    ENCRYPTION_CONFIG.algorithm,
    key,
    iv
  );
  
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted.toString('hex'), 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
```

#### 文件保存流程

```typescript
import JSZip from 'jszip';
import fs from 'fs';

async function saveProject(
  projectData: Project,
  filePath: string,
  password?: string
): Promise<void> {
  const zip = new JSZip();
  
  // 1. 准备数据
  const projectJson = JSON.stringify(projectData, null, 2);
  const metadata = {
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    encrypted: !!password
  };
  
  // 2. 加密（如果提供了密码）
  let projectContent = projectJson;
  let metadataContent = JSON.stringify(metadata);
  
  if (password) {
    projectContent = encryptData(projectJson, password);
    metadataContent = encryptData(JSON.stringify(metadata), password);
  }
  
  // 3. 添加到 ZIP
  zip.file('project.json', projectContent);
  zip.file('metadata.json', metadataContent);
  
  // 4. 添加缓存文件
  const cacheDir = projectData.tempFiles.cacheDir;
  if (fs.existsSync(cacheDir)) {
    const files = fs.readdirSync(cacheDir, { recursive: true });
    for (const file of files) {
      const filePath = `${cacheDir}/${file}`;
      if (fs.statSync(filePath).isFile()) {
        const content = fs.readFileSync(filePath);
        zip.file(`cache/${file}`, content);
      }
    }
  }
  
  // 5. 生成 ZIP 文件
  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
  fs.writeFileSync(filePath, zipBuffer);
}
```

#### 文件加载流程

```typescript
async function loadProject(
  filePath: string,
  password?: string
): Promise<Project> {
  // 1. 读取 ZIP 文件
  const zipBuffer = fs.readFileSync(filePath);
  const zip = await JSZip.loadAsync(zipBuffer);
  
  // 2. 读取项目数据
  let projectContent = await zip.file('project.json').async('string');
  let metadataContent = await zip.file('metadata.json').async('string');
  
  // 3. 解密（如果需要）
  let projectData: Project;
  let metadata: any;
  
  try {
    if (password) {
      projectContent = decryptData(projectContent, password);
      metadataContent = decryptData(metadataContent, password);
    }
    
    projectData = JSON.parse(projectContent);
    metadata = JSON.parse(metadataContent);
  } catch (error) {
    throw new Error('Failed to decrypt project. Invalid password or corrupted file.');
  }
  
  // 4. 提取缓存文件
  const cacheDir = projectData.tempFiles.cacheDir;
  for (const [path, file] of Object.entries(zip.files)) {
    if (path.startsWith('cache/') && !file.dir) {
      const targetPath = `${cacheDir}/${path.replace('cache/', '')}`;
      const content = await file.async('nodebuffer');
      fs.mkdirSync(require('path').dirname(targetPath), { recursive: true });
      fs.writeFileSync(targetPath, content);
    }
  }
  
  return projectData;
}
```

#### 安全特性

1. **AES-256-GCM 加密** - 军事级加密算法
2. **PBKDF2 密钥派生** - 100,000 次迭代，防止暴力破解
3. **随机盐值** - 每次加密使用不同的盐值
4. **认证标签** - 检测数据篡改
5. **ZIP 压缩** - 减少文件大小

#### 密码保护选项

```typescript
interface SaveOptions {
  password?: string;           // 可选密码保护
  compress: boolean;           // 是否压缩 Clips
  includeCache: boolean;       // 是否包含缓存文件
  encryptionLevel: 'none' | 'standard' | 'high';
}

// 使用示例
await saveProject(projectData, 'project.hpve', {
  password: 'mySecurePassword',
  compress: true,
  includeCache: true,
  encryptionLevel: 'high'
});
```

#### 文件头识别

为了防止误操作，`.hpve` 文件应该有特殊的文件头：

```typescript
const HPVE_MAGIC = Buffer.from([0x48, 0x50, 0x56, 0x45]); // "HPVE"
const HPVE_VERSION = 1;

function isValidHpveFile(filePath: string): boolean {
  const buffer = Buffer.alloc(4);
  const fd = fs.openSync(filePath, 'r');
  fs.readSync(fd, buffer, 0, 4, 0);
  fs.closeSync(fd);
  
  return buffer.equals(HPVE_MAGIC);
}

// 保存时添加文件头
function addHpveHeader(zipBuffer: Buffer): Buffer {
  const header = Buffer.alloc(8);
  HPVE_MAGIC.copy(header, 0);
  header.writeUInt32BE(HPVE_VERSION, 4);
  
  return Buffer.concat([header, zipBuffer]);
}

// 加载时验证文件头
function validateHpveHeader(buffer: Buffer): boolean {
  if (buffer.length < 8) return false;
  
  const magic = buffer.slice(0, 4);
  const version = buffer.readUInt32BE(4);
  
  return magic.equals(HPVE_MAGIC) && version === HPVE_VERSION;
}
```

#### 版本兼容性

```json
{
  "metadata": {
    "version": "1.0.0",
    "minSupportedVersion": "1.0.0",
    "createdAt": "2024-02-25T10:00:00Z",
    "modifiedAt": "2024-02-25T15:30:00Z",
    "encrypted": true,
    "encryptionVersion": 1,
    "compressionEnabled": true
  }
}
```

#### 安全建议

1. **不要硬编码密码** - 从用户输入获取
2. **使用 HTTPS** - 传输文件时使用加密连接
3. **定期更新** - 使用最新的加密库
4. **备份密钥** - 提醒用户保存密码
5. **错误处理** - 不要泄露加密细节
6. **审计日志** - 记录文件访问历史

#### 与 Photoshop 的对比

| 特性 | Photoshop (.psd) | HPVE (.hpve) |
|------|------------------|--------------|
| 文件格式 | 专有二进制格式 | 加密 ZIP + JSON |
| 加密 | 可选密码保护 | AES-256-GCM |
| 压缩 | 内置压缩 | ZIP + 重复压缩 |
| 可读性 | 二进制，不可读 | 加密后不可读 |
| 扩展性 | 有限 | 高度可扩展 |
| 跨平台 | 是 | 是 |
