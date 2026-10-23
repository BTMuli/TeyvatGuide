/**
 * 米游社回复结构化文档工具
 * @since Beta v0.13.0
 */

import { parseCustomEmoticon } from "@utils/bbs/customEmoticon.js";
import {
  createGameUidNode,
  getGameUidPreviewText,
  validateGameUidInfo,
} from "@utils/bbs/gameUid.js";

/**
 * 回复节点校验使用的对象记录
 * @since Beta v0.13.0
 */
type ReplyRecord = Record<string, unknown>;

/**
 * 带文本标记的已选提及用户
 * @since Beta v0.13.0
 */
type MentionCandidate = {
  mention: TGApp.BBS.Reply.DocumentMention;
  token: string;
};

/**
 * 自定义表情在回复文档中的确定性文本占位。
 * @since Beta v0.13.0
 */
const customEmoticonBackupText = "[自定义表情]";

/**
 * 判断值是否为对象记录
 * @since Beta v0.13.0
 * @param value - 待判断的值
 * @returns 是否为对象记录
 */
function isReplyRecord(value: unknown): value is ReplyRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * 判断对象是否只有指定的自有键
 * @since Beta v0.13.0
 * @param value - 待判断的对象
 * @param keys - 允许的键
 * @returns 是否完全匹配指定键
 */
function hasExactKeys(value: ReplyRecord, keys: Array<string>): boolean {
  const ownKeys = Object.keys(value);
  return ownKeys.length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

/**
 * 校验回复用户 UID
 * @since Beta v0.13.0
 * @param value - 待校验的 UID
 * @returns 是否为正安全整数
 */
function isReplyUid(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

/**
 * 校验回复图片尺寸
 * @since Beta v0.13.0
 * @param value - 待校验的尺寸
 * @returns 是否为正安全整数
 */
function isReplyImageDimension(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

/**
 * 校验回复提及昵称
 * @since Beta v0.13.0
 * @param value - 待校验的昵称
 * @returns 是否为有效昵称
 */
function isReplyNickname(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.trim() === value &&
    value.trim() !== "" &&
    !/[\r\n]/u.test(value)
  );
}

/**
 * 校验回复图片 HTTPS 地址
 * @since Beta v0.13.0
 * @param value - 待校验的图片地址
 * @returns 是否为 HTTPS 地址
 */
function isReplyImageUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.trim() !== value || value === "") return false;
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" && url.hostname !== "" && url.username === "" && url.password === ""
    );
  } catch {
    return false;
  }
}

/**
 * 判断回复节点是否为自定义表情节点。
 * @since Beta v0.13.0
 * @param node - 回复结构化节点
 * @returns 是否为自定义表情节点
 */
function isCustomEmoticonNode(
  node: TGApp.BBS.Reply.SendNode,
): node is { insert: TGApp.BBS.CustomEmoticon.Insert } {
  return typeof node.insert !== "string" && "custom_emoticon" in node.insert;
}

/**
 * 创建回复提及节点
 * @since Beta v0.13.0
 * @param mention - 提及用户
 * @returns 提及节点
 */
function createMentionNode(mention: TGApp.BBS.Reply.DocumentMention): TGApp.BBS.Reply.SendNode {
  if (!isReplyUid(mention.uid)) throw new TypeError("提及 UID 必须为正安全整数");
  if (!isReplyNickname(mention.nickname)) throw new TypeError("提及昵称无效");
  return { insert: { mention: { uid: mention.uid, nickname: mention.nickname } } };
}

/**
 * 创建回复图片节点
 * @since Beta v0.13.0
 * @param image - 回复图片
 * @returns 图片节点
 */
function createImageNode(image: TGApp.BBS.Reply.DocumentImage): TGApp.BBS.Reply.SendNode {
  if (!isReplyImageUrl(image.url)) throw new TypeError("回复图片必须使用 HTTPS URL");
  if (!isReplyImageDimension(image.width) || !isReplyImageDimension(image.height)) {
    throw new TypeError("回复图片尺寸必须为正安全整数");
  }
  return {
    insert: { image: image.url },
    attributes: { width: image.width, height: image.height },
  };
}

