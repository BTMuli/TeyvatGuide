---
Author: 目棃
Description: CHANGELOG
Date: 2024-01-15
Update: 2024-02-09
---

> 本文档 [`Frontmatter`](https://github.com/BTMuli/MuCli#Frontmatter) 由 [MuCli](https://github.com/BTMuli/Mucli) 自动生成于 `2024-01-15 17:29:15`
>
> 更新于 `2024-02-09 20:30:26`

## [0.4.3](https://github.com/BTMuli/TeyvatGuide/releases/v0.4.3) (2024-02-09)

### Feat

- 公告：支持服务器&语言的切换 [`#81`](https://github.com/BTMuli/TeyvatGuide/issues/81)
- 战绩：世界探索部分数据结构调整，合并同类数据（如沉玉谷）[`#91`](https://github.com/BTMuli/TeyvatGuide/issues/91)
- 图鉴：角色/武器图鉴支持条件筛选（武器类型、星级等） [`#87`](https://github.com/BTMuli/TeyvatGuide/issues/87)

### Fix

- 应用：完善 UID 与服务器的对应关系 [`#81`](https://github.com/BTMuli/TeyvatGuide/issues/81)
- 应用：修正扫码登录，增加网页登录 [`#89`](https://github.com/BTMuli/TeyvatGuide/issues/89)
- 祈愿：修复 `authkey` 获取失败后无限加载的问题
- 图鉴：修复部分文本错误，增加遗漏数据
- 应用：修复外部唤起失效，**不保证*应用商店版本*的唤起可用性**
- 日志：修复过时日志检测逻辑错误

### Change

- 设置：平台图标跟随平台变更，调整图标样式 [`88`](https://github.com/BTMuli/TeyvatGuide/issues/88)
- 深渊：调整深渊样式，完善上传错误处理
- 应用：后端代码重构，修复窗口创建时的 `error` 问题

## [0.4.2](https://github.com/BTMuli/TeyvatGuide/releases/v0.4.2) (2024-01-30)

### Feat

- 应用：支持日志记录 [`#83`](https://github.com/BTMuli/TeyvatGuide/issues/83)
- 图鉴：角色/武器图鉴支持查看材料详细信息
- 资源：游戏资源更新至 4.4 版本 [`#86`](https://github.com/BTMuli/TeyvatGuide/issues/86)
- 成就：支持查看成就详细信息，数据来源于 [`amos-data`](https://github.com/yuehaiteam/amos-data)
- 首页：祈愿卡池 Up 角色支持直接跳转到对应图鉴界面

### Fix

- 应用：完善用户账号数据返回，修复部分用户数据获取失败
- 应用：修复深渊页面分享图生成错误，完善分享&上传判断
- 首页：采用 `emit` 替代 `interval`，提升性能
- JSBridge：修复特定情况下的 `panic`

### Change

- 应用：设置页面重构
- 应用：首页组件配置移至首页
- 帖子：调整别野卡片、合集 overlay 样式

## [0.4.1](https://github.com/BTMuli/TeyvatGuide/releases/v0.4.1) (2024-01-19)

### Feat

- 组件：首页素材日历添加 wiki 页面跳转
- 应用：完善 fp 获取，添加强制更新入口
- 图鉴：名片图鉴搜索支持搜索来源
- 应用：支持修改数据目录 [`#78`](https://github.com/BTMuli/TeyvatGuide/issues/78)

### Fix

- 应用：修复首页启动卡数据加载 [`#79`](https://github.com/BTMuli/TeyvatGuide/issues/79)
- 应用：修复 macOS 启动崩溃 [`#82`](https://github.com/BTMuli/TeyvatGuide/issues/82)
- 图鉴：完善切换时的底部 hint

### Change

- 图鉴：卡牌图鉴样式重构
- 组件：统一底部弹窗样式
- 应用：调整部分点击跳转逻辑

## [0.4.0](https://github.com/BTMuli/TeyvatGuide/releases/v0.4.0) (2024-01-15)

### Feat

- 应用：实装角色、武器、名片图鉴
- JSBridge：添加窗口旋转子菜单
- 应用：更新米社 salt 版本
- 帖子：完成 `video` 类型数据的渲染 [`#77`](https://github.com/BTMuli/TeyvatGuide/issues/77)

### Fix

- wiki：修复流浪者数据错误
- 应用：添加夏沃蕾、究极霸王超级魔剑的数据
- 帖子：修复部分格式图片渲染失败
- 公告：优化公告详情在深色模式下的表现
- JSBridge：修复登录态错误
- 应用：类型重构 [`#51`](https://github.com/BTMuli/TeyvatGuide/issues/51)
- 应用：完善数据库完整性检测

### Change

- 应用：调整 `snackbar` 样式
- 应用：取消 `transparent` 配置
