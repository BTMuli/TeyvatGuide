/**
 * 米游社普通图文草稿读取、编辑与保存请求。
 * @since Beta v0.13.2
 */

import { buildPostDocument } from "@utils/bbs/postDocument.js";
import { serializePostDocument } from "@utils/bbs/postHtml.js";
import {
  buildPicturePostDocument,
  parsePicturePostContent,
  serializePicturePostDescribe,
} from "@utils/bbs/postPicture.js";
import { isRecord } from "@utils/common/typeGuards.js";
import { getReplyCookie, getRequestHeader } from "@utils/network/getRequestHeader.js";
import TGHttps from "@utils/network/TGHttps.js";

import {
  isPostDraftDeleteResp,
  isPostDraftDetailResp,
  isPostDraftListResp,
  isPostDraftSaveResp,
} from "./respValidator.js";

const postDraftApiUrl: Readonly<string> = "https://bbs-api.miyoushe.com/post/wapi/";
const normalViewType: Readonly<TGApp.BBS.PostDraft.ViewType> = 1;
const pictureViewType: Readonly<TGApp.BBS.PostDraft.ViewType> = 2;

/** 草稿保存接口的平铺业务字段，不包含详情响应包装和帖子身份。 @since Beta v0.13.1 */
const draftSaveFields: ReadonlyArray<string> = [
  "draft_id",
  "gids",
  "forum_id",
  "forum_cate_id",
  "subject",
  "content",
  "structured_content",
  "view_type",
  "topic_ids",
  "collection_id",
  "cover",
  "is_original",
  "republish_authorization",
  "block_reply_img",
  "is_profit",
  "lottery",
  "is_pre_publication",
  "video_id",
  "link_card_list",
  "contribution_act",
  "release_time_type",
  "future_release_time",
];

/** 草稿请求边界的原始字段记录。 @since Beta v0.13.1 */
type DraftRecord = TGApp.BBS.PostDraft.Api.DraftRecord;

/**
 * 从未知值读取草稿 ID。
 * @since Beta v0.13.1
 * @param value - 待读取的值
 * @param name - 字段名称
 * @returns 草稿 ID
 */
function getDraftId(value: unknown, name: string = "草稿 ID"): string {
  if (typeof value !== "string" && typeof value !== "number") {
    throw new TypeError(`${name}无效`);
  }
  if (typeof value === "number" && !Number.isSafeInteger(value)) {
    throw new TypeError(`${name}超出安全整数范围`);
  }
  const id = String(value).trim();
  if (!/^\d+$/u.test(id)) throw new TypeError(`${name}无效`);
  return id;
}

/**
 * 从未知值读取整数，缺失时使用默认值。
 * @since Beta v0.13.1
 * @param value - 待读取的值
 * @param fallback - 缺失时的默认值
 * @returns 整数值
 */
function getInteger(value: unknown, fallback: number = 0): number {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "string" && /^-?\d+$/u.test(value.trim())) {
    const parsed = Number(value);
    if (Number.isSafeInteger(parsed)) return parsed;
  }
  if (typeof value === "number" && Number.isSafeInteger(value)) return value;
  return fallback;
}

/**
 * 从未知值读取非负整数。
 * @since Beta v0.13.1
 * @param value - 待读取的值
 * @param name - 字段名称
 * @returns 校验后的整数
 */
function getNonNegativeInteger(value: unknown, name: string): number {
  const parsed = getInteger(value, Number.NaN);
  if (!Number.isSafeInteger(parsed) || parsed < 0) throw new TypeError(`${name}无效`);
  return parsed;
}

/**
 * 将草稿合集 ID 归一为不丢精度的十进制字符串。
 * @since Beta v0.13.2
 * @param value - 接口或草稿设置中的合集 ID
 * @param name - 字段名称
 * @returns 非负合集 ID；缺失时省略
 */
function getCollectionIdText(value: unknown, name: string = "合集 ID"): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value) || value < 0) throw new TypeError(`${name}无效`);
    return String(value);
  }
  if (typeof value !== "string") throw new TypeError(`${name}无效`);
  const text = value.trim();
  if (!/^\d+$/u.test(text)) throw new TypeError(`${name}无效`);
  return BigInt(text).toString();
}

