<!-- 渲染容器右下角的启动器背景轮换示意 -->
<template>
  <div
    v-if="pageCoverUrls.length > 1"
    aria-label="启动器背景轮换"
    class="cover-switcher"
    role="group"
  >
    <button
      v-for="(url, index) in pageCoverUrls"
      :key="url"
      :aria-current="index === pageCoverIndex ? 'true' : undefined"
      :aria-label="`第 ${index + 1} 张背景，共 ${pageCoverUrls.length} 张`"
      :class="{ current: index === pageCoverIndex }"
      :style="coverItemStyle(url)"
      class="cover-switcher-item"
      type="button"
      @click="selectPageCover(index)"
    />
  </div>
</template>

<script lang="ts" setup>
import { selectPageCover, usePageCover } from "@hooks/usePageCover.js";

const { pageCoverIndex, pageCoverUrls } = usePageCover();

function coverItemStyle(url: string): { backgroundImage: string } {
  return { backgroundImage: `url("${url}")` };
}
</script>

<style lang="scss" scoped>
.cover-switcher {
  position: absolute;
  z-index: 0;
  right: 16px;
  bottom: 16px;
  display: flex;
  padding: 4px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  -webkit-backdrop-filter: blur(4px);
  backdrop-filter: blur(4px);
  background: color-mix(in srgb, var(--app-page-bg) 56%, transparent);
  gap: 8px;
}

.cover-switcher-item {
  overflow: hidden;
  width: 192px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 4px;
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
</style>
