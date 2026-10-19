/**
 * 米游社普通图文帖发布、编辑与删除请求。
 * @since Beta v0.12.6
 */

import { assertPostDocumentContent, buildPostDocument, isPostUrl } from "@utils/bbsPostDocument.js";
import { serializePostDocument } from "@utils/bbsPostHtml.js";
import {
  assertPicturePostDocument,
  buildPicturePostDocument,
  parsePicturePostContent,
  serializePicturePostDescribe,
} from "@utils/bbsPostPicture.js";
import { getRequestHeader } from "@utils/getRequestHeader.js";
import TGHttps from "@utils/TGHttps.js";

const postApiUrl: Readonly<string> = "https://bbs-api.miyoushe.com/post/wapi/";
const postViewType: Readonly<1> = 1;
const picturePostViewType: Readonly<2> = 2;
const maxSubjectLength: Readonly<number> = 30;
const maxContentLength: Readonly<number> = 30000;
const maxImageCount: Readonly<number> = 50;
const maxMentionCount: Readonly<number> = 100;
const defaultUserAiContentChoice: Readonly<string> = "USER_AI_CONTENT_CHOICE_NOT_AI";
const userAiContentChoices: ReadonlySet<string> = new Set([
  "USER_AI_CONTENT_CHOICE_UNKNOWN",
  "USER_AI_CONTENT_CHOICE_NOT_AI",
  "USER_AI_CONTENT_CHOICE_IS_AI",
]);

/**
 * 普通图文帖变更请求体。
 * @since Beta v0.12.6
 */
type PostMutationBody = {
  gids: string;
  f_forum_id: number;
  forum_id: number;
  forum_cate_id: number;
  topic_ids: Array<number>;
  subject: string;
  content: string;
  structured_content: string;
  view_type: number;
  cover: string;
  is_original: number;
  republish_authorization: number;
  block_reply_img: number;
  user_ai_content_choice: string;
  post_id?: string;
};

type MutationDocument =
  TGApp.BBS.PostEdit.Document | (TGApp.BBS.PostEdit.DraftDocument & { length: number });

/**
 * 帖子删除请求体。
 * @since Beta v0.12.6
 */
type DeleteBody = {
  gids: string;
  post_id: string;
  operate_type: 0;
  forum_id: number;
};

/**
 * 来源数据运行时记录。
 * @since Beta v0.12.6
 */
type SourceRecord = Record<string, unknown>;

/**
 * 判断值是否为普通记录。
 * @since Beta v0.12.6
 * @param value - 待判断的值
 * @returns 是否为普通记录
 */
function isRecord(value: unknown): value is SourceRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * 校验正整数。
 * @since Beta v0.12.6
 * @param value - 待校验的值
 * @param name - 字段名称
 * @returns 校验后的整数
 */
function getPositiveInteger(value: unknown, name: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) {
    throw new TypeError(`${name}必须为正整数`);
  }
  return value;
}

/**
 * 校验非负整数。
 * @since Beta v0.12.6
 * @param value - 待校验的值
 * @param name - 字段名称
 * @returns 校验后的整数
 */
function getNonNegativeInteger(value: unknown, name: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new TypeError(`${name}必须为非负整数`);
  }
  return value;
}

/**
 * 校验当前帖子类型。
 * @since Beta v0.12.6
 * @param value - 米游社 view_type
 * @returns 支持的帖子类型
 */
function getPostViewType(value: unknown): 1 | 2 {
  if (value !== postViewType && value !== picturePostViewType) {
    throw new TypeError("仅支持编辑普通图文帖或图片帖");
  }
  return value;
}

/**
 * 获取编辑设置中的帖子类型，缺省按普通图文帖处理。
 * @since Beta v0.12.6
 * @param value - 编辑设置中的 viewType
 * @returns 支持的帖子类型
 */
function getSettingsViewType(value: unknown): 1 | 2 {
  return value === undefined ? postViewType : getPostViewType(value);
}

/**
 * 校验评论图片权限标记。
 * @since Beta v0.12.6
 * @param value - 米游社 0/1 权限标记
 * @returns 校验后的标记
 */
function getBlockReplyImg(value: unknown): number {
  if (value !== 0 && value !== 1) throw new TypeError("评论图片权限标记必须为 0 或 1");
  return value;
}

