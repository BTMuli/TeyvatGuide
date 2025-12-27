<!-- 抽卡历史 -->
<template>
  <div class="gro-container">
    <v-tabs v-model="historyTab" align-tabs="start" class="gro-tabs" direction="vertical">
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
        <UgHisCard v-for="pool in item.value" :key="pool.order" :pool="pool" :uid="props.uid" />
      </v-window-item>
    </v-window>
  </div>
</template>
<script lang="ts" setup>
import { onMounted, ref, shallowRef } from "vue";

import UgHisCard from "./ug-his-card.vue";

import { AppGachaData } from "@/data/index.js";

type GroHistoryMap = { tab: string; value: Array<TGApp.App.Gacha.PoolItem> };
type GroHistoryProps = { uid?: string };

const props = defineProps<GroHistoryProps>();

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
<style lang="scss" scoped>
.gro-container {
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: space-between;
}

.gro-tabs {
  width: 80px;
  height: 100%;
}

/* stylelint-disable selector-class-pattern */

.gro-container :deep(.v-tabs.v-slide-group--vertical) {
  max-height: 100%;
}

/* stylelint-enable selector-class-pattern */

.gro-window {
  position: relative;
  width: 100%;
  height: 100%;
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
