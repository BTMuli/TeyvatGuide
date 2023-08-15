---
Author: 目棃
Date: 2023-06-18
Description: CHANGELOG
Update: 2023-08-15
---

> 本文档 [`Front-matter`](https://github.com/BTMuli/Mucli#FrontMatter) 由 [MuCli](https://github.com/BTMuli/Mucli) 自动生成于 `2023-06-18 15:03:42 `
>
> 更新于 `2023-08-15 17:55:56`

# CHANGELOG

## [0.2.2](https://github.com/BTMuli/Tauri.Genshin/releases/0.2.2) (2023-08-15)

### Feat

- 资源：更新游戏 4.0 版本相关资源 [#33](https://github.com/BTMuli/Tauri.Genshin/issues/33)

### Fix

- 深渊：修复渲染错误 [#32](https://github.com/BTMuli/Tauri.Genshin/issues/32)
- 深渊：修复图片缺失 [#31](https://github.com/BTMuli/Tauri.Genshin/issues/31)

### Change

- 深渊：适应 HutaoAPI 更新 [`00277f52`](https://github.com/BTMuli/Tauri.Genshin/commit/00277f52)
- 素材日历：变更数据来源

FullCommits: [`0.2.1...0.2.2`](https://github.com/BTMuli/Tauri.Genshin/compare/0.2.1...0.2.2)

## [0.2.1](https://github.com/BTMuli/Tauri.Genshin/releases/0.2.1) (2023-07-14)

### Feat

- 深渊: 新增深渊数据库页面，角色深渊数据支持数据上传 [`#22`](https://github.com/BTMuli/Tauri.Genshin/issues/22)
- 页面：角色详情新增角色衣装数据 [`26186f44`](https://github.com/BTMuli/Tauri.Genshin/commit/26186f44)
- 页面：角色详情新增角色天赋数据
- 功能：子页面：米游社帖子、游戏公告支持分享；首页素材日历支持分享
- 资源：更新 3.8 版本资源 [`#30`](https://github.com/BTMuli/Tauri.Genshin/issues/30)
- 功能：支持根据帖子 ID 跳转到帖子页面 [`04e08090`](https://github.com/BTMuli/Tauri.Genshin/commit/04e08090)

### Fix

- 样式：美化部分页面、组件样式
- 组件：优化素材日历组件 [`0c923060`](https://github.com/BTMuli/Tauri.Genshin/commit/0c923060)
- 样式：修复首页组件近期活动样式 [`20a2329e`](https://github.com/BTMuli/Tauri.Genshin/commit/20a2329e)
- 样式：美化米游社咨讯页面样式，增加部分数据

### Change

- 依赖：各依赖更新至最新版本
- 配置：优化 Eslint Prettier Stylelint Lint-Staged 等配置
- 重构：重构 Mys 插件数据类型及 Hutao 插件数据类型

Full Commits: [`0.2.0...0.2.1`](https://github.com/BTMuli/Tauri.Genshin/compare/0.2.0...0.2.1)

## [0.2.0](https://github.com/BTMuli/Tauri.Genshin/releases/0.2.0) (2023-06-19)

### Feat

- 功能：完成原神战绩数据获取、分享
- 功能：完成角色列表数据获取、分享
- 功能：完成深渊数据获取、分享
- 组件：新建多种组件
- 功能：帖子&公告支持分享 [`5393dc1b`](https://github.com/BTMuli/Tauri.Genshin/commit/5393dc1b)
- 页面：帖子&公告页面样式调整

### Fix

- 卡牌：更新遗漏卡牌 [`2b768bbf`](https://github.com/BTMuli/Tauri.Genshin/commit/2b768bbf)
- 数据：`ltoken`失效时自动更新 [`6a4ab1f0`](https://github.com/BTMuli/Tauri.Genshin/commit/6a4ab1f0)
- 应用：修复自动更新无效问题 [`9eec6258`](https://github.com/BTMuli/Tauri.Genshin/commit/9eec6258)
- 应用：支持深渊数据备份&恢复 [`44f715f4`](https://github.com/BTMuli/Tauri.Genshin/commit/44f715f4)
- 数据库：修复更新时间 `dev` 开头仍然存储的问题 [`32e3548b`](https://github.com/BTMuli/Tauri.Genshin/commit/32e3548b)

### Change

- 类型：更新部分类型定义
- 资源：成就系列图标目录变更
- 资源：字体文件变更 [`2ee48566`](https://github.com/BTMuli/Tauri.Genshin/commit/2ee48566)

Full Commits: [`v0.1.6...v0.2.0`](https://github.com/BTMuli/Tauri.Genshin/compare/v0.1.6...v0.2.0)
