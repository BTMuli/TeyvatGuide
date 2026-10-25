/**
 * 祈愿记录虚拟网格的列数与行分组
 * @since Beta v0.13.0
 */

const RECORD_MIN_WIDTH = 84;
const RECORD_GAP = 8;

/**
 * 按记录区域的实际宽度计算网格列数。
 * @since Beta v0.13.0
 * @param width - 可用内容宽度，隐藏区域可以为 0
 * @returns 至少一列，每列保留最小卡片宽度和列间距
 */
export function getGachaRecordColumns(width: number): number {
  return Math.max(1, Math.floor((width + RECORD_GAP) / (RECORD_MIN_WIDTH + RECORD_GAP)));
}

/**
 * 将记录按虚拟滚动的固定高度行分组，保留原有顺序和对象引用。
 * @since Beta v0.13.0
 * @param records - 当前星级筛选后的记录
 * @param columns - 每行列数，列表布局使用 1
 * @returns 仅包含记录引用的行，不修改或深拷贝原始数据
 */
export function chunkGachaRecords<T>(records: ReadonlyArray<T>, columns: number): Array<Array<T>> {
  const columnCount = Math.max(1, Math.floor(columns));
  const rows: Array<Array<T>> = [];
  for (let index = 0; index < records.length; index += columnCount) {
    rows.push(records.slice(index, index + columnCount));
  }
  return rows;
}
