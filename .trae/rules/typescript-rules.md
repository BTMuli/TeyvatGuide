# TypeScript 开发规则

## 禁止使用原生 enum

使用 `const` 对象模式替代原生 `enum`：

```typescript
// 正确
const GameServerEnum = <const>{
  CN_GF01: "cn_gf01",
  CN_QD01: "cn_qd01",
};
```

## 类型定义

类型定义放在 `src/types/<Module>/<Module>.d.ts` 或 `types/<Module>/<Module>.d.ts`

Enum 常量放在 `src/enum/<Module>.ts`

```typescript
declare namespace TGApp.BBS.Post {
  const NewsType = <const>{
    NOTICE: 1,
    ACTIVITY: 2,
    NEWS: 3,
  };

  type NewsTypeEnum = (typeof NewsType)[keyof typeof NewsType];
}
```

枚举常量引用 `const` 对象类型，而非 union type：

```typescript
// 正确
const PostNewsTypeEnum: typeof TGApp.BBS.Post.NewsType = { ... };

// 错误
const PostNewsTypeEnum: TGApp.BBS.Post.NewsTypeEnum = { ... };
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

## JSDoc 注释

所有导出函数必须包含 `@since` 标签：

```typescript
/**
 * 获取角色信息
 * @since Beta v0.9.6
 * @param id - 角色 ID
 */
function getCharacter(id: number): Character;
```

常用标签：`@param` `@returns` `@remarks` `@see` `@example` `@deprecated`

## 类型注解

- 函数参数和返回值必须显式类型注解
- 优先用 `type` 而非 `interface`
- 用 `unknown` 而非 `any`
- 避免类型断言 (`as`)

## 相关文档

- [typescript-standards skill](./skills/typescript-standards/)