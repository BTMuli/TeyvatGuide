# Const-enum patterns

## Declaration file

Declare the shape and derive its value union inside the existing `TGApp` namespace:

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

## Runtime object

Create a real JavaScript value with the declaration object's shape:

```typescript
const PostNewsTypeEnum: typeof TGApp.BBS.Post.NewsType = {
  NOTICE: 1,
  ACTIVITY: 2,
  NEWS: 3,
};
```

Use `TGApp.BBS.Post.NewsTypeEnum` for an individual value, not for the whole object.

In Vue scripts and templates, access values through imported runtime objects such as `bbsEnum` or `gameEnum`.
Names declared only in `.d.ts` disappear at runtime.

Use project naming patterns:

- object shape: `NewsType`
- value union: `NewsTypeEnum`
- runtime object: `PostNewsTypeEnum`
- readonly values: `PostNewsTypeList`
- description helper: `getPostNewsTypeDesc`
