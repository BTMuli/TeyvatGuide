<!-- 祈愿复刻组件，TODO：采用vuetify组件优化UI -->
<template>
  <section class="rerun" @keydown.esc="closeDetail">
    <header class="rerun-heading">
      <div class="rerun-title">
        <i aria-hidden="true" class="mdi mdi-history"></i>
        <h2>祈愿复刻周期</h2>
      </div>
      <span class="rerun-source">卡池记录至 {{ dataThrough }}</span>
    </header>
    <div class="rerun-toolbar">
      <div aria-label="物品分类" class="rerun-tabs" role="group">
        <button
          v-for="tab in categoryTabs"
          :key="tab.value"
          :aria-pressed="category === tab.value"
          type="button"
          @click="category = tab.value"
        >
          {{ tab.label }}
        </button>
      </div>
      <div class="rerun-search">
        <i aria-hidden="true" class="mdi mdi-magnify"></i>
        <input
          ref="searchInput"
          v-model="search"
          :aria-label="`搜索${categoryLabel}`"
          :placeholder="`搜索${categoryLabel}名称或 ID`"
          type="search"
        />
      </div>
      <select v-model="sortOrder" aria-label="排序方式">
        <option value="waiting">{{ hasScope ? "结束时间最早" : "最久未 UP" }}</option>
        <option value="recent">{{ lastUpLabel }}</option>
        <option value="first">{{ hasScope ? "范围内最早 UP" : "首次 UP 顺序" }}</option>
        <option value="least">UP 期数从少到多</option>
        <option value="most">UP 期数从多到少</option>
      </select>
    </div>
    <div class="rerun-meta">
      <span aria-live="polite" class="rerun-result">
        {{ sortedRows.length }} {{ isCharacterCategory ? "位角色" : "件武器" }}
      </span>
      <label class="rerun-mix"><input v-model="includeMix" type="checkbox" />含集录祈愿</label>
      <button
        v-if="hasScope"
        :aria-label="`清除时间筛选：${scopeLabel}`"
        class="rerun-scope"
        title="清除时间筛选"
        type="button"
        @click="emit('clearPeriod')"
      >
        <i aria-hidden="true" class="mdi mdi-calendar-range"></i>
        <span>{{ scopeLabel }}</span>
        <i aria-hidden="true" class="mdi mdi-close"></i>
      </button>
      <span v-if="view === 'timeline'" class="rerun-direction">版本由近到远</span>
      <div aria-label="展示方式" class="rerun-tabs rerun-view" role="group">
        <button :aria-pressed="view === 'list'" type="button" @click="view = 'list'">
          <i aria-hidden="true" class="mdi mdi-format-list-bulleted"></i>复刻列表
        </button>
        <button :aria-pressed="view === 'timeline'" type="button" @click="view = 'timeline'">
          <i aria-hidden="true" class="mdi mdi-chart-timeline-variant"></i>版本时间轴
        </button>
      </div>
    </div>
    <div v-if="sortedRows.length === 0" class="rerun-empty">
      <i aria-hidden="true" class="mdi mdi-magnify"></i>
      <strong>{{ hasScope ? "所选范围内没有匹配的" : "没有找到匹配的" }}{{ categoryLabel }}</strong>
      <span>
        {{
          hasScope
            ? "调整顶部时间范围，或清除时间筛选后查看全部记录"
            : "试试名称中的几个字，或切换分类"
        }}
      </span>
      <button v-if="search" type="button" @click="clearSearch">清除搜索</button>
      <button v-if="hasScope" type="button" @click="emit('clearPeriod')">清除时间筛选</button>
    </div>
    <div v-else :class="{ 'has-detail': selectedRow }" class="rerun-body">
      <div
        ref="tableScroll"
        :aria-label="view === 'list' ? '复刻列表' : '版本时间轴，可横向滚动'"
        class="rerun-scroll"
        tabindex="0"
      >
        <table v-if="view === 'list'" class="rerun-table rerun-list">
          <thead>
            <tr>
              <th class="rerun-identity" scope="col">{{ categoryLabel }}</th>
              <th scope="col">{{ lastUpLabel }}</th>
              <th class="rerun-wait-column" scope="col">
                {{ hasScope ? "距该期结束" : "距上期结束" }}
              </th>
              <th class="rerun-count-column" scope="col">
                {{ hasScope ? "范围内已 UP 期数" : "已 UP 期数" }}
              </th>
              <th class="rerun-recent-column" scope="col">
                {{ hasScope ? "范围内记录" : "近期记录" }} <span class="rerun-muted">由近到远</span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in sortedRows"
              :key="row.id"
              :class="{ selected: selectedId === row.id }"
            >
              <th class="rerun-identity" scope="row">
                <button
                  ref="rowButtons"
                  :aria-controls="detailId"
                  :aria-expanded="selectedId === row.id"
                  :data-item-id="row.id"
                  class="rerun-name"
                  type="button"
                  @click="selectRow(row.id)"
                >
                  <TItemBox :modelValue="row.boxData" aria-hidden="true" />
                  <span class="rerun-name-text">
                    <strong>{{ row.name }}</strong>
                    <span class="rerun-mobile-wait">{{ waitingLabel(row) }}</span>
                  </span>
                  <i aria-hidden="true" class="mdi mdi-chevron-right"></i>
                </button>
              </th>
              <td>
                <template v-if="row.lastPool">
                  <div class="rerun-pool-label">
                    <strong>{{ row.lastPool.version }}</strong>
                    <span>{{ periodLabel(row.lastPool) }}</span>
                  </div>
                  <span class="rerun-date">
                    {{ dateLabel(row.lastPool.from) }} — {{ dateLabel(row.lastPool.to) }}
                  </span>
                </template>
                <span v-else class="rerun-muted">尚未开始</span>
              </td>
              <td class="rerun-wait-column">
                <span v-if="row.isActive" class="rerun-current">UP 进行中</span>
                <span v-else-if="row.waitingDays !== null" class="rerun-wait">
                  <strong>{{ row.waitingDays }}</strong> 天
                </span>
                <span v-else class="rerun-muted">尚未开始</span>
              </td>
              <td class="rerun-count-column">
                <span class="rerun-count">{{ row.upCount }}</span>
              </td>
              <td class="rerun-recent-column">
                <div class="rerun-recent">
                  <button
                    v-for="pool in row.recentPools"
                    :key="poolKey(pool)"
                    :aria-label="`查看${row.name} ${pool.version} ${periodLabel(pool)}记录`"
                    :title="`${dateLabel(pool.from)} — ${dateLabel(pool.to)} · ${periodLabel(pool)}`"
                    type="button"
                    @click="selectRow(row.id, poolKey(pool))"
                  >
                    {{ pool.version }}<span>{{ periodLabel(pool, true) }}</span>
                  </button>
                  <span v-if="row.recentPools.length === 0" class="rerun-muted">—</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <table v-else class="rerun-table rerun-timeline">
          <thead>
            <tr>
              <th class="rerun-identity" scope="col">{{ categoryLabel }}</th>
              <th v-for="vg in displayVersionGroups" :key="vg.version" scope="col">
                <strong>{{ vg.version }}</strong
                ><span class="rerun-date">{{ vg.timeRange }}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in sortedRows"
              :key="row.id"
              :class="{ selected: selectedId === row.id }"
            >
              <th class="rerun-identity" scope="row">
                <button
                  ref="rowButtons"
                  :aria-controls="detailId"
                  :aria-expanded="selectedId === row.id"
                  :data-item-id="row.id"
                  class="rerun-name"
                  type="button"
                  @click="selectRow(row.id)"
                >
                  <TItemBox :modelValue="row.boxData" aria-hidden="true" />
                  <span class="rerun-name-text">
                    <strong>{{ row.name }}</strong>
                    <span class="rerun-muted">{{ waitingLabel(row) }}</span>
                  </span>
                  <i aria-hidden="true" class="mdi mdi-chevron-right"></i>
                </button>
              </th>
              <td v-for="vg in displayVersionGroups" :key="vg.version">
                <GroRerunCell :itemId="row.id" :versionGroup="vg" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <aside
        v-if="selectedRow"
        :id="detailId"
        :aria-label="`${selectedRow.name}${hasScope ? '范围内' : '历次'} UP 记录`"
        class="rerun-detail"
      >
        <div class="rerun-detail-heading">
          <TItemBox :modelValue="selectedRow.boxData" aria-hidden="true" />
          <div>
            <h3>{{ selectedRow.name }}</h3>
            <span class="rerun-muted">
              {{ hasScope ? "范围内已" : "已" }} UP {{ selectedRow.upCount }} 期 ·
              {{ includeMix ? "含" : "不含" }}集录祈愿
            </span>
          </div>
          <button
            ref="closeButton"
            aria-label="关闭记录，返回列表"
            class="rerun-close"
            type="button"
            @click="closeDetail"
          >
            <i aria-hidden="true" class="mdi mdi-close"></i>
          </button>
        </div>
        <div class="rerun-detail-summary">
          <span>{{ lastUpLabel }}</span>
          <strong>
            {{
              selectedRow.lastPool
                ? `${selectedRow.lastPool.version} · ${periodLabel(selectedRow.lastPool)}`
                : "尚未开始"
            }}
          </strong>
          <span>{{ waitingLabel(selectedRow) }}</span>
        </div>
        <div
          ref="historyScroll"
          :aria-label="`${hasScope ? '范围内' : '历次'} UP 记录，可滚动`"
          class="rerun-history-scroll"
          tabindex="0"
        >
          <ol class="rerun-history">
            <li
              v-for="(pool, index) in history"
              :key="poolKey(pool)"
              ref="historyItems"
              :class="{ 'is-target': selectedPoolKey === poolKey(pool) }"
              :data-pool-key="poolKey(pool)"
            >
              <span v-if="index > 0" class="rerun-gap">{{ gapLabel(index - 1) }}</span>
              <div class="rerun-history-card">
                <div class="rerun-history-title">
                  <strong>{{ pool.version }} · {{ periodLabel(pool) }}</strong>
                  <span class="rerun-history-tag">{{ historyLabel(pool, index) }}</span>
                </div>
                <p>{{ dateLabel(pool.from) }} — {{ dateLabel(pool.to) }}</p>
                <span class="rerun-muted">{{ pool.name }}</span>
              </div>
            </li>
          </ol>
        </div>
      </aside>
    </div>
    <footer class="rerun-footer">
      <span>{{ hasScope ? "显示与所选时段相交的完整卡池" : "点击名称查看历次 UP" }}</span>
      <span>距结束天数截至今天 · 同期双卡池合并计数</span>
    </footer>
  </section>
