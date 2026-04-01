<!-- 剧诗，神秘收获 -->
<template>
  <div
    v-if="props.modelValue.length > 0"
    ref="containerRef"
    :class="['tuc-card-box', { 'simple-mode': props.simpleMode }]"
  >
    <div class="tuc-card-title">
      <span>神秘收获</span>
      <span>{{ props.modelValue.length }}</span>
    </div>
    <div :class="{ 'simple-mode': props.simpleMode }" class="tuc-card-list">
      <div
        v-for="card in props.modelValue"
        :key="card.id"
        :data-key="card.id"
        class="tuc-card-item"
      >
        <div class="tuc-card-summary">
          <div :title="props.simpleMode ? card.name : undefined" class="tuc-ci-icon">
            <img :src="card.icon" alt="icon" />
          </div>
          <span v-if="props.simpleMode" class="tuc-card-name">{{ card.name }}</span>
        </div>
        <div v-show="!props.simpleMode" class="tuc-ci-info">
          <div class="tuc-ci-title">{{ card.name }}</div>
          <div class="tuc-ci-desc" v-html="parseHtmlText(card.desc)" />
        </div>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { nextTick, onUnmounted, ref, watch } from "vue";

import { parseHtmlText } from "@utils/toolFunc.js";

type TucCardBoxProps = {
  modelValue: Array<TGApp.Game.Combat.Card>;
  simpleMode?: boolean;
};

const props = defineProps<TucCardBoxProps>();

const containerRef = ref<HTMLDivElement>();
let animationFrameId: number | null = null;

watch(
  () => props.simpleMode,
  async (newVal, oldVal) => {
    if (oldVal === undefined || !containerRef.value) return;

    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }

    const items = containerRef.value.querySelectorAll<HTMLDivElement>(".tuc-card-item");

    const firstRects = new Map<number, DOMRect>();
    items.forEach((el) => {
      const key = el.dataset.key;
      if (key) {
        firstRects.set(Number(key), el.getBoundingClientRect());
      }
    });

    await nextTick();

    const animations: Array<{ el: HTMLDivElement }> = [];

    items.forEach((el) => {
      const key = el.dataset.key;
      if (!key) return;

      const firstRect = firstRects.get(Number(key));
      if (!firstRect) return;

      const lastRect = el.getBoundingClientRect();
      const deltaX = firstRect.left - lastRect.left;
      const deltaY = firstRect.top - lastRect.top;

      if (Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1) {
        el.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
        el.style.transition = "none";
        animations.push({ el });
      }
    });

    if (animations.length > 0) {
      animationFrameId = requestAnimationFrame(() => {
        animations.forEach(({ el }) => {
          el.style.transition = "transform 0.3s ease";
          el.style.transform = "";
        });
        animationFrameId = null;
      });
    }
  },
);

onUnmounted(() => {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
  }
});
</script>
<style lang="scss" scoped>
.tuc-card-box {
  position: relative;
  display: flex;
  overflow: hidden;
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
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--box-text-2);
  column-gap: 4px;
  font-family: var(--font-title);

  span:last-child {
    color: var(--tgc-od-orange);
  }
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

.tuc-card-list.simple-mode {
  flex-flow: row wrap;
  align-items: flex-start;
  justify-content: flex-start;
  gap: 8px;
}

.tuc-card-item {
  position: relative;
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  justify-content: flex-start;
  column-gap: 8px;
}

.tuc-card-list.simple-mode .tuc-card-item {
  flex-direction: column;
  align-items: center;
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
  border-radius: 4px;
  background-color: var(--box-bg-3);
  cursor: default;
}

.tuc-ci-icon img {
  width: 100%;
  height: 100%;
  filter: invert(1);
  object-fit: cover;
}

.dark .tuc-ci-icon img {
  filter: unset;
}

.tuc-card-name {
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 12px;
  text-align: center;
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
