---
name: "typescript-standards"
description: "TypeScript 开发规范，包含 Enum 定义和 TSDoc 注释规范。编写 TypeScript 代码时调用此技能。"
---

# TypeScript 开发规范

## 目录结构

```
src/types/<Module>/<Module>.d.ts   # 类型定义 (.d.ts)
types/<Module>/<Module>.d.ts       # 根目录类型定义
src/enum/<Module>.ts               # 枚举常量 (.ts)
```

## 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| Interface/Type | PascalCase | `UserProfile` |
| const 对象 | PascalCase | `NewsType` |
| type alias | PascalCase + Enum | `NewsTypeEnum` |
| enum 常量 | PascalCase + Enum | `PostNewsTypeEnum` |
| readonly 列表 | PascalCase + List | `PostNewsTypeList` |
| 描述函数 | camelCase + Desc | `getPostNewsTypeDesc` |
| 常量 | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |

## 核心规则

1. **禁止原生 enum** - 使用 `const` 对象模式
2. **使用 `<const>` 断言** - 确保 readonly
3. **类型派生** - `(typeof Type)[keyof typeof Type]`
4. **JSDoc 注释** - 必须包含 `@since`，枚举还需 `@see`
5. **聚合导出** - 相关枚举分组在 default export 对象中

## 类型注解

- 函数参数和返回值必须显式类型注解
- 优先用 `type` 而非 `interface`
- 用 `unknown` 而非 `any`
- 避免类型断言 (`as`)

## 详细规范

- Enum 定义：见 [enum.md](./enum.md)
- TSDoc 注释：见 [tsdoc.md](./tsdoc.md)