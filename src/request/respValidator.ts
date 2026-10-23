/**
 * 米游社接口响应结构校验器
 * @since Beta v0.13.0
 */

import { isRecord } from "@utils/common/typeGuards.js";
import Ajv, { type ValidateFunction } from "ajv";

import CollectionPostsJson from "./schema/collectionPosts.json" with { type: "json" };
import FullDataJson from "./schema/fullData.json" with { type: "json" };
import PostFullJson from "./schema/postFull.json" with { type: "json" };

const ajv = new Ajv.Ajv({ allErrors: true, strictTypes: false });

ajv.addSchema(FullDataJson);
const PostFullDataValidate = ajv.compile<TGApp.BBS.Post.FullRes>(PostFullJson);
const CollectionPostsValidate = ajv.compile<TGApp.BBS.Collection.PostsRes>(CollectionPostsJson);

/**
 * 校验米游社响应外壳；非零错误码响应仅校验外壳，成功响应额外校验数据骨架。
 * @since Beta v0.13.0
 * @param value - 接口返回的原始数据
 * @param validate - 成功响应数据的结构校验器
 * @param label - 日志中使用的接口名称
 * @returns 响应外壳与成功数据结构是否合法
 */
function checkBbsResp(value: unknown, validate: ValidateFunction<unknown>, label: string): boolean {
  if (!isRecord(value)) return false;
  if (typeof value.retcode !== "number") return false;
  if (typeof value.message !== "string") return false;
  if (value.retcode !== 0) return true;
  if (validate(value.data)) return true;
  console.error(`[respValidator] ${label} 响应数据结构异常:`, validate.errors);
  return false;
}

/**
 * 帖子详情响应结构校验。
 * @since Beta v0.13.0
 * @param value - 接口返回的原始数据
 * @returns 是否符合帖子详情响应结构
 */
function isPostFullResp(value: unknown): value is TGApp.BBS.Post.FullResp {
  return checkBbsResp(value, PostFullDataValidate, "getPostFull");
}

/**
 * 合集帖子响应结构校验。
 * @since Beta v0.13.0
 * @param value - 接口返回的原始数据
 * @returns 是否符合合集帖子响应结构
 */
function isCollectionPostsResp(value: unknown): value is TGApp.BBS.Collection.PostsResp {
  return checkBbsResp(value, CollectionPostsValidate, "getPostFullInCollection");
}

export { isCollectionPostsResp, isPostFullResp };