/**
 * 读取草稿设置中的目标合集选择。
 * @since Beta v0.13.2
 * @param value - 草稿设置或详情中的合集 ID
 * @returns 缺省、移出合集或正整数 ID
 */
function getCollectionSelection(value: unknown): string | null | undefined {
  if (value === undefined || value === null) return value;
  const collectionId = getCollectionIdText(value);
  if (collectionId === "0") return null;
  if (collectionId === undefined) return undefined;
  return collectionId;
}

/**
 * 将草稿合集 ID 编码为接口兼容的数字或精确字符串。
 * @since Beta v0.13.2
 * @param value - 草稿合集 ID
 * @returns 安全整数使用数字，超出范围时保留字符串
 */
function getCollectionIdWire(value: unknown): number | string | undefined {
  const collectionId = getCollectionIdText(value);
  if (collectionId === undefined) return undefined;
  const numeric = Number(collectionId);
  return Number.isSafeInteger(numeric) && String(numeric) === collectionId ? numeric : collectionId;
}

/**
 * 从未知值读取帖子类型。
 * @since Beta v0.13.1
 * @param value - 米游社 view_type
 * @param fallback - 缺失时的类型
 * @returns 支持的帖子类型
 */
function getViewType(
  value: unknown,
  fallback: TGApp.BBS.PostDraft.ViewType = normalViewType,
): TGApp.BBS.PostDraft.ViewType {
  const viewType = getInteger(value, fallback);
  if (viewType !== normalViewType && viewType !== pictureViewType) {
    throw new TypeError("草稿包含暂不支持的帖子类型，请在米游社网页版编辑");
  }
  return viewType;
}

/**
 * 读取草稿的结构化正文。
 * @since Beta v0.13.1
 * @param value - JSON 字符串或结构化节点
 * @returns 结构化节点输入
 */
function parseStructuredContent(value: unknown): unknown {
  if (value === undefined || value === null || value === "") return [];
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    throw new TypeError("草稿结构化正文不是有效 JSON");
  }
}

/**
 * 从草稿字段中读取话题 ID。
 * @since Beta v0.13.1
 * @param draft - 草稿原始数据
 * @returns 话题 ID 列表
 */
function getTopicIds(draft: DraftRecord): Array<number> {
  const rawTopicIds = draft.topic_ids;
  if (Array.isArray(rawTopicIds)) {
    return rawTopicIds.map((value) => getNonNegativeInteger(value, "话题 ID"));
  }
  if (!Array.isArray(draft.topics)) return [];
  return draft.topics.map((value) => {
    if (!isRecord(value)) throw new TypeError("草稿话题数据无效");
    return getNonNegativeInteger(value.id, "话题 ID");
  });
}

/**
 * 读取草稿附带的话题摘要，用于展示名称、简介与封面。
 * @since Beta v0.13.2
 * @param value - 草稿详情中的话题列表
 * @returns 已归一化的话题摘要，忽略无法识别的条目
 */
function getDraftTopics(value: unknown): Array<TGApp.BBS.Topic.Summary> {
  if (!Array.isArray(value)) return [];
  const topics: Array<TGApp.BBS.Topic.Summary> = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (!isRecord(item)) continue;
    const id =
      typeof item.id === "number" && Number.isSafeInteger(item.id) && item.id > 0
        ? String(item.id)
        : typeof item.id === "string" && /^[1-9]\d*$/u.test(item.id.trim())
          ? item.id.trim()
          : undefined;
    const name = typeof item.name === "string" ? item.name.trim() : "";
    if (id === undefined || !name || seen.has(id)) continue;
    seen.add(id);
    topics.push({
      id,
      name,
      ...(typeof item.desc === "string" && item.desc.trim() ? { desc: item.desc.trim() } : {}),
      ...(typeof item.cover === "string" && item.cover.trim() ? { cover: item.cover.trim() } : {}),
    });
  }
  return topics;
}

/**
 * 获取草稿封面地址。
 * @since Beta v0.13.1
 * @param value - 草稿封面字段
 * @returns 封面地址
 */
