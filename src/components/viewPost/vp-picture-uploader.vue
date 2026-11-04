<!-- 图片帖上传列表：固定缩略图尺寸、分页圆点与拖动排序 -->
<template>
  <div class="post-picture-list">
    <div :class="{ 'is-empty': images.length === 0 }" class="post-picture-main">
      <div v-if="images.length > 0" class="post-picture-carousel">
        <div ref="viewportRef" class="post-picture-viewport">
          <div
            ref="trackRef"
            :class="{ 'is-dragging': dragging }"
            :style="trackStyle"
            class="post-picture-track"
          >
            <figure
              v-for="(url, index) in images"
              :key="index + ':' + url"
              :aria-label="'第 ' + (index + 1) + ' 张图片'"
              :class="{
                'is-dragging': dragIndex === index,
                'is-drop-before': dropIndex === index && !dropAfter,
                'is-drop-after': dropIndex === index && dropAfter,
              }"
              :data-index="index"
              class="post-picture-item"
              @lostpointercapture="handlePointerCancel"
              @pointercancel="handlePointerCancel"
              @pointerdown="handlePointerDown(index, $event)"
              @pointermove="handlePointerMove"
              @pointerup="handlePointerUp"
            >
              <img :alt="'第 ' + (index + 1) + ' 张图片'" :src="url" draggable="false" />
              <span v-if="cover === url" class="post-picture-cover">封面</span>
              <figcaption class="post-picture-caption">
                <button
                  :aria-label="
                    cover === url
                      ? '第 ' + (index + 1) + ' 张图片已是封面'
                      : '将第 ' + (index + 1) + ' 张图片设为封面'
                  "
                  :aria-pressed="cover === url"
                  :disabled="disabled"
                  :title="cover === url ? '当前封面' : '设为封面'"
                  class="post-picture-cover-action"
                  type="button"
                  @click="emits('setCover', url)"
                >
                  <v-icon size="16">{{
                    cover === url ? "mdi-check-circle" : "mdi-circle-outline"
                  }}</v-icon>
                </button>
                <button
                  :aria-label="'上移第 ' + (index + 1) + ' 张图片'"
                  :disabled="disabled || index === 0"
                  title="上移图片"
                  type="button"
                  @click="emits('move', index, index - 1)"
                >
                  <v-icon size="16">mdi-arrow-left</v-icon>
                </button>
                <button
                  :aria-label="'下移第 ' + (index + 1) + ' 张图片'"
                  :disabled="disabled || index === images.length - 1"
                  title="下移图片"
                  type="button"
                  @click="emits('move', index, index + 1)"
                >
                  <v-icon size="16">mdi-arrow-right</v-icon>
                </button>
                <button
                  :aria-label="'移除第 ' + (index + 1) + ' 张图片'"
                  :disabled="disabled"
                  title="移除图片"
                  type="button"
                  @click="emits('remove', index)"
                >
                  <v-icon size="16">mdi-close</v-icon>
                </button>
              </figcaption>
            </figure>
          </div>
        </div>
      </div>
      <button
        v-if="images.length < maxCount"
        :disabled="disabled"
        class="post-picture-add"
        type="button"
        @click="emits('add')"
      >
        <v-icon size="28">mdi-plus-circle</v-icon>
        <span>点击添加图片</span>
        <small>{{ images.length }} / {{ maxCount }} 张<br />JPG、PNG、GIF、WebP</small>
      </button>
    </div>
    <div v-if="pageCount > 1 || (images.length > 1 && !disabled)" class="post-picture-meta">
      <span v-if="images.length > 1 && !disabled" class="post-picture-hint"
        >拖动图片可调整顺序</span
      >
      <div v-if="pageCount > 1" aria-label="图片分页" class="post-picture-dots" role="group">
        <button
          v-for="page in pageCount"
          :key="page"
          :aria-current="pageIndex === page - 1 ? 'page' : undefined"
          :aria-label="'第 ' + page + ' 页'"
          :class="{ 'is-active': pageIndex === page - 1 }"
          class="post-picture-dot"
          type="button"
          @click="goToPage(page - 1)"
        />
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { computed, nextTick, onBeforeUnmount, ref, useTemplateRef, watch } from "vue";

/**
 * 图片帖上传列表参数。
 * @since Beta v0.13.0
 */
