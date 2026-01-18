---
Author: 目棃
Description: CHANGELOG
Date: 2025-09-09
Update: 2026-01-18
---

> 本文档 [`Frontmatter`](https://github.com/BTMuli/MuCli#Frontmatter) 由 [MuCli](https://github.com/BTMuli/Mucli) 自动生成于 `2025-09-09 14:30:56`
>
> 更新于 `2026-01-18 20:35:21`

## [0.9.2](https://github.com/BTMuli/TeyvatGuide/releases/v0.9.2) (2025-01-18)

- 🍱 增加旅行者衣装相关资源
- ✨ WIKI新增 `{LINK#xx}{/LINK}` 数据支持 [`#156`](https://github.com/BTMuli/TeyvatGuide/issues/156)
- ✨ 自动更新 Cookie [`#197`](https://github.com/BTMuli/TeyvatGuide/issues/197)
- 🐛 修复祈愿页面检测数据更新异常
- 🐛 修复特定情况下生成剧诗分享图时应用白屏
- 🐛 修复首页活动奖励点击异常
- 🐛 上传深渊记录时更新角色列表，以修复 `511001` 异常
- 🐛 调整五星 UP 判断逻辑，修复特定数据 UP 判断异常
- 🐛 修复微软应用商店版本材料&成就导入异常 [`#206`](https://github.com/BTMuli/TeyvatGuide/issues/206)
- 🚸 `loading` 组件随机加载图标
- 🚸 隐藏完成成就支持隐藏成就系列 [`#205`](https://github.com/BTMuli/TeyvatGuide/issues/205)
- 🚸 调整首页部分图片缓存策略
- 🚸 调整成就排序&搜索逻辑
- 🚸 添加用户反馈显示控制入口
- 🥅 修复文本放缩比读取异常，注册表不存在时返回 1.0
- ♻️ 祈愿页面导入功能合并，仅显示一个导入按钮
- 💄 深渊支持单楼层分享，剧诗支持单幕分享

## [0.9.1](https://github.com/BTMuli/TeyvatGuide/releases/v0.9.1) (2025-01-14)

- 🍱 元数据：更新6.3版本资源
- 🍱 元数据：精简部分材料来源描述
- 🍱 元数据：增加元素描述，如 `丝柯克` 为 `蛇之七变 冰`（修改前为`神之眼 冰`）
- 🍱 元数据：增加 `埃洛伊` `奇偶` 的红色背景并进行相应处理 [`#198`](https://github.com/BTMuli/TeyvatGuide/issues/198)
- ✏️ 修正文本，`咨讯` → `资讯`，感谢 [`@LuoYunXi0407`](https://github.com/LuoYunXi0407)
- ✨ 祈愿页面：过往祈愿支持查看抽卡记录，更新图源以提升加载速度 [`#188`](https://github.com/BTMuli/TeyvatGuide/issues/188)
- ✨ 背包物品：新增货币数据获取，支持删除记录
- ✨ 角色列表页面：重构筛选逻辑，增加 `等级`/`好感`/`命座` 排序
- ✨ 窗口回正增加文本放缩处理 [`#192`](https://github.com/BTMuli/TeyvatGuide/issues/192)
- ✨ 引入 [Sentry](https://sentry.io) 用于分析应用崩溃/异常，同步更新隐私政策
- ✨ 增加衣装相关资源 [`#190`](https://github.com/BTMuli/TeyvatGuide/issues/190)并在 `角色列表`/`角色图鉴` 进行展示。
- ✨ 胡桃深渊数据库回归，剧诗概览回归
- ✨ 支持通过命令行调用 [`#195`](https://github.com/BTMuli/TeyvatGuide/issues/195)
- ✨ 支持胡桃云账号 `登录`/`密码重置` 等操作，支持胡桃云祈愿记录 `上传`/`下载`/`删除` [`#202`](https://github.com/BTMuli/TeyvatGuide/issues/202)
- 🐛 修复程序最小化时托盘点击异常
- 🐛 修复 wcag-color 无法对比 keyword 导致的渲染异常
- 🐛 修复特定情况下管理员模式判断异常 [`#189`](https://github.com/BTMuli/TeyvatGuide/issues/189)
- 🐛 修复从网络图更新到本地图导致的渲染异常
- 🐛 尝试修复托盘图标初始化异常
- 🐛 重构首页组件加载逻辑，存储中间值，增加登录态判断 [`#200`](https://github.com/BTMuli/TeyvatGuide/issues/200)
- 🐛 修复通过 ck 登录没有即时刷新登录态
- 🐛 修复特定情况下 UAC 调用异常
- 🐛 补充缺失权限，修复浏览器跳转异常
- 🐛 修复数据库重置异常
- 🐛 修复部分帖子获取内容异常
- 🐛 修复修改分享阈值点击取消时的取值异常 [`#203`](https://github.com/BTMuli/TeyvatGuide/issues/203)
- 🐛 尝试修复调用内置 YAE 时特定条件下的匹配异常
- 🚸 重构侧边栏账号切换逻辑，降低交互次数
- 🚸 移除ck复制的确认浮窗
- 🚸 管理员模式下侧边栏启动使用YAE导入
- 🚸 背包物品页面：新增 `最近更新`/`最多数量`/`最少数量` 排序，调整默认排序逻辑，优化搜索处理 [`#196`](https://github.com/BTMuli/TeyvatGuide/issues/196)
- 🚸 修正月谕圣牌下的星章计算逻辑
- 🚸 调整Hakushi获取逻辑
- 🚸 首页组件：已完成活动置后，调整完成判断逻辑
- 🚸 调整部分弹窗提示 [`#201`](https://github.com/BTMuli/TeyvatGuide/issues/201)
- 🚸 调用内置 YAE 时检测本地游戏版本
- 💄 帖子详情：调整投票组件样式
- 💄 首页组件：调整首页生日组件交互
- 💄 首页签到组件：根据签到状态调整图标&文本
- 💄 角色列表页面：角色卡片显示等级
- 💄 幽境危战页面：调整顶部布局
- 💄 帖子组件：增加自定义表情 tag 在浅色模式下的清晰度
- 💄 设置页面：调整 `刷新页面设备信息` 交互
- 🌐 公告页面：处理国际化
- ♻️ 重构留影叙佳期页面，处理部分文本加载异常
- ♻️ 统一 UID 选取逻辑
- ♻️ 重构 WIKI 筛选组件筛选逻辑
- ♻️ 重构游戏启动逻辑，修复特定条件下的启动失败

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