function getCover(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value;
  if (isRecord(value) && typeof value.url === "string") {
    if (value.crop) throw new TypeError("草稿封面包含暂不支持的裁剪元数据");
    return value.url;
  }
  if (isRecord(value)) throw new TypeError("草稿封面包含暂不支持的裁剪元数据");
  throw new TypeError("草稿封面数据无效");
}

/**
 * 从平铺或嵌套草稿字段中读取合集 ID。
 * @since Beta v0.13.2
 * @param draft - 草稿原始数据
 * @param post - 嵌套帖子数据
 * @returns 原始合集 ID；未声明时省略
 */
function getRawCollectionId(draft: DraftRecord, post: DraftRecord): unknown {
  const draftSettings = isRecord(draft.settings) ? draft.settings : undefined;
  const postSettings = isRecord(post.settings) ? post.settings : undefined;
  const collection = isRecord(draft.collection) ? draft.collection : undefined;
  for (const record of [draft, draftSettings, post, postSettings, collection]) {
    if (record && record.collection_id !== undefined) return record.collection_id;
  }
  return undefined;
}

/**
 * 将官方 FullData 草稿归一化为编辑器和保存接口使用的平铺字段。
 * @since Beta v0.13.2
 * @param draft - 详情中的草稿数据，兼容早期平铺格式
 * @returns 平铺字段，不包含详情响应包装
 */
function normalizeDraftFields(draft: DraftRecord): DraftRecord {
  if (!isRecord(draft.post)) {
    const collectionId = getRawCollectionId(draft, draft);
    return collectionId === undefined ? { ...draft } : { ...draft, collection_id: collectionId };
  }
  const post = draft.post;
  const forum = isRecord(draft.forum) ? draft.forum : undefined;
  const category = isRecord(forum?.forum_cate) ? forum.forum_cate : undefined;
  const collectionId = getRawCollectionId(draft, post);
  const cover = isRecord(draft.cover) ? draft.cover.url : draft.cover;
  const linkCards = Array.isArray(draft.link_card_list)
    ? draft.link_card_list.map((card) => {
        const id = isRecord(card) ? card.card_id : card;
        if ((typeof id !== "string" && typeof id !== "number") || !String(id).trim())
          throw new TypeError("草稿链接卡片 ID 无效");
        return String(id);
      })
    : undefined;
  return {
    game_id: post.game_id ?? draft.game_id,
    gids: post.gids ?? draft.gids,
    subject: post.subject,
    content: post.content,
    structured_content: post.structured_content,
    view_type: post.view_type,
    forum_id: forum?.id ?? post.f_forum_id ?? post.forum_id,
    forum_cate_id: category?.id ?? post.cate_id ?? post.forum_cate_id,
    topic_ids: post.topic_ids,
    topics: draft.topics ?? post.topics,
    cover: cover ?? post.cover,
    ...(collectionId === undefined ? { collection_id: 0 } : { collection_id: collectionId }),
    is_original: post.is_original,
    republish_authorization: post.republish_authorization,
    block_reply_img: post.block_reply_img,
    user_ai_content_choice: post.user_ai_content_choice,
    is_profit: post.is_profit,
    is_pre_publication: draft.is_pre_publication ?? post.is_pre_publication,
    lottery: draft.lottery,
    video_id: draft.video_id ?? post.video_id,
    link_card_list: linkCards,
    contribution_act: draft.contribution_act,
    release_time_type: draft.release_time_type,
    future_release_time: draft.future_release_time,
  };
}

/**
 * 提取可用于草稿保存的字段，避免透传详情包装或帖子身份。
 * @since Beta v0.13.1
 * @param fields - 已归一化的草稿字段
 * @returns 草稿保存字段快照
 */
function getDraftSaveSeed(fields: DraftRecord): DraftRecord {
  const seed: DraftRecord = {};
  for (const key of draftSaveFields) {
    if (fields[key] !== undefined) seed[key] = fields[key];
  }
  return seed;
}

/**
 * 读取实际作者 UID，忽略尚未绑定作者的草稿占位值。
 * @since Beta v0.13.1
 * @param value - 响应中的作者 UID
 * @returns 作者 UID，未指定时省略
 */
function getDraftOwnerUid(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "" || value === 0 || value === "0")
    return undefined;
  return getDraftId(value, "草稿作者 UID");
}

