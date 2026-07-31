# TypeScript 与 Vue 开发规则

以 `eslint/vueEslint.js`、`.prettierrc.yml`、`.stylelintrc.yml` 和邻近代码为最终依据。

## 格式与类型

- 使用 2 空格、双引号、分号、尾逗号，行宽 100；交给 Prettier 处理细节。
- 数组类型使用 `Array<T>`，不使用 `T[]`。
- 对象类型优先使用 `type`，不使用 `interface`；确需声明合并时先说明理由。
- 优先使用 `unknown`；只有第三方边界或现有兼容代码无法准确建模时才使用 `any`。
- 参数与对外函数返回值写明类型；Vue `ref` 保持仓库现有的显式泛型风格。
- 能用类型注解或类型收窄时不做断言。确需断言时遵循 ESLint 的尖括号风格
  （`.tsx` 文件除外）。

## 常量枚举模式

- 不新增 TypeScript 原生 `enum`。
- 在 `.d.ts` 中用 `const` 对象声明值集合，并派生 union 类型。
- 在运行时代码中导出实际常量对象；Vue 脚本和模板不得把仅存在于声明空间的名称当运行时值。

```typescript
const GameServer = <const>{
  CN_GF01: "cn_gf01",
  CN_QD01: "cn_qd01",
};

type GameServerEnum = (typeof GameServer)[keyof typeof GameServer];
```

## 函数与 Vue

- 具名业务函数优先使用 `function` 声明。
- 回调、组合式 API 内联处理、需要词法 `this` 或简短表达式时可以使用箭头函数。
- Vue 单文件组件保持仓库顺序：`<template>`、`<script lang="ts" setup>`、`<style lang="scss" scoped>`
  （按需省略属性或 style 块）。
- 组件在脚本中用 PascalCase；样式遵循 Stylelint，不手工绕过现有规则。
- 使用 `font-family: var(--font-title)` 的文本必须同时声明 `font-weight: normal`。

## 类型与注释位置

- 全局领域声明放在 `src/types/<Domain>/*.d.ts`，沿用现有 `TGApp` namespace 组织。
- 类型应放入对应领域的 `.d.ts`，或就近拆分在实际使用它的 `.vue`/`.ts` 文件中；不要为类型单独
  新建 `types.ts`。
- 运行时枚举常量放在 `src/enum/*.ts` 或所属插件的既有目录。
- 新增的导出类型、函数和常量按邻近代码添加 TSDoc，包含 `@since Beta v<package.json version>`。
- 修改已有声明时不要无条件重写历史 `@since`；只有仓库当前约定要求记录本次契约版本时才更新
  该声明及相关文件头。

## 导入

- 优先使用 `tsconfig.json`/`vite.config.ts` 中已有别名，跨目录不要堆叠深层 `../../`。
- 导入分组和排序遵循 `import-x/order`；不要在任务范围外手动制造无关 diff。
- NodeNext 项目内导入沿用现有 `.js` 扩展名写法。
