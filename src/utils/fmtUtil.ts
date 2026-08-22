/**
 * 展示格式化工具。
 * @since Beta v0.11.5
 */

import { tz } from "@date-fns/tz";
import { differenceInDays, format, parse, parseISO, startOfDay } from "date-fns";

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
 * 时间戳转换为时间字符串
 * @since Beta v0.11.5
 * @param time - 时间戳（毫秒）
 * @returns 时间字符串 d天 hh:mm:ss
 */
function formatRemainingTime(time: number): string {
  const day = Math.floor(time / (24 * 3600 * 1000));
  const hour = Math.floor((time % (24 * 3600 * 1000)) / (3600 * 1000));
  const minute = Math.floor((time % (3600 * 1000)) / (60 * 1000));
  const second = Math.floor((time % (60 * 1000)) / 1000);
  return `${day === 0 ? "" : `${day}天 `}${hour.toFixed(0).padStart(2, "0")}:${minute
    .toFixed(0)
    .padStart(2, "0")}:${second.toFixed(0).padStart(2, "0")}`;
}

/**
 * 剩余秒数转换为时刻字符串
 * @since Beta v0.11.5
 * @param remainedSeconds - 剩余秒数
 * @returns 时刻字符串 次日xx:xx:xx / x天后xx:xx:xx
 */
function formatFullTime(remainedSeconds: number): string {
  if (remainedSeconds <= 0) return "";
  const now = new Date();
  const targetTime = new Date(now.getTime() + remainedSeconds * 1000);
  const dayDiff = differenceInDays(startOfDay(targetTime), startOfDay(now));
  const hour = targetTime.getHours().toString().padStart(2, "0");
  const minute = targetTime.getMinutes().toString().padStart(2, "0");
  const second = targetTime.getSeconds().toString().padStart(2, "0");
  if (dayDiff === 0) return `${hour}:${minute}:${second}`;
  if (dayDiff === 1) return `次日${hour}:${minute}:${second}`;
  return `${dayDiff}天后${hour}:${minute}:${second}`;
}

/**
 * 时间戳转换为日期
 * @since Beta v0.11.5
 * @param timestamp - 时间戳（毫秒）
 * @returns 日期 2021-01-01 00:00:00
 */
function formatDateTime(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  const second = String(date.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

/**
 * 获取相近时间
 * @since Beta v0.11.5
 * @remarks
 * - 如果是今天，只显示 hh:mm
 * - 如果是今年，显示 MM-dd
 * - 否则显示 yyyy-MM-dd
 *
 * @param timestamp - 时间戳（秒）
 * @returns 相近时间
 */
function formatNearTime(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  const now = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  if (
    now.getFullYear() === year &&
    now.getMonth() === date.getMonth() &&
    now.getDate() === date.getDate()
  ) {
    return `${hour}:${minute}`;
  }
  if (now.getFullYear() === year) return `${month}-${day}`;
  return `${year}-${month}-${day}`;
}

/**
 * byte 转成 KB MB GB
 * @since Beta v0.11.5
 * @param bytes - 字节数
 * @returns KB MB GB
 */
function formatByteSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * 获取视频时长
 * @since Beta v0.11.5
 * @param durationMill - 视频时长（毫秒）
 * @returns 视频时长
 */
function formatVideoDuration(durationMill: number): string {
  const duration = Math.floor(durationMill / 1000);
  const seconds = duration % 60;
  const minutes = Math.floor(duration / 60) % 60;
  const hours = Math.floor(duration / 3600);
  let result = "";
  if (hours > 0) result += `${hours.toString().padStart(2, "0")}:`;
  result += `${minutes.toString().padStart(2, "0")}:`;
  result += `${seconds.toString().padStart(2, "0")}`;
  return result;
}

/**
 * 将时间字符串转换为上海时区的日期时间字符串
 * @since Beta v0.11.5
 * @param str - 时间字符串
 * @example 2025-09-18T01:01:39+00:00
 * @returns 上海时区的日期时间字符串
 */
function formatShanghaiTime(str: string): string {
  return format(parseISO(str), "yyyy-MM-dd HH:mm:ss", {
    in: tz("Asia/Shanghai"),
  });
}

/**
 * 将本地时间字符串转换为 ISO8601 时间字符串
 * @since Beta v0.11.5
 * @param str - 时间字符串
 * @example "2025-09-18 09:01:39" → "2025-09-18T09:01:39+08:00"
 * @returns ISO8601 时间字符串
 */
function convertLocalTimeToIsoString(str: string): string {
  const d = parse(str, "yyyy-MM-dd HH:mm:ss", new Date(), { in: tz("Asia/Shanghai") });
  return format(d, "yyyy-MM-dd'T'HH:mm:ss.SSSX", { in: tz("UTC") });
}

/**
 * 将指定时区的时间字符串转换为 UTC+8 时间字符串
 * @since Beta v0.11.5
 * @param time - 时间字符串
 * @param timezone - 时区
 * @returns UTC+8 时间字符串
 */
function convertTimeToUtc8(time: string, timezone: number): string {
  const date = new Date(time);
  const diffTimezone = -timezone + 8;
  const realDate = new Date(date.getTime() + diffTimezone * 60 * 60 * 1000);
  return formatDateTime(realDate.getTime());
}

/**
 * 展示格式化方法集合。
 * @since Beta v0.11.5
 */
const fmtUtil = {
  num: formatNumber,
  remainingTime: formatRemainingTime,
  fullTime: formatFullTime,
  dateTime: formatDateTime,
  nearTime: formatNearTime,
  size: formatByteSize,
  videoDuration: formatVideoDuration,
  formatTime: formatShanghaiTime,
  toTimeStr: convertLocalTimeToIsoString,
  utc8Time: convertTimeToUtc8,
};

export default fmtUtil;
