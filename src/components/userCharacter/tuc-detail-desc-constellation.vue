<template>
  <TucDetailDesc>
    <template #title>
      <span>命之座</span>
    </template>
    <template #content>
      <TucDetailConstellation v-model="props.modelValue" />
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
      <span v-html="parseDesc(props.modelValue.description)" />
    </template>
  </TucDetailDesc>
</template>
<script lang="ts" setup>
// vue
import TucDetailDesc from "./tuc-detail-desc.vue";
import TucDetailConstellation from "./tuc-detail-constellation.vue";

interface TucDetailDescConstellationProps {
  modelValue: TGApp.Sqlite.Character.RoleConstellation;
}

const props = defineProps<TucDetailDescConstellationProps>();

// 解析描述
function parseDesc (desc: string): string {
  const reg = /<color=(.*?)>(.*?)<\/color>/g;
  let match = reg.exec(desc);
  while (match) {
    const color = match[1];
    const text = match[2];
    desc = desc.replace(match[0], `<span style="color: ${color}">${text}</span>`);
    match = reg.exec(desc);
  }
  desc = desc.replace(/\\n/g, "<br />");
  return desc;
}
</script>
<style lang="css" scoped>
.tuc-ddc-content {
  display: flex;
  flex-direction: column;
  align-items: start;
  justify-content: space-around;
  height: 100%;
  margin-left: 5px;
}

.tuc-ddc-top {
  color: var(--common-color-blue-2);
  height: 20px;
}

.tuc-ddc-bottom {
  height: 20px;
}

.tuc-ddc-bottom :nth-child(1) {
  margin-right: 5px;
}

.tuc-ddc-bottom :nth-child(3) {
  color: var(--common-color-yellow);
}
</style>
