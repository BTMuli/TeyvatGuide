---
Author: 目棃
Description: CHANGELOG
Date: 2023-09-08
Update: 2023-09-27
---

> 本文档 [`Frontmatter`](https://github.com/BTMuli/MuCli#Frontmatter) 由 [MuCli](https://github.com/BTMuli/Mucli) 自动生成于 `2023-09-08 09:45:17 `
>
> 更新于 `2023-09-27 08:41:43`

## [0.3.2](https://github.com/BTMuli/TeyvatGuide/releases/v0.3.2) (2023-9-27)

### Feat

- 成就：支持 [`YaeAchievement`](https://github.com/HolographicHat/YaeAchievement) 直接导入 [`#42`](https://github.com/BTMuli/TeyvatGuide/issues/42)
- 资源：更新至 4.1 版本 [`#41`](https://github.com/BTMuli/TeyvatGuide/issues/41)
- 应用：退出主窗口自动关闭所有子窗口
- 应用：完成单例模式，防止多次打开应用

### Fix

- 解析：修复表情解析概率报错
- 路由：路由跳转优化

### Change

- UI: 配色变更
- 分享：改为直接复制到剪贴板

FullCommits: [`v0.3.1...v0.3.2`](https://BTMuli/TeyvatGuide/compare/v0.3.1...v0.3.2)

## [0.3.1](https://github.com/BTMuli/TeyvatGuide/releases/v0.3.1) (2023-09-15)

### Feat

- 正式上架微软商店 <a href="https://apps.microsoft.com/store/detail/9NLBNNNBNSJN?launch=true&cid=BTMuli&mode=mini">
  <img src="https://get.microsoft.com/images/zh-cn%20dark.svg" alt="download"/>
  </a>
- 首页：检测到版本更新时，会弹出更新页面

### Fix

- 修复祈愿记录获取失败的问题 [`#38`](https://github.com/BTMuli/TeyvatGuide/issues/38)
- 修复应用初始化加载数据库失败的问题 [`#40`](https://github.com/BTMuli/TeyvatGuide/issues/40)
- 修复 Github action 构建失败的问题

### Change

- 应用：关闭 Tauri 自带的自动更新功能，依赖微软商店的更新机制
- 应用：更改应用名称，`Tauri.Genshin` -> `Teyvat Guide`

FullCommits: [`v0.3.0...v0.3.1`](https://github.com/BTMuli/TeyvatGuide/compare/v0.3.0...v0.3.1)

## [0.3.0](https://github.com/BTMuli/Tauri.Genshin/releases/v0.3.0) (2023-09-08)

### Feat

- 登录：支持扫码登录 closes #18
- 祈愿：支持祈愿记录获取
- 帖子：支持表情包解析

### Fix

- 祈愿：UID 列表从数据库中读取，支持多账号祈愿记录
- 祈愿：修复导出路径错误
- 帖子：修复颜色解析错误
- 帖子：修复生成分享图时分隔线渲染错误
- 帖子：修复含有折叠框的帖子生成分享图时渲染错误
- 数据：添加缺失的角色数据

### Change

- 样式：应用样式调整
- 构建：更改打包配置，目前仅支持 Windows 平台（msi）

FullCommits: [`v0.2.3...v0.3.0`](https://github.com/BTMuli/Tauri.Genshin/compare/v0.2.3...v0.3.0)
