<template>
  <section class="rerun">
    <header class="rerun-heading">
      <div>
        <h2>祈愿复刻周期</h2>
        <p>查找最近 UP，回顾每一次相遇</p>
      </div>
      <span class="rerun-source">本地卡池收录至 {{ dataThrough }}</span>
    </header>
    <div class="rerun-toolbar">
      <div class="rerun-tabs" aria-label="物品分类">
        <button
          v-for="tab in categoryTabs"
          :key="tab.value"
          :aria-pressed="category === tab.value"
          @click="category = tab.value"
        >
          {{ tab.label }}
        </button>
      </div>
      <div class="rerun-search">
        <i class="mdi mdi-magnify" aria-hidden="true"></i>
        <input
          v-model="search"
          type="search"
          placeholder="搜索角色 / 武器名称或 ID"
          aria-label="搜索角色或武器"
        />
      </div>
      <select v-model="sortOrder" aria-label="排序方式">
        <option value="waiting">最久未 UP</option>
        <option value="recent">最近 UP</option>
        <option value="0">首次 UP 顺序</option>
        <option value="1">UP 次数从少到多</option>
        <option value="2">UP 次数从多到少</option>
      </select>
    </div>
    <div class="rerun-meta">
      <span aria-live="polite">{{ sortedRows.length }} 项 · 点击名称查看完整记录</span>
      <label><input v-model="includeMix" type="checkbox" /> 含集录祈愿</label>
      <div class="rerun-tabs rerun-view" aria-label="展示方式">
        <button :aria-pressed="view === 'list'" @click="view = 'list'">复刻列表</button>
        <button :aria-pressed="view === 'timeline'" @click="view = 'timeline'">版本时间轴</button>
      </div>
    </div>
    <div v-if="sortedRows.length === 0" class="rerun-empty">
      <strong>没有找到匹配的角色或武器</strong><span>试试名称中的几个字，或切换分类</span>
      <button @click="search = ''">清除搜索</button>
    </div>
    <div v-else class="rerun-body" :class="{ 'has-detail': selectedRow }">
      <div class="rerun-scroll">
        <table v-if="view === 'list'" class="rerun-list">
          <thead>
            <tr>
              <th scope="col">角色 / 武器</th>
              <th scope="col">最近 UP</th>
              <th scope="col">距今</th>
              <th scope="col">UP 次数</th>
              <th scope="col">最近三次版本</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in sortedRows"
              :key="row.id"
              :class="{ selected: selectedId === row.id }"
            >
              <th scope="row">
                <button
                  class="rerun-name"
                  :aria-expanded="selectedId === row.id"
                  @click="selectedId = selectedId === row.id ? null : row.id"
                >
                  <TItemBox :modelValue="row.boxData" /><span
                    ><strong>{{ row.name }}</strong
                    ><small
                      >查看历次记录 <i class="mdi mdi-chevron-right" aria-hidden="true"></i></small
                  ></span>
                </button>
              </th>
              <td>
                <template v-if="row.lastPool"
                  ><strong
                    >{{ row.lastPool.version }}
                    <small>{{ periodLabel(row.lastPool) }}</small></strong
                  ><small
                    >{{ dateLabel(row.lastPool.from) }} — {{ dateLabel(row.lastPool.to) }}</small
                  ></template
                ><span v-else>尚未开始</span>
              </td>
              <td>
                <span
                  :class="{
                    'rerun-current':
                      row.lastPool && new Date(row.lastPool.to).getTime() >= Date.now(),
                  }"
                  >{{ waitingLabel(row) }}</span
                >
              </td>
              <td>
                <strong>{{ row.upCount }}</strong
                ><small>期</small>
              </td>
              <td>
                <div class="rerun-recent">
                  <span
                    v-for="pool in row.pools
                      .filter((item) => new Date(item.from).getTime() <= Date.now())
                      .slice(-3)
                      .reverse()"
                    :key="pool.from + pool.type"
                    :title="dateLabel(pool.from) + ' · ' + periodLabel(pool)"
                    >{{ pool.version }}</span
                  >
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <table v-else class="rerun-timeline">
          <thead>
            <tr>
              <th class="rerun-fixed">最近版本 ←</th>
              <th v-for="vg in displayVersionGroups" :key="vg.version">
                <strong>{{ vg.version }}</strong
                ><small>{{ vg.timeRange.split("~")[0] }}</small>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in sortedRows"
              :key="row.id"
              :class="{ selected: selectedId === row.id }"
            >
              <th scope="row" class="rerun-fixed">
                <button
                  class="rerun-name"
                  :aria-expanded="selectedId === row.id"
                  @click="selectedId = selectedId === row.id ? null : row.id"
                >
                  <TItemBox :modelValue="row.boxData" /><span>{{ row.name }}</span>
                </button>
              </th>
              <td v-for="vg in displayVersionGroups" :key="vg.version">
                <GroRerunCell :itemId="row.id" :versionGroup="vg" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <aside v-if="selectedRow" class="rerun-detail" aria-label="历次 UP 记录">
        <div class="rerun-detail-heading">
          <TItemBox :modelValue="selectedRow.boxData" />
          <div>
            <h3>{{ selectedRow.name }}</h3>
            <small>{{ selectedRow.upCount }} 期 UP · 由近到远</small>
          </div>
          <button aria-label="关闭记录" @click="selectedId = null">
            <i class="mdi mdi-close" aria-hidden="true"></i>
          </button>
        </div>
        <ol class="rerun-history">
          <li v-for="(pool, index) in history" :key="pool.from + pool.type">
            <div>
              <strong>{{ pool.version }} · {{ periodLabel(pool) }}</strong
              ><span>{{ gapLabel(index) }}</span>
            </div>
            <p>{{ dateLabel(pool.from) }} — {{ dateLabel(pool.to) }}</p>
            <small
              >{{ pool.name
              }}{{ new Date(pool.from).getTime() > Date.now() ? " · 尚未开始" : "" }}</small
            >
          </li>
        </ol>
      </aside>
    </div>
    <footer>同时间、同类型的双卡池合并为一期；间隔从上期结束计算，记录不代表未来复刻安排。</footer>
  </section>
