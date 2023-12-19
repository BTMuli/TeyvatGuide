<template>
  <div class="twc-skills-box">
    <v-tabs v-model="tab">
      <v-tab
        v-for="(item, index) in tabValues"
        :key="index"
        :value="item.name"
        class="twc-skill-tab"
      >
        <!-- todo 换成本地资源 -->
        <img :src="`https://api.ambr.top/assets/UI/${item.icon}.png`" alt="icon" />
      </v-tab>
    </v-tabs>
    <v-window v-model="tab">
      <v-window-item :value="item.name" v-for="(item, index) in tabValues" :key="index">
        {{ data[index] }}
      </v-window-item>
    </v-window>
  </div>
</template>
<script lang="ts" setup>
import { onMounted, ref } from "vue";

interface TwcSkillsProps {
  data: TGApp.Plugins.Hutao.Character.RhisdSkill[];
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
  row-gap: 10px;
}

.twc-skill-tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  row-gap: 5px;
}

.twc-skill-tab img {
  width: 30px;
  height: 30px;
  filter: brightness(0.25);
}

.dark .twc-skill-tab img {
  filter: brightness(0.75);
}
</style>
