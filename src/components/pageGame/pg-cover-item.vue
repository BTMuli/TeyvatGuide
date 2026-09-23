<!-- 单张启动器背景缩略图及其动态播放、复制、下载操作 -->
<template>
  <div :class="{ current }" class="cover-panel-item">
    <button
      :aria-current="current ? 'true' : undefined"
      :aria-label="`第 ${index + 1} 张${dynamic ? '动态' : ''}背景，共 ${count} 张`"
      :style="coverItemStyle(url)"
      class="cover-panel-select"
      type="button"
      @click="emit('select')"
    >
      <span v-if="dynamic" aria-hidden="true" class="cover-panel-badge" title="动态背景">
        <v-icon icon="mdi-video-outline" size="12" />
      </span>
    </button>
    <button
      v-if="dynamic"
      :aria-label="videoPaused ? '播放动态背景' : '暂停动态背景'"
      :title="videoPaused ? '播放动态背景' : '暂停动态背景'"
      class="cover-panel-play"
      type="button"
      @click.stop="emit('toggle-video')"
    >
      <v-icon :icon="videoPaused ? 'mdi-play' : 'mdi-pause'" size="12" />
    </button>
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
      <div v-if="dynamic" class="cover-panel-action">
        <v-progress-circular
          v-if="loadingAction === 'download-video'"
          aria-label="正在下载动态背景"
          indeterminate
          size="12"
          width="2"
        />
        <v-icon
          v-else
          :aria-disabled="actionPending"
          :tabindex="actionPending ? -1 : 0"
          aria-label="下载动态背景视频"
          icon="mdi-file-video-outline"
          role="button"
          size="12"
          title="下载动态背景视频"
          @click.stop="emit('download-video')"
          @keydown.enter.stop.prevent="emit('download-video')"
          @keydown.space.stop.prevent="emit('download-video')"
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
  dynamic: boolean;
  videoPaused: boolean;
  actionPending: boolean;
  loadingAction: "copy" | "download" | "download-video" | null;
}>();
const emit = defineEmits<{
  select: [];
  copy: [];
  download: [];
  "download-video": [];
  "toggle-video": [];
}>();

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
  padding: 4px;
  border-radius: 4px;
  aspect-ratio: 2560 / 1440;
  opacity: 0.6;
  transition: opacity 0.2s ease;

  &:hover,
  &:focus-within {
    background: var(--common-shadow-2);
    opacity: 1;
  }

  &.current {
    opacity: 1;
  }
}

.cover-panel-select {
  position: absolute;
  width: 100%;
  height: 100%;
  padding: 0;
  border: 0;
  border-radius: 2px;
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

.cover-panel-badge {
  position: absolute;
  top: 8px;
  left: 8px;
  display: grid;
  width: 20px;
  height: 20px;
  border-radius: 2px;
  -webkit-backdrop-filter: blur(4px);
  backdrop-filter: blur(4px);
  background: color-mix(in srgb, var(--app-page-bg) 72%, transparent);
  color: var(--app-page-content);
  place-items: center;
}

.cover-panel-play {
  position: absolute;
  top: 8px;
  left: 32px;
  display: grid;
  width: 20px;
  height: 20px;
  padding: 0;
  border: 0;
  border-radius: 2px;
  -webkit-backdrop-filter: blur(4px);
  backdrop-filter: blur(4px);
  background: color-mix(in srgb, var(--app-page-bg) 72%, transparent);
  color: var(--app-page-content);
  cursor: pointer;
  place-items: center;

  &:hover {
    background: color-mix(in srgb, var(--app-page-bg) 88%, transparent);
  }

  &:focus-visible {
    outline: 2px solid var(--tgc-od-blue);
    outline-offset: 2px;
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
