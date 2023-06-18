---
Author: 目棃
Date: 2023-03-30
Description: CHANGELOG v0.1.x
Update: 2023-06-18
---

> 本文档 [`Front-matter`](https://github.com/BTMuli/Mucli#FrontMatter) 由 [MuCli](https://github.com/BTMuli/Mucli) 自动生成于 `2023-03-30 15:39:49`
> 
> 更新于 `2023-06-18 15:02:31`

# CHANGELOG v0.1.x

> 本文仅记录 v0.1.x 版本的更新内容

## [0.1.6](https://github.com/BTMuli/Tauri.Genshin/releases/v0.1.6) (2023-05-28)

### Feat

- 用户：添加部分数据获取请求

### Fix

- 页面：修复间距显示异常 [`a428c86a`](https://github.com/BTMuli/Tauri.Genshin/commit/a428c86a)
- 成就：数据库更新后成就版本自动更新 [`71f5c30f`](https://github.com/BTMuli/Tauri.Genshin/commit/71f5c30f)
- 首页：修复首页卡素材日历的问题 [`5a14b90b`](https://github.com/BTMuli/Tauri.Genshin/commit/5a14b90b)

### Change

- 组件：部分组件实现方式更改

FullCommits: [`v0.1.5 ~ v0.1.6`](https://github.com/BTMuli/Tauri.Genshin/compare/v0.1.5...v0.1.6)

## [0.1.5](https://github.com/BTMuli/Tauri.Genshin/releases/v0.1.5) (2023-05-25)

### Feat

- 组件：`TConfirm` 组件支持 Input [`50f2305d`](https://github.com/BTMuli/Tauri.Genshin/commit/50f2305d)
- 请求：完成部分涉及游戏数据的获取
- 数据库：添加 `GameAccount` 表用于存储用户游戏账号数据 [`683500fe`](https://github.com/BTMuli/Tauri.Genshin/commit/683500fe)
- 资源：添加素材相关图片 [`11322f14`](https://github.com/BTMuli/Tauri.Genshin/commit/11322f14)
- 用户：支持用户信息获取&基本信息展示（昵称、UID、头像）
- 数据库：数据备份时会将用户 Cookie 一同备份

### Fix

- 资源：补充上个版本遗漏的数据 [`91b7ed35`](https://github.com/BTMuli/Tauri.Genshin/commit/91b7ed35)
- 设置：修复数据库不存在时无法重置数据库的问题
- 资源：添加 3.7 版本资源 [#17](https://github.com/BTMuli/Tauri.Genshin/issues/17)
- 首页：增加近期活动结束时间为 0 的处理 [#25](https://github.com/BTMuli/Tauri.Genshin/issues/25)
- 样式：滚动条样式调整 [`3b47c5f2`](https://github.com/BTMuli/Tauri.Genshin/commit/3b47c5f2)
- 应用：不再在生产环境提供调试模式的开关 [#26](https://github.com/BTMuli/Tauri.Genshin/issues/26)
- 数据库：删除 IndexedDB 的删除操作 [`f23b73ec`](https://github.com/BTMuli/Tauri.Genshin/commit/f23b73ec)

### Change

- 应用：更新检测 Endpoints 变更 [`13ab6c83`](https://github.com/BTMuli/Tauri.Genshin/commit/13ab6c83)
- Cookie：获取方式改为手动输入，不再通过 rocket 尝试自动获取 [`baff5a17`](https://github.com/BTMuli/Tauri.Genshin/commit/baff5a17)
- 侧边栏：更换部分图标 [`e9e5c0a6`](https://github.com/BTMuli/Tauri.Genshin/commit/e9e5c0a6)
- 素材日历：排布更改，添加 overlay 显示角色/武器 需要材料及来源 [`a27f6277`](https://github.com/BTMuli/Tauri.Genshin/commit/a27f6277)
- 首页组件：背景改为半透明，整体表现优化
- 数据库：关闭首页数据库完整性检测 [`cf1fb130`](https://github.com/BTMuli/Tauri.Genshin/commit/cf1fb130)

FullCommits: [`v0.1.4 ~ v0.1.5`](https://github.com/BTMuli/Tauri.Genshin/compare/v0.1.4...v0.1.5)

## [0.1.4](https://github.com/BTMuli/Tauri.Genshin/releases/v0.1.4) (2023-05-02)

### Feat

- 应用：支持资源完整性检测&更新 [`bbfd608`](https://github.com/BTMuli/Tauri.Genshin/commit/bbfd608)
- 应用：支持数据备份&恢复 [`214d1d1`](https://github.com/BTMuli/Tauri.Genshin/commit/214d1d10)
- 应用：数据源更改为 Sqlite 而非之前的 IndexedDB [`26048dc`](https://github.com/BTMuli/Tauri.Genshin/commit/26048dc) [#11](https://github.com/BTMuli/Tauri.Genshin/issues/11)

### Fix

- 成就：使用虚拟列表优化内存占用及浏览体验 [`5963e9a`](https://github.com/BTMuli/Tauri.Genshin/commit/5963e9a) [#13](https://github.com/BTMuli/Tauri.Genshin/issues/13)
- 组件：优化 `TConfirm` 组件表现
- 应用：优化侧边滚动条表现
- 应用：检测更新 Key 更改，下版本更新将提示更新 [`ceea064`](https://github.com/BTMuli/Tauri.Genshin/commit/ceea064)
- 应用：添加 `3.6` 版本遗漏数据 [`91fc39b`](https://github.com/BTMuli/Tauri.Genshin/commit/91fc39b)

FullCommits: [`v0.1.3 ~ v0.1.4`](https://github.com/BTMuli/Tauri.Genshin/compare/v0.1.3...v0.1.4)

## [0.1.3](https://github.com/BTMuli/Tauri.Genshin/releases/v0.1.3) (2023-04-23)

### Feat

- 应用：支持浅色\深色主题切换
- 应用：支持检测更新
- 图鉴：角色图鉴草创 [`d154b5bd`](https://github.com/BTMuli/Tauri.Genshin/commit/d154b5bd)
- 图鉴：武器图鉴草创 [`1c309e38`](https://github.com/BTMuli/Tauri.Genshin/commit/1c309e38)
- 滚动条：样式美化 [`4022504`](https://github.com/BTMuli/Tauri.Genshin/commit/4022504)

### Fix

- 应用：修复初始化未重新加载资源的问题 [`513be2e`](https://github.com/BTMuli/Tauri.Genshin/commit/513be2e)
- 应用：除成就数据外的 `readonly` 数据直接读取应用内 `json` 文件
- 应用：添加游戏新版本资源
- GCG：相关资源归到 `WIKI` 下
- 首页：素材日历资源采用 WIKI 资源

FullCommits: [`v0.1.2 ~ v0.1.3`](https://github.com/BTMuli/Tauri.Genshin/compare/v0.1.2...v0.1.3)

## [0.1.2](https://github.com/BTMuli/Tauri.Genshin/releases/v0.1.2) (2023-04-12)

### Feat

- 窗口：根据内容改变标题
- 成就：添加版本信息
- 首页：组件展示顺序自定义
- 组件：新建 confirm 组件
- 设置：添加系统信息、添加打包时间戳
- 咨讯：支持多种游戏咨讯查看
- 米游社解析：添加 `mention` 类型解析


### Fix

- 首页：近期活动、限时祈愿结束处理
- 组件：回顶组件 hover 效果美化
- 组件：用 snackebar 替换 alert
- 咨讯：无封面时替换为默认图
- 抽奖详情：配色调整
- 首页：素材日历资源本地化
- 侧边栏：设置置底

FullCommits: [`v0.1.1 ~ v0.1.2`](https://github.com/BTMuli/Tauri.Genshin/compare/v0.1.1...v0.1.2)

## [0.1.1](https://github.com/BTMuli/Tauri.Genshin/releases/v0.1.1) (2023-04-03)

### Feat

- 米游社解析：新增 `link_card`、`divider`、`lottery`、`fold`
- 米游社解析：新增 `lottery` 跳转详情页，即抽奖详情跳转
- 首页：新增近期活动信息卡片
- 首页：各展示卡片组件分离
- 组件：新增回顶组件 [`c633476e`](https://github.com/BTMuli/Tauri.Genshin/commit/c633476e)
- 新增：游戏内公告数据获取&展示
- 新增：游戏内公告数据解析 [`68c07732`](https://github.com/BTMuli/Tauri.Genshin/commit/68c07732)
- 首页：新增材料日历获取&展示 [`34bb878e`](https://github.com/BTMuli/Tauri.Genshin/commit/34bb878e)
- 首页：显示组件可选，`限时祈愿`、`近期活动`、`材料日历` [`871bf031`](https://github.com/BTMuli/Tauri.Genshin/commit/871bf031)

### Fix

- 帖子跳转：改为用组件实现，而非之前的写入 `.html` 文件后读取
- 首页：修复限时祈愿获取数据转换为卡片数据时可能返回空数据的问题 [`45bba5a1`](https://github.com/BTMuli/Tauri.Genshin/commit/45bba5a1)
- 加载组件：可选绝对定位或相对定位 [`56d0c8e6`](https://github.com/BTMuli/Tauri.Genshin/commit/56d0c8e6)
- 米游社咨讯页：完善 `devMode` 下的数据展示 [`e2aee518`](https://github.com/BTMuli/Tauri.Genshin/commit/e2aee518)
- 米游社解析：修复帖子图片未正常显示的问题 [`3cc71a89`](https://github.com/BTMuli/Tauri.Genshin/commit/3cc71a89)
- 米游社咨讯页：支持无限滚动 [`15ce357b`](https://github.com/BTMuli/Tauri.Genshin/commit/15ce357b)
- 米游社咨讯页：修复未存在封面图时的显示问题 [`340cd690`](https://github.com/BTMuli/Tauri.Genshin/commit/340cd690)
- 米游社咨讯页：优化加载性能 [`d3f7b4be`](https://github.com/BTMuli/Tauri.Genshin/commit/d3f7b4be)

### Change

- 字体变更：删去原有 `Genshin.ttf`，增加 `汉仪文黑-85W.ttf`，`汉仪文黑-55W.ttf`、`Consolas.ttf`。
- Tauri: 取消窗体 `transparent` 属性。
- Build: RollupOptions 配置变更。 [`b44dd46f`](https://github.com/BTMuli/Tauri.Genshin/commit/b44dd46f)
- css: 全部改为 `scoped`，全局引入 `css` 文件调整。
- 资源：删除无用图标。 [`7207a901`](https://github.com/BTMuli/Tauri.Genshin/commit/7207a901)

FullCommits: [`v0.1.0 ~ v0.1.1`](https://github.com/BTMuli/Tauri.Genshin/compare/v0.1.0...v0.1.1)

## [0.1.0](https://github.com/BTMuli/Tauri.Genshin/releases/v0.1.0) (2023-03-30)

> 因为之前还有个 preAlpha 版本，这里的变更记录从项目创建开始。

### Feat

> 按照侧边栏的顺序排序

- 支持当前卡池查看&对应祈愿帖跳转
- 支持官方咨讯查看，包括：新闻、活动、公告
- 支持 UIAF 成就数据导入导出&展示
- 支持 GCG 卡牌数据展示

FullCommits: [`v0.1.0`](https://github.com/BTMuli/Tauri.Genshin/commits/v0.1.0)
