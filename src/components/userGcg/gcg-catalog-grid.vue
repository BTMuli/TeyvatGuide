<template>
  <ul ref="gridEl" class="card-wiki-grid">
    <li
      v-for="card in cards"
      :key="card.basic.item_id"
      :ref="(element) => observeCell(card.basic.item_id, element)"
      :class="{ 'card-wiki-item-visible': visibleIds.has(card.basic.item_id) }"
      :style="entryStyles.get(card.basic.item_id)"
      class="card-wiki-item"
      @click="selectCard(card)"
    >
      <div class="card-wiki-item-content">
        <TwgCardTile
          v-if="mountedIds.has(card.basic.item_id)"
          :card
          showDetails
          @open-details="selectCard(card)"
        />
        <div v-else aria-hidden="true" class="card-wiki-placeholder">
          <div class="card-wiki-placeholder-frame" />
          <div class="card-wiki-placeholder-name" />
        </div>
      </div>
    </li>
  </ul>
</template>

<script lang="ts" setup>
import TwgCardTile from "@comp/pageWiki/twg-card-tile.vue";
import { getRankMasonryTimings } from "@utils/bbs/forumRankMasonry.js";
import { computed, onMounted, onScopeDispose, shallowReactive, useTemplateRef, watch } from "vue";

type GcgCatalogGridProps = {
  cards: Array<TGApp.Game.CardSquare.Card>;
};

type GcgCatalogGridEmits = {
  select: [card: TGApp.Game.CardSquare.Card];
};

const { cards } = defineProps<GcgCatalogGridProps>();
const emit = defineEmits<GcgCatalogGridEmits>();

const mountBuffer = 360;
const visibilityThreshold = 0.25;
const gridEl = useTemplateRef<HTMLUListElement>("gridEl");
const mountedIds = shallowReactive(new Set<number>());
const visibleIds = shallowReactive(new Set<number>());
const entryStyles = shallowReactive(new Map<number, Record<string, string>>());
const cells = new Map<number, Element>();
const cellIds = new WeakMap<Element, number>();
const cardIds = computed<Set<number>>(() => new Set(cards.map((card) => card.basic.item_id)));
let mountObserver: IntersectionObserver | undefined;
let visibilityObserver: IntersectionObserver | undefined;
let resizeObserver: ResizeObserver | undefined;
let headerOffset = -1;
let opened = false;
let hasIntersectionObserver = false;

onMounted(() => {
  if (typeof window === "undefined") return;
  const element = gridEl.value;
  if (!element) return;
  if (typeof ResizeObserver !== "undefined") {
    resizeObserver = new ResizeObserver(() => syncObservers());
    resizeObserver.observe(element);
  }
  window.addEventListener("resize", syncObservers);
  syncObservers();
});

onScopeDispose(() => {
  mountObserver?.disconnect();
  visibilityObserver?.disconnect();
  resizeObserver?.disconnect();
  if (typeof window !== "undefined") window.removeEventListener("resize", syncObservers);
  cells.clear();
  mountedIds.clear();
  visibleIds.clear();
  entryStyles.clear();
});

watch(cardIds, (ids) => {
  for (const id of mountedIds) {
    if (!ids.has(id)) mountedIds.delete(id);
  }
  for (const id of visibleIds) {
    if (!ids.has(id)) visibleIds.delete(id);
  }
  for (const id of entryStyles.keys()) {
    if (!ids.has(id)) entryStyles.delete(id);
  }
  if (!hasIntersectionObserver) {
    ids.forEach((id) => {
      mountedIds.add(id);
      visibleIds.add(id);
    });
  }
});

const cardIdList = computed<Array<number>>(() => cards.map((card) => card.basic.item_id));

function selectCard(card: TGApp.Game.CardSquare.Card): void {
  const id = card.basic.item_id;
  if (!mountedIds.has(id)) return;
  emit("select", card);
}

function syncObservers(): void {
  const element = gridEl.value;
  if (!element || typeof IntersectionObserver === "undefined") {
    cardIdList.value.forEach((id) => {
      mountedIds.add(id);
      visibleIds.add(id);
    });
    return;
  }

  hasIntersectionObserver = true;
  if (!mountObserver) {
    mountObserver = new IntersectionObserver(updateMounted, {
      rootMargin: `${mountBuffer}px 0px`,
    });
  }

  const nextHeaderOffset = getHeaderOffset(element);
  if (visibilityObserver && nextHeaderOffset === headerOffset) return;
  headerOffset = nextHeaderOffset;
  visibilityObserver?.disconnect();
  visibilityObserver = new IntersectionObserver(updateVisibility, {
    rootMargin: `${-headerOffset}px 0px 0px`,
    threshold: [0, visibilityThreshold],
  });
  for (const cell of cells.values()) {
    mountObserver.observe(cell);
    visibilityObserver.observe(cell);
  }
}

