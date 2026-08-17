<!-- 祈愿数据表格 -->
<template>
  <div class="gro-t-box">
    <div class="gro-t-toolbar">
      <div class="gro-t-filters">
        <v-text-field
          v-model="searchKeyword"
          aria-label="搜索物品名称"
          bg-color="var(--app-page-bg)"
          class="gro-t-search"
          clearable
          color="var(--tgc-od-blue)"
          density="compact"
          hide-details
          placeholder="搜索物品"
          prepend-inner-icon="mdi-magnify"
          variant="outlined"
        />
        <v-select
          v-model="poolFilter"
          :items="poolOptions"
          aria-label="筛选卡池"
          bg-color="var(--app-page-bg)"
          class="gro-t-select"
          color="var(--tgc-od-blue)"
          density="compact"
          hide-details
          variant="outlined"
        />
        <v-select
          v-model="versionFilter"
          :items="versionOptions"
          aria-label="筛选版本"
          bg-color="var(--app-page-bg)"
          class="gro-t-select"
          color="var(--tgc-od-blue)"
          density="compact"
          hide-details
          variant="outlined"
        />
        <v-select
          v-model="rankFilter"
          :items="rankOptions"
          aria-label="筛选星级"
          bg-color="var(--app-page-bg)"
          class="gro-t-select"
          color="var(--tgc-od-blue)"
          density="compact"
          hide-details
          variant="outlined"
        />
        <v-select
          v-model="typeFilter"
          :items="typeOptions"
          aria-label="筛选类型"
          bg-color="var(--app-page-bg)"
          class="gro-t-select"
          color="var(--tgc-od-blue)"
          density="compact"
          hide-details
          variant="outlined"
        />
        <v-locale-provider :messages class="gro-t-period-locale" locale="zhHans">
          <v-date-input
            v-model="periodDates"
            v-model:menu="periodMenu"
            :display-format="formatPeriodDate"
            :hide-actions="false"
            :menu-props="periodMenuProps"
            :picker-props="periodPickerProps"
            aria-label="自定义时期"
            bg-color="var(--app-page-bg)"
            class="gro-t-period"
            clearable
            color="var(--tgc-od-blue)"
            density="compact"
            first-day-of-week="1"
            hide-details
            hide-header
            multiple="range"
            placeholder="自定义时期"
            prepend-icon=""
            prepend-inner-icon="mdi-calendar-range"
            variant="outlined"
            weekday-format="narrow"
          >
            <template #day="{ props: dayProps, item }">
              <v-btn v-bind="dayProps" :title="getVersionDayTitle(item.isoDate)">
                {{ item.localized }}
              </v-btn>
              <span
                v-if="getVersionColor(item.isoDate)"
                :class="{
                  start: isVersionStartDay(item.isoDate),
                  end: isVersionEndDay(item.isoDate),
                }"
                :style="{ background: getVersionColor(item.isoDate) }"
                class="gro-t-cal-bar"
              />
              <span
                v-if="!item.isAdjacent && isVersionStartDay(item.isoDate)"
                :style="{ color: getVersionColor(item.isoDate) }"
                class="gro-t-cal-ver"
              >
                {{ getVersionStartLabel(item.isoDate) }}
              </span>
            </template>
            <template #actions="{ save, cancel }">
              <div class="gro-t-cal-footer">
                <div class="gro-t-cal-legend">
                  <button
                    v-for="item in visibleVersionLegend"
                    :key="item.key"
                    :class="{ active: isVersionPeriodSelected(item) }"
                    :title="item.title"
                    class="gro-t-cal-legend-item"
                    type="button"
                    @click="selectVersionPeriod(item)"
                  >
                    <span :style="{ background: item.color }" class="gro-t-cal-swatch" />
                    {{ item.label }}
                  </button>
                  <span v-if="visibleVersionLegend.length === 0" class="gro-t-cal-legend-empty">
                    此月无版本卡池
                  </span>
                </div>
                <div class="gro-t-cal-actions">
                  <v-btn
                    class="gro-t-cal-now"
                    density="comfortable"
                    variant="text"
                    @click="jumpToToday"
                  >
                    现在
                  </v-btn>
                  <v-btn density="comfortable" variant="text" @click="cancel">取消</v-btn>
                  <v-btn
                    color="var(--tgc-od-blue)"
                    density="comfortable"
                    variant="text"
                    @click="save"
                  >
                    确定
                  </v-btn>
                </div>
              </div>
            </template>
          </v-date-input>
        </v-locale-provider>
      </div>
      <div class="gro-t-actions">
        <span class="gro-t-count">{{ countLabel }}</span>
        <v-btn
          :disabled="!hasActiveFilters"
          class="gro-t-reset"
          density="comfortable"
          prepend-icon="mdi-restore"
          variant="text"
          @click="resetFilters"
        >
          重置
        </v-btn>
      </div>
    </div>
    <div class="gro-t-table-wrap">
      <v-data-table
        v-model:items-per-page="itemsPerPage"
        v-model:page="page"
        v-model:sort-by="sortBy"
        :headers
        item-value="id"
        :items="filteredItems"
        :items-per-page-options="itemsPerPageOptions"
        :items-per-page-text="'每页'"
        :no-data-text="emptyLabel"
        :page-text="'{0}-{1} / {2}'"
        :row-props="getRowProps"
        class="gro-t-table"
        first-page-label="首页"
        fixed-footer
        fixed-header
        height="100%"
        hover
        last-page-label="末页"
        must-sort
        next-page-label="下一页"
        prev-page-label="上一页"
        show-current-page
        show-first-last-page
      >
        <template v-slot:[`item.name`]="{ item }">
          <div class="gro-t-item">
            <div class="gro-t-icon">
              <img :src="getStarBg(item.rank)" alt="" class="bg" />
              <img :alt="item.name" :src="getItemIcon(item)" class="icon" />
            </div>
            <div class="gro-t-item-text">
              <span :class="`rank-${item.rank}`" class="gro-t-name">{{ item.name }}</span>
              <span class="gro-t-type">{{ item.type }}</span>
            </div>
          </div>
        </template>
        <template v-slot:[`item.uigfType`]="{ item }">
          <span class="gro-t-pool">{{ getPoolLabel(item.uigfType) }}</span>
        </template>
        <template v-slot:[`item.version`]="{ item }">
          <span class="gro-t-version">{{ item.version || "—" }}</span>
        </template>
        <template v-slot:[`item.time`]="{ item }">
          <span class="gro-t-time">{{ item.time }}</span>
        </template>
        <template v-slot:[`item.rank`]="{ item }">
          <span :class="`rank-${item.rank}`" class="gro-t-rank">{{ item.rank }}★</span>
        </template>
        <template #no-data>
          <div class="gro-t-empty">{{ emptyLabel }}</div>
        </template>
      </v-data-table>
    </div>
  </div>
