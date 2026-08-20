# Fluent 2 Tokens（已核验）

数值来源：fluent2.microsoft.design（shapes / typography / layout）与 `@fluentui/tokens` 官方 token
pipeline（灰阶、品牌色阶、alias 语义 token）。

## 中性灰阶

| Token    | Hex       | 主要用途                                                                  |
| -------- | --------- | ------------------------------------------------------------------------- |
| grey[4]  | `#0a0a0a` | 深色背景层级 4                                                            |
| grey[8]  | `#141414` | 深色背景层级 3                                                            |
| grey[12] | `#1f1f1f` | 深色背景层级 2                                                            |
| grey[14] | `#242424` | 浅色 `colorNeutralForeground1`                                            |
| grey[16] | `#292929` | 深色 `colorNeutralBackground1`；浅色 `colorNeutralBackgroundInverted`     |
| grey[18] | `#2e2e2e` | 深色 `colorSubtleBackgroundPressed`                                       |
| grey[20] | `#333333` | 深色 `colorSubtleBackgroundSelected`；浅色 `colorNeutralBackgroundStatic` |
| grey[22] | `#383838` | 深色 `colorSubtleBackgroundHover`                                         |
| grey[24] | `#3d3d3d` | 深色 `colorNeutralBackgroundStatic`、`colorNeutralStroke3`                |
| grey[26] | `#424242` | 浅色 `colorNeutralForeground2`                                            |
| grey[32] | `#525252` | 深色 `colorNeutralStroke2`                                                |
| grey[36] | `#5c5c5c` | 深色 `colorNeutralForegroundDisabled`                                     |
| grey[38] | `#616161` | 浅色 `colorNeutralForeground3`、`colorNeutralStrokeAccessible`            |
| grey[40] | `#666666` | 深色 `colorNeutralStroke1`                                                |
| grey[44] | `#707070` | 浅色 `colorNeutralForeground4`                                            |
| grey[68] | `#adadad` | 深色 `colorNeutralForeground3`、`colorNeutralStrokeAccessible`            |
| grey[74] | `#bdbdbd` | 浅色 `colorNeutralForegroundDisabled`                                     |
| grey[82] | `#d1d1d1` | 浅色 `colorNeutralStroke1`                                                |
| grey[84] | `#d6d6d6` | 深色 `colorNeutralForeground2`                                            |
| grey[88] | `#e0e0e0` | 浅色 `colorNeutralStroke2`、`colorSubtleBackgroundPressed`                |
| grey[92] | `#ebebeb` | 浅色 `colorNeutralBackground5`、`colorSubtleBackgroundSelected`           |
| grey[94] | `#f0f0f0` | 浅色 `colorNeutralBackground4`、`colorNeutralStroke3`                     |
| grey[96] | `#f5f5f5` | 浅色 `colorNeutralBackground3`、`colorSubtleBackgroundHover`              |
| grey[98] | `#fafafa` | 浅色 `colorNeutralBackground2`                                            |

## 品牌色阶（brandWeb）

| Step | Hex       | Step | Hex       |
| ---- | --------- | ---- | --------- |
| 10   | `#061724` | 90   | `#2886de` |
| 20   | `#082338` | 100  | `#479ef5` |
| 30   | `#0a2e4a` | 110  | `#62abf5` |
| 40   | `#0c3b5e` | 120  | `#77b7f7` |
| 50   | `#0e4775` | 130  | `#96c6fa` |
| 60   | `#0f548c` | 140  | `#b4d6fa` |
| 70   | `#115ea3` | 150  | `#cfe4fa` |
| 80   | `#0f6cbd` | 160  | `#ebf3fc` |

## 关键语义 token（alias）

