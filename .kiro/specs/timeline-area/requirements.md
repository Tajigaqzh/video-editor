# 需求文档 - 时间轴区域

## 简介

时间轴区域是视频编辑器的核心功能模块，用于显示和编辑视频项目的时间序列。用户可以在时间轴上添加、移动、裁剪和删除视频、音频和图片素材，实现非线性编辑功能。时间轴提供多轨道支持，允许素材在不同轨道上叠加和排列，并提供精确的时间控制和视觉反馈。

## 术语表

- **Timeline（时间轴）**: 显示项目时间序列的可视化区域，包含多个轨道和时间标尺
- **Track（轨道）**: 时间轴中的水平条带，用于放置和组织素材，分为视频轨道和音频轨道
- **Clip（片段）**: 放置在轨道上的媒体素材实例，包含开始时间、持续时间和素材引用
- **Playhead（播放头）**: 指示当前播放或预览位置的垂直线标记
- **Timescale（时间刻度）**: 时间轴顶部显示时间单位的标尺，支持缩放
- **Trimming（裁剪）**: 调整片段的入点和出点，改变其在时间轴上的持续时间
- **Snapping（吸附）**: 拖动片段时自动对齐到其他片段边缘或时间标记的功能
- **Zoom_Level（缩放级别）**: 时间轴的时间密度，控制单位像素代表的时间长度
- **Media_Library（媒体库）**: 存储项目素材的区域，素材可从此拖放到时间轴

## 需求

### 需求 1: 时间轴基础结构

**用户故事**: 作为视频编辑用户，我希望看到清晰的时间轴结构，以便理解项目的时间组织方式。

#### 验收标准

1. THE Timeline SHALL 显示时间标尺，标注时间刻度（秒、分钟）
2. THE Timeline SHALL 包含至少 3 条视频轨道和 3 条音频轨道
3. WHEN 时间轴初始化时，THEN THE Timeline SHALL 显示 0 到 60 秒的时间范围
4. THE Timeline SHALL 在顶部显示时间标尺，在下方显示轨道列表
5. WHEN 轨道为空时，THEN THE Track SHALL 显示提示文本"拖入素材"

### 需求 2: 素材拖放到时间轴

**用户故事**: 作为视频编辑用户，我希望能够从媒体库拖放素材到时间轴，以便开始编辑视频。

#### 验收标准

1. WHEN 用户从 Media_Library 拖动素材到 Track 时，THEN THE Timeline SHALL 在目标位置创建新的 Clip
2. WHEN 拖动视频素材时，THEN THE Timeline SHALL 只允许放置到视频轨道
3. WHEN 拖动音频素材时，THEN THE Timeline SHALL 只允许放置到音频轨道
4. WHEN 拖动图片素材时，THEN THE Timeline SHALL 允许放置到视频轨道，并设置默认持续时间为 5 秒
5. WHEN 放置 Clip 时，THEN THE Clip SHALL 显示素材缩略图和名称
6. WHEN 拖动过程中，THEN THE Timeline SHALL 显示放置位置的视觉预览

### 需求 3: 片段移动和重新排列

**用户故事**: 作为视频编辑用户，我希望能够移动时间轴上的片段，以便调整视频的播放顺序。

#### 验收标准

1. WHEN 用户拖动 Clip 时，THEN THE Clip SHALL 跟随鼠标移动
2. WHEN 拖动 Clip 到新位置时，THEN THE Timeline SHALL 更新 Clip 的开始时间
3. WHEN 拖动 Clip 到不同轨道时，THEN THE Timeline SHALL 将 Clip 移动到目标轨道
4. WHEN Snapping 功能启用时，THEN THE Clip SHALL 自动吸附到相邻片段的边缘（误差 ±5 像素）
5. WHEN 拖动过程中，THEN THE Timeline SHALL 显示当前时间位置的数值提示
6. WHEN 释放 Clip 时，THEN THE Timeline SHALL 验证位置有效性，防止片段重叠