/**
 * 创建回复自定义表情节点。
 * @since Beta v0.13.0
 * @param value - 自定义表情值
 * @returns 自定义表情节点
 */
function createCustomEmoticonNode(value: TGApp.BBS.CustomEmoticon.Value): TGApp.BBS.Reply.SendNode {
  const customEmoticon = parseCustomEmoticon(value);
  if (customEmoticon.is_available === false) throw new TypeError("自定义表情已失效");
  return {
    insert: {
      custom_emoticon: customEmoticon,
      backup_text: customEmoticonBackupText,
    },
  };
}

/**
 * 将未知值解析为回复结构化节点
 * @since Beta v0.13.0
 * @param value - 待解析的节点
 * @param index - 节点索引
 * @returns 已校验且已复制的节点
 */
function parseReplySendNode(value: unknown, index: number): TGApp.BBS.Reply.SendNode {
  if (!isReplyRecord(value) || !isReplyRecord(value.insert)) {
    if (
      isReplyRecord(value) &&
      hasExactKeys(value, ["insert"]) &&
      typeof value.insert === "string"
    ) {
      return { insert: value.insert };
    }
    throw new TypeError(`回复结构化节点 ${index} 类型无效`);
  }

  if (!hasExactKeys(value, ["insert"])) {
    if (!hasExactKeys(value, ["insert", "attributes"])) {
      throw new TypeError(`回复结构化节点 ${index} 类型无效`);
    }
    if (!hasExactKeys(value.insert, ["image"]) || !isReplyImageUrl(value.insert.image)) {
      throw new TypeError(`回复结构化节点 ${index} 图片 URL 无效`);
    }
    if (!isReplyRecord(value.attributes) || !hasExactKeys(value.attributes, ["width", "height"])) {
      throw new TypeError(`回复结构化节点 ${index} 图片尺寸无效`);
    }
    if (
      !isReplyImageDimension(value.attributes.width) ||
      !isReplyImageDimension(value.attributes.height)
    ) {
      throw new TypeError(`回复结构化节点 ${index} 图片尺寸无效`);
    }
    return {
      insert: { image: value.insert.image },
      attributes: {
        width: value.attributes.width,
        height: value.attributes.height,
      },
    };
  }

  if (Object.hasOwn(value.insert, "custom_emoticon")) {
    if (
      !hasExactKeys(value.insert, ["custom_emoticon"]) &&
      !hasExactKeys(value.insert, ["custom_emoticon", "backup_text"])
    ) {
      throw new TypeError(`回复结构化节点 ${index} 自定义表情信息无效`);
    }
    if (
      Object.hasOwn(value.insert, "backup_text") &&
      value.insert.backup_text !== customEmoticonBackupText
    ) {
      throw new TypeError(`回复结构化节点 ${index} 自定义表情占位无效`);
    }
    let customEmoticon: TGApp.BBS.CustomEmoticon.Value;
    try {
      customEmoticon = parseCustomEmoticon(value.insert.custom_emoticon);
    } catch {
      throw new TypeError(`回复结构化节点 ${index} 自定义表情无效`);
    }
    if (customEmoticon.is_available === false) {
      throw new TypeError(`回复结构化节点 ${index} 自定义表情已失效`);
    }
    return {
      insert: {
        custom_emoticon: customEmoticon,
        backup_text: customEmoticonBackupText,
      },
    };
  }

  if (Object.hasOwn(value.insert, "game_user_info")) {
    if (!hasExactKeys(value.insert, ["game_user_info"])) {
      throw new TypeError(`回复结构化节点 ${index} UID 卡片信息无效`);
    }
    let gameUidInfo: TGApp.BBS.GameUid.Info;
    try {
      gameUidInfo = validateGameUidInfo(value.insert.game_user_info);
    } catch {
      throw new TypeError(`回复结构化节点 ${index} UID 卡片信息无效`);
    }
    return {
      insert: {
        game_user_info: gameUidInfo,
      },
    };
  }

  if (!hasExactKeys(value.insert, ["mention"]) || !isReplyRecord(value.insert.mention)) {
    throw new TypeError(`回复结构化节点 ${index} 类型无效`);
  }
  if (!hasExactKeys(value.insert.mention, ["uid", "nickname"])) {
    throw new TypeError(`回复结构化节点 ${index} 提及信息无效`);
  }
  if (!isReplyUid(value.insert.mention.uid)) {
    throw new TypeError(`回复结构化节点 ${index} 提及 UID 无效`);
  }
  if (!isReplyNickname(value.insert.mention.nickname)) {
    throw new TypeError(`回复结构化节点 ${index} 提及昵称无效`);
  }
  return {
    insert: {
      mention: {
        uid: value.insert.mention.uid,
        nickname: value.insert.mention.nickname,
      },
    },
  };
}

