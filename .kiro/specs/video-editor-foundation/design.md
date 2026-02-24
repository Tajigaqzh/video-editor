# 视频编辑器基础功能 - 设计文档

## 1. 架构设计

### 1.1 整体架构

```
┌─────────────────────────────────────────────────────────┐
│                    Tauri Application                     │
├─────────────────────────────────────────────────────────┤
│  Frontend (React)          │  Backend (Rust)            │
│  ├── UI Components         │  ├── FFmpeg Handler        │
│  ├── State Management      │  ├── File System           │
│  ├── Canvas Rendering      │  ├── Video Processing      │
│  └── Event Handling        │  └── IPC Commands          │
└─────────────────────────────────────────────────────────┘
```

### 1.2 技术选型理由

**前端框架**: React + TypeScript
- 组件化开发，易于维护
- TypeScript 提供类型安全
- 丰富的生态系统

**桌面框架**: Tauri
- 比 Electron 更轻量 (打包体积小)
- Rust 后端性能优秀
- 原生系统集成能力强

**视频处理**: FFmpeg CLI
- 工业级视频处理工具
- 功能完整，支持所有主流格式
- 性能优秀，支持硬件加速

**UI 框架**: Tailwind CSS
- 快速开发
- 一致的设计系统
- 易于定制

## 2. 组件设计

### 2.1 MediaLibrary 组件

**职责**: 管理用户的媒体素材

**状态管理**:
```typescript
const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
const [currentFolder, setCurrentFolder] = useState<string | null>(null);
const [folderPath, setFolderPath] = useState<string[]>([]);
const [activeTab, setActiveTab] = useState<string>("素材");
const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
const [renameDialog, setRenameDialog] = useState<RenameDialogState | null>(null);
```

**核心功能**:
1. 文件导入 (Tauri dialog API)
2. 树形文件夹管理
3. 右键菜单操作
4. 拖拽支持
5. 标签页切换

**数据流**:
```
用户操作 → 事件处理 → 状态更新 → UI 重渲染
```

### 2.2 ContextMenu 组件

**职责**: 显示右键菜单

**Props**:
```typescript
interface ContextMenuProps {
  x: number;
  y: number;
  itemId?: string;
  itemName?: string;
  onAction: (action: string) => void;
  onClose: () => void;
}
```

**菜单项**:
- 空白区域: 新建文件夹、添加素材
- 文件夹: 重命名、删除

### 2.3 RenameDialog 组件

**职责**: 重命名文件夹

**Props**:
```typescript
interface RenameDialogProps {
  oldName: string;
  onConfirm: (newName: string) => void;
  onCancel: () => void;
}
```

**交互**:
- 自动聚焦输入框
- Enter 确认
- Esc 取消
- 点击背景关闭

## 3. 布局设计

### 3.1 Split 面板布局

```
┌─────────────────────────────────────────────────────────┐
│                                                           │
│  ┌──────────┬────────────────────────┬──────────┐       │
│  │          │                        │          │       │
│  │  媒体库  │      视频预览区        │  属性面板│  70%  │
│  │  (20%)   │        (60%)           │  (20%)   │       │
│  │          │                        │          │       │
│  └──────────┴────────────────────────┴──────────┘       │
│  ─────────────────────────────────────────────────       │
│  ┌─────────────────────────────────────────────┐        │
│  │              时间轴区域                      │  30%  │
│  └─────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────┘
```

### 3.2 颜色规范

- 主背景: `#141414`
- 分割线: `#303030`
- 文件夹图标: `#DDB921`
- 悬停背景: `#gray-700/30`
- 选中状态: `#blue-600`
- 删除按钮: `#red-600`

### 3.3 尺寸规范

- 窗口最小尺寸: 1920x1080
- 左侧面板: 最小 300px, 最大 600px
- 中间面板: 最小 200px
- 右侧面板: 最小 300px, 最大 600px
- 素材项: 96x80px
- 标签按钮: 48x48px
- 分割线: 8px

## 4. 数据流设计

### 4.1 文件导入流程

```
用户点击导入
    ↓
Tauri dialog.open()
    ↓
选择文件
    ↓
获取文件路径
    ↓
convertFileSrc() 转换 URL
    ↓
创建 MediaFile 对象
    ↓
添加到 mediaItems 状态
    ↓
UI 更新显示
```

### 4.2 文件夹操作流程

**创建文件夹**:
```
右键菜单 → 新建文件夹 → 生成唯一 ID → 添加到当前目录 → 更新状态
```

**进入文件夹**:
```
双击文件夹 → 更新 currentFolder → 更新 folderPath → 显示子内容
```

**返回上级**:
```
点击返回 → 弹出 folderPath → 更新 currentFolder → 显示父内容
```

### 4.3 树形数据操作