type PictureUploaderProps = {
  /** 当前图片 URL 列表 */
  images: Array<string>;
  /** 当前封面 URL */
  cover: string;
  /** 图片数量上限 */
  maxCount: number;
  /** 是否禁用图片操作 */
  disabled: boolean;
};

const { images, cover, maxCount, disabled } = defineProps<PictureUploaderProps>();
const emits = defineEmits<{
  add: [];
  move: [from: number, to: number];
  remove: [index: number];
  setCover: [url: string];
}>();

const viewportRef = useTemplateRef<HTMLElement>("viewportRef");
const trackRef = useTemplateRef<HTMLElement>("trackRef");
const pageIndex = ref<number>(0);
const perPage = ref<number>(1);
const cardWidth = ref<number>(160);
const cardGap = ref<number>(12);
const dragIndex = ref<number | undefined>();
const dropInsertion = ref<number | undefined>();
let pendingIndex: number | undefined;
let pendingPointerId: number | undefined;
let pendingStartX = 0;
let pendingStartY = 0;
let pendingItem: HTMLElement | undefined;
let dragPointerId: number | undefined;
let dragPointerX = 0;
let dragPointerY = 0;
let ghostElement: HTMLElement | undefined;
let ghostOffsetX = 0;
let ghostOffsetY = 0;
let edgeSwitchArmed = true;

const pageCount = computed<number>(() =>
  images.length === 0 ? 0 : Math.ceil(images.length / perPage.value),
);
const dragging = computed<boolean>(() => dragIndex.value !== undefined);
const dropIndex = computed<number | undefined>(() => {
  const from = dragIndex.value;
  const insertion = dropInsertion.value;
  if (from === undefined || insertion === undefined) return undefined;
  const target = insertion > from ? insertion - 1 : insertion;
  return target === from ? undefined : target;
});
const dropAfter = computed<boolean>(() => {
  const from = dragIndex.value;
  const insertion = dropInsertion.value;
  return from !== undefined && insertion !== undefined && insertion > from + 1;
});
const pageOffset = computed<number>(
  () => pageIndex.value * perPage.value * (cardWidth.value + cardGap.value),
);
const trackStyle = computed<Record<string, string>>(() => ({
  transform: `translate3d(-${pageOffset.value}px, 0, 0)`,
}));

watch(viewportRef, (viewport, _previous, onCleanup) => {
  if (viewport === null) return;
  const observer = new ResizeObserver(measure);
  observer.observe(viewport);
  measure();
  onCleanup(() => observer.disconnect());
});
watch(
  () => images.length,
  (next, previous) => {
    if (next > previous && previous > 0) {
      pageIndex.value = Math.max(0, Math.ceil(next / perPage.value) - 1);
    }
    void nextTick(measure);
  },
);
watch(perPage, clampPage);
watch(pageCount, clampPage);
onBeforeUnmount(resetDrag);

/**
 * 根据视口宽度计算每页图片数量和缩略图尺寸。
 * @since Beta v0.13.0
 */
function measure(): void {
  const viewport = viewportRef.value;
  if (viewport === null || viewport.clientWidth <= 0) return;
  const track = trackRef.value;
  const item = track?.querySelector<HTMLElement>(".post-picture-item");
  const width = item?.offsetWidth ?? cardWidth.value;
  const gap = Number.parseFloat(track === null ? "" : getComputedStyle(track).columnGap);
  cardWidth.value = width > 0 ? width : 160;
  cardGap.value = Number.isFinite(gap) ? gap : 12;
  perPage.value = Math.max(
    1,
    Math.floor((viewport.clientWidth + cardGap.value) / (cardWidth.value + cardGap.value)),
  );
  clampPage();
}

/**
 * 将当前页限制在有效范围内。
 * @since Beta v0.13.0
 */
function clampPage(): void {
  const last = Math.max(0, pageCount.value - 1);
  if (pageIndex.value > last) pageIndex.value = last;
}

/**
 * 切换图片分页。
 * @param index - 目标页索引
 * @since Beta v0.13.0
 */
function goToPage(index: number): void {
  if (index < 0 || index >= pageCount.value) return;
  pageIndex.value = index;
}

/**
 * 记录拖拽起点，移动超过阈值后才进入排序状态。
 * @param index - 图片索引
 * @param event - 指针按下事件
 * @since Beta v0.13.0
 */
