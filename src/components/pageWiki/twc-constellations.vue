<template>
  <div class="twc-constellations-box">
    <v-tabs v-model="tab">
      <v-tab
        v-for="(item, index) in props.data"
        :key="index"
        :title="item.Name"
        :value="item.Name"
        class="twc-constellation-tab"
        density="compact"
      >
        <img :src="`/icon/constellations/${item.Icon}.webp`" alt="icon" />
        <span v-if="tab === item.Name">{{ item.Name }}</span>
      </v-tab>
    </v-tabs>
    <v-window v-model="tab">
      <v-window-item
        v-for="(item, index) in props.data"
        :key="index"
        :value="item.Name"
        class="twc-constellation-desc"
      >
        <div class="twc-constellation-normal">
          <span v-html="parseHtmlText(item.Description)"></span>
        </div>
        <div v-if="item.SpecialDescription" class="twc-constellation-spec">
          <span v-html="parseHtmlText(item.SpecialDescription)" />
        </div>
      </v-window-item>
    </v-window>
  </div>
</template>
<script lang="ts" setup>
import { parseHtmlText } from "@utils/toolFunc.js";
import { onMounted, ref, watch } from "vue";

type TwcConstellationProps = { data: Array<TGApp.Plugins.Hutao.Character.RhisdTalent> };

const props = defineProps<TwcConstellationProps>();
const tab = ref<string>();

function loadData(): void {
  tab.value = props.data[0].Name;
}

onMounted(() => loadData());

watch(() => props.data, loadData);
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
  display: flex;
}

.twc-constellation-normal {
  width: 100%;
  padding: 8px;
  border-radius: 4px;
  background: var(--box-bg-1);
  white-space: pre-wrap;
}

.twc-constellation-spec {
  padding: 8px;
  border-radius: 4px;
  background: var(--box-bg-2);
  white-space: pre-wrap;
}
</style>
