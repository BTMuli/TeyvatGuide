<!-- 渲染容器右下角的启动器背景轮换示意 -->
<template>
  <div v-if="pageCoverUrls.length > 1" class="cover-switcher">
    <Transition name="cover-panel">
      <div v-if="expanded" aria-label="启动器背景轮换" class="cover-panel" role="group">
        <button
          v-for="(url, index) in pageCoverUrls"
          :key="url"
          :aria-current="index === pageCoverIndex ? 'true' : undefined"
          :aria-label="`第 ${index + 1} 张背景，共 ${pageCoverUrls.length} 张`"
          :class="{ current: index === pageCoverIndex }"
          :style="coverItemStyle(url)"
          class="cover-panel-item"
          type="button"
          @click="selectPageCover(index)"
        />
      </div>
    </Transition>
    <button
      :aria-expanded="expanded"
      :aria-label="expanded ? '收起启动器背景轮换' : '展开启动器背景轮换'"
      class="cover-toggle"
      type="button"
      @click="expanded = !expanded"
    >
      <v-icon :icon="expanded ? 'mdi-chevron-right' : 'mdi-chevron-left'" size="24" />
    </button>
  </div>
</template>

<script lang="ts" setup>
import { selectPageCover, usePageCover } from "@hooks/usePageCover.js";
import { ref } from "vue";

const { pageCoverIndex, pageCoverUrls } = usePageCover();
const expanded = ref<boolean>(false);

function coverItemStyle(url: string): { backgroundImage: string } {
  return { backgroundImage: `url("${url}")` };
}
</script>

<style lang="scss" scoped>
.cover-switcher {
  position: absolute;
  z-index: 1;
  right: 0;
  bottom: 16px;
  display: flex;
  height: 40px;
  align-items: flex-end;
  padding-right: 24px;
}

.cover-panel {
  display: flex;
  padding: 8px;
  border: 1px solid var(--common-shadow-2);
  border-radius: 12px;
  -webkit-backdrop-filter: blur(4px);
  backdrop-filter: blur(4px);
  background: color-mix(in srgb, var(--app-page-bg) 24%, transparent);
  box-shadow: 0 4px 16px var(--common-shadow-2);
  gap: 8px;
}

.cover-panel-item {
  overflow: hidden;
  width: 192px;
  padding: 0;
  border: unset;
  border-radius: 8px;
  aspect-ratio: 2560 / 1440;
  background-position: center;
  background-repeat: no-repeat;
  background-size: cover;
  cursor: pointer;

  &:hover,
  &.current {
    border: 1px solid var(--tgc-od-blue);
  }

  &:focus-visible {
    outline: 2px solid var(--tgc-od-blue);
    outline-offset: 2px;
  }
}

.cover-toggle {
  position: absolute;
  top: 50%;
  right: 0;
  display: grid;
  width: 40px;
  height: 40px;
  padding: 0;
  border: 1px solid var(--common-shadow-2);
  border-radius: 50%;
  background: color-mix(in srgb, var(--app-page-bg) 24%, transparent);
  box-shadow: -2px 0 4px var(--common-shadow-2);
  color: var(--app-page-content);
  cursor: pointer;
  place-items: center;
  transform: translate(50%, -50%);
  transition: border-color 0.2s ease;

  &:hover {
    border-color: var(--tgc-od-blue);
  }

  &:focus-visible {
    outline: 2px solid var(--tgc-od-blue);
    outline-offset: 2px;
  }

  i {
    right: 6px;
  }
}

.cover-panel-enter-active,
.cover-panel-leave-active {
  transition:
    opacity 0.25s ease,
    transform 0.25s ease;
}

.cover-panel-enter-from,
.cover-panel-leave-to {
  opacity: 0;
  transform: translateX(16px);
}

@media (prefers-reduced-motion: reduce) {
  .cover-panel-enter-active,
  .cover-panel-leave-active {
    transition: none;
  }
}
</style>
