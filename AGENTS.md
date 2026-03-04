# 仓库指南

## 项目结构与模块组织
- `src/`：前端 React + TypeScript 代码（components、hooks、pages、router、store、utils、assets）。
- `src-tauri/`：Tauri/Rust 后端，包含命令处理与 FFmpeg 集成。
- `test/`：Vitest 测试，命名建议 `**/*.test.*` 或 `**/*.spec.*`。
- `public/`：Vite 静态资源目录。
- `docs/`：文档目录（重点参考 `docs/hpve-format/`）。
- `coverage/`：测试覆盖率产物（生成目录）。

## 构建、测试与开发命令
统一使用 `pnpm`：
- `pnpm dev`：启动 Vite 前端开发服务。
- `pnpm start`：启动 Tauri 开发模式（`tauri dev`）。
- `pnpm build`：执行类型检查并构建前端（`tsc && vite build`）。
- `pnpm preview`：预览前端生产构建。
- `pnpm tauri:build`：先打包 FFmpeg，再构建 Tauri 应用。
- `pnpm test` / `pnpm test:watch` / `pnpm test:ui` / `pnpm test:coverage`：执行测试与覆盖率。

## 代码风格与命名约定
- 技术栈：TypeScript + React（TSX），优先遵循现有实现风格。
- 格式约定：2 空格缩进、分号、双引号。
- 组件文件：`PascalCase.tsx`（位于 `src/components/` 或 `src/pages/`）。
- Hook 文件：`useSomething.ts`（位于 `src/hooks/`）。
- 常量命名：`SCREAMING_SNAKE_CASE`。
- 导入路径优先使用 `@/` 别名。

## 测试规范
- 框架：Vitest + Testing Library（`jsdom` 环境）。
- 测试文件放在 `test/`，并遵循 `*.test.*` / `*.spec.*`。
- 覆盖率目标（见 `vitest.config.ts`）：statements 80%、branches 75%、functions 80%、lines 80%。

## 提交与 PR 规范
- Commit 信息保持简洁、聚焦单一主题；当前仓库以中文风格为主。
- PR 需包含：变更摘要、关键文件说明；涉及 UI 改动需附截图。
- 相关需求或设计请关联到 `TRACK.md`、`VIDEO_STREAMING_IMPLEMENTATION.md` 等文档。

## 配置与安全
- 本地配置从 `.env.example` 开始。
- 禁止提交密钥、口令或其他敏感信息。

## Agent 工作流
- 开始任务前先读取 `.codex/tasks.md`，对齐当前优先级。
- 读取仓库文件时，始终优先使用 UTF-8 编码。
- 新需求写入 `.codex/tasks.md`。
- 已完成项使用清晰完成标记（如 `- [√]`）。