/**
 * 将草稿原始数据转换为编辑器设置。
 * @since Beta v0.13.2
 * @param draft - 草稿原始数据
 * @returns 编辑器设置
 */
function getDraftSettings(draft: DraftRecord): TGApp.BBS.PostEdit.Settings {
  const viewType = getViewType(draft.view_type);
  if (
    (draft.structured_content === undefined ||
      draft.structured_content === null ||
      draft.structured_content === "") &&
    typeof draft.content === "string" &&
    draft.content.trim() !== ""
  ) {
    throw new TypeError("草稿缺少结构化正文，无法安全编辑");
  }
  const parsedStructuredContent = parseStructuredContent(draft.structured_content);
  const normalizedStructuredContent =
    Array.isArray(parsedStructuredContent) && parsedStructuredContent.length === 0
      ? [{ insert: "\n" }]
      : parsedStructuredContent;
  if (
    viewType === normalViewType &&
    Array.isArray(parsedStructuredContent) &&
    parsedStructuredContent.length === 0 &&
    typeof draft.content === "string" &&
    draft.content.trim() !== ""
  ) {
    throw new TypeError("草稿结构化正文与正文内容不一致，无法安全编辑");
  }
  let nodes: Array<TGApp.BBS.SctPost.Base>;
  let imageUrls: Array<string> | undefined;

  if (viewType === pictureViewType) {
    const pictureContent =
      draft.content === undefined || draft.content === ""
        ? { imgs: [], describe: "" }
        : parsePicturePostContent(draft.content);
    const pictureDocument = buildPicturePostDocument(
      normalizedStructuredContent,
      pictureContent.imgs,
    );
    const structuredDescribe = serializePicturePostDescribe(pictureDocument.nodes);
    if (
      pictureContent.describe !== structuredDescribe &&
      !(
        structuredDescribe.endsWith("\n") &&
        pictureContent.describe === structuredDescribe.slice(0, -1)
      )
    ) {
      throw new TypeError("草稿图片介绍与结构化内容不一致，无法安全编辑");
    }
    nodes = pictureDocument.nodes;
    imageUrls = pictureDocument.images;
  } else {
    nodes = buildPostDocument(normalizedStructuredContent).nodes;
  }

  const gid = getInteger(draft.game_id ?? draft.gid ?? draft.gids, 0);
  const forumId = getNonNegativeInteger(draft.forum_id ?? draft.f_forum_id ?? 0, "版块 ID");
  const cateId = getNonNegativeInteger(draft.forum_cate_id ?? draft.cate_id ?? 0, "版块分类 ID");
  const isOriginal = getNonNegativeInteger(draft.is_original ?? 0, "原创标记");
  const republishAuthorization = getNonNegativeInteger(
    draft.republish_authorization ?? 0,
    "转载授权标记",
  );
  const blockReplyImg = getNonNegativeInteger(draft.block_reply_img ?? 0, "评论图片权限标记");
  const subject = typeof draft.subject === "string" ? draft.subject : "";
  const cover = getCover(draft.cover);
  const collectionId = getCollectionSelection(draft.collection_id);

  return {
    gid,
    forumId,
    subject,
    nodes,
    viewType,
    ...(imageUrls === undefined ? {} : { imageUrls }),
    topicIds: getTopicIds(draft),
    cateId,
    isOriginal,
    republishAuthorization,
    cover,
    ...(collectionId === undefined ? {} : { collectionId }),
    blockReplyImg,
    ...(typeof draft.user_ai_content_choice === "string"
      ? { userAiContentChoice: draft.user_ai_content_choice }
      : {}),
  };
}

/**
 * 将接口草稿详情转换为内部详情。
 * @since Beta v0.13.2
 * @param data - 接口详情数据
 * @returns 内部草稿详情
 */