</template>

<script lang="ts" setup>
import TItemBox, { type TItemBoxData } from "@comp/app/t-itemBox.vue";
import gameEnum from "@enum/game.js";
import {
  GACHA_FILTER_ALL,
  toGachaPeriodEndBound,
  toGachaPeriodStartBound,
} from "@utils/gachaVersion.js";
import { getWikiBrief } from "@utils/toolFunc.js";
import { computed, nextTick, onMounted, onUnmounted, ref, useId, useTemplateRef, watch } from "vue";

import GroRerunCell from "./gro-rerun-cell.vue";

import { AppGachaData } from "@/data/index.js";

type Category = "5char" | "4char" | "5weapon" | "4weapon";
type SortOrder = "waiting" | "recent" | "first" | "least" | "most";
type Pool = TGApp.App.Gacha.PoolItem;
type VersionGroup = { version: string; timeRange: string; allPools: Array<Pool> };
type RerunItem = {
  id: number;
  name: string;
  star: number;
  isCharacter: boolean;
  boxData: TItemBoxData;
  pools: Array<Pool>;
};
type RerunRow = RerunItem & {
  upCount: number;
  lastPool: Pool | null;
  recentPools: Array<Pool>;
  lastEnd: number;
  isActive: boolean;
  waitingDays: number | null;
};

