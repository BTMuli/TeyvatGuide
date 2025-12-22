---
Author: 目棃
Description: CHANGELOG
Date: 2025-09-09
Update: 2025-12-20
---

> 本文档 [`Frontmatter`](https://github.com/BTMuli/MuCli#Frontmatter) 由 [MuCli](https://github.com/BTMuli/Mucli) 自动生成于 `2025-09-09 14:30:56`
>
> 更新于 `2025-12-20 16:14:28`

## [0.9.0](https://github.com/BTMuli/TeyvatGuide/releases/v0.9.0) (2025-12-20)

- 🍱 更新卡池数据，修正卡池数据异常导致的UP错误 [`#175`](https://github.com/BTMuli/TeyvatGuide/issues/175)
- 🍱 更新千星资源，更新角色魔女的前夜礼数据
- 🔥 由于祈愿数据更新滞后性，移除内置游戏祈愿详情页面
- ✨ 支持背包物品导入（YAE），支持修改单个背包物品
- ✨ 首页添加游戏签到组件，支持补签 [`#178`](https://github.com/BTMuli/TeyvatGuide/issues/178)
- ✨ 应用支持托盘，设置页新增关闭到托盘配置项 [`#181`](https://github.com/BTMuli/TeyvatGuide/issues/181)
- ✨ 重构祈愿页面概览，添加UP抽数数据，采用Swiper切换卡池 [`#173`](https://github.com/BTMuli/TeyvatGuide/issues/173)
- ✨ 真境剧诗页面UI改版，显示讨伐列表&增益详情
- ✨ 深境螺旋页面UI改版，显示讨伐列表&地脉异常 [`#179`](https://github.com/BTMuli/TeyvatGuide/issues/179)
- ✨ 祈愿页面在元数据缺失条件下支持从外部获取物品ID [`#183`](https://github.com/BTMuli/TeyvatGuide/issues/183)
- ♻️ 重构YAE导入处理逻辑，同存档数据批量更新（成就，背包物品）
- ♻️ 调整常驻颂愿数据显示，祈愿概况UI迭代 [`#172`](https://github.com/BTMuli/TeyvatGuide/issues/172)
- ♻️ 重构千星祈愿页面，适配抽数共享逻辑 **该部分缺失测试数据，如有异常请向开发者反馈(QQ,Github)**
- ♻️ 重构祈愿数据备份处理，采用UIGF4，调整导入进度更新逻辑，兼容旧版本祈愿备份
- 🚸 米社脚本增加点赞后取消配置，显示持有米游币数量
- 🚸 **由于部分应用导出 UIGF 卡池类型异常**，放宽角色UP的判断逻辑
- 🚸 优化角色活动日历处理，支持更多类型活动，显示活动描述
- 🚸 角色添加release字段，调整WIKI角色页面排序 [`#180`](https://github.com/BTMuli/TeyvatGuide/issues/180)
- 🚸 祈愿页面新增数据检测功能用于修正数据库中物品ID为空的数据
- 🚸 米社视频组件适配窄视图，竖屏视频在窄视图下完整渲染
- 🚸 调整搜索悬浮窗尺寸，修正搜索参数判断逻辑
- 💄 多页面顶部样式调整，更为统一
- 💄 首页近期活动组件奖励支持查看角色/武器奖励
- 💄 首页近期活动组件奖励材料奖励支持查看已有数量
- 💄 材料图鉴 UI 改版