function handlePointerDown(index: number, event: PointerEvent): void {
  if (disabled || images.length < 2 || event.button !== 0 || !event.isPrimary) return;
  const target = event.target;
  if (!(target instanceof Element) || target.closest("button") !== null) return;
  const item = event.currentTarget;
  if (!(item instanceof HTMLElement)) return;
  resetDrag();
  pendingIndex = index;
  pendingPointerId = event.pointerId;
  pendingStartX = event.clientX;
  pendingStartY = event.clientY;
  pendingItem = item;
  item.setPointerCapture(event.pointerId);
}

/**
 * 拖动跟手浮层并计算落点。
 * @param event - 指针移动事件
 * @since Beta v0.13.0
 */
function handlePointerMove(event: PointerEvent): void {
  if (dragIndex.value === undefined && pendingPointerId === event.pointerId) {
    if (Math.hypot(event.clientX - pendingStartX, event.clientY - pendingStartY) < 5) return;
    startDrag(event);
  }
  if (dragPointerId !== event.pointerId || dragIndex.value === undefined) return;
  dragPointerX = event.clientX;
  dragPointerY = event.clientY;
  moveGhost(dragPointerX - ghostOffsetX, dragPointerY - ghostOffsetY);
  maybeSwitchPage();
  updateDropTarget();
}

/**
 * 结束拖动并提交排序结果。
 * @param event - 指针抬起事件
 * @since Beta v0.13.0
 */
function handlePointerUp(event: PointerEvent): void {
  if (dragIndex.value === undefined) {
    if (pendingPointerId === event.pointerId) resetDrag();
    return;
  }
  if (dragPointerId !== event.pointerId) return;
  const from = dragIndex.value;
  const insertion = dropInsertion.value;
  resetDrag();
  if (from === undefined || insertion === undefined) return;
  const to = insertion > from ? insertion - 1 : insertion;
  if (to !== from && to >= 0 && to < images.length) emits("move", from, to);
}

/**
 * 取消拖动。
 * @param event - 指针取消或捕获丢失事件
 * @since Beta v0.13.0
 */
function handlePointerCancel(event: PointerEvent): void {
  if (pendingPointerId === event.pointerId || dragPointerId === event.pointerId) resetDrag();
}

/**
 * 进入拖动状态并创建跟手浮层。
 * @param event - 指针移动事件
 * @since Beta v0.13.0
 */
function startDrag(event: PointerEvent): void {
  const index = pendingIndex;
  const item = pendingItem;
  if (index === undefined || item === undefined) return;
  event.preventDefault();
  dragIndex.value = index;
  dropInsertion.value = index;
  dragPointerId = event.pointerId;
  dragPointerX = event.clientX;
  dragPointerY = event.clientY;
  edgeSwitchArmed = true;
  createGhost(item);
}

/**
 * 清理拖动状态与浮层。
 * @since Beta v0.13.0
 */
function resetDrag(): void {
  const pointerId = dragPointerId ?? pendingPointerId;
  if (pointerId !== undefined && pendingItem?.hasPointerCapture(pointerId)) {
    pendingItem.releasePointerCapture(pointerId);
  }
  pendingIndex = undefined;
  pendingPointerId = undefined;
  pendingItem = undefined;
  dragPointerId = undefined;
  dragIndex.value = undefined;
  dropInsertion.value = undefined;
  edgeSwitchArmed = true;
  ghostElement?.remove();
  ghostElement = undefined;
}

/**
 * 克隆图片卡片作为拖动浮层。
 * @param item - 被拖动的图片卡片
 * @since Beta v0.13.0
 */
function createGhost(item: HTMLElement): void {
  const cloned = item.cloneNode(true);
  if (!(cloned instanceof HTMLElement)) return;
  const rect = item.getBoundingClientRect();
  cloned.classList.remove("is-dragging", "is-drop-before", "is-drop-after");
  cloned.classList.add("post-picture-ghost");
  cloned.setAttribute("aria-hidden", "true");
  cloned.setAttribute("inert", "");
  cloned.style.boxSizing = "border-box";
  cloned.style.width = `${rect.width}px`;
  cloned.style.height = `${rect.height}px`;
  ghostOffsetX = dragPointerX - rect.left;
  ghostOffsetY = dragPointerY - rect.top;
  document.body.append(cloned);
  ghostElement = cloned;
  moveGhost(rect.left, rect.top);
}