function mapDetailData(data: DraftRecord): TGApp.BBS.PostDraft.Detail {
  const rawDraft = isRecord(data.draft) ? data.draft : data;
  const fields = normalizeDraftFields(rawDraft);
  const post = isRecord(rawDraft.post) ? rawDraft.post : rawDraft;
  const user = isRecord(rawDraft.user) ? rawDraft.user : undefined;
  const id = getDraftId(data.draft_id ?? rawDraft.draft_id);
  const version = getInteger(data.version ?? rawDraft.version, 0);
  const updatedAt = getInteger(rawDraft.updated_at ?? post.updated_at, 0);
  const postUid = getDraftOwnerUid(post.uid ?? rawDraft.user_id ?? rawDraft.owner_uid);
  const userUid = getDraftOwnerUid(user?.uid);
  if (postUid && userUid && postUid !== userUid)
    throw new TypeError("草稿作者元数据不一致，请重新读取草稿");
  const ownerUid = postUid ?? userUid;
  const settings = getDraftSettings(fields);
  const topics = getDraftTopics(fields.topics);
  const raw = getDraftSaveSeed(fields);
  if (raw.collection_id !== undefined) {
    raw.collection_id = getCollectionIdWire(raw.collection_id);
  }
  raw.cover = settings.cover;
  if (data.lottery !== undefined && raw.lottery === undefined) raw.lottery = data.lottery;
  return {
    id,
    settings,
    ...(topics.length === 0 ? {} : { topics }),
    updatedAt,
    ...(version > 0 ? { version } : {}),
    raw,
    ...(ownerUid === undefined ? {} : { ownerUid }),
  };
}

/**
 * 将接口草稿列表项转换为内部列表项。
 * @since Beta v0.13.1
 * @param item - 接口列表项
 * @param viewType - 本次请求的帖子类型
 * @returns 内部列表项
 */
function mapListItem(
  item: DraftRecord,
  viewType: TGApp.BBS.PostDraft.ViewType,
): TGApp.BBS.PostDraft.Item {
  const rawViewType = getViewType(item.view_type, viewType);
  const cover = item.cover === null || item.cover === undefined ? undefined : getCover(item.cover);
  const content =
    item.content === null || item.content === undefined ? undefined : String(item.content);
  const version = getInteger(item.version, 0);
  const updatedAt = getInteger(item.updated_at, 0);
  return {
    id: getDraftId(item.draft_id),
    subject: typeof item.subject === "string" ? item.subject : "",
    viewType: rawViewType,
    gid: getInteger(item.game_id ?? item.gid ?? item.gids, 0),
    updatedAt,
    ...(cover === undefined ? {} : { cover }),
    ...(content === undefined ? {} : { content }),
    ...(version > 0 ? { version } : {}),
  };
}

/**
 * 创建草稿读取请求头。
 * @since Beta v0.13.1
 * @param cookie - 用户 Cookie
 * @param method - 请求方法
 * @param data - 请求参数
 * @returns 带 K2 签名的请求头
 */
function getDraftHeaders(
  cookie: TGApp.App.Account.LoginCookie,
  method: "GET" | "POST",
  data: Record<string, string | number | boolean | Array<string>> | string,
): Record<string, string> {
  return {
    ...getRequestHeader(getReplyCookie(cookie), method, data, "K2", true),
    "x-rpc-client_type": "2",
    ...(method === "POST" ? { "Content-Type": "application/json" } : {}),
  };
}

/**
 * 请求单个类型的草稿列表。
 * @since Beta v0.13.1
 * @param viewType - 帖子类型
 * @param cookie - 用户 Cookie
 * @param offset - 分页偏移量
 * @param size - 分页大小
 * @returns 原始列表响应
 */
async function requestDraftList(
  viewType: TGApp.BBS.PostDraft.ViewType,
  cookie: TGApp.App.Account.LoginCookie,
  offset: string,
  size: number,
): Promise<TGApp.BBS.PostDraft.Api.ListResp> {
  const params: Record<string, string | number> = { view_type: viewType, size };
  if (offset !== "") params.offset = offset;
  const response = await TGHttps.get(
    `${postDraftApiUrl}draft/list`,
    {
      headers: getDraftHeaders(cookie, "GET", params),
      query: params,
    },
    isPostDraftListResp,
  );
  return response.data;
}

/**
 * 读取指定类型的草稿列表。
 * @since Beta v0.13.1
 * @param cookie - 用户 Cookie
 * @param offset - 分页偏移量
 * @param size - 分页大小
 * @param viewType - 帖子类型
 * @returns 草稿列表响应
 */