</template>
<script lang="ts" setup>
import TItemBox, { type TItemBoxData } from "@comp/app/t-itemBox.vue";
import gameEnum from "@enum/game.js";
import { getWikiBrief } from "@utils/toolFunc.js";
import { computed, onMounted, ref, watch } from "vue";

import GroRerunCell from "./gro-rerun-cell.vue";

import { AppGachaData } from "@/data/index.js";

/** 分类选项 */
const Category = <const>{
  FiveChar: "5char",
  FourChar: "4char",
  FiveWeapon: "5weapon",
  FourWeapon: "4weapon",
};

type CategoryType = (typeof Category)[keyof typeof Category];

type CategoryTab = { value: CategoryType; label: string };

const categoryTabs: Array<CategoryTab> = [
  { value: Category.FiveChar, label: "五星角色" },
  { value: Category.FourChar, label: "四星角色" },
  { value: Category.FiveWeapon, label: "五星武器" },
  { value: Category.FourWeapon, label: "四星武器" },
];

/** 版本分组 */
type VersionGroup = {
  version: string;
  /** 版本时间范围 yyyy-mm-dd~yyyy-mm-dd */
  timeRange: string;
  /** 该版本所有卡池 */
  allPools: Array<TGApp.App.Gacha.PoolItem>;
  /** 上半卡池列表（order=1） */
  firstPools: Array<TGApp.App.Gacha.PoolItem>;
  /** 下半卡池列表（order=2） */
  secondPools: Array<TGApp.App.Gacha.PoolItem>;
};

/** 单个行信息 */
type RerunRow = {
  id: number;
  name: string;
  star: number;
  isCharacter: boolean;
  boxData: TItemBoxData;
  pools: Array<TGApp.App.Gacha.PoolItem>;
  upCount: number;
  lastPool: TGApp.App.Gacha.PoolItem | null;
};

const category = ref<CategoryType>(Category.FiveChar);
const sortOrder = ref<string>("waiting");
const search = ref<string>("");
const view = ref<"list" | "timeline">("list");
const selectedId = ref<number | null>(null);
const includeMix = ref<boolean>(true);
const allVersionGroups = ref<Array<VersionGroup>>([]);
const allRows = ref<Array<RerunRow>>([]);

onMounted(() => buildData());

