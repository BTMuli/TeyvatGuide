# TSDoc conventions

Supported common tags include `@example`, `@link`, `@param`, `@remarks`, `@returns`, `@see`, `@since`,
`@typeParam`, and `@deprecated`.

Version metadata follows the [source metadata rules](../../../rules/source-metadata-rules.md): read the `since`
property from `package.json`, never `version`, and write `@since Beta v<package.json.since>` for the current change.

## New and changed declarations

- Add a short Chinese summary.
- Add `@since Beta v<package.json.since>` using the current `package.json` `since` property.
- Document parameters as `@param name - 描述` and non-void returns with `@returns`.
- Add `@see` where a runtime enum object corresponds to a declaration object.
- When a function implementation or signature changes, update that function's `@since`; when a `type` definition
  changes, update the owning `type` (not individual fields). These rules apply to non-exported functions too.
- In non-Vue files, add a short TSDoc with `@since` when a changed function has no existing comment. Vue files are
  exempt from the file-header and missing-comment requirements; an existing function/type comment still gets its
  `@since` updated when the declaration changes.

```typescript
/**
 * 获取角色信息
 * @since Beta v<package.json.since>
 * @param id - 角色 ID
 * @returns 角色信息
 */
function getCharacter(id: number): Character;
```

## Existing declarations

Every edit to a non-Vue source file updates its file-header `@since`, including formatting-only edits. Update the
affected function/type declaration through the current `package.json` `since` value when its implementation,
signature, or type definition changes. A field change updates its owning `type`; it does not require a field-level
tag. Do not alter unrelated historical tags.

Use compact inline comments for obvious members:

```typescript
type TGHttpParams = {
  /** 请求方法 */
  method: "GET" | "POST";
  /** 请求头 */
  headers?: Record<string, string>;
};
```
