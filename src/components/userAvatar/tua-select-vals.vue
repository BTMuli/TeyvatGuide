<!-- 筛选&&排序条件展示 -->
<template>
  <div v-if="props.isSelected || isOrdered" class="tua-sv-container">
    <div v-if="props.isSelected" class="tua-sv-selects">
      <div class="tua-sv-title">筛选</div>
      <div
        v-if="props.selectOpts.costume.length === 1"
        :class="props.selectOpts.costume[0] === 'true' ? 'pass' : 'ban'"
        class="tua-svs-item"
      >
        <v-icon size="14">mdi-tshirt-crew</v-icon>
        <v-icon v-if="props.selectOpts.costume[0] === 'false'" size="14">mdi-block-helper</v-icon>
      </div>
      <div
        v-if="props.selectOpts.fetter.length === 1"
        :class="props.selectOpts.fetter[0] === 'true' ? 'pass' : 'ban'"
        class="tua-svs-item"
      >
        <span>好感:{{ getFetterLabel(props.selectOpts.fetter[0]) }}</span>
      </div>
      <div v-if="props.selectOpts.star.length === 1" class="tua-svs-item">
        <span>{{ getStarLabel(props.selectOpts.star[0]) }}</span>
      </div>
      <div
        v-if="props.selectOpts.level.length === 1"
        :class="props.selectOpts.level[0] === 'true' ? 'pass' : 'ban'"
        class="tua-svs-item"
      >
        <span>等级:{{ getLevelLabel(props.selectOpts.level[0]) }}</span>
      </div>
      <div
        v-if="props.selectOpts.weapon.length > 0 && props.selectOpts.weapon.length < FULL_WEAPON"
        class="tua-svs-item weapon"
      >
        <img
          v-for="(weapon, idx) in props.selectOpts.weapon"
          :key="idx"
          :alt="weapon"
          :src="`/icon/weapon/${weapon}.webp`"
        />
      </div>
      <div
        v-if="props.selectOpts.element.length > 0 && props.selectOpts.element.length < FULL_ELEMENT"
        class="tua-svs-item"
      >
        <img
          v-for="(element, idx) in props.selectOpts.element"
          :key="idx"
          :alt="element"
          :src="`/icon/element/${element}元素.webp`"
        />
      </div>
      <div
        v-if="props.selectOpts.area.length > 0 && props.selectOpts.area.length < FULL_AREA"
        class="tua-svs-item"
      >
        <span>地区：</span>
        <span v-for="(area, idx) in props.selectOpts.area" :key="idx">{{ area }}</span>
      </div>
    </div>
    <div v-if="isOrdered" class="tua-sv-order">
      <div class="tua-sv-title">排序</div>
      <div
        v-if="props.isLevelUp !== null"
        :class="props.isLevelUp ? 'up' : 'down'"
        class="tua-svo-item"
      >
        <span>等级</span>
        <span>{{ props.isLevelUp ? "↑" : "↓" }}</span>
      </div>
      <div
        v-if="props.isFetterUp !== null"
        :class="props.isFetterUp ? 'up' : 'down'"
        class="tua-svo-item"
      >
        <span>好感</span>
        <span>{{ props.isFetterUp ? "↑" : "↓" }}</span>
      </div>
      <div
        v-if="props.isConstUp !== null"
        :class="props.isConstUp ? 'up' : 'down'"
        class="tua-svo-item"
      >
        <span>命座</span>
        <span>{{ props.isConstUp ? "↑" : "↓" }}</span>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { computed } from "vue";

import type { UavSelectModel } from "./uav-select.vue";

type TuaSelectValsProps = {
  isLevelUp: boolean | null;
  isFetterUp: boolean | null;
  isConstUp: boolean | null;
  isSelected: boolean;
  selectOpts: UavSelectModel;
};

const FULL_WEAPON: Readonly<number> = 5;
const FULL_ELEMENT: Readonly<number> = 7;
const FULL_AREA: Readonly<number> = 14;

const props = defineProps<TuaSelectValsProps>();

const isOrdered = computed<boolean>(() => {
  return !(props.isLevelUp === null && props.isFetterUp === null && props.isConstUp === null);
});

function getFetterLabel(fetter: string): string {
  if (fetter === "true") return "已满";
  return "未满";
}

function getStarLabel(star: string): string {
  if (star === "4") return "⭐⭐⭐⭐";
  return "⭐⭐⭐⭐⭐";
}

function getLevelLabel(level: string): string {
  if (level === "true") return "≥70";
  return "<70";
}
</script>
<style lang="scss" scoped>
@use "@styles/github.styles.scss" as github-styles;

.tua-sv-container {
  position: relative;
  display: flex;
  width: 100%;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  row-gap: 8px;
}

.tua-sv-title {
  color: var(--common-text-title);
  font-family: var(--font-title);
}

.tua-sv-selects {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 4px 12px;
}

.tua-svs-item {
  @include github-styles.github-tag-dark-gen(#61afef);

  position: relative;
  display: flex;
  height: 20px;
  align-items: center;
  justify-content: center;
  padding: 0 8px;
  border-radius: 12px;
  column-gap: 4px;
  font-size: 12px;
  line-height: 20px;

  &.pass {
    @include github-styles.github-tag-dark-gen(#98c379);
  }

  &.ban {
    @include github-styles.github-tag-dark-gen(#e06c75);
  }

  &.weapon {
    img {
      filter: invert(0.5);
    }
  }

  img {
    width: 16px;
    height: 16px;
    object-fit: contain;
  }

  & + .tua-svs-item {
    margin-left: -4px;
  }
}

.dark .tua-svs-item {
  &.weapon {
    img {
      filter: unset;
    }
  }
}

.tua-sv-order {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  column-gap: 12px;
}

.tua-svo-item {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 8px;
  border-radius: 12px;
  column-gap: 4px;
  font-size: 12px;
  line-height: 20px;

  &.down {
    @include github-styles.github-tag-dark-gen(#98c379);
  }

  &.up {
    @include github-styles.github-tag-dark-gen(#e06c75);
  }

  & + .tua-svo-item {
    margin-left: -4px;
  }
}
</style>
