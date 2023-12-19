<template>
  <div class="twc-constellations-box">
    <v-tabs v-model="tab">
      <v-tab
        v-for="item in props.data"
        :key="item.Id"
        :value="item.Name"
        :title="item.Name"
        class="twc-constellation-tab"
        density="compact"
      >
        <!-- todo 换成本地资源 -->
        <img :src="`https://api.ambr.top/assets/UI/${item.Icon}.png`" alt="icon" />
        <span v-if="tab === item.Name">{{ item.Name }}</span>
      </v-tab>
    </v-tabs>
    <v-window v-model="tab">
      <v-window-item
        :value="item.Name"
        v-for="item in props.data"
        :key="item.Id"
        class="twc-constellation-desc"
      >
        <span v-html="parseDesc(item.Description)"></span>
      </v-window-item>
    </v-window>
  </div>
</template>
<script setup lang="ts">
import { ref } from "vue";

interface TwcConstellationProps {
  data: TGApp.Plugins.Hutao.Character.RhisdTalent[];
}

const props = defineProps<TwcConstellationProps>();
const tab = ref<string>();

function parseDesc(desc: string): string {
  const reg = /<color=(.*?)>(.*?)<\/color>/g;
  let match = reg.exec(desc);
  while (match !== null) {
    const color = match[1];
    const text = match[2];
    desc = desc.replace(
      match[0],
      `<span title="${text}" style="color: ${color};font-weight: bold;">${text}</span>`,
    );
    match = reg.exec(desc);
  }
  desc = desc.replace(/\\n/g, "<br />");
  return desc;
}
</script>
<style lang="css" scoped>
.twc-constellations-box {
  display: flex;
  flex-direction: column;
  padding: 5px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 5px;
}

.twc-constellation-tab {
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
}

.twc-constellation-tab img {
  width: 30px;
  height: 30px;
  filter: brightness(0.25);
}

.dark .twc-constellation-tab img {
  filter: brightness(0.75);
}

.twc-constellation-desc {
  padding-left: 10px;
  white-space: pre-wrap;
}
</style>
