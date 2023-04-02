---
Author: 目棃
Date: 2023-03-30
Description: CHANGELOG
Update: 2023-04-03
---

> 本文档 [`Front-matter`](https://github.com/BTMuli/Mucli#FrontMatter) 由 [MuCli](https://github.com/BTMuli/Mucli) 自动生成于`2023-03-30 15:39:49`
> 
> 更新于 `2023-04-03 00:24:29`

# CHANGELOG

## [0.1.1](https://github.com/BTMuli/Tauri.Genshin/releases/v0.1.1) (2023-04-03)

### Feat

- 米游社解析：新增 `link_card`、`divider`、`lottery`、`fold`
- 米游社解析：新增 `lottery` 跳转详情页，即抽奖详情跳转
- 首页：新增近期活动信息卡片
- 首页：各展示卡片组件分离
- 组件：新增回顶组件 c633476e
- 新增：游戏内公告数据获取&展示
- 新增：游戏内公告数据解析 68c07732
- 首页：新增材料日历获取&展示 34bb878e
- 首页：显示组件可选，`限时祈愿`、`近期活动`、`材料日历` 871bf031

### Fix

- 帖子跳转：改为用组件实现，而非之前的写入 `.html` 文件后读取
- 首页：修复限时祈愿获取数据转换为卡片数据时可能返回空数据的问题 45bba5a1
- 加载组件：可选绝对定位或相对定位 56d0c8e6
- 米游社咨讯页：完善 `devMode` 下的数据展示 e2aee518
- 米游社解析：修复帖子图片未正常显示的问题 3cc71a89
- 米游社咨讯页：支持无限滚动 15ce357b
- 米游社咨讯页：修复未存在封面图时的显示问题 340cd690
- 米游社咨讯页：优化加载性能 d3f7b4be

### Change

- 字体变更：删去原有 `Genshin.ttf`，增加 `汉仪文黑-85W.ttf`，`汉仪文黑-55W.ttf`、`Consolas.ttf`。
- Tauri: 取消窗体 `transparent` 属性。
- Build: RollupOptions 配置变更。 b44dd46f
- css: 全部改为 `scoped`，全局引入 `css` 文件调整。
- 资源：删除无用图标。 7207a901

FullCommits: [v0.1.0 ~ v0.1.1](https://github.com/BTMuli/Tauri.Genshin/compare/v0.1.0...v0.1.1)

## [0.1.0](https://github.com/BTMuli/Tauri.Genshin/releases/v0.1.0) (2023-03-30)

> 因为之前还有个 preAlpha 版本，这里的变更记录从项目创建开始。

### Feat

> 按照侧边栏的顺序排序

- 支持当前卡池查看&对应祈愿帖跳转
- 支持官方咨讯查看，包括：新闻、活动、公告
- 支持 UIAF 成就数据导入导出&展示
- 支持 GCG 卡牌数据展示

FullCommits: [v0.1.0](https://github.com/BTMuli/Tauri.Genshin/commits/v0.1.0)
