# Vitest 集成 - 实施计划

## 概述

本实施计划将 Vitest 测试框架集成到视频编辑器项目中，建立完整的测试体系，包括工具函数测试、数据操作测试和组件测试。

## 任务列表

- [ ] 1. 设置 Vitest 测试环境
  - 安装 Vitest 及相关依赖包
  - 创建 vitest.config.ts 配置文件，设置 jsdom 环境、路径别名和覆盖率工具
  - 创建 vitest.setup.ts 设置文件，扩展 expect 断言并 Mock Tauri API
  - 在 package.json 中添加测试脚本（test、test:ui、test:watch、test:coverage）
  - _需求: 2.1_

- [ ] 2. 实现工具函数测试
  - [ ] 2.1 创建 src/hooks/useMediaFile.test.ts
    - 编写 getFileType 函数的测试用例（视频、音频、图片、未知类型、大写扩展名、无扩展名）
    - 编写 getFileName 函数的测试用例（提取文件名、不同路径格式、边界情况）
    - _需求: 2.2_

- [ ] 3. 实现数据操作函数测试
  - [ ] 3.1 创建数据操作测试文件
    - 如果数据操作函数在组件中，考虑提取到独立文件以便测试
    - 创建测试文件测试 addItemsToFolder、removeItemFromFolder 和 findFolder 函数
    - _需求: 2.3_
  
  - [ ]* 3.2 测试 addItemsToFolder 函数
    - 测试添加项目到根目录
    - 测试添加项目到子文件夹
    - 测试添加项目到嵌套文件夹
    - 测试添加多个项目
    - _需求: 2.3_
  
  - [ ]* 3.3 测试 removeItemFromFolder 函数
    - 测试删除根目录项
    - 测试删除子文件夹项
    - 测试递归删除
    - 测试删除不存在的项
    - _需求: 2.3_
  
  - [ ]* 3.4 测试 findFolder 函数
    - 测试查找根目录文件夹
    - 测试查找嵌套文件夹
    - 测试查找不存在的文件夹
    - _需求: 2.3_

- [ ] 4. 实现 ContextMenu 组件测试
  - [ ] 4.1 创建 src/components/ContextMenu.test.tsx
    - 测试空白区域菜单渲染（新建文件夹、添加素材）
    - 测试文件夹菜单渲染（重命名、删除）
    - 测试菜单项点击事件触发 onAction 回调
    - 测试菜单位置定位（x、y 坐标）
    - _需求: 2.4_

- [ ] 5. 实现 RenameDialog 组件测试
  - [ ] 5.1 创建 src/components/RenameDialog.test.tsx
    - 测试对话框渲染并显示旧名称
    - 测试输入框自动聚焦和选中
    - 测试确定按钮调用 onConfirm 并传递新名称
    - 测试取消按钮调用 onCancel
    - 测试 Enter 键确认和 Esc 键取消
    - 测试空名称和纯空格名称验证
    - _需求: 2.4_

- [ ] 6. 实现 MediaLibrary 组件测试
  - [ ] 6.1 创建 src/components/MediaLibrary.test.tsx
    - 测试空状态显示和导入提示
    - 测试标签页切换功能
    - 测试素材列表渲染和文件夹显示
    - 测试面包屑导航、进入文件夹和返回上级
    - 测试右键菜单触发和删除功能
    - _需求: 2.4_

- [ ] 7. 配置测试工具和 Mock
  - [ ] 7.1 创建测试辅助工具
    - 创建 renderWithProviders 辅助函数用于渲染组件
    - 创建测试数据生成器和 Mock 数据
    - _需求: 2.1_
  
  - [ ] 7.2 配置 Tauri API Mock
    - 在 vitest.setup.ts 中 Mock @tauri-apps/plugin-dialog
    - Mock @tauri-apps/api/core 的 convertFileSrc 和 invoke 函数
    - _需求: 2.1_

- [ ] 8. 配置覆盖率报告和阈值
  - 在 vitest.config.ts 中配置覆盖率报告（HTML、JSON、文本）
  - 设置覆盖率阈值（语句 >= 80%、分支 >= 75%、函数 >= 80%、行 >= 80%）
  - 配置排除文件（node_modules、src-tauri、配置文件、类型定义）
  - _需求: 2.5_

- [ ] 9. 验证测试套件
  - 运行 `pnpm test` 确保所有测试通过
  - 运行 `pnpm test:coverage` 检查覆盖率是否达到阈值
  - 检查测试执行时间是否在可接受范围内（完整测试套件 < 30 秒）
  - _需求: 2.5, 2.6_

- [ ] 10. 最终检查点
  - 确保所有测试通过，如有问题请向用户提问

## 注意事项

- 使用 @testing-library/react 和 @testing-library/user-event 进行组件测试
- 遵循 AAA 模式（Arrange, Act, Assert）编写清晰的测试
- 确保测试之间相互独立，避免状态污染
- 对于 Tauri API 调用，使用 Mock 避免依赖实际环境
- 测试命名应清晰描述测试意图
