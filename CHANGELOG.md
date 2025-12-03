---
Author: 目棃
Description: CHANGELOG
Date: 2025-09-09
Update: 2025-12-03
---

> 本文档 [`Frontmatter`](https://github.com/BTMuli/MuCli#Frontmatter) 由 [MuCli](https://github.com/BTMuli/Mucli) 自动生成于 `2025-09-09 14:30:56`
>
> 更新于 `2025-12-03 20:02:17`

## [0.8.8](https://github.com/BTMuli/TeyvatGuide/releases/v0.8.8) (2025-12-03)

- 🐛 修复成就数据读取异常
- 🐛 重构管理员权限重启逻辑

## [0.8.7](https://github.com/BTMuli/TeyvatGuide/releases/v0.8.7) (2025-12-03)

- 🍱 更新 6.2 版本资源
- ✨ 帖子搜索支持“最新”“最热”排序
- ✨ 登录支持 Gt4 验证 [`#162`](https://github.com/BTMuli/TeyvatGuide/issues/162)
- ✨ 帖子视图支持窄视图模式，**未完全适配所有组件，可能存在显示异常**
- ✨ 支持通过内置 Yae 自动获取成就数据 [`#142`](https://github.com/BTMuli/TeyvatGuide/issues/142)
- 🐛 修复无法手动关闭极验验证弹窗
- 🐛 修复数据刷新后渲染异常 [`#163`](https://github.com/BTMuli/TeyvatGuide/issues/163)
- 🐛 重构祈愿图表，修复祈愿日历没有下拉条 [`#165`](https://github.com/BTMuli/TeyvatGuide/issues/165)
- 🐛 修复 MacOS 下极验验证浮窗加载异常 [`#164`](https://github.com/BTMuli/TeyvatGuide/issues/164)
- 🐛 重构回复浮窗处理，调整 UI ，修复滚动异常 [`#168`](https://github.com/BTMuli/TeyvatGuide/issues/168)
- 🐛 修复自定义表情格式解析异常，增加文本清晰度
- 🐛 调整回复按钮展示判断，修复特定条件下的数据对应异常
- 🐛 修复角色 Wiki 左侧列表顺序概率异常
- ✏️ 修正通过 Yae 导入成就的文本错误
- ✏️ 修正清除缓存后的提示文本
- 🚸 执行脚本时不允许切换账号
- 🚸 调整外部导入祈愿记录时进度显示逻辑，导入后刷新页面
- 🚸 增加部分 UI 在浅色模式下的可见度
- 🚸 账号相关操作（添加，切换）移至侧栏 [`#170`](https://github.com/BTMuli/TeyvatGuide/issues/170)
- 🚸 侧栏添加启动入口，满足条件时显示
- 🚸 完善角色 Wiki 侧边栏奇偶点击处理
- 👽️ 完善前瞻识别规则，增加空列表处理
- 📝 更新Q群链接

## [0.8.6](https://github.com/BTMuli/TeyvatGuide/releases/v0.8.6) (2025-11-19)

> 关于胡桃数据库导入功能的说明请参考 [导入胡桃数据库](https://app.btmuli.ink/docs/TeyvatGuide/import-hutao-db.html)

- 👽️ 移除剧诗概览，支持导入胡桃剧诗数据
- 👽️ 移除深渊上传，支持导入胡桃深渊数据
- 🔥 移除胡桃深渊统计页面
- 🚸 调整导入祈愿记录浮窗ui，显示导入进度
- 🐛 修复图片渲染异常
- 🥅 处理清除缓存异常，清除缓存后重启
- 🚸 帖子详情添加AIGC相关注释
- 🚸 添加跳转视频链接
- 📝 更新相关文档

## [0.8.5](https://github.com/BTMuli/TeyvatGuide/releases/v0.8.5) (2025-11-10)

- 🍱 更新下半数据

## [0.8.4](https://github.com/BTMuli/TeyvatGuide/releases/v0.8.4) (2025-10-27)

- 👽️ 公告添加千星奇域分类
- 🚸 兑换码浮窗显示游戏名称
- ✨ 嵌入官方公告页面（已登录）
- ✨ 嵌入官方祈愿详情（已登录）
- ✨ 完善投稿活动类型声明，渲染投稿活动&交互
- 🐛 修复部分帖子解析异常
- ✨ 重构帖子解析逻辑，增加新类型解析
- 💄 调整名片样式
- ✨ 添加getRegionRoleInfo事件处理
- 🐛 公告解析剔除多余换行
- ✨ 千星奇域祈愿页面草创

## [0.8.3](https://github.com/BTMuli/TeyvatGuide/releases/v0.8.3) (2025-10-22)

- 🍱 更新6.1版本数据
- 👽️ 适配月谕圣牌模式
- 🐛 重构帖子数据解析，修复HEIC格式图片渲染异常
- 🐛 修复切换角色导致ck对应异常
- 🚸 优化图片调整浮窗样式
- ♻️ 重构gt返回逻辑
- 💄 调整布局

## [0.8.2](https://github.com/BTMuli/TeyvatGuide/releases/v0.8.2) (2025-09-27)

- 🍱 更新元数据
- 🐛 修复特定情况下切换角色浮窗异常
- ✨ 动态处理游戏卡片组件
- 👽️ 适配新版块
- 💄 首页卡池组件改成轮播
- 💄 调整帖子卡片样式
- 💄 调整公告卡片样式
- 💄 调整帖子详情页面样式
- 💄 优化滚动截屏处理，调整抽奖浮窗UI
- 💄 调整成就项浮窗样式
- 🚸 隐藏危战刷新后的loading关闭
- 🚸 处理话题desc溢出
- 🚸 搜索成就时隐藏已有浮窗

## [0.8.1](https://github.com/BTMuli/TeyvatGuide/releases/v0.8.1) (2025-09-11)

- 🍱 添加月神瞳数据&资源
- ♻️ 战绩世界探索数据结构调整，增加数据显示
- 🐛 修复战绩显示异常
- 🐛 首页活动组件隐藏未开始活动，修复未开始活动时间显示异常
- 🐛 修复材料浮窗分享图生成异常
- 🐛 角色简略视图修复天赋显示异常，增加是否解锁显示
- 🐛 修复角色天赋/技能描述显示异常
- 🚸 调整名片Wiki页面，支持按类型筛选
- 🚸 微调签到奖励交互效果
- 💄 优化名片UI
- 💄 优化成就项UI
- 💄 调整材料图鉴顶部样式，保持UI一致性

## [0.8.0](https://github.com/BTMuli/TeyvatGuide/releases/v0.8.0) (2025-09-09)

- 🍱 更新6.0版本资源
- 🍱 修正部分角色阵营数据异常
- 🍱 修正「纪行·溢彩」图标异常
- ✨ 帖子文本链接组件添加右键复制链接功能
- ✨ 首页近期活动组件添加新数据来源（需登录）
- 🐛 修复角色属性筛选结果异常
- 🐛 修复部分材料浮窗合成&获取途径显示异常
- 🚸 调整登录顺序，隐藏启动器登录
- 💄 帖子顶部版块信息对齐
- 👽️ 适配新版块（崩坏·因缘精灵）
- 👽️ 调整公告解析正则，适配月版本
