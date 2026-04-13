---
Author: 目棃
Description: CHANGELOG
Date: 2025-09-09
Update: 2026-04-08
---

> 本文档 [`Frontmatter`](https://github.com/BTMuli/MuCli#Frontmatter) 由 [MuCli](https://github.com/BTMuli/Mucli) 自动生成于 `2025-09-09 14:30:56`
>
> 更新于 `2026-04-08 11:36:37`

# CHANGELOG v0.9.x

> 本文仅记录 v0.9.x 版本的更新内容

## [0.9.9](https://github.com/BTMuli/TeyvatGuide/releases/v0.9.8) (2026-04-08)

- 🍱 更新 6.5 版本游戏资源
- ✨ 添加用户个人页面跳转
- ✨ 增强图片浮窗功能，添加缩放和拖拽支持
- ✨ 添加帖子详情请求限流 [`#233`](https://github.com/BTMuli/TeyvatGuide/issues/233)
- ✨ 剧诗页面添加简略模式切换功能，优化战斗和卡片展示
- 💫 帖子窗口部分按钮添加交互效果
- 🐛 调整snackbar层级，修复兑换码浮窗分享异常
- 🐛 修复角色生日判断逻辑异常，优化返回结果
- 🐛 完善游戏启动ticket请求异常处理，隐藏请求成功后的详细ticket显示
- 🚸 管理员模式下侧边栏启动仍然为启动游戏
- 🚸 统一UIGF导出交互，导出前选择导出路径
- 🚸 添加深渊、剧诗、危战 JSON Schema 验证规则
- 🚸 扫码登录浮窗添加提示，防止用户误解

## [0.9.8](https://github.com/BTMuli/TeyvatGuide/releases/v0.9.8) (2026-03-13)

- 🍱 更新下半卡池数据
- 🐛 处理UI框架升级导致的分享图生成异常
- 🐛 修复采用ck登录后本地ck未同步更新
- ✏️ 修正深渊最深抵达描述计算逻辑
- ⚡️大幅提升UIGF导入速度 [`#222`](https://github.com/BTMuli/TeyvatGuide/issues/222)
- ✨ 角色列表页展示当前筛选&排序
- ✨ 定时检测版本更新并提醒 [`#231`](https://github.com/BTMuli/TeyvatGuide/issues/231)
- 🔒️ 调整用户数据目录选取&旧目录删除处理，增加子目录检测&二次确认 [`#228`](https://github.com/BTMuli/TeyvatGuide/issues/228)
- 🚸 导入胡桃深渊/剧诗/危战数据前进行提示
- 🚸 设置页刷新信息允许仅刷新Cookie而不刷新游戏账号
- 🚸 搜索框增加清空按钮，并进行对应适配处理
- 🚸 完善非回正模式下的窗口位置&大小处理 [`#199`](https://github.com/BTMuli/TeyvatGuide/pull/199) [`#223`](https://github.com/BTMuli/TeyvatGuide/pull/223)
- 🚸 实用脚本支持一键执行多账号 by [HLFromZ](https://github.com/BTMuli/TeyvatGuide/pull/227)
- 🚸 角色列表页新增`等级>=70`筛选 [`#229`](https://github.com/BTMuli/TeyvatGuide/issues/229)
- 🚸 角色列表页新增满好感筛选
- 🚸 处理帖子标题为空时的渲染&事件
- 🚸 调整部分图片缓存策略
- 🚸 增加个人主页&合集主页的外部跳转
- 💄 优化调整多处样式 [`#221`](https://github.com/BTMuli/TeyvatGuide/issues/221)
- 💄 调整展开后的侧边栏宽度
- 💄 自定义表情：调整浮窗信息显示逻辑，优化自定义表情label显示判断

## [0.9.7](https://github.com/BTMuli/TeyvatGuide/releases/v0.9.7) (2026-02-26)

- 🐛 修复脚本页面账号切换异常
- 🚸 调整游戏安装目录选取逻辑，调整大小写处理 [`#219`](https://github.com/BTMuli/TeyvatGuide/issues/219)
- 💄 替换部分侧边栏图标
- 💄 调整浅色模式下滚动条可见度
- 💄 调整部分页面UI

## [0.9.6](https://github.com/BTMuli/TeyvatGuide/releases/v0.9.6) (2026-02-26)

- 🍱 更新6.4版本资源
- ✨ 剧诗页新增绘想游迹&月谕圣牌浮窗
- 👽️ 升级 UI 框架至 Vuetify4
- ♻️ 重构多页面用户数据加载&刷新逻辑，大幅提升多账号用户体验
- 🐛 修复浮窗高度异常抖动导致的子回复加载异常
- 🐛 修复特定条件下的渲染异常
- 🐛 完善分享设置输入校验，剔除非正整数输入
- 🚸 版本更新后重置反馈按钮显示
- 🚸 调用内置YAE时检测游戏本体是否启动
- 🚸 更换祈愿字典数据源，由Hakushi变更为Yatta
- 🚸 替换帖子卡片版块图标数据源，修复可能出现的版块图标渲染异常
- 🚸 优化回正相关处理
- 💄 调整侧边栏，溢出滚动
- 💄 帖子详情显示 `vod` 组件占位
- 💄 当存在战绩数据时角色列表用户信息采用对应数据进行渲染
- 💄 首页限时祈愿组件卡池角色超过4个时采用Swiper进行轮播
- 💄 调整 Snackbar 层级 [`#218`](https://github.com/BTMuli/TeyvatGuide/issues/218)

## [0.9.5](https://github.com/BTMuli/TeyvatGuide/releases/v0.9.5) (2026-02-08)

- ✨ 重构UIGF导入导出备份恢复，支持UIGF4.2
- 🍱 精简颂愿元数据
- 🐛 由于Gt4配置变更，修复验证码登录时极验未正确触发
- 🐛 保存用户信息采用参数绑定，修复特殊数据导致的sql拼接异常
- 🐛 将ck更新逻辑移至首页，修复ck自动更新异常
- 🐛 修正剧诗概况星章计算逻辑
- 💄 调整战绩数据总览样式，更为紧凑
- 💄 处理特定武器没有副属性时的渲染
- 💄 修复集录祈愿卡池渲染异常
- 💄 调整剧诗详情布局，统一比例 2/1
- 💄 调整签到组件额外奖励样式，处理额外奖励点击
- 🚸 暴露成就系列完成百分比，1位小数
- 🚸 优化当前选中成就系列区分度
- 🚸 深渊上传成功后自动刷新胡桃云用户信息
- 🚸 修复图片质量调整特定条件下浮窗异常关闭 [`#207`](https://github.com/BTMuli/TeyvatGuide/issues/207)
- 🚸 自定义表情加载失败点击重新加载
- 🚸 优化祈愿垫数展示UI

## [0.9.4](https://github.com/BTMuli/TeyvatGuide/releases/v0.9.4) (2026-01-22)

- 🐛 修复`msi`版本导入`dll`调用路径异常，捕获`dll`路径异常错误
- 🎨 调整商店版本`dll`检测逻辑，存在时不复制
- 🚸 调整导入相关提示文本

## [0.9.3](https://github.com/BTMuli/TeyvatGuide/releases/v0.9.3) (2026-01-19)

- 🐛 修复导入调用参数异常
- 🚸 设置页胡桃云用户信息刷新防抖处理

## [0.9.2](https://github.com/BTMuli/TeyvatGuide/releases/v0.9.2) (2026-01-18)

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

## [0.9.1](https://github.com/BTMuli/TeyvatGuide/releases/v0.9.1) (2026-01-14)

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
