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

所有导出函数、类型、枚举必须包含 `@since` 标签，版本号格式为 `Beta v{版本号}`。

### 文件头注释

在 `.ts` 或 `.d.ts` 文件顶部添加文件级注释：

```typescript
/**
 * 角色相关类型定义
 * @since Beta v0.9.6
 */
```

### 函数和类型定义

```typescript
/**
 * 获取角色信息
 * @since Beta v0.9.6
 * @param id - 角色 ID
 */
function getCharacter(id: number): Character;

/**
 * 角色信息对象
 * @since Beta v0.9.6
 */
type Character = {
  id: number;
  name: string;
};
```

### 版本更新规则

当修改类型定义的子成员时（如添加字段），需要同步更新：
1. **父级类型的 `@since`**：递增为当前项目版本（参考 `package.json`）
2. **文件头的 `@since`**：如该文件是主要变更文件，同步更新

**示例：** 项目版本从 `0.9.8` → `0.9.9`

```typescript
// 修改前
/**
 * 角色相关类型定义
 * @since Beta v0.9.6
 */

/**
 * 角色信息对象
 * @since Beta v0.9.6
 */
type Character = {
  id: number;
  name: string;
};

// 修改后 - 添加新字段
/**
 * 角色相关类型定义
 * @since Beta v0.9.9  // 文件头同步更新
 */

/**
 * 角色信息对象
 * @since Beta v0.9.9  // 父级类型递增
 */
type Character = {
  id: number;
  name: string;
  element: string; // 新增字段
};
```

常用标签：`@param` `@returns` `@remarks` `@see` `@example` `@deprecated`

## 函数定义

**优先使用 `function` 关键字定义函数，而不是箭头函数赋值给 `const`**

```typescript
// ✅ 正确 - 使用 function 关键字
function getUser(id: number): UserProfile {
  return { id, name: "User" };
}

async function loadData(): Promise<void> {
  await fetch("/api/data");
}

// ❌ 错误 - 使用 const + 箭头函数（除非需要捕获 this 或用于回调）
const getUser = (id: number): UserProfile => {
  return { id, name: "User" };
};
```

**例外情况（可以使用箭头函数）：**
- 需要捕获词法 `this` 时
- 作为回调函数传递给其他函数时
- 对象字面量中的方法（根据场景判断）

## 类型注解

- 函数参数和返回值必须显式类型注解
- 优先用 `type` 而非 `interface`
- 用 `unknown` 而非 `any`
- 避免类型断言 (`as`)

## 相关文档

- [typescript-standards skill](./skills/typescript-standards/)