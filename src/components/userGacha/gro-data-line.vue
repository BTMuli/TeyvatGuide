<!-- 祈愿数据项展示行 -->
<template>
  <div :class="{ 'gro-dl-box--grid': props.gridMode }" :title="recordTitle" class="gro-dl-box">
    <div v-if="!props.gridMode" class="gro-dl-progress" />
    <div class="gro-dl-main">
      <div
        :style="{ backgroundImage: `url(/icon/bg/${props.data.rank}-Star.webp)` }"
        class="gro-dl-icon"
      >
        <img :alt="props.data.name" :src="getIcon()" decoding="async" loading="lazy" />
      </div>
      <div class="gro-dl-base">
        <div :title="props.gridMode ? undefined : props.data.name" class="gro-dl-name">
          {{ props.data.name }}
        </div>
        <div v-if="!props.gridMode" :title="props.data.time" class="gro-dl-time">
          {{ props.data.time }}
        </div>
      </div>
    </div>
    <div v-if="props.gridMode" class="gro-dl-footer">
      <div class="gro-dl-progress--grid">
        <div class="gro-dl-progress-fill" />
      </div>
      <span :aria-label="`抽数：${props.count}`" class="gro-dl-count-badge">
        {{ props.count }}
      </span>
    </div>
    <div class="gro-dl-info">
      <div v-if="!props.gridMode" class="gro-dl-cnt">{{ props.count }}</div>
      <div v-if="props.isUp !== undefined" class="gro-dl-hint">{{ props.isUp ? "UP" : "歪" }}</div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { getWikiBrief } from "@utils/common/toolFunc.js";
import { computed } from "vue";

/**
 * 祈愿数据项展示行组件参数
 * @since Beta v0.13.0
 */
export type GroDataLineProps = {
  /* 原始数据 */
  data: TGApp.Sqlite.Gacha.Gacha;
  /* 抽数 */
  count: number;
  /* 是否是 Up */
  isUp: boolean | undefined;
  /* 是否使用网格布局 */
  gridMode?: boolean;
};

const props = defineProps<GroDataLineProps>();

const recordTitle = computed<string | undefined>(() =>
  props.gridMode ? `${props.data.name}\n${props.data.time}` : undefined,
);

function getIcon(): string {
  const find = getWikiBrief(props.data.itemId);
  if (!find) return `/UI/nav/paimon.webp`;
  if ("element" in find) return `/WIKI/character/${props.data.itemId}.webp`;
  return `/WIKI/weapon/${props.data.itemId}.webp`;
}

const progressColor = computed<string>(() => {
  if (props.isUp === undefined) return "#61afef";
  if (props.isUp && props.data.rank === "5") return "#d19a66";
  if (props.isUp && props.data.rank === "4") return "#c678dd";
  if (!props.isUp) return "#e06c75";
  return "#61afef";
});
const progressWidth = computed<string>(() => {
  if (props.data.rank === "5") {
    if (props.data.gachaType === "302") return ((props.count / 80) * 100).toFixed(2) + "%";
    return ((props.count / 90) * 100).toFixed(2) + "%";
  }
  if (props.data.rank === "4") return ((props.count / 10) * 100).toFixed(2) + "%";
  return "0%";
});
</script>
<style lang="scss" scoped>
.gro-dl-box {
  position: relative;
  display: flex;
  width: 100%;
  height: 48px;
  box-sizing: border-box;
  align-items: center;
  justify-content: flex-start;
  padding: 8px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
  background: var(--box-bg-2);
  column-gap: 4px;
}

.gro-dl-box--grid {
  overflow: hidden;
  height: 96px;
  flex-direction: column;
  align-items: stretch;
  justify-content: flex-start;
  padding: 8px;
  isolation: isolate;
}

.gro-dl-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  width: v-bind(progressWidth); /* stylelint-disable-line value-keyword-case */
  max-width: 100%;
  height: 4px;
  border-radius: 4px;
  background: v-bind(progressColor); /* stylelint-disable-line value-keyword-case */
}

.gro-dl-icon {
  display: flex;
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  background-position: center;
  background-size: cover;

  img {
    width: 100%;
    height: 100%;
    border-radius: inherit;
  }
}

.gro-dl-main {
  display: contents;
}

.gro-dl-base {
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
}

.gro-dl-name {
  overflow: hidden;
  max-width: 100%;
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 14px;
  font-weight: normal;
  line-height: 18px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gro-dl-time {
  color: var(--box-text-7);
  font-size: 12px;
  line-height: 14px;
}

.gro-dl-info {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: auto;
  column-gap: 4px;
}

.gro-dl-cnt {
  color: var(--common-text-title);
  font-family: var(--font-title);
}

.gro-dl-hint {
  display: flex;
  width: 32px;
  height: 32px;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border-radius: 50%;
  background: var(--box-bg-3);
  color: v-bind(progressColor); /* stylelint-disable-line value-keyword-case */
  font-family: var(--font-title);
  transform: rotate(25deg);
}

.gro-dl-box--grid .gro-dl-icon {
  position: relative;
  width: 48px;
  height: 48px;
  align-self: center;
}

.gro-dl-count-badge {
  position: absolute;
  z-index: 1;
  top: 50%;
  left: clamp(0%, v-bind("progressWidth"), 100%);
  display: flex;
  width: 16px;
  height: 16px;
  box-sizing: border-box;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 1px solid v-bind(progressColor); /* stylelint-disable-line value-keyword-case */
  border-radius: 50%;
  background: color-mix(in srgb, var(--box-bg-1) 60%, transparent);
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 9px;
  font-weight: normal;
  line-height: 16px;
  transform: translate(-50%, -50%);
}

.gro-dl-box--grid .gro-dl-base {
  width: 100%;
  align-items: center;
}

.gro-dl-box--grid .gro-dl-main {
  position: relative;
  z-index: 1;
  display: flex;
  min-width: 0;
  flex-direction: column;
  flex-shrink: 0;
  align-items: center;
}

.gro-dl-box--grid .gro-dl-name {
  width: 100%;
  text-align: center;
}

.gro-dl-footer {
  position: relative;
  z-index: 1;
  display: flex;
  width: calc(100% - 16px);
  min-width: 0;
  height: 16px;
  flex-shrink: 0;
  align-items: center;
  margin: auto 8px 0;
}

.gro-dl-progress--grid {
  position: relative;
  overflow: hidden;
  width: 100%;
  max-width: 100%;
  height: 4px;
  flex-shrink: 0;
  border-radius: 4px;
  background: var(--box-bg-3);
}

.gro-dl-progress-fill {
  width: v-bind(progressWidth); /* stylelint-disable-line value-keyword-case */
  max-width: 100%;
  height: 100%;
  border-radius: inherit;
  background: v-bind(progressColor); /* stylelint-disable-line value-keyword-case */
}

.gro-dl-box--grid .gro-dl-info {
  display: contents;
}

.gro-dl-box--grid .gro-dl-hint {
  position: absolute;
  z-index: 0;
  top: -6px;
  right: -6px;
  width: 32px;
  height: 32px;
  padding: 4px;
  font-size: 16px;
  font-weight: normal;
  opacity: 0.45;
  pointer-events: none;
}
</style>
