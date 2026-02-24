# 测试最佳实践

## 目录

1. [测试原则](#测试原则)
2. [测试结构](#测试结构)
3. [断言技巧](#断言技巧)
4. [Mock 策略](#mock-策略)
5. [性能优化](#性能优化)
6. [可维护性](#可维护性)
7. [常见陷阱](#常见陷阱)

## 测试原则

### 1. 测试行为，而非实现

测试应该关注组件或函数的行为，而不是内部实现细节。

```typescript
// ✅ 好的做法 - 测试用户可见的行为
it('should display error when email is invalid', () => {
  render(<LoginForm />);
  const emailInput = screen.getByLabelText('Email');
  
  fireEvent.change(emailInput, { target: { value: 'invalid' } });
  fireEvent.blur(emailInput);
  
  expect(screen.getByText('Please enter a valid email')).toBeInTheDocument();
});

// ❌ 不好的做法 - 测试内部状态
it('should set emailError state to true', () => {
  const { result } = renderHook(() => useLoginForm());
  result.current.setEmail('invalid');
  expect(result.current.emailError).toBe(true);
});
```

### 2. 保持测试独立

每个测试应该能够独立运行，不依赖其他测试的结果。

```typescript
// ✅ 好的做法 - 每个测试独立设置
describe('TodoList', () => {
  it('should add todo', () => {
    const todos = [];
    const result = addTodo(todos, 'New task');
    expect(result).toHaveLength(1);
  });

  it('should remove todo', () => {
    const todos = [{ id: 1, text: 'Task' }];
    const result = removeTodo(todos, 1);
    expect(result).toHaveLength(0);
  });
});

// ❌ 不好的做法 - 测试之间有依赖
describe('TodoList', () => {
  let todos = [];

  it('should add todo', () => {
    todos = addTodo(todos, 'New task');
    expect(todos).toHaveLength(1);
  });

  it('should remove todo', () => {
    // 依赖上一个测试的结果
    todos = removeTodo(todos, todos[0].id);
    expect(todos).toHaveLength(0);
  });
});
```

### 3. 一个测试一个断言概念

每个测试应该验证一个明确的概念，但可以有多个相关的断言。

```typescript
// ✅ 好的做法 - 测试一个概念（用户登录）
it('should successfully log in with valid credentials', () => {
  render(<LoginForm />);
  
  fireEvent.change(screen.getByLabelText('Email'), {
    target: { value: 'user@example.com' }
  });
  fireEvent.change(screen.getByLabelText('Password'), {
    target: { value: 'password123' }
  });
  fireEvent.click(screen.getByText('Login'));
  
  // 多个断言验证同一个概念
  expect(screen.getByText('Welcome')).toBeInTheDocument();
  expect(localStorage.getItem('token')).toBeTruthy();
});

// ❌ 不好的做法 - 测试多个不相关的概念
it('should handle login and logout and password reset', () => {
  // 测试太多不相关的功能
});
```

### 4. 使用描述性的测试名称

测试名称应该清楚地说明测试的内容和预期结果。

```typescript
// ✅ 好的做法
describe('MediaLibrary', () => {
  it('should display empty state when no media files exist', () => {});
  it('should navigate into folder when double-clicked', () => {});
  it('should show context menu on right-click', () => {});
});

// ❌ 不好的做法
describe('MediaLibrary', () => {
  it('test1', () => {});
  it('works correctly', () => {});
  it('handles click', () => {});
});
```

## 测试结构

### AAA 模式

使用 Arrange-Act-Assert 模式组织测试代码。

```typescript
it('should calculate total price with discount', () => {
  // Arrange - 准备测试数据和环境
  const items = [
    { price: 100, quantity: 2 },
    { price: 50, quantity: 1 },
  ];
  const discount = 0.1;
  
  // Act - 执行被测试的操作
  const total = calculateTotal(items, discount);
  
  // Assert - 验证结果
  expect(total).toBe(225); // (200 + 50) * 0.9
});
```

### 使用 beforeEach 和 afterEach

合理使用生命周期钩子来设置和清理测试环境。

```typescript
describe('UserService', () => {
  let userService: UserService;
  let mockApi: MockApi;

  beforeEach(() => {
    // 每个测试前的设置
    mockApi = new MockApi();
    userService = new UserService(mockApi);
  });

  afterEach(() => {
    // 每个测试后的清理
    vi.clearAllMocks();
  });

  it('should fetch user data', async () => {
    mockApi.getUser.mockResolvedValue({ id: 1, name: 'John' });
    const user = await userService.getUser(1);
    expect(user.name).toBe('John');
  });
});
```

### 嵌套 describe 块

使用嵌套的 describe 块组织相关的测试。

```typescript
describe('Calculator', () => {
  describe('add', () => {
    it('should add positive numbers', () => {
      expect(add(2, 3)).toBe(5);
    });

    it('should add negative numbers', () => {
      expect(add(-2, -3)).toBe(-5);
    });

    it('should handle zero', () => {
      expect(add(0, 5)).toBe(5);
    });
  });

  describe('subtract', () => {
    it('should subtract numbers', () => {
      expect(subtract(5, 3)).toBe(2);
    });
  });
});
```

## 断言技巧

### 选择合适的断言

使用最具体和最有意义的断言。

```typescript
// ✅ 好的做法 - 使用具体的断言
expect(element).toBeInTheDocument();
expect(element).toHaveTextContent('Hello');
expect(array).toHaveLength(3);

// ❌ 不好的做法 - 使用通用的断言
expect(element).toBeTruthy();
expect(element.textContent).toBe('Hello');
expect(array.length).toBe(3);
```

### 断言错误消息

为断言添加自定义错误消息，帮助调试。

```typescript
// 添加描述性消息
expect(result, 'User should be authenticated').toBeTruthy();
expect(items).toHaveLength(5, 'Should have 5 items after adding');
```

### 使用 toMatchObject 进行部分匹配

当只需要验证对象的部分属性时，使用 toMatchObject。

```typescript
// ✅ 好的做法 - 只验证关心的属性
expect(user).toMatchObject({
  name: 'John',
  email: 'john@example.com',
});

// ❌ 不好的做法 - 验证所有属性（脆弱）
expect(user).toEqual({
  id: expect.any(String),
  name: 'John',
  email: 'john@example.com',
  createdAt: expect.any(Date),
  updatedAt: expect.any(Date),
  // ... 更多属性
});
```

## Mock 策略

### 最小化 Mock

只 mock 必要的部分，保持测试真实性。

```typescript
// ✅ 好的做法 - 只 mock 外部依赖
vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: vi.fn(),
}));

// ❌ 不好的做法 - mock 所有东西
vi.mock('./utils');
vi.mock('./components');
vi.mock('./hooks');
```

### Mock 返回值而非实现

优先使用 mockReturnValue 而不是 mockImplementation。

```typescript
// ✅ 好的做法
const mockFn = vi.fn().mockReturnValue(42);

// ❌ 不好的做法（除非需要复杂逻辑）
const mockFn = vi.fn().mockImplementation(() => 42);
```

### 清理 Mock

在每个测试后清理 mock 状态。

```typescript
describe('MyComponent', () => {
  const mockFn = vi.fn();

  afterEach(() => {
    vi.clearAllMocks(); // 清除调用记录
  });

  it('should call function once', () => {
    mockFn();
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('should call function twice', () => {
    mockFn();
    mockFn();
    expect(mockFn).toHaveBeenCalledTimes(2); // 不会受上一个测试影响
  });
});
```

### 使用 vi.mocked 获得类型安全

```typescript
import { open } from '@tauri-apps/plugin-dialog';

vi.mock('@tauri-apps/plugin-dialog');

it('should open file dialog', async () => {
  // ✅ 类型安全的 mock
  vi.mocked(open).mockResolvedValue(['/path/to/file']);
  
  const result = await openFileDialog();
  expect(result).toBe('/path/to/file');
});
```

## 性能优化

### 避免不必要的渲染

使用 screen 查询而不是解构 render 返回值。

```typescript
// ✅ 好的做法
it('should render button', () => {
  render(<Button>Click</Button>);
  expect(screen.getByText('Click')).toBeInTheDocument();
});

// ❌ 不好的做法（会导致重新查询）
it('should render button', () => {
  const { getByText } = render(<Button>Click</Button>);
  expect(getByText('Click')).toBeInTheDocument();
});
```

### 使用 userEvent 而非 fireEvent

userEvent 更接近真实用户行为，但也更慢。根据需要选择。

```typescript
// 简单交互 - 使用 fireEvent（更快）
fireEvent.click(button);

// 复杂交互 - 使用 userEvent（更真实）
const user = userEvent.setup();
await user.type(input, 'Hello World');
```

### 并行运行测试

Vitest 默认并行运行测试，但可以配置。

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    // 控制并发数
    maxConcurrency: 5,
    
    // 某些测试需要串行运行
    sequence: {
      concurrent: true,
    },
  },
});

// 在测试中标记串行
describe.sequential('Database tests', () => {
  it('test 1', () => {});
  it('test 2', () => {});
});
```

## 可维护性

### 提取测试工具函数

将重复的测试逻辑提取到工具函数中。

```typescript
// test/utils/testUtils.tsx
export function renderWithStore(ui: React.ReactElement, initialState = {}) {
  return render(
    <StoreProvider initialState={initialState}>
      {ui}
    </StoreProvider>
  );
}

export function createMockMediaFile(overrides = {}) {
  return {
    id: Math.random().toString(),
    name: 'test.mp4',
    type: 'video',
    ...overrides,
  };
}

// 在测试中使用
it('should display media file', () => {
  const file = createMockMediaFile({ name: 'custom.mp4' });
  renderWithStore(<MediaItem file={file} />);
  expect(screen.getByText('custom.mp4')).toBeInTheDocument();
});
```

### 使用测试数据构建器

创建灵活的测试数据构建器。

```typescript
// test/utils/builders.ts
class MediaFileBuilder {
  private file = {
    id: '1',
    name: 'test.mp4',
    path: '/test.mp4',
    url: 'asset://test.mp4',
    type: 'video' as const,
  };

  withName(name: string) {
    this.file.name = name;
    return this;
  }

  withType(type: 'video' | 'audio' | 'image') {
    this.file.type = type;
    return this;
  }

  build() {
    return { ...this.file };
  }
}

// 使用
const videoFile = new MediaFileBuilder()
  .withName('movie.mp4')
  .withType('video')
  .build();
```

### 避免魔法数字和字符串

使用常量或工厂函数。

```typescript
// ✅ 好的做法
const VALID_EMAIL = 'user@example.com';
const INVALID_EMAIL = 'invalid';

it('should accept valid email', () => {
  expect(validateEmail(VALID_EMAIL)).toBe(true);
});

// ❌ 不好的做法
it('should accept valid email', () => {
  expect(validateEmail('user@example.com')).toBe(true);
});
```

## 常见陷阱

### 1. 测试实现而非接口

```typescript
// ❌ 脆弱 - 依赖实现细节
it('should call setState', () => {
  const component = shallow(<MyComponent />);
  component.instance().handleClick();
  expect(component.state('count')).toBe(1);
});

// ✅ 健壮 - 测试用户可见的行为
it('should increment counter when clicked', () => {
  render(<MyComponent />);
  fireEvent.click(screen.getByText('Increment'));
  expect(screen.getByText('Count: 1')).toBeInTheDocument();
});
```

### 2. 过度使用快照测试

```typescript
// ❌ 不好 - 快照太大，难以维护
it('should render correctly', () => {
  const { container } = render(<LargeComponent />);
  expect(container).toMatchSnapshot();
});

// ✅ 好 - 测试具体的行为
it('should display user name', () => {
  render(<UserProfile name="John" />);
  expect(screen.getByText('John')).toBeInTheDocument();
});
```

### 3. 忽略异步操作

```typescript
// ❌ 错误 - 没有等待异步操作
it('should load data', () => {
  render(<AsyncComponent />);
  expect(screen.getByText('Data loaded')).toBeInTheDocument(); // 会失败
});

// ✅ 正确 - 等待异步操作完成
it('should load data', async () => {
  render(<AsyncComponent />);
  expect(await screen.findByText('Data loaded')).toBeInTheDocument();
});
```

### 4. 测试第三方库

```typescript
// ❌ 不必要 - 测试第三方库的功能
it('should format date correctly', () => {
  const formatted = dayjs('2024-01-01').format('YYYY-MM-DD');
  expect(formatted).toBe('2024-01-01');
});

// ✅ 必要 - 测试你的代码如何使用第三方库
it('should display formatted date', () => {
  render(<DateDisplay date="2024-01-01" />);
  expect(screen.getByText('2024-01-01')).toBeInTheDocument();
});
```

### 5. 共享测试状态

```typescript
// ❌ 危险 - 共享可变状态
describe('Counter', () => {
  const state = { count: 0 };

  it('should increment', () => {
    state.count++;
    expect(state.count).toBe(1);
  });

  it('should decrement', () => {
    state.count--; // 依赖上一个测试
    expect(state.count).toBe(0);
  });
});

// ✅ 安全 - 每个测试独立
describe('Counter', () => {
  it('should increment', () => {
    const state = { count: 0 };
    state.count++;
    expect(state.count).toBe(1);
  });

  it('should decrement', () => {
    const state = { count: 1 };
    state.count--;
    expect(state.count).toBe(0);
  });
});
```

## 测试覆盖率指南

### 目标覆盖率

- 语句覆盖率: >= 80%
- 分支覆盖率: >= 75%
- 函数覆盖率: >= 80%
- 行覆盖率: >= 80%

### 不要追求 100%

```typescript
// 某些代码不需要测试
export function logError(error: Error) {
  if (process.env.NODE_ENV === 'development') {
    console.error(error); // 不需要测试 console.error
  }
}

// 配置排除
// vitest.config.ts
coverage: {
  exclude: [
    '**/*.d.ts',
    '**/*.config.*',
    '**/mockData.ts',
  ],
}
```

### 关注关键路径

优先测试：
- 核心业务逻辑
- 复杂的算法
- 错误处理
- 边界条件

可以跳过：
- 简单的 getter/setter
- 纯展示组件
- 配置文件
- 类型定义

## 总结

好的测试应该：
- ✅ 快速执行
- ✅ 独立运行
- ✅ 易于理解
- ✅ 测试行为而非实现
- ✅ 提供清晰的错误信息
- ✅ 易于维护

避免：
- ❌ 测试实现细节
- ❌ 测试之间有依赖
- ❌ 过度使用 mock
- ❌ 忽略异步操作
- ❌ 追求 100% 覆盖率

## 参考资源

- [Vitest 官方文档](https://vitest.dev/)
- [Testing Library 文档](https://testing-library.com/)
- [测试指南](./TESTING_GUIDE.md)
- [故障排查指南](./TROUBLESHOOTING.md)