/**
 * 判断结构化节点是否含有实际内容
 * @since Beta v0.13.0
 * @param nodes - 已校验的节点
 * @returns 是否含有实际内容
 */
function hasReplySendContent(nodes: Array<TGApp.BBS.Reply.SendNode>): boolean {
  return nodes.some((node) => {
    if (typeof node.insert === "string") return node.insert.trim() !== "";
    return true;
  });
}

/**
 * 校验回复中最多存在一个自定义表情。
 * @since Beta v0.13.0
 * @param nodes - 已校验的回复节点
 */
function assertSingleCustomEmoticon(nodes: Array<TGApp.BBS.Reply.SendNode>): void {
  let count = 0;
  for (const node of nodes) {
    if (!isCustomEmoticonNode(node)) continue;
    count += 1;
    if (count > 1) throw new TypeError("回复最多添加一个自定义表情");
  }
}

/**
 * 校验并复制米游社回复结构化节点
 * @since Beta v0.13.0
 * @param nodes - 待校验的结构化节点
 * @returns 已校验且不与输入共享可变对象的节点
 */
export function validateReplySendNodes(nodes: unknown): Array<TGApp.BBS.Reply.SendNode> {
  if (!Array.isArray(nodes) || nodes.length === 0) {
    throw new TypeError("回复结构化内容不能为空");
  }
  const validated = nodes.map((node, index) => parseReplySendNode(node, index));
  assertSingleCustomEmoticon(validated);
  if (!hasReplySendContent(validated)) throw new TypeError("回复结构化内容没有实际内容");
  return validated;
}

/**
 * 从结构化节点提取回复纯文本
 * @since Beta v0.13.0
 * @param nodes - 回复结构化节点
 * @returns 回复纯文本，图片和 UID 卡片不包含在其中
 */
export function getReplyContentFromSendNodes(nodes: Array<TGApp.BBS.Reply.SendNode>): string {
  let content = "";
  let skipNextLineBreak = false;
  for (const node of nodes) {
    if (typeof node.insert === "string") {
      if (skipNextLineBreak && node.insert === "\n") {
        skipNextLineBreak = false;
        continue;
      }
      content += node.insert;
      skipNextLineBreak = false;
    } else if ("mention" in node.insert) {
      content += `@${node.insert.mention.nickname}`;
      skipNextLineBreak = false;
    } else if ("custom_emoticon" in node.insert) {
      content += customEmoticonBackupText;
      skipNextLineBreak = false;
    } else {
      skipNextLineBreak = true;
    }
  }
  return content.replace(/\n+$/u, "");
}

/**
 * 序列化米游社回复结构化节点
 * @since Beta v0.13.0
 * @param nodes - 待序列化的结构化节点
 * @returns 结构化内容 JSON
 */
export function serializeReplySendNodes(nodes: unknown): string {
  return JSON.stringify(validateReplySendNodes(nodes));
}