const props = defineProps<{
  /** 版本筛选；未传或 all 表示全部版本。 */
  versionFilter?: string | null;
  /** 展示范围开始日（yyyy-MM-dd），沿用祈愿页面的游戏日边界。 */
  periodStart?: string;
  /** 展示范围结束日（yyyy-MM-dd），含次日凌晨 03:59:59。 */
  periodEnd?: string;
}>();
const emit = defineEmits<{ clearPeriod: [] }>();

const categoryTabs: Array<{ value: Category; label: string }> = [
  { value: "5char", label: "五星角色" },
  { value: "4char", label: "四星角色" },
  { value: "5weapon", label: "五星武器" },
  { value: "4weapon", label: "四星武器" },
];
const category = ref<Category>("5char");
const sortOrder = ref<SortOrder>("waiting");
const search = ref<string>("");
const view = ref<"list" | "timeline">("list");
const selectedId = ref<number | null>(null);
const selectedPoolKey = ref<string | null>(null);
const includeMix = ref<boolean>(true);
const now = ref<number>(Date.now());
const detailId = useId();
const searchInput = useTemplateRef<HTMLInputElement>("searchInput");
const tableScroll = useTemplateRef<HTMLDivElement>("tableScroll");
const historyScroll = useTemplateRef<HTMLDivElement>("historyScroll");
const rowButtons = useTemplateRef<Array<HTMLButtonElement>>("rowButtons");
const historyItems = useTemplateRef<Array<HTMLLIElement>>("historyItems");
const closeButton = useTemplateRef<HTMLButtonElement>("closeButton");
let clock: ReturnType<typeof setInterval> | undefined;

