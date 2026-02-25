# 🎬 Video Editor - 视频编辑器

一个基于 Tauri + React + Rust 的专业视频编辑应用。

## 📚 文档

### HPVE 项目文件格式

所有 HPVE 项目文件格式的文档已整理到 `docs/hpve-format/` 文件夹。

👉 **[docs/hpve-format/README.md](./docs/hpve-format/README.md)** - 文档导航中心

**三个核心文档**:
- [01-QUICK_START.md](./docs/hpve-format/01-QUICK_START.md) - 快速开始 (5 分钟)
- [02-FILE_FORMAT.md](./docs/hpve-format/02-FILE_FORMAT.md) - 文件格式规范
- [03-IMPLEMENTATION.md](./docs/hpve-format/03-IMPLEMENTATION.md) - 实现指南

### 其他文档

- [TRACK.md](./TRACK.md) - 项目规范和数据结构
- [VIDEO_STREAMING_IMPLEMENTATION.md](./VIDEO_STREAMING_IMPLEMENTATION.md) - 视频流实现
- [PIXI_INTEGRATION.md](./PIXI_INTEGRATION.md) - PixiJS 集成

## 🚀 快速开始

### 安装依赖

```bash
pnpm install
```

### 开发模式

```bash
pnpm start
```

### 构建

```bash
pnpm build
```

## 📦 项目结构

```
video-editor/
├── src/                          # 前端代码 (React/TypeScript)
│   ├── components/               # React 组件
│   ├── utils/                    # 工具函数
│   ├── store/                    # 状态管理
│   └── pages/                    # 页面
├── src-tauri/                    # 后端代码 (Rust)
│   ├── src/
│   │   ├── commands/             # Tauri 命令
│   │   ├── ffmpeg/               # FFmpeg 处理
│   │   ├── project/              # 项目文件处理
│   │   └── server/               # WebSocket 服务器
│   └── Cargo.toml
├── docs/
│   └── hpve-format/              # HPVE 文档
│       ├── README.md
│       ├── 01-QUICK_START.md
│       ├── 02-FILE_FORMAT.md
│       ├── 03-IMPLEMENTATION.md
│       ├── sample_project.hpve
│       └── create_sample_hpve.py
└── package.json
```

## 🔐 HPVE 项目文件格式

### 特性

- ✅ AES-256-GCM 加密
- ✅ PBKDF2 密钥派生 (100,000 次迭代)
- ✅ ZIP 压缩 (减少 85% 文件大小)
- ✅ 完整的项目数据 (媒体、轨道、片段、特效)
- ✅ 重复压缩机制

### 快速使用

```typescript
import { loadProject, saveProject } from '@/utils/projectManager';

// 加载项目
const project = await loadProject('project.hpve', 'password');

// 保存项目
await saveProject(project, 'project.hpve', {
  password: 'password',
  compress: true,
});
```

## 🎯 核心功能

- 📹 视频导入和预览
- ✂️ 视频剪辑和编辑
- 🎬 时间线编辑
- 🎨 特效和转场
- 💾 项目保存和加载
- 🔐 加密项目文件

## 🛠️ 技术栈

### 前端

- React 18
- TypeScript
- Tauri
- PixiJS (视频渲染)

### 后端

- Rust
- FFmpeg (视频处理)
- AES-256-GCM (加密)
- ZIP (压缩)

## 📝 示例项目

示例项目文件位于 `docs/hpve-format/sample_project.hpve`

- 密码: `demo123`
- 大小: 4.2 KB
- 包含: 2 个媒体、2 个轨道、3 个片段

## 🔗 相关资源

- [Tauri 文档](https://tauri.app/)
- [React 文档](https://react.dev/)
- [Rust 文档](https://doc.rust-lang.org/)
- [FFmpeg 文档](https://ffmpeg.org/)

## 📄 许可证

MIT

---

**最后更新**: 2024-02-25
