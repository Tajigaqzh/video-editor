# 组件测试示例 (Component Test Examples)

本文档提供了 React 组件测试的实际示例，展示如何使用 React Testing Library 测试组件的渲染和交互。

## 目录
- [基础组件测试](#基础组件测试)
- [测试用户交互](#测试用户交互)
- [测试表单和输入](#测试表单和输入)
- [测试异步操作](#测试异步操作)
- [测试条件渲染](#测试条件渲染)

---

## 基础组件测试

测试组件是否正确渲染。

### 示例 1: 测试简单组件渲染

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ContextMenu from '@/components/ContextMenu';

describe('ContextMenu', () => {
  it('should render menu with correct items', () => {
    // Arrange & Act: 渲染组件
    render(
      <ContextMenu
        x={100}
        y={100}
        onAction={() => {}}
        onClose={() => {}}
      />
    );

    // Assert: 验证元素存在
    expect(screen.getByText('新建文件夹')).toBeInTheDocument();
    expect(screen.getByText('添加素材')).toBeInTheDocument();
  });

  it('should render at correct position', () => {
    // Arrange & Act
    const { container } = render(
      <ContextMenu
        x={150}
        y={200}
        onAction={() => {}}
        onClose={() => {}}
      />
    );

    // Assert: 验证样式
    const menu = container.firstChild as HTMLElement;
    expect(menu.style.left).toBe('150px');
    expect(menu.style.top).toBe('200px');
  });

  it('should have proper CSS classes', () => {
    // Arrange & Act
    const { container } = render(
      <ContextMenu
        x={100}
        y={100}
        onAction={() => {}}
        onClose={() => {}}
      />
    );

    // Assert: 验证 CSS 类
    const menu = container.firstChild as HTMLElement;
    expect(menu).toHaveClass('fixed', 'bg-gray-800', 'rounded', 'shadow-lg');
  });
});
```

**关键点**:
- 使用 `render` 渲染组件
- 使用 `screen` 查询元素
- 使用 `toBeInTheDocument` 验证元素存在
- 使用 `container` 访问 DOM 结构

---

## 测试用户交互

测试用户点击、输入等交互行为。

### 示例 2: 测试点击事件

```typescript
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ContextMenu from '@/components/ContextMenu';

describe('ContextMenu - 用户交互', () => {
  const mockOnAction = vi.fn();
  const mockOnClose = vi.fn();

  // 每个测试后清理 Mock
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should call onAction when menu item clicked', () => {
    // Arrange
    render(
      <ContextMenu
        x={100}
        y={100}
        onAction={mockOnAction}
        onClose={mockOnClose}
      />
    );

    // Act: 点击菜单项
    fireEvent.click(screen.getByText('新建文件夹'));

    // Assert: 验证回调被调用
    expect(mockOnAction).toHaveBeenCalledWith('newFolder');
    expect(mockOnAction).toHaveBeenCalledTimes(1);
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

    // Act: 点击不同的菜单项
    fireEvent.click(screen.getByText('添加素材'));

    // Assert
    expect(mockOnAction).toHaveBeenCalledWith('addFiles');
  });

  it('should not call onConfirm when cancel clicked', () => {
    const mockOnConfirm = vi.fn();
    const mockOnCancel = vi.fn();

    render(
      <RenameDialog
        oldName="Test"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    // Act
    fireEvent.click(screen.getByText('取消'));

    // Assert
    expect(mockOnCancel).toHaveBeenCalled();
    expect(mockOnConfirm).not.toHaveBeenCalled();
  });
});
```

**关键点**:
- 使用 `vi.fn()` 创建 Mock 函数
- 使用 `fireEvent` 触发事件
- 使用 `toHaveBeenCalledWith` 验证参数
- 使用 `toHaveBeenCalledTimes` 验证调用次数
- 使用 `afterEach` 清理 Mock

---

## 测试表单和输入

测试表单输入、验证和提交。

### 示例 3: 测试输入框

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RenameDialog from '@/components/RenameDialog';

describe('RenameDialog - 表单测试', () => {
  const mockOnConfirm = vi.fn();
  const mockOnCancel = vi.fn();

  it('should display initial value in input', () => {
    // Arrange & Act
    render(
      <RenameDialog
        oldName="Old Name"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    // Assert: 验证输入框的值
    const input = screen.getByDisplayValue('Old Name') as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input.value).toBe('Old Name');
  });

  it('should auto-focus input field', () => {
    // Arrange & Act
    render(
      <RenameDialog
        oldName="Test"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    // Assert: 验证焦点
    const input = screen.getByDisplayValue('Test');
    expect(input).toHaveFocus();
  });

  it('should update input value when typing', async () => {
    // Arrange
    const user = userEvent.setup();
    render(
      <RenameDialog
        oldName="Old Name"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    // Act: 模拟用户输入
    const input = screen.getByDisplayValue('Old Name');
    await user.clear(input);
    await user.type(input, 'New Name');

    // Assert
    expect(input).toHaveValue('New Name');
  });

  it('should submit form with new value', async () => {
    // Arrange
    const user = userEvent.setup();
    render(
      <RenameDialog
        oldName="Old Name"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    // Act: 输入新值并提交
    const input = screen.getByDisplayValue('Old Name');
    await user.clear(input);
    await user.type(input, 'New Name');
    fireEvent.click(screen.getByText('确定'));

    // Assert
    expect(mockOnConfirm).toHaveBeenCalledWith('New Name');
  });

  it('should not submit empty value', () => {
    // Arrange
    render(
      <RenameDialog
        oldName="Old Name"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    // Act: 清空输入并尝试提交
    const input = screen.getByDisplayValue('Old Name');
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.click(screen.getByText('确定'));

    // Assert: 验证不会提交
    expect(mockOnConfirm).not.toHaveBeenCalled();
  });

  it('should trim whitespace from input', async () => {
    // Arrange
    const user = userEvent.setup();
    render(
      <RenameDialog
        oldName="Old Name"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    // Act: 输入带空格的值
    const input = screen.getByDisplayValue('Old Name');
    await user.clear(input);
    await user.type(input, '  New Name  ');
    fireEvent.click(screen.getByText('确定'));

    // Assert: 验证空格被去除
    expect(mockOnConfirm).toHaveBeenCalledWith('New Name');
  });
});
```

**关键点**:
- 使用 `userEvent` 模拟真实用户输入（推荐）
- 使用 `fireEvent` 触发简单事件
- 使用 `toHaveValue` 验证输入值
- 使用 `toHaveFocus` 验证焦点
- 测试表单验证逻辑

---

## 测试异步操作

测试异步加载、API 调用等。

### 示例 4: 测试异步行为

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { open } from '@tauri-apps/plugin-dialog';

// Mock Tauri dialog
vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: vi.fn(),
}));

describe('MediaLibrary - 异步操作', () => {
  it('should import files when dialog returns files', async () => {
    // Arrange: Mock 文件选择对话框
    vi.mocked(open).mockResolvedValue([
      '/path/to/file1.mp4',
      '/path/to/file2.mp3',
    ]);

    render(<MediaLibrary />);

    // Act: 点击导入按钮
    const importButton = screen.getByText('添加素材');
    await userEvent.click(importButton);

    // Assert: 等待文件出现
    await waitFor(() => {
      expect(screen.getByText('file1.mp4')).toBeInTheDocument();
      expect(screen.getByText('file2.mp3')).toBeInTheDocument();
    });
  });

  it('should handle cancelled dialog', async () => {
    // Arrange: Mock 取消对话框
    vi.mocked(open).mockResolvedValue(null);

    render(<MediaLibrary />);

    // Act
    const importButton = screen.getByText('添加素材');
    await userEvent.click(importButton);

    // Assert: 验证没有文件被添加
    await waitFor(() => {
      expect(screen.queryByText('file1.mp4')).not.toBeInTheDocument();
    });
  });

  it('should show loading state during import', async () => {
    // Arrange: Mock 延迟响应
    vi.mocked(open).mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve(['/path/to/file.mp4']), 100))
    );

    render(<MediaLibrary />);

    // Act
    const importButton = screen.getByText('添加素材');
    await userEvent.click(importButton);

    // Assert: 验证加载状态
    expect(screen.getByText('导入中...')).toBeInTheDocument();

    // 等待完成
    await waitFor(() => {
      expect(screen.queryByText('导入中...')).not.toBeInTheDocument();
    });
  });
});
```

**关键点**:
- 使用 `waitFor` 等待异步操作完成
- 使用 `mockResolvedValue` Mock Promise
- 使用 `mockImplementation` 自定义 Mock 行为
- 测试加载状态和错误处理

---

## 测试条件渲染

测试基于状态的条件渲染。

### 示例 5: 测试不同状态的渲染

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ContextMenu from '@/components/ContextMenu';

describe('ContextMenu - 条件渲染', () => {
  it('should render blank area menu when no itemId', () => {
    // Arrange & Act
    render(
      <ContextMenu
        x={100}
        y={100}
        onAction={() => {}}
        onClose={() => {}}
      />
    );

    // Assert: 验证空白区域菜单
    expect(screen.getByText('新建文件夹')).toBeInTheDocument();
    expect(screen.getByText('添加素材')).toBeInTheDocument();
    
    // 验证文件夹菜单不存在
    expect(screen.queryByText('重命名')).not.toBeInTheDocument();
    expect(screen.queryByText('删除')).not.toBeInTheDocument();
  });

  it('should render folder menu when itemId provided', () => {
    // Arrange & Act
    render(
      <ContextMenu
        x={100}
        y={100}
        itemId="folder-1"
        itemName="Test Folder"
        onAction={() => {}}
        onClose={() => {}}
      />
    );

    // Assert: 验证文件夹菜单
    expect(screen.getByText('重命名')).toBeInTheDocument();
    expect(screen.getByText('删除')).toBeInTheDocument();
    
    // 验证空白区域菜单不存在
    expect(screen.queryByText('新建文件夹')).not.toBeInTheDocument();
    expect(screen.queryByText('添加素材')).not.toBeInTheDocument();
  });

  it('should render empty state when no items', () => {
    // Arrange & Act
    render(<MediaLibrary items={[]} />);

    // Assert
    expect(screen.getByText('暂无素材')).toBeInTheDocument();
    expect(screen.getByText('点击添加素材开始')).toBeInTheDocument();
  });

  it('should render items when data exists', () => {
    // Arrange
    const items = [
      { id: '1', name: 'video.mp4', type: 'video' },
      { id: '2', name: 'audio.mp3', type: 'audio' },
    ];

    // Act
    render(<MediaLibrary items={items} />);

    // Assert
    expect(screen.getByText('video.mp4')).toBeInTheDocument();
    expect(screen.getByText('audio.mp3')).toBeInTheDocument();
    expect(screen.queryByText('暂无素材')).not.toBeInTheDocument();
  });
});
```

