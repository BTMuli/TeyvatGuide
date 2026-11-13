<!-- 头像框与评论装扮的选择卡片 -->
<template>
  <button
    :aria-label="props.ariaText"
    :aria-pressed="props.selected"
    :class="{ 'is-locked': !props.owned, 'is-selected': props.selected }"
    class="cpdi-item"
    type="button"
    @click="emits('select')"
  >
    <span
      :class="`is-${props.shape}`"
      :style="props.background ? { backgroundColor: props.background } : undefined"
      class="cpdi-visual"
    >
      <slot />
      <span v-if="props.inUse" class="cpdi-in-use">使用中</span>
      <span v-if="!props.owned" aria-hidden="true" class="cpdi-lock">
        <v-icon size="12">mdi-lock</v-icon>
      </span>
      <span v-if="props.limited" class="cpdi-limit">限时</span>
    </span>
    <span :class="{ 'is-locked': !props.owned }" class="cpdi-name">{{ props.name }}</span>
  </button>
</template>

<script lang="ts" setup>
/**
 * 装扮选择卡片参数。
 * @since Beta v0.13.1
 */
type DecorationItemProps = {
  /** 装扮名称 */
  name: string;
  /** 无障碍标签 */
  ariaText: string;
  /** 是否已拥有 */
  owned: boolean;
  /** 是否选中 */
  selected: boolean;
  /** 是否使用中 */
  inUse: boolean;
  /** 是否限时 */
  limited: boolean;
  /** 预览区形状 */
  shape?: "square" | "wide";
  /** 预览区背景色 */
  background?: string;
};

type DecorationItemEmits = {
  /** 选择当前装扮 */
  select: [];
};

const props = withDefaults(defineProps<DecorationItemProps>(), {
  shape: "square",
});
const emits = defineEmits<DecorationItemEmits>();
</script>

<style lang="scss" scoped>
.cpdi-item {
  display: flex;
  overflow: hidden;
  min-width: 0;
  box-sizing: border-box;
  flex-direction: column;
  align-items: center;
  padding: 8px;
  border: 1px solid transparent;
  border-radius: 8px;
  margin: 0;
  background: transparent;
  color: var(--app-page-content);
  cursor: pointer;
  font: inherit;
  gap: 6px;
  text-align: center;
  transition:
    border-color 120ms ease,
    background-color 120ms ease;

  &:hover:where(:enabled) {
    background: var(--box-bg-2);
  }

  &:focus-visible {
    outline: 2px solid var(--common-text-title);
    outline-offset: 2px;
  }

  &.is-selected {
    border-color: var(--common-text-title);
    background: var(--box-bg-2);
  }
}

.cpdi-visual {
  position: relative;
  display: block;
  overflow: hidden;
  width: 100%;
  box-sizing: border-box;

  &.is-square {
    aspect-ratio: 1;
  }

  &.is-wide {
    display: flex;
    min-height: 40px;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    aspect-ratio: 4 / 1;
    background: var(--box-bg-2);
    color: var(--common-text-title);
    font-size: 12px;
    overflow-wrap: anywhere;
    text-align: center;
  }
}

.cpdi-item.is-locked .cpdi-visual {
  opacity: 0.45;
}

.cpdi-name {
  overflow: hidden;
  max-width: 100%;
  color: var(--common-text-title);
  font-size: 12px;
  line-height: 16px;
  text-overflow: ellipsis;
  white-space: nowrap;

  &.is-locked {
    color: var(--box-text-4);
  }
}

.cpdi-limit {
  position: absolute;
  top: 2px;
  left: 2px;
  padding: 0 4px;
  border-radius: 2px;
  background: var(--box-bg-3);
  color: var(--box-text-4);
  font-size: 10px;
  line-height: 16px;
}

.cpdi-in-use {
  position: absolute;
  top: 2px;
  right: 2px;
  padding: 0 4px;
  border-radius: 2px;
  background: var(--box-bg-3);
  color: var(--common-text-title);
  font-size: 10px;
  line-height: 16px;
}

.cpdi-lock {
  position: absolute;
  right: 2px;
  bottom: 2px;
  display: flex;
  width: 20px;
  height: 20px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--box-bg-3);
  color: var(--box-text-4);
}
</style>
