---
Author: 目棃
Description: CHANGELOG
Date: 2026-04-13
Update: 2026-06-10
---

> 本文档 [`Frontmatter`](https://github.com/BTMuli/MuCli#Frontmatter) 由 [MuCli](https://github.com/BTMuli/Mucli) 自动生成于 `2026-04-13 12:28:20`
>
> 更新于 `2026-06-10 21:17:06`

## [0.10.4](https://github.com/BTMuli/TeyvatGuide/releases/v0.10.4) (2026-06-10)

- 🍱 更新卡池信息
- 🚸 调整扫码登录提示文本
- 🚸 米社打卡执行后延迟更新任务状态

## [0.10.3](https://github.com/BTMuli/TeyvatGuide/releases/v0.10.3) (2026-05-28)

- 🍱 更新卡池信息
- 🐛 修复特定条件下公告详情渲染异常
- 🐛 修正实时便笺魔神任务完成状态判断
- 🎨 调整实时便笺魔神任务`进行中`状态下的标签颜色
- 🚸 调整兑换码浮窗触发范围
- 👽️ 修复扫码登录异常，启动器扫码替代米社扫码

## [0.10.2](https://github.com/BTMuli/TeyvatGuide/releases/v0.10.2) (2026-05-20)

- 🍱 更新6.6版本资源
- ✨ 实时便笺新增励行修远小组件
- ✨ 限时祈愿增加用户源，与限时活动共享数据
- ✨ 胡桃云添加自动刷新功能，优化用户信息更新逻辑
- ✨ 实时便笺增强组件交互性，添加倒计时点击切换功能
- 🐛 修复树脂计算异常 [`#242`](https://github.com/BTMuli/TeyvatGuide/issues/242)
- 🐛 修复参量质变仪状态判断异常 [`#244`](https://github.com/BTMuli/TeyvatGuide/issues/244)
- 🐛 调整路由参数读取，修复特定情况下的跳转异常
- 🐛 位置取整，修复数据类型异常导致的错误
- 🐛 完善版本更新检测逻辑
- 🚨 尝试修复 database is locked
- 🚸 增加验证码发送成功提示的显示时间
- 🚸 添加游戏目录存在性检查，优化用户提示信息
- 🚸 更新 dialog 组件，添加输入类型支持

## [0.10.1](https://github.com/BTMuli/TeyvatGuide/releases/v0.10.1) (2026-04-28)

- 🍱 更新下半卡池数据，修正部分成就完成条件
- 🐛 统一祈愿数据时区，修复时区异常导致的UP计算错误 [`#240`](https://github.com/BTMuli/TeyvatGuide/issues/240)
- 🐛 尝试修复数据库异常
- 🐛 修正胡桃数据导入Schema验证逻辑
- 👽️ 适配新版米游币获取方式，显示一次性米游币任务
- 👽️ 更新深境螺旋相关类型和数据转换，支持新版本的增益处理
- ♻️ 首页今日便笺&游戏签到组件合并
- ♻️ 底层请求重构，完善错误处理&日志写入
- 💄 图片质量调整浮窗UI调整
- 💄 首页素材日历组件宽度适配
- 💄 调整实用脚本页面游戏签到删除按钮位置
- 🧑‍💻 启用错误自动捕获弹窗

## [0.10.0](https://github.com/BTMuli/TeyvatGuide/releases/v0.10.0) (2026-04-13)

- ✨ 首页添加实时便笺组件
- 🐛 修复战绩页面图片新地区（空之神殿，风息山）渲染异常
- 🐛 修复Yatta请求权限不足
- 🐛 修复数据库buildTime更新异常
- ♻️ 重构图像保存逻辑，解耦图像请求
- ♻️ 重构部分请求逻辑，完善错误处理