onMounted(() => {
  clock = setInterval(() => {
    now.value = Date.now();
  }, 60000);
});
onUnmounted(() => clearInterval(clock));

const allUpPools = computed<Array<Pool>>(() =>
  AppGachaData.filter(
    (pool) =>
      pool.type === Number(gameEnum.gachaType.AvatarUp) ||
      pool.type === Number(gameEnum.gachaType.AvatarUp2) ||
      pool.type === Number(gameEnum.gachaType.WeaponUp) ||
      (includeMix.value && isMix(pool)),
  ).sort((a, b) => timestamp(a.from) - timestamp(b.from) || timestamp(a.to) - timestamp(b.to)),
);

const hasVersionFilter = computed<boolean>(
  () => Boolean(props.versionFilter) && props.versionFilter !== GACHA_FILTER_ALL,
);
const hasScope = computed<boolean>(
  () => hasVersionFilter.value || Boolean(props.periodStart || props.periodEnd),
);
const scopeLabel = computed<string>(() => {
  const labels: Array<string> = [];
  if (hasVersionFilter.value) labels.push(`${props.versionFilter} 版本`);
  if (props.periodStart || props.periodEnd)
    labels.push(`${props.periodStart || "起始"} — ${props.periodEnd || "至今"}`);
  return labels.join(" · ");
});
const lastUpLabel = computed<string>(() => (hasScope.value ? "范围内最近 UP" : "最近 UP"));
const scopedPools = computed<Array<Pool>>(() => {
  if (!hasScope.value) return allUpPools.value;
  const start = props.periodStart ? toGachaPeriodStartBound(props.periodStart) : "";
  const end = props.periodEnd ? toGachaPeriodEndBound(props.periodEnd) : "";
  return allUpPools.value.filter((pool) => {
    if (hasVersionFilter.value && pool.version !== props.versionFilter) return false;
    // 使用卡池记录的原始时区时间，与页面的 04:00 游戏日边界保持一致。
    const from = pool.from.slice(0, 19).replace("T", " ");
    const to = pool.to.slice(0, 19).replace("T", " ");
    return (start === "" || to >= start) && (end === "" || from <= end);
  });
});

const allItems = computed<Array<RerunItem>>(() => {
  const items = new Map<number, RerunItem>();
  for (const pool of scopedPools.value) {
    for (const id of [...pool.up5List, ...pool.up4List]) {
      let item = items.get(id);
      if (!item) {
        const brief = getWikiBrief(id);
        if (!brief) continue;
        const isCharacter = "element" in brief;
        item = {
          id,
          name: brief.name,
          star: brief.star,
          isCharacter,
          boxData: {
            bg: `/icon/bg/${brief.star}-Star.webp`,
            icon: `/WIKI/${isCharacter ? "character" : "weapon"}/${id}.webp`,
            size: "40px",
            height: "40px",
            display: "inner",
            clickable: true,
            lt:
              "element" in brief
                ? `/icon/element/${brief.element}元素.webp`
                : `/icon/weapon/${brief.weapon}.webp`,
            ltSize: "16px",
            innerHeight: 0,
            innerText: "",
          },
          pools: [],
        };
        items.set(id, item);
      }
      // 双角色池共享同一 UP 时段，集录与活动祈愿分别保留。
      if (!item.pools.some((existing) => poolKey(existing) === poolKey(pool)))
        item.pools.push(pool);
    }
  }
  return [...items.values()];
});

const isCharacterCategory = computed<boolean>(() => category.value.endsWith("char"));
const categoryLabel = computed<string>(() => (isCharacterCategory.value ? "角色" : "武器"));
const categoryRows = computed<Array<RerunRow>>(() =>
  allItems.value
    .filter(
      (item) =>
        item.star === Number(category.value[0]) && item.isCharacter === isCharacterCategory.value,
    )
    .map((item) => {
      const started = item.pools.filter((pool) => timestamp(pool.from) <= now.value);
      const lastPool = started.at(-1) ?? null;
      const lastEnd = started.reduce((latest, pool) => Math.max(latest, timestamp(pool.to)), 0);
      return {
        ...item,
        upCount: started.length,
        lastPool,
        recentPools: started.slice(-3).reverse(),
        lastEnd,
        isActive: lastPool !== null && lastEnd >= now.value,
        waitingDays: lastPool ? Math.max(0, Math.floor((now.value - lastEnd) / 86400000)) : null,
      };
    }),
);

