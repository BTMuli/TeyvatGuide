<template>
  <div ref="rankGrid" class="hta-rank-grid">
    <TransitionGroup name="hta-rank" @before-leave="pinLeavingCard">
      <TibWikiAbyss
        v-for="item in ranks"
        :key="item.cur.Item"
        :cur="item.cur.Rate"
        :last="item.last.Rate"
        :role="item.cur.Item"
      />
    </TransitionGroup>
  </div>
</template>

<script lang="ts" setup>
import { onBeforeUpdate, useTemplateRef } from "vue";

import TibWikiAbyss from "./tib-wiki-abyss.vue";

type HtaAvatarRankGridProps = {
  ranks: Array<TGApp.Plugins.Hutao.Abyss.PeriodData<TGApp.Plugins.Hutao.Base.Rate>>;
};

const { ranks } = defineProps<HtaAvatarRankGridProps>();

const rankGrid = useTemplateRef<HTMLDivElement>("rankGrid");
const cardPositions = new Map<HTMLElement, { left: number; top: number; width: number }>();

onBeforeUpdate(() => {
  cardPositions.clear();
  if (!rankGrid.value || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  // Capture each position before any departing card leaves the grid layout.
  for (const card of rankGrid.value.children) {
    if (!(card instanceof HTMLElement)) continue;
    const { offsetLeft: left, offsetTop: top, offsetWidth: width } = card;
    const transform = getComputedStyle(card).transform;
    const translation = transform === "none" ? undefined : new DOMMatrixReadOnly(transform);
    cardPositions.set(card, {
      left: left + (translation?.m41 ?? 0),
      top: top + (translation?.m42 ?? 0),
      width,
    });
  }
});

function pinLeavingCard(card: Element): void {
  if (!(card instanceof HTMLElement)) return;
  const position = cardPositions.get(card);
  if (!position) return;
  card.style.left = `${position.left}px`;
  card.style.top = `${position.top}px`;
  card.style.width = `${position.width}px`;
}
</script>

<style lang="scss" scoped>
.hta-rank-grid {
  --hta-rank-motion: 0.32s cubic-bezier(0.22, 0.61, 0.36, 1);

  position: relative;
  display: grid;
  width: 100%;
  height: 100%;
  min-height: 0;
  box-sizing: border-box;
  align-content: start;
  align-items: center;
  padding: 12px;
  gap: 12px;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  isolation: isolate;
  overflow-y: auto;
}

.hta-rank-move {
  transition: transform var(--hta-rank-motion);
}

.hta-rank-enter-active {
  transition: opacity 0.24s ease-out;
}

.hta-rank-enter-from,
.hta-rank-leave-to {
  opacity: 0;
}

.hta-rank-leave-active {
  position: absolute;
  z-index: -1;
  pointer-events: none;
  transition: opacity 0.18s ease-in;
}

@media (prefers-reduced-motion: reduce) {
  .hta-rank-move,
  .hta-rank-enter-active,
  .hta-rank-leave-active {
    transition: none;
  }

  .hta-rank-leave-active {
    display: none;
  }
}
</style>
