# Vitest 集成 - 设计文档

## 1. 测试架构

### 1.1 整体架构

```
video-editor/
├── src/
│   ├── components/
│   │   ├── MediaLibrary.tsx
│   │   ├── MediaLibrary.test.tsx      ← 组件测试
│   │   ├── ContextMenu.tsx
│   │   ├── ContextMenu.test.tsx       ← 组件测试
│   │   ├── RenameDialog.tsx
│   │   └── RenameDialog.test.tsx      ← 组件测试
│   ├── hooks/
│   │   ├── useMediaFile.ts
│   │   └── useMediaFile.test.ts       ← 工具函数测试
│   └── utils/
│       ├── ffmpeg.ts
│       └── ffmpeg.test.ts             ← 工具函数测试
├── vitest.config.ts                    ← Vitest 配置
├── vitest.setup.ts                     ← 测试环境设置
└── coverage/                           ← 覆盖率报告
```

### 1.2 测试分层

```
┌─────────────────────────────────────┐
│         E2E Tests (未来)             │
├─────────────────────────────────────┤
│      Integration Tests (未来)        │
├─────────────────────────────────────┤
│        Component Tests               │
│  (React Testing Library)             │
├─────────────────────────────────────┤
│         Unit Tests                   │
│  (Pure Functions)                    │
└─────────────────────────────────────┘
```

## 2. Vitest 配置

### 2.1 vitest.config.ts

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    // 测试环境
    environment: 'jsdom',
    
    // 全局设置文件
    setupFiles: ['./vitest.setup.ts'],
    
    // 覆盖率配置
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src-tauri/',
        'dist/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
        'src/main.tsx',
        'src/vite-env.d.ts',
      ],
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
      },
    },
    
    // 全局 API
    globals: true,
    
    // 包含的测试文件
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    
    // 排除的文件
    exclude: ['node_modules', 'dist', 'src-tauri'],
  },
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

### 2.2 vitest.setup.ts

```typescript
import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// 扩展 expect 断言
expect.extend(matchers);

// 每个测试后清理
afterEach(() => {
  cleanup();
});

// Mock Tauri API
global.window = Object.create(window);
Object.defineProperty(window, '__TAURI__', {
  value: {
    invoke: vi.fn(),
    convertFileSrc: vi.fn((path: string) => `asset://localhost/${path}`),
  },
  writable: true,
});
```

## 3. 测试用例设计

### 3.1 工具函数测试

#### useMediaFile.test.ts

```typescript
import { describe, it, expect } from 'vitest';
import { getFileType, getFileName } from './useMediaFile';

describe('getFileType', () => {
  it('should return "video" for video files', () => {
    expect(getFileType('test.mp4')).toBe('video');
    expect(getFileType('test.mov')).toBe('video');
    expect(getFileType('test.avi')).toBe('video');
    expect(getFileType('test.mkv')).toBe('video');
    expect(getFileType('test.webm')).toBe('video');
  });

  it('should return "audio" for audio files', () => {
    expect(getFileType('test.mp3')).toBe('audio');
    expect(getFileType('test.wav')).toBe('audio');
    expect(getFileType('test.aac')).toBe('audio');
    expect(getFileType('test.flac')).toBe('audio');
  });

  it('should return "image" for image files', () => {
    expect(getFileType('test.jpg')).toBe('image');
    expect(getFileType('test.jpeg')).toBe('image');
    expect(getFileType('test.png')).toBe('image');
    expect(getFileType('test.gif')).toBe('image');
  });

  it('should return "unknown" for unknown files', () => {
    expect(getFileType('test.txt')).toBe('unknown');
    expect(getFileType('test.pdf')).toBe('unknown');
  });

  it('should handle uppercase extensions', () => {
    expect(getFileType('test.MP4')).toBe('video');
    expect(getFileType('test.JPG')).toBe('image');
  });

  it('should handle files without extension', () => {
    expect(getFileType('test')).toBe('unknown');
  });
});

