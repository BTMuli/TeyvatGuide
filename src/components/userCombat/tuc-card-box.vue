<!-- 剧诗，神秘收获 -->
<template>
  <div v-if="props.modelValue.length > 0" class="tuc-card-box">
    <div class="tuc-card-title">神秘收获 {{ props.modelValue.length }}</div>
    <div class="tuc-card-list">
      <div v-for="(card, idx) in props.modelValue" :key="idx" class="tuc-card-item">
        <div class="tuc-ci-icon">
          <img :src="card.icon" alt="icon" />
        </div>
        <div class="tuc-ci-info">
          <div class="tuc-ci-title">{{ card.name }}</div>
          <div class="tuc-ci-desc" v-html="parseHtmlText(card.desc)" />
        </div>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { parseHtmlText } from "@utils/toolFunc.js";

type TucCardBoxProps = {
  /* 神秘收获数据 */
  modelValue: Array<TGApp.Game.Combat.Card>;
};

const props = defineProps<TucCardBoxProps>();
</script>
<style lang="scss" scoped>
.tuc-card-box {
  position: relative;
  display: flex;
  width: 100%;
  box-sizing: border-box;
  flex: 1;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  padding: 8px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
  background: var(--box-bg-2);
  row-gap: 8px;
}

.tuc-card-title {
  color: var(--box-text-2);
  font-family: var(--font-title);
}

.tuc-card-list {
  position: relative;
  display: flex;
  width: 100%;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  row-gap: 8px;
}

.tuc-card-item {
  position: relative;
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  justify-content: flex-start;
  column-gap: 8px;
}

.tuc-ci-icon {
  position: relative;
  width: 60px;
  height: 60px;
  flex-shrink: 0;
  padding: 4px;
  border-radius: 4px;
  background-color: var(--box-bg-3);

  img {
    width: 100%;
    height: 100%;
    filter: invert(1);
    object-fit: cover;
  }
}

.dark .tuc-ci-icon img {
  filter: unset;
}

.tuc-ci-title {
  position: relative;
  font-family: var(--font-title);
}

.tuc-ci-desc {
  position: relative;
  flex-shrink: 0;
  font-size: 12px;
  word-break: break-all;
}
</style>
