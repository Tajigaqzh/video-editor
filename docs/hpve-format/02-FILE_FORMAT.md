# HPVE 项目文件格式 - 完整规范

## 📋 文件格式概述

### 什么是 .hpve 文件？

`.hpve` (HyperVideo Editor Project) 是一个加密的 ZIP 压缩包，包含完整的视频编辑项目数据。

### 文件结构

```
project.hpve (ZIP 压缩包)
├── project.json (加密)      # 项目数据
├── metadata.json (加密)     # 项目元数据
└── cache/ (可选)            # 缓存文件
    ├── thumbnails/
    └── frames/
```

## 🔐 加密方案

### 算法详情

| 项目 | 值 | 说明 |
|------|-----|------|
| 对称加密 | AES-256-GCM | 提供认证加密 |
| 密钥派生 | PBKDF2-HMAC-SHA256 | 防暴力破解 |
| 迭代次数 | 100,000 | 增加计算成本 |
| 密钥长度 | 256 bits (32 bytes) | 军事级加密 |
| IV 长度 | 96 bits (12 bytes) | GCM 标准 |
| 盐值长度 | 128 bits (16 bytes) | 防彩虹表 |
| 认证标签 | 128 bits (16 bytes) | 检测篡改 |
| 编码 | Base64 | 安全传输 |

### 加密流程

```
用户密码
    ↓
PBKDF2 (100,000 iterations)
    ↓
256-bit 密钥
    ↓
AES-256-GCM 加密
    ↓
salt + iv + ciphertext + tag
    ↓
Base64 编码
    ↓
存储在 ZIP 中
```

## 📊 项目数据结构

### metadata.json

```json
{
  "version": "1.0.0",
  "minSupportedVersion": "1.0.0",
  "createdAt": "2024-02-25T10:00:00Z",
  "modifiedAt": "2024-02-25T15:30:00Z",
  "encrypted": true,
  "encryptionVersion": 1,
  "compressionEnabled": true
}
```

### project.json - 完整结构

```json
{
  "metadata": {
    "name": "Sample Video Project",
    "description": "Project description",
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
    "duration": 120.5,
    "playheadPosition": 0
  },
  "media": [
    {
      "id": "media_001",
      "name": "video.mp4",
      "type": "video",
      "path": "/path/to/file",
      "duration": 10.5,
      "width": 1920,
      "height": 1080,
      "fps": 30,
      "codec": "h264",
      "fileSize": 52428800,
      "createdAt": "2024-02-25T10:00:00Z"
    }
  ],
  "tracks": [
    {
      "id": "track_video_001",
      "name": "Video 1",
      "type": "video",
      "order": 1,
      "height": 100,
      "visible": true,
      "locked": false,
      "clips": [
        {
          "id": "clip_001",
          "mediaId": "media_001",
          "trackId": "track_video_001",
          "startTime": 0,
          "duration": 5,
          "trimStart": 0,
          "trimEnd": 5,
          "position": { "x": 0, "y": 0 },
          "scale": { "x": 1.0, "y": 1.0 },
          "rotation": 0,
          "opacity": 1.0,
          "effects": [
            {
              "id": "effect_001",
              "type": "brightness",
              "enabled": true,
              "params": { "value": 1.2 }
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
          "params": { "easing": "easeInOut" }
        }
      ]
    }
  ],
  "settings": {
    "autoSave": true,
    "autoSaveInterval": 300,
    "snapToGrid": true,
    "snapThreshold": 5,
    "showRuler": true,
    "showGuides": true,
    "defaultTransitionDuration": 0.5,
    "theme": "dark"
  },
  "history": {
    "undoStack": [],
    "redoStack": [],
    "maxHistorySize": 100
  }
}
```

## 📝 数据字段详解

### Media (媒体)

```json
{
  "id": "media_001",
  "name": "video.mp4",
  "type": "video",              // video | audio | image
  "path": "/path/to/file",
  "duration": 10.5,
  "width": 1920,                // 仅视频
  "height": 1080,               // 仅视频
  "fps": 30,                    // 仅视频
  "codec": "h264",
  "fileSize": 52428800,
  "createdAt": "2024-02-25T10:00:00Z"
}
```

### Clip (片段)

```json
{
  "id": "clip_001",
  "mediaId": "media_001",
  "trackId": "track_video_001",
  "startTime": 0,               // 时间线上的开始时间
  "duration": 5,                // 片段在时间线上的时长
  "trimStart": 0,               // 素材的入点
  "trimEnd": 5,                 // 素材的出点
  "position": { "x": 0, "y": 0 },
  "scale": { "x": 1.0, "y": 1.0 },
  "rotation": 0,                // 旋转角度
  "opacity": 1.0,               // 透明度 0-1
  "effects": [],
  "repeatCount": 1              // 重复次数（可选）
}
```

### Track (轨道)

```json
{
  "id": "track_video_001",
  "name": "Video 1",
  "type": "video",              // video | audio | text
  "order": 1,                   // 显示顺序
  "height": 100,                // 轨道高度
  "visible": true,
  "locked": false,
  "clips": [],
  "transitions": []
}
```

### Effect (特效)

