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
 * 将材料数量转换为带符号的对数值。
 * @since Beta v0.13.1
 * @param value - 材料数量变化
 * @returns 带符号的对数值
 */
function toMaterialRecordLogValue(value: number): number {
  return value === 0 ? 0 : (Math.sign(value) * Math.log1p(Math.abs(value))) / Math.LN10;
}

/**
 * 计算材料变化的带符号对数值及刻度范围，刻度使用真实数量的整数量级。
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
  const lower = scaled.reduce((min, value) => Math.min(min, value), 0);
  const upper = scaled.reduce((max, value) => Math.max(max, value), 0);
  const padding = (upper - lower) * 0.02;
  const minimum = lower < 0 ? lower - padding : 0;
  const maximum = upper > 0 ? upper + padding : minimum === 0 ? 1 : 0;
  const minimumTickDistance = (maximum - minimum) / 8;
  const ticks = [0];
  const extremes = [
    values.reduce((min, value) => Math.min(min, value), 0),
    values.reduce((max, value) => Math.max(max, value), 0),
  ];
  for (const extreme of extremes) {
    let previous = 0;
    for (let magnitude = 1; magnitude <= Math.abs(extreme); magnitude *= 10) {
      const tick = toMaterialRecordLogValue(Math.sign(extreme) * magnitude);
      if (Math.abs(tick - previous) < minimumTickDistance) continue;
      ticks.push(tick);
      previous = tick;
    }
  }
  return {
    values: scaled,
    minimum,
    maximum,
    ticks: ticks.sort((a, b) => a - b),
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
