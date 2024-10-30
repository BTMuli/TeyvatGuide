<template>
  <div class="hta-tt-box">
    <v-tabs v-model="tab" direction="vertical" class="hta-tt-tab">
      <v-tab value="9">第09层</v-tab>
      <v-tab value="10">第10层</v-tab>
      <v-tab value="11">第11层</v-tab>
      <v-tab value="12">第12层</v-tab>
    </v-tabs>
    <v-window v-model="tab" class="hta-tt-window">
      <v-window-item
        v-for="selectItem in select"
        :key="selectItem.Floor"
        :value="selectItem.Floor.toString()"
      >
        <div v-if="select" class="hta-tt-flex">
          <div class="hta-tuf-box">
            <div class="hta-tuf-title">上半</div>
            <v-virtual-scroll :items="selectItem.Up" item-height="100" class="hta-tuf-item">
              <template #default="{ item }">
                <HtaTeamLine :model-value="item" />
              </template>
            </v-virtual-scroll>
          </div>
          <div class="hta-tuf-box">
            <div class="hta-tuf-title">下半</div>
            <v-virtual-scroll :items="selectItem.Down" item-height="100" class="hta-tuf-item">
              <template #default="{ item }">
                <HtaTeamLine :model-value="item" />
              </template>
            </v-virtual-scroll>
          </div>
        </div>
      </v-window-item>
    </v-window>
  </div>
</template>
<script lang="ts" setup>
import { onMounted, ref } from "vue";

import HtaTeamLine from "./hta-team-line.vue";

interface HtaTabTeamProps {
  modelValue: TGApp.Plugins.Hutao.Abyss.TeamCombination[];
}

const props = defineProps<HtaTabTeamProps>();

// data
const tab = ref<string>("9");
const select = ref<TGApp.Plugins.Hutao.Abyss.TeamCombination[]>([]);

onMounted(async () => {
  props.modelValue.forEach((item) => {
    item.Up.sort((a, b) => b.Rate - a.Rate);
    item.Down.sort((a, b) => b.Rate - a.Rate);
    select.value.push(item);
  });
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
  max-height: calc(100vh - 130px);
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
  max-height: calc(100vh - 200px);
  border-radius: 5px;
  background: var(--box-bg-1);
}
</style>
