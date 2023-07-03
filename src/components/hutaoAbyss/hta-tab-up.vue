<template>
  <div class="hta-tu-box">
    <v-tabs v-model="tab" direction="vertical" class="hta-tu-tab">
      <v-tab value="9">第09层</v-tab>
      <v-tab value="10">第10层</v-tab>
      <v-tab value="11">第11层</v-tab>
      <v-tab value="12">第12层</v-tab>
    </v-tabs>
    <v-window v-model="tab" class="hta-tu-window">
      <v-window-item :value="tab">
        <div v-if="select" class="hta-tu-grid">
          <TibWikiAbyss v-for="item in select.ranks" :key="item.item" :model-value="item" />
        </div>
      </v-window-item>
    </v-window>
  </div>
</template>
<script lang="ts" setup>
// vue
import { onMounted, ref, watch } from "vue";
import TibWikiAbyss from "../itembox/tib-wiki-abyss.vue";

interface HtaTabUseProps {
  modelValue: TGApp.Plugins.Hutao.Abyss.AvatarUse[];
}

const props = defineProps<HtaTabUseProps>();

// data
const tab = ref<string>("9");
const select = ref<TGApp.Plugins.Hutao.Abyss.AvatarUse>();

function loadData(): void {
  select.value = props.modelValue.filter((item) => item.floor.toString() === tab.value)?.[0];
  select.value?.ranks.sort((a, b) => b.rate - a.rate);
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
.hta-tu-box {
  width: calc(100% - 10px);
  height: 100%;
  border: 1px inset var(--common-bg-1);
  border-radius: 5px;
  margin: 5px;
}

.hta-tu-tab {
  position: absolute;
  height: 100%;
  color: var(--common-text-title);
  font-family: var(--font-text);
}

.hta-tu-window {
  width: calc(100% - 100px);
  height: 100%;
  margin-left: 100px;
}

.hta-tu-grid {
  display: grid;
  overflow: auto;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
  padding: 5px;
  grid-gap: 5px;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
}
</style>
