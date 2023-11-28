---
Author: 目棃
Description: CHANGELOG
Date: 2023-09-08
Update: 2023-11-28
---

> 本文档 [`Frontmatter`](https://github.com/BTMuli/MuCli#Frontmatter) 由 [MuCli](https://github.com/BTMuli/Mucli) 自动生成于 `2023-09-08 09:45:17 `
>
> 更新于 `2023-11-28 15:18:27`

## [0.3.6](https://github.com/BTMuli/TeyvatGuide/releases/v0.3.6) (2023-11-25)

### Feat

- 应用：实装 `device_fp`，有效降低 `1034` 错误 [`#58`](https://github.com/BTMuli/TeyvatGuide/issues/58)
- 首页：今日素材组件添加留影叙佳期入口，角色生日时颜色变更 [`#61`](https://github.com/BTMuli/TeyvatGuide/issues/61)
- 组件：优化 showConfirm 组件 input 模式下的体验
- 成就：支持单个成就完成状态修改 [`#60`](https://github.com/BTMuli/TeyvatGuide/issues/60)
- 成就：支持隐藏已完成成就 [`#19`](https://github.com/BTMuli/TeyvatGuide/issues/19)
- 角色：角色详情页 UI 迭代，支持角色卡片分享 [`#20`](https://github.com/BTMuli/TeyvatGuide/issues/20)

### Fix

- JSBridge：修复窗口关闭后无法再次创建的问题
- JSBridge：修复保存图片默认路径错误
- JSBridge：调整 closePage 逻辑
- 应用：在生成分享图时忽略某些元素
- 应用：完善数据库检测机制 [`#62`](https://github.com/BTMuli/TeyvatGuide/issues/62)
- JSBridge：应用启动时关闭隐藏的子窗口
- 应用：完善登录态检测机制

### Change

- 应用：米游社 salt 版本更新到 2.63.1
- 咨讯：大别野版块不再忽略咨讯区
- 分享：提高生成分享图的清晰度
- 成就：调整完成 icon 的颜色
- 组件：增加素材日历组件 overlay 国家 icon 清晰度
- 成就：重构成就页面代码，优化性能

## [0.3.5](https://github.com/BTMuli/TeyvatGuide/releases/v0.3.5) (2023-11-11)

### Feat

- 资源：更新至 4.2 版本 [`#57`](https://github.com/BTMuli/TeyvatGuide/issues/57)
- 祈愿：支持 UIGF v2.4 [`#59`](https://github.com/BTMuli/TeyvatGuide/issues/59)

### Fix

- JSBridge：修复图片保存失败 [`#56`](https://github.com/BTMuli/TeyvatGuide/issues/56)
- JSBridge: 调整 hideSideBar 逻辑 [`a474b962`](https://github.com/BTMuli/TeyvatGuide/commit/a474b962)
- 组件：修复 `snackbar` 组件被 `overlay` 遮挡问题 [`db36d18d`](https://github.com/BTMuli/TeyvatGuide/commit/db36d18d)
- 数据库：更新数据库时同时更新 `buildTime` [`c1a7e844`](https://github.com/BTMuli/TeyvatGuide/commit/c1a7e844)

### Change

- JSBridge：留影叙佳期入口改为工具箱入口 [`149c7b3f`](https://github.com/BTMuli/TeyvatGuide/commit/149c7b3f)
- Post：调整基准背景色 [`e6eaa2e2`](https://github.com/BTMuli/TeyvatGuide/commit/e6eaa2e2)
- 组件：适应游戏 UI 变更 `confirm` 组件样式 [`7a060a71`](https://github.com/BTMuli/TeyvatGuide/commit/7a060a71)
- API：更新祈愿记录获取 `endpoint` [`8037b635`](https://github.com/BTMuli/TeyvatGuide/commit/8037b635)

## [0.3.4](https://github.com/BTMuli/TeyvatGuide/releases/v0.3.4) (2023-10-28)

### Feat

- 应用：Awesome Tauri，[`tauri-apps/awesome-tauri#226`](https://github.com/tauri-apps/awesome-tauri/pull/226)
- 应用：支持 MacOS 平台 [`#53`](https://github.com/BTMuli/TeyvatGuide/pull/53)
- 应用：实装米游社 JSBridge，支持战绩、签到、酒馆、留影叙佳期等功能 [`#47`](https://github.com/BTMuli/TeyvatGuide/issues/47)
- 导出：设置默认导出文件名称
- 应用：支持缓存检测&清理 [`#55`](https://github.com/BTMuli/TeyvatGuide/issues/55)
- 帖子：展示更多相关信息 [`79fd18ea`](https://github.com/BTMuli/TeyvatGuide/commit/79fd18ea)

### Fix

- 应用：窗口创建逻辑重构 [`1914261e`](https://github.com/BTMuli/TeyvatGuide/commit/1914261e)
- 分享：修复含视频分享图生成异常 [`#54`](https://github.com/BTMuli/TeyvatGuide/issues/54)
- 应用：更新检测上移到应用初始化 [`#45`](https://github.com/BTMuli/TeyvatGuide/issues/45)
- 应用：将部分未更正的 `Tauri.Genshin` 改为 `Teyvat Guide`
- 应用：`v-select` 样式适应主题变更 [`3db8008f`](https://github.com/BTMuli/TeyvatGuide/commit/3db8008f)
- 应用：修复关闭卡顿 [`d4295c7d`](https://github.com/BTMuli/TeyvatGuide/commit/d4295c7d)

### Change

- 角色：对获取到的数据进行排序 [`0d4fdecd`](https://github.com/BTMuli/TeyvatGuide/commit/0d4fdecd)
- 组件：Confirm 组件渲染调整 `v-if` -> `v-show` [`9be40181`](https://github.com/BTMuli/TeyvatGuide/commit/9be40181)
- 设置：删除数据库完整性检测，隐藏数据库重置 [`5992567d`](https://github.com/BTMuli/TeyvatGuide/commit/5992567d)
- 极验：移除极验验证相关代码 [`84b98e4a`](https://github.com/BTMuli/TeyvatGuide/commit/84b98e4a)
- 战绩：角色数据添加 `title` 属性，展示部分角色信息 [`043fda9e`](https://github.com/BTMuli/TeyvatGuide/commit/043fda9e)
- 重构：对基本 `Response` 类型进行重构 [`9a221f9b`](https://github.com/BTMuli/TeyvatGuide/commit/9a221f9b)
- 重构：对米游社帖子结构化类型进行重构 [`ecb0f1a7`](https://github.com/BTMuli/TeyvatGuide/commit/ecb0f1a7)

FullCommits: [`v0.3.3...v0.3.4`](https://BTMuli/TeyvatGuide/compare/v0.3.3...v0.3.4)

## [0.3.3](https://github.com/BTMuli/TeyvatGuide/releases/v0.3.3) (2023-10-19)

### Feat

- 应用：支持含视频帖子分享图生成 [`#44`](https://github.com/BTMuli/TeyvatGuide/issues/44)
- 帖子：新增对于大别野卡片 `VillaCard` 的解析渲染
- 应用：公告页样式美化
- 应用：采取动态路由，提高加载速度
- 角色：完善深色模式角色详情页样式

### Fix

- 深渊：默认刷新两期 [`#48`](https://github.com/BTMuli/TeyvatGuide/issues/48)
- 成就：修复部分成就版本错误 [`DGP-Studio/Snap.Hutao#996`](https://github.com/BTMuli/TeyvatGuide/commit/fdfcc70b)
- 应用：完善 DeepLink 处理
- 应用：完善 Cookie,BriefInfo 数据获取
- 应用：数据库链接保持开启，[`#46`](https://github.com/BTMuli/TeyvatGuide/issues/46)
- 组件：修复 `showConfirm` 文字过长时溢出容器问题 [`358255d5`](https://github.com/BTMuli/TeyvatGuide/commit/358255d5)
- 应用：更改弹窗弹出机制 [`#45`](https://github.com/BTMuli/TeyvatGuide/issues/45)
- 数据：补充 4.1 版本缺漏数据

### Change

- 图像：未登录时的默认头像变更 [`2cbac71b`](https://github.com/BTMuli/TeyvatGuide/commit/2cbac71b)
- 成就：添加 Finish Icon [`96ab38b9`](https://github.com/BTMuli/TeyvatGuide/commit/96ab38b9)
- 应用：浅色主题样式调整
- 帖子：未知结构化数据类型样式调整 [`adc96b76`](https://github.com/BTMuli/TeyvatGuide/commit/adc96b76)
- 应用：重构创建帖子子窗口代码
- 应用：咨讯页路由变更
- 组件：`showSnackbar` 样式调整
- 应用：重构咨讯页代码

FullCommits: [`v0.3.2...v0.3.3`](https://BTMuli/TeyvatGuide/compare/v0.3.2...v0.3.3)

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