</template>
<script lang="ts" setup>
import gameEnum from "@enum/game.js";
import { compareVersions, getWikiBrief } from "@utils/toolFunc.js";
import { computed, ref, watch } from "vue";
import type { DataTableHeader } from "vuetify/lib/components/VDataTable/types.js";
import { zhHans } from "vuetify/locale";

import { AppGachaData } from "@/data/index.js";

type GroTableProps = { modelValue: Array<TGApp.Sqlite.Gacha.Gacha> };
type GroTableFilterOption = { title: string; value: string };
type GroTableSortItem = { key: string; order: "asc" | "desc" };
type GroTableRow = TGApp.Sqlite.Gacha.Gacha & { version: string };
type GroTableVersionRange = {
  version: string;
  from: string;
  to: string;
  startDay: string;
  endDay: string;
  color: string;
};
type GroTableLegendItem = {
  key: string;
  label: string;
  color: string;
  title: string;
  startDay: string;
  endDay: string;
};
type GroTablePickerProps = {
  bgColor: string;
  class: string;
  color: string;
  elevation: number;
  month: number;
  rounded: string;
  style: { boxShadow: string };
  width: number;
  year: number;
  "onUpdate:month": (value: unknown) => void;
  "onUpdate:year": (value: unknown) => void;
};

