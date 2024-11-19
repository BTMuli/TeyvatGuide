<template>
  <div class="hta-tu-box">
    <v-tabs v-model="tab" direction="vertical" class="hta-tu-tab">
      <v-tab value="10">第10层</v-tab>
      <v-tab value="11">第11层</v-tab>
      <v-tab value="12">第12层</v-tab>
    </v-tabs>
    <v-window v-model="tab" class="hta-tu-window">
      <v-window-item
        v-for="selectItem in select"
        :key="selectItem.Floor"
        :value="selectItem.Floor.toString()"
      >
        <div class="hta-tu-grid">
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
import { onMounted, ref } from "vue";

import { AbyssDataItem } from "../../pages/WIKI/Abyss.vue";

import TibWikiAbyss from "./tib-wiki-abyss.vue";

interface HtaTabUpProps {
  data: AbyssDataItem<TGApp.Plugins.Hutao.Abyss.AvatarUse[]>;
}

interface HtaTabUpData {
  Floor: number;
  Ranks: Array<AbyssDataItem<{ Item: number; Rate: number }>>;
}

const props = defineProps<HtaTabUpProps>();

// data
const tab = ref<string>("9");
const select = ref<Array<HtaTabUpData>>([]);

onMounted(async () => {
  for (const floor of props.data.cur) {
    const floorLast = props.data.last.find((f) => f.Floor === floor.Floor);
    const floorRank = {
      Floor: floor.Floor,
      Ranks: <Array<AbyssDataItem<{ Item: number; Rate: number }>>>[],
    };
    floor.Ranks.sort((a, b) => b.Rate - a.Rate);
    for (const rank of floor.Ranks) {
      const rankLast = floorLast?.Ranks.find((r) => r.Item === rank.Item);
      floorRank.Ranks.push({
        cur: rank,
        last: rankLast ?? { Item: rank.Item, Rate: 0 },
      });
    }
    select.value.push(floorRank);
  }
});
</script>
<style lang="css" scoped>
.hta-tu-box {
  display: flex;
  height: 100%;
  column-gap: 10px;
}

.hta-tu-tab {
  height: 100%;
  color: var(--box-text-4);
}

.hta-tu-window {
  width: 100%;
  height: 100%;
}

.hta-tu-grid {
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