```json
{
  "id": "effect_001",
  "type": "brightness",         // brightness | contrast | saturation | etc
  "enabled": true,
  "startTime": 0,               // 相对于片段的开始时间
  "duration": 5,
  "params": {
    "value": 1.2,
    "keyframes": [
      { "time": 0, "value": 1.0 },
      { "time": 2.5, "value": 1.5 },
      { "time": 5, "value": 1.0 }
    ]
  }
}
```

## 🔄 重复压缩机制

### 概念

当相邻的多个 Clips 具有相同属性时，可以合并为一个 Clip 并记录重复次数。

### 示例

**未压缩**:
```json
{
  "clips": [
    { "id": "clip_001", "mediaId": "media_001", "startTime": 0, "duration": 1 },
    { "id": "clip_002", "mediaId": "media_001", "startTime": 1, "duration": 1 },
    { "id": "clip_003", "mediaId": "media_001", "startTime": 2, "duration": 1 }
  ]
}
```

**压缩后**:
```json
{
  "clips": [
    {
      "id": "clip_001",
      "mediaId": "media_001",
      "startTime": 0,
      "duration": 1,
      "repeatCount": 3,
      "repeatMode": "sequential",
      "originalClipIds": ["clip_001", "clip_002", "clip_003"]
    }
  ]
}
```

### 压缩条件

Clips 可以被合并的条件（所有条件都必须满足）：

1. **相邻** - 前一个 Clip 的结束时间 = 后一个 Clip 的开始时间
2. **同一轨道** - 都在同一个 Track 中
3. **同一媒体** - mediaId 相同
4. **相同的编辑参数** - duration、trimStart、trimEnd、position、scale、rotation、opacity 都相同
5. **相同的特效** - effects 数组完全相同
6. **相同的关键帧** - keyframes 完全相同

### 优势

- **文件大小减少** - 重复内容可以减少 50-90%
- **加载速度快** - 需要解析的数据更少
- **易于编辑** - 修改一个重复的 Clip 会影响所有重复
- **撤销/重做** - 保留原始 ID 便于恢复

## 📐 数据验证规则

1. **时间值** - 必须为非负数，单位为秒
2. **ID 唯一性** - 所有 ID 在项目内必须唯一
3. **引用完整性** - 所有 mediaId、trackId、clipId 必须存在
4. **时间线顺序** - 片段应按 startTime 排序
5. **持续时间** - duration 必须大于 0
6. **范围值** - opacity、volume 等范围值必须在 0-1 之间
7. **文件路径** - 必须是有效的相对或绝对路径

## 📦 文件大小分析

| 场景 | 大小 | 说明 |
|------|------|------|
| 最小项目 | ~1 KB | 无媒体、无轨道 |
| 示例项目 | ~4.2 KB | 2 个媒体、2 个轨道 |
| 中等项目 | ~100 KB | 10 个媒体、5 个轨道 |
| 大型项目 | ~1 MB | 100 个媒体、20 个轨道 |

## 🔍 文件验证

### 验证步骤

1. **检查文件扩展名** - 必须是 `.hpve`
2. **验证 ZIP 格式** - 文件必须是有效的 ZIP 压缩包
3. **检查必要文件** - 必须包含 `project.json` 和 `metadata.json`
4. **验证加密** - 如果文件被加密，需要正确的密码
5. **验证 JSON 结构** - JSON 必须符合规范

### 验证代码

```typescript
async function validateProject(filePath: string, password?: string): Promise<boolean> {
  try {
    // 验证文件格式
    const isValid = await validateHpveFile(filePath);
    if (!isValid) return false;

    // 尝试加载项目
    const project = await loadProject(filePath, password);
    
    // 验证必要字段
    return (
      project.metadata &&
      project.timeline &&
      Array.isArray(project.tracks) &&
      Array.isArray(project.media)
    );
  } catch (error) {
    console.error('Validation failed:', error);
    return false;
  }
}
```

## 🔄 版本兼容性

### 版本信息

```json
{
  "metadata": {
    "version": "1.0.0",
    "minSupportedVersion": "1.0.0",
    "encryptionVersion": 1
  }
}
```

### 向后兼容性

- 新版本应该能够加载旧版本的项目
- 旧版本应该拒绝加载不支持的新版本项目
- 使用 `minSupportedVersion` 字段进行版本检查

## 📚 最佳实践

### 保存

1. **定期自动保存** - 每 5 分钟自动保存一次
2. **创建备份** - 保存前创建备份文件
3. **验证保存** - 保存后验证文件完整性
4. **使用密码** - 对敏感项目使用密码保护

### 加载

1. **验证文件** - 加载前验证文件格式
2. **处理错误** - 正确处理加密错误和损坏的文件
3. **显示进度** - 对大文件显示加载进度
4. **缓存管理** - 加载后清理过期的缓存文件

### 安全

1. **不要硬编码密码** - 从用户输入获取
2. **使用 HTTPS** - 传输文件时使用加密连接
3. **定期更新** - 使用最新的加密库
4. **备份密钥** - 提醒用户保存密码
5. **错误处理** - 不要泄露加密细节

## 🔗 相关资源

- [01-QUICK_START.md](./01-QUICK_START.md) - 快速开始指南
- [03-IMPLEMENTATION.md](./03-IMPLEMENTATION.md) - 实现指南
- [sample_project.hpve](./sample_project.hpve) - 示例项目文件

---

**最后更新**: 2024-02-25
**状态**: ✅ 完成
