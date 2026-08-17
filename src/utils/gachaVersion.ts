/**
 * 祈愿版本区间与展示筛选工具
 * @since Beta v0.11.5
 */

import { compareVersions } from "@utils/toolFunc.js";

import { AppGachaData } from "@/data/index.js";

/** 版本/时期筛选的“全部”哨兵�?*/
export const GACHA_FILTER_ALL = "all";

const VERSION_COLORS: Array<string> = [
  "var(--tgc-od-blue)",
  "var(--tgc-od-purple)",
  "var(--tgc-od-orange)",
  "var(--tgc-od-green)",
  "var(--tgc-od-red)",
];

export type GachaVersionRange = {
  version: string;
  from: string;
  to: string;
  startDay: string;
  endDay: string;
  color: string;
};

export type GachaPeriodRange = {
  start: string;
  end: string;
};

export type GachaVersionLegendItem = {
  key: string;
  label: string;
  color: string;
  title: string;
  startDay: string;
  endDay: string;
};

/**
 * 将卡�?ISO 时间转为祈愿记录时间格式
 * @since Beta v0.11.5
 * @param iso - ISO 时间字符�?
 * @returns yyyy-MM-dd HH:mm:ss
 */
function toGachaTime(iso: string): string {
  return iso.slice(0, 19).replace("T", " ");
}

/**
 * 格式化本地日期为 yyyy-MM-dd
 * @since Beta v0.11.5
 * @param date - 日期
 * @returns 日期字符串；非法日期返回空串
 */
