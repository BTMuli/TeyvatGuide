# Enum 定义规范

## 类型定义 (.d.ts)

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

## 枚举常量 (.ts)

```typescript
const PostNewsTypeEnum: typeof TGApp.BBS.Post.NewsType = {
  NOTICE: 1,
  ACTIVITY: 2,
  NEWS: 3,
};
```

注意：引用 `const` 对象类型 (`typeof TGApp.BBS.Post.NewsType`)，而非 union type (`NewsTypeEnum`)

## 辅助工具

```typescript
// 只读列表
const PostNewsTypeList: ReadonlyArray<TGApp.BBS.Post.NewsTypeEnum> = [
  PostNewsTypeEnum.NOTICE,
  PostNewsTypeEnum.ACTIVITY,
  PostNewsTypeEnum.NEWS,
];

// 描述函数
function getPostNewsTypeDesc(newsType: TGApp.BBS.Post.NewsTypeEnum): string {
  switch (newsType) {
    case PostNewsTypeEnum.NOTICE:
      return "公告";
    case PostNewsTypeEnum.ACTIVITY:
      return "活动";
    case PostNewsTypeEnum.NEWS:
      return "资讯";
  }
}
```

## 聚合导出

```typescript
const bbsEnum = {
  post: {
    viewType: PostViewTypeEnum,
    newsType: PostNewsTypeEnum,
  },
};

export default bbsEnum;
```

## 核心规则

1. 使用 `<const>` 断言确保 readonly
2. 类型派生：`(typeof Type)[keyof typeof Type]`
3. JSDoc 必须包含 `@since` 和 `@see`
4. 枚举常量名与 .d.ts 中的 const 对象名一致