const ALL_FILTER = "all";
const VERSION_COLORS: Array<string> = [
  "var(--tgc-od-blue)",
  "var(--tgc-od-purple)",
  "var(--tgc-od-orange)",
  "var(--tgc-od-green)",
  "var(--tgc-od-red)",
];
const POOL_LABELS: Record<string, string> = {
  [gameEnum.gachaType.Newbie]: "新手祈愿",
  [gameEnum.gachaType.Normal]: "常驻祈愿",
  [gameEnum.gachaType.AvatarUp]: "角色祈愿",
  [gameEnum.gachaType.AvatarUp2]: "角色祈愿",
  [gameEnum.gachaType.WeaponUp]: "武器祈愿",
  [gameEnum.gachaType.MixUp]: "集录祈愿",
};
const POOL_ORDER: Array<string> = [
  gameEnum.gachaType.AvatarUp,
  gameEnum.gachaType.WeaponUp,
  gameEnum.gachaType.Normal,
  gameEnum.gachaType.MixUp,
  gameEnum.gachaType.Newbie,
];
const VERSION_RANGES = buildVersionRanges();

const props = defineProps<GroTableProps>();
const searchKeyword = ref<string>("");
const poolFilter = ref<string>(ALL_FILTER);
const versionFilter = ref<string>(ALL_FILTER);
const rankFilter = ref<string>(ALL_FILTER);
const typeFilter = ref<string>(ALL_FILTER);
const periodDates = ref<Array<Date>>([]);
const periodMenu = ref<boolean>(false);
const today = new Date();
const pickerMonth = ref<number>(today.getMonth());
const pickerYear = ref<number>(today.getFullYear());
const messages = { zhHans };
const periodMenuProps = { offset: 12 };
const page = ref<number>(1);
const itemsPerPage = ref<number>(50);
const sortBy = ref<Array<GroTableSortItem>>([{ key: "time", order: "desc" }]);
const headers: Array<DataTableHeader<GroTableRow>> = [
  { title: "物品", align: "start", key: "name", sortable: true, nowrap: true },
  { title: "卡池", align: "center", key: "uigfType", sortable: true, width: 128, nowrap: true },
  {
    title: "版本",
    align: "center",
    key: "version",
    sortable: true,
    width: 80,
    nowrap: true,
    sort: (a, b) => compareVersionCells(a, b),
  },
  { title: "时间", align: "center", key: "time", sortable: true, width: 180, nowrap: true },
  {
    title: "星级",
    align: "center",
    key: "rank",
    sortable: true,
    width: 72,
    nowrap: true,
    sort: (a, b) => Number(a) - Number(b),
  },
];
const itemsPerPageOptions: Array<{ title: string; value: number }> = [
  { title: "25", value: 25 },
  { title: "50", value: 50 },
  { title: "100", value: 100 },
  { title: "200", value: 200 },
];
const poolOptions = computed<Array<GroTableFilterOption>>(() => [
  { title: "全部卡池", value: ALL_FILTER },
  ...POOL_ORDER.map((type) => ({ title: POOL_LABELS[type] ?? "未知", value: type })),
]);
const versionOptions: Array<GroTableFilterOption> = [
  { title: "全部版本", value: ALL_FILTER },
  ...[...VERSION_RANGES]
    .sort((a, b) => compareVersions(b.version, a.version))
    .map((range) => ({ title: range.version, value: range.version })),
];
const rankOptions: Array<GroTableFilterOption> = [
  { title: "全部星级", value: ALL_FILTER },
  { title: "5 星", value: "5" },
  { title: "4 星", value: "4" },
  { title: "3 星", value: "3" },
];
const typeOptions = computed<Array<GroTableFilterOption>>(() => {
  const types = [...new Set(props.modelValue.map((item) => item.type).filter(Boolean))];
  return [
    { title: "全部类型", value: ALL_FILTER },
    ...types.map((type) => ({ title: type, value: type })),
  ];
});
const periodPickerProps = computed<GroTablePickerProps>(() => ({
  bgColor: "var(--box-bg-1)",
  class: "gro-t-cal-picker",
  color: "var(--tgc-od-blue)",
  elevation: 0,
  month: pickerMonth.value,
  rounded: "12",
  style: { boxShadow: "0 8px 24px var(--common-shadow-4)" },
  width: 360,
  year: pickerYear.value,
  "onUpdate:month": onPickerMonth,
  "onUpdate:year": onPickerYear,
}));
const calendarMonthRange = computed<{ start: string; end: string }>(() => {
  const year = pickerYear.value;
  const month = pickerMonth.value;
  const monthToken = String(month + 1).padStart(2, "0");
  const lastDate = new Date(year, month + 1, 0).getDate();
  return {
    start: `${year}-${monthToken}-01`,
    end: `${year}-${monthToken}-${String(lastDate).padStart(2, "0")}`,
  };
});
const visibleVersionLegend = computed<Array<GroTableLegendItem>>(() => {
  const { start, end } = calendarMonthRange.value;
  return VERSION_RANGES.filter((range) => range.startDay <= end && range.endDay > start).map(
    (range) => ({
      key: `version-${range.version}`,
      label: range.version,
      color: range.color,
      title: `${range.version}  ${range.startDay} ~ ${formatInclusiveEnd(range.endDay)}`,
      startDay: range.startDay,
      endDay: range.endDay,
    }),
  );
});
const normalizedSearch = computed<string>(() => (searchKeyword.value ?? "").trim().toLowerCase());
const periodRange = computed<{ start: string; end: string }>(() => {
  const dates = [...(periodDates.value ?? [])]
    .filter((date) => date instanceof Date && !Number.isNaN(date.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());
  if (dates.length === 0) return { start: "", end: "" };
  return {
    start: formatPeriodDate(dates[0]),
    end: formatPeriodDate(dates[dates.length - 1]),
  };
});
const hasActiveFilters = computed<boolean>(() => {
  return (
    normalizedSearch.value !== "" ||
    poolFilter.value !== ALL_FILTER ||
    versionFilter.value !== ALL_FILTER ||
    rankFilter.value !== ALL_FILTER ||
    typeFilter.value !== ALL_FILTER ||
    periodRange.value.start !== "" ||
    periodRange.value.end !== ""
  );
});
const tableRows = computed<Array<GroTableRow>>(() => {
  return props.modelValue.map((item) => ({ ...item, version: getVersion(item.time) }));
});
const filteredItems = computed<Array<GroTableRow>>(() => {
  const startBound = periodRange.value.start === "" ? "" : `${periodRange.value.start} 00:00:00`;
  const endBound = periodRange.value.end === "" ? "" : `${periodRange.value.end} 23:59:59`;
  return tableRows.value.filter((item) => {
    if (poolFilter.value !== ALL_FILTER && item.uigfType !== poolFilter.value) return false;
    if (versionFilter.value !== ALL_FILTER && item.version !== versionFilter.value) return false;
    if (rankFilter.value !== ALL_FILTER && item.rank !== rankFilter.value) return false;
    if (typeFilter.value !== ALL_FILTER && item.type !== typeFilter.value) return false;
    if (startBound !== "" && item.time < startBound) return false;
    if (endBound !== "" && item.time > endBound) return false;
    if (normalizedSearch.value === "") return true;
    return item.name.toLowerCase().includes(normalizedSearch.value);
  });
});
const countLabel = computed<string>(() => {
  if (hasActiveFilters.value) {
    return `${filteredItems.value.length} / ${props.modelValue.length}`;
  }
  return `共 ${props.modelValue.length} 条`;
});
const emptyLabel = computed<string>(() => {
  if (props.modelValue.length === 0) return "暂无祈愿数据";
  return "没有符合筛选条件的记录";
});

watch([searchKeyword, poolFilter, versionFilter, rankFilter, typeFilter, periodDates], () => {
  page.value = 1;
});
watch(
  () => props.modelValue,
  () => {
    page.value = 1;
  },
);
watch(periodMenu, (open) => {
  if (!open) return;
  syncPickerToAnchor();
});

function buildVersionRanges(): Array<GroTableVersionRange> {
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
      ranges[i].endDay = shiftIsoDate(ranges[i].to.slice(0, 10), 1);
      ranges[i].to = "9999-12-31 23:59:59";
    }
  }
  if (ranges.length > 0) {
    ranges[0].from = "0000-01-01 00:00:00";
  }
  return ranges;
}

