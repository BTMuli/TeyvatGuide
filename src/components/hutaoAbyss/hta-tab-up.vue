<template>
  <div class="hta-tu-box">
    <v-tabs v-model="tab" direction="vertical" class="hta-tu-tab">
      <v-tab value="9">第09层</v-tab>
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
          <TibWikiAbyss v-for="item in selectItem.Ranks" :key="item.Item" :model-value="item" />
        </div>
      </v-window-item>
    </v-window>
  </div>
</template>
<script lang="ts" setup>
import { onMounted, ref } from "vue";

import TibWikiAbyss from "../itembox/tib-wiki-abyss.vue";

interface HtaTabUseProps {
  modelValue: TGApp.Plugins.Hutao.Abyss.AvatarUp[];
}

const props = defineProps<HtaTabUseProps>();

// data
const tab = ref<string>("9");
const select = ref<TGApp.Plugins.Hutao.Abyss.AvatarUp[]>([]);

onMounted(async () => {
  props.modelValue.forEach((item) => {
    item.Ranks.sort((a, b) => b.Rate - a.Rate);
    select.value.push(item);
  });
});
</script>
<style lang="css" scoped>
.hta-tu-box {
  height: 100%;
}

.hta-tu-tab {
  position: absolute;
  height: 100%;
  color: var(--box-text-4);
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
