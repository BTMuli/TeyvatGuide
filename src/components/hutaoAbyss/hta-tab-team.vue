<template>
  <div class="hta-tt-box">
    <v-tabs v-model="tab" class="hta-tt-tab" direction="vertical">
      <v-tab :value="10">第10层</v-tab>
      <v-tab :value="11">第11层</v-tab>
      <v-tab :value="12">第12层</v-tab>
    </v-tabs>
    <v-window v-model="tab" class="hta-tt-window">
      <v-window-item v-for="selectItem in select" :key="selectItem.Floor" :value="selectItem.Floor">
        <div class="hta-tt-flex">
          <div class="hta-tuf-box">
            <div class="hta-tuf-title">上半</div>
            <v-virtual-scroll :items="selectItem.Up" class="hta-tuf-item" item-height="100">
              <template #default="{ item }">
                <HtaTeamLine :model-value="item" />
              </template>
            </v-virtual-scroll>
            <span v-if="selectItem.Up.length === 0">暂无数据</span>
          </div>
          <div class="hta-tuf-box">
            <div class="hta-tuf-title">下半</div>
            <v-virtual-scroll :items="selectItem.Down" class="hta-tuf-item" item-height="100">
              <template #default="{ item }">
                <HtaTeamLine :model-value="item" />
              </template>
            </v-virtual-scroll>
            <span v-if="selectItem.Down.length === 0">暂无数据</span>
          </div>
        </div>
      </v-window-item>
    </v-window>
  </div>
</template>
<script lang="ts" setup>
import { onMounted, ref, shallowRef } from "vue";

import HtaTeamLine from "./hta-team-line.vue";

type HtaTabTeamProps = { modelValue: Array<TGApp.Plugins.Hutao.Abyss.TeamCombination> };
const props = defineProps<HtaTabTeamProps>();

const tab = ref<number>(10);
const select = shallowRef<Array<TGApp.Plugins.Hutao.Abyss.TeamCombination>>([]);

onMounted(async () => {
  const tempData: Array<TGApp.Plugins.Hutao.Abyss.TeamCombination> = [];
  for (const item of props.modelValue) {
    item.Up.sort((a, b) => b.Rate - a.Rate);
    item.Down.sort((a, b) => b.Rate - a.Rate);
    tempData.push(item);
  }
  select.value = tempData;
});
</script>
<style lang="css" scoped>
.hta-tt-box {
  display: flex;
  height: 100%;
  column-gap: 10px;
}

.hta-tt-tab {
  height: 100%;
  color: var(--box-text-4);
}

.hta-tt-window {
  overflow: auto;
  width: 100%;
  height: 100%;
  overflow-x: hidden;
}

.hta-tt-flex {
  position: relative;
  display: flex;
  overflow: auto;
  align-items: flex-start;
  justify-content: center;
  padding: 10px;
  column-gap: 10px;
}

.hta-tuf-box {
  display: flex;
  overflow: hidden auto;
  width: 100%;
  max-height: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 5px;
  row-gap: 10px;
}

.hta-tuf-title {
  width: 100%;
  font-family: var(--font-title);
  font-size: 18px;
  text-align: left;
}

.hta-tuf-item {
  position: relative;
  width: 100%;
  max-height: calc(100vh - 160px);
  border-radius: 5px;
  background: var(--box-bg-1);
}

/* stylelint-disable selector-class-pattern */

:deep(.v-virtual-scroll__item + .v-virtual-scroll__item) {
  border-top: 1px solid var(--common-shadow-1);
  margin-top: 8px;
}

/* stylelint-enable selector-class-pattern */
</style>
