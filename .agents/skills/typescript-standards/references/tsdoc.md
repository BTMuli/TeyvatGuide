# TSDoc conventions

Supported common tags include `@example`, `@link`, `@param`, `@remarks`, `@returns`, `@see`, `@since`,
`@typeParam`, and `@deprecated`.

## New exported declarations

- Add a short Chinese summary.
- Add `@since Beta v<version>` using the current `package.json` version.
- Document parameters as `@param name - 描述` and non-void returns with `@returns`.
- Add `@see` where a runtime enum object corresponds to a declaration object.

```typescript
/**
 * 获取角色信息
 * @since Beta v0.11.1
 * @param id - 角色 ID
 * @returns 角色信息
 */
function getCharacter(id: number): Character;
```

## Existing declarations

Treat `@since` as repository version metadata, not as a timestamp to rewrite during formatting. When a type or API
contract changes, follow the surrounding declaration file: update the declaration's version to the current app
version when that file records contract revisions, and update the file header when it describes the revised group.
Do not alter unrelated historical tags.

Use compact inline comments for obvious members:

```typescript
type TGHttpParams = {
  /** 请求方法 */
  method: "GET" | "POST";
  /** 请求头 */
  headers?: Record<string, string>;
};
```
