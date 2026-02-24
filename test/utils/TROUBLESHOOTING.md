# 故障排查指南

## 目录

1. [配置问题](#配置问题)
2. [导入和模块问题](#导入和模块问题)
3. [Mock 问题](#mock-问题)
4. [异步测试问题](#异步测试问题)
5. [DOM 和渲染问题](#dom-和渲染问题)
6. [覆盖率问题](#覆盖率问题)
7. [性能问题](#性能问题)
8. [Tauri 特定问题](#tauri-特定问题)

## 配置问题

### 问题: 测试找不到模块

**错误信息**:
```
Error: Cannot find module '@/components/Button'
```

**原因**: 路径别名未正确配置

**解决方案**:

1. 检查 `vitest.config.ts` 中的 alias 配置：

```typescript
// vitest.config.ts
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

2. 确保 `tsconfig.json` 中也配置了相同的路径：

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### 问题: jsdom 环境错误

**错误信息**:
```
ReferenceError: document is not defined
```

**原因**: 测试环境未设置为 jsdom

**解决方案**:

1. 检查 `vitest.config.ts`:

```typescript
export default defineConfig({
  test: {
    environment: 'jsdom',
  },
});
```

2. 确保安装了 jsdom:

```bash
pnpm add -D jsdom
```

### 问题: 全局 API 未定义

**错误信息**:
```
ReferenceError: describe is not defined
ReferenceError: it is not defined
```

**原因**: 未启用全局 API

**解决方案**:

在 `vitest.config.ts` 中启用全局 API:

```typescript
export default defineConfig({
  test: {
    globals: true,
  },
});
```

或者在测试文件中显式导入:

```typescript
import { describe, it, expect } from 'vitest';
```

## 导入和模块问题

### 问题: CSS/图片导入失败

**错误信息**:
```
Error: Failed to parse source for import analysis
```

**原因**: Vitest 无法处理非 JS 文件

**解决方案**:

在 `vitest.config.ts` 中配置 mock:

```typescript
export default defineConfig({
  test: {
    // Mock CSS 模块
    css: false,
    
    // 或者使用 transformMode
    transformMode: {
      web: [/\.[jt]sx?$/],
    },
  },
});
```

### 问题: ESM 模块导入错误

**错误信息**:
```
SyntaxError: Cannot use import statement outside a module
```

**原因**: 某些包只提供 ESM 格式

**解决方案**:

在 `vitest.config.ts` 中配置 transformInclude:

```typescript
export default defineConfig({
  test: {
    deps: {
      inline: ['problematic-package'],
    },
  },
});
```

### 问题: 动态导入失败

**错误信息**:
```
Error: Unknown variable dynamic import
```

**原因**: Vitest 默认不支持某些动态导入

**解决方案**:

使用静态导入或配置 Vite:

```typescript
// 使用静态导入
import Component from './Component';

// 或者在 vitest.config.ts 中配置
export default defineConfig({
  test: {
    server: {
      deps: {
        inline: true,
      },
    },
  },
});
```

## Mock 问题

### 问题: Mock 不生效

**错误信息**:
```
TypeError: mockFn is not a function
```

**原因**: Mock 定义在错误的位置或时机

**解决方案**:

1. 确保 mock 在导入之前定义:

```typescript
// ✅ 正确 - mock 在导入前
vi.mock('@tauri-apps/plugin-dialog');
import { open } from '@tauri-apps/plugin-dialog';

// ❌ 错误 - mock 在导入后
import { open } from '@tauri-apps/plugin-dialog';
vi.mock('@tauri-apps/plugin-dialog');
```

2. 使用 vi.mocked 获得类型安全:

```typescript
import { open } from '@tauri-apps/plugin-dialog';
vi.mock('@tauri-apps/plugin-dialog');

it('test', () => {
  vi.mocked(open).mockResolvedValue(['/path']);
});
```

### 问题: Mock 在测试间泄漏

**错误信息**:
```
Expected mock function to have been called 1 time, but it was called 2 times
```

**原因**: Mock 状态未清理

**解决方案**:

在 afterEach 中清理 mock:

```typescript
describe('MyTests', () => {
  afterEach(() => {
    vi.clearAllMocks(); // 清除调用记录
    // 或
    vi.resetAllMocks(); // 清除调用记录和实现
    // 或
    vi.restoreAllMocks(); // 恢复原始实现
  });
});
```

### 问题: 无法 mock 默认导出

**错误信息**:
```
TypeError: Cannot read property 'default' of undefined
```

**原因**: Mock 默认导出的方式不正确

**解决方案**:

```typescript
// 对于默认导出
vi.mock('./myModule', () => ({
  default: vi.fn(),
}));

// 对于命名导出
vi.mock('./myModule', () => ({
  namedExport: vi.fn(),
}));

// 对于混合导出
vi.mock('./myModule', () => ({
  default: vi.fn(),
  namedExport: vi.fn(),
}));
```

### 问题: 部分 mock 模块

**场景**: 只想 mock 模块的某些导出

**解决方案**:

```typescript
vi.mock('./utils', async () => {
  const actual = await vi.importActual('./utils');
  return {
    ...actual,
    specificFunction: vi.fn(), // 只 mock 这个函数
  };
});
```

## 异步测试问题

### 问题: 测试在异步操作完成前结束

**错误信息**:
```
Unable to find an element with the text: Loading complete
```

**原因**: 没有等待异步操作完成

**解决方案**:

1. 使用 async/await:

```typescript
it('should load data', async () => {
  render(<AsyncComponent />);
  
  // ✅ 等待元素出现
  expect(await screen.findByText('Data loaded')).toBeInTheDocument();
  
  // ❌ 不等待
  // expect(screen.getByText('Data loaded')).toBeInTheDocument();
});
```

2. 使用 waitFor:

```typescript
import { waitFor } from '@testing-library/react';

it('should update after delay', async () => {
  render(<Component />);
  
  await waitFor(() => {
    expect(screen.getByText('Updated')).toBeInTheDocument();
  });
});
```

3. 配置超时时间:

```typescript
it('should load slowly', async () => {
  render(<SlowComponent />);
  
  expect(
    await screen.findByText('Loaded', {}, { timeout: 5000 })
  ).toBeInTheDocument();
}, 10000); // 测试超时时间
```

### 问题: act() 警告

**错误信息**:
```
Warning: An update to Component inside a test was not wrapped in act(...)
```

**原因**: 状态更新未在 act 中包装

**解决方案**:

1. 使用 Testing Library 的方法（自动处理 act）:

```typescript
// ✅ 自动处理 act
await user.click(button);
await screen.findByText('Updated');

// ❌ 手动处理可能遗漏
act(() => {
  button.click();
});
```

2. 等待异步更新完成:

```typescript
it('should update state', async () => {
  render(<Component />);
  fireEvent.click(screen.getByText('Update'));
  
  // 等待更新完成
  await waitFor(() => {
    expect(screen.getByText('Updated')).toBeInTheDocument();
  });
});
```

### 问题: Promise 未被捕获

**错误信息**:
```
UnhandledPromiseRejectionWarning: Error: Test error
```

**原因**: 异步测试中的错误未被捕获

**解决方案**:

```typescript
// ✅ 正确处理异步错误
it('should handle error', async () => {
  await expect(async () => {
    await failingFunction();
  }).rejects.toThrow('Error message');
});

// 或使用 try-catch
it('should handle error', async () => {
  try {
    await failingFunction();
    fail('Should have thrown');
  } catch (error) {
    expect(error.message).toBe('Error message');
  }
});
```

## DOM 和渲染问题

### 问题: 元素找不到

**错误信息**:
```
TestingLibraryElementError: Unable to find an element with the text: Submit
```

**原因**: 元素未渲染或查询方式不正确

**解决方案**:

1. 检查元素是否真的存在:

```typescript
// 调试 - 打印 DOM 结构
screen.debug();

// 或打印特定元素
screen.debug(screen.getByTestId('container'));
```

2. 使用正确的查询方法:

```typescript
// 文本内容
screen.getByText('Submit');
screen.getByText(/submit/i); // 不区分大小写

// 部分文本匹配
screen.getByText('Submit', { exact: false });

// 标签
screen.getByLabelText('Email');

// 占位符
screen.getByPlaceholderText('Enter email');

// 测试 ID
screen.getByTestId('submit-button');

// 角色
screen.getByRole('button', { name: 'Submit' });
```

3. 等待异步渲染:

```typescript
// 使用 findBy (异步)
const element = await screen.findByText('Submit');

// 使用 queryBy (不抛出错误)
const element = screen.queryByText('Submit');
expect(element).toBeNull();
```

### 问题: 多个元素匹配

**错误信息**:
```
TestingLibraryElementError: Found multiple elements with the text: Submit
```

**原因**: 查询返回多个元素

**解决方案**:

1. 使用 getAllBy:

```typescript
const buttons = screen.getAllByText('Submit');
expect(buttons).toHaveLength(2);
expect(buttons[0]).toBeInTheDocument();
```

2. 使用更具体的查询:

```typescript
// 使用角色和名称
screen.getByRole('button', { name: 'Submit Form' });

// 使用测试 ID
screen.getByTestId('submit-button-1');

// 使用容器查询
const form = screen.getByTestId('login-form');
within(form).getByText('Submit');
```

### 问题: 事件未触发

**场景**: fireEvent 或 userEvent 没有效果

**解决方案**:

1. 确保元素可交互:

```typescript
const button = screen.getByText('Submit');
expect(button).not.toBeDisabled();
expect(button).toBeVisible();
```

2. 使用 userEvent 而非 fireEvent:

```typescript
import userEvent from '@testing-library/user-event';

// ✅ 更真实的用户交互
const user = userEvent.setup();
await user.click(button);
await user.type(input, 'text');

// ❌ 简单的事件触发
fireEvent.click(button);
fireEvent.change(input, { target: { value: 'text' } });
```

3. 检查事件处理器:

```typescript
const handleClick = vi.fn();
render(<Button onClick={handleClick}>Click</Button>);

fireEvent.click(screen.getByText('Click'));
expect(handleClick).toHaveBeenCalled();
```

## 覆盖率问题

### 问题: 覆盖率报告不生成

**原因**: 未正确配置覆盖率工具

**解决方案**:

1. 安装覆盖率依赖:

```bash
pnpm add -D @vitest/coverage-v8
```

2. 配置 vitest.config.ts:

```typescript
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
});
```

3. 运行覆盖率命令:

```bash
pnpm test:coverage
```

### 问题: 覆盖率包含不需要的文件

**原因**: 未配置排除规则

**解决方案**:

```typescript
export default defineConfig({
  test: {
    coverage: {
      exclude: [
        'node_modules/',
        'src-tauri/',
        'dist/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData.ts',
        'src/main.tsx',
      ],
    },
  },
});
```

### 问题: 覆盖率阈值失败

**错误信息**:
```
ERROR: Coverage for statements (75%) does not meet threshold (80%)
```

**解决方案**:

1. 添加更多测试覆盖未测试的代码

2. 调整阈值（如果合理）:

```typescript
export default defineConfig({
  test: {
    coverage: {
      thresholds: {
        statements: 75,
        branches: 70,
        functions: 75,
        lines: 75,
      },
    },
  },
});
```

3. 排除难以测试的文件:

```typescript
coverage: {
  exclude: [
    // ... 其他排除
    'src/utils/legacy.ts', // 遗留代码
  ],
}
```

## 性能问题

### 问题: 测试运行缓慢

**原因**: 测试效率低或配置不当

**解决方案**:

1. 使用并行执行:

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
      },
    },
  },
});
```

2. 减少不必要的渲染:

```typescript
// ❌ 慢 - 每次都完整渲染
it('test 1', () => {
  render(<LargeComponent />);
});

it('test 2', () => {
  render(<LargeComponent />);
});

// ✅ 快 - 测试更小的单元
it('test 1', () => {
  render(<SmallComponent />);
});
```

3. 使用 vi.fn() 而非真实实现:

```typescript
// ✅ 快 - mock 慢速操作
vi.mock('./slowFunction', () => ({
  slowFunction: vi.fn().mockResolvedValue('result'),
}));
```

4. 配置测试超时:

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    testTimeout: 5000, // 5 秒
  },
});

// 或在单个测试中
it('slow test', async () => {
  // ...
}, 10000); // 10 秒
```

### 问题: 内存泄漏

**症状**: 测试运行时内存持续增长

**解决方案**:

1. 清理副作用:

```typescript
afterEach(() => {
  cleanup(); // React Testing Library
  vi.clearAllMocks();
  vi.clearAllTimers();
});
```

2. 避免全局状态:

```typescript
// ❌ 全局状态可能泄漏
let globalState = {};

// ✅ 每个测试独立状态
beforeEach(() => {
  const localState = {};
});
```

## Tauri 特定问题

### 问题: Tauri API 未定义

**错误信息**:
```
TypeError: Cannot read property 'invoke' of undefined
```

**原因**: Tauri API 在测试环境中不可用

**解决方案**:

在 `vitest.setup.ts` 中 mock Tauri API:

```typescript
// vitest.setup.ts
global.window = Object.create(window);
Object.defineProperty(window, '__TAURI__', {
  value: {
    invoke: vi.fn(),
    convertFileSrc: vi.fn((path: string) => `asset://localhost/${path}`),
  },
  writable: true,
});

// Mock Tauri 插件
vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: vi.fn(),
  save: vi.fn(),
}));

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
  convertFileSrc: vi.fn((path: string) => `asset://localhost/${path}`),
}));
```

### 问题: convertFileSrc 返回错误路径

**原因**: Mock 实现不正确

**解决方案**:

```typescript
import { convertFileSrc } from '@tauri-apps/api/core';

