<!-- 米游社合集排序对话框 -->
<template>
  <v-dialog
    v-model="visible"
    :aria-labelledby="titleId"
    class="cpcs-dialog"
    eager
    max-height="calc(100dvh - 48px)"
    max-width="calc(100vw - 32px)"
    :persistent="props.saving"
    :width="600"
    z-index="80"
  >
    <section class="cpcs-panel">
      <header class="cpcs-header">
        <div class="cpcs-heading">
          <h2 :id="titleId">调整合集排序</h2>
          <p>拖动合集或使用上下按钮调整显示顺序，保存后立即生效。</p>
        </div>
        <v-btn
          aria-label="关闭合集排序"
          :disabled="props.saving"
          icon="mdi-close"
          size="32"
          title="关闭"
          type="button"
          variant="text"
          @click="visible = false"
        />
      </header>

      <div ref="bodyRef" class="cpcs-body">
        <ol v-if="items.length > 0" ref="listRef" aria-label="合集排序列表" class="cpcs-list">
          <li
            v-for="(item, index) in items"
            :key="item.id"
            :class="{
              'is-dragging': dragIndex === index,
              'is-drag-over': dragOverIndex === index && dragIndex !== index,
            }"
            class="cpcs-item"
            @lostpointercapture="handlePointerCancel"
            @pointercancel="handlePointerCancel"
            @pointerdown="handlePointerDown(index, $event)"
            @pointermove="handlePointerMove"
            @pointerup="handlePointerUp"
          >
            <span aria-hidden="true" class="cpcs-handle">
              <v-icon size="18">mdi-drag-vertical</v-icon>
            </span>
            <span aria-hidden="true" class="cpcs-order">{{ index + 1 }}</span>
            <span class="cpcs-cover">
              <TMiImg
                v-if="item.cover"
                :alt="`${item.title}封面`"
                :src="item.cover"
                draggable="false"
              />
              <v-icon v-else aria-hidden="true" size="24">mdi-folder-outline</v-icon>
            </span>
            <span class="cpcs-content">
              <span class="cpcs-title"><TpTitle :text="item.title" /></span>
              <span class="cpcs-meta">{{ fmtUtil.num(item.post_num) }} 篇帖子</span>
            </span>
            <span class="cpcs-actions">
              <v-btn
                :aria-label="`上移${item.title}`"
                :disabled="props.saving || index === 0"
                icon="mdi-arrow-up"
                size="x-small"
                title="上移"
                type="button"
                variant="text"
                @click="moveItem(index, -1)"
              />
              <v-btn
                :aria-label="`下移${item.title}`"
                :disabled="props.saving || index === items.length - 1"
                icon="mdi-arrow-down"
                size="x-small"
                title="下移"
                type="button"
                variant="text"
                @click="moveItem(index, 1)"
              />
            </span>
          </li>
        </ol>
        <div v-else class="cpcs-state" role="status">
          <v-icon size="32">mdi-folder-open-outline</v-icon>
          <p>暂无可排序的合集</p>
        </div>
      </div>

      <div v-if="props.error" aria-live="assertive" class="cpcs-error" role="alert">
        <v-icon size="18">mdi-alert-circle-outline</v-icon>
        <span>{{ props.error }}</span>
      </div>

      <footer class="cpcs-footer">
        <v-btn :disabled="props.saving" type="button" variant="text" @click="visible = false">
          取消
        </v-btn>
        <v-btn
          :disabled="!dirty || props.saving || items.length < 2"
          :loading="props.saving"
          class="cpcs-confirm"
          type="button"
          variant="flat"
          @click="handleSave"
        >
          保存排序
        </v-btn>
      </footer>
    </section>
  </v-dialog>
</template>

<script lang="ts" setup>
import TMiImg from "@comp/app/t-mi-img.vue";
import TpTitle from "@comp/viewPost/tp-title.vue";
import fmtUtil from "@utils/display/fmtUtil.js";
import { computed, onBeforeUnmount, ref, shallowRef, useId, useTemplateRef, watch } from "vue";

