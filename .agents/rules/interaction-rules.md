# 交互元素与点击区域规则

适用于 `src/components`、`src/pages`、`src/views` 中所有可点击的控件、卡片、列表项与区域。

界面以鼠标操作为主。先区分两类目标：

- **控件**：图标按钮、工具栏操作、表单控件、关闭/分页等离散的小目标。使用原生
  `<button type="button">` 或 `v-btn`，保留浏览器自带的键盘与辅助技术行为。
- **区域**：卡片、商品项、列表行、封面等整块内容。使用容器 + `@click`，默认只提供鼠标操作，
  不补键盘等价路径。

判断看交互粒度，不看视觉大小：一个铺满卡片、只做一次操作的大按钮仍是控件；一个很小的物品格仍是区域。

## 选择元素

| 场景                                       | 用法                                                          |
| ------------------------------------------ | ------------------------------------------------------------- |
| 控件：单一动作，内容为文本、图标或行内元素 | 原生 `<button type="button">` 或 `v-btn`                      |
| 区域：整块点击，内容全是行内元素           | `<div>` / `<article>` / `<li>` + `@click`，不加键盘入口       |
| 区域：需要键盘或辅助技术入口               | 容器 + 内部真实按钮/链接承载主操作，不把整块容器改成 `button` |
| 区域：包含块级内容或 div 根组件            | 容器 + `@click`；内部操作使用真实控件                         |
| 整块只做路由跳转，内部没有其他交互         | 优先 `RouterLink` / `<a>`                                     |
| 区域内有多个独立操作                       | 容器 + 并列的真实 `button` / 链接                             |

`<button>` 的内容模型是 phrasing content：`div`、`p`、`h1`-`h6`、`section`、`ul`/`li` 等块级
元素不能放进去；按钮内也不能再放 `button`、`a`、`input`、`v-btn` 等可交互元素。用 `button` 包复杂
结构会产生无效 HTML、难以覆盖的默认布局，并把整块内容压成一个可访问性节点。

判断按内容模型，不按视觉复杂度：`img`、`span`、`i`、`strong`、`small` 等行内元素可以放进
`button`；多行文字、网格、绝对定位本身不构成块级内容。组件按渲染后的根元素和内部结构判断，不按模板标签名：
`TItemBox`、`TpUid`、`v-img` 和默认的 `v-progress-circular` 渲染 `div`，不能直接放进 `button`；
`UcItemIcon` 与 `TMiImg` 的加载态渲染 `span`，可以作为行内内容。静态清单会随组件实现变化，
使用前以实际渲染结果为准；`v-progress-circular` 可用 `tag="span"` 改为行内根节点。

## button 只用于控件

- 除表单提交外始终写 `type="button"`；禁用态用 `:disabled`，不要用样式模拟。
- 内容保持简短；图标按钮提供 `aria-label`，纯装饰图标加 `aria-hidden="true"`。
- 需要 Vuetify 按钮外观时用 `v-btn`，但同样只放简单内容。
- 单独的图标操作由按钮承载。点击和键盘激活共用 `@click`，无需为 `v-icon` 模拟按钮的角色、焦点和按键行为。
- 不要为了保留键盘入口，把整块卡片、列表行或封面改成 `button`；这类区域按下一节处理。
- 可以用 CSS 给控件做卡片外观，但不能用这种外观把内容区域伪装成控件。

## 容器 + @click 承载区域

- 根元素按语义选择：普通区域用 `div`，列表项用 `li`，独立内容块用 `article` / `section`；内部可以
  自由使用 `div`、`h2`、`p`、`img` 等块级结构。
- 默认只做鼠标入口：不要给容器添加 `role="button"`、`tabindex`、Enter/Space 监听或
  `:focus-visible`。如果该区域确实需要键盘/辅助技术入口，改为在内部使用真实控件，见“自定义键盘交互”。
- 整块点击可以作为鼠标操作的便利入口。区域已有标题链接或主按钮时，复用它自带的键盘行为。默认不
  需要键盘入口时，不要为了“可访问”硬加按钮；如果产品明确要求该区域键盘/辅助技术可达，则必须在
  内部提供真实按钮/链接（可以视觉隐藏），不能只给容器加 `role`/`tabindex`。
- 区域内的独立操作用 `button` / `RouterLink` / `a` 承载。子操作的点击会触发外层动作时，用
  `@click.stop`，避免一次点击执行两次。
