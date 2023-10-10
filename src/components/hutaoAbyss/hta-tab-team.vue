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
            <div v-for="items in selectItem.Up" :key="items.Rate" class="hta-tuf-item">
              <div class="hta-tuf-item-icons">
                <TibWikiAbyss2
                  v-for="item in items.Item.split(',')"
                  :key="item"
                  :model-value="item"
                />
              </div>
              <div class="hta-tuf-item-rate">上场{{ items.Rate }}次</div>
            </div>
          </div>
          <div class="hta-tuf-box">
            <div class="hta-tuf-title">下半</div>
            <div v-for="items in selectItem.Down" :key="items.Rate" class="hta-tuf-item">
              <div class="hta-tuf-item-icons">
                <TibWikiAbyss2
                  v-for="item in items.Item.split(',')"
                  :key="item"
                  :model-value="item"
                />
              </div>
              <div class="hta-tuf-item-rate">上场{{ items.Rate }}次</div>
            </div>
          </div>
        </div>
      </v-window-item>
    </v-window>
  </div>
</template>
<script lang="ts" setup>
import { onMounted, ref } from "vue";

import TibWikiAbyss2 from "../itembox/tib-wiki-abyss-2.vue";

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
  width: calc(100% - 10px);
  height: 100%;
  border: 1px inset var(--common-bg-1);
  border-radius: 5px;
  margin: 5px;
}

.hta-tt-tab {
  position: absolute;
  height: 100%;
  color: var(--common-text-title);
  font-family: var(--font-text);
}

.hta-tt-window {
  overflow: auto;
  width: calc(100% - 100px);
  height: 100%;
  max-height: calc(100vh - 130px);
  margin-left: 100px;
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
  width: 100%;
  max-height: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 5px;
  overflow-x: hidden;
  overflow-y: auto;
  row-gap: 10px;
}

.hta-tuf-title {
  width: 100%;
  font-family: var(--font-title);
  font-size: 18px;
  text-align: left;
}

.hta-tuf-item {
  display: flex;
  width: 100%;
  height: 100px;
  align-items: center;
  justify-content: flex-start;
  padding: 5px;
  border-radius: 5px;
  background: var(--common-bg-1);
  column-gap: 10px;
}

.hta-tuf-item-icons {
  display: grid;
  column-gap: 10px;
  grid-template-columns: repeat(4, 1fr);
}

.hta-tuf-item-rate {
  display: flex;
  width: calc(100% - 360px);
  height: 100%;
  align-items: center;
  justify-content: center;
  font-family: var(--font-title);
}
</style>
