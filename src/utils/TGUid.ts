/**
 * UID 展示工具
 * @since Beta v0.12.6
 */

import useAppStore from "@store/app.js";

/** UID 掩码字符 */
const UID_MASK = "*";
/** 文件名中使用的 UID 占位符 */
const UID_NAME = "UID";
/** 选择器中保留的 UID 尾号位数 */
const UID_TAIL_KEEP = 4;

/**
 * 按设置隐藏 UID
 * @since Beta v0.12.6
 * @param value - 待展示的 UID
 * @returns 未开启隐藏时原样返回，否则返回等长掩码
 */
export function maskUid(value: string | number | null | undefined): string {
  const text = value === null || value === undefined ? "" : String(value);
  if (text === "" || !useAppStore().hideUid) return text;
  return UID_MASK.repeat(text.length);
}

/**
 * 按设置隐藏 UID，保留尾号用于区分账号
 * @since Beta v0.12.6
 * @param value - 待展示的 UID
 * @returns 未开启隐藏时原样返回，否则返回掩码加尾号
 */
export function maskUidTail(value: string | number | null | undefined): string {
  const text = value === null || value === undefined ? "" : String(value);
  if (text === "" || !useAppStore().hideUid) return text;
  if (text.length <= UID_TAIL_KEEP) return UID_MASK.repeat(text.length);
  return UID_MASK.repeat(text.length - UID_TAIL_KEEP) + text.slice(-UID_TAIL_KEEP);
}

/**
 * 按设置隐藏文件名中的 UID
 * @since Beta v0.12.6
 * @param value - 待写入文件名的 UID
 * @returns 未开启隐藏时原样返回，否则返回文件名安全的占位符
 */
export function maskUidName(value: string | number | null | undefined): string {
  const text = value === null || value === undefined ? "" : String(value);
  if (text === "" || !useAppStore().hideUid) return text;
  return UID_NAME;
}

/**
 * 生成 v-select 的 UID 选项标题
 * @since Beta v0.12.6
 * @param item - 选项原始值
 * @returns 保留尾号的掩码文本，便于区分账号
 */
export function uidItemTitle(item: unknown): string {
  if (typeof item === "string" || typeof item === "number") return maskUidTail(item);
  return "";
}
/**
 * 生成 v-select 的 UID 选项取值
 * @since Beta v0.12.6
 * @remarks
 * Vuetify 在未显式声明 item-value 时会把 item-title 当作取值，
 * 导致 v-model 拿到掩码字符串，这里显式还原为原始 UID。
 * @param item - 选项原始值
 * @returns 原始 UID
 */
export function uidItemValue(item: unknown): unknown {
  return item;
}
