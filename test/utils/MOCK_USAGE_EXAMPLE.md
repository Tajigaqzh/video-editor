# Mock 使用示例 (Mock Usage Examples)

本文档提供了在 Vitest 中使用 Mock 的实际示例，包括函数 Mock、模块 Mock、Tauri API Mock 等。

## 目录
- [基础 Mock](#基础-mock)
- [Mock 函数](#mock-函数)
- [Mock 模块](#mock-模块)
- [Mock Tauri API](#mock-tauri-api)
- [Mock 时间和定时器](#mock-时间和定时器)
- [Spy 和部分 Mock](#spy-和部分-mock)

---

## 基础 Mock

Mock 用于替换真实的依赖，使测试更快、更可控。

### 示例 1: 创建 Mock 函数

```typescript
import { describe, it, expect, vi } from 'vitest';

describe('Mock 函数基础', () => {
  it('should create a mock function', () => {
    // 创建 Mock 函数
    const mockFn = vi.fn();

    // 调用 Mock 函数
    mockFn('hello');
    mockFn('world');

    // 验证调用
    expect(mockFn).toHaveBeenCalled();
    expect(mockFn).toHaveBeenCalledTimes(2);
    expect(mockFn).toHaveBeenCalledWith('hello');
    expect(mockFn).toHaveBeenLastCalledWith('world');
  });

  it('should mock function with return value', () => {
    // 创建带返回值的 Mock
    const mockFn = vi.fn().mockReturnValue('mocked value');

    // 调用并验证返回值
    const result = mockFn();
    expect(result).toBe('mocked value');
  });

  it('should mock function with different return values', () => {
    // 创建多次返回不同值的 Mock
    const mockFn = vi.fn()
      .mockReturnValueOnce('first')
      .mockReturnValueOnce('second')
      .mockReturnValue('default');

    expect(mockFn()).toBe('first');
    expect(mockFn()).toBe('second');
    expect(mockFn()).toBe('default');
    expect(mockFn()).toBe('default');
  });

  it('should mock function with implementation', () => {
    // 创建带实现的 Mock
    const mockFn = vi.fn((x: number, y: number) => x + y);

    const result = mockFn(2, 3);
    expect(result).toBe(5);
    expect(mockFn).toHaveBeenCalledWith(2, 3);
  });
});
```

**关键点**:
- 使用 `vi.fn()` 创建 Mock 函数
- 使用 `mockReturnValue` 设置返回值
- 使用 `mockReturnValueOnce` 设置单次返回值
- 使用 `mockImplementation` 自定义实现

---

## Mock 函数

在组件测试中 Mock 回调函数。

### 示例 2: Mock 组件回调

```typescript
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ContextMenu from '@/components/ContextMenu';

describe('ContextMenu - Mock 回调', () => {
  // 创建 Mock 函数
  const mockOnAction = vi.fn();
  const mockOnClose = vi.fn();

  // 每个测试后清理
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should call onAction with correct parameter', () => {
    // Arrange
    render(
      <ContextMenu
        x={100}
        y={100}
        onAction={mockOnAction}
        onClose={mockOnClose}
      />
    );

    // Act
    fireEvent.click(screen.getByText('新建文件夹'));

    // Assert
    expect(mockOnAction).toHaveBeenCalledWith('newFolder');
    expect(mockOnAction).toHaveBeenCalledTimes(1);
  });

  it('should not call onClose when menu item clicked', () => {
    // Arrange
    render(
      <ContextMenu
        x={100}
        y={100}
        onAction={mockOnAction}
        onClose={mockOnClose}
      />
    );

    // Act
    fireEvent.click(screen.getByText('新建文件夹'));

    // Assert
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('should track multiple calls', () => {
    // Arrange
    render(
      <ContextMenu
        x={100}
        y={100}
        onAction={mockOnAction}
        onClose={mockOnClose}
      />
    );

    // Act: 多次点击
    fireEvent.click(screen.getByText('新建文件夹'));
    fireEvent.click(screen.getByText('添加素材'));

    // Assert: 验证所有调用
    expect(mockOnAction).toHaveBeenCalledTimes(2);
    expect(mockOnAction).toHaveBeenNthCalledWith(1, 'newFolder');
    expect(mockOnAction).toHaveBeenNthCalledWith(2, 'addFiles');
  });
});
```

**关键点**:
- 在 `afterEach` 中清理 Mock
- 使用 `toHaveBeenCalledWith` 验证参数
- 使用 `toHaveBeenCalledTimes` 验证调用次数
- 使用 `not.toHaveBeenCalled` 验证未调用
- 使用 `toHaveBeenNthCalledWith` 验证特定调用

---

## Mock 模块

Mock 整个模块或模块的部分导出。

### 示例 3: Mock Tauri Dialog

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { open } from '@tauri-apps/plugin-dialog';
import MediaLibrary from '@/components/MediaLibrary';

// Mock 整个模块
vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: vi.fn(),
}));

describe('MediaLibrary - Mock Dialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should import files when dialog returns files', async () => {
    // Arrange: Mock 返回文件列表
    vi.mocked(open).mockResolvedValue([
      '/path/to/video.mp4',
      '/path/to/audio.mp3',
    ]);

    render(<MediaLibrary />);

    // Act: 点击导入按钮
    const importButton = screen.getByText('添加素材');
    await userEvent.click(importButton);

    // Assert: 验证文件被导入
    await waitFor(() => {
      expect(screen.getByText('video.mp4')).toBeInTheDocument();
      expect(screen.getByText('audio.mp3')).toBeInTheDocument();
    });

    // 验证 Mock 被调用
    expect(open).toHaveBeenCalledTimes(1);
  });

  it('should handle cancelled dialog', async () => {
    // Arrange: Mock 返回 null (用户取消)
    vi.mocked(open).mockResolvedValue(null);

    render(<MediaLibrary />);

    // Act
    const importButton = screen.getByText('添加素材');
    await userEvent.click(importButton);

    // Assert: 验证没有文件被添加
    await waitFor(() => {
      expect(screen.queryByText('video.mp4')).not.toBeInTheDocument();
    });
  });

  it('should handle dialog error', async () => {
    // Arrange: Mock 抛出错误
    vi.mocked(open).mockRejectedValue(new Error('Dialog failed'));

    render(<MediaLibrary />);

    // Act
    const importButton = screen.getByText('添加素材');
    await userEvent.click(importButton);

    // Assert: 验证错误处理
    await waitFor(() => {
      expect(screen.getByText('导入失败')).toBeInTheDocument();
    });
  });
});
```

**关键点**:
- 使用 `vi.mock()` Mock 整个模块
- 使用 `vi.mocked()` 获取类型安全的 Mock
- 使用 `mockResolvedValue` Mock Promise 成功
- 使用 `mockRejectedValue` Mock Promise 失败
- 在 `beforeEach` 中清理 Mock

---

## Mock Tauri API

Mock Tauri 特定的 API。

### 示例 4: Mock convertFileSrc

```typescript
import { describe, it, expect, vi } from 'vitest';
import { convertFileSrc } from '@tauri-apps/api/core';

// Mock Tauri Core API
vi.mock('@tauri-apps/api/core', () => ({
  convertFileSrc: vi.fn((path: string) => `asset://localhost/${path}`),
  invoke: vi.fn(),
}));

describe('Media File - Mock Tauri', () => {
  it('should convert file path to asset URL', () => {
    // Arrange
    const filePath = '/path/to/video.mp4';

    // Act
    const url = convertFileSrc(filePath);

    // Assert
    expect(url).toBe('asset://localhost//path/to/video.mp4');
    expect(convertFileSrc).toHaveBeenCalledWith(filePath);
  });

  it('should handle multiple file conversions', () => {
    // Arrange
    const files = [
      '/path/to/video1.mp4',
      '/path/to/video2.mp4',
    ];

    // Act
    const urls = files.map(convertFileSrc);

    // Assert
    expect(urls).toEqual([
      'asset://localhost//path/to/video1.mp4',
      'asset://localhost//path/to/video2.mp4',
    ]);
    expect(convertFileSrc).toHaveBeenCalledTimes(2);
  });
});
```

### 示例 5: Mock invoke 命令

```typescript
import { describe, it, expect, vi } from 'vitest';
import { invoke } from '@tauri-apps/api/core';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
  convertFileSrc: vi.fn(),
}));