/** 构建数据 */
function buildData(): void {
  const allUpPools = AppGachaData.filter(
    (pool) => includeMix.value || pool.type !== Number(gameEnum.gachaType.MixUp),
  ).filter(
    (p) =>
      p.type === Number(gameEnum.gachaType.AvatarUp) ||
      p.type === Number(gameEnum.gachaType.AvatarUp2) ||
      p.type === Number(gameEnum.gachaType.WeaponUp) ||
      p.type === Number(gameEnum.gachaType.MixUp),
  );

  const sortedPools = [...allUpPools].sort((a, b) => {
    return new Date(a.from).getTime() - new Date(b.from).getTime() || a.order - b.order;
  });

  const verMap = new Map<string, Array<TGApp.App.Gacha.PoolItem>>();
  for (const pool of sortedPools) {
    const existing = verMap.get(pool.version);
    if (existing) existing.push(pool);
    else verMap.set(pool.version, [pool]);
  }

  /** 格式化 yyyy-mm-dd */
  function fmt(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
  }

  allVersionGroups.value = Array.from(verMap.entries())
    .sort((a, b) => compareVersion(a[0], b[0]))
    .map(([version, pools]) => {
      const firstPools = pools.filter((p) => p.order === 1);
      const secondPools = pools.filter((p) => p.order === 2);

      let earliest = pools[0].from;
      let latest = pools[0].to;
      for (const p of pools) {
        if (new Date(p.from).getTime() < new Date(earliest).getTime()) earliest = p.from;
        if (new Date(p.to).getTime() > new Date(latest).getTime()) latest = p.to;
      }

      return {
        version,
        timeRange: `${fmt(new Date(earliest))}~${fmt(new Date(latest))}`,
        allPools: pools,
        firstPools,
        secondPools,
      };
    });

  const itemMap = new Map<number, RerunRow>();
  for (const pool of sortedPools) {
    for (const id of pool.up5List) addOrUpdateItem(itemMap, id, pool, 5);
    for (const id of pool.up4List) addOrUpdateItem(itemMap, id, pool, 4);
  }
  allRows.value = Array.from(itemMap.values());
}

function addOrUpdateItem(
  map: Map<number, RerunRow>,
  id: number,
  pool: TGApp.App.Gacha.PoolItem,
  star: number,
): void {
  if (!map.has(id)) {
    const brief = getWikiBrief(id);
    if (!brief) return;
    const isChar = "element" in brief;
    const name = isChar
      ? (<TGApp.App.Character.WikiBriefInfo>brief).name
      : (<TGApp.App.Weapon.WikiBriefInfo>brief).name;
    const boxData: TItemBoxData = isChar
      ? {
          bg: `/icon/bg/${brief.star}-Star.webp`,
          icon: `/WIKI/character/${brief.id}.webp`,
          size: "48px",
          height: "48px",
          display: "inner",
          clickable: false,
          lt: `/icon/element/${(<TGApp.App.Character.WikiBriefInfo>brief).element}元素.webp`,
          ltSize: "18px",
          innerHeight: 0,
          innerText: "",
        }
      : {
          bg: `/icon/bg/${brief.star}-Star.webp`,
          icon: `/WIKI/weapon/${brief.id}.webp`,
          size: "48px",
          height: "48px",
          display: "inner",
          clickable: false,
          lt: `/icon/weapon/${(<TGApp.App.Weapon.WikiBriefInfo>brief).weapon}.webp`,
          ltSize: "18px",
          innerHeight: 0,
          innerText: "",
        };
    map.set(id, {
      id,
      name,
      star,
      isCharacter: isChar,
      boxData,
      pools: [],
      upCount: 0,
      lastPool: null,
    });
  }
  const row = map.get(id)!;
  if (
    row.pools.some(
      (item) =>
        item.from === pool.from &&
        item.to === pool.to &&
        (item.type === Number(gameEnum.gachaType.MixUp)) ===
          (pool.type === Number(gameEnum.gachaType.MixUp)),
    )
  )
    return;
  row.pools.push(pool);
  if (new Date(pool.from).getTime() <= Date.now()) {
    row.upCount++;
    row.lastPool = pool;
  }
}

function compareVersion(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const va = i < pa.length ? pa[i] : 0;
    const vb = i < pb.length ? pb[i] : 0;
    if (va !== vb) return va - vb;
  }
  return 0;
}

/** 显示的版本分组（过滤空版本） */
const displayVersionGroups = computed<Array<VersionGroup>>(() => {
  const rows = filteredRows.value;
  const rowIds = new Set(rows.map((r) => r.id));
  return [...allVersionGroups.value]
    .reverse()
    .filter((vg) =>
      vg.allPools.some(
        (p) => p.up5List.some((id) => rowIds.has(id)) || p.up4List.some((id) => rowIds.has(id)),
      ),
    );
});

/** 按分类过滤后的行 */
const filteredRows = computed<Array<RerunRow>>(() => {
  return allRows.value.filter((r) => {
    switch (category.value) {
      case Category.FiveChar:
        return r.star === 5 && r.isCharacter;
      case Category.FourChar:
        return r.star === 4 && r.isCharacter;
      case Category.FiveWeapon:
        return r.star === 5 && !r.isCharacter;
      case Category.FourWeapon:
        return r.star === 4 && !r.isCharacter;
      default:
        return true;
    }
  });
});