/**
 * 校验 AI 内容选择标记。
 * @since Beta v0.12.6
 * @param value - 米游社 AI 内容选择标记
 * @returns 校验后的标记
 */
function getUserAiContentChoice(value: unknown): string {
  if (typeof value !== "string" || !userAiContentChoices.has(value)) {
    throw new TypeError("AI 内容选择标记无效");
  }
  return value;
}

/**
 * 获取新帖默认 AI 内容选择标记。
 * @since Beta v0.12.6
 * @param value - 米游社 AI 内容选择标记
 * @returns 校验后的标记
 */
function getCreateUserAiContentChoice(value: unknown): string {
  return value === undefined ? defaultUserAiContentChoice : getUserAiContentChoice(value);
}

/**
 * 提取最小登录凭据。
 * @since Beta v0.12.6
 * @param cookie - 完整 Cookie
 * @returns 用于签名的 ltoken 和 ltuid
 */
function getAuthCookie(cookie: Record<string, string>): Record<string, string> {
  const ltoken = cookie?.ltoken?.trim();
  const ltuid = cookie?.ltuid?.trim();
  if (!ltoken || !ltuid) throw new Error("登录凭据缺少 ltoken 或 ltuid");
  return { ltoken, ltuid };
}

/**
 * 校验帖子正文节点中的提及数量。
 * @since Beta v0.12.6
 * @param nodes - 结构化正文节点
 * @returns 提及数量
 */
function countMentions(nodes: Array<TGApp.BBS.SctPost.Base>): number {
  return nodes.reduce((count, node) => {
    const insert = node.insert;
    if (!isRecord(insert)) return count;
    return count + (isRecord(insert.mention) ? 1 : 0);
  }, 0);
}

/**
 * 校验帖子来源的基础元数据。
 * @since Beta v0.12.6
 * @param source - 帖子完整数据
 */
function assertBasicSource(source: TGApp.BBS.Post.FullData): void {
  if (!isRecord(source) || !isRecord(source.post)) {
    throw new TypeError("帖子来源数据无效");
  }
  const post = source.post;
  getPositiveInteger(post.game_id, "社区 ID");
  getPositiveInteger(post.f_forum_id, "版块 ID");
  getPositiveInteger(source.forum?.id ?? post.f_forum_id, "版块 ID");
  if (post.is_deleted !== 0) throw new TypeError("帖子已删除或删除状态未知");
}

/**
 * 判断来源是否明确标记为非盈利帖子。
 * 官方普通帖响应已观察到状态 -2，保留现有状态 0 作为兼容值；这里不宣称完整状态枚举。
 * @since Beta v0.12.6
 * @param post - 帖子状态
 * @returns 是否可安全保留盈利元数据
 */
function hasSafeProfitMetadata(post: TGApp.BBS.Post.FullData["post"]): boolean {
  return (
    post.is_profit === false &&
    post.is_in_profit === false &&
    (post.profit_post_status === 0 || post.profit_post_status === -2)
  );
}

/**
 * 校验帖子来源的可编辑元数据。
 * @since Beta v0.12.6
 * @param source - 帖子完整数据
 */
function assertEditableSource(source: TGApp.BBS.Post.FullData): void {
  assertBasicSource(source);
  const post = source.post;
  if (typeof post.subject !== "string" || post.subject.length > maxSubjectLength) {
    throw new TypeError("帖子标题数据无效");
  }
  getPostViewType(post.view_type);
  if (source.forum?.id !== undefined && source.forum.id !== post.f_forum_id) {
    throw new TypeError("帖子版块元数据不一致，无法安全编辑");
  }
  if (source.is_official_master !== false) throw new TypeError("官方帖子状态无法安全确认");
  if (post.review_id !== 0) throw new TypeError("不支持编辑审核中或审核状态未知的帖子");
  if (!hasSafeProfitMetadata(post)) {
    throw new TypeError("盈利帖子元数据无法安全保留");
  }
  if (source.collection !== null) {
    throw new TypeError("合集帖子元数据无法安全保留");
  }
  if (source.contribution_act !== null) {
    throw new TypeError("投稿活动元数据无法安全保留");
  }
  if (source.release_time_type !== "NOW" && source.release_time_type !== "ReleaseTimeTypeNone") {
    throw new TypeError("定时发布元数据无法安全保留");
  }
  if (source.future_release_time !== 0) {
    throw new TypeError("定时发布时间无法安全保留");
  }
  getUserAiContentChoice(post.user_ai_content_choice);
  if (post.block_reply_img !== 0 && post.block_reply_img !== 1) {
    throw new TypeError("评论图片权限状态未知，无法安全编辑");
  }
  if (!Array.isArray(source.vod_list) || source.vod_list.length)
    throw new TypeError("视频附件元数据无法安全保留");
  if (source.is_has_vote !== false) throw new TypeError("投票元数据无法安全保留");
  if (source.is_has_lottery !== false) throw new TypeError("抽奖元数据无法安全保留");
  if (!Array.isArray(source.link_card_list) || source.link_card_list.length)
    throw new TypeError("链接卡片元数据无法安全保留");
  if (
    source.post_full_extra_info !== null ||
    source.post_attachment_info !== null ||
    source.feed_attachment_info !== null
  ) {
    throw new TypeError("帖子附件元数据无法安全保留");
  }
  if (
    source.external_link?.external_link !== "" ||
    source.external_link?.external_link_title !== ""
  )
    throw new TypeError("外部链接元数据无法安全保留");
}

