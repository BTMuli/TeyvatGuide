# Commit conventions

Use one Unicode emoji followed by a Chinese, verb-led description of at most 100 characters:

```text
<emoji> <中文描述>
```

Do not add Conventional Commits prefixes such as `feat:` or `fix(scope):`.

Choose the emoji by the primary intent:

| Intent        | Emoji | Example                       |
| ------------- | ----- | ----------------------------- |
| Feature       | ✨    | `✨ 添加用户个人页面跳转功能` |
| Bug fix       | 🐛    | `🐛 修复角色生日判断逻辑`     |
| Small patch   | 🩹    | `🩹 补充首页参数处理`         |
| Refactor      | ♻️    | `♻️ 重构数据库操作层`         |
| Performance   | ⚡️    | `⚡️ 优化角色列表渲染性能`     |
| UI/style      | 💄    | `💄 调整深色模式配色`         |
| Documentation | 📝    | `📝 更新 TypeScript 规范`     |
| Configuration | 🔧    | `🔧 更新 Vite 配置`           |
| Database      | 🗃️    | `🗃️ 调整用户数据表结构`       |
| Types         | 🏷️    | `🏷️ 补充账户响应类型`         |

Split commits when changes can be reviewed, reverted, or explained independently. Keep implementation and the
documentation required for that same behavior together; do not split mechanically merely because file types differ.
