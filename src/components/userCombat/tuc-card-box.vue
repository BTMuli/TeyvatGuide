<!-- 剧诗，神秘收获 -->
<template>
  <div v-if="props.modelValue.length > 0" class="tuc-card-box">
    <div class="tuc-card-title">
      <span class="tuc-card-title-label">神秘收获</span>
      <span class="tuc-card-title-count">{{ props.modelValue.length }} 项</span>
    </div>
    <div class="tuc-card-list">
      <v-menu
        v-for="card in props.modelValue"
        :key="card.id"
        :close-on-content-click="false"
        location="bottom end"
      >
        <template #activator="{ props: menuProps }">
          <div class="tuc-card-item" v-bind="menuProps">
            <div class="tuc-card-summary">
              <div :title="card.name" class="tuc-ci-icon">
                <img :src="card.icon" alt="icon" />
              </div>
              <span class="tuc-card-name">{{ card.name }}</span>
            </div>
          </div>
        </template>
        <div class="tuc-card-popover">
          <div class="tuc-card-popover-title">
            <img :src="card.icon" alt="icon" />
            <span>{{ card.name }}</span>
          </div>
          <div class="tuc-ci-desc" v-html="parseHtmlText(card.desc)" />
        </div>
      </v-menu>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { parseHtmlText } from "@utils/toolFunc.js";

type TucCardBoxProps = { modelValue: Array<TGApp.Game.Combat.Card> };

const props = defineProps<TucCardBoxProps>();
</script>
<style lang="scss" scoped>
.tuc-card-box {
  position: relative;
  display: flex;
  overflow: hidden;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  flex: 1;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  padding: 12px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--box-bg-2);
  row-gap: 8px;
}

.tuc-card-title {
  position: relative;
  display: flex;
  width: 100%;
  min-height: 28px;
  align-items: center;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--common-shadow-1);
  color: var(--box-text-2);
  font-family: var(--font-title);
  font-weight: normal;
  gap: 8px;

  &::before {
    width: 4px;
    height: 18px;
    border-radius: 2px;
    background: var(--tgc-od-orange);
    content: "";
  }
}

.tuc-card-title-label {
  color: var(--common-text-title);
  font-size: 16px;
}

.tuc-card-title-count {
  padding: 2px 8px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 12px;
  margin-left: auto;
  background: var(--box-bg-3);
  color: var(--tgc-od-orange);
  font-size: 12px;
}

.tuc-card-list {
  position: relative;
  display: flex;
  width: 100%;
  flex-flow: row wrap;
  align-items: flex-start;
  justify-content: flex-start;
  gap: 8px;
}

.tuc-card-item {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--box-bg-3);
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;

  &:hover {
    border-color: var(--tgc-od-orange);
    box-shadow: 0 3px 8px var(--common-shadow-2);
    transform: translateY(-2px);
  }
}

.tuc-card-summary {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  row-gap: 4px;
}

.tuc-ci-icon {
  position: relative;
  width: 60px;
  height: 60px;
  flex-shrink: 0;
  padding: 4px;
  border-radius: 6px;
  background-color: var(--box-bg-3);
  cursor: default;
}

.tuc-ci-icon img {
  width: 100%;
  height: 100%;
  filter: invert(1);
  object-fit: cover;
}

.tuc-card-name {
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 12px;
  font-weight: normal;
  text-align: center;
  white-space: nowrap;
}

.tuc-ci-desc {
  position: relative;
  flex-shrink: 0;
  font-size: 12px;
  word-break: break-all;
}

.tuc-card-popover {
  display: flex;
  width: min(380px, calc(100vw - 48px));
  max-height: min(420px, calc(100vh - 160px));
  box-sizing: border-box;
  flex-direction: column;
  padding: 12px;
  border: 1px solid var(--common-shadow-2);
  border-radius: 8px;
  background: var(--box-bg-1);
  box-shadow: 0 8px 24px var(--common-shadow-4);
  gap: 12px;
  overflow-y: auto;

  .tuc-ci-desc {
    color: var(--box-text-2);
    line-height: 1.6;
  }
}

.tuc-card-popover-title {
  display: flex;
  align-items: center;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--common-shadow-1);
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-weight: normal;
  gap: 8px;

  img {
    width: 36px;
    height: 36px;
    filter: invert(1);
    object-fit: contain;
  }
}

.dark .tuc-card-popover-title img {
  filter: unset;
}

.dark .tuc-ci-icon img {
  filter: unset;
}
</style>
