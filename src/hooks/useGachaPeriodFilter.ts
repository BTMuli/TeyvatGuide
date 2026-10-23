/**
 * 祈愿记录页的时间段与版本筛选状态。
 * @since Beta v0.13.0
 */

import {
  formatGachaInclusiveEnd,
  formatGachaVersionPeriodTime,
  GACHA_VERSION_RANGES,
  getGachaVersionRangeByIso,
  getVisibleGachaVersionLegend,
  normalizeGachaPeriodDates,
  parseGachaIsoDate,
  shiftGachaIsoDate,
  type GachaVersionLegendItem,
} from "@utils/gacha/version.js";
import { computed, ref, watch } from "vue";
import { zhHans } from "vuetify/locale";

type GachaPeriodPickerProps = {
  bgColor: string;
  color: string;
  elevation: number;
  month: number;
  rounded: string;
  width: number;
  year: number;
  "onUpdate:month": (value: unknown) => void;
  "onUpdate:year": (value: unknown) => void;
};

/**
 * 创建祈愿记录的时间段与版本筛选。
 * @since Beta v0.13.0
 * @returns 筛选状态、日历控件属性与筛选操作函数
 */
export function useGachaPeriodFilter() {
  const versionFilter = ref<string | null>(null);
  const periodDates = ref<Array<Date> | null>(null);
  const periodMenu = ref<boolean>(false);
  const pickerDraft = ref<Array<Date>>([]);
  const pickerDraftVersion = ref<string | null>(null);
  const today = new Date();
  const pickerMonth = ref<number>(today.getMonth());
  const pickerYear = ref<number>(today.getFullYear());
  const messages = { zhHans };
  const periodRange = computed(() => normalizeGachaPeriodDates(periodDates.value));
  const periodLabel = computed<string>(() => {
    if (versionFilter.value === null || versionFilter.value === "") return "时间";
    return `时间-${versionFilter.value}`;
  });
  const periodPickerProps = computed<GachaPeriodPickerProps>(() => ({
    bgColor: "var(--box-bg-1)",
    color: "var(--tgc-od-blue)",
    elevation: 0,
    month: pickerMonth.value,
    rounded: "0",
    width: 360,
    year: pickerYear.value,
    "onUpdate:month": onPickerMonth,
    "onUpdate:year": onPickerYear,
  }));
  const visibleVersionLegend = computed<Array<GachaVersionLegendItem>>(() =>
    getVisibleGachaVersionLegend(pickerYear.value, pickerMonth.value),
  );

  watch(periodMenu, (open) => {
    if (!open) return;
    pickerDraftVersion.value = versionFilter.value;
    pickerDraft.value = periodDates.value === null ? [] : [...periodDates.value];
    syncPickerToAnchor();
  });
  watch(
    periodDates,
    () => {
      syncVersionFilterWithPeriod();
    },
    { flush: "sync" },
  );
  watch(
    pickerDraft,
    () => {
      syncDraftVersionWithPicker();
    },
    { flush: "sync" },
  );

  /**
   * 处理月历的月份切换。
   * @since Beta v0.13.0
   * @param value - 切换后的月份
   */
  function onPickerMonth(value: unknown): void {
    const month = Number(value);
    if (!Number.isInteger(month) || month < 0 || month > 11) return;
    pickerMonth.value = month;
  }

  /**
   * 处理月历的年份切换。
   * @since Beta v0.13.0
   * @param value - 切换后的年份
   */
  function onPickerYear(value: unknown): void {
    const year = Number(value);
    if (!Number.isInteger(year)) return;
    pickerYear.value = year;
  }

  /**
   * 将月历锚定到已选时间段的起始日期。
   * @since Beta v0.13.0
   */
  function syncPickerToAnchor(): void {
    const anchor = periodDates.value?.[0] ?? new Date();
    pickerYear.value = anchor.getFullYear();
    pickerMonth.value = anchor.getMonth();
  }

  /**
   * 将月历跳转到当前月份。
   * @since Beta v0.13.0
   */
  function jumpToToday(): void {
    const now = new Date();
    pickerYear.value = now.getFullYear();
    pickerMonth.value = now.getMonth();
  }

  /**
   * 获取日期对应的版本主题色。
   * @since Beta v0.13.0
   * @param isoDate - ISO 日期
   * @returns 版本主题色；不属于任何版本时为空字符串
   */
  function getVersionColor(isoDate: string): string {
    return getGachaVersionRangeByIso(isoDate)?.color ?? "";
  }

  /**
   * 获取版本起始日的版本标签。
   * @since Beta v0.13.0
   * @param isoDate - ISO 日期
   * @returns 版本标签；非版本起始日时为空字符串
   */
  function getVersionStartLabel(isoDate: string): string {
    const range = getGachaVersionRangeByIso(isoDate);
    if (range === undefined || range.startDay !== isoDate) return "";
    return range.version;
  }

  /**
   * 判断日期是否为版本起始日。
   * @since Beta v0.13.0
   * @param isoDate - ISO 日期
   * @returns 是否为版本起始日
   */
  function isVersionStartDay(isoDate: string): boolean {
    return getGachaVersionRangeByIso(isoDate)?.startDay === isoDate;
  }

  /**
   * 判断日期是否为版本结束日的前一天。
   * @since Beta v0.13.0
   * @param isoDate - ISO 日期
   * @returns 是否为版本结束日前一天
   */
  function isVersionEndDay(isoDate: string): boolean {
    const range = getGachaVersionRangeByIso(isoDate);
    if (range === undefined) return false;
    return shiftGachaIsoDate(isoDate, 1) === range.endDay;
  }

  /**
   * 获取日期所属版本的悬浮标题。
   * @since Beta v0.13.0
   * @param isoDate - ISO 日期
   * @returns 版本与卡池时间标题；不属于任何版本时为空字符串
   */
  function getVersionDayTitle(isoDate: string): string {
    const range = getGachaVersionRangeByIso(isoDate);
    if (range === undefined) return "";
    return `${range.version}  ${formatGachaVersionPeriodTime(range)}`;
  }

  /**
   * 判断版本图例项是否与草稿选择一致。
   * @since Beta v0.13.0
   * @param item - 版本图例项
   * @returns 是否一致
   */
  function isVersionPeriodSelected(item: GachaVersionLegendItem): boolean {
    const draftRange = normalizeGachaPeriodDates(pickerDraft.value);
    return (
      pickerDraftVersion.value === item.label &&
      draftRange.start === item.startDay &&
      draftRange.end === formatGachaInclusiveEnd(item.endDay)
    );
  }

  /**
   * 以版本图例项预填时间草稿。
   * @since Beta v0.13.0
   * @param item - 版本图例项
   */
  function previewVersionPeriod(item: GachaVersionLegendItem): void {
    const start = parseGachaIsoDate(item.startDay);
    const end = parseGachaIsoDate(formatGachaInclusiveEnd(item.endDay));
    if (start === undefined || end === undefined) return;
    pickerDraftVersion.value = item.label;
    pickerDraft.value = [start, end];
    pickerYear.value = start.getFullYear();
    pickerMonth.value = start.getMonth();
  }

  /**
   * 切换时间日历菜单。
   * @since Beta v0.13.0
   */
  function togglePeriodCalendar(): void {
    periodMenu.value = !periodMenu.value;
  }

  /**
   * 关闭时间日历菜单。
   * @since Beta v0.13.0
   */
  function cancelPeriodCalendar(): void {
    periodMenu.value = false;
  }

  /**
   * 保存时间草稿并关闭日历菜单。
   * @since Beta v0.13.0
   */
  function savePeriodCalendar(): void {
    periodDates.value = pickerDraft.value.length === 0 ? null : [...pickerDraft.value];
    versionFilter.value = pickerDraftVersion.value;
    periodMenu.value = false;
    syncVersionFilterWithPeriod();
  }

  /**
   * 清空时间段与版本筛选。
   * @since Beta v0.13.0
   */
  function clearPeriod(): void {
    versionFilter.value = null;
    periodDates.value = null;
  }

  /**
   * 提交子组件选中的时间段。
   * @since Beta v0.13.0
   * @param start - 起始日期
   * @param end - 结束日期
   */
  function commitPeriodDates(start: string, end: string): void {
    const startDate = parseGachaIsoDate(start);
    const endDate = parseGachaIsoDate(end);
    if (startDate === undefined || endDate === undefined) return;
    periodDates.value = [startDate, endDate];
    pickerYear.value = startDate.getFullYear();
    pickerMonth.value = startDate.getMonth();
  }

  /**
   * 时间草稿偏离版本区间时清除草稿版本。
   * @since Beta v0.13.0
   */
  function syncDraftVersionWithPicker(): void {
    if (pickerDraftVersion.value === null || pickerDraftVersion.value === "") return;
    const range = GACHA_VERSION_RANGES.find((item) => item.version === pickerDraftVersion.value);
    if (range === undefined) {
      pickerDraftVersion.value = null;
      return;
    }
    const draftRange = normalizeGachaPeriodDates(pickerDraft.value);
    const end = formatGachaInclusiveEnd(range.endDay);
    if (draftRange.start !== range.startDay || draftRange.end !== end) {
      pickerDraftVersion.value = null;
    }
  }

  /**
   * 时间段偏离版本区间时清除版本筛选。
   * @since Beta v0.13.0
   */
  function syncVersionFilterWithPeriod(): void {
    if (versionFilter.value === null || versionFilter.value === "") return;
    const range = GACHA_VERSION_RANGES.find((item) => item.version === versionFilter.value);
    if (range === undefined) {
      versionFilter.value = null;
      return;
    }
    const end = formatGachaInclusiveEnd(range.endDay);
    if (periodRange.value.start !== range.startDay || periodRange.value.end !== end) {
      versionFilter.value = null;
    }
  }

  return {
    versionFilter,
    periodMenu,
    pickerDraft,
    periodRange,
    periodLabel,
    periodPickerProps,
    visibleVersionLegend,
    messages,
    getVersionColor,
    getVersionStartLabel,
    isVersionStartDay,
    isVersionEndDay,
    getVersionDayTitle,
    isVersionPeriodSelected,
    previewVersionPeriod,
    togglePeriodCalendar,
    cancelPeriodCalendar,
    savePeriodCalendar,
    clearPeriod,
    commitPeriodDates,
    jumpToToday,
  };
}
