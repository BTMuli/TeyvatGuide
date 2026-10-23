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
- 跨语言源代码的文件头、函数、类型与 `@since`：读取
  [源代码版本与注释元数据规则](.agents/rules/source-metadata-rules.md)。
- Sentry 错误、事件、堆栈、版本回归或线上修复验证：使用
  `.agents/skills/sentry-mcp/SKILL.md`，默认只读查询；变更 issue 状态或项目配置前须取得明确授权。
- 项目结构、命令或跨前后端开发：使用 `.agents/skills/teyvat-guide/SKILL.md`。
- 分享截图或使用 `TGShare.modern` / modern-screenshot：读取
  [modern-screenshot 分享换行规则](.agents/rules/modern-screenshot-rules.md)，重点检查文本换行与冻结宽度。
- 测试设计、Bug 回归、覆盖审查或交付验收：使用 `.agents/skills/testing/SKILL.md`，按改动风险
  选择检查，不把 lint 通过当作功能验证完成。
- Tauri 桌面 UI：除非用户明确要求截图识别，否则不主动使用 connector 调试桥；
  需要调用时遵循 `.agents/skills/tauri-connector/SKILL.md`，并优先复用已在运行的 debug 实例。
- Git 提交、拆分规划、提交信息或就绪审查：使用 `.agents/skills/git-workflow/SKILL.md`，并遵循
  `.agents/rules/git-commit-rules.md`；只有明确要求创建提交才可暂存和提交。

## 分享截图

- 只有走 `generateShareImg`（html2canvas）的分享图，其样式才不得使用 `color-mix()`，也不得复用
  内部包含 `color-mix()` 的现有 SCSS 封装。`TGShare.modern` 可以处理 `color-mix()`，不必规避。
- 获取分享 DOM 时，只使用原生 `querySelector` 或 Vue 的 `useTemplateRef`；不得使用已过时的 `ref`
  绑定模板元素。
- 使用 `TGShare.modern` / modern-screenshot 时，分享根节点内本应单行的文本必须显式 nowrap；
  依赖 `fit-content` 的换行标题只在克隆节点放宽宽度。详见
  [modern-screenshot 分享换行规则](.agents/rules/modern-screenshot-rules.md)。

## 基本验证

- 验证命令与适用范围统一维护在 `.agents/skills/testing/SKILL.md`，按改动选择最小充分检查。
- `pnpm lint` 不包含类型检查、Vitest 或 Rust 检查，不能作为全部验证通过的依据。
- 纯文档改动检查内容、链接、格式和技能有效性，不默认构建或启动应用。
- 报告实际运行的命令、结果，以及未验证项和原因；交付或验收不等于提交授权。

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
