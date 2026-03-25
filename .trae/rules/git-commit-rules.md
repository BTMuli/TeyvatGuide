# Git Commit 规则

## 核心规则

1. **原子提交**：每个 commit 只包含一个主题的变更，不同主题的变更应分成多个 commit
2. **分步提交**：分步执行 `git add <文件路径>` 再 `git commit -m "<emoji> <描述>"`
3. **单一 emoji**：每条提交只使用一个 emoji，位于开头
4. **Unicode 格式**：使用 Unicode emoji 图标（如 ✨），不要纯文本（如 `:sparkles:`）
5. **中文描述**：以动词开头，一行不超过 100 字符
6. **禁止 type: 声明**：不要使用 `✨ feat: xxx` 格式

## 提交格式

```
<emoji> <描述>
```

## 原子提交原则

**每个 commit 应该只关注一个主题**，如果一次修改涉及多个方面，应该拆分成多个 commit：

### ✅ 正确的提交方式

```bash
# 提交 1：重构组件逻辑
git add src/components/viewpost/vp-overlay-image.vue
git commit -m "♻️ 重构图片浮窗组件拖拽缩放逻辑"

# 提交 2：更新规范文档
git add .trae/skills/typescript-standards/skill.md
git commit -m "📝 更新 TypeScript 类型注解规范"
```

### ❌ 错误的提交方式

```bash
# 不要将不同主题的变更混在一个 commit 中
git add src/components/viewpost/vp-overlay-image.vue .trae/skills/typescript-standards/skill.md
git commit -m "♻️ 重构组件并更新 TypeScript 规范"  # ❌ 包含两个主题
```

### 拆分指南

| 场景 | 拆分方式 |
|------|---------|
| 代码重构 + 文档更新 | 分成两个 commit |
| 功能开发 + Bug 修复 | 分成两个 commit |
| 多个组件修改 | 按组件拆分 commit |
| 代码修改 + 配置文件 | 分成两个 commit |
| 功能开发 + 样式调整 | 分成两个 commit |

## Emoji 速查

| 类别 | Emoji | 场景 |
|------|-------|------|
| 新增 | ✨ | 新功能 |
| 新增 | 🎨 | 代码结构/格式 |
| 新增 | 📝 | 文档 |
| 修改 | 🐛 | Bug 修复 |
| 修改 | 🩹 | 小修复/补丁 |
| 修改 | ⚡️ | 性能优化 |
| 修改 | ♻️ | 重构 |
| 修改 | 💄 | UI/样式 |
| 删除 | 🔥 | 删除代码/文件 |
| 删除 | ⚰️ | 删除死代码 |
| 依赖 | ➕ | 添加依赖 |
| 依赖 | ➖ | 删除依赖 |
| 依赖 | ⬆️ | 升级依赖 |
| 部署 | 🚀 | 部署 |
| 部署 | 📦 | 编译/打包 |
| 数据库 | 🗃️ | 数据库变更 |
| 安全 | 🔒 | 安全问题 |
| 架构 | 🏗️ | 架构变更 |
| 体验 | 🧑‍💻 | 开发体验 |
| 进行中 | 🚧 | 进行中工作 |

## 示例

```
✨ 添加用户个人页面跳转功能
🐛 修复角色生日判断逻辑
🩹 补充首页 mini 参数处理
♻️ 重构数据库操作为事务模式
⚡️ 优化角色列表渲染性能
📝 更新 TypeScript 类型注解规范
🎨 调整组件代码格式
```
