/**
 * 米游社表情包搜索。
 * @since Beta v0.13.1
 */

/**
 * 规范化表情搜索文本。
 * @since Beta v0.13.1
 * @param value - 用户搜索词或表情文本
 * @returns 去除全部空白并转为小写的搜索文本
 */
function normalizeEmojiSearchText(value: string): string {
  return value.replace(/\s+/gu, "").toLocaleLowerCase();
}

/**
 * 判断表情关键词是否可用于搜索。
 * @since Beta v0.13.1
 * @param value - 服务端返回的表情关键词
 * @returns 是否为非空字符串
 */
function isUsableKeyword(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

/**
 * 计算表情与搜索词的匹配程度。
 * @since Beta v0.13.1
 * @param emoji - 待匹配的表情
 * @param query - 已规范化的搜索词
 * @returns 数值越小越优先；不匹配时为 undefined
 */
function getEmojiMatchScore(emoji: TGApp.BBS.Emoji.Item, query: string): number | undefined {
  const name = normalizeEmojiSearchText(emoji.name);
  if (name === query) return 0;
  if (name.startsWith(query)) return 1;
  if (name.includes(query)) return 2;
  const keywords: ReadonlyArray<unknown> = Array.isArray(emoji.keywords) ? emoji.keywords : [];
  const matchesKeyword = keywords
    .filter(isUsableKeyword)
    .some((keyword) => normalizeEmojiSearchText(keyword).includes(query));
  return matchesKeyword ? 3 : undefined;
}

/**
 * 在全部已加载系列中搜索可用表情。
 * @since Beta v0.13.1
 * @param seriesList - 已加载的表情系列
 * @param query - 用户输入的搜索词
 * @returns 匹配的表情，按匹配程度、系列排序和表情排序排列
 */
export function searchEmojiItems(
  seriesList: ReadonlyArray<TGApp.BBS.Emoji.Series>,
  query: string,
): Array<TGApp.BBS.Emoji.Item> {
  const keyword = normalizeEmojiSearchText(query);
  if (keyword === "") return [];
  const matches: Array<{
    item: TGApp.BBS.Emoji.Item;
    score: number;
    seriesOrder: number;
  }> = [];
  const seenIds = new Set<number>();
  for (const series of seriesList) {
    if (!series.is_available) continue;
    for (const emoji of series.list) {
      if (!emoji.is_available || emoji.icon === "" || seenIds.has(emoji.id)) continue;
      const score = getEmojiMatchScore(emoji, keyword);
      if (score === undefined) continue;
      seenIds.add(emoji.id);
      matches.push({ item: emoji, score, seriesOrder: series.sort_order });
    }
  }
  return matches
    .toSorted(
      (left, right) =>
        left.score - right.score ||
        left.seriesOrder - right.seriesOrder ||
        left.item.sort_order - right.item.sort_order ||
        left.item.id - right.item.id,
    )
    .map((entry) => entry.item);
}
