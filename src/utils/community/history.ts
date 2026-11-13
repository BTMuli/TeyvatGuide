/**
 * 浏览历史删除后的列表状态同步。
 * @since Beta v0.13.1
 */

/**
 * 浏览历史列表的分页状态。
 * @since Beta v0.13.1
 */
type HistoryPageState<T> = {
  entries: Array<T>;
  total: number;
  offset: string;
  isLast: boolean;
};

/**
 * 按已确认的删除结果更新本地列表，避免立即重读尚未同步的服务端历史。
 * @since Beta v0.13.1
 * @param page - 当前列表和分页状态
 * @param selectedIds - 普通选择时为删除项，全选时为保留项
 * @param deleteAll - 是否采用全选删除语义
 * @returns 删除后的列表和分页状态
 */
export function applyHistoryDeletion<T extends { id: string }>(
  page: HistoryPageState<T>,
  selectedIds: ReadonlySet<string>,
  deleteAll: boolean,
): HistoryPageState<T> {
  const entries = page.entries.filter((entry) => selectedIds.has(entry.id) === deleteAll);
  const removedCount = page.entries.length - entries.length;
  return {
    entries,
    total: deleteAll ? entries.length : Math.max(page.total, page.entries.length) - removedCount,
    offset: deleteAll ? "" : page.offset,
    isLast: deleteAll || page.isLast,
  };
}