function toGachaTime(iso: string): string {
  return iso.slice(0, 19).replace("T", " ");
}

function getVersion(time: string): string {
  for (const range of VERSION_RANGES) {
    if (time >= range.from && time < range.to) return range.version;
  }
  return "";
}

function compareVersionCells(a: unknown, b: unknown): number {
  const left = String(a ?? "");
  const right = String(b ?? "");
  if (left === "" && right === "") return 0;
  if (left === "") return -1;
  if (right === "") return 1;
  return compareVersions(left, right);
}

function resetFilters(): void {
  searchKeyword.value = "";
  poolFilter.value = ALL_FILTER;
  versionFilter.value = ALL_FILTER;
  rankFilter.value = ALL_FILTER;
  typeFilter.value = ALL_FILTER;
  periodDates.value = [];
  page.value = 1;
}

function formatPeriodDate(date: unknown): string {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseIsoDate(isoDate: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (match === null) return undefined;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (Number.isNaN(date.getTime())) return undefined;
  return date;
}

function shiftIsoDate(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00`);
  date.setDate(date.getDate() + days);
  return formatPeriodDate(date);
}

function formatInclusiveEnd(endDay: string): string {
  if (endDay.startsWith("9999")) return "至今";
  return shiftIsoDate(endDay, -1);
}

function getVersionRangeByIso(isoDate: string): GroTableVersionRange | undefined {
  for (const range of VERSION_RANGES) {
    if (isoDate >= range.startDay && isoDate < range.endDay) return range;
  }
  return undefined;
}

function getVersionColor(isoDate: string): string {
  return getVersionRangeByIso(isoDate)?.color ?? "";
}

function getVersionStartLabel(isoDate: string): string {
  const range = getVersionRangeByIso(isoDate);
  if (range === undefined || range.startDay !== isoDate) return "";
  return range.version;
}

function isVersionStartDay(isoDate: string): boolean {
  return getVersionRangeByIso(isoDate)?.startDay === isoDate;
}

function isVersionEndDay(isoDate: string): boolean {
  const range = getVersionRangeByIso(isoDate);
  if (range === undefined) return false;
  return shiftIsoDate(isoDate, 1) === range.endDay;
}

function getVersionDayTitle(isoDate: string): string {
  const range = getVersionRangeByIso(isoDate);
  if (range === undefined) return "";
  return `${range.version}  ${range.startDay} ~ ${formatInclusiveEnd(range.endDay)}`;
}

function getPoolLabel(type: string): string {
  return POOL_LABELS[type] ?? "未知";
}

function getItemIcon(item: TGApp.Sqlite.Gacha.Gacha): string {
  const find = getWikiBrief(item.itemId);
  if (!find) return "/UI/nav/paimon.webp";
  if ("element" in find) return `/WIKI/character/${item.itemId}.webp`;
  return `/WIKI/weapon/${item.itemId}.webp`;
}

function getStarBg(rank: string): string {
  return `/icon/bg/${rank}-Star.webp`;
}

function getRowProps(data: { item: GroTableRow }): { class: string } {
  return { class: `gro-t-row gro-t-row--${data.item.rank}` };
}

function onPickerMonth(value: unknown): void {
  const month = Number(value);
  if (!Number.isInteger(month) || month < 0 || month > 11) return;
  pickerMonth.value = month;
}

function onPickerYear(value: unknown): void {
  const year = Number(value);
  if (!Number.isInteger(year)) return;
  pickerYear.value = year;
}

function syncPickerToAnchor(): void {
  const anchor = periodDates.value[0] ?? new Date();
  pickerYear.value = anchor.getFullYear();
  pickerMonth.value = anchor.getMonth();
}

function jumpToToday(): void {
  const now = new Date();
  pickerYear.value = now.getFullYear();
  pickerMonth.value = now.getMonth();
}

function isVersionPeriodSelected(item: GroTableLegendItem): boolean {
  return (
    periodRange.value.start === item.startDay &&
    periodRange.value.end === formatInclusiveEnd(item.endDay)
  );
}

function selectVersionPeriod(item: GroTableLegendItem): void {
  const start = parseIsoDate(item.startDay);
  const end = parseIsoDate(formatInclusiveEnd(item.endDay));
  if (start === undefined || end === undefined) return;
  periodDates.value = [start, end];
  pickerYear.value = start.getFullYear();
  pickerMonth.value = start.getMonth();
}
</script>
<style lang="scss" scoped>
.gro-t-box {
  display: flex;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  flex-direction: column;
  gap: 8px;
}

.gro-t-toolbar {
  display: flex;
  flex-shrink: 0;
  flex-wrap: wrap;
  align-items: center;
  padding: 8px 12px;
  border-radius: 8px;
  background: var(--box-bg-1);
  gap: 8px;
}

.gro-t-filters {
  display: flex;
  min-width: 0;
  flex: 1 1 auto;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.gro-t-actions {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  margin-left: auto;
  column-gap: 8px;
}

.gro-t-search {
  width: 220px;
  flex: 0 0 auto;
}

.gro-t-select {
  width: 140px;
  flex: 0 0 auto;
}

.gro-t-period-locale {
  display: contents;
}

.gro-t-period {
  width: 248px;
  flex: 0 0 auto;
}

.gro-t-cal-bar {
  position: absolute;
  z-index: 1;
  right: 0;
  bottom: 4px;
  left: 0;
  height: 4px;
  border-radius: 0;
  pointer-events: none;

  &.start {
    left: 4px;
    border-bottom-left-radius: 2px;
    border-top-left-radius: 2px;
  }

  &.end {
    right: 4px;
    border-bottom-right-radius: 2px;
    border-top-right-radius: 2px;
  }
}

.gro-t-cal-ver {
  position: absolute;
  z-index: 1;
  top: 0;
  left: 0;
  overflow: hidden;
  width: 100%;
  font-size: 10px;
  font-variant-numeric: tabular-nums;
  line-height: 12px;
  pointer-events: none;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gro-t-cal-footer {
  display: flex;
  width: 100%;
  box-sizing: border-box;
  flex-direction: column;
  padding: 0 8px 8px;
  gap: 8px;
}

.gro-t-cal-legend {
  display: flex;
  min-height: 16px;
  flex-wrap: wrap;
  align-items: center;
  padding: 0 4px;
  gap: 8px;
}

.gro-t-cal-legend-item {
  display: flex;
  align-items: center;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--box-text-4);
  column-gap: 4px;
  cursor: pointer;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  line-height: 16px;

  &:hover,
  &:focus-visible {
    color: var(--app-page-content);
  }

  &.active {
    color: var(--common-text-title);
  }
}

.gro-t-cal-swatch {
  display: block;
  width: 8px;
  height: 8px;
  flex-shrink: 0;
  border-radius: 2px;
}

.gro-t-cal-legend-empty {
  color: var(--box-text-4);
  font-size: 12px;
  line-height: 16px;
}

.gro-t-cal-actions {
  display: flex;
  align-items: center;
  column-gap: 8px;
}

.gro-t-cal-now {
  margin-right: auto;
}

.gro-t-count {
  color: var(--box-text-4);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  line-height: 16px;
  white-space: nowrap;
}

.gro-t-reset {
  color: var(--box-text-4);
}

.gro-t-table-wrap {
  overflow: hidden;
  min-height: 0;
  flex: 1 1 auto;
  border-radius: 8px;
  background: var(--box-bg-1);
}

.gro-t-table {
  height: 100%;
  background: var(--box-bg-1);
}

.gro-t-item {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: flex-start;
  column-gap: 8px;
}

.gro-t-icon {
  position: relative;
  display: flex;
  overflow: hidden;
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 4px;

  .bg,
  .icon {
    position: absolute;
    width: 100%;
    height: 100%;
    inset: 0;
    object-fit: cover;
  }

  .icon {
    z-index: 1;
  }
}

.gro-t-item-text {
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
}

.gro-t-name {
  overflow: hidden;
  max-width: 100%;
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 14px;
  font-weight: normal;
  line-height: 18px;
  text-overflow: ellipsis;
  white-space: nowrap;

  &.rank-5 {
    color: var(--tgc-od-orange);
  }

  &.rank-4 {
    color: var(--tgc-od-purple);
  }

  &.rank-3 {
    color: var(--tgc-od-blue);
  }
}

.gro-t-type {
  color: var(--box-text-4);
  font-size: 11px;
  line-height: 14px;
  opacity: 0.48;
}

.gro-t-pool,
.gro-t-version {
  color: var(--app-page-content);
  font-size: 13px;
  line-height: 18px;
}

.gro-t-version {
  font-variant-numeric: tabular-nums;
}

.gro-t-time {
  color: var(--box-text-4);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  line-height: 16px;
}

.gro-t-rank {
  font-family: var(--font-title);
  font-size: 14px;
  font-variant-numeric: tabular-nums;
  font-weight: normal;
  line-height: 18px;

  &.rank-5 {
    color: var(--tgc-od-orange);
  }

  &.rank-4 {
    color: var(--tgc-od-purple);
  }

  &.rank-3 {
    color: var(--tgc-od-blue);
  }
}

.gro-t-empty {
  padding: 24px 0;
  color: var(--box-text-4);
  font-size: 14px;
  line-height: 20px;
  text-align: center;
}

:deep(.v-data-table__th) {
  height: 40px;
  background: var(--box-bg-2);
  color: var(--box-text-4);
  font-size: 12px;
  font-weight: 600;
  line-height: 16px;
}

:deep(.v-data-table__td) {
  height: 48px;
  padding-top: 8px;
  padding-bottom: 8px;
}

:deep(.gro-t-row) {
  box-shadow: inset 4px 0 0 transparent;
}

:deep(.gro-t-row--5) {
  box-shadow: inset 4px 0 0 var(--tgc-od-orange);
}

:deep(.gro-t-row--4) {
  box-shadow: inset 4px 0 0 var(--tgc-od-purple);
}

:deep(.gro-t-row--3) {
  box-shadow: inset 4px 0 0 var(--tgc-od-blue);
}

:deep(.v-data-table__tr:hover > .v-data-table__td) {
  background: var(--box-bg-4);
}

:deep(.v-data-table-footer) {
  border-top: 1px solid var(--common-shadow-1);
  background: var(--box-bg-1);
  color: var(--box-text-4);
  font-size: 12px;
}
</style>