/**
 * 合集排序对话框参数。
 * @since Beta v0.13.0
 */
type CollectionSortProps = {
  /** 待排序的完整合集列表 */
  collections: Array<TGApp.BBS.Collection.Collection>;
  /** 是否正在保存 */
  saving: boolean;
  /** 保存失败信息 */
  error: string;
};

const props = defineProps<CollectionSortProps>();
const visible = defineModel<boolean>({ required: true });
const emits = defineEmits<{ save: [ids: Array<number>] }>();
const titleId = useId();
const listRef = useTemplateRef<HTMLOListElement>("listRef");
const bodyRef = useTemplateRef<HTMLElement>("bodyRef");
const items = shallowRef<Array<TGApp.BBS.Collection.Collection>>([]);
const initialIds = ref<string>("");
const dragIndex = ref<number | undefined>();
const dragOverIndex = ref<number | undefined>();
let dragPointerId: number | undefined;
let dragPointerY = 0;
let autoScrollFrame: number | undefined;
const dirty = computed<boolean>(
  () => items.value.map((item) => item.id).join(",") !== initialIds.value,
);

watch(
  visible,
  (isOpen) => {
    if (isOpen) syncItems();
    else resetDrag();
  },
  { immediate: true },
);

watch(
  () => props.collections,
  () => {
    if (visible.value) syncItems();
  },
);

onBeforeUnmount(resetDrag);

function syncItems(): void {
  items.value = props.collections.map((item) => ({ ...item }));
  initialIds.value = items.value.map((item) => item.id).join(",");
  resetDrag();
}

function resetDrag(): void {
  dragIndex.value = undefined;
  dragOverIndex.value = undefined;
  dragPointerId = undefined;
  if (autoScrollFrame !== undefined) {
    window.cancelAnimationFrame(autoScrollFrame);
    autoScrollFrame = undefined;
  }
}

function moveItemTo(from: number, to: number): void {
  if (props.saving || from === to) return;
  const next = [...items.value];
  const [item] = next.splice(from, 1);
  if (item === undefined) return;
  next.splice(to, 0, item);
  items.value = next;
}

function moveItem(index: number, offset: -1 | 1): void {
  if (props.saving) return;
  const target = index + offset;
  if (target < 0 || target >= items.value.length) return;
  moveItemTo(index, target);
}

function handlePointerDown(index: number, event: PointerEvent): void {
  if (props.saving || event.button !== 0 || !event.isPrimary) return;
  const target = event.target;
  if (!(target instanceof Element) || target.closest("button") !== null) return;
  const item = event.currentTarget;
  if (!(item instanceof HTMLElement)) return;
  event.preventDefault();
  resetDrag();
  dragIndex.value = index;
  dragOverIndex.value = index;
  dragPointerId = event.pointerId;
  dragPointerY = event.clientY;
  item.setPointerCapture(event.pointerId);
  autoScrollFrame = window.requestAnimationFrame(autoScrollStep);
}

function handlePointerMove(event: PointerEvent): void {
  if (dragPointerId !== event.pointerId || dragIndex.value === undefined) return;
  dragPointerY = event.clientY;
  updateDropTarget();
}

function handlePointerUp(event: PointerEvent): void {
  if (dragPointerId !== event.pointerId) return;
  const from = dragIndex.value;
  const to = dragOverIndex.value;
  resetDrag();
  if (from === undefined || to === undefined) return;
  moveItemTo(from, to);
}

function handlePointerCancel(event: PointerEvent): void {
  if (dragPointerId !== event.pointerId) return;
  resetDrag();
}

