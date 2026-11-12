# 交互元素与点击区域规则

适用于 `src/components`、`src/pages`、`src/views` 中所有可点击的控件、卡片、列表项与区域。按钮只承担
单一动作；复合点击区域使用容器 + `@click`，不要把 `button` 当作布局容器。

## 选择元素

| 场景                                               | 用法                                      |
| -------------------------------------------------- | ----------------------------------------- |
| 单一动作，内容只有文本、图标或少量内联元素         | 原生 `<button type="button">` 或 `v-btn`  |
| 卡片、商品项、列表行、封面、带标题或多行信息的区域 | `<div>` / `<article>` / `<li>` + `@click` |
| 整块只做路由跳转，内部没有其他交互                 | 优先 `RouterLink` / `<a>`                 |
| 区域内有多个独立操作                               | 容器 + 并列的真实 `button` / 链接         |

`<button>` 的内容模型是 phrasing content：`div`、`p`、`h1`-`h6`、`section`、`ul`/`li` 等块级
元素不能放进去；按钮内也不能再放 `button`、`a`、`input`、`v-btn` 等可交互元素。用 `button` 包复杂
结构会产生无效 HTML、难以覆盖的默认布局，并把整块内容压成一个可访问性节点。

## button 只用于单一动作

- 除表单提交外始终写 `type="button"`；禁用态用 `:disabled`，不要用样式模拟。
- 内容保持简短；图标按钮提供 `aria-label`，纯装饰图标加 `aria-hidden="true"`。
- 需要 Vuetify 按钮外观时用 `v-btn`，但同样只放简单内容。
- 组件按渲染后的根元素判断，不按模板标签名。`v-progress-circular`、`v-img`、`TItemBox`、`UcItemIcon`、
  `TpUid` 以及 `TMiImg` 的加载态默认渲染 `div`；放进 `button` 同样无效。`v-progress-circular` 可用
  `tag="span"`，其余组件应迁移到容器方案或改为行内根节点。
- 不要为了获得默认的点击、hover 或焦点行为，把卡片、列表项或媒体块包进 `button`；这些状态在容器
  样式里显式实现。

## 容器 + @click 承载复合区域

- 根元素按语义选择：普通区域用 `div`，列表项用 `li`，独立内容块用 `article` / `section`；内部可以
  自由使用 `div`、`h2`、`p`、`img` 等块级结构。
- 在样式中补 `cursor: pointer`、hover/active 状态和 `:focus-visible` 焦点环，不要依赖 `button` 的
  默认外观。
- 区域内需要独立操作时，用真实的 `button` / `RouterLink` / `a` 承载，并在其 `@click` 上加 `.stop`；
  不要把子操作放进外层 `role="button"` 中。
- 容器需要禁用态时，用 `aria-disabled="true"` 并在处理函数中拦截，不要只靠 `pointer-events: none`；
  如果控件本身只是单一动作，优先用原生 `button` 的 `:disabled`。

## 键盘与语义

- 整个区域只有一个动作、内部没有其他交互元素时：加 `role="button"`、`tabindex="0"`，把
  `@keydown.enter.prevent` 与 `@keydown.space.prevent` 绑到同一处理函数，并按需补 `aria-label`、
  `aria-pressed` 或 `aria-expanded`。
- 区域包含子操作时：不要给外层加 `role="button"`。把主操作的键盘入口放在内部真实链接/按钮上，外层
  `@click` 仅作为鼠标便利；键盘处理用 `.self` 或 `event.target !== event.currentTarget` 守卫，
  避免子控件的事件冒泡触发外层动作。
- 纯跳转且内部无嵌套交互时优先 `RouterLink` / `<a>`；用 `div + @click` 调路由时，仍要保留键盘可达的
  等价入口。
- 需要 `role="option"`、`role="tab"` 等更具体语义时，按对应模式的键盘约定实现，不要一律套
  `role="button"`。
- 既有实现可参考 `src/components/pageBag/pb-relic-item.vue`（单一动作容器的键盘处理）与
  `src/components/pageGame/pg-cover-item.vue`（主操作与子操作并列，不嵌套按钮）。

```vue
<!-- 推荐：单一动作，保留 button -->
<button :aria-label="`刷新${title}`" class="panel-refresh" type="button" @click="refresh">
  <v-icon aria-hidden="true">mdi-refresh</v-icon>
</button>
```

```vue
<!-- 推荐：复合卡片用容器 + @click，并补齐键盘语义 -->
<div
  :aria-label="`查看${goods.goods_name}`"
  class="shop-good"
  role="button"
  tabindex="0"
  @click="handleOpen"
  @keydown.enter.prevent="handleOpen"
  @keydown.space.prevent="handleOpen"
>
  <ShopGoodsCover :goods />
  <div class="shop-good-body">
    <h2 class="shop-good-title">{{ goods.goods_name }}</h2>
    <p class="shop-good-price">{{ priceText }}</p>
  </div>
</div>
```

```vue
<!-- 避免：button 内再写块级结构 -->
<button class="shop-good" type="button" @click="handleOpen">
  <ShopGoodsCover :goods />
  <div class="shop-good-body">
    <h2 class="shop-good-title">{{ goods.goods_name }}</h2>
  </div>
</button>
```

## 迁移与例外

- 既有 `button` 包裹复杂结构的写法属于遗留：不因本规则批量重写，也不迁移任务范围外的组件。
- 新增交互区域一律按本规则实现；修改既有组件时，只有该点击区域本身属于当前任务范围才迁移，并保持
  点击行为、文案与数据流不变。
- 确需例外时先取得用户明确同意，并在交付说明中写清原因与范围。

## 验证

- 改动 `.vue` 后运行 `pnpm lint-vue` 与 `pnpm exec eslint <paths>`；涉及样式再运行
  `pnpm exec stylelint <paths>`。
- 检查新增/修改的点击区域：`button` 内没有块级或可交互子元素，组件按渲染后的根元素复核；`div + @click`
  有键盘路径和 `:focus-visible` 样式；子操作使用了 `.stop`。
- 用 Tab、Enter、Space 手动走一遍主路径与子操作，确认焦点顺序和触发目标正确。
