<!-- 祈愿数据表格 -->
<template>
  <div class="gro-t-box">
    <div class="gro-t-toolbar">
      <div class="gro-t-filters">
        <v-text-field
          v-model="searchKeyword"
          aria-label="搜索物品名称"
          autocomplete="off"
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
          :hide-details="true"
          :items="poolOptions"
          bg-color="var(--app-page-bg)"
          class="gro-t-select gro-t-select--pool"
          clearable
          density="compact"
          label="卡池"
          variant="outlined"
        />
        <v-select
          v-model="rankFilter"
          :hide-details="true"
          :items="rankOptions"
          bg-color="var(--app-page-bg)"
          class="gro-t-select"
          clearable
          density="compact"
          label="星级"
          variant="outlined"
        />
        <v-select
          v-model="typeFilter"
          :hide-details="true"
          :items="typeOptions"
          bg-color="var(--app-page-bg)"
          class="gro-t-select"
          clearable
          density="compact"
          label="类型"
          variant="outlined"
        />
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
      <div class="gro-t-actions">
        <span class="gro-t-count">{{ countLabel }}</span>
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
        <template v-slot:[`item.poolName`]="{ item }">
          <span class="gro-t-pool-name" :title="item.poolName || undefined">
            {{ item.poolName || "—" }}
          </span>
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
import { getGachaVersion } from "@utils/gachaVersion.js";
import { compareVersions, getWikiBrief } from "@utils/toolFunc.js";
import { computed, ref, watch } from "vue";
import type { DataTableHeader } from "vuetify/lib/components/VDataTable/types.js";

import { AppGachaData } from "@/data/index.js";

type GroTableProps = { modelValue: Array<TGApp.Sqlite.Gacha.Gacha> };
type GroTableFilterOption = { title: string; value: string };
type GroTableSortItem = { key: string; order: "asc" | "desc" };
type GroTableRow = TGApp.Sqlite.Gacha.Gacha & { version: string; poolName: string };

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
const STRICT_POOL_TYPES: Array<string> = [gameEnum.gachaType.WeaponUp, gameEnum.gachaType.MixUp];
const AVATAR_UP_POOL_TYPES: Array<string> = [
  gameEnum.gachaType.AvatarUp,
  gameEnum.gachaType.AvatarUp2,
];
const POOL_META = AppGachaData.map((pool) => ({
  name: pool.name,
  type: pool.type.toString(),
  from: toGachaTime(pool.from),
  to: toGachaTime(pool.to),
}));

const props = defineProps<GroTableProps>();
const searchKeyword = ref<string>("");
const poolFilter = ref<string | null>(null);
const rankFilter = ref<string | null>(null);
const typeFilter = ref<string | null>(null);
const page = ref<number>(1);
const itemsPerPage = ref<number>(50);
const sortBy = ref<Array<GroTableSortItem>>([{ key: "time", order: "desc" }]);
const headers: Array<DataTableHeader<GroTableRow>> = [
  { title: "物品", align: "start", key: "name", sortable: true, nowrap: true },
  { title: "卡池", align: "center", key: "uigfType", sortable: true, width: 128, nowrap: true },
  {
    title: "卡池名称",
    align: "start",
    key: "poolName",
    sortable: true,
    width: 160,
    nowrap: true,
  },
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
const poolOptions = computed<Array<GroTableFilterOption>>(() =>
  POOL_ORDER.map((type) => ({ title: POOL_LABELS[type] ?? "未知", value: type })),
);
const rankOptions: Array<GroTableFilterOption> = [
  { title: "5 星", value: "5" },
  { title: "4 星", value: "4" },
  { title: "3 星", value: "3" },
];
const typeOptions = computed<Array<GroTableFilterOption>>(() => {
  const types = [...new Set(props.modelValue.map((item) => item.type).filter(Boolean))];
  return types.map((type) => ({ title: type, value: type }));
});
const normalizedSearch = computed<string>(() => (searchKeyword.value ?? "").trim().toLowerCase());
const hasActiveFilters = computed<boolean>(() => {
  return (
    normalizedSearch.value !== "" ||
    poolFilter.value !== null ||
    rankFilter.value !== null ||
    typeFilter.value !== null
  );
});
const tableRows = computed<Array<GroTableRow>>(() => {
  return props.modelValue.map((item) => ({
    ...item,
    version: getGachaVersion(item.time),
    poolName: getPoolName(item),
  }));
});
const filteredItems = computed<Array<GroTableRow>>(() => {
  return tableRows.value.filter((item) => {
    if (poolFilter.value !== null && item.uigfType !== poolFilter.value) return false;
    if (rankFilter.value !== null && item.rank !== rankFilter.value) return false;
    if (typeFilter.value !== null && item.type !== typeFilter.value) return false;
    if (normalizedSearch.value === "") return true;
    return (
      item.name.toLowerCase().includes(normalizedSearch.value) ||
      item.poolName.toLowerCase().includes(normalizedSearch.value)
    );
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

watch([searchKeyword, poolFilter, rankFilter, typeFilter], () => {
  page.value = 1;
});
watch(
  () => props.modelValue,
  () => {
    page.value = 1;
  },
);

function toGachaTime(iso: string): string {
  return iso.slice(0, 19).replace("T", " ");
}

function getPoolName(item: TGApp.Sqlite.Gacha.Gacha): string {
  if (item.gachaType === gameEnum.gachaType.Newbie) return "初行者推荐祈愿";
  if (item.gachaType === gameEnum.gachaType.Normal) return "奔行世间";
  const gachaType = item.gachaType.toString();
  const find = POOL_META.find((pool) => {
    if (pool.type !== gachaType) {
      if (STRICT_POOL_TYPES.includes(gachaType)) return false;
      if (!AVATAR_UP_POOL_TYPES.includes(pool.type)) return false;
    }
    return item.time >= pool.from && item.time <= pool.to;
  });
  return find?.name ?? "";
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
  poolFilter.value = null;
  rankFilter.value = null;
  typeFilter.value = null;
  page.value = 1;
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
  border-radius: 4px;
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

  &--pool {
    width: 180px;
  }
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
  border-radius: 4px;
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
.gro-t-pool-name,
.gro-t-version {
  color: var(--app-page-content);
  font-size: 13px;
  line-height: 18px;
}

.gro-t-pool-name {
  display: inline-block;
  overflow: hidden;
  max-width: 100%;
  text-overflow: ellipsis;
  white-space: nowrap;
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

:deep(.gro-t-row > .v-data-table__td:first-child) {
  box-shadow: inset 4px 0 0 transparent;
}

:deep(.gro-t-row--5 > .v-data-table__td:first-child) {
  box-shadow: inset 4px 0 0 var(--tgc-od-orange);
}

:deep(.gro-t-row--4 > .v-data-table__td:first-child) {
  box-shadow: inset 4px 0 0 var(--tgc-od-purple);
}

:deep(.gro-t-row--3 > .v-data-table__td:first-child) {
  box-shadow: inset 4px 0 0 var(--tgc-od-blue);
}

:deep(.v-data-table__tr:nth-child(even) > .v-data-table__td) {
  background: var(--box-bg-2);
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
