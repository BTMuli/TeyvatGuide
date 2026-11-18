<!-- 角色持有率表格 -->
<template>
  <v-data-table
    :headers
    :items="holdData"
    class="hta-th-table"
    density="compact"
    fixed-header
    height="100%"
    item-value="AvatarId"
    items-per-page-text="每页"
    page-text="{0}–{1} / {2}"
  >
    <template v-slot:item="{ item }">
      <tr class="hta-th-tr">
        <td class="hta-th-icon">
          <TItemBox :model-value="getBoxData(item.AvatarId)" />
        </td>
        <td>
          <div class="hta-th-rate">
            <span>{{ (item.HoldingRate.cur * 100).toFixed(3) }}%</span>
            <span
              v-if="item.HoldingRate.cur !== item.HoldingRate.last"
              :class="{
                'rate-up': item.HoldingRate.cur > item.HoldingRate.last,
                'rate-down': item.HoldingRate.cur < item.HoldingRate.last,
              }"
            >
              {{ getRateStr(item.HoldingRate.cur, item.HoldingRate.last) }}
            </span>
          </div>
        </td>
        <td v-for="rate in item.Constellations" :key="rate.Item">
          <div class="hta-th-rate">
            <span>{{ (rate.RateCur * 100).toFixed(3) }}%</span>
            <span
              v-if="rate.RateCur !== rate.RateLast"
              :class="{
                'rate-up': rate.RateCur > rate.RateLast,
                'rate-down': rate.RateCur < rate.RateLast,
              }"
              :title="`${(rate.RateLast * 100).toFixed(3)}%`"
            >
              {{ getRateStr(rate.RateCur, rate.RateLast) }}
            </span>
          </div>
        </td>
      </tr>
    </template>
  </v-data-table>
</template>
<script lang="ts" setup>
import TItemBox, { type TItemBoxData } from "@comp/app/t-itemBox.vue";
import { computed, shallowRef } from "vue";
import type { DataTableHeader } from "vuetify/lib/components/VDataTable/types.js";

import { AppCharacterData } from "@/data/index.js";

type HtaTabHoldProps = {
  data: TGApp.Plugins.Hutao.Abyss.PeriodData<Array<TGApp.Plugins.Hutao.Abyss.AvatarHold>>;
};
type HtaTabHoldConstellation = { Item: number; RateCur: number; RateLast: number };
type HtaTabHoldData = {
  AvatarId: number;
  HoldingRate: TGApp.Plugins.Hutao.Abyss.PeriodData<number>;
  Constellations: Array<HtaTabHoldConstellation>;
};

const props = defineProps<HtaTabHoldProps>();
const headers = shallowRef<Array<DataTableHeader>>([
  { title: "角色", align: "center", key: "role", sortable: true, value: (v) => v.AvatarId },
  {
    title: "持有",
    align: "center",
    key: "hold",
    sortable: true,
    value: (v) => v.HoldingRate.cur,
  },
  {
    title: "0命",
    align: "center",
    key: "const0",
    sortable: true,
    value: (v) => v.Constellations[0].RateCur,
  },
  {
    title: "1命",
    align: "center",
    key: "const1",
    sortable: true,
    value: (v) => v.Constellations[1].RateCur,
  },
  {
    title: "2命",
    align: "center",
    key: "const2",
    sortable: true,
    value: (v) => v.Constellations[2].RateCur,
  },
  {
    title: "3命",
    align: "center",
    key: "const3",
    sortable: true,
    value: (v) => v.Constellations[3].RateCur,
  },
  {
    title: "4命",
    align: "center",
    key: "const4",
    sortable: true,
    value: (v) => v.Constellations[4].RateCur,
  },
  {
    title: "5命",
    align: "center",
    key: "const5",
    sortable: true,
    value: (v) => v.Constellations[5].RateCur,
  },
  {
    title: "6命",
    align: "center",
    key: "const6",
    sortable: true,
    value: (v) => v.Constellations[6].RateCur,
  },
]);
const holdData = computed<Array<HtaTabHoldData>>(() => {
  const avatarIds = new Set<number>([
    ...props.data.cur.map((item) => item.AvatarId),
    ...props.data.last.map((item) => item.AvatarId),
  ]);
  return [...avatarIds]
    .map((avatarId) => {
      const current = props.data.cur.find((item) => item.AvatarId === avatarId);
      const previous = props.data.last.find((item) => item.AvatarId === avatarId);
      const Constellations: Array<HtaTabHoldConstellation> = Array.from(
        { length: 7 },
        (_, item) => ({
          Item: item,
          RateCur: current?.Constellations.find((rate) => rate.Item === item)?.Rate ?? 0,
          RateLast: previous?.Constellations.find((rate) => rate.Item === item)?.Rate ?? 0,
        }),
      );
      return {
        AvatarId: avatarId,
        HoldingRate: {
          cur: current?.HoldingRate ?? 0,
          last: previous?.HoldingRate ?? 0,
        },
        Constellations,
      };
    })
    .sort((a, b) => b.HoldingRate.cur - a.HoldingRate.cur);
});

