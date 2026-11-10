/**
 * 背包材料更新记录展示工具
 * @since Beta v0.13.1
 */

/**
 * 按时间升序计算相邻材料记录的数量变化，首条记录仅作为基准。
 * @since Beta v0.13.1
 * @param records - 材料更新记录
 * @returns 带有数量变化的后续记录
 */
export function getMaterialRecordChanges(
  records: ReadonlyArray<TGApp.Sqlite.UserBag.MaterialRecord>,
): Array<TGApp.Sqlite.UserBag.MaterialRecord & { diff: number }> {
  const sorted = [...records].sort((a, b) => a.time - b.time);
  return sorted.slice(1).map((record, index) => ({
    ...record,
    diff: record.count - sorted[index].count,
  }));
}

/**
 * 按本地日期保留每天最后一次库存记录，不补造没有记录的日期。
 * @since Beta v0.13.1
 * @param records - 材料更新记录
 * @returns 按时间升序排列的每日库存记录
 */
export function getMaterialRecordDailySnapshots(
  records: ReadonlyArray<TGApp.Sqlite.UserBag.MaterialRecord>,
): Array<TGApp.Sqlite.UserBag.MaterialRecord> {
  const sorted = [...records].sort((a, b) => a.time - b.time);
  const daily = new Map<string, TGApp.Sqlite.UserBag.MaterialRecord>();
  for (const record of sorted) {
    daily.set(new Date(record.time * 1000).toDateString(), record);
  }
  return Array.from(daily.values());
}

/**
 * 将材料变化幅度转换为对数值。
 * @since Beta v0.13.1
 * @param value - 材料数量变化
 * @returns 非负的对数值
 */
function toMaterialRecordLogValue(value: number): number {
  return Math.log1p(Math.abs(value)) / Math.LN10;
}

/**
 * 计算材料变化幅度的对数刻度，零点固定在底部，刻度使用真实数量的整数量级。
 * @since Beta v0.13.1
 * @param values - 材料数量变化
 * @returns 缩放后的数值与纵轴刻度
 */
export function getMaterialRecordLogScale(values: ReadonlyArray<number>): {
  values: Array<number>;
  minimum: number;
  maximum: number;
  ticks: Array<number>;
} {
  const scaled = values.map(toMaterialRecordLogValue);
  const upper = scaled.reduce((max, value) => Math.max(max, value), 0);
  const maximum = upper > 0 ? upper * 1.02 : 1;
  const minimumTickDistance = maximum / 8;
  const ticks = [0];
  const maximumMagnitude = values.reduce((max, value) => Math.max(max, Math.abs(value)), 0);
  let previous = 0;
  for (let magnitude = 1; magnitude <= maximumMagnitude; magnitude *= 10) {
    const tick = toMaterialRecordLogValue(magnitude);
    if (tick - previous < minimumTickDistance) continue;
    ticks.push(tick);
    previous = tick;
  }
  return {
    values: scaled,
    minimum: 0,
    maximum,
    ticks,
  };
}

/**
 * 将带符号的对数刻度还原为真实数量。
 * @since Beta v0.13.1
 * @param value - 带符号的对数值
 * @returns 真实数量
 */
export function restoreMaterialRecordLogValue(value: number): number {
  return value === 0 ? 0 : Math.sign(value) * Math.expm1(Math.abs(value) * Math.LN10);
}
