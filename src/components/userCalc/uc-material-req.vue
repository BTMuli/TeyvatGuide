<!-- 养成计算-材料需求项 -->
<template>
  <article
    :aria-disabled="interactive ? undefined : true"
    :class="{
      highlight,
      missing: showMetrics && material.missing > 0,
      ready: showMetrics && weakenReady && material.missing === 0,
      simple: !showMetrics,
      static: !interactive,
    }"
    class="ucmr-item"
    :role="interactive ? 'button' : undefined"
    :tabindex="interactive ? 0 : undefined"
    :title="interactive ? '查看材料详情' : undefined"
    @click="onSelect"
    @keydown.enter="onSelect"
    @keydown.space.prevent="onSelect"
  >
    <div class="ucmr-icon">
      <img :src="`/icon/bg/${material.star}-Star.webp`" alt="background" />
      <img :src="`/icon/material/${material.id}.webp`" :alt="material.name" />
    </div>
    <div class="ucmr-info">
      <div class="ucmr-text">
        <div class="ucmr-heading">
          <strong>{{ material.name }}</strong>
          <UcMaterialCount
            v-if="showMetrics"
            class="ucmr-count"
            :complete="material.missing === 0"
            :craftable="material.craftable"
            :current="material.owned"
            :required="material.required"
          />
        </div>
        <div class="ucmr-meta">{{ material.type }}</div>
      </div>
      <v-progress-linear
        v-if="showMetrics"
        :color="material.missing > 0 ? 'var(--tgc-od-red)' : 'var(--tgc-od-green)'"
        :model-value="material.progress"
        height="3"
        rounded
      />
    </div>
  </article>
</template>

<script lang="ts" setup>
import UcMaterialCount from "@comp/userCalc/uc-material-count.vue";

type UcMaterialReqProps = {
  /** 强调高亮（如当日可刷）：左侧加粗描边 */
  highlight?: boolean;
  /** 是否可点击打开详情；日历等只读场景传 false */
  interactive?: boolean;
  material: TGApp.App.UserCalc.ResultMaterial;
  /** 是否展示持有/需求计数与进度条；日历普通条目可关 */
  showMetrics?: boolean;
  weakenReady?: boolean;
};

type UcMaterialReqEmits = { select: [] };

const {
  highlight = false,
  interactive = true,
  showMetrics = true,
  weakenReady = false,
} = defineProps<UcMaterialReqProps>();
const emits = defineEmits<UcMaterialReqEmits>();

function onSelect(): void {
  if (!interactive) return;
  emits("select");
}
</script>

<style lang="scss" scoped>
.ucmr-item {
  display: flex;
  overflow: hidden;
  min-width: 0;
  height: 48px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
  background: var(--common-shadow-t-1);
  cursor: pointer;
  transition: opacity 160ms ease;

  &:focus-visible {
    outline: 2px solid var(--tgc-od-blue);
    outline-offset: -2px;
  }

  &.missing {
    border-color: var(--tgc-od-red);
    border-left-width: 3px;
  }

  &.highlight {
    border-color: var(--tgc-od-orange);
    border-left-width: 3px;
  }

  &.ready {
    opacity: 0.56;
  }

  &.static {
    cursor: default;
  }
}

.ucmr-icon {
  position: relative;
  width: 48px;
  height: 48px;
  flex: 0 0 48px;
  background: var(--common-shadow-t-2);

  img {
    position: absolute;
    width: 100%;
    height: 100%;
    inset: 0;
  }

  img:first-child {
    object-fit: cover;
  }

  img:last-child {
    object-fit: contain;
  }
}

.ucmr-info {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  justify-content: space-between;
  padding: 5px 8px;
  gap: 0;
}

.ucmr-item.simple .ucmr-info {
  justify-content: center;
}

.ucmr-text {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 0;
}

.ucmr-heading {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  line-height: 16px;

  > strong {
    overflow: hidden;
    color: var(--box-text-4);
    font-family: var(--font-title);
    font-size: 13px;
    font-weight: normal;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.ucmr-count {
  font-size: 11px;
}

.ucmr-meta {
  overflow: hidden;
  color: var(--box-text-4);
  font-size: 10px;
  opacity: 0.72;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
