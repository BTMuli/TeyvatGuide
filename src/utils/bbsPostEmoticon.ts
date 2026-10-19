/**
 * 米游社帖子表情令牌解析。
 * @since Beta v0.12.6
 */

import { isPostUrl } from "./bbsPostDocument.js";

/**
 * 编辑器内部的官方表情值。
 * @since Beta v0.12.6
 */
type PostEmoticonValue = {
  src: string;
  name: string;
};

/**
 * 文本表情令牌拆分后的编辑器插入值。
 * @since Beta v0.12.6
 */
type PostEmoticonSegment = {
  insert: string | { emoticon: PostEmoticonValue };
  sourceLength: number;
};

/**
 * 判断表情名称是否能安全作为帖子令牌。
 * @since Beta v0.12.6
 * @param value - 表情名称
 * @returns 是否为单行且不含令牌分隔符的名称
 */
function isSafePostEmoticonName(value: string): boolean {
  return value.length > 0 && value.trim() === value && !/[\r\n()]/u.test(value);
}

/**
 * 清洗本地缓存或请求得到的官方表情映射。
 * @since Beta v0.12.6
 * @param value - 未知来源的表情映射或 JSON 文本
 * @returns 只包含安全 HTTPS 图片地址的表情映射
 */
export function parsePostEmoticonMap(value: unknown): Record<string, string> {
  let source: unknown = value;
  if (typeof source === "string") {
    try {
      source = JSON.parse(source);
    } catch {
      return {};
    }
  }
  if (typeof source !== "object" || source === null || Array.isArray(source)) return {};
  const map: Record<string, string> = {};
  for (const [name, src] of Object.entries(source)) {
    if (!isSafePostEmoticonName(name) || !isPostUrl(src, true)) continue;
    Object.defineProperty(map, name, {
      configurable: true,
      enumerable: true,
      value: src,
      writable: true,
    });
  }
  return map;
}

/**
 * 将已知的帖子表情令牌拆分为普通文字和行内表情节点。
 * @since Beta v0.12.6
 * @param text - 帖子文本节点
 * @param emoticons - 已清洗的表情映射
 * @returns 可直接插入 Quill 的分段及其原始文字长度
 */
export function splitPostEmoticonText(
  text: string,
  emoticons: Readonly<Record<string, string>>,
): Array<PostEmoticonSegment> {
  const segments: Array<PostEmoticonSegment> = [];
  const tokenPattern = /_\(([^()\r\n]+)\)/gu;
  let cursor = 0;
  let match: RegExpExecArray | null;
  while ((match = tokenPattern.exec(text)) !== null) {
    const name = match[1];
    const src = emoticons[name];
    if (src === undefined || !isPostUrl(src, true) || !isSafePostEmoticonName(name)) continue;
    if (match.index > cursor) {
      segments.push({
        insert: text.slice(cursor, match.index),
        sourceLength: match.index - cursor,
      });
    }
    segments.push({ insert: { emoticon: { name, src } }, sourceLength: match[0].length });
    cursor = match.index + match[0].length;
  }
  if (cursor < text.length || segments.length === 0) {
    segments.push({ insert: text.slice(cursor), sourceLength: text.length - cursor });
  }
  return segments;
}
