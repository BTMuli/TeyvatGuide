/**
 * 米游社浏览选项解析。
 * @since Beta v0.13.2
 */

/**
 * 默认浏览的米游社分区。
 * @since Beta v0.13.2
 */
export const defaultCommunityGid = 2;

/**
 * 读取路由中的分区或版块 ID，允许表示发现版块的 0。
 * @since Beta v0.13.2
 * @param value - 路由参数或查询参数
 * @returns 有效的数值 ID
 */
export function parseBrowsingId(value: unknown): number | undefined {
  if (typeof value !== "string" || !/^\d+$/.test(value)) return undefined;
  const id = Number(value);
  return Number.isSafeInteger(id) ? id : undefined;
}

/**
 * 按优先顺序匹配可用选项，缺省时返回第一项。
 * @since Beta v0.13.2
 * @param options - 当前页面可用的选项
 * @param getId - 读取选项 ID
 * @param preferredIds - 依次尝试的链接、记忆或默认值
 * @returns 当前生效的选项
 */
export function resolveBrowsingOption<T>(
  options: ReadonlyArray<T>,
  getId: (option: T) => number,
  ...preferredIds: Array<number | undefined>
): T | undefined {
  for (const id of preferredIds) {
    if (id === undefined) continue;
    const match = options.find((option) => getId(option) === id);
    if (match !== undefined) return match;
  }
  return options[0];
}