/**
 * 移动拖动浮层。
 * @param x - 视口横坐标
 * @param y - 视口纵坐标
 * @since Beta v0.13.0
 */
function moveGhost(x: number, y: number): void {
  if (ghostElement === undefined) return;
  ghostElement.style.transform = `translate3d(${x}px, ${y}px, 0)`;
}

/**
 * 拖到图片列表左右边缘时翻页。
 * @since Beta v0.13.0
 */
function maybeSwitchPage(): void {
  const viewport = viewportRef.value;
  if (viewport === null) return;
  const rect = viewport.getBoundingClientRect();
  const edge = 48;
  const inLeft = dragPointerX < rect.left + edge;
  const inRight = dragPointerX > rect.right - edge;
  if (!inLeft && !inRight) edgeSwitchArmed = true;
  if (!edgeSwitchArmed) return;
  if (inLeft && pageIndex.value > 0) {
    pageIndex.value -= 1;
    edgeSwitchArmed = false;
    void nextTick(updateDropTarget);
    return;
  }
  if (inRight && pageIndex.value < pageCount.value - 1) {
    pageIndex.value += 1;
    edgeSwitchArmed = false;
    void nextTick(updateDropTarget);
  }
}

/**
 * 根据指针位置计算插入位置。
 * @since Beta v0.13.0
 */
function updateDropTarget(): void {
  const from = dragIndex.value;
  const viewport = viewportRef.value;
  const track = trackRef.value;
  if (from === undefined || viewport === null || track === null) return;
  const rect = viewport.getBoundingClientRect();
  let insertion = images.length;
  let found = false;
  for (const item of Array.from(track.querySelectorAll<HTMLElement>(".post-picture-item"))) {
    const itemRect = item.getBoundingClientRect();
    if (itemRect.right <= rect.left || itemRect.left >= rect.right) continue;
    const index = Number(item.dataset.index);
    if (!Number.isSafeInteger(index)) continue;
    found = true;
    insertion = index;
    if (dragPointerX < itemRect.left + itemRect.width / 2) break;
    insertion = index + 1;
  }
  if (found) dropInsertion.value = insertion;
}
</script>
<style lang="scss" scoped>
.post-picture-list {
  --post-picture-card-width: 160px;
  --post-picture-card-gap: 12px;

  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 8px;
}

.post-picture-main {
  display: flex;
  min-width: 0;
  align-items: stretch;
  gap: var(--post-picture-card-gap);
}

.post-picture-carousel {
  min-width: 0;
  max-width: 100%;
  flex: 0 1 auto;
}

.post-picture-viewport {
  overflow: hidden;
  width: 100%;
}

.post-picture-track {
  display: flex;
  align-items: stretch;
  gap: var(--post-picture-card-gap);
  transition: transform 220ms ease;
}

.post-picture-track.is-dragging {
  transition: none;
}

.post-picture-item {
  position: relative;
  overflow: hidden;
  width: var(--post-picture-card-width);
  box-sizing: border-box;
  flex: 0 0 var(--post-picture-card-width);
  border: 1px solid var(--common-shadow-2);
  border-radius: 8px;
  margin: 0;
  background: var(--box-bg-1);
  cursor: grab;
  touch-action: pan-y;
  transition: opacity 120ms ease;
  user-select: none;
}

.post-picture-item.is-dragging {
  border-style: dashed;
  cursor: grabbing;
  opacity: 0.35;
}

.post-picture-item.is-drop-before::before,
.post-picture-item.is-drop-after::after {
  position: absolute;
  z-index: 1;
  top: 0;
  width: 3px;
  height: 100%;
  border-radius: 2px;
  background: var(--common-text-title);
  content: "";
  pointer-events: none;
}

.post-picture-item.is-drop-before::before {
  left: 0;
}

.post-picture-item.is-drop-after::after {
  right: 0;
}

.post-picture-item img {
  display: block;
  width: 100%;
  aspect-ratio: 4 / 3;
  background: var(--box-bg-4);
  object-fit: cover;
}

.post-picture-cover {
  position: absolute;
  top: 6px;
  left: 6px;
  padding: 2px 6px;
  border-radius: 4px;
  background: #00000099;
  color: var(--tgc-white-1);
  font-size: 11px;
  line-height: 16px;
  pointer-events: none;
}

