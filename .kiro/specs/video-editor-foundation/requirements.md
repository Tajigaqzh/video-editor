# 视频编辑器基础功能 - 需求文档

## 1. 项目概述

构建一个基于 Tauri + React 的桌面视频编辑器应用，支持视频导入、编辑、预览和导出功能。

## 2. 已完成功能

### 2.1 项目基础设置

**用户故事**: 作为开发者，我需要配置好项目的基础环境和依赖

**验收标准**:
- [x] 安装并配置 Tailwind CSS v4 with Vite plugin
- [x] 安装核心依赖: axios, zustand, react-router-dom, ahooks, react-split
- [x] 配置路径别名 `@` 指向 `src` 目录
- [x] 创建文件夹结构: utils, store, constants, hooks, components, pages
- [x] 移除默认样式

**技术实现**:
- Vite 配置路径别名
- Tailwind CSS v4 配置
- TypeScript 配置

### 2.2 视频编辑器布局

**用户故事**: 作为用户，我需要一个专业的视频编辑器界面布局

**验收标准**:
- [x] 使用 react-split 实现可调整大小的面板
- [x] 垂直分割: 上部 70% (编辑区) | 下部 30% (时间轴)
- [x] 上部水平分割: 左 20% (媒体库) | 中 60% (预览) | 右 20% (属性)
- [x] 所有面板使用 `#141414` 背景色
- [x] 分割线使用 `#303030` 颜色，宽度 8px
- [x] 最小尺寸: 左 300px, 中 200px, 右 300px
- [x] 最大尺寸: 左 600px, 右 600px
- [x] 窗口最小尺寸: 1920x1080

**技术实现**:
- react-split 组件
- 自定义 split.css 样式
- Tauri 窗口配置

### 2.3 FFmpeg 集成 (Rust 后端)

**用户故事**: 作为开发者，我需要集成 FFmpeg 来处理视频操作

**验收标准**:
- [x] 使用纯 CLI 方式调用 FFmpeg (不使用 ffmpeg-next)
- [x] 创建 Rust 模块: ffmpeg_handler.rs, ffmpeg_path.rs, commands.rs
- [x] 实现函数: init_ffmpeg, get_video_info, extract_frame, trim_video, merge_videos
- [x] FFmpeg 打包: 构建时自动复制到 resources/bin/
- [x] 只在生产构建中包含 FFmpeg 二进制文件
- [x] 成功测试打包 (FFmpeg 430KB, FFprobe 231KB)

**技术实现**:
- Rust Command API
- 构建脚本: bundle_ffmpeg.sh
- Tauri 资源配置
- TypeScript FFmpeg 工具函数

### 2.4 媒体库组件

**用户故事**: 作为用户，我需要管理我的视频、音频和图片素材

**验收标准**:
- [x] 支持导入视频、音频、图片文件
- [x] 文件类型检测和显示 (video, audio, image)
- [x] 树形文件夹结构支持
- [x] 创建新文件夹功能
- [x] 双击文件夹进入子目录
- [x] 面包屑导航显示当前路径
- [x] 右键菜单: 新建文件夹、添加素材、重命名、删除
- [x] 重命名弹框支持修改文件夹名称
- [x] 空状态显示导入提示区域
- [x] 文件夹图标使用金黄色 (#DDB921)
- [x] 素材项固定尺寸: 96x80px
- [x] 标签页切换: 素材、音频、文本、转场
- [x] 拖拽素材支持 (预留)

**技术实现**:
- Tauri dialog API
- convertFileSrc 转换文件路径
- 树形数据结构 (MediaFile, MediaFolder)
- ContextMenu 组件
- RenameDialog 组件
- 递归文件夹操作函数

### 2.5 Tauri 配置

**用户故事**: 作为开发者，我需要正确配置 Tauri 应用

**验收标准**:
- [x] 窗口尺寸: 1920x1080 (最小值)
- [x] 背景色: #141414
- [x] assetProtocol 启用，支持本地文件访问
- [x] 权限配置: core, dialog, path, image, opener

**技术实现**:
- tauri.conf.json 配置
- capabilities/default.json 权限配置

## 3. 技术栈

### 前端
- React 18
- TypeScript
- Tailwind CSS v4
- Vite
- React Router
- Zustand (状态管理)
- Ahooks (React Hooks)
- React Split (面板分割)

### 后端
- Tauri 2.0
- Rust
- FFmpeg (CLI)

### 开发工具
- pnpm
- ESLint
- TypeScript

## 4. 文件结构

```
video-editor/
├── src/
│   ├── assets/
│   │   └── css/
│   │       ├── App.css
│   │       └── split.css
│   ├── components/
│   │   ├── MediaLibrary.tsx
│   │   ├── ContextMenu.tsx
│   │   └── RenameDialog.tsx
│   ├── constants/
│   │   └── media.ts
│   ├── hooks/
│   │   └── useMediaFile.ts
│   ├── pages/
│   │   └── Home.tsx
│   ├── router/
│   │   └── index.tsx
│   ├── store/
│   │   └── useStore.ts
│   ├── utils/
│   │   ├── axios.ts
│   │   └── ffmpeg.ts
│   ├── App.tsx
│   └── main.tsx
├── src-tauri/
│   ├── src/
│   │   ├── commands.rs
│   │   ├── ffmpeg_handler.rs
│   │   ├── ffmpeg_path.rs
│   │   ├── lib.rs
│   │   └── main.rs
│   ├── build_scripts/
│   │   └── bundle_ffmpeg.sh
│   ├── capabilities/
│   │   └── default.json
│   ├── resources/
│   │   └── bin/
│   ├── Cargo.toml
│   └── tauri.conf.json
└── package.json
```

## 5. 数据结构

### MediaFile
```typescript
interface MediaFile {
  id: string;        // UUID
  name: string;      // 文件名
  path: string;      // 完整路径
  url: string;       // convertFileSrc 转换后的 URL
  type: string;      // "video" | "audio" | "image"
}
```

### MediaFolder
```typescript
interface MediaFolder {
  id: string;
  name: string;
  type: "folder";
  children: (MediaFile | MediaFolder)[];  // 支持嵌套
}
```

## 6. 待开发功能

以下功能尚未实现，需要在后续 spec 中规划：

1. 视频预览区域 (Canvas 渲染)
2. 时间轴组件
3. 视频导出功能
4. 属性面板
5. 字幕编辑
6. 视频特效和滤镜
7. 音频处理
8. 转场效果
9. 项目保存和加载
10. 撤销/重做功能