describe('getFileName', () => {
  it('should extract filename from path', () => {
    expect(getFileName('/path/to/file.mp4')).toBe('file.mp4');
    expect(getFileName('C:\\Users\\test\\video.mov')).toBe('video.mov');
  });

  it('should handle filename without path', () => {
    expect(getFileName('file.mp4')).toBe('file.mp4');
  });

  it('should handle empty string', () => {
    expect(getFileName('')).toBe('');
  });
});
```

### 3.2 组件测试

#### ContextMenu.test.tsx

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ContextMenu from './ContextMenu';

describe('ContextMenu', () => {
  const mockOnAction = vi.fn();
  const mockOnClose = vi.fn();

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should render blank area menu', () => {
    render(
      <ContextMenu
        x={100}
        y={100}
        onAction={mockOnAction}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('新建文件夹')).toBeInTheDocument();
    expect(screen.getByText('添加素材')).toBeInTheDocument();
  });

  it('should render folder menu', () => {
    render(
      <ContextMenu
        x={100}
        y={100}
        itemId="folder-1"
        itemName="Test Folder"
        onAction={mockOnAction}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('重命名')).toBeInTheDocument();
    expect(screen.getByText('删除')).toBeInTheDocument();
  });

  it('should call onAction when menu item clicked', () => {
    render(
      <ContextMenu
        x={100}
        y={100}
        onAction={mockOnAction}
        onClose={mockOnClose}
      />
    );

    fireEvent.click(screen.getByText('新建文件夹'));
    expect(mockOnAction).toHaveBeenCalledWith('newFolder');
  });

  it('should position menu at correct coordinates', () => {
    const { container } = render(
      <ContextMenu
        x={150}
        y={200}
        onAction={mockOnAction}
        onClose={mockOnClose}
      />
    );

    const menu = container.firstChild as HTMLElement;
    expect(menu.style.left).toBe('150px');
    expect(menu.style.top).toBe('200px');
  });
});
```

#### RenameDialog.test.tsx

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RenameDialog from './RenameDialog';

