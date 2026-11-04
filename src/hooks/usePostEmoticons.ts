/**
 * 米游社帖子官方表情目录共享状态。
 * @since Beta v0.13.0
 */

import bbsReq from "@req/bbsReq.js";
import { parsePostEmoticonMap } from "@utils/bbs/postEmoticon.js";
import type { Ref } from "vue";
import { readonly, shallowRef } from "vue";

const sharedEmoticonMap = shallowRef<Record<string, string>>(readCachedPostEmoticonMap());
const readonlyEmoticonMap: Readonly<Ref<Record<string, string>>> = readonly(sharedEmoticonMap);
let directoryRequest: Promise<void> | undefined;
let directoryLoaded = false;

/**
 * 从本地缓存安全读取官方表情目录。
 * @since Beta v0.13.0
 * @returns 已清洗的表情名称与图片地址映射
 */
function readCachedPostEmoticonMap(): Record<string, string> {
  if (typeof localStorage === "undefined") return {};
  try {
    return parsePostEmoticonMap(localStorage.getItem("emojis"));
  } catch {
    return {};
  }
}

/**
 * 提取帖子文本中的表情令牌名称。
 * @since Beta v0.13.0
 * @param text - 帖子文本
 * @returns 去重后的表情名称
 */
export function getPostEmoticonNames(text: string): Array<string> {
  const names = new Set<string>();
  const tokenPattern = /_\(([^()\r\n]+)\)/gu;
  let match: RegExpExecArray | null;
  while ((match = tokenPattern.exec(text)) !== null) {
    if (match[1].trim() === match[1]) names.add(match[1]);
  }
  return [...names];
}

/**
 * 将表情目录合并到共享响应式映射，并安全更新本地缓存。
 * @since Beta v0.13.0
 * @param next - 待合并的表情映射
 */
function mergePostEmoticonMap(next: Readonly<Record<string, string>>): void {
  if (Object.keys(next).length === 0) return;
  const merged = { ...sharedEmoticonMap.value, ...next };
  sharedEmoticonMap.value = merged;
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem("emojis", JSON.stringify(merged));
  } catch {
    // 缓存不可用时仍保留本次请求得到的响应式映射。
  }
}

/**
 * 从本地缓存补充尚未进入当前共享映射的条目。
 * @since Beta v0.13.0
 */
function syncCachedPostEmoticonMap(): void {
  const cached = readCachedPostEmoticonMap();
  const missing: Record<string, string> = {};
  for (const [name, src] of Object.entries(cached)) {
    if (sharedEmoticonMap.value[name] === undefined) missing[name] = src;
  }
  mergePostEmoticonMap(missing);
}

/**
 * 合并并发目录请求，成功加载后复用结果，失败后允许后续调用重试。
 * @since Beta v0.13.0
 * @returns 目录请求完成后的 Promise
 */
function loadPostEmoticonDirectory(): Promise<void> {
  if (directoryRequest) return directoryRequest;
  if (directoryLoaded) return Promise.resolve();

  directoryRequest = bbsReq
    .emojis()
    .then((response) => {
      if (response.retcode !== 0) return;
      const values: Record<string, string> = {};
      for (const series of response.data.list) {
        for (const emoji of series.list) values[emoji.name] = emoji.icon;
      }
      mergePostEmoticonMap(parsePostEmoticonMap(values));
      directoryLoaded = true;
    })
    .catch(() => undefined)
    .finally(() => {
      directoryRequest = undefined;
    });
  return directoryRequest;
}

/**
 * 获取帖子预览使用的表情目录，并按需补充缺失令牌。
 * @since Beta v0.13.0
 * @returns 表情映射及目录加载函数
 */
export function usePostEmoticons(): {
  emoticonMap: Readonly<Ref<Record<string, string>>>;
  ensureEmoticons: (names: ReadonlyArray<string>) => Promise<void>;
} {
  syncCachedPostEmoticonMap();

  /**
   * 按需补充指定令牌缺少的表情。
   * @since Beta v0.13.0
   * @param names - 当前文本引用的表情名称
   */
  async function ensureEmoticons(names: ReadonlyArray<string>): Promise<void> {
    const missing = names.some((name) => sharedEmoticonMap.value[name] === undefined);
    if (!missing) return;
    await loadPostEmoticonDirectory();
  }

  return { emoticonMap: readonlyEmoticonMap, ensureEmoticons };
}
