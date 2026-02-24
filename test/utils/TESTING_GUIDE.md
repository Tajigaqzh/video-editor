# 测试指南

## 目录

1. [快速开始](#快速开始)
2. [测试类型](#测试类型)
3. [编写测试](#编写测试)
4. [运行测试](#运行测试)
5. [测试工具](#测试工具)
6. [常见模式](#常见模式)

## 快速开始

### 安装依赖

项目已配置好所有测试依赖，无需额外安装。

### 运行测试

```bash
# 运行所有测试
pnpm test

# 监听模式（开发时推荐）
pnpm test:watch

# 打开测试 UI
pnpm test:ui

# 生成覆盖率报告
pnpm test:coverage
```

### 创建第一个测试

```typescript
// src/utils/myFunction.test.ts
import { describe, it, expect } from 'vitest';
import { myFunction } from './myFunction';

describe('myFunction', () => {
  it('should return expected result', () => {
    const result = myFunction('input');
    expect(result).toBe('expected output');
  });
});
```

## 测试类型

### 1. 单元测试

测试独立的函数和工具，不依赖外部系统。

**适用场景**:
- 工具函数
- 数据转换函数
- 纯函数逻辑

**示例**:
```typescript
// src/hooks/useMediaFile.test.ts
import { getFileType } from './useMediaFile';

describe('getFileType', () => {
  it('should identify video files', () => {
    expect(getFileType('video.mp4')).toBe('video');
    expect(getFileType('movie.mov')).toBe('video');
  });

  it('should identify audio files', () => {
    expect(getFileType('song.mp3')).toBe('audio');
  });
});
```

### 2. 组件测试

测试 React 组件的渲染和用户交互。

**适用场景**:
- UI 组件
- 用户交互
- 状态管理

**示例**:
```typescript
// src/components/Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import Button from './Button';

describe('Button', () => {
  it('should render with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('should call onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click</Button>);
    
    fireEvent.click(screen.getByText('Click'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### 3. 集成测试

测试多个组件或模块之间的交互。

**适用场景**:
- 组件组合
- 数据流
- 完整用户场景

**示例**:
```typescript
// src/components/MediaLibrary.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import MediaLibrary from './MediaLibrary';

describe('MediaLibrary Integration', () => {
  it('should create folder and navigate into it', () => {
    render(<MediaLibrary />);
    
    // 创建文件夹
    fireEvent.contextMenu(screen.getByTestId('media-area'));
    fireEvent.click(screen.getByText('新建文件夹'));
    
    // 进入文件夹
    const folder = screen.getByText('新建文件夹');
    fireEvent.doubleClick(folder);
    
    // 验证导航
    expect(screen.getByText('新建文件夹')).toBeInTheDocument();
  });
});
```

## 编写测试

### AAA 模式

遵循 Arrange-Act-Assert 模式编写清晰的测试：

```typescript
it('should add item to list', () => {
  // Arrange - 准备测试数据
  const list = [];
  const newItem = { id: 1, name: 'Test' };
  
  // Act - 执行操作
  const result = addItem(list, newItem);
  
  // Assert - 验证结果
  expect(result).toHaveLength(1);
  expect(result[0]).toEqual(newItem);
});
```

### 描述性命名

使用清晰的描述性名称：

```typescript
// ✅ 好的命名
describe('UserAuthentication', () => {
  it('should reject invalid email format', () => {});
  it('should accept valid credentials', () => {});
});

// ❌ 不好的命名
describe('test', () => {
  it('test1', () => {});
  it('works', () => {});
});
```

### 测试行为而非实现

```typescript
// ✅ 测试行为
it('should display error message when form is invalid', () => {
  render(<LoginForm />);
  fireEvent.click(screen.getByText('Submit'));
  expect(screen.getByText('Email is required')).toBeInTheDocument();
});

// ❌ 测试实现细节
it('should set errorState to true', () => {
  const { result } = renderHook(() => useForm());
  result.current.submit();
  expect(result.current.errorState).toBe(true);
});
```

### 独立的测试

每个测试应该独立运行，不依赖其他测试：

```typescript
// ✅ 独立测试
describe('Counter', () => {
  it('should start at 0', () => {
    const counter = new Counter();
    expect(counter.value).toBe(0);
  });

  it('should increment', () => {
    const counter = new Counter();
    counter.increment();
    expect(counter.value).toBe(1);
  });
});

// ❌ 依赖的测试
describe('Counter', () => {
  const counter = new Counter(); // 共享状态

  it('should start at 0', () => {
    expect(counter.value).toBe(0);
  });

  it('should increment', () => {
    counter.increment(); // 依赖前一个测试
    expect(counter.value).toBe(1);
  });
});
```

## 运行测试

### 命令选项

```bash
# 运行所有测试
pnpm test

# 运行特定文件
pnpm test src/components/Button.test.tsx

# 运行匹配模式的测试
pnpm test --grep "should render"

# 监听模式
pnpm test:watch

# UI 模式
pnpm test:ui

# 覆盖率报告
pnpm test:coverage
```

### 监听模式快捷键

在 `pnpm test:watch` 模式下：

- `a` - 运行所有测试
- `f` - 只运行失败的测试
- `p` - 按文件名过滤
- `t` - 按测试名过滤
- `q` - 退出

### 查看覆盖率报告

```bash
# 生成覆盖率报告
pnpm test:coverage

# 在浏览器中打开 HTML 报告
open coverage/index.html
```

## 测试工具

### 断言 (Assertions)

```typescript
// 基本断言
expect(value).toBe(expected);           // 严格相等
expect(value).toEqual(expected);        // 深度相等
expect(value).toBeTruthy();             // 真值
expect(value).toBeFalsy();              // 假值
expect(value).toBeNull();               // null
expect(value).toBeUndefined();          // undefined

// 数字
expect(value).toBeGreaterThan(3);
expect(value).toBeLessThan(10);
expect(value).toBeCloseTo(0.3);         // 浮点数

// 字符串
expect(string).toContain('substring');
expect(string).toMatch(/pattern/);

// 数组
expect(array).toHaveLength(3);
expect(array).toContain(item);

// 对象
expect(object).toHaveProperty('key');
expect(object).toMatchObject({ key: 'value' });

// 函数
expect(fn).toHaveBeenCalled();
expect(fn).toHaveBeenCalledWith(arg1, arg2);
expect(fn).toHaveBeenCalledTimes(2);
```

### DOM 断言 (jest-dom)

```typescript
// 可见性
expect(element).toBeInTheDocument();
expect(element).toBeVisible();
expect(element).toBeEmptyDOMElement();

// 属性
expect(element).toHaveAttribute('href', '/path');
expect(element).toHaveClass('active');
expect(element).toHaveStyle({ color: 'red' });

// 表单
expect(input).toHaveValue('text');
expect(input).toBeDisabled();
expect(input).toBeChecked();
expect(input).toHaveFocus();

// 文本
expect(element).toHaveTextContent('Hello');
```

### Mock 函数

```typescript
import { vi } from 'vitest';

// 创建 mock 函数
const mockFn = vi.fn();

// 设置返回值
mockFn.mockReturnValue(42);
mockFn.mockResolvedValue('async result');

// 设置实现
mockFn.mockImplementation((x) => x * 2);

// 验证调用
expect(mockFn).toHaveBeenCalled();
expect(mockFn).toHaveBeenCalledWith('arg');
expect(mockFn).toHaveBeenCalledTimes(2);

// 清理
mockFn.mockClear();      // 清除调用记录
mockFn.mockReset();      // 清除调用记录和实现
mockFn.mockRestore();    // 恢复原始实现
```

### Mock 模块

```typescript
// Mock 整个模块
vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: vi.fn(),
}));

// 使用 mock
import { open } from '@tauri-apps/plugin-dialog';
vi.mocked(open).mockResolvedValue(['/path/to/file']);

// Mock 部分模块
vi.mock('./utils', async () => {
  const actual = await vi.importActual('./utils');
  return {
    ...actual,
    specificFunction: vi.fn(),
  };
});
```

### 用户交互

```typescript
import { fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// fireEvent - 简单直接
fireEvent.click(button);
fireEvent.change(input, { target: { value: 'text' } });

// userEvent - 更接近真实用户行为（推荐）
const user = userEvent.setup();
await user.click(button);
await user.type(input, 'text');
await user.clear(input);
await user.selectOptions(select, 'option1');
```

## 常见模式

### 测试异步代码

```typescript
// Promise
it('should fetch data', async () => {
  const data = await fetchData();
  expect(data).toEqual({ id: 1 });
});

// 等待元素出现
it('should show loading state', async () => {
  render(<AsyncComponent />);
  expect(await screen.findByText('Loading...')).toBeInTheDocument();
});

// waitFor
import { waitFor } from '@testing-library/react';

it('should update after delay', async () => {
  render(<Component />);
  await waitFor(() => {
    expect(screen.getByText('Updated')).toBeInTheDocument();
  });
});
```

### 测试错误处理

```typescript
it('should throw error for invalid input', () => {
  expect(() => {
    processData(null);
  }).toThrow('Invalid input');
});

it('should display error message', async () => {
  render(<Form />);
  fireEvent.click(screen.getByText('Submit'));
  
  expect(await screen.findByText('Error occurred')).toBeInTheDocument();
});
```

### 测试条件渲染

```typescript
it('should show content when logged in', () => {
  render(<Dashboard isLoggedIn={true} />);
  expect(screen.getByText('Welcome')).toBeInTheDocument();
});

it('should show login prompt when not logged in', () => {
  render(<Dashboard isLoggedIn={false} />);
  expect(screen.getByText('Please log in')).toBeInTheDocument();
});
```

### 使用测试工具函数

```typescript
// test/utils/testUtils.tsx
import { render } from '@testing-library/react';
import { StoreProvider } from '@/store/useStore';

export function renderWithProviders(ui: React.ReactElement) {
  return render(
    <StoreProvider>
      {ui}
    </StoreProvider>
  );
}

// 在测试中使用
import { renderWithProviders } from '@/test/utils/testUtils';

it('should render with store', () => {
  renderWithProviders(<MyComponent />);
  // ...
});
```

### 测试数据生成

```typescript
// test/utils/testDataGenerators.ts
export function createMockMediaFile(overrides = {}) {
  return {
    id: Math.random().toString(),
    name: 'test.mp4',
    path: '/test.mp4',
    url: 'asset://test.mp4',
    type: 'video',
    ...overrides,
  };
}

// 在测试中使用
it('should display media file', () => {
  const file = createMockMediaFile({ name: 'custom.mp4' });
  render(<MediaItem file={file} />);
  expect(screen.getByText('custom.mp4')).toBeInTheDocument();
});
```

## 下一步

- 查看 [最佳实践文档](./BEST_PRACTICES.md) 了解更多测试技巧
- 查看 [故障排查指南](./TROUBLESHOOTING.md) 解决常见问题
- 查看现有测试文件作为参考示例