describe('FFmpeg Operations - Mock invoke', () => {
  it('should call ffmpeg command', async () => {
    // Arrange: Mock invoke 返回成功
    vi.mocked(invoke).mockResolvedValue({ success: true });

    // Act
    const result = await invoke('run_ffmpeg', {
      input: '/path/to/input.mp4',
      output: '/path/to/output.mp4',
    });

    // Assert
    expect(result).toEqual({ success: true });
    expect(invoke).toHaveBeenCalledWith('run_ffmpeg', {
      input: '/path/to/input.mp4',
      output: '/path/to/output.mp4',
    });
  });

  it('should handle ffmpeg error', async () => {
    // Arrange: Mock invoke 抛出错误
    vi.mocked(invoke).mockRejectedValue(new Error('FFmpeg failed'));

    // Act & Assert
    await expect(
      invoke('run_ffmpeg', { input: 'test.mp4' })
    ).rejects.toThrow('FFmpeg failed');
  });

  it('should mock different commands', async () => {
    // Arrange: 根据命令返回不同结果
    vi.mocked(invoke).mockImplementation((cmd: string) => {
      if (cmd === 'get_duration') {
        return Promise.resolve(120.5);
      }
      if (cmd === 'get_metadata') {
        return Promise.resolve({ width: 1920, height: 1080 });
      }
      return Promise.resolve(null);
    });

    // Act & Assert
    expect(await invoke('get_duration')).toBe(120.5);
    expect(await invoke('get_metadata')).toEqual({ width: 1920, height: 1080 });
    expect(await invoke('unknown')).toBeNull();
  });
});
```

**关键点**:
- Mock `convertFileSrc` 转换文件路径
- Mock `invoke` 模拟 Tauri 命令
- 使用 `mockImplementation` 根据参数返回不同结果
- 测试成功和失败场景

---

## Mock 时间和定时器

Mock setTimeout、setInterval 等定时器。

### 示例 6: Mock 定时器

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Timer Mock', () => {
  beforeEach(() => {
    // 启用假定时器
    vi.useFakeTimers();
  });

  afterEach(() => {
    // 恢复真实定时器
    vi.useRealTimers();
  });

  it('should execute setTimeout callback', () => {
    // Arrange
    const callback = vi.fn();

    // Act
    setTimeout(callback, 1000);
    
    // 快进时间
    vi.advanceTimersByTime(1000);

    // Assert
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should execute setInterval callback multiple times', () => {
    // Arrange
    const callback = vi.fn();

    // Act
    setInterval(callback, 100);
    
    // 快进 350ms
    vi.advanceTimersByTime(350);

    // Assert: 应该被调用 3 次
    expect(callback).toHaveBeenCalledTimes(3);
  });

  it('should run all timers', () => {
    // Arrange
    const callback1 = vi.fn();
    const callback2 = vi.fn();

    // Act
    setTimeout(callback1, 100);
    setTimeout(callback2, 200);
    
    // 运行所有定时器
    vi.runAllTimers();

    // Assert
    expect(callback1).toHaveBeenCalled();
    expect(callback2).toHaveBeenCalled();
  });

  it('should clear timeout', () => {
    // Arrange
    const callback = vi.fn();

    // Act
    const timerId = setTimeout(callback, 1000);
    clearTimeout(timerId);
    
    vi.advanceTimersByTime(1000);

    // Assert: 不应该被调用
    expect(callback).not.toHaveBeenCalled();
  });
});
```

