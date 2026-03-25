---
name: "task-completion"
description: "Guides AI to commit changes after completing tasks. Invoke when a coding task is finished and ready for commit."
---

# Task Completion Commit

本 skill 指导 AI 在完成任务后如何正确提交代码变更。

## 何时使用

**当以下条件满足时，应该提交 commit：**
- ✅ 用户请求的编码任务已完成
- ✅ 代码已通过 lint 和类型检查
- ✅ 没有未解决的错误
- ✅ 用户没有明确要求不提交

## 提交流程

### 1. 检查变更内容

首先检查哪些文件被修改：

```bash
git status
```

### 2. 分析变更主题

**关键原则：原子提交**

- 如果所有变更属于**同一个主题** → 一个 commit
- 如果变更涉及**多个主题** → 拆分成多个 commit

**主题判断示例：**

| 场景 | 提交方式 |
|------|---------|
| 只修改了一个组件 | 一个 commit |
| 修改组件 + 更新文档 | 两个 commit |
| 修复多个独立 bug | 每个 bug 一个 commit |
| 重构多个组件 | 每个组件一个 commit |

### 3. 选择正确的 emoji

根据变更类型选择对应的 emoji：

- ✨ 新功能
- 🐛 Bug 修复
- ♻️ 重构
- ⚡️ 性能优化
- 💄 UI/样式调整
- 📝 文档更新
- 🎨 代码格式化
- 🔧 配置文件修改

### 4. 执行提交

**单个主题的提交：**

```bash
git add <文件路径>
git commit -m "<emoji> <描述>"
```

**多个主题的提交（拆分）：**

```bash
# 提交 1
git add 文件 1
git commit -m "♻️ 重构组件 A"

# 提交 2
git add 文件 2
git commit -m "📝 更新文档"
```

### 5. 编写提交信息

**格式要求：**
- emoji 图标 + 空格 + 中文描述
- 以动词开头
- 一行不超过 100 字符
- 不要使用 `feat:` 这种括号声明

**好的示例：**
```
✨ 添加用户个人页面跳转功能
🐛 修复角色生日判断逻辑
♻️ 重构图片浮窗组件拖拽缩放逻辑
📝 更新 TypeScript 类型注解规范
```

**错误的示例：**
```
✨ feat: 添加功能  # ❌ 使用了 type 声明
修复了一些 bug  # ❌ 没有 emoji
Added new feature  # ❌ 没有使用中文
```

## 特殊情况处理

### 情况 1：用户明确要求不提交

如果用户说"先别提交"或"我自己来提交"，则跳过提交步骤。

### 情况 2：变更太多不确定如何拆分

如果变更涉及多个方面但不确定如何拆分，应该询问用户：

> "这次修改涉及多个方面，您希望我：
> - 拆分成多个 commit 提交？
> - 还是合并成一个 commit 提交？"

### 情况 3：提交失败

如果提交失败（例如有 lint 错误），应该：
1. 查看错误信息
2. 修复错误
3. 重新尝试提交

## 完整示例

**场景：用户要求重构图片浮窗组件并更新 TypeScript 规范**

任务完成后，应该这样提交：

```bash
# 检查变更
git status

# 提交 1：组件重构
git add src/components/viewpost/vp-overlay-image.vue
git commit -m "♻️ 重构图片浮窗组件拖拽缩放逻辑"

# 提交 2：规范更新
git add .trae/skills/typescript-standards/skill.md
git commit -m "📝 更新 TypeScript 类型注解规范"
```

## 参考文档

- [Git Commit 规范](./git-commit.md) - Git Commit 格式规范
- [Git Commit Rules](../rules/git-commit-rules.md) - Git Commit 规则
