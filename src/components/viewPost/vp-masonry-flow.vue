<!-- 瀑布流布局 -->
<template>
  <ol ref="flowEl" :style="{ height: layout.height + 'px' }" class="masonry-flow" role="list">
    <li
      v-for="item in layout.positions"
      :key="item.id"
      :ref="(element) => observeCell(item.id, element)"
      :aria-posinset="item.index + 1"
      :aria-setsize="items.length"
      :class="{ 'masonry-flow-cell-visible': visibleIds.has(item.id) }"
      :style="[
        { top: item.top + 'px', left: item.left + 'px', width: layout.width + 'px' },
        entryStyles.get(item.id),
      ]"
      class="masonry-flow-cell"
    >
      <div class="masonry-flow-content">
        <slot :index="item.index" :width="layout.width" />
      </div>
    </li>
  </ol>
</template>

<script lang="ts" setup>
import { getRankMasonryTimings, layoutRankMasonry } from "@utils/bbs/forumRankMasonry.js";
import type { MasonryItem } from "@utils/bbs/forumRankMasonry.js";
import {
  computed,
  onMounted,
  onScopeDispose,
  ref,
  shallowReactive,
  useTemplateRef,
  watch,
} from "vue";

type VpMasonryFlowProps = {
  items: Array<MasonryItem>;
  estimatedBodyHeight?: number;
  maxColumns?: number;
  maxCoverHeight?: number;
};

type VpMasonryFlowSlots = {
  default(props: { index: number; width: number }): unknown;
};

const {
  items,
  estimatedBodyHeight = 144,
  maxColumns = Infinity,
  maxCoverHeight = Infinity,
} = defineProps<VpMasonryFlowProps>();
const emits = defineEmits<{ layout: [lowestBottom: number | undefined] }>();
defineSlots<VpMasonryFlowSlots>();
const visibilityThreshold = 0.25;
const flowEl = useTemplateRef<HTMLOListElement>("flowEl");
const width = ref<number>(0);
const sizes = shallowReactive(new Map<string, { width: number; height: number }>());
const visibleIds = shallowReactive(new Set<string>());
const entryStyles = shallowReactive(new Map<string, Record<string, string>>());
const cells = new Map<string, Element>();
const cellIds = new WeakMap<Element, string>();
const layout = computed(() =>
  layoutRankMasonry(items, width.value, sizes, estimatedBodyHeight, maxColumns, maxCoverHeight),
);
const lowestColumnBottom = computed<number | undefined>(() => {
  const { columns, positions } = layout.value;
  if (columns <= 0 || positions.length === 0) return undefined;
  const bottoms = Array<number>(columns).fill(0);
  for (const { column, top, height } of positions) {
    const bottom = top + height;
    if (bottom > bottoms[column]) bottoms[column] = bottom;
  }
  return Math.min(...bottoms);
});
watch(lowestColumnBottom, (value) => emits("layout", value), { flush: "post", immediate: true });
let resizeObserver: ResizeObserver | undefined;
let intersectionObserver: IntersectionObserver | undefined;
let headerOffset = -1;
let opened = false;

onMounted(() => {
  const element = flowEl.value;
  if (!element) return;
  resizeObserver = new ResizeObserver((entries) => {
    if (element.hasAttribute("data-masonry-flow-leaving")) return;
    for (const entry of entries) {
      if (entry.target === element) {
        syncLayout();
        continue;
      }
      const id = cellIds.get(entry.target);
      const size = entry.borderBoxSize[0];
      if (id && size && size.blockSize > 0) {
        const { blockSize: height, inlineSize: width } = size;
        const last = sizes.get(id);
        if (last?.height !== height || last.width !== width) sizes.set(id, { width, height });
      }
    }
  });
  resizeObserver.observe(element);
  window.addEventListener("resize", syncLayout);
  syncLayout();
});

onScopeDispose(() => {
  resizeObserver?.disconnect();
  intersectionObserver?.disconnect();
  window.removeEventListener("resize", syncLayout);
});