export async function listDrafts(
  cookie: TGApp.App.Account.LoginCookie,
  offset: string | number = 0,
  size: number = 20,
  viewType: TGApp.BBS.PostDraft.ViewType = normalViewType,
): Promise<TGApp.BBS.PostDraft.ListResp> {
  const offsetText =
    typeof offset === "number"
      ? (() => {
          if (!Number.isSafeInteger(offset) || offset < 0) throw new TypeError("草稿偏移量无效");
          return offset === 0 ? "" : String(offset);
        })()
      : offset.trim();
  if (offsetText !== "" && !/^\d+$/u.test(offsetText)) throw new TypeError("草稿偏移量无效");
  if (!Number.isSafeInteger(size) || size < 1 || size > 100)
    throw new TypeError("草稿分页大小无效");
  const response = await requestDraftList(viewType, cookie, offsetText, size);
  if (response.retcode !== 0) {
    return { retcode: response.retcode, message: response.message, data: null };
  }
  if (response.data === null) throw new TypeError("草稿列表响应数据无效");
  return {
    ...response,
    data: {
      list: response.data.list.map((item) => mapListItem(item, viewType)),
      is_last: response.data.is_last,
      next_offset: String(response.data.next_offset),
    },
  };
}

/**
 * 读取草稿详情。
 * @since Beta v0.13.1
 * @param id - 草稿 ID
 * @param cookie - 用户 Cookie
 * @returns 草稿详情响应
 */
export async function getDraftDetail(
  id: string,
  cookie: TGApp.App.Account.LoginCookie,
): Promise<TGApp.BBS.PostDraft.DetailResp> {
  const draftId = getDraftId(id);
  const params = { draft_id: draftId };
  const response = await TGHttps.get(
    `${postDraftApiUrl}draft/detail`,
    {
      headers: getDraftHeaders(cookie, "GET", params),
      query: params,
    },
    isPostDraftDetailResp,
  );
  if (response.data.retcode !== 0) {
    return { retcode: response.data.retcode, message: response.data.message, data: null };
  }
  if (response.data.data === null) throw new TypeError("草稿详情响应数据无效");
  const data: DraftRecord = { ...response.data.data };
  const detail = mapDetailData(data);
  if (detail.id !== draftId) throw new TypeError("草稿详情 ID 与请求不一致");
  return {
    ...response.data,
    data: detail,
  };
}

/**
 * 构造草稿保存请求体。
 * @since Beta v0.13.2
 * @param settings - 编辑器设置
 * @param source - 原始草稿详情
 * @returns 保存请求体
 */
function buildSaveBody(
  settings: TGApp.BBS.PostEdit.Settings,
  source?: TGApp.BBS.PostDraft.Detail,
): DraftRecord {
  if (!Array.isArray(settings.nodes)) throw new TypeError("草稿正文节点无效");
  if (!Array.isArray(settings.topicIds)) throw new TypeError("草稿话题数据无效");
  const viewType = getViewType(settings.viewType);
  const topicIds = settings.topicIds.map((topicId) => getNonNegativeInteger(topicId, "话题 ID"));
  const body = getDraftSaveSeed(source?.raw ?? {});
  body.draft_id = source?.id ?? 0;
  body.gids = String(getNonNegativeInteger(settings.gid, "社区 ID"));
  body.forum_id = getNonNegativeInteger(settings.forumId, "版块 ID");
  body.forum_cate_id = getNonNegativeInteger(settings.cateId, "版块分类 ID");
  body.subject = typeof settings.subject === "string" ? settings.subject : "";
  body.view_type = viewType;
  body.topic_ids = topicIds;
  const collectionId = getCollectionSelection(settings.collectionId);
  if (collectionId === null) {
    body.collection_id = 0;
  } else if (collectionId !== undefined) {
    body.collection_id = getCollectionIdWire(collectionId);
  } else if (body.collection_id !== undefined) {
    body.collection_id = getCollectionIdWire(body.collection_id);
  }
  body.is_original = getNonNegativeInteger(settings.isOriginal, "原创标记");
  body.republish_authorization = getNonNegativeInteger(
    settings.republishAuthorization,
    "转载授权标记",
  );
  body.block_reply_img = getNonNegativeInteger(settings.blockReplyImg ?? 0, "评论图片权限标记");

  if (viewType === pictureViewType) {
    const images = settings.imageUrls ?? [];
    const nodes = settings.nodes.length > 0 ? settings.nodes : [{ insert: "\n" }];
    const document = buildPicturePostDocument(nodes, images);
    body.content = JSON.stringify({
      imgs: document.images,
      describe: serializePicturePostDescribe(document.nodes),
    });
    body.structured_content = JSON.stringify(document.nodes);
    body.cover = settings.cover || document.images[0] || "";
  } else {
    const nodes = settings.nodes.length > 0 ? settings.nodes : [{ insert: "\n" }];
    const document = serializePostDocument(nodes);
    body.content = document.html;
    body.structured_content = JSON.stringify(document.nodes);
    body.cover = settings.cover || "";
  }

  if (source === undefined) {
    body.is_profit ??= false;
    body.is_pre_publication ??= false;
    body.lottery ??= {};
    body.contribution_act ??= {};
    body.future_release_time ??= 0;
  }
  return getDraftSaveSeed(body);
}