.post-picture-caption {
  display: flex;
  min-height: 36px;
  align-items: center;
  padding: 4px;
  background: var(--box-bg-4);
  gap: 2px;
}

.post-picture-caption button {
  display: inline-flex;
  width: 28px;
  height: 28px;
  flex: none;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: var(--box-text-2);
  cursor: pointer;
}

.post-picture-caption .post-picture-cover-action {
  margin-right: auto;
}

.post-picture-caption button[aria-pressed="true"] {
  background: var(--box-bg-2);
  color: var(--common-text-title);
}

.post-picture-caption button:disabled {
  cursor: not-allowed;
  opacity: 0.4;
}

.post-picture-caption button:focus-visible {
  outline: 2px solid var(--common-text-title);
  outline-offset: -2px;
}

.post-picture-caption button:hover:not(:disabled) {
  background: var(--box-bg-2);
  color: var(--common-text-title);
}

.post-picture-add {
  display: flex;
  width: 160px;
  min-height: 148px;
  box-sizing: border-box;
  flex: 0 0 160px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 12px;
  border: 1px dashed var(--common-shadow-2);
  border-radius: 8px;
  background: var(--box-bg-4);
  color: var(--box-text-2);
  cursor: pointer;
  gap: 8px;
  text-align: center;
}

.post-picture-add span {
  font-size: 13px;
  line-height: 20px;
}

.post-picture-add small {
  color: var(--box-text-4);
  font-size: 11px;
  line-height: 16px;
}

.post-picture-add:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.post-picture-add:focus-visible {
  outline: 2px solid var(--common-text-title);
  outline-offset: 2px;
}

.post-picture-add:hover:not(:disabled) {
  border-color: var(--common-text-title);
  background: var(--box-bg-2);
  color: var(--common-text-title);
}

.post-picture-main.is-empty .post-picture-add {
  width: 100%;
  min-height: 140px;
  flex: 1 1 100%;
}

.post-picture-meta {
  display: flex;
  min-height: 20px;
  flex-wrap: wrap;
  align-items: center;
  color: var(--box-text-4);
  font-size: 12px;
  gap: 4px 12px;
  line-height: 20px;
}

.post-picture-hint {
  overflow: hidden;
  min-width: 0;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.post-picture-dots {
  display: flex;
  flex: none;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  margin-left: auto;
  gap: 2px;
}

.post-picture-dot {
  display: inline-flex;
  width: 20px;
  height: 20px;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
}

.post-picture-dot::after {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--box-text-4);
  content: "";
  opacity: 0.45;
  transition: opacity 120ms ease;
}

.post-picture-dot.is-active::after {
  width: 16px;
  border-radius: 3px;
  background: var(--common-text-title);
  opacity: 1;
}

.post-picture-dot:hover::after {
  opacity: 0.8;
}

.post-picture-dot:focus-visible {
  outline: 2px solid var(--common-text-title);
  outline-offset: -2px;
}

.post-picture-ghost {
  position: fixed;
  z-index: 90;
  top: 0;
  left: 0;
  border-color: var(--common-shadow-2);
  margin: 0;
  box-shadow: 0 8px 24px var(--common-shadow-2);
  cursor: grabbing;
  opacity: 0.92;
  pointer-events: none;
  transform-origin: top left;
}

.dark .post-picture-ghost {
  box-shadow: 0 8px 24px var(--common-shadow-t-4);
}

@media (width <= 640px) {
  .post-picture-main {
    flex-direction: column;
  }

  .post-picture-add {
    width: 100%;
    min-height: 64px;
    flex: 0 0 auto;
    flex-direction: row;
    justify-content: flex-start;
    padding: 10px 14px;
    gap: 8px;
    text-align: left;
  }

  .post-picture-add small {
    margin-left: auto;
    text-align: right;
  }

  .post-picture-main.is-empty .post-picture-add {
    min-height: 120px;
    flex-direction: column;
    justify-content: center;
    text-align: center;
  }

  .post-picture-main.is-empty .post-picture-add small {
    margin-left: 0;
    text-align: center;
  }
}

@media (width <= 600px) {
  .post-picture-list {
    --post-picture-card-width: 148px;
  }
}

@media (width <= 420px) {
  .post-picture-list {
    --post-picture-card-width: 124px;
  }

  .post-picture-caption button {
    width: 24px;
    height: 24px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .post-picture-track {
    transition: none;
  }
}
</style>