function getHeaderOffset(element: HTMLUListElement): number {
  if (typeof window.getComputedStyle !== "function") return 0;
  return (
    Number.parseFloat(window.getComputedStyle(element).getPropertyValue("--v-layout-top")) || 0
  );
}

function updateMounted(entries: Array<IntersectionObserverEntry>): void {
  for (const { target, isIntersecting } of entries) {
    const id = cellIds.get(target);
    if (id === undefined) continue;
    if (isIntersecting) {
      mountedIds.add(id);
      continue;
    }
    mountedIds.delete(id);
    visibleIds.delete(id);
    entryStyles.delete(id);
  }
}

function updateVisibility(entries: Array<IntersectionObserverEntry>): void {
  const entering = new Set<number>();
  for (const {
    target,
    isIntersecting,
    intersectionRect,
    boundingClientRect,
    rootBounds,
  } of entries) {
    const id = cellIds.get(target);
    if (id === undefined) continue;
    const visibleHeight = boundingClientRect.height * visibilityThreshold;
    const tallerThanViewport = rootBounds !== null && visibleHeight > rootBounds.height;
    if (isIntersecting && (intersectionRect.height >= visibleHeight || tallerThanViewport)) {
      if (!visibleIds.has(id)) entering.add(id);
      mountedIds.add(id);
      visibleIds.add(id);
      continue;
    }
    visibleIds.delete(id);
    entryStyles.delete(id);
  }
  if (!entering.size) return;

  const arrivals = cardIdList.value.filter((id) => entering.has(id));
  const timings = getRankMasonryTimings(arrivals.length, opened ? 520 : 1000);
  opened = true;
  arrivals.forEach((id, index) => {
    const { duration, delay } = timings[index];
    entryStyles.set(id, {
      "--masonry-flow-entry-delay": `${delay}ms`,
      "--masonry-flow-entry-duration": `${duration}ms`,
    });
  });
}

function observeCell(id: number, element: unknown): void {
  const previous = cells.get(id);
  if (previous === element) return;
  if (previous) {
    mountObserver?.unobserve(previous);
    visibilityObserver?.unobserve(previous);
    cells.delete(id);
    cellIds.delete(previous);
  }
  if (typeof Element === "undefined" || !(element instanceof Element)) return;
  cells.set(id, element);
  cellIds.set(element, id);
  mountObserver?.observe(element);
  visibilityObserver?.observe(element);
}
</script>

<style lang="scss" scoped>
.card-wiki-grid {
  display: grid;
  justify-content: center;
  padding: 12px 24px 0;
  margin: 0;
  gap: 16px 36px;
  grid-template-columns: repeat(auto-fit, min(140px, 100%));
  list-style: none;
}

.card-wiki-item {
  min-width: 0;
  cursor: pointer;
  pointer-events: none;
}

.card-wiki-item-visible,
.card-wiki-item:focus-within {
  pointer-events: auto;
}

.card-wiki-item-content {
  opacity: 0;
  pointer-events: none;
  transform: translateY(-18px) scale(0.97);
  transition:
    opacity 340ms ease,
    transform 400ms ease;
}

.card-wiki-item-visible > .card-wiki-item-content {
  animation: card-wiki-appear var(--masonry-flow-entry-duration, 520ms)
    cubic-bezier(0.2, 0.65, 0.3, 1) var(--masonry-flow-entry-delay, 0ms) backwards;
}

.card-wiki-item-visible > .card-wiki-item-content,
.card-wiki-item:focus-within > .card-wiki-item-content {
  opacity: 1;
  pointer-events: auto;
  transform: none;
}

.card-wiki-placeholder {
  width: 100%;
}

.card-wiki-placeholder-frame {
  width: 100%;
  border: 1px solid var(--common-shadow-1);
  border-radius: 14px;
  aspect-ratio: 7 / 12;
  background: var(--box-bg-1);
}

.card-wiki-placeholder-name {
  height: 19.5px;
  margin-block-start: 4px;
}

@media (prefers-reduced-motion: reduce) {
  .card-wiki-item-content,
  .card-wiki-item-visible > .card-wiki-item-content {
    animation: none;
    transition: none;
  }
}

@keyframes card-wiki-appear {
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