/** 排序后的行 */
const sortedRows = computed<Array<RerunRow>>(() => {
  const query = search.value.trim().toLocaleLowerCase();
  const rows = filteredRows.value.filter(
    (row) => row.name.toLocaleLowerCase().includes(query) || String(row.id).includes(query),
  );
  switch (sortOrder.value) {
    case "waiting":
      return rows.sort((a, b) => lastTime(a) - lastTime(b) || a.id - b.id);
    case "recent":
      return rows.sort((a, b) => lastTime(b) - lastTime(a) || a.id - b.id);
    case "1":
      return rows.sort((a, b) => a.upCount - b.upCount || a.id - b.id);
    case "2":
      return rows.sort((a, b) => b.upCount - a.upCount || a.id - b.id);
    default:
      return rows.sort((a, b) => {
        const ta = a.pools.length > 0 ? new Date(a.pools[0].from).getTime() : Infinity;
        const tb = b.pools.length > 0 ? new Date(b.pools[0].from).getTime() : Infinity;
        return ta - tb || a.id - b.id;
      });
  }
});

watch(includeMix, buildData);
watch([category, search, includeMix], () => {
  selectedId.value = null;
});

const selectedRow = computed<RerunRow | undefined>(() =>
  sortedRows.value.find((row) => row.id === selectedId.value),
);
const history = computed<Array<TGApp.App.Gacha.PoolItem>>(() =>
  [...(selectedRow.value?.pools ?? [])].reverse(),
);
const dataThrough = AppGachaData.reduce(
  (latest, pool) => (pool.to > latest ? pool.to : latest),
  "",
).slice(0, 10);

function lastTime(row: RerunRow): number {
  return row.lastPool ? new Date(row.lastPool.from).getTime() : Infinity;
}

function dateLabel(value: string): string {
  return value.slice(0, 10);
}

function periodLabel(pool: TGApp.App.Gacha.PoolItem): string {
  if (pool.type === Number(gameEnum.gachaType.MixUp)) return "集录祈愿";
  return `第 ${pool.order} 期`;
}

function waitingLabel(row: RerunRow): string {
  if (!row.lastPool) return "尚未开始";
  if (new Date(row.lastPool.to).getTime() >= Date.now()) return "UP 进行中";
  return `距结束 ${Math.floor((Date.now() - new Date(row.lastPool.to).getTime()) / 86400000)} 天`;
}

function gapLabel(index: number): string {
  const pool = history.value[index];
  const previous = history.value[index + 1];
  if (!previous) return "首次收录";
  const days = Math.max(
    0,
    Math.floor((new Date(pool.from).getTime() - new Date(previous.to).getTime()) / 86400000),
  );
  return `间隔 ${days} 天`;
}
</script>

<style lang="scss" scoped>
.rerun {
  display: flex;
  overflow: hidden;
  height: 100%;
  min-height: 0;
  flex-direction: column;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--app-page-bg);
  color: var(--app-page-content);
  font-size: 14px;
  line-height: 20px;

  button,
  input,
  select {
    font: inherit;
  }

  button,
  select {
    cursor: pointer;
  }

  button:focus-visible,
  input:focus-visible,
  select:focus-visible {
    outline: 2px solid var(--common-text-title);
    outline-offset: -2px;
  }

  small {
    display: block;
    font-size: 12px;
    font-weight: normal;
  }

  button {
    color: inherit;
  }

  footer {
    padding: 8px 16px;
    border-top: 1px solid var(--common-shadow-1);
    color: var(--box-text-4);
    font-size: 12px;
  }
}

.rerun-heading {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  gap: 8px;

  h2 {
    color: var(--common-text-title);
    font-family: var(--font-title);
    font-size: 20px;
    font-weight: normal;
    line-height: 28px;
  }

  p {
    margin: 0;
    color: var(--box-text-4);
    font-size: 12px;
  }
}

.rerun-source {
  color: var(--box-text-4);
  font-size: 12px;
}

.rerun-toolbar {
  display: flex;
  flex-wrap: wrap;
  padding: 0 16px 12px;
  gap: 8px;

  select {
    min-height: 36px;
    padding: 4px 8px;
    border: 1px solid var(--common-shadow-2);
    border-radius: 4px;
    background: var(--box-bg-1);
    color: var(--box-text-1);
  }
}