/**
 * 保存草稿。
 * @since Beta v0.13.2
 * @param settings - 编辑器设置
 * @param cookie - 用户 Cookie
 * @param source - 已读取的草稿详情；缺省时创建新草稿
 * @returns 草稿保存响应
 */
export async function saveDraft(
  settings: TGApp.BBS.PostEdit.Settings,
  cookie: TGApp.App.Account.LoginCookie,
  source?: TGApp.BBS.PostDraft.Detail,
): Promise<TGApp.BBS.PostDraft.SaveResp> {
  if (source?.ownerUid !== undefined && source.ownerUid !== cookie.ltuid_v2) {
    throw new Error("草稿作者与当前米社账号不一致");
  }
  const body = buildSaveBody(settings, source);
  const response = await TGHttps.post(
    `${postDraftApiUrl}draft/save`,
    {
      headers: getDraftHeaders(cookie, "POST", JSON.stringify(body)),
      body,
    },
    isPostDraftSaveResp,
  );
  if (response.data.retcode !== 0) {
    return { retcode: response.data.retcode, message: response.data.message, data: null };
  }
  if (response.data.data === null) throw new TypeError("草稿保存响应数据无效");
  const data: DraftRecord = { ...response.data.data };
  const draftId = getDraftId(data.draft_id);
  const savedCollectionId =
    settings.collectionId !== undefined
      ? settings.collectionId
      : body.collection_id === undefined
        ? undefined
        : body.collection_id === 0
          ? null
          : String(body.collection_id);
  const mappedSettings =
    savedCollectionId === undefined ? settings : { ...settings, collectionId: savedCollectionId };
  const mappedDraft: TGApp.BBS.PostDraft.Detail = {
    id: draftId,
    settings: mappedSettings,
    ...(source?.topics === undefined ? {} : { topics: source.topics }),
    updatedAt: 0,
    ...(source?.version === undefined ? {} : { version: source.version }),
    raw: { ...body },
    ownerUid: cookie.ltuid_v2,
  };
  return {
    ...response.data,
    data: {
      draft_id: draftId,
      draft: mappedDraft,
    },
  };
}

/**
 * 删除当前账号的指定云草稿。
 * @since Beta v0.13.1
 * @param id - 草稿 ID
 * @param cookie - 用户 Cookie
 * @returns 删除业务响应，不触发帖子发布或删除
 */
export async function deleteDraft(
  id: string,
  cookie: TGApp.App.Account.LoginCookie,
): Promise<TGApp.BBS.PostDraft.DeleteResp> {
  const draftId = getDraftId(id);
  if (!/^[1-9]\d*$/u.test(draftId)) throw new TypeError("草稿 ID 必须为正整数");
  const body = { draft_id: draftId };
  const response = await TGHttps.post(
    `${postDraftApiUrl}draft/delete`,
    { headers: getDraftHeaders(cookie, "POST", JSON.stringify(body)), body },
    isPostDraftDeleteResp,
  );
  return response.data;
}

const postDraftReq = {
  list: listDrafts,
  detail: getDraftDetail,
  save: saveDraft,
  delete: deleteDraft,
};

export default postDraftReq;