/**
 * 校验帖子来源的删除元数据。
 * @since Beta v0.12.6
 * @param source - 帖子完整数据
 */
function assertDeletableSource(source: TGApp.BBS.Post.FullData): void {
  assertBasicSource(source);
  const post = source.post;
  if (!hasSafeProfitMetadata(post)) {
    throw new TypeError("暂不支持删除盈利帖子，请在米游社网页版操作");
  }
}

/**
 * 解析并校验来源帖子的结构化正文。
 * @since Beta v0.12.6
 * @param source - 帖子完整数据
 * @returns 可编辑节点
 */
function getSourceNodes(source: TGApp.BBS.Post.FullData): Array<TGApp.BBS.SctPost.Base> {
  const structuredContent = source.post.structured_content;
  if (typeof structuredContent !== "string" || !structuredContent.trim()) {
    throw new TypeError("帖子缺少结构化正文，无法安全编辑");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(structuredContent);
  } catch {
    throw new TypeError("帖子结构化正文不是有效 JSON");
  }
  if (!Array.isArray(parsed)) throw new TypeError("帖子结构化正文格式无效");
  const document = buildPostDocument(parsed);
  assertPostDocumentContent(document);
  return document.nodes;
}

/**
 * 解析并校验来源图片帖的介绍和独立图片列表。
 * @since Beta v0.12.6
 * @param source - 帖子完整数据
 * @returns 可编辑的图片帖文档
 */
function getSourcePictureDocument(
  source: TGApp.BBS.Post.FullData,
): TGApp.BBS.PostEdit.DraftDocument & { length: number } {
  const content = parsePicturePostContent(source.post.content);
  const structuredContent = source.post.structured_content;
  if (typeof structuredContent !== "string" || !structuredContent.trim()) {
    throw new TypeError("图片帖缺少结构化介绍，无法安全编辑");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(structuredContent);
  } catch {
    throw new TypeError("图片帖结构化介绍不是有效 JSON");
  }
  const document = buildPicturePostDocument(parsed, content.imgs);
  const describe = serializePicturePostDescribe(document.nodes);
  if (
    content.describe !== describe &&
    !(describe.endsWith("\n") && content.describe === describe.slice(0, -1))
  ) {
    throw new TypeError("图片帖介绍与结构化内容不一致，无法安全编辑");
  }
  assertPicturePostDocument(document, Math.max(18, document.images.length));
  return document;
}

/**
 * 获取来源帖子中的封面地址，并确认它仍存在于正文图片中。
 * @since Beta v0.12.6
 * @param source - 帖子完整数据
 * @param images - 正文图片
 * @param viewType - 帖子类型
 * @returns 封面地址
 */
