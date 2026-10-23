/**
 * 设备隐私展示工具
 * @since Beta v0.13.0
 */

const DEVICE_MASK = "*";
const DEVICE_EDGE_KEEP = 2;

/**
 * 部分掩码设备敏感值，保留首尾少量字符用于区分。
 * @since Beta v0.13.0
 * @param value - 要展示的设备值
 * @returns 掩码后的设备值
 */
export function maskDeviceValue(value: string): string {
  if (value === "") return "";
  if (value.length <= DEVICE_EDGE_KEEP * 2) {
    if (value.length <= 2) return DEVICE_MASK.repeat(value.length);
    return `${value[0]}${DEVICE_MASK.repeat(value.length - 2)}${value.at(-1)}`;
  }
  return `${value.slice(0, DEVICE_EDGE_KEEP)}${DEVICE_MASK.repeat(
    value.length - DEVICE_EDGE_KEEP * 2,
  )}${value.slice(-DEVICE_EDGE_KEEP)}`;
}