- 在容器样式中体现可点击状态（`cursor`、hover、active）。焦点样式只跟随真实可聚焦的控件；重置默认
  焦点环时提供可见的替代样式。
- 容器需要禁用态时，用 `aria-disabled="true"` 并在处理函数中拦截，不要只靠 `pointer-events: none`；
  如果该目标其实是控件，优先用原生 `button` 的 `:disabled`。
- 同一组同类项使用同一种模式。不要出现一部分物品格可 Tab、另一部分不可的分裂状态。

## 自定义键盘交互

- 区域默认不需要纯键盘路径。键盘入口通过区域内部的真实按钮/链接提供，不要在外层容器上模拟。
- 有明确需求或能简化高频流程时再手写按键处理。搜索框的 Enter 可优先走表单提交；专用快捷键、
  跨输入段的方向键和自动焦点移动按需实现，遵循控件原有的输入、选择与焦点行为。
- 标签页、选项列表等交互优先复用对应组件。确需自定义时，保持角色、焦点与按键行为一致。
- 浮层关闭与焦点处理参见[界面反馈与浮层规则](ui-components-rules.md)。

```vue
<!-- 默认：物品格是区域，容器 + @click，不补键盘路径 -->
<article class="item-tile" @click="selectItem(item)">
  <img :src="item.icon" alt="" />
  <span class="item-name">{{ item.name }}</span>
  <span class="item-level">Lv.{{ item.level }}</span>
</article>
```

```vue
<!-- 需要键盘入口：主操作放在内部真实按钮上，外层只做鼠标便利 -->
<article class="shop-good" @click="handleOpen">
  <ShopGoodsCover :goods />
  <div class="shop-good-body">
    <h2 class="shop-good-title">
      <button type="button" @click.stop="handleOpen">{{ goods.goods_name }}</button>
    </h2>
    <p class="shop-good-price">{{ priceText }}</p>
  </div>
</article>
```

```vue
<!-- 控件：图标按钮使用原生激活和禁用行为 -->
<button aria-label="刷新" :disabled="refreshing" type="button" @click="refresh">
  <v-icon aria-hidden="true">mdi-refresh</v-icon>
</button>
```

```vue
<!-- 避免：给区域模拟按钮 -->
<div role="button" tabindex="0" @click="handleOpen" @keydown.enter.prevent="handleOpen">
  <div class="shop-good-body">
    <h2 class="shop-good-title">{{ goods.goods_name }}</h2>
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

- 既有 `div` / `v-icon` 上用 `role="button"`、`tabindex` 和手写 Enter/Space 模拟按钮的写法属于
  遗留：新增代码不得再写；只有该点击区域本身属于当前任务范围时才迁移。
- 迁移时先判断目标是控件还是区域：控件改为原生 `button`；区域改为容器 + `@click`，需要键盘入口时
  在内部放真实按钮/链接，并删除容器上的 `role`、`tabindex`、按键监听和焦点环。
- 既有 `button` 包裹块级结构的写法属于遗留：不因本规则批量重写，也不迁移任务范围外的组件。
- 既有把卡片、列表行或封面整块写成 `button` 的写法也属于遗留：新增区域不得这样写；修改该区域时
  按控件/区域重新判断，区域改为容器 + `@click`。
- 新增交互区域一律按本规则实现；修改既有组件时，只有该点击区域本身属于当前任务范围才迁移，并保持
  点击行为、文案与数据流不变。
- 确需例外时先取得用户明确同意，并在交付说明中写清原因与范围。

## 验证

- 改动 `.vue` 后运行 `pnpm lint-vue` 与 `pnpm exec eslint <paths>`；涉及样式再运行
  `pnpm exec stylelint <paths>`。
- 按渲染结果检查按钮内容模型，并用鼠标验证主操作、子操作和禁用状态。一次点击应只触发预期动作。
- 确认 `button` 只用于控件；整块卡片、列表行或封面即使只有一个动作，也不要仅因此改成 `button`。
- 检查区域是否残留 `role="button"`、`tabindex`、Enter/Space 监听或 `:focus-visible`；这些只应出现在
  真实控件上。
- 检查同一组同类项是否采用同一种模式，以及有意保留的键盘入口（控件或内部主操作）是否通过
  Tab、Enter、Space 和焦点可见性验证。
- 区域选择纯鼠标方案时，确认其不会被屏幕阅读器当作可操作控件；如果这个取舍不可接受，改用
  “容器 + 内部主按钮/链接”方案。
