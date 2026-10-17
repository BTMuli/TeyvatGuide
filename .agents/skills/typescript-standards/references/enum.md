# Const-enum patterns

Use an existing declaration and runtime object before adding a new value set. If the set is shared by files or
components, or the same shape/values occur more than once, extract it to the corresponding domain declaration and
runtime files. A one-off local set can stay near its only use.

- Put shared declarations in `src/types/<Domain>/*.d.ts` under the existing `TGApp` namespace. An existing plugin may
  use `src/plugins/<Plugin>/types/*.d.ts`, preserving its exact directory casing.
- Put the runtime object in `src/enum/*.ts` or the plugin's existing runtime directory. Keep the declaration and
  runtime object paired; do not create `Types/` or duplicate an existing value object.
- Do not use a declaration-space name as a runtime value in Vue or TypeScript. Import the real runtime object.
- The file header, declaration object, derived union, and runtime object use `@since Beta v<package.json.since>`
  from `package.json`'s `since` property when changed. Never use `version`; do not rewrite unrelated history.

## Declaration file

Declare the shape and derive its value union inside the existing `TGApp` namespace. Update the `type`'s `@since`
when its values change; member comments do not need individual version tags.

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
