<!-- UP角色复刻周期统计 -->
<template>
  <div class="gro-rerun-container">
    <!-- 顶部筛选区 -->
    <div class="gro-rerun-header">
      <div class="gro-rerun-tabs">
        <button
          v-for="tab in categoryTabs"
          :key="tab.value"
          :class="['gro-rerun-tab', { active: category === tab.value }]"
          @click="category = tab.value"
        >
          {{ tab.label }}
        </button>
      </div>
      <div class="gro-rerun-sort">
        <select v-model="sortOrder" class="gro-rerun-sort-select">
          <option value="0">首次UP排序</option>
          <option value="1">UP次数升序</option>
          <option value="2">UP次数降序</option>
        </select>
      </div>
    </div>

    <!-- 表格区域 -->
    <div class="gro-rerun-table-wrap">
      <table class="gro-rerun-table">
        <thead>
          <tr>
            <th class="gro-rerun-th-fixed"></th>
            <th v-for="vg in displayVersionGroups" :key="vg.version" class="gro-rerun-th-ver">
              <span class="gro-rerun-ver-name">{{ vg.version }}</span>
              <span class="gro-rerun-ver-time">{{ vg.timeRange }}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, ri) in sortedRows"
            :key="row.id"
            :class="['gro-rerun-row', { odd: ri % 2 === 0 }]"
          >
            <td class="gro-rerun-td-name">
              <TItemBox :model-value="row.boxData" :title="row.name" />
            </td>
            <td
              v-for="vg in displayVersionGroups"
              :key="`${vg.version}-${row.id}`"
              class="gro-rerun-td-cell"
            >
              <GroRerunCell :item-id="row.id" :version-group="vg" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script lang="ts" setup>
import TItemBox, { type TItemBoxData } from "@comp/app/t-itemBox.vue";
import GroRerunCell from "./gro-rerun-cell.vue";
import { AppGachaData } from "@/data/index.js";
import { getWikiBrief } from "@utils/toolFunc.js";
import gameEnum from "@enum/game.js";
import { computed, onMounted, ref } from "vue";

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
const sortOrder = ref<string>("0");
const allVersionGroups = ref<Array<VersionGroup>>([]);
const allRows = ref<Array<RerunRow>>([]);

onMounted(() => buildData());

/** 构建数据 */
function buildData(): void {
  const allUpPools = AppGachaData.filter(
    (p) =>
      p.type === Number(gameEnum.gachaType.AvatarUp) ||
      p.type === Number(gameEnum.gachaType.AvatarUp2) ||
      p.type === Number(gameEnum.gachaType.WeaponUp) ||
      p.type === Number(gameEnum.gachaType.MixUp),
  );

  const sortedPools = [...allUpPools].sort((a, b) => {
    const verCmp = compareVersion(a.version, b.version);
    if (verCmp !== 0) return verCmp;
    return a.order - b.order;
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
  row.pools.push(pool);
  row.upCount++;
  row.lastPool = pool;
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
  return allVersionGroups.value.filter((vg) =>
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
  const rows = [...filteredRows.value];
  switch (sortOrder.value) {
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
</script>

<style lang="scss" scoped>
.gro-rerun-container {
  display: flex;
  overflow: hidden;
  width: 100%;
  height: 100%;
  flex-direction: column;
}

.gro-rerun-header {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  padding: 3px 8px 2px;
}

.gro-rerun-tabs {
  display: flex;
  gap: 1px;
}

.gro-rerun-tab {
  padding: 2px 10px;
  border: 1px solid transparent;
  border-radius: 4px 4px 0 0;
  background: var(--box-bg-2);
  color: var(--box-text-2);
  cursor: pointer;
  font-size: 11px;

  &.active {
    border-color: var(--common-shadow-1) var(--common-shadow-1) transparent;
    border-bottom-color: var(--box-bg-1);
    background: var(--box-bg-1);
    color: var(--common-text-title);
    font-weight: 600;
  }

  &:hover:not(.active) {
    background: var(--box-bg-1);
  }
}

.gro-rerun-sort-select {
  padding: 1px 6px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
  background: var(--box-bg-1);
  color: var(--box-text-2);
  cursor: pointer;
  font-size: 11px;
  outline: none;

  &:focus {
    border-color: var(--tgc-pink-1);
  }
}

.gro-rerun-table-wrap {
  overflow: auto;
  width: 100%;
  flex: 1;
}

.gro-rerun-table {
  border-collapse: collapse;

  .gro-rerun-row {
    position: relative;

    &.odd {
      background: rgb(128 128 128 / 2%);
    }

    &:hover {
      background: rgb(128 128 128 / 6%) !important;
    }

    &::after {
      position: absolute;
      z-index: 0;
      top: 50%;
      right: 0;
      left: 62px;
      height: 1px;
      background: var(--common-shadow-1);
      content: "";
      opacity: 0.35;
      transform: translateY(-50%);
    }
  }

  th,
  td {
    padding: 1px 2px;
    text-align: center;
    vertical-align: middle;
    white-space: nowrap;
  }
}

/* 固定列 */

.gro-rerun-th-fixed {
  position: sticky;
  z-index: 3;
  left: 0;
  width: 60px;
  min-width: 60px;
  background: var(--box-bg-1);
}

/* 版本号表头 */

.gro-rerun-th-ver {
  position: sticky;
  z-index: 2;
  top: 0;
  min-width: 120px;
  border-bottom: 2px solid var(--common-shadow-1);
  background: var(--box-bg-3);

  .gro-rerun-ver-name {
    display: block;
    color: var(--common-text-title);
    font-family: var(--font-title);
    font-size: 11px;
    font-weight: 600;
  }

  .gro-rerun-ver-time {
    display: block;
    color: var(--box-text-2);
    font-size: 8px;
    opacity: 0.7;
  }
}

/* 名称列 */

.gro-rerun-td-name {
  position: sticky;
  z-index: 1;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--box-bg-1);
}

/* 数据单元格 */

.gro-rerun-td-cell {
  position: relative;
  width: 120px;
  min-width: 120px;
  text-align: center;
  vertical-align: middle;
}
</style>