const sortedRows = computed<Array<RerunRow>>(() => {
  const query = search.value.trim().toLocaleLowerCase();
  return categoryRows.value
    .filter((row) => row.name.toLocaleLowerCase().includes(query) || String(row.id).includes(query))
    .sort((a, b) => {
      // 尚未开始的卡池不参与最近 / 最久未 UP 的排序，统一放在末尾。
      if (sortOrder.value === "waiting" || sortOrder.value === "recent") {
        if (!a.lastPool || !b.lastPool)
          return Number(!a.lastPool) - Number(!b.lastPool) || a.id - b.id;
        if (sortOrder.value === "waiting")
          return Number(a.isActive) - Number(b.isActive) || a.lastEnd - b.lastEnd || a.id - b.id;
        return timestamp(b.lastPool.from) - timestamp(a.lastPool.from) || a.id - b.id;
      }
      if (sortOrder.value === "least") return a.upCount - b.upCount || a.id - b.id;
      if (sortOrder.value === "most") return b.upCount - a.upCount || a.id - b.id;
      return timestamp(a.pools[0].from) - timestamp(b.pools[0].from) || a.id - b.id;
    });
});

const displayVersionGroups = computed<Array<VersionGroup>>(() => {
  // 搜索后仍保留空白版本，让时间轴真实反映未 UP 的时长。
  const groups = new Map<string, Array<Pool>>();
  for (const pool of scopedPools.value) {
    const existing = groups.get(pool.version);
    if (existing) existing.push(pool);
    else groups.set(pool.version, [pool]);
  }
  return [...groups]
    .map(([version, pools]) => {
      const end = pools.reduce(
        (latest, pool) => (timestamp(pool.to) > timestamp(latest) ? pool.to : latest),
        pools[0].to,
      );
      return {
        version,
        timeRange: `${dateLabel(pools[0].from)}\n至 ${dateLabel(end)}`,
        allPools: pools,
      };
    })
    .reverse();
});
const selectedRow = computed<RerunRow | undefined>(() =>
  sortedRows.value.find((row) => row.id === selectedId.value),
);
const history = computed<Array<Pool>>(() => [...(selectedRow.value?.pools ?? [])].reverse());
const dataThrough = computed<string>(() => {
  const latest = allUpPools.value.reduce((end, pool) => Math.max(end, timestamp(pool.to)), 0);
  const pool = allUpPools.value.find((item) => timestamp(item.to) === latest);
  return pool ? dateLabel(pool.to) : "暂无记录";
});

watch([category, scopedPools], () => {
  selectedId.value = null;
  selectedPoolKey.value = null;
});
watch([search, sortOrder, category, view, scopedPools], async () => {
  await nextTick();
  tableScroll.value?.scrollTo({ top: 0, left: 0 });
  if (!selectedRow.value) {
    selectedId.value = null;
    selectedPoolKey.value = null;
  }
});

function timestamp(value: string): number {
  return new Date(value).getTime();
}

function isMix(pool: Pool): boolean {
  return pool.type === Number(gameEnum.gachaType.MixUp);
}

function poolKey(pool: Pool): string {
  return `${pool.from}|${pool.to}|${isMix(pool) ? "mix" : "event"}`;
}

function dateLabel(value: string): string {
  return value.slice(0, 10);
}

function periodLabel(pool: Pool, short = false): string {
  return isMix(pool) ? (short ? "集录" : "集录祈愿") : `${pool.order} 期`;
}

function waitingLabel(row: RerunRow): string {
  if (row.isActive) return "UP 进行中";
  if (row.waitingDays === null) return "尚未开始";
  return `${hasScope.value ? "距该期结束" : "距上次结束"} ${row.waitingDays} 天`;
}

function gapLabel(index: number): string {
  const pool = history.value[index];
  const earlierPools = history.value.slice(index + 1);
  if (!pool || earlierPools.length === 0) return "首次收录";
  const previousEnd = Math.max(...earlierPools.map((item) => timestamp(item.to)));
  const gap = timestamp(pool.from) - previousEnd;
  return gap <= 0 ? "与前期重叠" : `间隔 ${Math.floor(gap / 86400000)} 天`;
}

function historyLabel(pool: Pool, index: number): string {
  if (timestamp(pool.from) > now.value) return "尚未开始";
  if (timestamp(pool.to) >= now.value) return "进行中";
  if (index === history.value.length - 1) return hasScope.value ? "范围内最早" : "首次 UP";
  return selectedRow.value?.lastPool === pool ? lastUpLabel.value : "";
}

async function selectRow(id: number, key: string | null = null): Promise<void> {
  if (selectedId.value === id && key === null) {
    await closeDetail();
    return;
  }
  selectedId.value = id;
  selectedPoolKey.value = key;
  await nextTick();
  closeButton.value?.focus({ preventScroll: true });
  const item = historyItems.value?.find((element) => element.dataset.poolKey === key);
  if (item && historyScroll.value) historyScroll.value.scrollTop = Math.max(0, item.offsetTop - 8);
  else historyScroll.value?.scrollTo({ top: 0 });
}

