# 边界校验规则

适用于 `src/request/**` 请求层、`src/utils/network/TGHttps.ts`，以及所有考虑用 `unknown` 重新校验数据的代码。

## 策略（混合渐进）

- `TGHttps.request<T>` 的 `<T>await rawResponse.json()` 是无检查断言，接口返回值本质不可信。
- 高频易变的结构化接口（post / collection / community 域）在请求层接入 Ajv schema 校验：
  通过 `TGHttps.get/post/request` 的第 3 个参数传入结构守卫，校验失败抛出中文 HTTP 错误。
- 其余接口与所有内部数据接受声明式类型，不做运行时校验。已经过边界校验或来源于内部
  强类型代码的数据，禁止再用 `unknown` 式检查重复校验（那是 2026-10 审计删除的过度校验）。

## 接入新接口的步骤

1. 在 `src/request/schema/` 新建 JSON schema，只约束关键路径上被硬解引用的字段骨架；
   可空字段声明 `["object", "null"]`，不要罗列全部字段——schema 与 `.d.ts` 是两份事实来源，
   骨架越小漂移成本越低。字段增删由 `additionalProperties` 默认放行。
2. 共享骨架（如 `fullData.json`）用绝对伪 URL `$id`（`https://schema.local/bbs/...`）并通过
   `ajv.addSchema` 注册，引用方写完整 URL 的 `$ref`。禁止用相对 `$id` 跨文件引用：
   Ajv 会把相对 `$ref` 拼到当前 `$id` 基路径上（`bbs/bbs/fullData.json`），编译期直接抛错。
3. 在 `src/request/respValidator.ts` 添加守卫：外壳校验复用 `checkBbsResp`
   （`retcode` 为数字、`message` 为字符串；非零错误码只校验外壳，`data` 不检查，
   否则会打断 1034 验证重试等业务错误流）。失败路径 `console.error` Ajv issues 供排查。
4. 请求模块调用 `TGHttps.get(url, config, guard)`，`T` 由守卫推断，不要手写泛型参数。
5. 按 `test/network-validate.test.ts` 的模式补守卫行为测试；断言请求参数的既有测试需在
   `toHaveBeenCalledWith` 末尾补 `expect.any(Function)`。

## 已接入接口

- `postReq.post`（getPostFull）：`isPostFullResp`，schema `postFull.json`。
- `postReq.dynamic`（getDynamicData）：`isPostDynamicResp`，schema `postDynamic.json`。
- `postReq.collection`（getPostFullInCollection）：`isCollectionPostsResp`，schema `collectionPosts.json`。
- 共享骨架：`fullData.json`（FullData 最小骨架）。

## 验证

- 守卫行为必须有 Vitest 覆盖（成功载荷、业务错误码载荷、骨架漂移载荷三类）。
- `pnpm lint-vue` 会编译 schema 导入，`ajv.compile` 在引用失效时于模块加载期直接抛错。
