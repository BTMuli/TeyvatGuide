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
      <span>{{ props.modelValue.description }}</span>
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
