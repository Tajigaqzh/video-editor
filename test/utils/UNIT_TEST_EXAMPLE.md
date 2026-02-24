# 单元测试示例 (Unit Test Examples)

本文档提供了单元测试的实际示例，展示如何测试纯函数和工具函数。

## 目录
- [基础单元测试](#基础单元测试)
- [测试边界情况](#测试边界情况)
- [测试错误处理](#测试错误处理)
- [参数化测试](#参数化测试)

---

## 基础单元测试

单元测试用于测试独立的函数，不依赖外部系统。

### 示例 1: 测试文件类型识别

```typescript
import { describe, it, expect } from 'vitest';
import { getFileType } from '@/hooks/useMediaFile';

describe('getFileType', () => {
  it('should return "video" for mp4 files', () => {
    // Arrange: 准备测试数据
    const filename = 'test.mp4';
    
    // Act: 执行被测试的函数
    const result = getFileType(filename);
    
    // Assert: 验证结果
    expect(result).toBe('video');
  });

  it('should return "audio" for mp3 files', () => {
    expect(getFileType('test.mp3')).toBe('audio');
  });

  it('should return "image" for jpg files', () => {
    expect(getFileType('test.jpg')).toBe('image');
  });
});
```

**关键点**:
- 使用 `describe` 组织相关测试
- 使用 `it` 描述单个测试用例
- 遵循 AAA 模式 (Arrange, Act, Assert)
- 使用清晰的测试描述

---

## 测试边界情况

边界情况是容易出错的特殊输入。

### 示例 2: 测试边界值

```typescript
import { describe, it, expect } from 'vitest';
import { getFileType, getFileName } from '@/hooks/useMediaFile';

describe('getFileType - 边界情况', () => {
  it('should handle uppercase extensions', () => {
    expect(getFileType('test.MP4')).toBe('video');
    expect(getFileType('test.JPG')).toBe('image');
  });

  it('should handle files without extension', () => {
    expect(getFileType('test')).toBe('unknown');
  });

  it('should handle empty string', () => {
    expect(getFileType('')).toBe('unknown');
  });

  it('should handle files with only dot', () => {
    expect(getFileType('.')).toBe('unknown');
  });
});

describe('getFileName - 边界情况', () => {
  it('should handle empty string', () => {
    expect(getFileName('')).toBe('Unknown');
  });

  it('should handle single character filename', () => {
    expect(getFileName('a')).toBe('a');
  });

  it('should handle filename with multiple dots', () => {
    expect(getFileName('/path/to/file.name.with.dots.mp4'))
      .toBe('file.name.with.dots.mp4');
  });

  it('should handle filename with spaces', () => {
    expect(getFileName('/path/to/my video file.mp4'))
      .toBe('my video file.mp4');
  });
});
```

**关键点**:
- 测试空值、空字符串
- 测试极端值（最大、最小）
- 测试特殊字符
- 测试不同格式的输入

---

## 测试错误处理

测试函数如何处理错误和异常情况。

### 示例 3: 测试错误场景

```typescript
import { describe, it, expect } from 'vitest';

// 假设有一个解析函数
function parseMediaDuration(duration: string): number {
  if (!duration) {
    throw new Error('Duration cannot be empty');
  }
  
  const parsed = parseFloat(duration);
  if (isNaN(parsed)) {
    throw new Error('Invalid duration format');
  }
  
  return parsed;
}

describe('parseMediaDuration', () => {
  it('should parse valid duration', () => {
    expect(parseMediaDuration('120.5')).toBe(120.5);
  });

  it('should throw error for empty duration', () => {
    expect(() => parseMediaDuration('')).toThrow('Duration cannot be empty');
  });

  it('should throw error for invalid format', () => {
    expect(() => parseMediaDuration('invalid')).toThrow('Invalid duration format');
  });

  it('should handle zero duration', () => {
    expect(parseMediaDuration('0')).toBe(0);
  });

  it('should handle negative duration', () => {
    expect(parseMediaDuration('-10')).toBe(-10);
  });
});
```

**关键点**:
- 使用 `toThrow` 测试异常
- 测试错误消息内容
- 测试各种无效输入
- 确保错误处理符合预期

---

## 参数化测试

使用 `it.each` 测试多组相似的输入。

### 示例 4: 参数化测试

```typescript
import { describe, it, expect } from 'vitest';
import { getFileType } from '@/hooks/useMediaFile';

describe('getFileType - 参数化测试', () => {
  // 测试多个视频格式
  it.each([
    ['test.mp4', 'video'],
    ['test.mov', 'video'],
    ['test.avi', 'video'],
    ['test.mkv', 'video'],
    ['test.webm', 'video'],
  ])('should return "video" for %s', (filename, expected) => {
    expect(getFileType(filename)).toBe(expected);
  });

  // 测试多个音频格式
  it.each([
    ['test.mp3', 'audio'],
    ['test.wav', 'audio'],
    ['test.aac', 'audio'],
    ['test.flac', 'audio'],
  ])('should return "audio" for %s', (filename, expected) => {
    expect(getFileType(filename)).toBe(expected);
  });

  // 测试多个图片格式
  it.each([
    ['test.jpg', 'image'],
    ['test.jpeg', 'image'],
    ['test.png', 'image'],
    ['test.gif', 'image'],
  ])('should return "image" for %s', (filename, expected) => {
    expect(getFileType(filename)).toBe(expected);
  });
});
```

**使用对象格式的参数化测试**:

```typescript
describe('getFileType - 对象参数化', () => {
  it.each([
    { filename: 'video.mp4', expected: 'video', description: 'MP4 video' },
    { filename: 'audio.mp3', expected: 'audio', description: 'MP3 audio' },
    { filename: 'image.jpg', expected: 'image', description: 'JPG image' },
    { filename: 'unknown.txt', expected: 'unknown', description: 'Unknown file' },
  ])('should handle $description', ({ filename, expected }) => {
    expect(getFileType(filename)).toBe(expected);
  });
});
```

**关键点**:
- 使用 `it.each` 减少重复代码
- 数组格式适合简单测试
- 对象格式提供更好的可读性
- 使用 `%s` 或 `$variable` 在描述中显示参数

---

## 测试数据操作函数

测试复杂的数据转换和操作。

### 示例 5: 测试数组操作

```typescript
import { describe, it, expect } from 'vitest';
import { addItemsToFolder, removeItemFromFolder } from '@/utils/mediaOperations';
import type { MediaItem, MediaFile, MediaFolder } from '@/utils/mediaOperations';

describe('addItemsToFolder', () => {
  it('should add items to root', () => {
    // Arrange
    const items: MediaItem[] = [];
    const newItem: MediaFile = {
      id: '1',
      name: 'test.mp4',
      path: '/test.mp4',
      url: 'asset://test.mp4',
      type: 'video',
    };

    // Act
    const result = addItemsToFolder(items, null, [newItem]);

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(newItem);
  });

  it('should add items to subfolder', () => {
    // Arrange
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

    // Act
    const result = addItemsToFolder(items, 'folder-1', [newItem]);

    // Assert
    const updatedFolder = result[0] as MediaFolder;
    expect(updatedFolder.children).toHaveLength(1);
    expect(updatedFolder.children[0]).toEqual(newItem);
  });

  it('should not mutate original array', () => {
    // Arrange
    const items: MediaItem[] = [];
    const newItem: MediaFile = {
      id: '1',
      name: 'test.mp4',
      path: '/test.mp4',
      url: 'asset://test.mp4',
      type: 'video',
    };

    // Act
    const result = addItemsToFolder(items, null, [newItem]);

    // Assert
    expect(items).toHaveLength(0); // 原数组未改变
    expect(result).toHaveLength(1); // 新数组有数据
  });
});
```

**关键点**:
- 测试函数的主要功能
- 测试不可变性（不修改原数据）
- 使用类型断言确保类型安全
- 验证返回值的结构和内容

---

## 最佳实践总结

### ✅ 好的做法

```typescript
// 1. 清晰的测试描述
it('should return "video" for mp4 files', () => {
  expect(getFileType('test.mp4')).toBe('video');
});

// 2. 一个测试只验证一件事
it('should handle uppercase extensions', () => {
  expect(getFileType('test.MP4')).toBe('video');
});

// 3. 使用有意义的变量名
it('should add items to folder', () => {
  const emptyFolder = { id: '1', name: 'Folder', type: 'folder', children: [] };
  const newFile = { id: '2', name: 'test.mp4', type: 'video' };
  // ...
});

// 4. 测试边界情况
it('should handle empty string', () => {
  expect(getFileType('')).toBe('unknown');
});
```

### ❌ 避免的做法

```typescript
// 1. 模糊的测试描述
it('test1', () => {
  expect(getFileType('test.mp4')).toBe('video');
});

// 2. 一个测试验证多件事
it('should work', () => {
  expect(getFileType('test.mp4')).toBe('video');
  expect(getFileType('test.mp3')).toBe('audio');
  expect(getFileType('test.jpg')).toBe('image');
});

// 3. 测试实现细节而非行为
it('should call toLowerCase', () => {
  const spy = vi.spyOn(String.prototype, 'toLowerCase');
  getFileType('test.MP4');
  expect(spy).toHaveBeenCalled();
});

// 4. 过度依赖 Mock
it('should return video', () => {
  vi.mock('@/hooks/useMediaFile', () => ({
    getFileType: () => 'video'
  }));
  expect(getFileType('anything')).toBe('video');
});
```

---

## 运行测试

```bash
# 运行所有测试
pnpm test

# 运行特定文件
pnpm test useMediaFile.test.ts

# 监听模式
pnpm test:watch

# 查看覆盖率
pnpm test:coverage
```

---

## 相关文档

- [组件测试示例](./COMPONENT_TEST_EXAMPLE.md)
- [Mock 使用示例](./MOCK_USAGE_EXAMPLE.md)
- [测试指南](./README.md)
- [最佳实践](./BEST_PRACTICES.md)