### 示例 7: Mock Date

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Date Mock', () => {
  beforeEach(() => {
    // 设置固定时间
    vi.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
  });

  afterEach(() => {
    // 恢复真实时间
    vi.useRealTimers();
  });

  it('should use mocked date', () => {
    // Act
    const now = new Date();

    // Assert
    expect(now.toISOString()).toBe('2024-01-01T00:00:00.000Z');
  });

  it('should advance time', () => {
    // Arrange
    const start = Date.now();

    // Act: 快进 1 小时
    vi.advanceTimersByTime(60 * 60 * 1000);
    const end = Date.now();

    // Assert
    expect(end - start).toBe(60 * 60 * 1000);
  });
});
```

**关键点**:
- 使用 `vi.useFakeTimers()` 启用假定时器
- 使用 `vi.advanceTimersByTime()` 快进时间
- 使用 `vi.runAllTimers()` 运行所有定时器
- 使用 `vi.setSystemTime()` 设置固定时间
- 使用 `vi.useRealTimers()` 恢复真实定时器

---

## Spy 和部分 Mock

监视函数调用而不完全替换它。

### 示例 8: Spy 函数

```typescript
import { describe, it, expect, vi } from 'vitest';

describe('Spy 示例', () => {
  it('should spy on object method', () => {
    // Arrange
    const calculator = {
      add: (a: number, b: number) => a + b,
    };

    // 创建 Spy
    const addSpy = vi.spyOn(calculator, 'add');

    // Act
    const result = calculator.add(2, 3);

    // Assert: 验证调用和返回值
    expect(result).toBe(5);
    expect(addSpy).toHaveBeenCalledWith(2, 3);
    expect(addSpy).toHaveBeenCalledTimes(1);
  });

  it('should spy and mock return value', () => {
    // Arrange
    const calculator = {
      add: (a: number, b: number) => a + b,
    };

    // Spy 并修改返回值
    const addSpy = vi.spyOn(calculator, 'add').mockReturnValue(100);

    // Act
    const result = calculator.add(2, 3);

    // Assert
    expect(result).toBe(100); // 返回 Mock 值
    expect(addSpy).toHaveBeenCalledWith(2, 3);
  });

  it('should restore original implementation', () => {
    // Arrange
    const calculator = {
      add: (a: number, b: number) => a + b,
    };

    const addSpy = vi.spyOn(calculator, 'add').mockReturnValue(100);

    // Act: 恢复原始实现
    addSpy.mockRestore();
    const result = calculator.add(2, 3);

    // Assert: 使用原始实现
    expect(result).toBe(5);
  });
});
```

### 示例 9: 部分 Mock 模块

```typescript
import { describe, it, expect, vi } from 'vitest';
import * as mediaUtils from '@/utils/media/mediaOperations';

