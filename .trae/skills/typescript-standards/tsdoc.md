# TSDoc 注释规范

## 支持的标签

`@example` `@link` `@param` `@remarks` `@returns` `@see` `@since` `@typeParam` `@deprecated`

## 必须标签

### `@since` - 版本信息

所有导出类型、函数、枚举必须包含：

```typescript
/**
 * @since Beta v0.9.6
 */
function getCharacter(id: number): Character;
```

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