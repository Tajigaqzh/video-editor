import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// 1.3.2: 扩展 expect 断言
expect.extend(matchers);

// 1.3.3: 配置测试清理
afterEach(() => {
  cleanup();
});

// 1.3.4: Mock Tauri API
vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: vi.fn(),
}));

vi.mock('@tauri-apps/api/core', () => ({
  convertFileSrc: vi.fn((path: string) => `asset://localhost/${path}`),
  invoke: vi.fn(),
}));

