<template>
  <TucDetailDesc>
    <template #title>
      <span>命之座</span>
    </template>
    <template #content>
      <TucDetailConstellation :model-value="props.modelValue" />
      <div class="tuc-ddc-content">
        <div class="tuc-ddc-top">
          {{ props.modelValue.name }}
        </div>
        <div class="tuc-ddc-bottom">
          <span>命之座</span>
          <span>第</span>
          <span>{{ props.modelValue.pos }}</span>
          <span>层</span>
        </div>
      </div>
    </template>
    <template #desc>
      <!-- eslint-disable-next-line vue/no-v-html -->
      <span v-html="parseDesc(props.modelValue.description)"></span>
    </template>
  </TucDetailDesc>
</template>
<script lang="ts" setup>
import TucDetailConstellation from "./tuc-detail-constellation.vue";
import TucDetailDesc from "./tuc-detail-desc.vue";

interface TucDetailDescConstellationProps {
  modelValue: TGApp.Sqlite.Character.RoleConstellation;
}

const props = defineProps<TucDetailDescConstellationProps>();

// 解析描述
function parseDesc(desc: string): string {
  const reg = /<color=(.*?)>(.*?)<\/color>/g;
  let match = reg.exec(desc);
  while (match !== null) {
    const color = match[1];
    const text = match[2];
    desc = desc.replace(match[0], `<span title="${text}" style="color: ${color};">${text}</span>`);
    match = reg.exec(desc);
  }
  desc = desc.replace(/\\n/g, "<br />");
  return desc;
}
</script>
<style lang="css" scoped>
.tuc-ddc-content {
  display: flex;
  height: 100%;
  flex-direction: column;
  align-items: start;
  justify-content: space-around;
  margin-left: 5px;
  color: var(--tgc-dark-1);
}

.tuc-ddc-top {
  height: 20px;
  color: var(--box-text-3);
}

.tuc-ddc-bottom {
  height: 20px;
  color: var(--box-text-1);
}

.tuc-ddc-bottom :nth-child(1) {
  margin-right: 5px;
}

.tuc-ddc-bottom :nth-child(3) {
  color: var(--tgc-yellow-1);
}
</style>
