<!-- 剧诗，辉彩祝福 -->
<template>
  <div ref="containerRef" :class="['tuc-buff-box', { 'simple-mode': props.simpleMode }]">
    <div class="tuc-buff-title">
      <span>辉彩祝福</span>
      <span v-if="props.simpleMode">Lv.{{ props.modelValue.summary.total_level }}</span>
    </div>
    <div :class="{ 'simple-mode': props.simpleMode }" class="tuc-buff-list">
      <div :class="{ 'is-summary': true }" :data-key="'summary'" class="tuc-buff-item">
        <div class="tuc-buff-summary">
          <div
            :title="
              props.simpleMode ? `辉彩祝福 Lv.${props.modelValue.summary.total_level}` : undefined
            "
            class="tuc-buff-icon"
          >
            <img :src="crownIcon" alt="total" class="summary" />
            <span v-if="props.simpleMode" class="tuc-buff-level-badge">
              {{ props.modelValue.summary.total_level }}
            </span>
          </div>
          <div v-show="!props.simpleMode" class="tuc-buff-desc">
            <span>辉彩祝福</span>
            <span>Lv.{{ props.modelValue.summary.total_level }}</span>
          </div>
          <span v-if="props.simpleMode" class="tuc-buff-name">辉彩祝福</span>
        </div>
        <div
          v-show="!props.simpleMode"
          class="tuc-buff-total"
          v-html="getBuffDesc(props.modelValue.summary.desc)"
        />
      </div>
      <div
        v-for="buff in props.modelValue.buffs"
        :key="buff.icon"
        :data-key="buff.icon"
        class="tuc-buff-item"
      >
        <div class="tuc-buff-summary">
          <div
            :title="props.simpleMode ? `${buff.name} Lv.${buff.level}` : undefined"
            class="tuc-buff-icon"
          >
            <img :alt="buff.name" :src="buff.icon" />
            <span v-if="props.simpleMode" class="tuc-buff-level-badge">
              {{ buff.level }}
            </span>
          </div>
          <div v-show="!props.simpleMode" class="tuc-buff-desc">
            <span>{{ buff.name }}</span>
            <span>Lv.{{ buff.level }}</span>
          </div>
          <span v-if="props.simpleMode" class="tuc-buff-name">{{ buff.name }}</span>
        </div>
        <div v-show="!props.simpleMode" class="tuc-buff-detail">
          <div v-for="(effect, eIdx) in buff.level_effect" :key="eIdx" class="tuc-effect-item">
            <div class="tuc-effect-title">
              <img :src="effect.icon" alt="icon" />
              <span v-html="parseHtmlText(effect.name)" />
            </div>
            <span class="tuc-effect-desc" v-html="getEffectDesc(effect.desc)" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import useAppStore from "@store/app.js";
import { storeToRefs } from "pinia";
import { computed, nextTick, onUnmounted, ref, watch } from "vue";

import { parseHtmlText } from "@utils/toolFunc.js";

type TucBuffBoxProps = {
  modelValue: TGApp.Game.Combat.SplendourBuff;
  simpleMode?: boolean;
};

const props = defineProps<TucBuffBoxProps>();

const appStore = useAppStore();
const { theme } = storeToRefs(appStore);
const isDark = computed<boolean>(() => theme.value === "dark");
const crownIcon = computed<string>(() =>
  isDark.value ? "/UI/combat/combatCrown2.webp" : "/UI/combat/combatCrown.webp",
);

const containerRef = ref<HTMLDivElement>();
let animationFrameId: number | null = null;

function getBuffDesc(desc: string): string {
  return parseHtmlText(desc.replaceAll("点，", "点，\n"));
}

function getEffectDesc(desc: string): string {
  return parseHtmlText(desc.replaceAll("；", "；\n")).replaceAll("\n<br />", "<br />");
}

watch(
  () => props.simpleMode,
  async (newVal, oldVal) => {
    if (oldVal === undefined || !containerRef.value) return;

    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }

    const items = containerRef.value.querySelectorAll<HTMLDivElement>(".tuc-buff-item");

    const firstRects = new Map<string, DOMRect>();
    items.forEach((el) => {
      const key = el.dataset.key;
      if (key) {
        firstRects.set(key, el.getBoundingClientRect());
      }
    });

    await nextTick();

    const animations: Array<{ el: HTMLDivElement }> = [];

    items.forEach((el) => {
      const key = el.dataset.key;
      if (!key) return;

      const firstRect = firstRects.get(key);
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
<style lang="css" scoped>
.tuc-buff-box {
  position: relative;
  display: flex;
  overflow: hidden;
  width: 100%;
  box-sizing: border-box;
  flex: 2;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  padding: 8px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
  background: var(--box-bg-2);
  row-gap: 8px;
}

.tuc-buff-box.simple-mode {
  flex: 1;
}

.tuc-buff-title {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--box-text-2);
  column-gap: 4px;
  font-family: var(--font-title);

  span:last-child:not(:first-child) {
    margin-left: 4px;
    color: var(--tgc-od-orange);
  }
}

.tuc-buff-list {
  display: flex;
  width: 100%;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  row-gap: 8px;
}

.tuc-buff-list.simple-mode {
  flex-flow: row wrap;
  align-items: flex-start;
  justify-content: flex-start;
  gap: 8px;
}

.tuc-buff-item {
  position: relative;
  display: flex;
  width: 100%;
  flex-direction: row;
  align-items: flex-start;
  justify-content: flex-start;
  column-gap: 8px;
}

.tuc-buff-list.simple-mode .tuc-buff-item {
  width: auto;
  flex-direction: column;
  align-items: center;
}

.tuc-buff-summary {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  row-gap: 4px;
}

.tuc-buff-icon {
  position: relative;
  width: 60px;
  height: 60px;
  flex-shrink: 0;
  padding: 4px;
  border-radius: 4px;
  background-color: var(--box-bg-3);
  cursor: default;
}

.tuc-buff-icon img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.tuc-buff-level-badge {
  position: absolute;
  right: 0;
  bottom: 0;
  padding: 1px 4px;
  background-color: var(--tgc-od-orange);
  border-bottom-right-radius: 4px;
  border-top-left-radius: 4px;
  color: white;
  font-size: 10px;
  font-weight: bold;
}

.tuc-buff-name {
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 12px;
  text-align: center;
}

.tuc-buff-desc {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  font-family: var(--font-title);
  font-size: 10px;
}

.tuc-buff-detail {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
}

.tuc-buff-total {
  font-size: 12px;
  white-space: pre-wrap;
}

.tuc-effect-item {
  display: flex;
  flex-direction: column;
}

.tuc-effect-title {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  column-gap: 4px;
  font-family: var(--font-title);
  font-size: 12px;
}

.tuc-effect-title img {
  width: 16px;
  height: 16px;
  filter: invert(0.6);
}

.dark .tuc-effect-title img {
  filter: unset;
}

.tuc-effect-desc {
  position: relative;
  display: block;
  font-size: 10px;
  white-space: pre-wrap;
}
</style>
