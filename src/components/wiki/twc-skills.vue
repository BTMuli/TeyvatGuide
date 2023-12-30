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
import { onMounted, ref } from "vue";

import { parseHtmlText } from "../../utils/toolFunc";

interface TwcSkillsProps {
  data: TGApp.App.Character.WikiSkill[];
}

const props = defineProps<TwcSkillsProps>();
const tab = ref<string>();
const tabValues = ref<Array<{ name: string; icon: string }>>([]);

onMounted(() => {
  props.data.map((i) => tabValues.value.push({ name: i.Name, icon: i.Icon }));
  tab.value = tabValues.value[0].name;
});
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