async function closeDetail(): Promise<void> {
  const id = selectedId.value;
  if (id === null) return;
  selectedId.value = null;
  selectedPoolKey.value = null;
  await nextTick();
  rowButtons.value
    ?.find((button) => button.dataset.itemId === String(id))
    ?.focus({ preventScroll: true });
}

function clearSearch(): void {
  search.value = "";
  searchInput.value?.focus();
}
</script>

<style lang="scss" scoped>
.rerun {
  --rerun-muted: var(--box-text-4);
  --rerun-accent: var(--common-text-title);
  --rerun-selected: color-mix(in srgb, var(--tgc-yellow-3) 12%, var(--app-page-bg));

  display: flex;
  overflow: hidden;
  height: 100%;
  min-height: 0;
  flex-direction: column;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--app-page-bg);
  color: var(--app-page-content);
  container: rerun / inline-size;
  font-size: 14px;
  line-height: 20px;

  button,
  input,
  select {
    font: inherit;
  }

  button,
  select {
    color: inherit;
    cursor: pointer;
  }

  button {
    padding: 0;
    border: 0;
    border-radius: 4px;
    background: transparent;
  }

  input[type="search"] {
    padding: 0;
    border: 0;
    background: transparent;
  }
}

.rerun-muted,
.rerun-source,
.rerun-date {
  color: var(--rerun-muted);
  font-size: 12px;
  font-weight: normal;
}

.rerun-heading {
  display: flex;
  flex: none;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  gap: 8px;
}

.rerun-title {
  display: flex;
  align-items: center;
  color: var(--rerun-accent);
  gap: 8px;
}

.rerun-title > i {
  font-size: 24px;
}

.rerun-title > h2 {
  margin: 0;
  font-family: var(--font-title);
  font-size: 20px;
  font-weight: normal;
  line-height: 28px;
}

.rerun-toolbar {
  display: flex;
  flex: none;
  flex-wrap: wrap;
  padding: 0 16px 12px;
  gap: 12px;
}

.rerun-toolbar > select {
  min-height: 36px;
  padding: 4px 28px 4px 12px;
  border: 1px solid var(--common-shadow-2);
  border-radius: 4px;
  appearance: auto;
  background: var(--box-bg-1);
}

.rerun-tabs {
  display: flex;
  flex: none;
  padding: 4px;
  border-radius: 4px;
  background: var(--box-bg-3);
  gap: 4px;
}

.rerun-tabs > button {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px 12px;
  gap: 4px;
  white-space: nowrap;
}

.rerun-search {
  display: flex;
  min-width: 180px;
  flex: 1;
  align-items: center;
  padding: 4px 12px;
  border: 1px solid var(--common-shadow-2);
  border-radius: 4px;
  gap: 8px;

  i {
    color: var(--rerun-muted);
    font-size: 20px;
  }

  input {
    width: 100%;
    min-width: 0;
    color: inherit;
    outline: none !important;

    &::placeholder {
      color: var(--rerun-muted);
      opacity: 1;
    }
  }
}

.rerun-meta {
  display: flex;
  flex: none;
  flex-wrap: wrap;
  align-items: center;
  padding: 0 16px 8px;
  font-size: 12px;
  gap: 16px;
}

.rerun-result {
  font-variant-numeric: tabular-nums;
}

.rerun-mix {
  display: flex;
  align-items: center;
  cursor: pointer;
  gap: 4px;
}

.rerun-mix > input {
  width: 16px;
  height: 16px;
  accent-color: var(--tgc-yellow-3);
}

.rerun-scope {
  display: flex;
  min-width: 0;
  align-items: center;
  padding: 4px 8px;
  border: 1px solid var(--common-shadow-2);
  background: var(--box-bg-1);
  gap: 4px;
}

.rerun-scope > span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rerun-scope:hover {
  background: var(--box-bg-4);
}

.rerun-direction {
  margin-left: auto;
  color: var(--rerun-muted);
}

.rerun-view {
  padding: 0;
  margin-left: auto;
  background: transparent;
}

.rerun-body {
  display: flex;
  overflow: hidden;
  min-height: 0;
  flex: 1;
  border-top: 1px solid var(--common-shadow-1);
}

.rerun-scroll {
  overflow: auto;
  min-width: 0;
  flex: 1;
  scrollbar-gutter: stable;
}

.rerun-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
}

