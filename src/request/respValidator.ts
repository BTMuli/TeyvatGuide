/**
 * 米游社接口响应结构校验器
 * @since Beta v0.13.2
 */

import { isRecord } from "@utils/common/typeGuards.js";
import Ajv, { type ValidateFunction } from "ajv";

import CollectionPostsJson from "./schema/collectionPosts.json" with { type: "json" };
import ForumImageRankForumsJson from "./schema/forumImageRankForums.json" with { type: "json" };
import ForumImageRankPostsJson from "./schema/forumImageRankPosts.json" with { type: "json" };
import FullDataJson from "./schema/fullData.json" with { type: "json" };
import PostDraftDetailJson from "./schema/postDraftDetail.json" with { type: "json" };
import PostDraftListJson from "./schema/postDraftList.json" with { type: "json" };
import PostDraftSaveJson from "./schema/postDraftSave.json" with { type: "json" };
import PostDynamicJson from "./schema/postDynamic.json" with { type: "json" };
import PostFullJson from "./schema/postFull.json" with { type: "json" };

const ajv = new Ajv.Ajv({ allErrors: true, strictTypes: false });

ajv.addSchema(FullDataJson);
const PostFullDataValidate = ajv.compile<TGApp.BBS.Post.FullRes>(PostFullJson);
const CollectionPostsValidate = ajv.compile<TGApp.BBS.Collection.PostsRes>(CollectionPostsJson);
const ForumImageRankForumsValidate =
  ajv.compile<TGApp.BBS.Forum.ImageRankForumsResp["data"]>(ForumImageRankForumsJson);
const ForumImageRankPostsValidate =
  ajv.compile<TGApp.BBS.Forum.ImageRankPostsResp["data"]>(ForumImageRankPostsJson);
const PostDynamicValidate = ajv.compile<TGApp.BBS.Post.DynamicResp["data"]>(PostDynamicJson);
const PostDraftListValidate =
  ajv.compile<TGApp.BBS.PostDraft.Api.ListResp["data"]>(PostDraftListJson);
const PostDraftDetailValidate =
  ajv.compile<TGApp.BBS.PostDraft.Api.DetailResp["data"]>(PostDraftDetailJson);
const PostDraftSaveValidate =
  ajv.compile<TGApp.BBS.PostDraft.Api.SaveResp["data"]>(PostDraftSaveJson);
const PostDraftDeleteValidate = ajv.compile<unknown>({});

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

/**
 * 分区的图区榜单目录响应结构校验。
 * @since Beta v0.13.2
 * @param value - 接口返回的原始数据
 * @returns 是否符合图区榜单目录响应结构
 */
function isForumImageRankForumsResp(value: unknown): value is TGApp.BBS.Forum.ImageRankForumsResp {
  return checkBbsResp(value, ForumImageRankForumsValidate, "getImagePostInfoList");
}

/**
 * 图区榜单帖子列表响应结构校验。
 * @since Beta v0.13.2
 * @param value - 接口返回的原始数据
 * @returns 是否符合图区榜单帖子列表响应结构
 */
function isForumImageRankPostsResp(value: unknown): value is TGApp.BBS.Forum.ImageRankPostsResp {
  return checkBbsResp(value, ForumImageRankPostsValidate, "getImagePostList");
}

/**
 * 帖子动态数据响应结构校验。
 * @since Beta v0.13.0
 * @param value - 接口返回的原始数据
 * @returns 是否符合帖子动态数据响应结构
 */
function isPostDynamicResp(value: unknown): value is TGApp.BBS.Post.DynamicResp {
  return checkBbsResp(value, PostDynamicValidate, "getDynamicData");
}

/**
 * 草稿列表响应结构校验。
 * @since Beta v0.13.1
 * @param value - 接口返回的原始数据
 * @returns 是否符合草稿列表响应结构
 */
function isPostDraftListResp(value: unknown): value is TGApp.BBS.PostDraft.Api.ListResp {
  return checkBbsResp(value, PostDraftListValidate, "getDraftList");
}

/**
 * 草稿详情响应结构校验。
 * @since Beta v0.13.1
 * @param value - 接口返回的原始数据
 * @returns 是否符合草稿详情响应结构
 */
function isPostDraftDetailResp(value: unknown): value is TGApp.BBS.PostDraft.Api.DetailResp {
  return checkBbsResp(value, PostDraftDetailValidate, "getDraftDetail");
}

/**
 * 草稿保存响应结构校验。
 * @since Beta v0.13.1
 * @param value - 接口返回的原始数据
 * @returns 是否符合草稿保存响应结构
 */
function isPostDraftSaveResp(value: unknown): value is TGApp.BBS.PostDraft.Api.SaveResp {
  return checkBbsResp(value, PostDraftSaveValidate, "saveDraft");
}

/**
 * 草稿删除响应校验，成功数据无需解引用，仅约束业务响应外壳。
 * @since Beta v0.13.1
 * @param value - 接口返回的原始数据
 * @returns 是否符合草稿删除响应结构
 */
function isPostDraftDeleteResp(value: unknown): value is TGApp.BBS.PostDraft.DeleteResp {
  return checkBbsResp(value, PostDraftDeleteValidate, "deleteDraft");
}

export {
  isCollectionPostsResp,
  isForumImageRankForumsResp,
  isForumImageRankPostsResp,
  isPostDraftDeleteResp,
  isPostDraftDetailResp,
  isPostDraftListResp,
  isPostDraftSaveResp,
  isPostDynamicResp,
  isPostFullResp,
};
