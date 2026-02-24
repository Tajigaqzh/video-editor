import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  test: {
    // 1.2.2: 配置测试环境为 jsdom
    environment: 'jsdom',
    
    // 全局设置文件
    setupFiles: ['./vitest.setup.ts'],
    
    // 10.2.2: 并行测试执行配置
    // 使用多线程池来并行运行不同的测试文件（Vitest 4 语法）
    pool: 'threads',
    // 测试文件内的测试保持串行执行以避免 DOM 污染
    sequence: {
      concurrent: false,
    },
    
    // 1.2.4 & 1.2.5: 配置覆盖率工具和阈值
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      // 1.2.6: 配置排除文件
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
      // 1.2.5: 配置覆盖率阈值
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
      },
    },
    
    // 全局 API
    globals: true,
    
    // 包含的测试文件 - 只在 test 目录中查找
    include: ['test/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    
    // 1.2.6: 排除的文件
    exclude: ['node_modules', 'dist', 'src-tauri'],
  },
  
  // 1.2.3: 配置路径别名 @
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