describe('部分 Mock 模块', () => {
  it('should partially mock module', () => {
    // 只 Mock 部分函数
    vi.spyOn(mediaUtils, 'addItemsToFolder').mockReturnValue([]);
    
    // 其他函数保持原样
    const result = mediaUtils.findFolder([], 'test-id');
    
    // Assert
    expect(mediaUtils.addItemsToFolder).toHaveBeenCalled();
    expect(result).toBeNull(); // 使用真实实现
  });

  it('should mock with original implementation', async () => {
    // 保留原始实现但监视调用
    const spy = vi.spyOn(mediaUtils, 'addItemsToFolder');

    // Act
    const items = [];
    const newItem = { id: '1', name: 'test', type: 'video' };
    const result = mediaUtils.addItemsToFolder(items, null, [newItem]);

    // Assert: 使用真实实现
    expect(result).toHaveLength(1);
    expect(spy).toHaveBeenCalled();
  });
});
```

**关键点**:
- 使用 `vi.spyOn()` 创建 Spy
- Spy 可以监视调用但保留原实现
- 使用 `mockReturnValue` 修改返回值
- 使用 `mockRestore()` 恢复原实现
- 部分 Mock 只替换需要的函数

---

## Mock 数据

使用 Mock 数据简化测试。

### 示例 10: 使用 Mock 数据

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MediaLibrary from '@/components/MediaLibrary';
import {
  mockVideoFile,
  mockAudioFile,
  mockFolderWithFiles,
  mockNestedFolders,
} from '@/test/utils/mockData';

describe('MediaLibrary - Mock 数据', () => {
  it('should render video file', () => {
    // 使用预定义的 Mock 数据
    render(<MediaLibrary items={[mockVideoFile]} />);

    expect(screen.getByText('sample-video.mp4')).toBeInTheDocument();
  });

  it('should render folder with files', () => {
    // 使用复杂的 Mock 数据
    render(<MediaLibrary items={[mockFolderWithFiles]} />);

    expect(screen.getByText('Media Folder')).toBeInTheDocument();
  });

  it('should render nested folders', () => {
    // 使用嵌套的 Mock 数据
    render(<MediaLibrary items={[mockNestedFolders]} />);

    expect(screen.getByText('Parent Folder')).toBeInTheDocument();
  });

  it('should render mixed items', () => {
    // 组合多个 Mock 数据
    const items = [mockVideoFile, mockAudioFile, mockFolderWithFiles];
    render(<MediaLibrary items={items} />);

    expect(screen.getByText('sample-video.mp4')).toBeInTheDocument();
    expect(screen.getByText('sample-audio.mp3')).toBeInTheDocument();
    expect(screen.getByText('Media Folder')).toBeInTheDocument();
  });
});
```

