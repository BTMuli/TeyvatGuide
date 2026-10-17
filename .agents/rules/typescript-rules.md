# TypeScript 与 Vue 开发规则

以 `eslint/vueEslint.js`、`.prettierrc.yml`、`.stylelintrc.yml` 和邻近代码为最终依据。
源文件的版本与注释要求见[源文件元数据规则](source-metadata-rules.md)；本文件补充 TypeScript/Vue 的声明与实现约定。

## 格式与类型

- 使用 2 空格、双引号、分号、尾逗号，行宽 100；`prettier/prettier` 为 error，格式统一交给 Prettier。
- 数组类型使用 `Array<T>`，不使用 `T[]`。
- 对象类型优先使用 `type`，不使用 `interface`；确需声明合并时先说明理由。
- 优先使用 `unknown`；`no-explicit-any` 未启用，但仓库约定仅在第三方边界或现有兼容代码无法准确建模时才使用 `any`。
- 参数与对外函数返回值写明类型；Vue `ref` 保持仓库现有的显式泛型风格。
- 能用类型注解或类型收窄时不做断言。确需断言时遵循 ESLint 的尖括号风格
  （`.tsx` 文件除外）。
- `no-unused-vars` 为 error：不保留未使用的变量、参数与导入。
- 字面量类型用 `<const>`（运行时代码中可写 `as const`）推导，不写显式字面量类型断言
  （`prefer-as-const`）。

## 常量枚举模式

- 不新增 TypeScript 原生 `enum`。
- 在 `.d.ts` 中用 `const` 对象声明值集合，并派生 union 类型。
- 在运行时代码中导出实际常量对象；Vue 脚本和模板不得把仅存在于声明空间的名称当运行时值。
- 需要跨文件或跨组件复用的枚举先复用已有声明和值对象；确需新增时，在对应领域的
  `src/types/<Domain>/*.d.ts` 与 `src/enum/*.ts`（或插件已有运行时目录）成对抽离。
  不新建大写 `Types/` 平行目录，也不重复创建相同值的对象。

```typescript
const GameServer = <const>{
  CN_GF01: "cn_gf01",
  CN_QD01: "cn_qd01",
};

type GameServerEnum = (typeof GameServer)[keyof typeof GameServer];
```

`<const>`/`as const` 同时满足 `consistent-type-assertions` 的尖括号风格与
`prefer-as-const`，不要改写为显式字面量类型断言。

## 函数与 Vue

- 具名业务函数优先使用 `function` 声明。
- 回调、组合式 API 内联处理、需要词法 `this` 或简短表达式时可以使用箭头函数。
- `no-unused-expressions` 为 error（不允许短路与三元链）：不写无效果表达式，
  如 `a && b()`、`cond ? a : b`。
- Vue 单文件组件保持仓库顺序：`<template>`、`<script lang="ts" setup>`、`<style lang="scss" scoped>`
  （按需省略属性或 style 块）。
- 组件在脚本中用 PascalCase；样式遵循 Stylelint，不手工绕过现有规则。
- 使用 `font-family: var(--font-title)` 的文本必须同时声明 `font-weight: normal`。

## 类型与注释位置

- 全局领域声明放在 `src/types/<Domain>/*.d.ts`，沿用现有 `TGApp` namespace 组织；插件已有
  `src/plugins/<Plugin>/types/*.d.ts` 可直接沿用，目录大小写必须准确。
- 跨文件、跨组件复用或在多处重复声明的同一类型，先检查已有声明并抽离到对应领域的 `.d.ts`；Vue
  组件之间复用也遵循此规则。仅在单个文件内使用的局部类型可就近放在 `.vue`/`.ts` 中，不要为类型
  单独新建 `types.ts`，也不要新建大写 `Types/` 目录。
- 运行时枚举常量放在 `src/enum/*.ts` 或所属插件的既有目录。
- 新增的导出类型、函数和常量按邻近代码添加 TSDoc；版本取 `package.json.since`，格式为
  `@since Beta v<package.json.since>`。函数和 `type` 的更新、非 Vue 函数缺失注释补齐，以及 Vue
  豁免范围统一遵循源文件元数据规则；具体 TSDoc 写法见
  [TSDoc 约定](../skills/typescript-standards/references/tsdoc.md)。
- TSDoc 语法由 `tsdoc/syntax` 检查（warn，仅 `.ts`/`.d.ts` 文件）。

## ESLint 强制限制

除上述约定外，`typescript-eslint` recommended 与 `eslint/vueEslint.js` 的以下限制为 error：

- 纯类型导入必须使用 `import type { ... }`；`no-import-type-side-effects` 禁止只含类型说明符的
  `import { type X }`。
- `ban-ts-comment`：不使用 `@ts-ignore`、`@ts-nocheck`；`@ts-expect-error` 必须附描述。
- `no-namespace`：namespace 仅允许以 `.d.ts` 中的 `declare namespace` 形式存在（如 `TGApp`）；
  运行时代码不得声明。
- `no-require-imports`：使用 ESM `import`，不使用 `require()`。
- `no-non-null-asserted-optional-chain`：不在可选链表达式后追加 `!`。
- `no-unsafe-function-type`：不使用裸 `Function` 类型。
- 未启用（lint 不报错，但仓库约定仍约束）：`strict-boolean-expressions`、`no-explicit-any`。

## 导入

- 优先使用 `tsconfig.json`/`vite.config.ts` 中已有别名，跨目录不要堆叠深层 `../../`。
- 导入分组和排序遵循 `import-x/order`（组序 builtin/external/internal/parent/sibling/index/unknown，
  组间空行，组内字母升序、忽略大小写）；不要在任务范围外手动制造无关 diff。
- NodeNext 项目内导入沿用现有 `.js` 扩展名写法。