### 需求 4: 片段裁剪

**用户故事**: 作为视频编辑用户，我希望能够裁剪片段的开始和结束位置，以便精确控制播放内容。

#### 验收标准

1. WHEN 鼠标悬停在 Clip 边缘（左右 8 像素范围内）时，THEN THE Timeline SHALL 显示裁剪光标
2. WHEN 用户拖动 Clip 左边缘时，THEN THE Clip SHALL 调整入点，改变开始时间和持续时间
3. WHEN 用户拖动 Clip 右边缘时，THEN THE Clip SHALL 调整出点，改变持续时间
4. WHEN 裁剪时，THEN THE Clip SHALL 不能超出素材的原始持续时间范围
5. WHEN 裁剪时，THEN THE Clip SHALL 最小持续时间为 0.1 秒
6. WHEN 裁剪过程中，THEN THE Timeline SHALL 实时更新 Clip 的视觉宽度

### 需求 5: 播放头控制

**用户故事**: 作为视频编辑用户，我希望能够控制播放头位置，以便预览特定时间点的内容。

#### 验收标准

1. THE Playhead SHALL 显示为贯穿所有轨道的红色垂直线
2. WHEN 用户点击时间标尺时，THEN THE Playhead SHALL 移动到点击位置对应的时间
3. WHEN 用户拖动 Playhead 时，THEN THE Playhead SHALL 跟随鼠标水平移动
4. WHEN Playhead 移动时，THEN THE Timeline SHALL 更新当前时间显示（格式: MM:SS.mmm）
5. WHEN Playhead 超出可见范围时，THEN THE Timeline SHALL 自动滚动以保持 Playhead 可见
6. WHEN 播放视频时，THEN THE Playhead SHALL 以恒定速度从左向右移动

### 需求 6: 时间轴缩放

**用户故事**: 作为视频编辑用户，我希望能够缩放时间轴，以便在不同精度下查看和编辑内容。

#### 验收标准

1. WHEN 用户滚动鼠标滚轮时，THEN THE Timeline SHALL 调整 Zoom_Level
2. WHEN 放大时，THEN THE Timescale SHALL 显示更密集的时间刻度（最小到 0.1 秒）
3. WHEN 缩小时，THEN THE Timescale SHALL 显示更稀疏的时间刻度（最大到 10 秒）
4. WHEN 缩放时，THEN THE Timeline SHALL 保持 Playhead 位置在视口中心
5. THE Timeline SHALL 支持缩放级别范围从 10 像素/秒 到 200 像素/秒
6. WHEN 缩放时，THEN THE Clip SHALL 按比例调整视觉宽度

### 需求 7: 片段选择和删除

**用户故事**: 作为视频编辑用户，我希望能够选择和删除片段，以便移除不需要的内容。

#### 验收标准

1. WHEN 用户点击 Clip 时，THEN THE Clip SHALL 显示选中状态（高亮边框）
2. WHEN 用户按下 Delete 或 Backspace 键时，THEN THE Timeline SHALL 删除所有选中的 Clip
3. WHEN 用户按住 Ctrl/Cmd 点击多个 Clip 时，THEN THE Timeline SHALL 支持多选
4. WHEN 用户点击空白区域时，THEN THE Timeline SHALL 取消所有选择
5. WHEN 删除 Clip 后，THEN THE Timeline SHALL 更新轨道显示，移除已删除的片段
6. WHEN 选中 Clip 时，THEN THE Timeline SHALL 在属性面板显示片段信息

### 需求 8: 时间轴滚动

**用户故事**: 作为视频编辑用户，我希望能够滚动时间轴，以便查看超出可见范围的内容。

#### 验收标准

