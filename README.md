---
Author: 目棃
Description: 说明文档
Date: 2023-03-05
Update: 2023-09-27
---

> 本文档 [`Frontmatter`](https://github.com/BTMuli/MuCli#Frontmatter) 由 [MuCli](https://github.com/BTMuli/Mucli) 自动生成于 `2023-03-05 14:41:55`
>
> 更新于 `2023-09-27 08:43:41`

![](https://img.shields.io/github/last-commit/BTMuli/TeyvatGuide?style=for-the-badge) ![](https://img.shields.io/github/commits-since/BTMuli/TeyvatGuide/latest?include_prereleases&style=for-the-badge)

![](https://img.shields.io/badge/UIAF-v1.1-orange?style=for-the-badge) ![](https://img.shields.io/badge/UIGF-v2.3-red?style=for-the-badge) ![](https://img.shields.io/github/license/BTMuli/TeyvatGuide?style=for-the-badge)

# Teyvat Guide

基于 Tauri 的原神助手应用。

A Genshin Impact assistant app based on Tauri.

## 声明 / Declaration

本项目仅供个人学习交流使用。请勿用于任何商业或违法违规用途。

本项目涉及到的隐私数据，如 Cookie、Token 等，仅用于获取相关数据，不会被上传至任何服务器。

深渊页面的上传功能，采用的是 [Hutao API](https://hut.ao/zh/development/platform.html) 提供的接口，仅上传如下数据：

- 用户的游戏 UID
- 用户的深境螺旋记录
- 用户的角色信息及其装备的武器和圣遗物信息

该功能为用户主动上传，不会在用户不知情的情况下上传数据。

## 下载 / Download

> 程序已经通过微软商店审核，可以直接在商店下载。

<a href="https://apps.microsoft.com/store/detail/9NLBNNNBNSJN?launch=true&cid=BTMuli&mode=mini">
	<img src="https://get.microsoft.com/images/zh-cn%20dark.svg" alt="download"/>
</a>

> 不推荐通过 GitHub Release 下载，但仍保留了该功能。

[![GitHub release (latest by date including pre-releases)](https://img.shields.io/github/v/release/BTMuli/TeyvatGuide?include_prereleases&style=for-the-badge)](https://github.com/BTMuli/TeyvatGuide/releases/latest)

## 技术栈 / Tech Stack

- [Tauri](https://github.com/tauri-apps/tauri)
- [Vue3](https://github.com/vuejs/core)
- [Vite](https://github.com/vitejs/vite)
- [TypeScript](https://github.com/microsoft/TypeScript)
- [Vuetify](https://github.com/vuetifyjs/vuetify)
- [Echarts](https://echarts.apache.org/zh/index.html)

## 功能 / Features

- 免登陆功能：

  - [x] 当前卡池、近期活动、素材日历
  - [x] 游戏内公告&活动获取
  - [x] 米游社官方帖获取（支持通过 ID 获取）
  - [x] 成就管理（UIAF），支持 [`YaeAchievement`](https://github.com/HolographicHat/YaeAchievement) 导入
  - [x] 祈愿管理（UIGF）

- 登陆功能：

  - [x] 原神战绩数据获取
  - [x] 角色列表数据获取
  - [x] 螺旋深渊数据获取
  - [x] 祈愿数据获取（近半年）

- Wiki 功能：

  - [x] 深渊数据库（Hutao API）
  - [x] 角色数据库（开发中）
  - [x] 武器数据库（开发中）
  - [x] 卡牌数据库（开发中）

- 应用功能：
  - [x] 浅色/深色主题切换

## 仓库概况 / Repo Stats

![Status](https://repobeats.axiom.co/api/embed/0edac184a5892f2520e83e3fe6519c4168db2e1b.svg "Repobeats analytics image")

## UI 参考 / UI Reference

- [Snap.Hutao](https://github.com/DGP-Studio/Snap.Hutao)
- [StarWard](https://github.com/Scighost/Starward)
- [米游社](https://www.miyoushe.com/ys/)
- [原神](https://yuanshen.com/)

## 相关文档 / Docs

- Changelog: [CHANGELOG](CHANGELOG.md)
- 资源来源：[项目资源说明](docs/项目资源说明.md)
- UIAF：[UIAF v1.1](docs/UIAF.md)
- UIGF：[UIGF v2.3](docs/UIGF.md)

## 贡献者 / Contributors

- [BTMuli](https://github.com/BTMuli)
- [舰队的偶像岛风酱！](https://github.com/frg2089)
- [jerry765](https://github.com/jerry765)

## 协议 / License

项目基于 [MIT](LICENSE) 协议开源。

应用版本号遵循 [Semantic Versioning 2.0.0](https://semver.org/lang/zh-CN/) 规范。

## 鸣谢 / Thanks

本项目在开发过程中参考了诸多相关开源项目，特此鸣谢。

- [UIGF Organization](https://github.com/UIGF-org)
- [Snap.Hutao](https://github.com/DGP-Studio/Snap.Hutao)
- [StarWard](https://github.com/Scighost/Starward)
- [xunkong](https://github.com/xunkong/xunkong)
- [gs-helper](https://github.com/vikiboss/gs-helper)
- [paimon-moe](https://github.com/MadeBaruna/paimon-moe)
- [Adachi-BOT](https://github.com/Arondight/Adachi-BOT)