vi.mock('@tauri-apps/api/core', () => ({
  convertFileSrc: vi.fn((path: string) => {
    // 模拟 Tauri 的路径转换
    return `asset://localhost${path}`;
  }),
}));

it('should convert file path', () => {
  const result = convertFileSrc('/path/to/file.mp4');
  expect(result).toBe('asset://localhost/path/to/file.mp4');
});
```

### 问题: invoke 调用失败

**原因**: 未正确 mock invoke 函数

**解决方案**:

```typescript
import { invoke } from '@tauri-apps/api/core';

vi.mock('@tauri-apps/api/core');

it('should call Tauri command', async () => {
  vi.mocked(invoke).mockResolvedValue({ success: true });
  
  const result = await invoke('my_command', { arg: 'value' });
  
  expect(invoke).toHaveBeenCalledWith('my_command', { arg: 'value' });
  expect(result).toEqual({ success: true });
});
```

## 调试技巧

### 1. 使用 screen.debug()

```typescript
it('debug test', () => {
  render(<MyComponent />);
  
  // 打印整个 DOM
  screen.debug();
  
  // 打印特定元素
  screen.debug(screen.getByTestId('container'));
  
  // 限制输出长度
  screen.debug(undefined, 10000);
});
```

### 2. 使用 console.log

```typescript
it('debug test', () => {
  const result = myFunction();
  console.log('Result:', result);
  expect(result).toBe(expected);
});
```

### 3. 使用 VS Code 调试器

在 `.vscode/launch.json` 中配置:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Vitest Tests",
      "runtimeExecutable": "pnpm",
      "runtimeArgs": ["test", "--run"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

### 4. 隔离失败的测试

```typescript
// 只运行这个测试
it.only('failing test', () => {
  // ...
});

// 跳过这个测试
it.skip('skip this test', () => {
  // ...
});
```

### 5. 查看测试报告

```bash
# 详细输出
pnpm test --reporter=verbose

# UI 模式
pnpm test:ui
```

## 获取帮助

如果以上方法都无法解决问题：

1. 查看 [Vitest 文档](https://vitest.dev/)
2. 查看 [Testing Library 文档](https://testing-library.com/)
3. 搜索 [GitHub Issues](https://github.com/vitest-dev/vitest/issues)
4. 查看项目的其他测试文件作为参考
5. 在团队中寻求帮助

## 相关文档

- [测试指南](./TESTING_GUIDE.md)
- [最佳实践](./BEST_PRACTICES.md)
- [README](./README.md)
