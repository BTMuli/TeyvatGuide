---
Author: 目棃
Description: CHANGELOG
Date: 2024-10-09
Update: 2025-07-07
---

> 本文档 [`Frontmatter`](https://github.com/BTMuli/MuCli#Frontmatter) 由 [MuCli](https://github.com/BTMuli/Mucli) 自动生成于 `2024-10-09 15:51:43`
>
> 更新于 `2025-07-07 12:45:35`

## [v0.7.8](https://github.com/BTMuli/TeyvatGuide/releases/v0.7.8) (2025-07-07)

- 🐛 修正游戏账号判断逻辑
- ✏️ 修正帖子活动卡片状态类型
- ✨ 幽境危战页面 [`#157`](https://github.com/BTMuli/TeyvatGuide/issues/157)
- 💄 战绩添加幽境危战数据
- 💄 修复部分页面渲染异常
- 🍱 更新下半资源
- ♻️ 角色json文件拆分
- ♻️ 名片资源重构
- ♻️ 调整服务器类型归属

## [0.7.7](https://github.com/BTMuli/TeyvatGuide/releases/v0.7.7) (2025-06-17)

- 🍱 更新5.7资源
- ✨ 页面触底加载
- ✨ 部分浮窗触底加载
- 🐛 修复五星平均抽数计算异常
- 🐛 完善帖子ID判断逻辑
- 🐛 修复公告卡片分享图生成异常
- ♻️ 重构公告模块，降低界面加载耗时&请求次数
- 💄 调整投票组件样式
- 💄 调整链接卡片组件背景
- 💄 调整帖子等页面网格列宽至360px
- 🚸 修正无痕浏览状态提示信息
- 🚸 首页卡池不传递ck

## [0.7.6](https://github.com/BTMuli/TeyvatGuide/releases/v0.7.6) (2025-05-25)

- 🍱 更新下半资源
- 🐛 修正macOS平台的窗口大小适配逻辑
- 🚸 子窗口添加外部打开菜单项
- ✨ 添加游戏卡片类型组件
- ♻️ 部分跳转改为外部浏览器打开
- ✨ 脚本支持“一键执行”

## [0.7.5](https://github.com/BTMuli/TeyvatGuide/releases/v0.7.5) (2025-05-09)

- 🐛 处理UIGF时区异常 [`#155`](https://github.com/BTMuli/TeyvatGuide/issues/155)

## [0.7.4](https://github.com/BTMuli/TeyvatGuide/releases/v0.7.4) (2025-05-06)

- 🍱 更新5.6资源
- 🐛 修正首页卡池组件封面判断逻辑
- 🐛 修正主窗口尺寸计算
- 🐛 修正用户收藏帖子获取API链接
- 🐛 修复帖子列表刷新时的请求状态异常
- 🚸 调整咨讯页浮窗显示逻辑
- 🚸 移除正式环境下公告页标题点击产生的JSON子窗口

## [0.7.3](https://github.com/BTMuli/TeyvatGuide/releases/v0.7.3) (2025-04-11)

- 🍱 更新下半卡池信息
- 💄 兑换码浮窗样式迭代
- 💄 帖子卡片添加图片数数据
- 💄 优化成就信息展示和样式
- 💄 帖子图片浮窗背景色同步
- 💄 调整通用backupText组件样式
- 💄 调整回复浮窗样式
- 💄 角色详情调整满好感区分
- 💄 优化角色武器Wiki样式
- 🚸 重构素材日历日期切换逻辑
- 🚸 优化图片下载路径&提示
- 🚸 支持其他分区兑换码获取
- 🚸 收藏页select-mode下阻止所有点击

## [0.7.2](https://github.com/BTMuli/TeyvatGuide/releases/v0.7.2) (2025-03-27)

- 🍱 更新5.5资源 [`#147`](https://github.com/BTMuli/TeyvatGuide/issues/147)
- ✨ 新增游戏签到脚本
- ✨ 扫码登录新增游戏登录方式
- ✨ 获取登录用户关注帖子
- 🐛 修复获取深渊数据概览异常
- 🐛 修复扫码登录异常
- ♻️ 首页卡池&活动组件重构
- ♻️ 重构游戏账号数据库
- ♻️ 调用浏览器而非webview2打开外部链接
- 💄 帖子卡片UI调整，增加时间&推荐理由数据
- 💄 调整整体滚动条样式
- 💄 调整抽奖UI
- 💄 米游币脚本显示连续执行天数
- 💄 帖子投票组件进度条显示相对进度（以最高数为基准）
- 💄 调整多页面UI
- 🎨 重构合集浮窗滚动高度计算
- 🎨 调整帖子卡片点击处理
- 🚸 处理下线villaCard渲染
- 🚸 即时响应页面适配
- 🚸 完善部分请求防抖处理
- 🚸 链接识别`ys.mihoyo.com`

## [0.7.1](https://github.com/BTMuli/TeyvatGuide/releases/v0.7.1) (2025-03-06)

- 🐛 修复B站视频时长计算异常
- 🐛 处理脚本签到1034 [`#145`](https://github.com/BTMuli/TeyvatGuide/issues/145)
- 💄 调整搜索浮窗样式&帖子/公告卡片样式
- 🥅 捕获分享图生成异常
- 🚸 部分页面添加防抖处理
- 🍱 调整缓存图片范围

## [0.7.0](https://github.com/BTMuli/TeyvatGuide/releases/v0.7.0) (2025-02-28)

- ✨ 新增无痕浏览配置，默认开启
- ✨ 登录状态且关闭无痕浏览时，可对帖子进行点赞操作
- ✨ 新增实用脚本页面，支持一键完成米游币每日任务 [`#144`](https://github.com/BTMuli/TeyvatGuide/issues/144)
- 🐛 修复公告解析异常
- 🐛 修复角色卡片视图（详细）浮窗切换时背景图更新异常
- 🐛 修复路由跳转不生效
- ♻️ 重构首页素材日历组件生日计算，修复生日计算异常
- 🚸 设置页登录二维码支持生成分享图，点击底部图标触发
- 💄 调整首页素材日历组件可视页码
- 💄 调整部分页面UI
- 🍱 更新下半卡池数据
