<template>
  <nav v-if="items.length" :aria-label="label" class="tur-toc">
    <v-tooltip v-for="item in items" :key="item.id" :text="item.label" location="left">
      <template #activator="{ props }">
        <button
          v-bind="props"
          :aria-controls="item.id"
          :aria-current="activeId === item.id ? 'location' : undefined"
          :aria-label="item.label"
          :class="{ active: activeId === item.id }"
          class="tur-toc-item"
          type="button"
          @click="scrollToSection(item.id)"
        >
          <v-icon :icon="item.icon" size="20" />
          <span v-if="item.badge !== undefined" aria-hidden="true" class="tur-toc-badge">
            {{ item.badge }}
          </span>
        </button>
      </template>
    </v-tooltip>
  </nav>
</template>
<script lang="ts" setup>
import { onMounted, onUnmounted, ref, watch } from "vue";

export type FloatingTocItem = { id: string; label: string; icon: string; badge?: number };

const { items, label = "战绩目录" } = defineProps<{
  items: Array<FloatingTocItem>;
  label?: string;
}>();
const activeId = ref<string>();
let frame = 0;
let observer: ResizeObserver | undefined;
let scrollRoot: HTMLElement | undefined;

function findScrollRoot(element: HTMLElement): HTMLElement | undefined {
  let parent = element.parentElement;
  while (parent && parent !== document.body && parent !== document.documentElement) {
    if (/auto|scroll/.test(getComputedStyle(parent).overflowY)) return parent;
    parent = parent.parentElement;
  }
  return undefined;
}

function getTopOffset(): number {
  if (scrollRoot) return scrollRoot.getBoundingClientRect().top + scrollRoot.clientTop + 16;
  return (document.querySelector(".v-app-bar")?.getBoundingClientRect().bottom ?? 0) + 16;
}

function updateActive(): void {
  frame = 0;
  const offset = getTopOffset();
  let current = items[0]?.id;
  for (const item of items) {
    const section = document.getElementById(item.id);
    if (section && section.getBoundingClientRect().top <= offset + 1) current = item.id;
  }
  const root = scrollRoot ?? document.documentElement;
  if (root.scrollTop > 0 && root.scrollTop + root.clientHeight >= root.scrollHeight - 2) {
    current = items[items.length - 1]?.id;
  }
  activeId.value = current;
}

function scheduleUpdate(): void {
  if (!frame) frame = requestAnimationFrame(updateActive);
}

function scrollToSection(id: string): void {
  const section = document.getElementById(id);
  if (!section) return;
  const root = scrollRoot ?? window;
  root.scrollTo({
    top:
      (scrollRoot?.scrollTop ?? window.scrollY) +
      section.getBoundingClientRect().top -
      getTopOffset(),
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
  });
}

function bindSections(): void {
  scrollRoot?.removeEventListener("scroll", scheduleUpdate);
  observer?.disconnect();
  const first = items[0] ? document.getElementById(items[0].id) : null;
  scrollRoot = first ? findScrollRoot(first) : undefined;
  scrollRoot?.addEventListener("scroll", scheduleUpdate, { passive: true });
  if (scrollRoot) observer?.observe(scrollRoot);
  for (const item of items) {
    const section = document.getElementById(item.id);
    if (section) observer?.observe(section);
  }
  scheduleUpdate();
}

watch(() => items, bindSections, { flush: "post" });

onMounted(() => {
  window.addEventListener("scroll", scheduleUpdate, { passive: true });
  window.addEventListener("resize", scheduleUpdate);
  observer = new ResizeObserver(scheduleUpdate);
  bindSections();
});

onUnmounted(() => {
  scrollRoot?.removeEventListener("scroll", scheduleUpdate);
  window.removeEventListener("scroll", scheduleUpdate);
  window.removeEventListener("resize", scheduleUpdate);
  observer?.disconnect();
  cancelAnimationFrame(frame);
});
</script>
<style lang="scss" scoped>
.tur-toc {
  position: fixed;
  z-index: var(--tgi-top);
  top: calc(50% + var(--v-layout-top, 0px) / 2);
  right: 4px;
  display: flex;
  max-height: calc(100vh - var(--v-layout-top, 0px) - 32px);
  flex-direction: column;
  gap: 4px;
  overflow-y: auto;
  transform: translateY(-50%);
}

.tur-toc-badge {
  position: absolute;
  right: 2px;
  bottom: 4px;
  display: flex;
  width: 12px;
  height: 12px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--tgc-od-orange);
  color: var(--tgc-white-1);
  font-family: var(--font-text);
  font-size: 8px;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  line-height: 12px;
  pointer-events: none;
}

.tur-toc-item {
  --toc-item-bg: color-mix(in srgb, var(--app-page-bg) 20%, transparent);
  --toc-item-color: color-mix(in srgb, var(--common-text-title) 60%, var(--app-page-bg));

  position: relative;
  display: flex;
  width: 32px;
  height: 36px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
  -webkit-backdrop-filter: blur(12px);
  backdrop-filter: blur(4px);
  background: var(--toc-item-bg);
  box-shadow: 0 0 4px var(--common-shadow-2);
  color: var(--toc-item-color);
  cursor: pointer;

  &:hover,
  &:focus-visible {
    --toc-item-bg: color-mix(in srgb, var(--app-page-bg) 72%, transparent);
    --toc-item-color: var(--common-text-title);
  }

  &.active {
    --toc-item-bg: color-mix(in srgb, var(--box-text-4) 24%, var(--app-page-bg) 60%);
    --toc-item-color: var(--box-text-4);
  }

  &:focus-visible {
    outline: 2px solid var(--box-text-4);
    outline-offset: 2px;
  }
}
</style>