1. WHEN 项目总时长超过可见范围时，THEN THE Timeline SHALL 显示水平滚动条
2. WHEN 轨道数量超过可见高度时，THEN THE Timeline SHALL 显示垂直滚动条
3. WHEN 用户拖动滚动条时，THEN THE Timeline SHALL 平滑滚动内容
4. WHEN 用户使用鼠标滚轮（不按修饰键）时，THEN THE Timeline SHALL 垂直滚动
5. WHEN 用户按住 Shift 并滚动滚轮时，THEN THE Timeline SHALL 水平滚动
6. WHEN 滚动时，THEN THE Timescale SHALL 保持固定在顶部可见

### 需求 9: 轨道管理

**用户故事**: 作为视频编辑用户，我希望能够管理轨道，以便组织复杂的多层视频项目。

#### 验收标准

1. WHEN 用户点击"添加视频轨道"按钮时，THEN THE Timeline SHALL 在视频轨道区域添加新轨道
2. WHEN 用户点击"添加音频轨道"按钮时，THEN THE Timeline SHALL 在音频轨道区域添加新轨道
3. WHEN 用户点击轨道删除按钮时，THEN THE Timeline SHALL 删除该轨道及其所有片段
4. THE Timeline SHALL 为每个轨道显示轨道名称（如"视频 1"、"音频 1"）
5. WHEN 轨道为空时，THEN THE Timeline SHALL 允许删除该轨道
6. WHEN 轨道包含片段时，THEN THE Timeline SHALL 在删除前显示确认对话框

### 需求 10: 片段持续时间显示

**用户故事**: 作为视频编辑用户，我希望能够看到片段的持续时间信息，以便精确控制时间。

#### 验收标准

1. WHEN Clip 宽度大于 60 像素时，THEN THE Clip SHALL 在内部显示持续时间文本
2. THE Clip SHALL 显示持续时间格式为 MM:SS.mmm
3. WHEN 鼠标悬停在 Clip 上时，THEN THE Timeline SHALL 显示工具提示，包含素材名称、开始时间、持续时间
4. WHEN Clip 被裁剪或移动时，THEN THE Timeline SHALL 实时更新持续时间显示
5. THE Clip SHALL 使用不同颜色区分视频片段（蓝色）和音频片段（绿色）
6. WHEN Clip 宽度小于 60 像素时，THEN THE Clip SHALL 只显示缩略图，不显示文本

### 需求 11: 吸附功能控制

**用户故事**: 作为视频编辑用户，我希望能够启用或禁用吸附功能，以便在不同场景下灵活编辑。

#### 验收标准

1. THE Timeline SHALL 提供吸附功能开关按钮
2. WHEN 吸附功能启用时，THEN THE Timeline SHALL 在按钮上显示激活状态
3. WHEN 吸附功能禁用时，THEN THE Clip SHALL 可以自由移动到任意位置，不受吸附影响
4. THE Timeline SHALL 默认启用吸附功能
5. WHEN 用户切换吸附状态时，THEN THE Timeline SHALL 保存用户偏好到本地存储
6. WHEN 时间轴重新加载时，THEN THE Timeline SHALL 恢复上次的吸附状态设置

### 需求 12: 时间轴数据持久化

**用户故事**: 作为视频编辑用户，我希望时间轴的编辑内容能够保存，以便下次打开项目时继续编辑。

#### 验收标准

1. WHEN 用户添加、移动或删除 Clip 时，THEN THE Timeline SHALL 将变更保存到项目数据
2. THE Timeline SHALL 序列化所有轨道和片段信息为 JSON 格式
3. WHEN 用户打开已保存的项目时，THEN THE Timeline SHALL 从项目数据恢复所有轨道和片段
4. THE Timeline SHALL 保存每个 Clip 的以下属性：素材 ID、轨道 ID、开始时间、持续时间、入点、出点
5. WHEN 序列化或反序列化失败时，THEN THE Timeline SHALL 显示错误提示并保持当前状态
6. THE Timeline SHALL 在每次修改后自动保存，无需手动保存操作
