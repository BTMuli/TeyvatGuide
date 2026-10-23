/**
 * 米游社个人中心评论内容工具。
 * @since Beta v0.12.6
 */

/**
 * TpParser 使用的结构化节点别名。
 * @since Beta v0.12.6
 */
type ReplyNode = TGApp.BBS.SctPost.Base;

/**
 * 未知接口对象记录别名。
 * @since Beta v0.12.6
 */
type RecordValue = Record<string, unknown>;

/**
 * 判断值是否为对象记录。
 * @since Beta v0.12.6
 * @param value - 待判断的值
 * @returns 是否为对象记录
 */
function isRecord(value: unknown): value is RecordValue {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * 判断值是否为可供帖子解析器使用的结构化节点。
 * @since Beta v0.12.6
 * @param value - 待判断的值
 * @returns 是否包含结构化插入内容
 */
function isReplyNode(value: unknown): value is ReplyNode {
  if (!isRecord(value) || !Object.hasOwn(value, "insert")) return false;
  return typeof value.insert === "string" || isRecord(value.insert);
}

/**
 * 复制结构化节点，避免解析器规范化文本时改动接口响应对象。
 * @since Beta v0.12.6
 * @param node - 待复制的节点
 * @returns 可供解析器使用的节点副本
 */
function cloneReplyNode(node: ReplyNode): ReplyNode {
  const cloned: ReplyNode = {
    insert: typeof node.insert === "string" ? node.insert : { ...node.insert },
  };
  if (isRecord(node.attributes)) cloned.attributes = { ...node.attributes };
  if (Array.isArray(node.children)) {
    cloned.children = node.children.filter(isReplyNode).map((child) => cloneReplyNode(child));
  }
  return cloned;
}

/**
 * 将已解析的未知值转换为结构化节点。
 * @since Beta v0.12.6
 * @param value - 已解析的结构化内容
 * @returns 结构化节点副本
 */
function parseReplyNodes(value: unknown): Array<ReplyNode> {
  if (Array.isArray(value)) {
    return value.filter(isReplyNode).map((node) => cloneReplyNode(node));
  }
  if (isReplyNode(value)) return [cloneReplyNode(value)];
  if (typeof value === "string" && value !== "") return [{ insert: value }];
  return [];
}

/**
 * 解析接口中的结构化内容字符串。
 * @since Beta v0.12.6
 * @param raw - 结构化内容字符串
 * @returns 结构化节点及是否成功解析 JSON
 */
function parseReplyContent(raw: string): { nodes: Array<ReplyNode>; parsed: boolean } {
  try {
    return { nodes: parseReplyNodes(<unknown>JSON.parse(raw)), parsed: true };
  } catch {
    return { nodes: [], parsed: false };
  }
}

/**
 * 解析结构化内容行，兼容接口返回已解析节点或 JSON 字符串的情况。
 * @since Beta v0.12.6
 * @param rows - 结构化内容行
 * @returns 结构化节点副本
 */
function parseReplyRows(rows: unknown): Array<ReplyNode> {
  if (!Array.isArray(rows)) return [];
  return rows.flatMap((row) => {
    if (typeof row !== "string") return parseReplyNodes(row);
    try {
      return parseReplyNodes(<unknown>JSON.parse(row));
    } catch {
      return row.trim() === "" ? [] : [{ insert: row }];
    }
  });
}

/**
 * 获取结构化节点中的图片链接。
 * @since Beta v0.12.6
 * @param node - 待检查的结构化节点
 * @returns 图片链接
 */
function getImageUrl(node: ReplyNode): string | undefined {
  if (!isRecord(node.insert) || !Object.hasOwn(node.insert, "image")) return undefined;
  const image = node.insert.image;
  if (typeof image === "string") return image;
  if (isRecord(image) && typeof image.url === "string") return image.url;
  return undefined;
}

/**
 * 收集结构化内容中已经存在的图片，防止重复追加接口图片列表。
 * @since Beta v0.12.6
 * @param nodes - 待检查的结构化节点
 * @param urls - 图片链接集合
 */
function collectImageUrls(nodes: Array<ReplyNode>, urls: Set<string>): void {
  for (const node of nodes) {
    const url = getImageUrl(node);
    if (url !== undefined) urls.add(url);
    if (node.children !== undefined) collectImageUrls(node.children, urls);
  }
}

/**
 * 创建评论顶层图片节点。
 * @since Beta v0.12.6
 * @param image - 评论图片
 * @returns 图片节点；地址无效时返回 undefined
 */
function createImageNode(image: TGApp.BBS.Post.Image): ReplyNode | undefined {
  if (typeof image.url !== "string" || image.url.trim() === "") return undefined;
  try {
    const url = new URL(image.url);
    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined;
  } catch {
    return undefined;
  }
  return {
    insert: { image: { ...image } },
    attributes: { width: image.width, height: image.height },
  };
}

/**
 * 将评论响应中的图片补入正文节点。
 * @since Beta v0.12.6
 * @param nodes - 已解析正文节点
 * @param images - 评论图片列表
 * @returns 包含未重复图片的正文节点
 */
function appendCommentImages(
  nodes: Array<ReplyNode>,
  images: Array<TGApp.BBS.Post.Image>,
): Array<ReplyNode> {
  const result = [...nodes];
  const imageUrls = new Set<string>();
  collectImageUrls(result, imageUrls);
  for (const image of images) {
    if (imageUrls.has(image.url)) continue;
    const imageNode = createImageNode(image);
    if (imageNode === undefined) continue;
    const last = result.at(-1);
    if (last !== undefined && typeof last.insert === "string" && !last.insert.endsWith("\n")) {
      result.push({ insert: "\n" });
    }
    result.push(imageNode);
    imageUrls.add(image.url);
  }
  return result;
}

/**
 * 解析结构化内容字符串，失败时回退为纯文本。
 * @since Beta v0.12.6
 * @param raw - 结构化内容 JSON 字符串
 * @param fallback - 纯文本内容
 * @returns 可交给 TpParser 渲染的节点
 */
export function getStructuredContent(raw: unknown, fallback: unknown): Array<ReplyNode> {
  const text = typeof raw === "string" ? raw.trim() : "";
  if (text !== "") {
    const content = parseReplyContent(text);
    if (content.nodes.length) return content.nodes;
  }
  return typeof fallback === "string" && fallback.trim() !== "" ? [{ insert: fallback }] : [];
}

/**
 * 获取个人中心评论的安全结构化正文。
 * @since Beta v0.12.6
 * @param comment - 个人中心评论条目
 * @returns 可交给 TpParser 渲染的正文节点
 */
export function getCommunityCommentContent(
  comment: TGApp.BBS.Community.Comment,
): Array<TGApp.BBS.SctPost.Base> {
  const raw =
    typeof comment.reply.struct_content === "string" ? comment.reply.struct_content.trim() : "";
  const fallback = typeof comment.reply.content === "string" ? comment.reply.content : "";
  let nodes: Array<ReplyNode> = [];
  let parsed = false;
  if (raw !== "") {
    const content = parseReplyContent(raw);
    nodes = content.nodes;
    parsed = content.parsed;
  }
  if (nodes.length === 0) nodes = parseReplyRows(comment.reply.structured_content_rows);
  if (nodes.length === 0 && fallback !== "") nodes = [{ insert: fallback }];
  if (nodes.length === 0 && raw !== "" && !parsed) nodes = [{ insert: raw }];
  return appendCommentImages(nodes, Array.isArray(comment.images) ? comment.images : []);
}
