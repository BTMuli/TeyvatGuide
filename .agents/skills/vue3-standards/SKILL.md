---
name: vue3-standards
description: Build, refactor, and review Vue 3.5 single-file components with TypeScript, Composition API, modern compiler macros, typed reactivity, template refs, models, props, emits, slots, watchers, and consistent template naming. Use for any TeyvatGuide .vue change, new Vue component, Vue composable integration, legacy Vue syntax modernization, or Vue code review; apply together with the repository TypeScript and UI skills when those concerns are also present.
---

# Vue 3 Modern Standards

Use Vue 3.5 features supported by the repository. Inspect `package.json`, nearby components, ESLint, Prettier,
Stylelint, and project instructions before editing; treat them as authoritative when they are stricter than this skill.

## Structure every SFC consistently

1. Order blocks as `<template>`, `<script lang="ts" setup>`, `<style lang="scss" scoped>`.
2. Omit an unused style block. Keep styles scoped unless a global style is explicitly required.
3. Use Composition API and `<script setup>` for new code. Do not add Options API, mixins, `this`, or a second
   `<script>` block when a compiler macro expresses the same behavior.
4. Use PascalCase component imports and tags. Follow the repository's existing file naming convention.

```vue
<template>
  <ResultPanel :userName :normalizedQuery @retry-request="handleRetryRequest" />
  <input ref="searchInput" v-model="query" />
</template>

<script lang="ts" setup>
import { computed, onMounted, ref, useTemplateRef } from "vue";

type SearchPanelProps = {
  userName: string;
};

const { userName } = defineProps<SearchPanelProps>();
const query = defineModel<string>({ required: true });
const searchInput = useTemplateRef<HTMLInputElement>("searchInput");
const pending = ref<boolean>(false);
const normalizedQuery = computed<string>(() => query.value.trim());

function handleRetryRequest(): void {
  pending.value = true;
}

onMounted(() => searchInput.value?.focus());
</script>

<style lang="scss" scoped>
.search-panel {
  display: grid;
}
</style>
```

## Declare component contracts with compiler macros

- Declare props with `defineProps<Props>()`; use a `type`, not an `interface`, under this repository's TypeScript
  rules. Do not import compiler macros.
- On Vue 3.5, prefer reactive props destructuring with native defaults when only selected props are needed:
  `const { title, pageSize = 20 } = defineProps<Props>()`. The destructured bindings remain reactive inside the
  same `<script setup>` block.
- Keep `const props = defineProps<Props>()` when the whole read-only props object must be forwarded or inspected.
  Use `props.foo` in script, while templates may reference declared props directly.
- When watching a destructured prop, pass a getter: `watch(() => pageSize, callback)`. Do not pass its current
  primitive value as the source.
- Declare emits with typed named tuples, for example
  `defineEmits<{ saveSuccess: [recordId: number]; close: [] }>()`.
- Declare typed slots with `defineSlots<{ default(props: SlotProps): unknown }>()` when slot props form a public
  contract. Prefer it to `useSlots()` for TypeScript-based slot declarations.
- Use `defineOptions()` for `inheritAttrs`, component names, or custom options. Use `defineExpose()` only for the
  smallest parent-facing imperative API; `<script setup>` components are closed by default.
- Use `<script lang="ts" setup generic="T extends ...">` for truly reusable generic components instead of
  weakening types with `unknown` or `any`.

## Use modern model APIs correctly

- In an SFC using `<script setup>`, prefer `defineModel<T>()` over manually pairing `modelValue` with
  `update:modelValue`, or building a writable `computed()` proxy.
- Use named models for multiple bindings: `defineModel<string>("firstName", { required: true })`, consumed as
  `v-model:firstName` by the parent.
- Specify value and modifier types when modifiers are supported:
  `defineModel<string, "trim" | "uppercase">()`.
- Prefer `{ required: true }` when the parent must own the value. Be cautious with model defaults: a child default
  can desynchronize from an omitted, `undefined` parent ref.
- Use the runtime `useModel(props, key)` helper only in non-SFC components or raw `setup()` implementations.
  `useModel()` is the lower-level helper behind `defineModel()` and requires explicit props and emits declarations.

## Type reactivity explicitly

- Write explicit generic contracts for component state and derived business values:
  `ref<T>()`, `shallowRef<T>()`, and `computed<T>()`. Include `null` or `undefined` in the type when it is a real
  lifecycle state.
- Type writable computed values with `computed<T>({ get, set })`.
- Let `reactive()` infer from its initializer. Do not pass `reactive<T>()`: Vue's deep ref-unwrapped return type can
  differ from `T`. Add a variable annotation only when a wider contract is needed.
