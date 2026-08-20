# TeyvatGuide 仓库说明

本文件对整个仓库生效。项目级代理资料集中在 `.agents/`。

## 开始工作

- 先阅读任务涉及的现有实现、`package.json` 与对应配置，不根据旧版本习惯猜测。
- 保留用户已有修改；不要覆盖、回退或顺带整理与任务无关的文件。
- 只在用户明确要求提交时执行 `git add` 或 `git commit`。

## 按任务加载规则

- TypeScript、Vue 或类型声明：读取 `.agents/rules/typescript-rules.md`；需要完整模式时使用
  `.agents/skills/typescript-standards/SKILL.md`。
- Vue 组件、组合式 API 或 Vue 现代化改造：使用 `.agents/skills/vue3-standards/SKILL.md`。
- SQLite：读取 `.agents/rules/sqlite-rules.md`。
- Sentry 错误、事件、堆栈、版本回归或线上修复验证：使用
  `.agents/skills/sentry-mcp/SKILL.md`，默认只读查询；变更 issue 状态或项目配置前须取得明确授权。
- 项目结构、命令或跨前后端开发：使用 `.agents/skills/teyvat-guide/SKILL.md`。
- Tauri 桌面 UI：除非用户明确要求 tauri-mcp 截图识别，否则不主动使用 MCP；
  需要调用时遵循 `.agents/skills/tauri-mcp-cli/SKILL.md`，并优先复用已在运行的 debug 实例。
- Git 提交：仅在用户要求提交时使用 `.agents/skills/git-workflow/SKILL.md`，并遵循
  `.agents/rules/git-commit-rules.md`。

## 分享截图

- 只有走 `generateShareImg`（html2canvas）的分享图，其样式才不得使用 `color-mix()`，也不得复用
  内部包含 `color-mix()` 的现有 SCSS 封装。`TGShare.modern` 可以处理 `color-mix()`，不必规避。
- 获取分享 DOM 时，只使用原生 `querySelector` 或 Vue 的 `useTemplateRef`；不得使用已过时的 `ref`
  绑定模板元素。

## 基本验证

- TypeScript/Vue 类型：`pnpm lint-vue`
- TypeScript/Vue/配置代码：`pnpm lint:code`
- Vue/SCSS/CSS 样式：`pnpm lint:style`
- Rust 格式：在 `src-tauri` 下运行 `cargo fmt --check`
- Tauri 桌面 UI：仅在用户明确要求 tauri-mcp 截图识别时，按 `.agents/skills/tauri-mcp-cli/SKILL.md` 连接窗口完成截图检查；复用已启动的 debug 实例，不另外启动
- 跨范围或交付前完整检查：`pnpm lint`

根据改动范围选择最小充分验证；若无法运行，说明未验证项和原因。

## Luna-first Engineering Rules

Use GPT-5.6 Luna Max as the primary model for normal coding, analysis, testing, review, and task orchestration. Sol is
an on-demand advisor, not the default supervisor.

### Automatic routing

Before substantial work, silently choose the cheapest route that preserves quality:

1. `LUNA_LOCAL`: Luna handles the task in the primary thread when requirements are clear or delegation overhead
   would exceed the work.
2. `LUNA_PARALLEL`: Luna delegates at least two genuinely independent packets to `luna_worker` when parallelism
   materially improves speed or protects the main context.
3. `SOL_ADVISED`: Luna delegates one explicit hard decision to `sol_advisor`, receives a plan or ruling, then returns
   implementation to Luna.

Do not call Sol merely because a task is long or touches many files. Size creates Luna packets; uncertainty, risk,
and reasoning difficulty justify Sol.

### Sol escalation gate

Call `sol_advisor` only when at least one condition holds:

- requirements remain materially ambiguous or contradictory after targeted inspection;
- architecture, security, privacy, authentication, authorization, cryptography, payments, destructive migration,
  data integrity, distributed consistency, or breaking compatibility requires a decision;
- several plausible root causes remain after the cheapest discriminating checks;
- two evidence-based implementation attempts failed;
- final validation exposes an unresolved risk whose plausible failure cost is high.

Before calling Sol, provide:

- one decision question;
- relevant evidence already collected;
- constraints and non-negotiables;
- options considered, if known;
- the required return format: recommendation, rationale, risks, implementation constraints, and acceptance criteria.

Sol does not perform routine implementation. After its decision, Luna executes and validates the plan. Request Sol
review at the end only when the final artifact still contains a high-risk judgment.

### Luna parallelism

Use `luna_worker` aggressively for independent implementation, tests, exploration, documentation, and mechanical
changes. Parallelize only when:

- packets do not depend on each other's unfinished output;
- every packet has explicit scope and acceptance criteria;
- writable files are disjoint;
- one owner is assigned per writable file;
- the primary Luna thread can integrate and validate the results.

Do not spawn agents for trivial tasks. More agents consume more tokens and can increase coordination cost.

### Task packet

Every delegated packet must include objective, context, in-scope and out-of-scope files, constraints, acceptance
criteria, exact validation, expected return, and escalation conditions.

Workers must stop on ambiguity, unexpected interface/dependency changes, security or data-integrity impact,
unavailable validation, material scope expansion, or two failed attempts.

### Acceptance

The primary Luna thread owns integration and normal final acceptance. Inspect actual diffs and validation results; do
not accept summaries alone. Sol owns only the difficult decision it was asked to make and any explicitly requested
high-risk final review.

Never claim a model ran unless the agent activity or tool result identifies it. If a configured model is unavailable,
report the limitation and use the best available safe route.