describe('RenameDialog', () => {
  const mockOnConfirm = vi.fn();
  const mockOnCancel = vi.fn();

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should render with old name', () => {
    render(
      <RenameDialog
        oldName="Old Name"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    const input = screen.getByDisplayValue('Old Name');
    expect(input).toBeInTheDocument();
  });

  it('should auto-focus input', () => {
    render(
      <RenameDialog
        oldName="Old Name"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    const input = screen.getByDisplayValue('Old Name');
    expect(input).toHaveFocus();
  });

  it('should call onConfirm with new name', async () => {
    const user = userEvent.setup();
    
    render(
      <RenameDialog
        oldName="Old Name"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    const input = screen.getByDisplayValue('Old Name');
    await user.clear(input);
    await user.type(input, 'New Name');
    
    fireEvent.click(screen.getByText('确定'));
    expect(mockOnConfirm).toHaveBeenCalledWith('New Name');
  });

  it('should call onCancel when cancel button clicked', () => {
    render(
      <RenameDialog
        oldName="Old Name"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByText('取消'));
    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('should call onConfirm when Enter pressed', async () => {
    const user = userEvent.setup();
    
    render(
      <RenameDialog
        oldName="Old Name"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    const input = screen.getByDisplayValue('Old Name');
    await user.type(input, '{Enter}');
    
    expect(mockOnConfirm).toHaveBeenCalled();
  });

  it('should call onCancel when Escape pressed', async () => {
    const user = userEvent.setup();
    
    render(
      <RenameDialog
        oldName="Old Name"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    const input = screen.getByDisplayValue('Old Name');
    await user.type(input, '{Escape}');
    
    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('should not submit empty name', () => {
    render(
      <RenameDialog
        oldName="Old Name"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    const input = screen.getByDisplayValue('Old Name');
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.click(screen.getByText('确定'));
    
    expect(mockOnConfirm).not.toHaveBeenCalled();
  });
});
```

### 3.3 数据操作测试

```typescript
// MediaLibrary.test.tsx (部分)
describe('Data Operations', () => {
  describe('addItemsToFolder', () => {
    it('should add items to root', () => {
      const items: MediaItem[] = [];
      const newItem: MediaFile = {
        id: '1',
        name: 'test.mp4',
        path: '/test.mp4',
        url: 'asset://test.mp4',
        type: 'video',
      };

      const result = addItemsToFolder(items, null, [newItem]);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(newItem);
    });

    it('should add items to subfolder', () => {
      const folder: MediaFolder = {
        id: 'folder-1',
        name: 'Folder',
        type: 'folder',
        children: [],
      };
      const items: MediaItem[] = [folder];
      const newItem: MediaFile = {
        id: '1',
        name: 'test.mp4',
        path: '/test.mp4',
        url: 'asset://test.mp4',
        type: 'video',
      };

      const result = addItemsToFolder(items, 'folder-1', [newItem]);
      const updatedFolder = result[0] as MediaFolder;
      
      expect(updatedFolder.children).toHaveLength(1);
      expect(updatedFolder.children[0]).toEqual(newItem);
    });
  });

  describe('removeItemFromFolder', () => {
    it('should remove item from root', () => {
      const item: MediaFile = {
        id: '1',
        name: 'test.mp4',
        path: '/test.mp4',
        url: 'asset://test.mp4',
        type: 'video',
      };
      const items: MediaItem[] = [item];

      const result = removeItemFromFolder(items, '1');
      expect(result).toHaveLength(0);
    });

    it('should remove item from subfolder', () => {
      const childItem: MediaFile = {
        id: 'child-1',
        name: 'test.mp4',
        path: '/test.mp4',
        url: 'asset://test.mp4',
        type: 'video',
      };
      const folder: MediaFolder = {
        id: 'folder-1',
        name: 'Folder',
        type: 'folder',
        children: [childItem],
      };
      const items: MediaItem[] = [folder];

      const result = removeItemFromFolder(items, 'child-1');
      const updatedFolder = result[0] as MediaFolder;
      
      expect(updatedFolder.children).toHaveLength(0);
    });
  });
});
```

## 4. Mock 策略

### 4.1 Tauri API Mock

```typescript
// vitest.setup.ts
vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: vi.fn(),
}));

vi.mock('@tauri-apps/api/core', () => ({
  convertFileSrc: vi.fn((path: string) => `asset://localhost/${path}`),
  invoke: vi.fn(),
}));
```

### 4.2 文件系统 Mock

```typescript
// 在测试中
import { open } from '@tauri-apps/plugin-dialog';

it('should import files', async () => {
  vi.mocked(open).mockResolvedValue(['/path/to/file.mp4']);
  
  // 测试代码...
});
```

## 5. 测试命令

### 5.1 package.json 脚本

```json
{
  "scripts": {
    "test": "vitest run",
    "test:ui": "vitest --ui",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

### 5.2 使用方式

```bash
# 运行所有测试
pnpm test

# 打开测试 UI
pnpm test:ui

# 监听模式
pnpm test:watch

# 生成覆盖率报告
pnpm test:coverage
```

## 6. 最佳实践

### 6.1 测试命名

```typescript
// ✅ 好的命名
describe('getFileType', () => {
  it('should return "video" for video files', () => {});
  it('should handle uppercase extensions', () => {});
});

// ❌ 不好的命名
describe('test', () => {
  it('test1', () => {});
});
```

### 6.2 AAA 模式

```typescript
it('should add items to folder', () => {
  // Arrange - 准备测试数据
  const items = [];
  const newItem = { id: '1', name: 'test' };
  
  // Act - 执行操作
  const result = addItemsToFolder(items, null, [newItem]);
  
  // Assert - 验证结果
  expect(result).toHaveLength(1);
});
```

### 6.3 避免测试实现细节

```typescript
// ✅ 测试行为
it('should display error message when input is empty', () => {
  // 测试用户看到的结果
});

// ❌ 测试实现
it('should set error state to true', () => {
  // 测试内部状态
});
```

## 7. 持续集成

### 7.1 GitHub Actions 示例

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'pnpm'
      
      - run: pnpm install
      - run: pnpm test
      - run: pnpm test:coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

## 8. 故障排查

### 8.1 常见问题

**问题**: 测试找不到模块
```typescript
// 解决: 检查 vitest.config.ts 中的 alias 配置
resolve: {
  alias: {
    '@': path.resolve(__dirname, './src'),
  },
}
```

**问题**: jsdom 环境错误
```typescript
// 解决: 确保安装了 jsdom
pnpm add -D jsdom
```

**问题**: React Testing Library 断言失败
```typescript
// 解决: 确保导入了 jest-dom matchers
import * as matchers from '@testing-library/jest-dom/matchers';
expect.extend(matchers);
```
