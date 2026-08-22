/**
 * 展示格式化工具。
 * @since Beta v0.11.5
 */

/**
 * 按四位一组格式化数字。
 * @since Beta v0.11.5
 * @param value - 待格式化的数字
 * @returns 使用半角逗号按四位分组的数字字符串
 */
function formatNumber(value: number): string {
  const [integer, decimal] = value.toString().split(".");
  const sign = integer.startsWith("-") ? "-" : "";
  const digits = sign.length > 0 ? integer.slice(1) : integer;
  const grouped = digits.replace(/\B(?=(\d{4})+(?!\d))/g, ",");
  return decimal === undefined ? `${sign}${grouped}` : `${sign}${grouped}.${decimal}`;
}

/**
 * 展示格式化方法集合。
 * @since Beta v0.11.5
 */
const fmtUtil = {
  num: formatNumber,
};

export default fmtUtil;
