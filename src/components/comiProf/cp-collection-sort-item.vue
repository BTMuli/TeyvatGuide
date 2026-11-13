<!-- 合集排序列表项 -->
<template>
  <li
    :class="{
      'is-dragging': props.dragging,
      'is-drop-before': props.dropBefore,
      'is-drop-after': props.dropAfter,
    }"
    class="cpcs-item"
  >
    <span aria-hidden="true" class="cpcs-handle">
      <v-icon size="18">mdi-drag-vertical</v-icon>
    </span>
    <span aria-hidden="true" class="cpcs-order">{{ props.index + 1 }}</span>
    <span class="cpcs-cover">
      <TMiImg
        v-if="props.item.cover"
        :alt="`${props.item.title}封面`"
        :src="props.item.cover"
        draggable="false"
      />
      <v-icon v-else aria-hidden="true" size="24">mdi-folder-outline</v-icon>
    </span>
    <span class="cpcs-content">
      <span class="cpcs-title"><TpTitle :text="props.item.title" /></span>
      <span class="cpcs-meta">{{ fmtUtil.num(props.item.post_num) }} 篇帖子</span>
    </span>
    <span class="cpcs-actions">
      <v-btn
        :aria-label="`上移${props.item.title}`"
        :disabled="props.disabled || props.index === 0"
        icon="mdi-arrow-up"
        size="x-small"
        title="上移"
        type="button"
        variant="text"
        @click="emits('move', -1)"
      />
      <v-btn
        :aria-label="`下移${props.item.title}`"
        :disabled="props.disabled || props.index === props.total - 1"
        icon="mdi-arrow-down"
        size="x-small"
        title="下移"
        type="button"
        variant="text"
        @click="emits('move', 1)"
      />
    </span>
  </li>
</template>

<script lang="ts" setup>
import TMiImg from "@comp/app/t-mi-img.vue";
import TpTitle from "@comp/viewPost/tp-title.vue";
import fmtUtil from "@utils/display/fmtUtil.js";

/**
 * 合集排序列表项参数。
 * @since Beta v0.13.1
 */
type CollectionSortItemProps = {
  /** 合集信息 */
  item: TGApp.BBS.Collection.Collection;
  /** 当前序号，从 0 开始 */
  index: number;
  /** 列表总数 */
  total: number;
  /** 是否正在保存 */
  disabled: boolean;
  /** 是否正在拖拽 */
  dragging: boolean;
  /** 是否插入到该项之前 */
  dropBefore: boolean;
  /** 是否插入到该项之后 */
  dropAfter: boolean;
};

type CollectionSortItemEmits = {
  /** 请求上移或下移 */
  move: [offset: -1 | 1];
};

const props = defineProps<CollectionSortItemProps>();
const emits = defineEmits<CollectionSortItemEmits>();
</script>

<style lang="scss" scoped>
.cpcs-item {
  position: relative;
  display: flex;
  min-width: 0;
  align-items: center;
  padding: 10px 12px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--box-bg-2);
  cursor: grab;
  gap: 12px;
  transition:
    border-color 120ms ease,
    background-color 120ms ease;
  user-select: none;

  &:hover {
    background: var(--box-bg-3);
  }

  &.is-dragging {
    border-style: dashed;
    cursor: grabbing;
    opacity: 0.45;
  }

  &.is-drop-before::before,
  &.is-drop-after::after {
    position: absolute;
    left: 0;
    width: 100%;
    height: 2px;
    border-radius: 1px;
    background: var(--common-text-title);
    content: "";
    pointer-events: none;
  }

  &.is-drop-before::before {
    top: -5px;
  }

  &.is-drop-after::after {
    bottom: -5px;
  }
}

.cpcs-handle {
  display: flex;
  flex: none;
  align-items: center;
  color: var(--box-text-4);
  cursor: grab;
  touch-action: none;
}

.cpcs-order {
  display: flex;
  width: 24px;
  height: 24px;
  flex: none;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--box-bg-3);
  color: var(--box-text-4);
  font-size: 12px;
  line-height: 24px;
}

.cpcs-item:hover .cpcs-order {
  background: var(--box-bg-1);
}

.dark .cpcs-item:hover .cpcs-order {
  background: var(--box-bg-4);
}

.cpcs-cover {
  display: flex;
  overflow: hidden;
  width: 48px;
  height: 48px;
  flex: none;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  background: var(--box-bg-1);
  color: var(--box-text-4);

  :deep(img) {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.cpcs-content {
  display: flex;
  min-width: 0;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 2px;
}

.cpcs-title {
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 15px;
  font-weight: normal;
  overflow-wrap: anywhere;
}

.cpcs-meta {
  color: var(--box-text-4);
  font-size: 12px;
}

.cpcs-actions {
  display: flex;
  flex: none;
  align-items: center;
  gap: 2px;

  :deep(.v-btn) {
    width: 24px;
    height: 24px;
  }
}

@media (width <= 640px) {
  .cpcs-item {
    gap: 8px;
  }
}
</style>
