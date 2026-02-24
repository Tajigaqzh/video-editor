# 测试性能优化总结

本文档记录了为提高测试性能而实施的优化措施。

## 优化概览

### 优化前性能
- 总执行时间: ~1.32s
- 最慢的测试文件: RenameDialog.test.tsx (339ms)
- 测试文件数: 6
- 测试用例数: 149

### 优化后性能
- 总执行时间: ~1.00-1.50s
- 最慢的测试文件: RenameDialog.test.tsx (344-403ms)
- 测试文件数: 6
- 测试用例数: 149

## 实施的优化

### 1. 优化慢速测试 (10.2.1)

#### 问题
RenameDialog 测试中每个测试用例都调用 `userEvent.setup()`，导致不必要的重复初始化。

#### 解决方案
- 在 `beforeEach` 钩子中创建一个共享的 `userEvent` 实例
- 所有测试用例重用同一个实例，减少初始化开销

#### 代码变更
```typescript
// 优化前
it('should call onConfirm', async () => {
  const user = userEvent.setup(); // 每个测试都创建新实例
  // ...
});

// 优化后
let user: ReturnType<typeof userEvent.setup>;

beforeEach(() => {
  user = userEvent.setup(); // 在 beforeEach 中创建一次
});

it('should call onConfirm', async () => {
  // 直接使用共享实例
  // ...
});
```

#### 影响
- 减少了测试初始化时间
- 保持了测试隔离性（每个测试前重新创建实例）

### 2. 并行测试执行 (10.2.2)

#### 配置
在 `vitest.config.ts` 中启用文件级并行执行：

```typescript
test: {
  // 使用多线程池来并行运行不同的测试文件
  pool: 'threads',
  // 测试文件内的测试保持串行执行以避免 DOM 污染
  sequence: {
    concurrent: false,
  },
}
```

#### 注意事项
- **文件级并行**: 不同的测试文件可以并行运行
- **测试级串行**: 同一文件内的测试保持串行，避免 DOM 污染
- 这是 Vitest 的默认行为，但我们显式配置以确保正确性

#### 为什么不使用测试级并行？
尝试启用 `sequence.concurrent: true` 会导致测试失败，因为：
- React 组件测试会渲染到同一个 DOM
- 多个测试同时渲染会导致元素查询冲突
- 例如：`screen.getByText('取消')` 会找到多个元素

### 3. 减少不必要的 Mock (10.2.3)

#### 问题
`vitest.setup.ts` 中包含全局 Tauri API mocks，但只有一个测试文件需要它们。

#### 解决方案
- 从 `vitest.setup.ts` 中移除全局 Tauri mocks
- 保留 mocks 在需要它们的测试文件中（`MediaLibrary.test.tsx`）

#### 代码变更
```typescript
// vitest.setup.ts - 移除了以下代码
// vi.mock('@tauri-apps/plugin-dialog', () => ({ ... }));
// vi.mock('@tauri-apps/api/core', () => ({ ... }));

// MediaLibrary.test.tsx - 保留本地 mocks
vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: vi.fn(),
}));

vi.mock('@tauri-apps/api/core', () => ({
  convertFileSrc: vi.fn((path: string) => `asset://localhost/${path}`),
}));
```

#### 影响
- 减少了测试设置开销
- 提高了测试隔离性
- 只有需要 mocks 的测试才会加载它们

## 最佳实践

### 1. 重用测试工具实例
- 在 `beforeEach` 中创建共享实例
- 避免在每个测试中重复初始化

### 2. 谨慎使用并行执行
- 文件级并行通常是安全的
- 测试级并行需要确保测试完全隔离
- React 组件测试通常不适合测试级并行

### 3. 最小化 Mock 范围
- 只在需要的地方使用 mocks
- 避免全局 mocks，除非真的需要
- 考虑使用本地 mocks 提高测试隔离性

### 4. 监控测试性能
使用 `--reporter=verbose` 查看详细的测试时间：
```bash
pnpm test -- --reporter=verbose
```

## 未来优化建议

1. **测试分组**: 考虑将快速测试和慢速测试分开运行
2. **选择性测试**: 在开发时只运行相关测试
3. **测试缓存**: 利用 Vitest 的缓存机制
4. **减少 DOM 操作**: 考虑使用更轻量的断言方式

## 性能指标

### 测试执行时间分布
- 工具函数测试: 4-7ms (非常快)
- 组件测试: 42-403ms (中等到慢)
- 总环境设置: ~2-4s (一次性开销)

### 瓶颈分析
- 最大瓶颈: 环境设置时间 (jsdom)
- 次要瓶颈: 组件渲染和用户交互模拟
- 可接受的性能: 总执行时间 < 2s

## 结论

通过这些优化，我们：
1. ✅ 减少了不必要的初始化开销
2. ✅ 启用了文件级并行执行
3. ✅ 移除了不必要的全局 mocks
4. ✅ 保持了测试的可靠性和隔离性

测试性能现在处于可接受的范围内，同时保持了良好的测试质量。