function getSourceCover(
  source: TGApp.BBS.Post.FullData,
  images: Array<string>,
  viewType: 1 | 2 = postViewType,
): string {
  const cover = source.post.cover;
  if (typeof cover !== "string") throw new TypeError("帖子封面状态未知");
  if (source.cover?.crop) throw new TypeError("暂不支持编辑裁剪过的帖子封面，请在米游社网页版编辑");
  if (viewType === picturePostViewType) {
    const detailCover = source.cover?.url;
    if (detailCover !== undefined && typeof detailCover !== "string") {
      throw new TypeError("图片帖封面状态未知");
    }
    if (cover && detailCover !== undefined && cover !== detailCover) {
      throw new TypeError("图片帖封面元数据不一致，无法安全编辑");
    }
    const selectedCover = detailCover || cover || images[0] || "";
    if (selectedCover && !images.includes(selectedCover)) {
      throw new TypeError("帖子封面已不在图片帖图片中，无法安全编辑");
    }
    if (selectedCover && !isPostUrl(selectedCover, true)) {
      throw new TypeError("帖子封面地址无效");
    }
    return selectedCover;
  }
  if (cover && !images.includes(cover)) {
    throw new TypeError("帖子封面已不在正文图片中，无法安全编辑");
  }
  if (cover && !isPostUrl(cover, true)) throw new TypeError("帖子封面地址无效");
  return cover;
}

/**
 * 从官方帖子详情初始化编辑设置。
 * @since Beta v0.12.6
 * @param source - 帖子完整数据
 * @returns 普通图文帖编辑设置
 */
export function getPostEditSettings(source: TGApp.BBS.Post.FullData): TGApp.BBS.PostEdit.Settings {
  assertEditableSource(source);
  const post = source.post;
  const viewType = getPostViewType(post.view_type);
  let nodes: Array<TGApp.BBS.SctPost.Base>;
  let imageUrls: Array<string> | undefined;
  let sourceImages: Array<string>;
  if (viewType === picturePostViewType) {
    const document = getSourcePictureDocument(source);
    nodes = document.nodes;
    imageUrls = document.images;
    sourceImages = document.images;
  } else {
    nodes = getSourceNodes(source);
    sourceImages = buildPostDocument(nodes).images;
  }
  const forumCateId = source.forum?.forum_cate?.id ?? post.cate_id;
  const topicIds = post.topic_ids ?? source.topics.map((topic) => topic.id);
  if (!Array.isArray(topicIds)) throw new TypeError("帖子话题数据无效");
  const normalizedTopicIds = topicIds.map((topicId) => getPositiveInteger(topicId, "话题 ID"));
  const cateId = getNonNegativeInteger(forumCateId, "版块分类 ID");
  const isOriginal = getNonNegativeInteger(post.is_original, "原创标记");
  const republishAuthorization = getNonNegativeInteger(
    post.republish_authorization,
    "转载授权标记",
  );
  const subject = typeof post.subject === "string" ? post.subject : "";
  if (!subject.trim()) throw new TypeError("帖子标题不能为空");
  if (subject.length > maxSubjectLength) throw new TypeError("帖子标题不能超过 30 字");
  const cover = getSourceCover(source, sourceImages, viewType);
  return {
    gid: getPositiveInteger(post.game_id, "社区 ID"),
    forumId: getPositiveInteger(post.f_forum_id, "版块 ID"),
    subject,
    nodes,
    viewType,
    ...(imageUrls === undefined ? {} : { imageUrls }),
    topicIds: normalizedTopicIds,
    cateId,
    isOriginal,
    republishAuthorization,
    cover,
    blockReplyImg: getBlockReplyImg(post.block_reply_img),
    userAiContentChoice: getUserAiContentChoice(post.user_ai_content_choice),
  };
}

/**
 * 校验并构建帖子发布请求体。
 * @since Beta v0.12.6
 * @param settings - 发布设置
 * @param postId - 编辑时的帖子 ID
 * @param sourceImageCount - 编辑来源图片数量
 * @returns 完整请求体和已构建正文
 */