**Mock 数据文件示例** (`test/utils/mockData.ts`):

```typescript
import type { MediaFile, MediaFolder } from '@/utils/media/mediaOperations';

export const mockVideoFile: MediaFile = {
  id: 'video-1',
  name: 'sample-video.mp4',
  path: '/path/to/sample-video.mp4',
  url: 'asset://localhost/path/to/sample-video.mp4',
  type: 'video',
};

export const mockAudioFile: MediaFile = {
  id: 'audio-1',
  name: 'sample-audio.mp3',
  path: '/path/to/sample-audio.mp3',
  url: 'asset://localhost/path/to/sample-audio.mp3',
  type: 'audio',
};

export const mockFolderWithFiles: MediaFolder = {
  id: 'folder-1',
  name: 'Media Folder',
  type: 'folder',
  children: [mockVideoFile, mockAudioFile],
};
```

**关键点**:
- 创建可重用的 Mock 数据
- 组织 Mock 数据到单独文件
- 使用 TypeScript 类型确保类型安全
- 组合 Mock 数据创建复杂场景

---

## 最佳实践总结

### ✅ 好的做法

```typescript
// 1. 清理 Mock
afterEach(() => {
  vi.clearAllMocks();
});

// 2. 使用类型安全的 Mock
vi.mocked(open).mockResolvedValue(['/path/to/file.mp4']);

// 3. Mock 最小必要范围
vi.spyOn(module, 'specificFunction');

// 4. 使用描述性的 Mock 数据
const mockUser = { id: '1', name: 'Test User', email: 'test@example.com' };

// 5. 验证 Mock 调用
expect(mockFn).toHaveBeenCalledWith(expectedArg);
```

### ❌ 避免的做法

```typescript
// 1. 不清理 Mock
// 会导致测试之间相互影响

// 2. 过度 Mock
vi.mock('@/components/MediaLibrary'); // 不要 Mock 被测试的组件

// 3. Mock 实现细节
vi.spyOn(component, 'privateMethod'); // 不要 Mock 私有方法

// 4. 使用魔法值
mockFn.mockReturnValue(42); // 使用有意义的常量

// 5. 不验证 Mock
mockFn(); // 应该验证调用
```

---

## Mock 清理策略

```typescript
import { describe, it, vi, beforeEach, afterEach } from 'vitest';

describe('Mock 清理', () => {
  beforeEach(() => {
    // 每个测试前的设置
    vi.clearAllMocks(); // 清理所有 Mock 的调用历史
  });

  afterEach(() => {
    // 每个测试后的清理
    vi.restoreAllMocks(); // 恢复所有 Spy
    vi.clearAllTimers(); // 清理所有定时器
  });

  // 测试...
});
```

**清理方法**:
- `vi.clearAllMocks()`: 清理调用历史，保留 Mock 实现
- `vi.resetAllMocks()`: 清理调用历史和 Mock 实现
- `vi.restoreAllMocks()`: 恢复所有 Spy 到原始实现
- `vi.clearAllTimers()`: 清理所有定时器

---

## 运行测试

```bash
# 运行所有测试
pnpm test

# 运行特定测试文件
pnpm test mockData.test.ts

# 监听模式
pnpm test:watch

# 查看测试覆盖率
pnpm test:coverage
```

---

## 相关文档

- [单元测试示例](./UNIT_TEST_EXAMPLE.md)
- [组件测试示例](./COMPONENT_TEST_EXAMPLE.md)
- [测试指南](./README.md)
- [最佳实践](./BEST_PRACTICES.md)
- [故障排查](./TROUBLESHOOTING.md)

