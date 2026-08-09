<template>
  <div class="twc-skills-box">
    <v-tabs v-model="tab">
      <v-tab
        v-for="(item, index) in tabValues"
        :key="index"
        :title="item.name"
        :value="item.name"
        class="twc-skill-tab"
        density="compact"
      >
        <img :src="`/icon/talents/${item.icon}.webp`" alt="icon" />
        <span v-if="tab === item.name">{{ item.name }}</span>
      </v-tab>
    </v-tabs>
    <v-window v-model="tab">
      <v-window-item
        v-for="(item, index) in tabValues"
        :key="index"
        :value="item.name"
        class="twc-skill-desc"
      >
        <div class="twc-skill-normal">
          <span v-html="parseHtmlText(data[index].desc)"></span>
        </div>
        <div v-if="data[index].descSp" class="twc-skill-special">
          <span v-html="parseHtmlText(data[index].descSp)"></span>
        </div>
      </v-window-item>
    </v-window>
  </div>
</template>
<script lang="ts" setup>
import { parseHtmlText } from "@utils/toolFunc.js";
import { onMounted, ref, shallowRef, watch } from "vue";

type TwcSkillsProps = { data: Array<TGApp.App.Character.WikiSkill> };
type TabItem = { name: string; icon: string };

const props = defineProps<TwcSkillsProps>();
const tab = ref<string>();
const tabValues = shallowRef<Array<TabItem>>([]);

function loadData(): void {
  tabValues.value = [];
  const tmpData: Array<TabItem> = [];
  props.data.map((i) => tmpData.push({ name: i.name, icon: i.icon }));
  tabValues.value = tmpData;
  tab.value = tabValues.value[0].name;
}

onMounted(() => loadData());

watch(() => props.data, loadData);
</script>
<style lang="scss" scoped>
.twc-skills-box {
  display: flex;
  flex-direction: column;
  padding: 8px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  gap: 8px;
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

.twc-skill-desc {
  display: flex;
}

.twc-skill-normal {
  width: 100%;
  padding: 8px;
  border-radius: 4px;
  background: var(--box-bg-1);
  line-height: 20px;
  white-space: pre-wrap;
}

.twc-skill-special {
  padding: 8px;
  border-radius: 4px;
  background: var(--box-bg-2);
  line-height: 20px;
  white-space: pre-wrap;
}
</style>
