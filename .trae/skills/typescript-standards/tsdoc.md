# TSDoc 注释规范

## 支持的标签

`@example` `@link` `@param` `@remarks` `@returns` `@see` `@since` `@typeParam` `@deprecated`

## 必须标签

### `@since` - 版本信息

所有导出类型、函数、枚举必须包含 `@since` 标签，版本号格式为 `Beta v{版本号}`。

#### 1. 文件头注释

在 `.ts` 或 `.d.ts` 文件顶部添加文件级注释，说明文件整体信息：

```typescript
/**
 * 角色相关类型定义
 * @since Beta v0.9.6
 */
```

#### 2. 函数定义

所有导出函数必须包含：

```typescript
/**
 * 获取角色信息
 * @since Beta v0.9.6
 * @param id - 角色 ID
 * @returns 角色信息对象
 */
function getCharacter(id: number): Character;
```

#### 3. 类型定义

类型定义（type/interface）必须包含：

```typescript
/**
 * 角色信息对象
 * @since Beta v0.9.6
 */
type Character = {
  id: number;
  name: string;
};
```

#### 4. 子成员版本更新

当修改类型定义的子成员时，需要同步更新：
- 父级类型的 `@since` 版本号（递增）
- 文件头的 `@since` 版本号（如该文件是主要变更文件）

**示例：**

假设项目当前版本为 `0.9.8`（见 `package.json`），修改类型后应更新为 `0.9.9`：

```typescript
// 修改前（v0.9.8）
/**
 * 角色信息对象
 * @since Beta v0.9.6
 */
type Character = {
  id: number;
  name: string;
};

// 修改后（v0.9.9）- 添加了新字段
/**
 * 角色信息对象
 * @since Beta v0.9.9
 */
type Character = {
  id: number;
  name: string;
  element: string; // 新增字段
};
```

**文件头同步更新示例：**

```typescript
// 修改前
/**
 * 角色相关类型定义
 * @since Beta v0.9.6
 */

// 修改后（如该文件是主要变更）
/**
 * 角色相关类型定义
 * @since Beta v0.9.9
 */
```

#### 5. 版本号规则

| 场景 | 版本号 |
|------|--------|
| 新增文件 | 使用当前项目版本 |
| 修改类型/函数 | 递增版本号（如 0.9.8 → 0.9.9） |
| 修改子成员 | 父级类型和文件头同步递增 |
| 重构无变更 | 保持原版本号 |

## 常用标签

| 标签 | 用途 |
|------|------|
| `@param name - 描述` | 参数说明 |
| `@returns 描述` | 返回值说明 |
| `@remarks 备注` | 备注说明 |
| `@see TGApp.BBS.Post.NewsType` | 参考引用 |
| `@example` | 用法示例 |
| `@deprecated` | 废弃标记 |

## 示例

```typescript
/**
 * 获取角色信息
 * @since Beta v0.9.6
 * @param id - 角色 ID
 * @returns 角色信息对象
 * @throws {NotFoundError} 当角色不存在时
 */
function getCharacter(id: number): Character { ... }

/**
 * 搜索结果返回数据
 * @remarks token_list 和 databox 目前用途不明
 */
type SearchRes = { ... };
```

## 类型定义文件 (.d.ts)

```typescript
declare namespace TGApp.BBS.Post {
  /**
   * 咨讯类型
   * @since Beta v0.9.1
   */
  const NewsType = <const>{
    NOTICE: 1,
    ACTIVITY: 2,
    NEWS: 3,
  };
}
```

## 内联成员注释

```typescript
type TGHttpParams = {
  /** 请求方法 */
  method: "GET" | "POST";
  /** 请求头 */
  headers?: Record<string, string>;
};
```