**关键点**:
- 使用 `queryBy` 查询可能不存在的元素
- 使用 `not.toBeInTheDocument` 验证元素不存在
- 测试所有可能的渲染分支
- 验证互斥的渲染条件

---

## 测试键盘事件

测试键盘快捷键和按键交互。

### 示例 6: 测试键盘交互

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RenameDialog from '@/components/RenameDialog';

describe('RenameDialog - 键盘事件', () => {
  const mockOnConfirm = vi.fn();
  const mockOnCancel = vi.fn();

  it('should submit on Enter key', async () => {
    // Arrange
    const user = userEvent.setup();
    render(
      <RenameDialog
        oldName="Test"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    // Act: 按 Enter 键
    const input = screen.getByDisplayValue('Test');
    await user.type(input, '{Enter}');

    // Assert
    expect(mockOnConfirm).toHaveBeenCalledWith('Test');
  });

  it('should cancel on Escape key', async () => {
    // Arrange
    const user = userEvent.setup();
    render(
      <RenameDialog
        oldName="Test"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    // Act: 按 Escape 键
    const input = screen.getByDisplayValue('Test');
    await user.type(input, '{Escape}');

    // Assert
    expect(mockOnCancel).toHaveBeenCalled();
    expect(mockOnConfirm).not.toHaveBeenCalled();
  });

  it('should handle keyboard navigation', async () => {
    // Arrange
    const user = userEvent.setup();
    render(<ContextMenu x={100} y={100} onAction={() => {}} onClose={() => {}} />);

    // Act: 使用 Tab 键导航
    await user.tab();
    
    // Assert: 验证焦点移动
    const firstButton = screen.getByText('新建文件夹');
    expect(firstButton).toHaveFocus();
  });
});
```

**关键点**:
- 使用 `userEvent.type` 模拟键盘输入
- 使用特殊键语法：`{Enter}`, `{Escape}`, `{Tab}`
- 测试键盘快捷键
- 测试键盘导航

---

## 测试工具函数

使用自定义渲染函数简化测试。

### 示例 7: 使用 renderWithProviders

```typescript
import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '@/test/utils/testUtils';
import MediaLibrary from '@/components/MediaLibrary';

describe('MediaLibrary - 使用工具函数', () => {
  it('should render with providers', () => {
    // 使用自定义渲染函数
    renderWithProviders(<MediaLibrary />);

    expect(screen.getByText('素材库')).toBeInTheDocument();
  });

  it('should render with initial props', () => {
    const mockItems = [
      { id: '1', name: 'test.mp4', type: 'video' },
    ];

    renderWithProviders(<MediaLibrary items={mockItems} />);

    expect(screen.getByText('test.mp4')).toBeInTheDocument();
  });
});
```

**关键点**:
- 创建自定义渲染函数封装 Provider
- 简化重复的测试设置
- 保持测试代码简洁

---

## 最佳实践总结

### ✅ 好的做法

```typescript
// 1. 测试用户行为，不是实现细节
it('should display error message when input is empty', () => {
  // 测试用户看到的结果
});

// 2. 使用 userEvent 而不是 fireEvent
const user = userEvent.setup();
await user.click(button);
await user.type(input, 'text');

// 3. 使用语义化查询
screen.getByRole('button', { name: '确定' });
screen.getByLabelText('用户名');
screen.getByText('提交');

// 4. 等待异步操作
await waitFor(() => {
  expect(screen.getByText('Success')).toBeInTheDocument();
});

// 5. 清理 Mock
afterEach(() => {
  vi.clearAllMocks();
});
```

### ❌ 避免的做法

```typescript
// 1. 测试实现细节
it('should set state to true', () => {
  // 不要测试内部状态
});

// 2. 使用 querySelector
const button = container.querySelector('.button');

// 3. 不等待异步操作
fireEvent.click(button);
expect(screen.getByText('Success')).toBeInTheDocument(); // 可能失败

// 4. 过度使用 Mock
vi.mock('@/components/MediaLibrary'); // 不要 Mock 被测试的组件

// 5. 测试多个行为
it('should do everything', () => {
  // 测试太多东西
});
```

---

## 查询优先级

按优先级使用查询方法：

1. **getByRole**: 最推荐，符合可访问性
   ```typescript
   screen.getByRole('button', { name: '确定' });
   ```

2. **getByLabelText**: 适合表单元素
   ```typescript
   screen.getByLabelText('用户名');
   ```

3. **getByPlaceholderText**: 适合输入框
   ```typescript
   screen.getByPlaceholderText('请输入');
   ```

4. **getByText**: 适合文本内容
   ```typescript
   screen.getByText('提交');
   ```

5. **getByDisplayValue**: 适合输入框当前值
   ```typescript
   screen.getByDisplayValue('Current Value');
   ```

6. **getByTestId**: 最后的选择
   ```typescript
   screen.getByTestId('custom-element');
   ```

---

## 运行测试

```bash
# 运行所有组件测试
pnpm test components

# 运行特定组件测试
pnpm test ContextMenu.test.tsx

# 监听模式
pnpm test:watch

# 查看测试 UI
pnpm test:ui
```

---

## 相关文档

- [单元测试示例](./UNIT_TEST_EXAMPLE.md)
- [Mock 使用示例](./MOCK_USAGE_EXAMPLE.md)
- [测试指南](./README.md)
- [最佳实践](./BEST_PRACTICES.md)
