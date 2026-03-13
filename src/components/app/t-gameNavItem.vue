<!-- 版块组件项 -->
<template>
  <div :title="props.label" class="tgni-box">
    <slot name="icon"></slot>
    <span v-show="!props.mini" ref="TgniLabelRef">{{ props.label }}</span>
  </div>
</template>
<script lang="ts" setup>
import { computed, useTemplateRef } from "vue";

type TGameNavItemProps = { label: string; mini: boolean };

const props = defineProps<TGameNavItemProps>();
const labelEl = useTemplateRef<HTMLSpanElement>("TgniLabelRef");
const width = computed<string>(() => {
  if (!labelEl.value || props.mini) return "38px";
  return `${labelEl.value.clientWidth + 42}px`;
});
</script>
<style lang="scss" scoped>
@use "@styles/github.styles.scss" as github-styles;

.tgni-box {
  position: relative;
  display: flex;
  overflow: hidden;
  width: 38px;
  flex-wrap: nowrap;
  align-items: center;
  justify-content: flex-start;
  padding: 4px;
  border-radius: 4px;
  color: var(--tgc-white-1);
  column-gap: 4px;
  cursor: pointer;
  transition: width ease-in-out 0.5s;

  span {
    color: var(--common-text-title);
    font-family: var(--font-title);
    font-size: 16px;
    white-space: nowrap;
  }

  &:hover {
    width: v-bind(width);
    transition: width ease-in-out 0.5s;
  }
}
</style>
