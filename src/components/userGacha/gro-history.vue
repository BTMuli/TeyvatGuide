<template>
  <div class="gro-container">
    <v-tabs class="gro-tabs" v-model="historyTab" align-tabs="start" direction="vertical">
      <v-tab v-for="(item, index) in tabList" :key="index" :value="item.tab">
        {{ item.tab }}
      </v-tab>
    </v-tabs>
    <v-window v-model="historyTab" class="gro-window">
      <v-window-item
        v-for="(item, index) in tabList"
        :key="index"
        :value="item.tab"
        class="gro-pools"
      >
        <UgHisCard v-for="pool in item.value" :key="pool.order" :pool="pool" />
      </v-window-item>
    </v-window>
  </div>
</template>
<script lang="ts" setup>
import { onMounted, ref, shallowRef } from "vue";

import UgHisCard from "./ug-his-card.vue";

import { AppGachaData } from "@/data/index.js";

type GroHistoryMap = { tab: string; value: Array<TGApp.App.Gacha.PoolItem> };

const historyTab = ref<string>("");
const tabList = shallowRef<Array<GroHistoryMap>>([]);

onMounted(() => {
  const res: Array<GroHistoryMap> = [];
  for (const pool of AppGachaData) {
    const index = res.findIndex((item) => item.tab === pool.version);
    if (index === -1) {
      res.push({ tab: pool.version, value: [pool] });
      continue;
    }
    res[index].value.push(pool);
  }
  tabList.value = res.reverse();
  historyTab.value = res[0].tab;
});
</script>
<style lang="css" scoped>
.gro-container {
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: space-between;
}

.gro-tabs {
  width: 100px;
  height: 100%;
}

/* stylelint-disable selector-class-pattern */

.gro-container :deep(.v-tabs.v-slide-group--vertical) {
  max-height: 100%;
}
/* stylelint-enable selector-class-pattern */

.gro-window {
  position: relative;
  display: flex;
  width: 100%;
  height: 100%;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding-right: 8px;
  overflow-y: scroll;
}

/* stylelint-disable selector-class-pattern */

.gro-window :deep(.v-window__container) {
  width: 100%;
}
/* stylelint-enable selector-class-pattern */

.gro-pools {
  position: relative;
  display: flex;
  width: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  row-gap: 8px;
}
</style>
