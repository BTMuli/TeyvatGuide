---
Author: 目棃
Description: CHANGELOG
Date: 2024-10-09
Update: 2024-10-31
---

> 本文档 [`Frontmatter`](https://github.com/BTMuli/MuCli#Frontmatter) 由 [MuCli](https://github.com/BTMuli/Mucli) 自动生成于 `2024-10-09 15:51:43`
>
> 更新于 `2024-10-31 10:36:33`

## [0.6.2](https://github.com/BTMuli/TeyvatGuide/releases/v0.6.2)

- 🐛 修复用户登录状态异常 [`#132`](https://github.com/BTMuli/TeyvatGudie/issues/132)
- 💄 帖子子回复取消保持，点击其他隐藏
- 💄 调整未登录时的部分内容渲染
- 💄 调整保存时图片的hint
- 💄 `mac`:修复回顶组件宽度异常
- 💄 `mac`:修复视频封面位置异常
- 💄 调整角色卡片UI，维持名片比例
- ♻️ 深渊数据库重构，概览显示差距
- 🍱 更新下半卡池
- 👽️ 修正咨讯Api

## [0.6.1](https://github.com/BTMuli/TeyvatGuide/releases/v0.6.1) (2024-10-22)

- 🐛 新用户数据库初始化异常 [`#131`](https://github.com/BTMuli/TeyavtGuide/issues/131)
- 🐛 修复角色数据未即时刷新
- 🐛 修复`openSystemBrowser`回调执行异常
- ♻️ 公告卡片组件抽离，支持分享
- 🎨 成就页面&名片图鉴页面采用虚拟列表优化性能
- 🎨 调整卡片封面加载逻辑
- 💄 处理特定情况下的内容溢出
- 💄 适配深渊新字段，显示跳过楼层
- 💄深渊分享显示应用信息，圣遗物详情推荐属性高亮
- 💄调整帖子子窗口副标题样式
- 💄调整留影叙佳期选项样式

## [0.6.0](https://github.com/BTMuli/TeyvatGuide/releases/v0.6.0) (2024-10-09)

- ✨ 应用支持多账号 [`#126`](https://github.com/BTMuli/TeyvatGuide/issues/126)
- ✨ 支持手动输入CK&用户删除
- ✨ 帖子卡片支持分享
- ✨ 支持官服用户直接启动原神 [`#80`](https://github.com/BTMuli/TeyvatGuide/issues/80)
- ♻️ 重构成就表格，支持多存档
- ♻️ 重构深渊数据加载逻辑，适配多存档
- ♻️ 重构用户登录逻辑及切换
- ♻️ 重构祈愿、深渊、角色页面逻辑，支持游戏账号切换
- ♻️ 战绩页面适配多账户
- 💄 帖子/公告子窗口添加窗口置顶按钮
- 💄 调整视频分享截图
- 💄 回复分享图忽略导出图标
- 💄 显示用户等级
- 💄 处理特定情况下的回复内容溢出
- 💄 兑换码支持分享，调整了兑换码浮窗UI
- 💄 公告对列表进行缩进
- 💄 材料Wiki样式优化，支持分类筛选&查询
- 💄 材料详情浮窗支持分享
- ✏️ JSBridge新增`openSystemBrowser`回调处理
- ✏️ 修正公告正则
- 👽️ 更新国际服公告Api
- 📖 添加 macOS 平台门禁属性导致无法打开应用的修复指引 [`#130`](https://github.com/BTMuli/TeyvatGuide/issues/130)
