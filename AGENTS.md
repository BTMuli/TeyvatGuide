# TeyvatGuide 仓库说明

本文件对整个仓库生效。项目级代理资料集中在 `.agents/`。

## 开始工作

- 先阅读任务涉及的现有实现、`package.json` 与对应配置，不根据旧版本习惯猜测。
- 保留用户已有修改；不要覆盖、回退或顺带整理与任务无关的文件。
- 只在用户明确要求提交时执行 `git add` 或 `git commit`。

## 按任务加载规则

- TypeScript、Vue 或类型声明：读取 `.agents/rules/typescript-rules.md`；需要完整模式时使用
  `.agents/skills/typescript-standards/SKILL.md`。
- SQLite：读取 `.agents/rules/sqlite-rules.md`。
- 项目结构、命令或跨前后端开发：使用 `.agents/skills/teyvat-guide/SKILL.md`。
- Tauri 桌面 UI 预览、截图、交互或 IPC 调试：使用
  `.agents/skills/tauri-mcp-cli/SKILL.md`，通过 debug 应用验证，不以纯浏览器预览替代。
- Git 提交：仅在用户要求提交时使用 `.agents/skills/git-workflow/SKILL.md`，并遵循
  `.agents/rules/git-commit-rules.md`。

## 基本验证

- TypeScript/Vue 类型：`pnpm lint-vue`
- TypeScript/Vue/配置代码：`pnpm lint:code`
- Vue/SCSS/CSS 样式：`pnpm lint:style`
- Rust 格式：在 `src-tauri` 下运行 `cargo fmt --check`
- Tauri 桌面 UI：按 `.agents/skills/tauri-mcp-cli/SKILL.md` 连接窗口并完成截图与交互检查
- 跨范围或交付前完整检查：`pnpm lint`

根据改动范围选择最小充分验证；若无法运行，说明未验证项和原因。
