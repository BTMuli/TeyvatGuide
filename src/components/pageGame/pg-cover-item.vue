<!-- 单张启动器背景缩略图及其复制、下载操作 -->
<template>
  <div :class="{ current }" class="cover-panel-item">
    <button
      :aria-current="current ? 'true' : undefined"
      :aria-label="`第 ${index + 1} 张背景，共 ${count} 张`"
      :style="coverItemStyle(url)"
      class="cover-panel-select"
      type="button"
      @click="emit('select')"
    />
    <div class="cover-panel-actions">
      <div class="cover-panel-action">
        <v-progress-circular
          v-if="loadingAction === 'copy'"
          aria-label="正在复制图像"
          indeterminate
          size="12"
          width="2"
        />
        <v-icon
          v-else
          :aria-disabled="actionPending"
          :tabindex="actionPending ? -1 : 0"
          aria-label="复制图像到剪贴板"
          icon="mdi-content-copy"
          role="button"
          size="12"
          title="复制图像到剪贴板"
          @click.stop="emit('copy')"
          @keydown.enter.stop.prevent="emit('copy')"
          @keydown.space.stop.prevent="emit('copy')"
        />
      </div>
      <div class="cover-panel-action">
        <v-progress-circular
          v-if="loadingAction === 'download'"
          aria-label="正在下载图像"
          indeterminate
          size="12"
          width="2"
        />
        <v-icon
          v-else
          :aria-disabled="actionPending"
          :tabindex="actionPending ? -1 : 0"
          aria-label="下载图像到本地"
          icon="mdi-download"
          role="button"
          size="12"
          title="下载图像到本地"
          @click.stop="emit('download')"
          @keydown.enter.stop.prevent="emit('download')"
          @keydown.space.stop.prevent="emit('download')"
        />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
defineProps<{
  url: string;
  index: number;
  count: number;
  current: boolean;
  actionPending: boolean;
  loadingAction: "copy" | "download" | null;
}>();
const emit = defineEmits<{ select: []; copy: []; download: [] }>();

function coverItemStyle(url: string): { backgroundImage: string } {
  const previewUrl = new URL(url);
  if (!previewUrl.searchParams.has("x-oss-process")) {
    previewUrl.searchParams.set("x-oss-process", "image/resize,w_384/format,webp/quality,Q_75");
  }
  return { backgroundImage: `url("${previewUrl.toString()}")` };
}
</script>

<style lang="scss" scoped>
.cover-panel-item {
  position: relative;
  overflow: hidden;
  width: 192px;
  border: 1px solid transparent;
  border-radius: 8px;
  aspect-ratio: 2560 / 1440;

  &:hover,
  &.current {
    border-color: var(--tgc-od-blue);
  }
}

.cover-panel-select {
  position: absolute;
  width: 100%;
  height: 100%;
  padding: 0;
  border: 0;
  background-position: center;
  background-repeat: no-repeat;
  background-size: cover;
  cursor: pointer;
  inset: 0;

  &:focus-visible {
    outline: 2px solid var(--tgc-od-blue);
    outline-offset: -2px;
  }
}

.cover-panel-actions {
  position: absolute;
  right: 8px;
  bottom: 8px;
  display: flex;
  gap: 4px;
}

.cover-panel-action {
  display: grid;
  width: 20px;
  height: 20px;
  border-radius: 2px;
  -webkit-backdrop-filter: blur(4px);
  backdrop-filter: blur(4px);
  background: color-mix(in srgb, var(--app-page-bg) 72%, transparent);
  color: var(--app-page-content);
  place-items: center;

  &:hover {
    background: color-mix(in srgb, var(--app-page-bg) 88%, transparent);
  }

  .v-icon {
    cursor: pointer;

    &:focus-visible {
      outline: 2px solid var(--tgc-od-blue);
      outline-offset: 2px;
    }

    &[aria-disabled="true"] {
      cursor: wait;
      opacity: 0.6;
      pointer-events: none;
    }
  }
}
</style>
