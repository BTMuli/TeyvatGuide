<!-- 抽卡历史 -->
<template>
  <div class="gro-container">
    <v-tabs v-model="historyTab" align-tabs="start" class="gro-tabs" direction="vertical">
      <v-tab v-for="(item, index) in visibleTabList" :key="index" :value="item.tab">
        {{ item.tab }}
      </v-tab>
    </v-tabs>
    <v-window v-model="historyTab" class="gro-window">
      <v-window-item
        v-for="(item, index) in visibleTabList"
        :key="index"
        :value="item.tab"
        class="gro-pools"
      >
        <UgHisCard
          v-for="pool in item.value"
          :key="pool.order"
          :periodEnd
          :periodStart
          :pool
          :uid
        />
      </v-window-item>
    </v-window>
  </div>
</template>
<script lang="ts" setup>
import { computed, ref, shallowRef, watch } from "vue";

import UgHisCard from "./ug-his-card.vue";

import { AppGachaData } from "@/data/index.js";

type GroHistoryMap = { tab: string; value: Array<TGApp.App.Gacha.PoolItem> };
type GroHistoryProps = {
  uid?: string;
  versionFilter?: string | null;
  periodStart?: string;
  periodEnd?: string;
};

const {
  uid,
  versionFilter = null,
  periodStart = "",
  periodEnd = "",
} = defineProps<GroHistoryProps>();

const historyTab = ref<string>("");
const tabList = shallowRef<Array<GroHistoryMap>>([]);

const visibleTabList = computed<Array<GroHistoryMap>>(() => {
  let list = tabList.value;
  if (versionFilter !== null && versionFilter !== undefined && versionFilter !== "") {
    list = list.filter((item) => item.tab === versionFilter);
  }
  if (periodStart !== "" || periodEnd !== "") {
    list = list
      .map((item) => ({
        tab: item.tab,
        value: item.value.filter((pool) => poolOverlapsPeriod(pool)),
      }))
      .filter((item) => item.value.length > 0);
  }
  return list;
});

watch(
  visibleTabList,
  (list) => {
    if (list.length === 0) {
      historyTab.value = "";
      return;
    }
    if (list.some((item) => item.tab === historyTab.value)) return;
    historyTab.value = list[0].tab;
  },
  { immediate: true },
);

buildTabList();

function buildTabList(): void {
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
}

function poolOverlapsPeriod(pool: TGApp.App.Gacha.PoolItem): boolean {
  const poolStart = pool.from.slice(0, 10);
  const poolEnd = pool.to.slice(0, 10);
  if (periodStart !== "" && poolEnd < periodStart) return false;
  if (periodEnd !== "" && poolStart > periodEnd) return false;
  return true;
}
</script>
<style lang="scss" scoped>
.gro-container {
  display: flex;
  width: 100%;
  height: 100%;
  align-items: flex-start;
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
  overflow-y: auto;
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
