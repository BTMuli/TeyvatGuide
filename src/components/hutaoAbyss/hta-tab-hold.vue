<template>
  <v-data-table :headers="headers" fixed-header :items="holdData" height="calc(100vh - 160px)">
    <template v-slot:item="{ item }">
      <tr class="hta-th-tr">
        <td class="hta-th-icon">
          <TibWikiAbyss2 v-model="item.AvatarId" />
        </td>
        <td>
          <span>{{ (item.HoldingRate.cur * 100).toFixed(3) }}%</span>
          <span
            v-if="item.HoldingRate.cur !== item.HoldingRate.last"
            :class="getRateClass(item.HoldingRate.cur, item.HoldingRate.last)"
          >
            {{ getRateStr(item.HoldingRate.cur, item.HoldingRate.last) }}
          </span>
        </td>
        <td v-for="rate in item.Constellations" :key="rate.Item">
          <span>{{ (rate.RateCur * 100).toFixed(3) }}%</span>
          <span
            v-if="rate.RateCur !== rate.RateLast"
            :class="getRateClass(rate.RateCur, rate.RateLast)"
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
import { onMounted, ref } from "vue";

import { AbyssDataItem } from "../../pages/WIKI/Abyss.vue";
import TibWikiAbyss2 from "../itembox/tib-wiki-abyss-2.vue";

interface HtaTabHoldProps {
  data: AbyssDataItem<TGApp.Plugins.Hutao.Abyss.AvatarHold[]>;
}

interface HtaTabHoldConstellation {
  Item: number;
  RateCur: number;
  RateLast: number;
}

interface HtaTabHoldData {
  AvatarId: number;
  HoldingRate: AbyssDataItem<number>;
  Constellations: Array<HtaTabHoldConstellation>;
}

const props = defineProps<HtaTabHoldProps>();
const holdData = ref<HtaTabHoldData[]>([]);

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
    holdData.value.push({
      AvatarId: avatar.AvatarId,
      HoldingRate: Rate,
      Constellations: Constellations,
    });
  }
});

function getRateClass(cur: number, last: number): string {
  return cur > last ? "rate-up" : "rate-down";
}

function getRateStr(cur: number, last: number): string {
  const diff = Math.abs(cur - last) * 100;
  return `(${cur > last ? "↑" : "↓"}${diff.toFixed(3)}%)`;
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
