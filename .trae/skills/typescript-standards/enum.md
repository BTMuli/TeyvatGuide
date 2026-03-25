# Enum Type Definitions

This document defines the enumeration types used throughout the TeyvatGuide project, following the project's standard definition pattern.

## Directory Structure

Types can be defined in `src/types/` or at project root `types/`. Enum constants go in `enum/`. See [SKILL.md](./SKILL.md) for the complete project structure.

## Definition Steps

### Step 1: Define Type

In `src/types/<Module>/<Module>.d.ts` or `types/<Module>.d.ts`, define a `const` object and its corresponding type:

```typescript
// src/types/BBS/Post.d.ts (or types/BBS/Post.d.ts)
declare namespace TGApp.BBS.Post {
  /**
   * News type
   * @since Beta v0.9.1
   */
  const NewsType = <const>{
    /** Notice */
    NOTICE: 1,
    /** Activity */
    ACTIVITY: 2,
    /** News */
    NEWS: 3,
  };

  /**
   * News type enum
   * @since Beta v0.9.1
   */
  type NewsTypeEnum = (typeof NewsType)[keyof typeof NewsType];
}
```

### Step 2: Define Enum Constant

In `src/enum/<Module>.ts`, define the corresponding enum constant:

```typescript
// src/enum/bbs.ts
import TGApp from "../types/BBS/Post.d.ts";

/**
 * News type
 * @since Beta v0.9.1
 * @see TGApp.BBS.Post.NewsType
 */
const PostNewsTypeEnum: typeof TGApp.BBS.Post.NewsType = {
  NOTICE: 1,
  ACTIVITY: 2,
  NEWS: 3,
};
```

## Naming Conventions

| Type | Naming Rule | Example |
|------|-------------|---------|
| const object | `<Feature>Type` | `NewsType`, `PostViewType` |
| type alias | `<Feature>TypeEnum` | `NewsTypeEnum`, `ViewTypeEnum` |
| enum constant | `<Feature>TypeEnum` | `PostNewsTypeEnum`, `AvatarExtTypeEnum` |
| readonly list | `<Feature>TypeList` | `PostNewsTypeList` |
| description function | `get<Type>Desc` | `getPostNewsTypeDesc` |

## Complete Example

### 1. Define Type (Post.d.ts)

```typescript
declare namespace TGApp.BBS.Post {
  /**
   * View type
   * @since Beta v0.8.4
   */
  const PostViewType = <const>{
    /** Normal post */
    NORMAL: 1,
    /** Image post, such as fan art, COS */
    PIC: 2,
    /** Video post */
    VOD: 5,
    /** UGC Thousand Stars Realm */
    UGC: 7,
  };

  /**
   * View type enum
   * @since Beta v0.8.4
   */
  type ViewTypeEnum = (typeof PostViewType)[keyof typeof PostViewType];
}
```

### 2. Define Enum Constant (bbs.ts)

```typescript
/**
 * Post view type
 * @since Beta v0.8.4
 * @see TGApp.BBS.Post.ViewTypeEnum
 */
const PostViewTypeEnum: typeof TGApp.BBS.Post.PostViewType = {
  NORMAL: 1,
  PIC: 2,
  VOD: 5,
  UGC: 7,
};
```

### 3. Export Aggregated Object (bbs.ts)

```typescript
/** MiHoYo BBS related enums */
const bbsEnum = {
  /** Post related enums */
  post: {
    viewType: PostViewTypeEnum,
    // ...
  },
};

export default bbsEnum;
```

## Key Rules

1. **Use `<const>` assertion**: Ensures the type is readonly
2. **Type derivation**: Use `(typeof Type)[keyof typeof Type]` pattern to derive union types
3. **JSDoc comments**: Every enum needs `@since` and `@see` comments
4. **Naming consistency**: Enum constant names in .ts files should match const object names in .d.ts files
5. **Export aggregated objects**: Group related enums in a default export object