/**
 * 获取按昵称长度排序的提及候选
 * @since Beta v0.13.0
 * @param mentions - 已选用户
 * @returns 去重后的提及候选
 */
function getMentionCandidates(
  mentions: Array<TGApp.BBS.Reply.DocumentMention>,
): Array<MentionCandidate> {
  const candidates = new Map<string, MentionCandidate>();
  for (const mention of mentions) {
    createMentionNode(mention);
    const nickname = mention.nickname;
    const existing = candidates.get(nickname);
    if (existing !== undefined) {
      if (existing.mention.uid !== mention.uid) throw new TypeError("提及昵称对应多个 UID");
      continue;
    }
    candidates.set(nickname, { mention: { ...mention }, token: `@${nickname}` });
  }
  return Array.from(candidates.values()).sort(
    (left, right) => right.token.length - left.token.length,
  );
}

/**
 * 构建米游社回复文档
 * @since Beta v0.13.0
 * @param text - 回复文本
 * @param mentions - 已选提及用户
 * @param images - 待附加图片
 * @param customEmoticon - 待附加收藏表情
 * @param gameUid - 待附加游戏 UID 卡片
 * @returns 回复文档及发布预览
 */
export function buildReplyDocument(
  text: string,
  mentions: Array<TGApp.BBS.Reply.DocumentMention>,
  images: Array<TGApp.BBS.Reply.DocumentImage>,
  customEmoticon?: TGApp.BBS.CustomEmoticon.Value,
  gameUid?: TGApp.BBS.GameUid.Info,
): TGApp.BBS.Reply.Document {
  if (typeof text !== "string") throw new TypeError("回复文本无效");
  const content = text.trim();
  const candidates = getMentionCandidates(mentions);
  const nodes: Array<TGApp.BBS.Reply.SendNode> = [];
  let textStart = 0;
  let cursor = 0;
  while (cursor < content.length) {
    if (content[cursor] === "@") {
      const candidate = candidates.find(
        (item) =>
          content.startsWith(item.token, cursor) &&
          (cursor + item.token.length === content.length ||
            /\s/u.test(content[cursor + item.token.length])),
      );
      if (candidate) {
        if (cursor > textStart) nodes.push({ insert: content.slice(textStart, cursor) });
        nodes.push(createMentionNode(candidate.mention));
        cursor += candidate.token.length;
        textStart = cursor;
        continue;
      }
    }
    cursor += 1;
  }
  if (textStart < content.length) nodes.push({ insert: content.slice(textStart) });

  const imageNodes = images.map((image) => createImageNode({ ...image }));
  const customEmoticonNode =
    customEmoticon === undefined ? undefined : createCustomEmoticonNode(customEmoticon);
  const gameUidNode = gameUid === undefined ? undefined : createGameUidNode(gameUid);
  if (content !== "") {
    const lastNode = nodes[nodes.length - 1];
    if (lastNode !== undefined && typeof lastNode.insert === "string") {
      nodes[nodes.length - 1] = { insert: `${lastNode.insert}\n` };
    } else {
      nodes.push({ insert: "\n" });
    }
  }
  if (gameUidNode !== undefined) nodes.push(gameUidNode, { insert: "\n" });
  if (customEmoticonNode !== undefined) nodes.push(customEmoticonNode, { insert: "\n" });
  for (const imageNode of imageNodes) {
    nodes.push(imageNode, { insert: "\n" });
  }

  const structuredContent = nodes.length === 0 ? [] : validateReplySendNodes(nodes);
  const documentContent =
    structuredContent.length === 0 ? "" : getReplyContentFromSendNodes(structuredContent);
  const previewParts = [];
  if (content !== "") previewParts.push(content);
  if (gameUid !== undefined) previewParts.push(getGameUidPreviewText(gameUid));
  if (customEmoticonNode !== undefined) previewParts.push(customEmoticonBackupText);
  if (imageNodes.length > 0) previewParts.push(`图片 ${imageNodes.length} 张`);
  return { content: documentContent, structuredContent, preview: previewParts.join(" · ") };
}
