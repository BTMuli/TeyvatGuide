<template>
  <!-- todo fix typo err -->
  <v-data-table :headers="headers" fixed-header :items="holdData" height="calc(100vh - 160px)">
    <template v-slot:item="{ item }">
      <tr class="hta-th-tr">
        <td class="hta-th-icon">
          <TItemBox :model-value="getBoxData(item.AvatarId)" />
        </td>
        <td>
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
        </td>
        <td v-for="rate in item.Constellations" :key="rate.Item">
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
        </td>
      </tr>
    </template>
  </v-data-table>
</template>
<script lang="ts" setup>
import TItemBox, { type TItemBoxData } from "@comp/app/t-itemBox.vue";
import { onMounted, shallowRef } from "vue";

import { AppCharacterData } from "@/data/index.js";
import type { AbyssDataItem } from "@/pages/WIKI/Abyss.vue";

type HtaTabHoldProps = { data: AbyssDataItem<Array<TGApp.Plugins.Hutao.Abyss.AvatarHold>> };
type HtaTabHoldConstellation = { Item: number; RateCur: number; RateLast: number };
type HtaTabHoldData = {
  AvatarId: number;
  HoldingRate: AbyssDataItem<number>;
  Constellations: Array<HtaTabHoldConstellation>;
};

const props = defineProps<HtaTabHoldProps>();
const holdData = shallowRef<Array<HtaTabHoldData>>([]);

const headers = [
  { title: "角色", align: "center", key: "AvatarId" },
  { title: "持有", align: "center", key: "HoldingRate.cur" },
  { title: "0命", align: "center", key: "Constellations[0].RateCur" },
  { title: "1命", align: "center", key: "Constellations[1].RateCur" },
  { title: "2命", align: "center", key: "Constellations[2].RateCur" },
  { title: "3命", align: "center", key: "Constellations[3].RateCur" },
  { title: "4命", align: "center", key: "Constellations[4].RateCur" },
  { title: "5命", align: "center", key: "Constellations[5].RateCur" },
  { title: "6命", align: "center", key: "Constellations[6].RateCur" },
];

onMounted(() => {
  const tmpData: Array<HtaTabHoldData> = [];
  for (const avatar of props.data.cur) {
    const avatarLast = props.data.last.find((a) => a.AvatarId === avatar.AvatarId);
    if (!avatarLast) continue;
    const Rate: AbyssDataItem<number> = {
      cur: avatar.HoldingRate,
      last: avatarLast?.HoldingRate ?? 0,
    };
    const Constellations: Array<HtaTabHoldConstellation> = [];
    for (const constellation of avatar.Constellations) {
      const constellationLast = avatarLast?.Constellations.find(
        (c) => c.Item === constellation.Item,
      );
      if (!constellationLast) continue;
      Constellations.push({
        Item: constellation.Item,
        RateCur: constellation.Rate,
        RateLast: constellationLast.Rate,
      });
    }
    tmpData.push({ AvatarId: avatar.AvatarId, HoldingRate: Rate, Constellations: Constellations });
  }
  holdData.value = tmpData;
});

function getRateStr(cur: number, last: number): string {
  const diff = Math.abs(cur - last) * 100;
  return `(${cur > last ? "↑" : "↓"}${diff.toFixed(3)}%)`;
}

function getBoxData(id: number): TItemBoxData {
  const avatar = AppCharacterData.find((a) => a.id === id);
  return {
    bg: `/icon/bg/${avatar?.star ?? 5}-Star.webp`,
    clickable: false,
    display: "inner",
    height: "80px",
    icon: `/WIKI/character/${id}.webp`,
    innerHeight: 20,
    innerText: avatar?.name ?? "旅行者",
    lt:
      avatar === undefined
        ? ""
        : avatar.element !== ""
          ? `/icon/element/${avatar.element}元素.webp`
          : `/icon/weapon/${avatar.weapon}.webp`,
    ltSize: "20px",
    size: "80px",
    innerIcon: `/icon/weapon/${avatar?.weapon ?? "单手剑"}.webp`,
    innerBlur: "5px",
  };
}
</script>
<style lang="css" scoped>
.hta-th-tr {
  height: 100px;
  text-align: center;
}

.hta-th-icon {
  width: 100px;
}

.rate-up {
  color: var(--tgc-od-red);
}

.rate-down {
  color: var(--tgc-od-green);
}
</style>
