---
name: fluent2-design
description: Apply the Fluent 2 UI/UX design language to TeyvatGuide's Vue/Vuetify interface. Use when designing, building, or reviewing UI visuals in this repository — colors, typography, spacing, corner radius, borders, elevation, and component styling — or when mapping Fluent 2 tokens onto the existing CSS variables and Vuetify components.
---

# Fluent 2 设计规范

以 Microsoft Fluent 2 为视觉语言基础，应用于 TeyvatGuide 的 Vue + Vuetify + SCSS 界面。保持仓库
现有的原神身份（Genshin 主题色、字体），在结构、层级、交互状态与排版节奏上对齐 Fluent 2。

## 核心原则

1. 语义优先：用语义 token 表达「背景/前景/描边/品牌」，不直接使用裸色值。
2. 中性色主导：界面以中性灰阶为主，品牌色只用于强调、链接与选中态。
3. 4px 间距系统：间距与内边距取 4 的倍数（2/6/10 仅用于图标对齐）。
4. 圆角克制：默认 4px，小元素 2px，大面板 8px，浮层 12px，不滥用胶囊形。
5. 深浅双主题：每个颜色同时给出浅色与深色语义值，禁止只验证浅色。

## 颜色

- 中性灰阶与品牌色阶见 [references/tokens.md](references/tokens.md)，数值已按官方 token pipeline 核验。
- 优先复用仓库现有变量：`--tgc-*`、`--app-*`、`--box-*`、`--common-*`（定义于
  `src/assets/index.scss`、`src/assets/themes/default.scss`、`src/assets/themes/dark.scss`）。
- 需要新颜色时，在主题文件中定义语义变量（如 `--app-page-bg`），组件内引用变量而非硬编码色值。
- 品牌强调色：保留原神黄色系（`--tgc-yellow-*`）作为品牌色，对应 Fluent 的 brand ramp；需要更中性的
  品牌感时，使用 Fluent brand 蓝（70=`#115ea3`、80=`#0f6cbd`）。
- 正文对比度：正文 ≥ 4.5:1，大号文本（≥24px 常规或 ≥18.5px 加粗）≥ 3:1。

## 排版

- 沿用仓库字体变量 `--font-text` / `--font-title`（JetBrains Mono + Genshin），不引入 Segoe UI。
- 字号与行高按 Fluent web type ramp：正文 14px/20px，次级 12px/16px，副标题 16px/22px 起，标题
  24–32px；标题用 Semibold（600），正文 Regular（400）。
- 文案使用 sentence case，不用全大写强调。

## 间距

- 以 4px 为基准：8/12/16/20/24/32 是常用档位；组件内 8–12px，卡片内 16px，页面区块 24–32px。
- 用间距建立分组关系，优先留白而不是画分隔线。

## 圆角与描边

- 圆角：按钮/输入框/下拉 4px（Medium）；小徽章 2px（Small）；大按钮/卡片 8px（Large）；弹窗、菜单、
  popover 12px（X-Large）；头像 50%（Circle）。
- 贴屏幕边缘的组件可去掉圆角；同一容器内多元素拼接处避免内圆角。
- 描边：默认 1px；强调态 2px；分隔线用弱描边（stroke2/stroke3），输入框边框用 `colorNeutralStroke1`。

## 组件（Vuetify）

- Vuetify 组件圆角取 4/8/12 对应档位，普通按钮不 pill 化。
- 主操作按钮用品牌色填充（hover/pressed 用 brand ramp 相邻档位），次要操作使用 outline/subtle 样式。
- 列表与卡片的 hover/selected 背景使用 subtle background 档位（浅色 hover=`#f5f5f5`，深色
  hover=`#383838`），不用整块高饱和色。
- 浮层使用 12px 圆角并配合浅阴影。

## 深浅主题

- `html.default`（浅色）与 `html.dark`（深色）两个主题同时更新，禁止只改一处。
- 深色背景用 grey[8..16] 系列，浅色背景用 white 与 grey[92..98] 系列；语义相反不要硬翻转色值。
- 阴影：浅色下用黑色阴影，深色下用高透明白色阴影（仓库 `--common-shadow-t-*`）。

## 分享截图约束

- 会由 html2canvas 捕获并生成分享截图的 DOM 不得使用 `color-mix()`，也不得复用内部含 `color-mix()`
  的 SCSS 封装；获取分享 DOM 使用原生 `querySelector` 或 `useTemplateRef`。

## 验证

- 样式改动后运行 `pnpm lint:style`；涉及组件/类型运行 `pnpm lint-vue`。
- 桌面 UI 用 `../tauri-mcp-cli/SKILL.md` 连接 debug 窗口，分别截图检查浅色与深色主题。
- 对照 [references/tokens.md](references/tokens.md) 的「自检清单」逐项核对：对比度、圆角档位、间距倍数、
  双主题覆盖、语义 token 使用。