.rerun-tabs {
  display: flex;
  flex-wrap: wrap;
  padding: 4px;
  border-radius: 4px;
  background: var(--box-bg-3);
  gap: 4px;

  button {
    padding: 4px 12px;
    border-radius: 4px;
    white-space: nowrap;
  }

  button:hover {
    background: var(--box-bg-4);
  }

  button[aria-pressed="true"] {
    background: var(--app-page-bg);
    box-shadow: 0 1px 3px var(--common-shadow-1);
    color: var(--common-text-title);
  }
}

.rerun-search {
  display: flex;
  min-width: 200px;
  flex: 1;
  align-items: center;
  padding: 4px 8px;
  border: 1px solid var(--common-shadow-2);
  border-radius: 4px;
  gap: 8px;

  input {
    width: 100%;
    min-width: 0;
    color: inherit;
  }
}

.rerun-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  padding: 0 16px 8px;
  font-size: 12px;
  gap: 12px;

  label {
    display: flex;
    align-items: center;
    cursor: pointer;
    gap: 4px;
  }
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
}

.rerun-list,
.rerun-timeline {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;

  th,
  td {
    padding: 8px 12px;
    border-bottom: 1px solid var(--common-shadow-1);
    text-align: left;
    white-space: nowrap;
  }

  thead th {
    position: sticky;
    z-index: 2;
    top: 0;
    background: var(--box-bg-3);
    font-size: 12px;
    font-weight: normal;
  }

  tbody tr:hover,
  tbody tr.selected {
    background: var(--box-bg-1);
  }

  td > strong {
    display: block;
    font-weight: 600;
  }

  td > strong > small {
    display: inline;
    margin-left: 4px;
  }

  td > small {
    color: var(--box-text-4);
  }
}

.rerun-name {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 12px;
  text-align: left;

  > span {
    display: grid;
    gap: 4px;
  }

  strong {
    font-size: 14px;
    font-weight: 600;
  }

  small {
    color: var(--box-text-4);
  }
}

.rerun-current {
  color: var(--common-text-title);
  font-weight: 600;
}

.rerun-recent {
  display: flex;
  gap: 4px;

  span {
    min-width: 40px;
    padding: 4px 8px;
    border-radius: 4px;
    background: var(--box-bg-3);
    text-align: center;
  }
}

.rerun-timeline {
  td {
    min-width: 152px;
  }

  .rerun-fixed {
    position: sticky;
    z-index: 1;
    left: 0;
    min-width: 188px;
    background: var(--box-bg-1);
  }

  thead .rerun-fixed {
    z-index: 3;
    background: var(--box-bg-3);
  }
}

.rerun-detail {
  overflow: auto;
  width: 320px;
  flex-shrink: 0;
  border-left: 1px solid var(--common-shadow-1);
  background: var(--box-bg-1);
}

.rerun-detail-heading {
  position: sticky;
  z-index: 2;
  top: 0;
  display: flex;
  align-items: center;
  padding: 12px;
  background: var(--box-bg-1);
  gap: 12px;

  h3 {
    color: var(--common-text-title);
    font-size: 16px;
  }

  button {
    width: 32px;
    height: 32px;
    border-radius: 4px;
    margin-left: auto;
  }

  button:hover {
    background: var(--box-bg-4);
  }
}

.rerun-history {
  padding: 0 16px 16px 28px;
  list-style: none;

  li {
    position: relative;
    padding: 12px 0 12px 16px;
    border-left: 2px solid var(--common-shadow-2);
  }

  li::before {
    position: absolute;
    top: 20px;
    left: -5px;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--common-text-title);
    content: "";
  }

  li > div {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 4px;
  }

  span,
  small {
    color: var(--box-text-4);
    font-size: 12px;
  }

  p {
    margin: 4px 0;
    font-size: 12px;
  }
}

.rerun-empty {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
  gap: 8px;
}

@media (width <= 900px) {
  .rerun-detail {
    width: 280px;
  }

  .has-detail .rerun-list th:last-child,
  .has-detail .rerun-list td:last-child {
    display: none;
  }
}

@media (width <= 600px) {
  .rerun-source,
  .rerun-heading p {
    display: none;
  }

  .rerun-heading {
    padding: 8px 12px;
  }

  .rerun-toolbar {
    padding: 0 12px 8px;
  }

  .rerun-tabs button {
    padding: 4px 8px;
  }

  .rerun-meta {
    padding: 0 12px 8px;
    gap: 8px;
  }

  .rerun-body {
    position: relative;
  }

  .rerun-detail {
    position: absolute;
    z-index: 4;
    width: 100%;
    border: 0;
    inset: 0;
  }
}
</style>