.rerun-table th,
.rerun-table td {
  height: 60px;
  padding: 8px 16px;
  border-bottom: 1px solid var(--common-shadow-1);
  text-align: left;
  vertical-align: middle;
  white-space: nowrap;
}

.rerun-table thead th {
  position: sticky;
  z-index: 2;
  top: 0;
  height: 40px;
  background: var(--box-bg-3);
  color: var(--rerun-muted);
  font-size: 12px;
  font-weight: normal;
}

.rerun-table tbody tr:nth-child(even) {
  background: color-mix(in srgb, var(--box-bg-1) 40%, var(--app-page-bg));
}

.rerun-table tbody tr:hover {
  background: var(--box-bg-1);
}

.rerun-table tbody tr.selected {
  background: var(--rerun-selected);
}

.rerun-table .rerun-identity {
  position: sticky;
  z-index: 1;
  left: 0;
  min-width: 196px;
  background: var(--app-page-bg);
}

.rerun-table thead .rerun-identity {
  z-index: 3;
  background: var(--box-bg-3);
}

.rerun-table tr.selected .rerun-identity {
  background: var(--rerun-selected);
  box-shadow: inset 3px 0 var(--tgc-yellow-3);
}

.rerun-name {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 12px;
  text-align: left;
}

.rerun-name > :first-child {
  flex-shrink: 0;
}

.rerun-name > i {
  margin-left: auto;
  color: var(--rerun-muted);
  font-size: 18px;
}

.rerun-name-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.rerun-name-text > strong {
  font-size: 14px;
  font-weight: 600;
}

.rerun-mobile-wait {
  display: none;
  color: var(--rerun-muted);
  font-size: 12px;
  font-weight: normal;
}

