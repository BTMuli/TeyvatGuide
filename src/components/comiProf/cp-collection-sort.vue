<!-- 米游社合集排序对话框 -->
<template>
  <TopOverlay
    v-model="visible"
    :closeDisabled="props.saving"
    :showShare="false"
    :titleId="titleId"
    blurVal="10px"
    closeAriaLabel="关闭合集排序"
    contentMaxHeight="none"
    panelMaxHeight="calc(100dvh - 48px)"
    panelWidth="600px"
  >
    <template #header>
      <div class="cpcs-heading">
        <h2 :id="titleId">调整合集排序</h2>
        <p>拖动合集或使用上下按钮调整显示顺序，保存后立即生效。</p>
      </div>
    </template>

    <div ref="bodyRef" class="cpcs-body">
      <ol v-if="items.length > 0" ref="listRef" aria-label="合集排序列表" class="cpcs-list">
        <TransitionGroup name="cpcs">
          <CpCollectionSortItem
            v-for="(item, index) in items"
            :key="item.id"
            :disabled="props.saving"
            :dragging="dragIndex === index"
            :drop-after="dropIndex === index && dropAfter"
            :drop-before="dropIndex === index && !dropAfter"
            :index
            :item
            :total="items.length"
            @lostpointercapture="handlePointerCancel"
            @move="moveItem(index, $event)"
            @pointercancel="handlePointerCancel"
            @pointerdown="handlePointerDown(index, $event)"
            @pointermove="handlePointerMove"
            @pointerup="handlePointerUp"
          />
        </TransitionGroup>
      </ol>
      <TStatePanel
        v-else
        icon="mdi-folder-open-outline"
        message="暂无可排序的合集"
        variant="empty"
      />
    </div>

    <div v-if="props.error" aria-live="assertive" class="cpcs-error" role="alert">
      <v-icon size="18">mdi-alert-circle-outline</v-icon>
      <span>{{ props.error }}</span>
    </div>

    <template #footer>
      <div class="cpcs-footer-actions">
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
      </div>
    </template>
  </TopOverlay>
</template>

<script lang="ts" setup>
import TStatePanel from "@comp/app/t-state-panel.vue";
import TopOverlay from "@comp/app/top-overlay.vue";
import CpCollectionSortItem from "@comp/comiProf/cp-collection-sort-item.vue";
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
let dragPointerX = 0;
let dragPointerY = 0;
let ghostElement: HTMLElement | undefined;
let ghostOffsetX = 0;
let ghostOffsetY = 0;
let autoScrollFrame: number | undefined;
const dirty = computed<boolean>(
  () => items.value.map((item) => item.id).join(",") !== initialIds.value,
);
const dropIndex = computed<number | undefined>(() => {
  const from = dragIndex.value;
  const to = dragOverIndex.value;
  if (from === undefined || to === undefined || from === to) return undefined;
  return to;
});
const dropAfter = computed<boolean>(() => {
  const from = dragIndex.value;
  const to = dropIndex.value;
  return from !== undefined && to !== undefined && to > from;
});

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
  ghostElement?.remove();
  ghostElement = undefined;
  if (autoScrollFrame !== undefined) {
    window.cancelAnimationFrame(autoScrollFrame);
    autoScrollFrame = undefined;
  }
}

/**
 * 克隆拖拽源作为跟手浮层，重新挂载会让封面图与表情标题空一帧
 * @since Beta v0.13.0
 */
function createGhost(item: HTMLElement): void {
  const cloned = item.cloneNode(true);
  if (!(cloned instanceof HTMLElement)) return;
  const rect = item.getBoundingClientRect();
  cloned.querySelector(".cpcs-actions")?.remove();
  cloned.classList.add("cpcs-ghost");
  cloned.setAttribute("aria-hidden", "true");
  cloned.style.width = `${rect.width}px`;
  ghostOffsetX = dragPointerX - rect.left;
  ghostOffsetY = dragPointerY - rect.top;
  document.body.append(cloned);
  ghostElement = cloned;
  moveGhost(rect.left, rect.top);
}

function moveGhost(x: number, y: number): void {
  if (ghostElement === undefined) return;
  ghostElement.style.transform = `translate3d(${x}px, ${y}px, 0)`;
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
  if (event.pointerType !== "mouse" && target.closest(".cpcs-handle") === null) return;
  const item = event.currentTarget;
  if (!(item instanceof HTMLElement)) return;
  event.preventDefault();
  resetDrag();
  dragIndex.value = index;
  dragOverIndex.value = index;
  dragPointerId = event.pointerId;
  dragPointerX = event.clientX;
  dragPointerY = event.clientY;
  item.setPointerCapture(event.pointerId);
  createGhost(item);
  ensureAutoScroll();
}

function handlePointerMove(event: PointerEvent): void {
  if (dragPointerId !== event.pointerId || dragIndex.value === undefined) return;
  dragPointerX = event.clientX;
  dragPointerY = event.clientY;
  moveGhost(dragPointerX - ghostOffsetX, dragPointerY - ghostOffsetY);
  ensureAutoScroll();
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

function ensureAutoScroll(): void {
  if (autoScrollFrame === undefined) autoScrollFrame = window.requestAnimationFrame(autoScrollStep);
}

function autoScrollStep(): void {
  if (dragIndex.value === undefined) {
    autoScrollFrame = undefined;
    return;
  }
  const container = bodyRef.value;
  if (container !== null) {
    const rect = container.getBoundingClientRect();
    const edge = 48;
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
@use "@styles/utils.scss" as utils;

.cpcs-heading {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 4px;

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

.cpcs-body {
  min-height: 0;
  max-height: min(56dvh, 520px);
  box-sizing: border-box;
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

.cpcs-move {
  transition: transform 200ms ease;
}

.cpcs-ghost {
  position: fixed;
  z-index: 120; /* 需高于 TopOverlay 的 z-index 100 */
  top: 0;
  left: 0;
  box-sizing: border-box;
  border-color: var(--common-shadow-2);
  box-shadow: 0 8px 24px var(--common-shadow-2);
  cursor: grabbing;
  pointer-events: none;
}

.dark .cpcs-ghost {
  box-shadow: 0 8px 24px var(--common-shadow-t-4);
}

.cpcs-error {
  display: flex;
  flex: none;
  align-items: flex-start;
  padding: 8px 0 0;
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

.cpcs-footer-actions {
  @include utils.overlay-footer-actions;
}

.cpcs-confirm {
  @include utils.overlay-confirm-button;
}
</style>
