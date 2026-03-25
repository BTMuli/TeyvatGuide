# TSDoc 注释规范

本文档定义了 TeyvatGuide 项目中 TypeScript 文件的 TSDoc 注释规范。

## 配置

项目 `tsdoc.json` 支持以下标签：

- `@example` - 用法示例
- `@link` - 链接引用
- `@param` - 参数说明
- `@remarks` - 备注说明
- `@returns` - 返回值说明
- `@see` - 参考引用
- `@since` - 版本信息（**必须**）
- `@TODO` - 待办事项
- `@typeParam` - 类型参数说明
- `@deprecated` - 废弃标记

## 必选标签

### `@since`

所有导出类型、函数、枚举必须包含 `@since` 标签：

```typescript
/**
 * 获取角色信息
 * @since Beta v0.9.6
 */
function getCharacter(id: number): Character;

/**
 * 咨讯类型
 * @since Beta v0.9.1
 */
const NewsType = <const>{
  NOTICE: 1,
  ACTIVITY: 2,
  NEWS: 3,
};
```

## 常用标签

### `@param`

文档化函数参数：

```typescript
/**
 * @param name - 角色名称
 * @param level - 角色等级
 */
function greetUser(name: string, level: number): string { ... }
```

### `@returns`

文档化函数返回值：

```typescript
/**
 * @returns 格式化后的角色信息字符串
 */
function formatCharacter(character: Character): string { ... }
```

### `@remarks`

添加额外备注说明：

```typescript
/**
 * 搜索结果返回数据
 * @remarks token_list 和 databox 目前用途不明
 */
type SearchRes = { ... };
```

### `@see`

引用相关文档或代码：

```typescript
/**
 * 用户头像类型
 * @since Beta v0.7.9
 * @see TGApp.BBS.User.AvatarExtTypeEnum
 */
const AvatarExtTypeEnum = { ... };
```

### `@example`

提供用法示例：

```typescript
/**
 * @example
 * const result = getPostNewsTypeDesc(PostNewsTypeEnum.NOTICE);
 * // result === "公告"
 */
function getPostNewsTypeDesc(newsType: NewsTypeEnum): string { ... }
```

### `@deprecated`

标记废弃代码：

```typescript
/**
 * @deprecated Use `getCharacterV2` instead
 */
function getCharacter(id: number): Character { ... }
```

## 类型定义文件 (.d.ts)

命名空间内的类型定义注释规范：

```typescript
declare namespace TGApp.BBS.Post {
  /**
   * 咨讯类型
   * @since Beta v0.9.1
   * @remarks 用于相关接口参数请求
   */
  const NewsType = <const>{
    /** 公告 */
    NOTICE: 1,
    /** 活动 */
    ACTIVITY: 2,
    /** 咨讯 */
    NEWS: 3,
  };

  /**
   * 咨讯类型枚举
   * @since Beta v0.9.1
   */
  type NewsTypeEnum = (typeof NewsType)[keyof typeof NewsType];
}
```

## Enum 常量文件 (.ts)

枚举常量的注释规范：

```typescript
/**
 * 咨讯类型
 * @since Beta v0.9.1
 * @see TGApp.BBS.Post.NewsType
 */
const PostNewsTypeEnum: typeof TGApp.BBS.Post.NewsType = {
  NOTICE: 1,
  ACTIVITY: 2,
  NEWS: 3,
};
```

## 接口和类型

```typescript
/**
 * 帖子数据
 * @since Beta v0.9.8
 */
type FullData = {
  /** 帖子信息 */
  post: Post;
  /** 所属版块，可能为 null */
  forum: Forum | null;
  /** 图片列表 */
  image_list: Array<Image>;
};
```

## 内联成员注释

对象类型内部成员可以直接在成员前添加 JSDoc：

```typescript
type TGHttpParams = {
  /** 请求方法 */
  method: "GET" | "POST";
  /** 请求头 */
  headers?: Record<string, string>;
  /** 是否是Blob */
  isBlob?: boolean;
};
```

## 命名规范

| 类型 | 注释规范 |
|------|----------|
| 文件级 | 放在 `declare namespace` 之前 |
| 类型/接口 | 放在 `type` 之前，描述数据类型 |
| const 对象 | 放在 `const` 之前，描述枚举用途 |
| 函数 | 放在函数前，描述功能 |
| 参数 | 使用 `@param` 或内联 `/** */` |
| 成员 | 使用内联 `/** */` |