function autoScrollStep(): void {
  if (dragIndex.value === undefined) {
    autoScrollFrame = undefined;
    return;
  }
  const container = bodyRef.value;
  if (container !== null) {
    const rect = container.getBoundingClientRect();
    const edge = 36;
    if (dragPointerY < rect.top + edge) container.scrollTop -= 8;
    else if (dragPointerY > rect.bottom - edge) container.scrollTop += 8;
    updateDropTarget();
  }
  autoScrollFrame = window.requestAnimationFrame(autoScrollStep);
}

function updateDropTarget(): void {
  const from = dragIndex.value;
  const list = listRef.value;
  if (from === undefined || list === null) return;
  const elements = Array.from(list.querySelectorAll<HTMLElement>(".cpcs-item"));
  let insertBefore = elements.length;
  for (let index = 0; index < elements.length; index++) {
    const element = elements[index];
    if (element === undefined) continue;
    const rect = element.getBoundingClientRect();
    if (dragPointerY < rect.top + rect.height / 2) {
      insertBefore = index;
      break;
    }
  }
  dragOverIndex.value = insertBefore > from ? insertBefore - 1 : insertBefore;
}

function handleSave(): void {
  if (!dirty.value || props.saving || items.value.length < 2) return;
  emits(
    "save",
    items.value.map((item) => item.id),
  );
}
</script>

<style lang="scss" scoped>
.cpcs-panel {
  display: flex;
  overflow: hidden;
  width: 100%;
  max-height: calc(100dvh - 48px);
  box-sizing: border-box;
  flex-direction: column;
  border: 1px solid var(--common-shadow-1);
  border-radius: 12px;
  background: var(--box-bg-1);
  color: var(--app-page-content);
}

.cpcs-header {
  display: flex;
  flex: none;
  align-items: flex-start;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid var(--common-shadow-1);
  gap: 16px;

  h2 {
    margin: 0;
    color: var(--common-text-title);
    font-family: var(--font-title);
    font-size: 18px;
    font-weight: normal;
  }

  p {
    margin: 0;
    color: var(--box-text-4);
    font-size: 12px;
    line-height: 18px;
  }
}

.cpcs-heading {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
}

.cpcs-body {
  min-height: 0;
  box-sizing: border-box;
  flex: 1 1 auto;
  padding: 12px 16px;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.cpcs-list {
  display: flex;
  flex-direction: column;
  padding: 0;
  margin: 0;
  gap: 8px;
  list-style: none;
}

.cpcs-item {
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
    cursor: grabbing;
    opacity: 0.5;
  }

  &.is-drag-over {
    border-color: var(--common-text-title);
  }
}

.cpcs-handle {
  display: flex;
  flex: none;
  align-items: center;
  color: var(--box-text-4);
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
}

.cpcs-state {
  display: flex;
  min-height: 160px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--box-text-4);
  gap: 8px;
  text-align: center;

  p {
    margin: 0;
  }
}

.cpcs-error {
  display: flex;
  flex: none;
  align-items: flex-start;
  padding: 8px 16px;
  border-top: 1px solid var(--common-shadow-1);
  color: var(--tgc-od-red);
  font-size: 12px;
  gap: 6px;
  line-height: 18px;
  overflow-wrap: anywhere;

  :deep(.v-icon) {
    flex: none;
  }
}

.cpcs-footer {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: flex-end;
  padding: 12px 16px;
  border-top: 1px solid var(--common-shadow-1);
  gap: 8px;
}

.cpcs-confirm {
  border-radius: 4px;
  background: var(--box-bg-3);
  color: var(--box-text-4);

  &:enabled {
    background: var(--common-text-title);
    color: var(--app-page-bg);
  }
}

@media (width <= 640px) {
  .cpcs-header,
  .cpcs-body,
  .cpcs-footer {
    padding: 12px;
  }

  .cpcs-item {
    gap: 8px;
  }
}
</style>
<style lang="scss">
/* Vuetify 的遮罩由内部节点渲染，需使用全局选择器添加背景模糊 */

.cpcs-dialog .v-overlay__scrim {
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
  background: rgb(0 0 0 / 32%);
  opacity: 1;
}
</style>