**递归查找**:
```typescript
const findFolder = (items: MediaItem[], folderId: string): MediaFolder | null => {
  for (const item of items) {
    if (item.id === folderId && item.type === "folder") {
      return item as MediaFolder;
    }
    if (item.type === "folder") {
      const found = findFolder((item as MediaFolder).children, folderId);
      if (found) return found;
    }
  }
  return null;
};
```

**递归添加**:
```typescript
const addItemsToFolder = (
  items: MediaItem[], 
  folderId: string | null, 
  newItems: MediaItem[]
): MediaItem[] => {
  if (!folderId) return [...items, ...newItems];
  
  return items.map(item => {
    if (item.id === folderId && item.type === "folder") {
      return {
        ...item,
        children: [...(item as MediaFolder).children, ...newItems]
      } as MediaFolder;
    }
    if (item.type === "folder") {
      return {
        ...item,
        children: addItemsToFolder((item as MediaFolder).children, folderId, newItems)
      } as MediaFolder;
    }
    return item;
  });
};
```

## 5. FFmpeg 集成设计

### 5.1 架构

```
Frontend (TypeScript)
    ↓ invoke()
Tauri IPC
    ↓
Rust Commands
    ↓
FFmpeg CLI
    ↓
Video Processing
```

### 5.2 Rust 模块

**ffmpeg_path.rs**: 管理 FFmpeg 二进制路径
```rust
pub fn get_ffmpeg_path() -> Result<String, String>
pub fn get_ffprobe_path() -> Result<String, String>
```

**ffmpeg_handler.rs**: FFmpeg 操作封装
```rust
pub async fn get_video_info(path: String) -> Result<VideoInfo, String>
pub async fn extract_frame(video_path: String, time: f32, output: String) -> Result<String, String>
pub async fn trim_video(input: String, start: f32, end: f32, output: String) -> Result<String, String>
pub async fn merge_videos(videos: Vec<String>, output: String) -> Result<String, String>
```

**commands.rs**: Tauri 命令接口
```rust
#[tauri::command]
pub async fn init_ffmpeg() -> Result<String, String>

#[tauri::command]
pub async fn get_video_info(path: String) -> Result<VideoInfo, String>
```

### 5.3 打包策略

**开发环境**: 使用系统安装的 FFmpeg
**生产环境**: 打包 FFmpeg 到 resources/bin/

构建脚本:
```bash
#!/bin/bash
# bundle_ffmpeg.sh
mkdir -p src-tauri/resources/bin
cp /opt/homebrew/bin/ffmpeg src-tauri/resources/bin/
cp /opt/homebrew/bin/ffprobe src-tauri/resources/bin/
```

## 6. 性能优化

### 6.1 已实现的优化

1. **虚拟滚动**: 媒体库使用 flex-wrap，浏览器自动优化
2. **懒加载**: 视频缩略图按需加载
3. **事件防抖**: 右键菜单使用 setTimeout 延迟监听
4. **状态最小化**: 只存储必要的状态数据

### 6.2 待优化项

1. 大量素材时的渲染性能
2. 视频预览的内存占用
3. FFmpeg 操作的进度反馈
4. 文件系统监听

## 7. 错误处理

### 7.1 前端错误处理

```typescript
try {
  const selected = await open({ ... });
  // 处理文件
} catch (error) {
  console.error("Error selecting files:", error);
  // 可以添加用户提示
}
```

### 7.2 Rust 错误处理

```rust
pub async fn get_video_info(path: String) -> Result<VideoInfo, String> {
    let output = Command::new(get_ffprobe_path()?)
        .args(&[...])
        .output()
        .map_err(|e| format!("Failed to execute ffprobe: {}", e))?;
    
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }
    
    // 解析输出
}
```

## 8. 安全考虑

### 8.1 文件访问

- 使用 Tauri dialog API，用户主动选择文件
- convertFileSrc 安全转换文件路径
- assetProtocol 限制访问范围

### 8.2 命令注入防护

- FFmpeg 参数使用数组传递，避免 shell 注入
- 文件路径验证
- 输出路径限制

## 9. 测试策略

### 9.1 单元测试

- 工具函数测试 (getFileType, getFileName)
- 数据操作函数测试 (addItemsToFolder, removeItemFromFolder)

### 9.2 集成测试

- FFmpeg 命令测试
- 文件导入流程测试
- 文件夹操作测试

### 9.3 E2E 测试

- 完整的用户操作流程
- 跨平台兼容性测试

## 10. 部署策略

### 10.1 构建流程

```bash
# 前端构建
pnpm build

# FFmpeg 打包
bash src-tauri/build_scripts/bundle_ffmpeg.sh

# Tauri 构建
pnpm tauri build
```

### 10.2 平台支持

- macOS (已测试)
- Windows (待测试)
- Linux (待测试)

### 10.3 打包优化

- FFmpeg 二进制压缩
- 资源文件优化
- 代码分割和懒加载
