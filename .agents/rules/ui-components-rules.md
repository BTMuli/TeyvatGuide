# 界面反馈与浮层规则

适用于 `src/components`、`src/pages`、`src/views` 中所有用户可见的消息反馈、确认与浮层。仓库已有函数式
消息组件与浮层壳，新增界面复用它们，不使用 Vuetify 的 `v-alert`、`v-dialog`。

按钮语义与复合点击区域不在本文件范围，见[交互元素与点击区域规则](interaction-rules.md)。

## 消息反馈：showSnackbar

- 从 `@comp/func/snackbar.js` 引入默认导出的 `showSnackbar`，按语义调用 `success`、`error`、`warn`、
  `info`、`cancel`；需要自定义颜色或时长时用 `showSnackbar._(text, color, timeout)`。
- 默认时长为 1500ms；只有内容确实需要更长时间阅读时才显式传 3000，不要每个调用都带参。
- 同一结果只提示一次；新增代码不要让工具函数与调用方重复提示，也不要用提示替代 `TGLogger`。
- 只承载瞬时结果。需要持续展示的说明、状态放在当前面板/页面内的普通语义文本里（沿用现有 CSS 变量），
  表单校验用输入组件的 `error-messages`，不为它们引入 `v-alert`；需要用户确认或输入时改用 `showDialog`
  或 `TopOverlay`。
- 不要用 Vuetify 的 `v-snackbar` 重新实现同类反馈。

## 浮层：TopOverlay

- 自定义内容的面板统一使用 `@comp/app/top-overlay.vue`。它组合了 `TOverlay` 遮罩与 `TOverlayPanel`
  面板壳（`role="dialog"`、`aria-modal`、标题、关闭、分享与 footer 插槽）。
- 使用 `TopOverlay` 的组件用 `v-model` 持有布尔可见状态，并在脚本中用 `defineModel<boolean>()` 接收
  父级绑定，再透传给 `TopOverlay`；不要另传 `visible`/`open` 之类的自定义 prop 或维护第二份开关。
- 标题放在 `#header` 插槽，用 `useId()` 生成 id，同时传给 `titleId` 并绑定到标题元素，保证
  `aria-labelledby` 有效；`closeAriaLabel` 必须描述关闭对象。
- 操作按钮放 `#footer`；没有分享需求时显式传 `:showShare="false"`，避免出现无意义的分享按钮。
- 尺寸与滚动由 `panelWidth`、`panelMaxHeight`、`contentMaxHeight` 控制，先用默认值（800px / 480px），
  内容确实受限时再覆盖；不要用全局样式改面板。
- 提交或保存进行中传 `:closeDisabled`，它会同时禁用关闭按钮与点击外部关闭；需要单独控制点击外部时
  再用局部 `outerClose` 开关（参考 `src/components/pageConfig/tco-imgQuality.vue` 的 `clickOuter`）。
- 只需要遮罩、不需要面板壳时使用 `@comp/app/t-overlay.vue`；不要自行拼装 `position: fixed` 遮罩、
  blur 与 z-index。
- 不要在浮层内叠加 `v-dialog` 等 Vuetify 遮罩；需要二级内容时优先在同一面板内切换视图，简单确认
  则用 `showDialog`。

## 确认与输入

- 轻量确认/输入继续用 `@comp/func/dialog.js` 的 `showDialog.check` / `input`（及 `checkF` / `inputF`）。
  它是项目既有函数式弹窗，按队列串行，不属于被禁用的 `v-dialog`。
- 只有当确认框需要自定义内容或复杂布局时，才改用 `TopOverlay`。

## 迁移与例外

- 既有 `v-dialog` / `v-alert` 属于遗留用法：不因本规则批量重写，也不迁移任务范围外的组件。
- 新增界面一律按本规则实现；修改既有组件时，只有该反馈/浮层本身属于当前任务范围才迁移，并保持文案、
  交互与数据流不变。
- 确需例外时先取得用户明确同意，并在交付说明中写清原因和范围。

## 验证

- 改动 `.vue` 后运行 `pnpm lint-vue` 与 `pnpm exec eslint <paths>`；涉及样式再运行
  `pnpm exec stylelint <paths>`。
- 检查新增/修改文件不再出现 `<v-alert`、`<v-dialog`，并核对 `titleId`、`closeAriaLabel` 与
  `closeDisabled` 行为。
