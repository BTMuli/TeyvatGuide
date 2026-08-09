<template>
  <div class="twc-skills-box">
    <v-tabs v-model="tab" class="twc-detail-tabs twc-icon-tabs" density="compact" show-arrows>
      <v-tab
        v-for="(item, index) in tabValues"
        :key="index"
        :aria-label="item.name"
        :title="item.name"
        :value="item.name"
        class="twc-skill-tab"
      >
        <img :src="`/icon/talents/${item.icon}.webp`" alt="" />
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
import { onMounted, shallowRef, watch } from "vue";

type TwcSkillsProps = { data: Array<TGApp.App.Character.WikiSkill> };
type TabItem = { name: string; icon: string };

const props = defineProps<TwcSkillsProps>();
const tab = defineModel<string>("selected");
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
  gap: 8px;
}

.twc-skill-tab {
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: normal;
}

.twc-skill-tab img {
  width: 24px;
  height: 24px;
  filter: var(--icon-filter);
}

.twc-skill-desc {
  display: flex;
  font-size: 14px;
}

.twc-skill-normal {
  width: 100%;
  white-space: pre-wrap;
}

.twc-skill-special {
  padding: 8px;
  border-radius: 4px;
  margin-left: 4px;
  background: var(--box-bg-3);
  white-space: pre-wrap;
}
</style>
