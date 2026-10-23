# modern-screenshot 分享换行规则

适用于 `TGShare.modern` / `domToBlob` 生成的所有分享图。

## 问题与原因

modern-screenshot 会把 DOM 克隆进 SVG `foreignObject`，并复制 `getComputedStyle()` 得到的 px 值。
计算宽度只保留 4 位小数，`fit-content` / 自动宽度会被固化成略小于真实内容的宽度，最后一个字符因此
换到下一行。这是上游已知问题（[#104](https://github.com/qq15725/modern-screenshot/issues/104)、
[#134](https://github.com/qq15725/modern-screenshot/issues/134)）。截至 4.7.0（2026-04）仍未修复：
精度补丁 `ed8d711` 已被 `afeb6f6` 回滚。不要依赖升级或降级 modern-screenshot 解决。

## 实现要求

- 分享根节点内本应单行的文本必须显式声明 `white-space: nowrap`。需要截断时同时使用
  `overflow: hidden`、`text-overflow: ellipsis`，按需补 `max-width: 100%`、`box-sizing: border-box`；
  同一行内的图标等固定尺寸元素要加 `flex-shrink: 0`。
- 允许换行的标题不要用 `nowrap` 硬压。若它依赖 `fit-content`，在 `TGShare.modern` 的 `onCloneNode`
  中只修改克隆节点，例如放宽为 `width: 100%; box-sizing: border-box`；不要改变屏幕上的布局和点击区域。
- 不要把 `font-size: 0.999` 作为全局默认兜底，它会改变字号与基线。只有确实无法 nowrap 的多行文本
  才考虑在克隆节点上定点缩放，并需目视验证。
- 新建或修改分享组件时，重点检查 `white-space: pre-wrap`、`word-break: break-all` 的文本源；
  每个可断行字符都可能在冻结宽度下触发换行。
- 参考现有处理：`src/components/app/t-postcard.vue`（标题 `onCloneNode`、`.tpc-forum`、`.tpc-status`）、
  `src/components/viewPost/tp-avatar.vue`、`src/components/func/hyperlink.vue`、
  `src/components/userCombat/tuc-round.vue`、`src/components/pageAnno/ta-card.vue`、
  `src/components/userRecord/tur-home-overview.vue`。

## 验证

- `stylelint` / ESLint 只能证明样式语法正确，不能证明截图排版正确。
- 修改分享文本或宽度约束后，必须在桌面调试实例重新生成对应分享图，检查标题、标签、时间等是否仍有
  单字符换行或裁切，并同时检查浅色与深色主题（如适用）。
