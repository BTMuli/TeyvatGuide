/**
 * 米游社回复编辑器的表情文档工具。
 * @since Beta v0.13.0
 */

import type Quill from "quill";

import { isPostUrl } from "./postDocument.js";
import { splitPostEmoticonText } from "./postEmoticon.js";

/**
 * 回复编辑器内部的官方表情值。
 * @since Beta v0.13.0
 */
export type ReplyEditorEmoticon = TGApp.BBS.ReplyEditor.Emoticon;

/**
 * 回复编辑器可插入的值。
 * @since Beta v0.13.0
 */
export type ReplyEditorInsert = TGApp.BBS.ReplyEditor.Insert;

/**
 * 回复编辑器可序列化的操作。
 * @since Beta v0.13.0
 */
export type ReplyEditorOperation = TGApp.BBS.ReplyEditor.Operation;

type QuillOperation = ReturnType<Quill["getContents"]>["ops"][number];

/**
 * 判断值是否为对象记录。
 * @since Beta v0.13.0
 * @param value - 待判断的值
 * @returns 是否为对象记录
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * 校验回复表情名称。
 * @since Beta v0.13.0
 * @param value - 待校验的名称
 * @returns 是否为安全的单行表情名称
 */
function isReplyEditorEmoticonName(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.trim() === value &&
    value.length > 0 &&
    !/[\r\n()]/u.test(value)
  );
}

/**
 * 校验并复制回复编辑器表情。
 * @since Beta v0.13.0
 * @param value - 未知来源的表情值
 * @returns 已校验的表情值
 */
export function normalizeReplyEditorEmoticon(value: unknown): ReplyEditorEmoticon {
  if (
    !isRecord(value) ||
    Object.keys(value).some((key) => key !== "src" && key !== "name") ||
    !isPostUrl(value.src, true) ||
    !isReplyEditorEmoticonName(value.name)
  ) {
    throw new TypeError("回复表情无效");
  }
  return { src: value.src, name: value.name };
}

/**
 * 将回复文本中的已知表情令牌转换为编辑器操作。
 * @since Beta v0.13.0
 * @param text - 回复纯文本
 * @param emoticons - 已清洗的表情映射
 * @returns 回复编辑器操作
 */
export function parseReplyEditorText(
  text: string,
  emoticons: Readonly<Record<string, string>> = {},
): Array<ReplyEditorOperation> {
  if (typeof text !== "string") throw new TypeError("回复文本无效");
  return splitPostEmoticonText(text, emoticons).map((segment) => {
    if (typeof segment.insert === "string") return { insert: segment.insert };
    return { insert: { emoticon: normalizeReplyEditorEmoticon(segment.insert.emoticon) } };
  });
}

/**
 * 校验并复制回复编辑器插入值。
 * @since Beta v0.13.0
 * @param value - 未知来源的插入值
 * @returns 已校验的插入值
 */
function normalizeReplyEditorInsert(value: unknown): ReplyEditorInsert {
  if (typeof value === "string") return value;
  if (!isRecord(value) || !Object.hasOwn(value, "emoticon") || Object.keys(value).length !== 1) {
    throw new TypeError("回复编辑器插入值无效");
  }
  return { emoticon: normalizeReplyEditorEmoticon(value.emoticon) };
}

/**
 * 将编辑器操作转换为米游社回复纯文本。
 * @since Beta v0.13.0
 * @param operations - Quill 操作列表
 * @param stripTerminalNewline - 是否去除 Quill 自动追加的末尾换行
 * @returns 回复纯文本
 */
export function serializeReplyEditorOps(
  operations: ReadonlyArray<QuillOperation | ReplyEditorOperation>,
  stripTerminalNewline: boolean = true,
): string {
  let text = "";
  for (const operation of operations) {
    if (!isRecord(operation) || !("insert" in operation)) {
      throw new TypeError("回复编辑器操作无效");
    }
    const insert = normalizeReplyEditorInsert(operation.insert);
    if (typeof insert === "string") {
      text += insert;
      continue;
    }
    text += `_(${insert.emoticon.name})`;
  }
  return stripTerminalNewline && text.endsWith("\n") ? text.slice(0, -1) : text;
}

/**
 * 获取回复编辑器插入值占用的 Quill 长度。
 * @since Beta v0.13.0
 * @param insert - 回复编辑器插入值
 * @returns Quill 文档长度
 */
export function getReplyEditorInsertLength(insert: ReplyEditorInsert): number {
  return typeof insert === "string" ? insert.length : 1;
}
