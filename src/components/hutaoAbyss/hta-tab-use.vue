<template>
  <div class="hta-tus-box">
    <v-tabs v-model="tab" direction="vertical" class="hta-tus-tab">
      <v-tab :value="11">第11层</v-tab>
      <v-tab :value="12">第12层</v-tab>
    </v-tabs>
    <v-window v-model="tab" class="hta-tus-window">
      <v-window-item v-for="selectItem in select" :key="selectItem.Floor" :value="selectItem.Floor">
        <div class="hta-tus-grid">
          <TibWikiAbyss
            v-for="(item, index) in selectItem.Ranks"
            :key="index"
            :model-value="item"
          />
        </div>
      </v-window-item>
    </v-window>
  </div>
</template>
<script lang="ts" setup>
import { onMounted, ref, shallowRef } from "vue";

import TibWikiAbyss from "./tib-wiki-abyss.vue";

import type { AbyssDataItem } from "@/pages/WIKI/Abyss.vue";

type HtaTabUseProps = { data: AbyssDataItem<Array<TGApp.Plugins.Hutao.Abyss.AvatarUse>> };
type HtaTabUseData = { Floor: number; Ranks: Array<AbyssDataItem<{ Item: number; Rate: number }>> };

const props = defineProps<HtaTabUseProps>();
const tab = ref<number>(11);
const select = shallowRef<Array<HtaTabUseData>>([]);

onMounted(async () => {
  const tempData: Array<HtaTabUseData> = [];
  for (const floor of props.data.cur) {
    const floorLast = props.data.last.find((f) => f.Floor === floor.Floor);
    const floorRank: HtaTabUseData = { Floor: floor.Floor, Ranks: [] };
    floor.Ranks.sort((a, b) => b.Rate - a.Rate);
    for (const rank of floor.Ranks) {
      const rankLast = floorLast?.Ranks.find((r) => r.Item === rank.Item);
      floorRank.Ranks.push({ cur: rank, last: rankLast ?? { Item: rank.Item, Rate: 0 } });
    }
    tempData.push(floorRank);
  }
  select.value = tempData;
});
</script>
<style lang="css" scoped>
.hta-tus-box {
  display: flex;
  height: 100%;
  column-gap: 10px;
}

.hta-tus-tab {
  height: 100%;
  color: var(--box-text-4);
}

.hta-tus-window {
  width: 100%;
  height: 100%;
}

.hta-tus-grid {
  display: grid;
  overflow: auto;
  width: 100%;
  max-height: calc(100vh - 100px);
  align-items: center;
  justify-content: center;
  padding: 10px;
  grid-gap: 10px;
  grid-template-columns: repeat(auto-fill, minmax(180px, 0.2fr));
}
</style>
