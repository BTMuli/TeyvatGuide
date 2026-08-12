---
Author: 目棃
Description: CHANGELOG
Date: 2026-07-01
Update: 2026-08-12
---

> 本文档 [`Frontmatter`](https://github.com/BTMuli/MuCli#Frontmatter) 由 [MuCli](https://github.com/BTMuli/Mucli) 自动生成于 `2026-07-01 05:22:05`
>
> 更新于 `2026-08-12 10:57:16`

## [0.11.3](https://github.com/BTMuli/TeyvatGuide/releases/v0.11.3) (2026-08-12)

- 🍱 更新7.0版本游戏资源
- 🍱 更新角色材料、食物、书籍、食谱和任务道具数据
- ✨ 首页新增限时祈愿卡池与UP物品详情浮窗，支持从过往祈愿触发限时祈愿浮窗
- ✨ 素材日历浮窗支持左右切换、统一浮窗展示并新增分享截图功能
- ✨ 重构角色/武器图鉴UI
- ✨ 真境剧诗页面UI改版
- ✨ 材料图鉴新增自定义分类筛选、排序和过滤，优化材料展示
- ✨ 养成计算完善天赋技能调整范围 [`#254`](https://github.com/BTMuli/TeyvatGuide/issues/254)
- ✨ 新增使用系统代理开关，商店版开启代理时自动解除回环限制，失败时可复制命令 [`#193`](https://github.com/BTMuli/TeyvatGuide/issues/193)
- ♻️ 深渊统计迁移至深境螺旋浮窗
- 🐛 修复极验SDK异步加载失败导致的应用渲染异常
- 🐛 修复缓存清除失败
- 🐛 修复祈愿日历图表因脏时间导致的渲染崩溃
- 🐛 修复部分Sentry反馈Issue
- 🚸 优化材料排序与加载状态交互
- 🚸 调整帖子窗口不同宽度下的分享图scale倍率
- 🚸 侧边栏关注浮窗显示时自动刷新内容

## [0.11.2](https://github.com/BTMuli/TeyvatGuide/releases/v0.11.2) (2026-07-21)

- 🍱 角色WIKI更新技能加强描述
- 🍱 更新下半卡池数据
- ✨ 新增养成计算页面 [`#246`](https://github.com/BTMuli/TeyvatGuide/issues/246)
- ✨ 首页素材日历新增养成计算切换
- ✨ 角色列表新增批量养成
- 🐛 事务处理相关Sql执行采用自定义命令，确保在同一连接，修复祈愿增量刷新异常
- ⚡️ 背包圣遗物分块懒加载
- 💄 优化角色筛选底部浮窗UI，新增强化体系筛选（魔导/月兆）
- 🚸 简化地区筛选 [`#253`](https://github.com/BTMuli/TeyvatGuide/issues/253)
- 🚸 侧边栏添加背包导入触发
- 🚸 支持删除当前已登录账号
- 💄 macOS下隐藏导入&武器&圣遗物入口

## [0.11.1](https://github.com/BTMuli/TeyvatGuide/releases/v0.11.1) (2026-07-03)

- 🐛 修正6.7卡池开始时间，修复历史祈愿计算异常
- 💄 首页用户祈愿组件补充遗漏的样式，修复渲染异常

## [0.11.0](https://github.com/BTMuli/TeyvatGuide/releases/v0.11.0) (2026-07-01)

🎉 项目400⭐庆祝版本

- 💥 移除 MacIntel 构建 by [@sigewinnefish](https://github.com/sigewinnefish) [`#250`](https://github.com/BTMuli/TeyvatGuide/pull/250)
- 🍱 更换部分字体库
- 🍱 更新6.7版本游戏资源
- ✨ 新增圣遗物套装WIKI
- ✨ 新增背包圣遗物&背包武器的获取&展示&筛选，调整侧边栏入口
- ✨ 米社脚本添加米游币获取/消耗记录查看浮窗
- ✨ 大幅优化图片浮窗放缩体验
- ✨ 帖子、话题页新增 `同步刷新` 配置项，默认勾选
  > 关闭该配置项，调整分区/排序后不会立即刷新，需手动点击刷新按钮
- ✨ 帖子、话题、用户收藏、帖子搜索浮窗新增页面布局切换配置，支持`网格布局`到`列表布局`的切换 [`#252`](https://github.com/BTMuli/TeyvatGuide/issues/252)
- ✨ 帖子卡片标题支持表情包渲染
- ✨ 战绩适配新版本地区
- 🐛 修复帖子详情页视频封面为空时导致的渲染异常
- 🐛 修复 macOS 27 下 SQLx 宏库加载失败 by [@子寻](https://github.com/HLfromZ) [`#251`](https://github.com/BTMuli/TeyvatGuide/pull/251)
- 🐛 修复真境剧诗页面出战角色对旅行者的渲染异常
- 🚸 修正同人图投稿获取默认打开浮窗比例
- 💄 移除帖子详情页宽度切换按钮的测试标识
- 💄 调整部分UI
