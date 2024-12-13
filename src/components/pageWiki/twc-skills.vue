<template>
  <div class="twc-skills-box">
    <v-tabs v-model="tab">
      <v-tab
        v-for="(item, index) in tabValues"
        :key="index"
        :value="item.name"
        :title="item.name"
        class="twc-skill-tab"
        density="compact"
      >
        <img :src="`/icon/talents/${item.icon}.webp`" alt="icon" />
        <span v-if="tab === item.name">{{ item.name }}</span>
      </v-tab>
    </v-tabs>
    <v-window v-model="tab">
      <v-window-item :value="item.name" v-for="(item, index) in tabValues" :key="index">
        <div class="twc-skill-special">
          <span v-html="parseHtmlText(data[index].Description)"></span>
        </div>
      </v-window-item>
    </v-window>
  </div>
</template>
<script lang="ts" setup>
import { onMounted, ref, shallowRef, watch } from "vue";

import { parseHtmlText } from "@/utils/toolFunc.js";

type TwcSkillsProps = { data: Array<TGApp.App.Character.WikiSkill> };
type TabItem = { name: string; icon: string };

const props = defineProps<TwcSkillsProps>();
const tab = ref<string>();
const tabValues = shallowRef<Array<TabItem>>([]);

function loadData(): void {
  tabValues.value = [];
  const tmpData: Array<TabItem> = [];
  props.data.map((i) => tmpData.push({ name: i.Name, icon: i.Icon }));
  tabValues.value = tmpData;
  tab.value = tabValues.value[0].name;
}

onMounted(() => loadData());

watch(() => props.data, loadData);
</script>
<style lang="css" scoped>
.twc-skills-box {
  display: flex;
  flex-direction: column;
  padding: 5px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 5px;
}

.twc-skill-tab {
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
}

.twc-skill-tab img {
  width: 30px;
  height: 30px;
  filter: brightness(0.25);
}

.dark .twc-skill-tab img {
  filter: brightness(0.75);
}

.twc-skill-normal {
  display: flex;
}

.twc-skill-special {
  padding-left: 10px;
  white-space: pre-wrap;
}
</style>
