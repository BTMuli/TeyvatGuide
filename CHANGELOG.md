---
Author: 目棃
Description: CHANGELOG
Date: 2024-10-09
Update: 2024-11-19
---

> 本文档 [`Frontmatter`](https://github.com/BTMuli/MuCli#Frontmatter) 由 [MuCli](https://github.com/BTMuli/Mucli) 自动生成于 `2024-10-09 15:51:43`
>
> 更新于 `2024-11-19 17:06:05`

## [0.6.3](https://github.com/BTMuli/TeyvatGuide/releases/v0.6.3) (2024-11-19)

- 🐛 修复用户战绩角色数据`undefined`
- 🐛 修复咨讯页加载更多异常
- 🐛 修复验证码登录提示`-100`，数据刷新后若为已登录UID则不会再提示切换
- 🐛 修复部分公告渲染异常
- 🐛 修复成就页面在存在搜索内容时点击左侧成就系列无响应
- ✨ 帖子新增 UID 卡片解析&渲染
- ✨ 帖子新增自定义表情解析&渲染
- ✨ 真境剧诗适配，新增真境剧诗页面，支持获取&分享&上传（胡桃数据库），可通过深渊页面进入
- ✨ 新增话题页面，可通过帖子卡片标签点击或帖子详情顶部标签点击进入
- ✨ 更完善的`loading`显示，调整了组件UI
- 🍱 更新5.2版本资源 [`#133`](https://github.com/BTMuli/TeyvatGuide/issues/133)
- 💄 调整祈愿记录UP四星颜色
- 💄 修复帖子页兑换码弹窗高度异常
- 💄 调整帖子卡片UI，增加显示帖子话题（如存在），话题&版块支持点击跳转
- 💄 调整帖子详情页UI，顶部话题&版块支持点击跳转
- 💄 调整帖子显示数量，支持加载更多，默认排序改为`最新回复`，移除`默认排序`，增加`热门`排序
- 💄 咨讯、帖子等页面刷新时自动滚动到顶部
- 🔥 深渊数据库显示移除第9层统计数据
- 👽️ 米游社子窗口增加`genshinnet`域名支持
- 🎨 优化帖子详情数据加载的错误处理
- ♻️ `snackbar`、`confirm`、`loading`组件重构
- ♻️ 请求模块重构

## [0.6.2](https://github.com/BTMuli/TeyvatGuide/releases/v0.6.2) (2024-10-31)

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
