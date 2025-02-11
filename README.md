---
Author: 目棃
Description: 说明文档
Date: 2023-03-05
Update: 2025-02-11
---

> 本文档 [`Frontmatter`](https://github.com/BTMuli/MuCli#Frontmatter) 由 [MuCli](https://github.com/BTMuli/Mucli) 自动生成于 `2023-03-05 14:41:55`
>
> 更新于 `2025-02-11 10:55:00`

![](https://img.shields.io/github/last-commit/BTMuli/TeyvatGuide?style=for-the-badge) ![](https://img.shields.io/github/commits-since/BTMuli/TeyvatGuide/latest?include_prereleases&style=for-the-badge)

![](https://img.shields.io/badge/UIAF-v1.1-orange?style=for-the-badge) ![](https://img.shields.io/badge/UIGF-v3.0-red?style=for-the-badge) ![](https://img.shields.io/badge/UIGF-v4.0-red?style=for-the-badge) ![](https://img.shields.io/github/license/BTMuli/TeyvatGuide?style=for-the-badge)

<div style="width: 100%; text-align: center; margin: 0 auto;">
  <img alt="icon" src="https://s2.loli.net/2023/10/19/Y5DpBQRy3usLHEb.png" />
</div>

# Teyvat Guide

基于 Tauri 的原神工具应用，支持 Windows 和 macOS 平台。

Game Tool for Genshin Impact player, supports Windows and macOS.

## 下载 / Download

> 程序已经通过微软商店审核，可以直接在商店下载。

<a href="https://apps.microsoft.com/store/detail/9NLBNNNBNSJN?launch=true&cid=BTMuli&mode=mini">
	<img src="https://get.microsoft.com/images/zh-cn%20dark.svg" alt="download"/>
</a>

> macOS 用户可以通过 Github Release 下载，可能需要[额外操作](docs/macos-gatekeeper/README.md)以打开。

> macOS users could download the app from GitHub release, [extra steps](docs/macos-gatekeeper/README-EN.md) are needed to open the app.

[![GitHub release (latest by date)](https://img.shields.io/github/v/release/BTMuli/TeyvatGuide?style=for-the-badge)](https://github.com/BTMuli/TeyvatGuide/releases/latest)

## 仓库概况 / Repo Stats

![Status](https://repobeats.axiom.co/api/embed/345d4bae5dc7e5184af4452b9dad01a671e220b3.svg "Repobeats analytics image")

## 功能 / Features

- 免登陆功能：

  - [x] 当前卡池、近期活动、素材日历
  - [x] 游戏内公告&活动获取
  - [x] 米游社官方帖获取（支持通过 ID 获取）
  - [x] 米游社各分区帖子获取（支持通过 ID 获取）
  - [x] 米游社话题帖子获取（通过话题点击跳转）
  - [x] 成就管理（UIAF v1.1），支持 [`YaeAchievement`](https://github.com/HolographicHat/YaeAchievement) 导入
  - [x] 祈愿管理（UIGF v3.0，UIGF v4.0）
  - [x] 留影叙佳期画片查看
  - [x] 帖子收藏
  - [x] 帖子评论查看&分享

- 登陆功能：

  > 支持 扫码/验证码/Cookie 登陆，支持多账号管理

  - [x] 原神战绩数据获取
  - [x] 角色详情数据获取
  - [x] 螺旋深渊数据获取
  - [x] 真境剧诗数据获取
  - [x] 祈愿数据获取（近一年）
  - [x] 用户收藏帖子获取

- Wiki 功能：

  - [x] 深渊数据库（Hutao API）
  - [x] 角色图鉴
  - [x] 武器图鉴
  - [x] 名片图鉴
  - [x] 材料图鉴

- 应用功能：
  - [x] 浅色/深色主题切换
  - [x] 米游社 JSBridge

## 贡献者 / Contributors

- [BTMuli](https://github.com/BTMuli)
- [舰队的偶像岛风酱！](https://github.com/frg2089)
- [jerry765](https://github.com/jerry765)
- [AuroraZiling](https://github.com/AuroraZiling)

## UI 参考 / UI Reference

- [Snap.Hutao](https://github.com/DGP-Studio/Snap.Hutao)
- [Starward](https://github.com/Scighost/Starward)
- [米游社](https://www.miyoushe.com/ys/)
- [原神](https://yuanshen.com/)

## 相关文档 / Docs

- Changelog: [CHANGELOG](CHANGELOG.md)
- 资源来源：[项目资源说明](docs/项目资源说明.md)
- UIAF：[UIAF v1.1](docs/UIAF.md)
- UIGF：[UIGF v3.0](docs/UIGF3.md)，[UIGF v4.0](docs/UIGF.md)
- [macOS 平台门禁属性导致应用无法打开应用的修复指引](docs/macos-gatekeeper/README.md)

## 特定项目 / Special Project

- [MuCli](https://github.com/BTMuli/MuCli)：基于 NodeJS 的命令行工具，用于生成项目文档。
- [TGAssistant](https://github.com/BTMuli/TGAssistant)：Teyvat Guide 的资源获取、解析、处理仓库。
- [WhiteTea](https://github.com/BTMuli/WhiteTea)：Github Bot，（半）自动化处理 Teyvat Guide 的 Issue 和 Pull Request。

## 技术栈 / Tech Stack

- [Tauri](https://github.com/tauri-apps/tauri)
- [Vue3](https://github.com/vuejs/core)
- [Vite](https://github.com/vitejs/vite)
- [Vuetify](https://github.com/vuetifyjs/vuetify)

## 第三方组件 / Plugins

- [Ajv](https://github.com/ajv-validator/ajv/)：用于校验UIAF&UIGF导入数据
- [Artplayer](https://artplayer.org/)：用于米游社帖子视频播放解析
- [Echarts](https://echarts.apache.org/zh/index.html)：用于祈愿概览图生成
- [Html2Canvas](https://github.com/niklasvh/html2canvas)：用于分享图生成

## 协议 / License

项目基于 [MIT](LICENSE) 协议开源。

应用版本号遵循 [Semantic Versioning 2.0.0](https://semver.org/lang/zh-CN/) 规范。

隐私政策：[Privacy](https://app.btmuli.ink/docs/TeyvatGuide/privacy.html)

## 鸣谢 / Thanks

本项目在开发过程中参考了诸多相关开源项目，特此鸣谢。

- [UIGF Organization](https://github.com/UIGF-org)
- [Snap.Hutao](https://github.com/DGP-Studio/Snap.Hutao)
- [StarWard](https://github.com/Scighost/Starward)
- [xunkong](https://github.com/xunkong/xunkong)
- [gs-helper](https://github.com/vikiboss/gs-helper)
- [paimon-moe](https://github.com/MadeBaruna/paimon-moe)
- [Adachi-BOT](https://github.com/Arondight/Adachi-BOT)
- [amos-data](https://github.com/yuehaiteam/amos-data)

感谢 JetBrains 提供的开源许可证。

![JetBrains logo](https://resources.jetbrains.com/storage/products/company/brand/logos/jetbrains.png)

[![Star History Chart](https://api.star-history.com/svg?repos=BTMuli/TeyvatGuide&type=Timeline)](https://star-history.com/#BTMuli/TeyvatGuide&Timeline)
