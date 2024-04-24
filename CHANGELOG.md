---
Author: 目棃
Description: CHANGELOG
Date: 2024-01-15
Update: 2024-04-24
---

> 本文档 [`Frontmatter`](https://github.com/BTMuli/MuCli#Frontmatter) 由 [MuCli](https://github.com/BTMuli/Mucli) 自动生成于 `2024-01-15 17:29:15`
>
> 更新于 `2024-04-24 15:36:42`

## [0.4.6](https://github.com/BTMuli/TeyvatGuide/releases/v0.4.6) (2024-04-24)

### Feat

- 帖子：重构文本解析，现在更加贴近应用内的渲染效果
- 应用：侧边栏点击咨讯时的参数也支持记忆了
- 应用：更新 4.6 版本的游戏资源

### Fix

- 留影叙佳期：修复侧边栏点击时初始画片数异常
- 首页：修复特定情况下日历组件左侧切换日期按钮点击无效
- 帖子：修复 `align:right` 不生效的问题
- 首页：修复特定情况下首页卡池渲染异常

### Change

- 应用：数据库更新后弹出更新日志

## [0.4.5](https://github.com/BTMuli/TeyvatGuide/releases/v0.4.5) (2024-04-05)

### Feat

- 添加收藏页面，支持导入用户收藏 [`#100`](https://github.com/BTMuli/TeyvatGuide/issues/100)
- 设置页添加更新日志跳转
- 首页：组件样式迭代
- 帖子：替换默认封面
- 帖子：支持关键词搜索 [`#103`](https://github.com/BTMuli/TeyvatGuide/issues/103)

### Fix

- 成就：修正部分成就版本信息 [`3501590f`](https://github.com/BTMuli/TeyvatGuide/commit/3501590f)
- 帖子：链接卡片添加间距
- 图鉴：修复埃洛伊背景渲染异常
- 留影叙佳期：补充遗漏数据，支持特定日期查看

### Change

- 帖子：微调解析逻辑
- 重构：通用帖子卡片抽离作为组件，添加 `select` 状态
- 帖子：抽奖详情改为 `overlay`
- 应用：调整默认颜色

## [0.4.4](https://github.com/BTMuli/TeyvatGuide/releases/v0.4.4) (2024-03-13)

### Feat

- 咨讯：优化咨讯版块切换&页面跳转体验
- 公告：在可能的情况下根据公告内容获取对应时间 [`#94`](https://github.com/BTMuli/TeyvatGuide/issues/94)
- 帖子：添加转载声明，支持图片浮窗
- 祈愿：添加 `祈愿历史` 页面，支持查看历史祈愿记录及对应信息
- 祈愿：添加集录祈愿支持，更新 UIGF 版本至 3.0 [`#96`](https://github.com/BTMuli/TeyvatGuide/issues/96)
- 应用：版本更新弹窗确认后将直接更新数据库
- 应用：添加 `留影叙佳期` 页面，汇聚三年间的相关信息
- 应用：再次支持米游社扫码登录，网页登录自动检测数据并刷新 [`#99`](https://github.com/BTMuli/TeyvatGuide/issues/99)
- 应用：添加 4.5 版本的游戏资源 [`#95`](https://github.com/BTMuli/TeyvatGuide/issues/95)
- 祈愿：支持增量更新祈愿数据

### Fix

- 图鉴：修复武器图鉴左侧列表高度异常
- 日志：修正过期日志判断逻辑
- 帖子：修复动图渲染异常
- 深渊：当期不存在9层及以上的数据时进行提示
- JSBridge: 修复特定页面的分享图渲染错误
- 帖子：完善文本样式解析，修复特定情况下文本异常渲染为图片
- 应用：修复侧边栏及设置页面用户信息响应式异常

### Change

- 公告：调整样式，顶部添加相关信息
- 设置：数据路径采用系统命令而非文件选择器打开
- 日志：调试模式下不将日志写入文件
- 帖子：移除大别野组件
- 首页：素材日历移除留影叙佳期入口及生日提醒
- 深渊：胡桃数据库角色持有页面重构
- 首页：卡池组件样式重构

## [0.4.3](https://github.com/BTMuli/TeyvatGuide/releases/v0.4.3) (2024-02-09)

### Feat

- 公告：支持服务器&语言的切换 [`#81`](https://github.com/BTMuli/TeyvatGuide/issues/81)
- 战绩：世界探索部分数据结构调整，合并同类数据（如沉玉谷）[`#91`](https://github.com/BTMuli/TeyvatGuide/issues/91)
- 图鉴：角色/武器图鉴支持条件筛选（武器类型、星级等） [`#87`](https://github.com/BTMuli/TeyvatGuide/issues/87)

### Fix

- 应用：完善 UID 与服务器的对应关系 [`#90`](https://github.com/BTMuli/TeyvatGuide/issues/81)
- 应用：修正扫码登录，增加网页登录 [`#89`](https://github.com/BTMuli/TeyvatGuide/issues/89)
- 祈愿：修复 `authkey` 获取失败后无限加载的问题
- 图鉴：修复部分文本错误，增加遗漏数据
- 应用：修复外部唤起失效，**不保证*应用商店版本*的唤起可用性**
- 日志：修复过时日志检测逻辑错误

### Change

- 设置：平台图标跟随平台变更，调整图标样式 [`#88`](https://github.com/BTMuli/TeyvatGuide/issues/88)
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
