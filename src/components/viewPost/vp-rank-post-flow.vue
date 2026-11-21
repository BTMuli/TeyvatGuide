<!-- 榜单瀑布流 -->
<template>
  <ol ref="flowEl" :style="{ height: layout.height + 'px' }" class="rank-flow" role="list">
    <li
      v-for="item in layout.positions"
      :key="item.id"
      :ref="(element) => observeCell(item.id, element)"
      :aria-posinset="item.index + 1"
      :aria-setsize="posts.length"
      :class="{ 'rank-flow-cell-visible': visibleIds.has(item.id) }"
      :style="[
        { top: item.top + 'px', left: item.left + 'px', width: layout.width + 'px' },
        entryStyles.get(item.id),
      ]"
      class="rank-flow-cell"
    >
      <div class="rank-flow-content">
        <VpRankPostCard
          :coverWidth="layout.width"
          :period
          :post="posts[item.index]"
          :rank="item.index + 1"
          @image-click="emits('imageClick', $event)"
          @user-click="emits('userClick', $event)"
        />
      </div>
    </li>
  </ol>
</template>

<script lang="ts" setup>
import VpRankPostCard from "@comp/viewPost/vp-rank-post-card.vue";
import { getRankCoverRatio } from "@utils/bbs/forumRank.js";
import { getRankMasonryTimings, layoutRankMasonry } from "@utils/bbs/forumRankMasonry.js";
import { computed, onMounted, onScopeDispose, ref, shallowReactive, useTemplateRef } from "vue";

type VpRankPostFlowProps = {
  posts: Array<TGApp.BBS.Forum.ImageRankPost>;
  period?: number;
};

type VpRankPostFlowEmits = {
  userClick: [uid: string];
  imageClick: [cover: TGApp.BBS.Forum.ImageRankCover];
};
const { posts, period } = defineProps<VpRankPostFlowProps>();
const emits = defineEmits<VpRankPostFlowEmits>();
const visibilityThreshold = 0.25;
const flowEl = useTemplateRef<HTMLOListElement>("flowEl");
const width = ref<number>(0);
const sizes = shallowReactive(new Map<string, { width: number; height: number }>());
const visibleIds = shallowReactive(new Set<string>());
const entryStyles = shallowReactive(new Map<string, Record<string, string>>());
const cells = new Map<string, Element>();
const cellIds = new WeakMap<Element, string>();
const items = computed<Array<{ id: string; ratio: number }>>(() =>
  posts.map((post) => ({ id: post.post.post_id, ratio: getRankCoverRatio(post) })),
);
const layout = computed(() => layoutRankMasonry(items.value, width.value, sizes));
let resizeObserver: ResizeObserver | undefined;
let intersectionObserver: IntersectionObserver | undefined;
let headerOffset = -1;
let opened = false;

onMounted(() => {
  const element = flowEl.value;
  if (!element) return;
  resizeObserver = new ResizeObserver((entries) => {
    if (element.hasAttribute("data-rank-flow-leaving")) return;
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
  if (!element || element.hasAttribute("data-rank-flow-leaving")) return;
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
  if (!element || element.hasAttribute("data-rank-flow-leaving")) return;
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
      "--rank-flow-entry-delay": `${delay}ms`,
      "--rank-flow-entry-duration": `${duration}ms`,
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
</script>

<style lang="scss" scoped>
.rank-flow {
  position: relative;
  min-width: 0;
  list-style: none;
  margin-block: 0;
  padding-inline: 0;

  &[data-rank-flow-leaving] {
    pointer-events: none;
  }
}

.rank-flow-cell {
  position: absolute;
  min-width: 0;
}

.rank-flow-content {
  opacity: 0;
  pointer-events: none;
  transform: translateY(-18px) scale(0.97);
  transition:
    opacity 340ms ease,
    transform 400ms ease;
}

.rank-flow-cell-visible > .rank-flow-content {
  animation: rank-flow-appear var(--rank-flow-entry-duration, 520ms) cubic-bezier(0.2, 0.65, 0.3, 1)
    var(--rank-flow-entry-delay, 0ms) backwards;
}

.rank-flow-cell-visible > .rank-flow-content,
.rank-flow-cell:focus-within > .rank-flow-content {
  opacity: 1;
  pointer-events: auto;
  transform: none;
}

@media (prefers-reduced-motion: reduce) {
  .rank-flow-content,
  .rank-flow-cell-visible > .rank-flow-content {
    animation: none;
    transition: none;
  }
}

@keyframes rank-flow-appear {
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