export function formatGachaPeriodDate(date: unknown): string {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * 解析 yyyy-MM-dd 为本�?Date
 * @since Beta v0.11.5
 * @param isoDate - 日期字符�?
 * @returns Date；非法则 undefined
 */
export function parseGachaIsoDate(isoDate: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (match === null) return undefined;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (Number.isNaN(date.getTime())) return undefined;
  return date;
}

/**
 * 按天数偏�?ISO 日期
 * @since Beta v0.11.5
 * @param isoDate - yyyy-MM-dd
 * @param days - 偏移天数
 * @returns 偏移后的日期
 */
export function shiftGachaIsoDate(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00`);
  date.setDate(date.getDate() + days);
  return formatGachaPeriodDate(date);
}

/**
 * 将半开区间�?endDay 转为可读的闭区间结束�?
 * @since Beta v0.11.5
 * @param endDay - 半开区间结束�?
 * @returns 展示用结束日或“至今�?
 */
export function formatGachaInclusiveEnd(endDay: string): string {
  if (endDay.startsWith("9999")) return "至今";
  return shiftGachaIsoDate(endDay, -1);
}

/**
 * 构建版本时间区间（按卡池元数据合并）
 * @since Beta v0.11.5
 * @returns 版本区间列表（按开始时间升序）
 */
function buildVersionRanges(): Array<GachaVersionRange> {
  const rangeMap = new Map<string, { from: string; to: string }>();
  for (const pool of AppGachaData) {
    const from = toGachaTime(pool.from);
    const to = toGachaTime(pool.to);
    const existing = rangeMap.get(pool.version);
    if (existing === undefined) {
      rangeMap.set(pool.version, { from, to });
      continue;
    }
    if (from < existing.from) existing.from = from;
    if (to > existing.to) existing.to = to;
  }
  const ranges = [...rangeMap.entries()]
    .map(([version, range]) => ({
      version,
      from: range.from,
      to: range.to,
      startDay: range.from.slice(0, 10),
      endDay: "9999-12-31",
      color: VERSION_COLORS[0],
    }))
    .sort((a, b) => a.from.localeCompare(b.from));
  for (let i = 0; i < ranges.length; i++) {
    ranges[i].color = VERSION_COLORS[i % VERSION_COLORS.length];
    if (i < ranges.length - 1) {
      ranges[i].to = ranges[i + 1].from;
      ranges[i].endDay = ranges[i + 1].startDay;
    } else {
      ranges[i].endDay = shiftGachaIsoDate(ranges[i].to.slice(0, 10), 1);
      ranges[i].to = "9999-12-31 23:59:59";
    }
  }
  if (ranges.length > 0) {
    ranges[0].from = "0000-01-01 00:00:00";
  }
  return ranges;
}

/** 全局版本区间（按开始时间升序） */
export const GACHA_VERSION_RANGES: Array<GachaVersionRange> = buildVersionRanges();

/**
 * 版本下拉选项（按版本号降序；清空表示全部�?
 * @since Beta v0.11.5
 */
export const GACHA_VERSION_OPTIONS: Array<{ title: string; value: string }> = [
  ...GACHA_VERSION_RANGES,
]
  .sort((a, b) => compareVersions(b.version, a.version))
  .map((range) => ({ title: range.version, value: range.version }));

/**
 * 根据抽卡时间解析所属版�?
 * @since Beta v0.11.5
 * @param time - 抽卡时间 yyyy-MM-dd HH:mm:ss
 * @returns 版本号；未命中返回空�?
 */
export function getGachaVersion(time: string): string {
  for (const range of GACHA_VERSION_RANGES) {
    if (time >= range.from && time < range.to) return range.version;
  }
  return "";
}

/**
 * 根据 ISO 日期查找版本区间
 * @since Beta v0.11.5
 * @param isoDate - yyyy-MM-dd
 * @returns 版本区间
 */
export function getGachaVersionRangeByIso(isoDate: string): GachaVersionRange | undefined {
  for (const range of GACHA_VERSION_RANGES) {
    if (isoDate >= range.startDay && isoDate < range.endDay) return range;
  }
  return undefined;
}

/**
 * 将日期选择结果规范为时期区�?
 * @since Beta v0.11.5
 * @param dates - 选中日期（范围）；null/空表示全部时�?
 * @returns start/end 均为 yyyy-MM-dd，未选时为空�?
 */
export function normalizeGachaPeriodDates(dates: Array<Date> | null | undefined): GachaPeriodRange {
  const valid = [...(dates ?? [])]
    .filter((date) => date instanceof Date && !Number.isNaN(date.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());
  if (valid.length === 0) return { start: "", end: "" };
  return {
    start: formatGachaPeriodDate(valid[0]),
    end: formatGachaPeriodDate(valid[valid.length - 1]),
  };
}

/**
 * 判断记录是否落在版本/时期展示筛选内
 * @since Beta v0.11.5
 * @param item - 祈愿记录
 * @param versionFilter - 版本筛选；null/空表示全部版�?
 * @param period - 时期筛�?
 * @returns 是否保留用于展示
 */
export function matchGachaDisplayScope(
  item: TGApp.Sqlite.Gacha.Gacha,
  versionFilter: string | null | undefined,
  period: GachaPeriodRange,
): boolean {
  if (
    versionFilter !== null &&
    versionFilter !== undefined &&
    versionFilter !== "" &&
    versionFilter !== GACHA_FILTER_ALL &&
    getGachaVersion(item.time) !== versionFilter
  ) {
    return false;
  }
  const startBound = period.start === "" ? "" : `${period.start} 00:00:00`;
  const endBound = period.end === "" ? "" : `${period.end} 23:59:59`;
  if (startBound !== "" && item.time < startBound) return false;
  if (endBound !== "" && item.time > endBound) return false;
  return true;
}

/**
 * 按版�?时期过滤祈愿记录（仅用于展示�?
 * @since Beta v0.11.5
 * @param list - 原始记录
 * @param versionFilter - 版本筛选；null/空表示全部版�?
 * @param period - 时期筛�?
 * @returns 过滤后的记录
 */
export function filterGachaDisplayList(
  list: Array<TGApp.Sqlite.Gacha.Gacha>,
  versionFilter: string | null | undefined,
  period: GachaPeriodRange,
): Array<TGApp.Sqlite.Gacha.Gacha> {
  const hasVersion =
    versionFilter !== null &&
    versionFilter !== undefined &&
    versionFilter !== "" &&
    versionFilter !== GACHA_FILTER_ALL;
  if (!hasVersion && period.start === "" && period.end === "") {
    return list;
  }
  return list.filter((item) => matchGachaDisplayScope(item, versionFilter, period));
}

/**
 * 当前日历月可见的版本图例
 * @since Beta v0.11.5
 * @param year - �?
 * @param month - 月（0-11�?
 * @returns 图例�?
 */
export function getVisibleGachaVersionLegend(
  year: number,
  month: number,
): Array<GachaVersionLegendItem> {
  const monthToken = String(month + 1).padStart(2, "0");
  const lastDate = new Date(year, month + 1, 0).getDate();
  const start = `${year}-${monthToken}-01`;
  const end = `${year}-${monthToken}-${String(lastDate).padStart(2, "0")}`;
  return GACHA_VERSION_RANGES.filter((range) => range.startDay <= end && range.endDay > start).map(
    (range) => ({
      key: `version-${range.version}`,
      label: range.version,
      color: range.color,
      title: `${range.version}  ${range.startDay} ~ ${formatGachaInclusiveEnd(range.endDay)}`,
      startDay: range.startDay,
      endDay: range.endDay,
    }),
  );
}