.rerun-pool-label {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.rerun-pool-label > strong {
  color: var(--rerun-accent);
  font-size: 16px;
  font-variant-numeric: tabular-nums;
}

.rerun-pool-label > span {
  color: var(--rerun-muted);
  font-size: 12px;
}

.rerun-date {
  display: block;
  font-variant-numeric: tabular-nums;
}

.rerun-wait {
  color: var(--rerun-muted);
  font-size: 12px;
}

.rerun-wait > strong {
  color: var(--app-page-content);
  font-size: 16px;
  font-variant-numeric: tabular-nums;
}

.rerun-current {
  padding: 4px 8px;
  border-radius: 4px;
  background: var(--rerun-selected);
  color: var(--rerun-accent);
  font-size: 12px;
}

.rerun-count {
  font-variant-numeric: tabular-nums;
}

.rerun-recent {
  display: flex;
  align-items: center;
  gap: 8px;
}

.rerun-recent > button {
  display: flex;
  min-width: 64px;
  flex-direction: column;
  padding: 4px 8px;
  border: 1px solid var(--common-shadow-1);
  background: var(--box-bg-1);
  font-variant-numeric: tabular-nums;
  text-align: center;
}

.rerun-timeline td {
  min-width: 168px;
}

.rerun-timeline thead th:not(.rerun-identity) {
  padding-block: 8px;
}

.rerun-timeline thead .rerun-date {
  max-width: 140px;
  white-space: pre-line;
}

.rerun-detail {
  display: flex;
  overflow: hidden;
  width: 344px;
  min-width: 0;
  flex: none;
  flex-direction: column;
  border-left: 1px solid var(--common-shadow-1);
  background: var(--box-bg-1);
}

.rerun-detail-heading {
  display: flex;
  flex: none;
  align-items: center;
  padding: 16px;
  gap: 12px;
}

.rerun-detail-heading h3 {
  margin: 0 0 4px;
  color: var(--rerun-accent);
  font-family: var(--font-title);
  font-size: 18px;
  font-weight: normal;
}

.rerun-close {
  width: 32px;
  height: 32px;
  flex: none;
  margin-left: auto;
  font-size: 20px;
}

.rerun-close:hover {
  background: var(--box-bg-4);
}

.rerun-detail-summary {
  display: grid;
  flex: none;
  padding: 12px;
  border-radius: 4px;
  border-left: 2px solid var(--tgc-yellow-3);
  margin: 0 16px 12px;
  background: var(--rerun-selected);
  gap: 4px;
}

.rerun-detail-summary > span {
  color: var(--rerun-muted);
  font-size: 12px;
}

.rerun-detail-summary > strong {
  color: var(--rerun-accent);
  font-size: 16px;
  font-weight: 600;
}

.rerun-history-scroll {
  position: relative;
  overflow: auto;
  min-height: 0;
  flex: 1;
}

.rerun-history {
  padding: 4px 16px 16px 28px;
  margin: 0;
  list-style: none;
}

.rerun-history > li {
  position: relative;
  padding-left: 16px;
  border-left: 1px solid var(--common-shadow-2);
}

.rerun-history > li::before {
  position: absolute;
  z-index: 1;
  top: 44px;
  left: -4px;
  width: 8px;
  height: 8px;
  border: 2px solid var(--tgc-yellow-3);
  border-radius: 50%;
  background: var(--box-bg-1);
  content: "";
}

.rerun-history > li:first-child::before {
  top: 12px;
  background: var(--tgc-yellow-3);
}

.rerun-gap {
  display: block;
  padding: 8px 0;
  color: var(--rerun-muted);
  font-size: 12px;
  line-height: 16px;
}

.rerun-history-card {
  padding: 8px 12px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
  background: var(--app-page-bg);
}

.is-target > .rerun-history-card {
  border-color: var(--tgc-yellow-3);
  background: var(--rerun-selected);
}

.rerun-history-title {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
}

.rerun-history-title > strong {
  font-size: 14px;
  font-weight: 600;
}

.rerun-history-tag {
  color: var(--rerun-accent);
  font-size: 12px;
}

.rerun-history-card > p {
  margin: 4px 0;
  font-size: 12px;
}

.rerun-empty {
  display: flex;
  min-height: 120px;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 16px;
  gap: 8px;
}

.rerun-empty > i {
  color: var(--rerun-muted);
  font-size: 28px;
}

.rerun-empty > span {
  color: var(--rerun-muted);
  font-size: 12px;
}

.rerun-empty > button {
  padding: 4px 12px;
  border: 1px solid var(--common-shadow-2);
  background: var(--box-bg-1);
}

.rerun-footer {
  display: flex;
  flex: none;
  flex-wrap: wrap;
  justify-content: space-between;
  padding: 8px 16px;
  border-top: 1px solid var(--common-shadow-1);
  color: var(--rerun-muted);
  font-size: 12px;
  gap: 4px 12px;
}

.rerun-tabs > button:hover {
  background: var(--box-bg-4);
}

.rerun-tabs > button[aria-pressed="true"] {
  background: var(--app-page-bg);
  box-shadow: 0 1px 3px var(--common-shadow-1);
  color: var(--rerun-accent);
}

.rerun-recent > button:hover {
  border-color: var(--tgc-yellow-3);
  background: var(--rerun-selected);
}

.rerun-recent > button > span {
  color: var(--rerun-muted);
  font-size: 12px;
}

.rerun-timeline thead strong {
  color: var(--rerun-accent);
  font-size: 14px;
}

.rerun :is(button, input, select, [tabindex]):focus-visible {
  outline: 2px solid var(--rerun-accent);
  outline-offset: -2px;
}

@container rerun (width < 1120px) {
  .has-detail .rerun-recent-column {
    display: none;
  }

  .rerun-detail {
    width: 312px;
  }

  .rerun-table th,
  .rerun-table td {
    padding-inline: 12px;
  }
}

@container rerun (width < 800px) {
  .has-detail .rerun-scroll {
    display: none;
  }

  .rerun-detail {
    width: 100%;
    border-left: 0;
  }

  .rerun-detail-summary {
    align-items: center;
    gap: 12px;
    grid-template-columns: auto 1fr auto;
  }

  .rerun-recent-column {
    display: none;
  }

  .rerun-toolbar {
    gap: 8px;
  }

  .rerun-toolbar > .rerun-tabs {
    width: 100%;
  }

  .rerun-toolbar > .rerun-tabs > button {
    flex: 1;
  }

  .rerun-source {
    display: none;
  }
}

@container rerun (width < 520px) {
  .rerun-heading {
    padding: 12px;
  }

  .rerun-toolbar {
    padding: 0 12px 8px;
  }

  .rerun-tabs > button {
    padding: 4px 8px;
  }

  .rerun-meta {
    padding: 0 12px 8px;
    gap: 8px;
  }

  .rerun-table .rerun-identity {
    min-width: 160px;
  }

  .rerun-list .rerun-wait-column,
  .rerun-count-column {
    display: none;
  }

  .rerun-mobile-wait {
    display: block;
  }

  .rerun-list .rerun-date {
    max-width: 160px;
    white-space: normal;
  }

  .rerun-name {
    gap: 8px;
  }

  .rerun-name > i,
  .rerun-footer > span:first-child,
  .rerun-direction {
    display: none;
  }

  .rerun-detail-summary {
    gap: 4px;
    grid-template-columns: 1fr;
  }
}
</style>