function buildMutationBody(
  settings: TGApp.BBS.PostEdit.Settings,
  postId?: string,
  sourceImageCount?: number,
): { body: PostMutationBody; document: MutationDocument } {
  const gid = getPositiveInteger(settings.gid, "社区 ID");
  const forumId = getPositiveInteger(settings.forumId, "版块 ID");
  const subject = typeof settings.subject === "string" ? settings.subject : "";
  if (!subject.trim()) throw new TypeError("帖子标题不能为空");
  if (subject.length > maxSubjectLength) throw new TypeError("帖子标题不能超过 30 字");
  const viewType = getSettingsViewType(settings.viewType);
  if (!Array.isArray(settings.nodes)) throw new TypeError("帖子正文节点无效");
  if (!Array.isArray(settings.topicIds)) throw new TypeError("帖子话题数据无效");
  const topicIds = settings.topicIds.map((topicId) => getPositiveInteger(topicId, "话题 ID"));
  let document: MutationDocument;
  let content: string;
  let cover = settings.cover;
  if (viewType === picturePostViewType) {
    if (!Array.isArray(settings.imageUrls)) throw new TypeError("图片帖图片列表无效");
    const pictureDocument = buildPicturePostDocument(settings.nodes, settings.imageUrls);
    const maxImages =
      postId === undefined
        ? 18
        : Math.max(18, getPositiveInteger(sourceImageCount, "来源图片数量"));
    assertPicturePostDocument(pictureDocument, maxImages);
    document = pictureDocument;
    if (!cover) cover = pictureDocument.images[0];
    content = JSON.stringify({
      imgs: pictureDocument.images,
      describe: serializePicturePostDescribe(pictureDocument.nodes),
    });
  } else {
    const textDocument = serializePostDocument(settings.nodes);
    assertPostDocumentContent(textDocument);
    if (textDocument.text.length + textDocument.images.length > maxContentLength) {
      throw new TypeError("帖子正文不能超过 30000 字");
    }
    if (textDocument.images.length > maxImageCount) throw new TypeError("帖子图片不能超过 50 张");
    if (countMentions(settings.nodes) > maxMentionCount) {
      throw new TypeError("帖子提及不能超过 100 个");
    }
    document = textDocument;
    content = textDocument.html;
  }
  if (cover && !document.images.includes(cover)) {
    throw new TypeError("帖子封面必须仍存在于正文图片中");
  }
  if (cover && !isPostUrl(cover, true)) {
    throw new TypeError("帖子封面地址无效");
  }
  const body: PostMutationBody = {
    gids: String(gid),
    f_forum_id: forumId,
    forum_id: forumId,
    forum_cate_id: getNonNegativeInteger(settings.cateId, "版块分类 ID"),
    topic_ids: topicIds,
    subject,
    content,
    structured_content: JSON.stringify(document.nodes),
    view_type: viewType,
    cover,
    is_original: getNonNegativeInteger(settings.isOriginal, "原创标记"),
    republish_authorization: getNonNegativeInteger(settings.republishAuthorization, "转载授权标记"),
    block_reply_img: getBlockReplyImg(
      postId === undefined && settings.blockReplyImg === undefined ? 1 : settings.blockReplyImg,
    ),
    user_ai_content_choice:
      postId === undefined
        ? getCreateUserAiContentChoice(settings.userAiContentChoice)
        : getUserAiContentChoice(settings.userAiContentChoice),
  };
  if (postId !== undefined) body.post_id = postId;
  return { body, document };
}

/**
 * 创建帖子变更请求头。
 * @since Beta v0.12.6
 * @param cookie - 用户 Cookie
 * @param body - 完整请求体
 * @returns 带 K2 签名的 JSON 请求头
 */
function getMutationHeaders(
  cookie: Record<string, string>,
  body: PostMutationBody | DeleteBody,
): Record<string, string> {
  return {
    ...getRequestHeader(getAuthCookie(cookie), "POST", JSON.stringify(body), "K2", true),
    "x-rpc-client_type": "2",
    "Content-Type": "application/json",
  };
}

/**
 * 校验帖子作者与当前登录账号一致。
 * @since Beta v0.12.6
 * @param source - 帖子完整数据
 * @param cookie - 用户 Cookie
 * @param editable - 是否应用普通图文帖编辑限制
 * @returns 已校验凭据
 */
function assertOwner(
  source: TGApp.BBS.Post.FullData,
  cookie: Record<string, string>,
  editable: boolean = true,
): Record<string, string> {
  if (editable) assertEditableSource(source);
  else assertDeletableSource(source);
  const authCookie = getAuthCookie(cookie);
  if (String(source.post.uid) !== authCookie.ltuid) throw new Error("仅允许帖子作者执行此操作");
  return authCookie;
}

/**
 * 创建普通图文帖。
 * @since Beta v0.12.6
 * @param settings - 发布设置
 * @param cookie - 用户 Cookie
 * @returns 服务端变更响应
 */
