<template>
  <div class="hta-tt-box">
    <v-tabs v-model="tab" direction="vertical" class="hta-tt-tab">
      <v-tab value="9">第09层</v-tab>
      <v-tab value="10">第10层</v-tab>
      <v-tab value="11">第11层</v-tab>
      <v-tab value="12">第12层</v-tab>
    </v-tabs>
    <v-window v-model="tab" class="hta-tt-window">
      <v-window-item :value="tab">
        <div v-if="select" class="hta-tt-flex">
          <div class="hta-tuf-box">
            <div class="hta-tuf-title">上半</div>
            <div v-for="items in select.up" :key="items.rate" class="hta-tuf-item">
              <div class="hta-tuf-item-icons">
                <TibWikiAbyss2
                  v-for="item in items.item.split(',')"
                  :key="item"
                  :model-value="item"
                />
              </div>
              <div class="hta-tuf-item-rate">上场{{ items.rate }}次</div>
            </div>
          </div>
          <div class="hta-tuf-box">
            <div class="hta-tuf-title">下半</div>
            <div v-for="items in select.down" :key="items.rate" class="hta-tuf-item">
              <div class="hta-tuf-item-icons">
                <TibWikiAbyss2
                  v-for="item in items.item.split(',')"
                  :key="item"
                  :model-value="item"
                />
              </div>
              <div class="hta-tuf-item-rate">上场{{ items.rate }}次</div>
            </div>
          </div>
        </div>
      </v-window-item>
    </v-window>
  </div>
</template>
<script lang="ts" setup>
// vue
import { onMounted, ref, watch } from "vue";
import TibWikiAbyss2 from "../itembox/tib-wiki-abyss-2.vue";

interface HtaTabTeamProps {
  modelValue: TGApp.Plugins.Hutao.Abyss.TeamCombination[];
}

const props = defineProps<HtaTabTeamProps>();

// data
const tab = ref<string>("9");
const select = ref<TGApp.Plugins.Hutao.Abyss.TeamCombination>();

function loadData(): void {
  select.value = props.modelValue.filter((item) => item.floor.toString() === tab.value)?.[0];
  select.value?.up.sort((a, b) => b.rate - a.rate);
  select.value?.down.sort((a, b) => b.rate - a.rate);
}

onMounted(async () => {
  loadData();
});

// 监听 tab 变化
watch(tab, () => {
  loadData();
});
</script>
<style lang="css" scoped>
.hta-tt-box {
  margin: 5px;
  width: calc(100% - 10px);
  height: 100%;
  border: 1px inset var(--common-bg-1);
  border-radius: 5px;
}

.hta-tt-tab {
  position: absolute;
  height: 100%;
  color: var(--common-text-content);
  font-family: var(--font-text);
}

.hta-tt-window {
  margin-left: 100px;
  width: calc(100% - 100px);
  height: 100%;
  max-height: calc(100vh - 130px);
  overflow: auto;
}

.hta-tt-flex {
  position: relative;
  overflow: auto;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  column-gap: 10px;
  padding: 10px;
}

.hta-tuf-box {
  width: 100%;
  max-height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  row-gap: 10px;
  border-radius: 5px;
}

.hta-tuf-title {
  font-family: var(--font-title);
  font-size: 18px;
  text-align: left;
  width: 100%;
}

.hta-tuf-item {
  width: 100%;
  display: flex;
  height: 100px;
  padding: 5px;
  justify-content: flex-start;
  background: var(--common-bg-1);
  border-radius: 5px;
  column-gap: 10px;
  align-items: center;
}

.hta-tuf-item-icons {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  column-gap: 10px;
}

.hta-tuf-item-rate {
  width: calc(100% - 360px);
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  font-family: var(--font-title);
}
</style>