function syncLayout(): void {
  const element = flowEl.value;
  if (!element || element.hasAttribute("data-masonry-flow-leaving")) return;
  width.value = element.clientWidth;
  const barHeight =
    Number.parseFloat(window.getComputedStyle(element).getPropertyValue("--v-layout-top")) || 0;
  if (barHeight === headerOffset) return;
  headerOffset = barHeight;
  intersectionObserver?.disconnect();
  intersectionObserver = new IntersectionObserver(updateVisibility, {
    rootMargin: `${-headerOffset}px 0px 0px`,
    threshold: [0, visibilityThreshold],
  });
  for (const cell of cells.values()) intersectionObserver.observe(cell);
}

function updateVisibility(entries: Array<IntersectionObserverEntry>): void {
  const element = flowEl.value;
  if (!element || element.hasAttribute("data-masonry-flow-leaving")) return;
  const entering = new Set<string>();
  for (const {
    target,
    isIntersecting,
    intersectionRect,
    boundingClientRect,
    rootBounds,
  } of entries) {
    const id = cellIds.get(target);
    if (!id) continue;
    const visibleHeight = boundingClientRect.height * visibilityThreshold;
    const tallerThanViewport = rootBounds && visibleHeight > rootBounds.height;
    if (isIntersecting && (intersectionRect.height >= visibleHeight || tallerThanViewport)) {
      if (!visibleIds.has(id)) entering.add(id);
      visibleIds.add(id);
    } else {
      entering.delete(id);
      visibleIds.delete(id);
      entryStyles.delete(id);
    }
  }
  if (!entering.size) return;
  const arrivals = layout.value.positions.filter(({ id }) => entering.has(id));
  const timings = getRankMasonryTimings(arrivals.length, opened ? 520 : 1000);
  opened = true;
  arrivals.forEach(({ id }, index) => {
    const { duration, delay } = timings[index];
    entryStyles.set(id, {
      "--masonry-flow-entry-delay": `${delay}ms`,
      "--masonry-flow-entry-duration": `${duration}ms`,
    });
  });
}

function observeCell(id: string, element: unknown): void {
  const previous = cells.get(id);
  if (previous === element) return;
  if (previous) {
    resizeObserver?.unobserve(previous);
    intersectionObserver?.unobserve(previous);
    cells.delete(id);
    cellIds.delete(previous);
  }
  if (element instanceof Element) {
    cells.set(id, element);
    cellIds.set(element, id);
    resizeObserver?.observe(element, { box: "border-box" });
    intersectionObserver?.observe(element);
  }
}

/**
 * 获取最矮一列的内容底部，用于判断瀑布流首屏是否仍有未铺满空间。
 * @since Beta v0.14.1
 * @returns 最矮列底部；尚未完成布局时为 undefined
 */
function getLowestColumnBottom(): number | undefined {
  return lowestColumnBottom.value;
}

defineExpose({ getLowestColumnBottom });
</script>

<style lang="scss" scoped>
.masonry-flow {
  position: relative;
  min-width: 0;
  list-style: none;
  margin-block: 0;
  padding-inline: 0;

  &[data-masonry-flow-leaving] {
    pointer-events: none;
  }
}

.masonry-flow-cell {
  position: absolute;
  min-width: 0;
}

.masonry-flow-content {
  opacity: 0;
  pointer-events: none;
  transform: translateY(-18px) scale(0.97);
  transition:
    opacity 340ms ease,
    transform 400ms ease;
}

.masonry-flow-cell-visible > .masonry-flow-content {
  animation: masonry-flow-appear var(--masonry-flow-entry-duration, 520ms)
    cubic-bezier(0.2, 0.65, 0.3, 1) var(--masonry-flow-entry-delay, 0ms) backwards;
}

.masonry-flow-cell-visible > .masonry-flow-content,
.masonry-flow-cell:focus-within > .masonry-flow-content {
  opacity: 1;
  pointer-events: auto;
  transform: none;
}

@media (prefers-reduced-motion: reduce) {
  .masonry-flow-content,
  .masonry-flow-cell-visible > .masonry-flow-content {
    animation: none;
    transition: none;
  }
}

@keyframes masonry-flow-appear {
  0% {
    opacity: 0;
    transform: translateY(36px) scale(0.94);
  }

  66% {
    opacity: 1;
    transform: translateY(-4px) scale(1.008);
  }

  100% {
    opacity: 1;
    transform: none;
  }
}
</style>