export async function createPost(
  settings: TGApp.BBS.PostEdit.Settings,
  cookie: Record<string, string>,
): Promise<TGApp.BBS.PostEdit.MutationResponse> {
  const { body } = buildMutationBody(settings);
  const response = await TGHttps.post<TGApp.BBS.PostEdit.MutationResponse>(
    `${postApiUrl}releasePost/v2`,
    { headers: getMutationHeaders(cookie, body), body },
  );
  return response.data;
}

/**
 * 编辑作者自己的普通图文帖。
 * @since Beta v0.12.6
 * @param source - 原帖子完整数据
 * @param settings - 更新后的发布设置
 * @param cookie - 用户 Cookie
 * @returns 服务端变更响应
 */
export async function updatePost(
  source: TGApp.BBS.Post.FullData,
  settings: TGApp.BBS.PostEdit.Settings,
  cookie: Record<string, string>,
): Promise<TGApp.BBS.PostEdit.MutationResponse> {
  const authCookie = assertOwner(source, cookie);
  const sourceViewType = getPostViewType(source.post.view_type);
  const settingsViewType = getSettingsViewType(settings.viewType);
  if (settingsViewType !== sourceViewType) {
    throw new TypeError("编辑设置不能切换帖子类型");
  }
  // 编辑前也校验服务端当前正文，避免用新设置覆盖无法安全往返的官方嵌入。
  const sourceDocument =
    sourceViewType === picturePostViewType
      ? getSourcePictureDocument(source)
      : buildPostDocument(getSourceNodes(source));
  getSourceCover(source, sourceDocument.images, sourceViewType);
  const postId = source.post.post_id;
  if (!/^[1-9]\d*$/.test(postId)) throw new TypeError("帖子 ID 必须为正整数");
  if (settings.gid !== source.post.game_id || settings.forumId !== source.post.f_forum_id) {
    throw new TypeError("编辑设置与来源帖子不一致");
  }
  const { body } = buildMutationBody(settings, postId, sourceDocument.images.length);
  const response = await TGHttps.post<TGApp.BBS.PostEdit.MutationResponse>(
    `${postApiUrl}editPost`,
    { headers: getMutationHeaders(authCookie, body), body },
  );
  return response.data;
}

/**
 * 删除作者自己的普通图文帖。
 * @since Beta v0.12.6
 * @param source - 帖子完整数据
 * @param cookie - 用户 Cookie
 * @returns 服务端变更响应
 */
export async function deletePost(
  source: TGApp.BBS.Post.FullData,
  cookie: Record<string, string>,
): Promise<TGApp.BBS.PostEdit.MutationResponse> {
  const authCookie = assertOwner(source, cookie, false);
  const postId = source.post.post_id;
  if (!/^[1-9]\d*$/.test(postId)) throw new TypeError("帖子 ID 必须为正整数");
  const forumId = getPositiveInteger(source.forum?.id ?? source.post.f_forum_id, "版块 ID");
  const body: DeleteBody = {
    gids: String(getPositiveInteger(source.post.game_id, "社区 ID")),
    post_id: postId,
    operate_type: 0,
    forum_id: forumId,
  };
  const response = await TGHttps.post<TGApp.BBS.PostEdit.MutationResponse>(
    `${postApiUrl}deletePost`,
    { headers: getMutationHeaders(authCookie, body), body },
  );
  return response.data;
}

/**
 * 查询版块发布限制。
 * @since Beta v0.12.6
 * @param gid - 社区 ID
 * @param forumId - 版块 ID
 * @param cookie - 用户 Cookie
 * @returns 服务端发布配置响应
 */
export async function checkRelease(
  gid: number,
  forumId: number,
  cookie: Record<string, string>,
): Promise<TGApp.BBS.PostEdit.ReleaseConfigResponse> {
  const params = {
    gids: getPositiveInteger(gid, "社区 ID"),
    forum_id: getPositiveInteger(forumId, "版块 ID"),
  };
  const response = await TGHttps.get<TGApp.BBS.PostEdit.ReleaseConfigResponse>(
    `${postApiUrl}check/release`,
    {
      headers: {
        ...getRequestHeader(getAuthCookie(cookie), "GET", params, "K2", true),
        "x-rpc-client_type": "2",
      },
      query: params,
    },
  );
  return response.data;
}

const postEditReq = {
  create: createPost,
  update: updatePost,
  delete: deletePost,
  checkRelease,
};

export default postEditReq;