| 语义 token                     | Light               | Dark                 |
| ------------------------------ | ------------------- | -------------------- |
| colorNeutralBackground1        | `#ffffff`           | grey[16] `#292929`   |
| colorNeutralBackground2        | grey[98] `#fafafa`  | grey[12] `#1f1f1f`   |
| colorNeutralBackground3        | grey[96] `#f5f5f5`  | grey[8] `#141414`    |
| colorNeutralBackground4        | grey[94] `#f0f0f0`  | grey[4] `#0a0a0a`    |
| colorNeutralBackground5        | grey[92] `#ebebeb`  | `#000000`            |
| colorNeutralBackgroundInverted | grey[16] `#292929`  | `#ffffff`            |
| colorNeutralBackgroundStatic   | grey[20] `#333333`  | grey[24] `#3d3d3d`   |
| colorSubtleBackgroundHover     | grey[96] `#f5f5f5`  | grey[22] `#383838`   |
| colorSubtleBackgroundPressed   | grey[88] `#e0e0e0`  | grey[18] `#2e2e2e`   |
| colorSubtleBackgroundSelected  | grey[92] `#ebebeb`  | grey[20] `#333333`   |
| colorNeutralForeground1        | grey[14] `#242424`  | `#ffffff`            |
| colorNeutralForeground2        | grey[26] `#424242`  | grey[84] `#d6d6d6`   |
| colorNeutralForeground3        | grey[38] `#616161`  | grey[68] `#adadad`   |
| colorNeutralForegroundDisabled | grey[74] `#bdbdbd`  | grey[36] `#5c5c5c`   |
| colorBrandForegroundLink       | brand[70] `#115ea3` | brand[100] `#479ef5` |
| colorCompoundBrandForeground1  | brand[80] `#0f6cbd` | brand[100] `#479ef5` |
| colorBrandBackground           | brand[80] `#0f6cbd` | brand[70] `#115ea3`  |
| colorBrandBackgroundHover      | brand[70] `#115ea3` | brand[80] `#0f6cbd`  |
| colorBrandBackgroundPressed    | brand[40] `#0c3b5e` | brand[40] `#0c3b5e`  |
| colorBrandBackgroundSelected   | brand[60] `#0f548c` | brand[60] `#0f548c`  |
| colorNeutralStroke1            | grey[82] `#d1d1d1`  | grey[40] `#666666`   |
| colorNeutralStroke2            | grey[88] `#e0e0e0`  | grey[32] `#525252`   |
| colorNeutralStroke3            | grey[94] `#f0f0f0`  | grey[24] `#3d3d3d`   |
| colorNeutralStrokeAccessible   | grey[38] `#616161`  | grey[68] `#adadad`   |

## 排版（web type ramp）

| 名称        | 字重                      | 字号 / 行高 |
| ----------- | ------------------------- | ----------- |
| Caption 2   | Regular / Semibold        | 10px / 14px |
| Caption 1   | Regular / Semibold / Bold | 12px / 16px |
| Body 1      | Regular / Semibold / Bold | 14px / 20px |
| Subtitle 2  | Semibold                  | 16px / 22px |
| Subtitle 1  | Semibold                  | 20px / 26px |
| Title 3     | Semibold                  | 24px / 32px |
| Title 2     | Semibold                  | 28px / 36px |
| Title 1     | Semibold                  | 32px / 40px |
| Large Title | Semibold                  | 40px / 52px |
| Display     | Semibold                  | 68px / 92px |

## 间距（4px 基准）

| Token    | px  | Token   | px  |
| -------- | --- | ------- | --- |
| sizeNone | 0   | size160 | 16  |
| size20   | 2   | size200 | 20  |
| size40   | 4   | size240 | 24  |
| size60   | 6   | size280 | 28  |
| size80   | 8   | size320 | 32  |
| size100  | 10  | size360 | 36  |
| size120  | 12  | size400 | 40  |

## 圆角

| Token   | 值   | 用途                       |
| ------- | ---- | -------------------------- |
| None    | 0    | 导航栏、tab bar            |
| Small   | 2px  | 小徽章                     |
| Medium  | 4px  | 按钮、输入框、下拉（默认） |
| Large   | 8px  | 大按钮、卡片               |
| X-Large | 12px | 弹窗、菜单、popover        |
| Circle  | 50%  | 头像                       |

## 描边与阴影

- 描边：Thin 1px（默认）、Thick 2px（强调）、Thicker 3px、Thickest 4px。
- 浅色阴影：ambient `rgba(0,0,0,0.12)`、key `rgba(0,0,0,0.14)`；深色下转用白色系阴影
  （仓库 `--common-shadow-t-*`）。

## 仓库变量映射（语义对应，非逐像素相等）

| Fluent 语义                | 仓库浅色变量                          | 仓库深色变量                          |
| -------------------------- | ------------------------------------- | ------------------------------------- |
| colorNeutralBackground1    | `--app-page-bg`（`#ffffff`）          | `--app-page-bg`（`#1e1e1e`）          |
| colorNeutralBackground3/4  | `--app-side-bg`（`#f2f2f2`）          | `--app-side-bg`（`#151c26`）          |
| colorNeutralForeground1    | `--app-page-content`（`#2f2f2f`）     | `--app-page-content`（`#d0d0d0`）     |
| colorNeutralForeground1/2  | `--common-text-title`、`--box-text-1` | `--common-text-title`、`--box-text-1` |
| colorSubtleBackgroundHover | `--box-bg-4`（`#f5f5f5`）             | `--box-bg-4`（`#3d424b`）             |
| 品牌强调                   | `--tgc-yellow-*`（原神黄）或 brand 蓝 | 同左（深浅档位不同）                  |

## 自检清单

- 每个新颜色都同时定义了浅色与深色主题变量。
- 正文对比度 ≥ 4.5:1，大号文本 ≥ 3:1。
- 间距均为 4 的倍数（图标对齐除外）。
- 圆角只使用 0/2/4/8/12/50% 档位。
- 组件引用语义变量，无裸色值散落组件内。
- hover / pressed / selected 状态都给出对应背景或描边。
- 仅 `generateShareImg` 的分享 DOM 无 `color-mix()`；`TGShare.modern` 不受此限。
