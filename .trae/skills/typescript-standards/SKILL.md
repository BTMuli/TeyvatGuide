---
name: "typescript-standards"
description: "TypeScript 开发规范，与 ESLint 配置保持一致。包含类型定义、数组语法、类型注解等规范。"
---

# TypeScript 开发规范

> 本规范与项目 ESLint 配置保持一致，编写 TypeScript 代码时必须遵守。

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

### 1. 数组类型定义

**使用 `Array<T>` 语法，禁止使用 `T[]`**

```typescript
// ✅ 正确
const list: Array<string> = [];
const matrix: Array<Array<number>> = [];

// ❌ 错误
const list: string[] = [];
const matrix: number[][] = [];
```

### 2. 类型注解与断言

**优先使用类型注解 `: Type`，必要时使用 `<Type>` 断言，禁止使用 `as Type`**

```typescript
// ✅ 正确 - 优先使用类型注解
const value: string = someValue;
const count: number = getCount();
const result: string = getValue();

// ✅ 正确 - 必要时使用类型断言（如 DOM 元素、类型不匹配）
const el: HTMLInputElement = <HTMLInputElement>document.getElementById('id');
const data = <MyDataType>unknownValue;

// ✅ 正确 - 函数定义优先使用 function 关键字
function getUser(id: number): UserProfile {
  return { id, name: "User" };
}

// ❌ 错误 - as 断言风格
const value = someValue as string;
const result = getValue() as string;

// ❌ 错误 - 使用 const 定义函数（优先使用 function）
const getUser = (id: number): UserProfile => {
  return { id, name: "User" };
};

// ❌ 错误 - 缺少类型注解
function getUser(id): UserProfile {
  return { id, name: "User" };
}
```

### 3. 禁止原生 enum

**使用 `const` 对象模式，使用 `<const>` 断言确保 readonly**

```typescript
// ✅ 正确
const GameServerEnum = <const>{
  CN_GF01: "cn_gf01",
  CN_QD01: "cn_qd01",
};

type GameServerEnumType = (typeof GameServerEnum)[keyof typeof GameServerEnum];

// ❌ 错误
enum GameServerEnum {
  CN_GF01 = "cn_gf01",
  CN_QD01 = "cn_qd01",
}
```

### 4. 类型定义

**优先使用 `type` 而非 `interface`**

```typescript
// ✅ 正确
type UserProfile = {
  id: number;
  name: string;
};

// ❌ 错误
interface UserProfile {
  id: number;
  name: string;
}
```

### 5. 函数定义规范

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

const loadData = async (): Promise<void> => {
  await fetch("/api/data");
};
```

**例外情况（可以使用箭头函数）：**
- 需要捕获词法 `this` 时
- 作为回调函数传递给其他函数时
- 对象字面量中的方法（根据场景判断）

### 6. 类型注解规范

- 函数参数和返回值必须显式类型注解
- 使用 `unknown` 而非 `any`
- `ref` 泛型必须显式声明

```typescript
// ✅ 正确
const count = ref<number>(0);
const list = ref<Array<string>>([]);
const isDone = ref<boolean>(false);

function getUser(id: number): UserProfile {
  return { id, name: "User" };
}

// ❌ 错误
const count = ref(0); // 缺少泛型
const list: string[] = ref([]); // 使用 [] 而非 Array

function getUser(id): UserProfile { // 缺少参数类型
  return { id, name: "User" };
}
```

### 7. JSDoc 注释

- 所有导出函数必须包含 `@since` 标签
- 枚举常量需要 `@see` 标签
- 类型定义的子成员修改时，需同步更新父级类型和文件头的 `@since` 版本号

```typescript
/**
 * 角色相关类型定义
 * @since Beta v0.9.6
 */

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

**版本更新规则：**

当修改类型的子成员时（如添加字段），需要：
1. 更新父级类型的 `@since` 为当前项目版本（递增）
2. 如该文件是主要变更文件，同步更新文件头的 `@since`

示例（项目版本从 0.9.8 → 0.9.9）：

```typescript
// 修改前
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
 * 角色信息对象
 * @since Beta v0.9.9  // 递增版本号
 */
type Character = {
  id: number;
  name: string;
  element: string; // 新增字段
};
```

## ESLint 规则对应

| 规则 | ESLint 配置 | 语法要求 |
|------|------------|---------|
| 数组类型 | `@typescript-eslint/array-type` | `Array<T>` |
| 类型断言 | `@typescript-eslint/consistent-type-assertions` | `<Type>` |
| 类型定义 | `@typescript-eslint/consistent-type-definitions` | `type` |
| 导入顺序 | `import/order` | 分组排序 |

## 详细规范

- Enum 定义：见 [enum.md](./enum.md)
- TSDoc 注释：见 [tsdoc.md](./tsdoc.md)
