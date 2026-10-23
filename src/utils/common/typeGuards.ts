/**
 * 通用类型守卫与基础校验工具
 * @since Beta v0.13.0
 */

/**
 * 判断值是否为普通记录对象。
 * @since Beta v0.13.0
 * @param value - 待判断的值
 * @returns 是否为非 null、非数组的对象记录
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * 判断字符串是否包含有效内容。
 * @since Beta v0.13.0
 * @param value - 待判断的值
 * @returns 是否为非空字符串
 */
export function isNonBlankString(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

/**
 * 校验正整数参数。
 * @since Beta v0.13.0
 * @param value - 待校验的数值
 * @param name - 错误信息中的字段名称
 */
export function assertPositiveNumber(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) throw new TypeError(`${name}必须为正整数`);
}