function getRateStr(cur: number, last: number): string {
  const diff = Math.abs(cur - last) * 100;
  return `${cur > last ? "↑" : "↓"}${diff.toFixed(3)}%`;
}

function getBoxData(id: number): TItemBoxData {
  if ([10000005, 10000007].includes(id)) {
    return {
      bg: `/icon/bg/5-Star.webp`,
      clickable: false,
      display: "inner",
      height: "64px",
      icon: `/WIKI/character/${id}.webp`,
      innerHeight: 20,
      innerText: id === 10000005 ? "空" : "荧",
      lt: `/icon/weapon/单手剑.webp`,
      ltSize: "16px",
      size: "64px",
      innerBlur: "5px",
    };
  }
  const avatar = AppCharacterData.find((a) => a.id === id);
  return {
    bg: `/icon/bg/${avatar?.star ?? 5}-Star.webp`,
    clickable: false,
    display: "inner",
    height: "64px",
    icon: `/WIKI/character/${id}.webp`,
    innerHeight: 20,
    innerText: avatar?.name ?? "旅行者",
    lt:
      avatar === undefined
        ? ""
        : avatar.element !== ""
          ? `/icon/element/${avatar.element}元素.webp`
          : `/icon/weapon/${avatar.weapon}.webp`,
    ltSize: "16px",
    size: "64px",
    innerIcon:
      avatar?.element === "" ? undefined : `/icon/weapon/${avatar?.weapon ?? "单手剑"}.webp`,
    innerBlur: "5px",
  };
}
</script>
<style lang="scss" scoped>
.hta-th-table {
  --hta-rate-up: var(--tgc-od-red);
  --hta-rate-down: var(--tgc-od-green);

  overflow: hidden;
  width: 100%;
  height: 100%;
  min-height: 0;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: color-mix(in srgb, var(--box-bg-1) 40%, var(--box-bg-3));
  color: var(--box-text-1);

  :deep(.v-table__wrapper > table > thead > tr > th) {
    background: var(--dialog-header-bg);
    color: var(--common-text-title);
    font-weight: 600;
    white-space: nowrap;
  }

  :deep(.v-data-table-footer) {
    flex-shrink: 0;
    padding: 4px 12px;
    border-top: 1px solid var(--common-shadow-1);
    background: var(--dialog-header-bg);
    color: var(--box-text-4);
  }
}

html.default .hta-th-table {
  --hta-rate-up: #a4262cff;
  --hta-rate-down: #386626ff;
}

.hta-th-tr {
  height: 80px;
  text-align: center;

  &:nth-child(even) {
    background: color-mix(in srgb, var(--box-bg-1) 20%, var(--box-bg-3));
  }

  > td {
    padding-inline: 8px;
  }
}

.hta-th-icon {
  position: relative;
  z-index: 0;
  width: 88px;

  > * {
    margin-inline: auto;
  }
}

.hta-th-rate {
  display: flex;
  min-height: 36px;
  flex-direction: column;
  align-items: center;
  font-size: 14px;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  gap: 2px;
  line-height: 20px;
  white-space: nowrap;
}

.rate-up,
.rate-down {
  font-size: 11px;
  font-weight: normal;
  line-height: 14px;
}

.rate-up {
  color: var(--hta-rate-up);
}

.rate-down {
  color: var(--hta-rate-down);
}
</style>