- Do not destructure ordinary reactive objects because that disconnects primitive properties from reactivity. Use
  `toRef()` / `toRefs()` when independent refs are required. Vue 3.5 reactive props destructuring is the compiler-
  supported exception.
- Type native DOM event parameters, such as `function handleInput(event: Event): void`, and narrow `event.target`
  before reading element-specific fields.
- Use `import type` for types. Preserve precise unions and avoid `any`, non-null assertions, and type assertions when
  narrowing or a generic can express the contract.

## Prefer `useTemplateRef()` for template refs

- Use `useTemplateRef<T>("key")` with a matching `ref="key"`; do not create template element refs with
  `ref<T | null>(null)` and name matching.
- Type DOM refs with the exact element type, such as `HTMLInputElement`. For component refs use
  `InstanceType<typeof ChildComponent>` when inference is insufficient, or `ComponentPublicInstance` when only
  common instance members are needed.
- Access a template ref only after mount and account for `null`, including unmounts caused by `v-if`.
- Prefer declarative rendering to direct DOM mutation. Use a template ref only for focus, measurement, integration
  with imperative libraries, or a deliberately exposed child method.

## Keep naming consistent across script and template

- Declare multi-word props, models, variables, and event identifiers in camelCase: `userName`, `modelValue`,
  `saveSuccess`.
- Bind multi-word component props and named model arguments in SFC templates with the same camelCase spelling as
  their declarations: `:userName`, `:modelValue`, `v-model:firstName`. Do not convert them to kebab-case.
- Listen to multi-word component events in templates with kebab-case: `@save-success`. Use PascalCase for
  component tags.
- Prefer `:` and `@` directive shorthands. When a bound prop/attribute and its in-scope value have the same name,
  use Vue 3.4+ same-name shorthand:

```vue
<!-- Avoid -->
<UserCard :userName="props.userName" :loading="loading" />

<!-- Prefer; declared props are directly visible to the template -->
<UserCard :userName :loading />
```

- Keep an explicit expression when names differ, a transformation is required, or the value is not directly in
  template scope: `:userName="owner.displayName"`.
- Use method handlers for non-trivial behavior: `@save-success="handleSaveSuccess"`. Keep inline handlers limited
  to short assignments or direct calls.

## Apply modern reactivity and rendering patterns

- Use `computed()` for pure derived state and `watch()` / `watchEffect()` only for side effects.
- Register cleanup for stale async watcher work. On Vue 3.5, call `onWatcherCleanup()` synchronously before any
  `await`; otherwise use the callback-provided `onCleanup` function.
- Create watchers synchronously during setup so Vue stops them automatically. If a watcher must be created later,
  retain and call its stop handle.
- In composables that accept values, refs, or getters, use `MaybeRefOrGetter<T>` with `toValue()` at the tracking
  point instead of manually branching on input kinds.
- Use `useId()` for SSR-stable, per-application form and accessibility IDs. Call it during setup, not inside a
  `computed()` getter.
- Treat props as read-only. Request changes with an emit or model instead of mutating nested parent state.
- Use a stable domain key for `v-for`; do not use an array index when list identity can change. Do not put `v-if`
  and `v-for` on the same element; filter through `computed()` or move the condition to a wrapper.
- Choose `v-show` for frequently toggled content and `v-if` for lazy or infrequent branches.
- Avoid legacy `.sync`, filters, event buses, `$refs`, Reactivity Transform macros, and broad `getCurrentInstance()`
  access. Modernize them only within the requested scope.

## Validate the result

1. Run `pnpm lint-vue` for Vue and TypeScript type safety.
2. Run `pnpm lint:code` for script and template conventions.
3. Run `pnpm lint:style` when Vue styles changed.
4. Inspect the final diff and preserve unrelated user changes.

## Official references

- [Script setup and compiler macros](https://vuejs.org/api/sfc-script-setup.html)
- [Composition API helpers](https://vuejs.org/api/composition-api-helpers.html)
- [TypeScript with Composition API](https://vuejs.org/guide/typescript/composition-api.html)
- [Template refs](https://vuejs.org/guide/essentials/template-refs.html)
- [Component v-model](https://vuejs.org/guide/components/v-model.html)
- [Props naming and passing](https://vuejs.org/guide/components/props.html)
- [Component events](https://vuejs.org/guide/components/events.html)
- [Watchers and cleanup](https://vuejs.org/guide/essentials/watchers.html)
