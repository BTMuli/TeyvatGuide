<!-- 渲染容器右下角的启动器背景轮换示意 -->
<template>
  <div v-if="pageCoverItems.length > 1" class="cover-switcher">
    <Transition name="cover-panel">
      <div v-if="expanded" aria-label="启动器背景轮换" class="cover-panel" role="group">
        <div class="cover-panel-strip">
          <PgCoverItem
            v-for="(cover, index) in pageCoverItems"
            :key="cover.id"
            :actionPending="actionPending !== null"
            :count="pageCoverItems.length"
            :current="index === pageCoverIndex"
            :dynamic="cover.videoUrl !== null"
            :index
            :loadingAction="actionPending?.url === cover.imageUrl ? actionPending.action : null"
            :url="cover.imageUrl"
            :videoPaused="cover.videoPaused"
            @select="selectPageCover(index)"
            @copy="handleCopy(cover.imageUrl)"
            @download="handleDownload(cover.imageUrl, index)"
            @download-video="handleDownloadVideo(index)"
            @toggle-video="togglePageCoverVideoPaused(index)"
          />
        </div>
        <div v-if="pageCoverRotationAvailable" class="cover-panel-footer">
          <span class="cover-panel-state">{{ rotationStateLabel }}</span>
          <v-progress-linear
            :color="rotationProgressColor"
            :model-value="pageCoverRotationProgress * 100"
            :rounded="true"
            bg-color="var(--common-shadow-2)"
            bg-opacity="1"
            class="cover-panel-progress"
            height="4"
          />
          <button class="cover-panel-pause" type="button" @click="togglePageCoverRotationPaused">
            <v-icon :icon="rotationIcon" size="14" />
            {{ rotationActionLabel }}
          </button>
        </div>
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
import showSnackbar from "@comp/func/snackbar.js";
import { usePageCover } from "@hooks/usePageCover.js";
import TGHttps from "@utils/TGHttps.js";
import { copyToClipboard, saveBufferFile } from "@utils/TGShare.js";
import { computed, ref } from "vue";

import PgCoverItem from "./pg-cover-item.vue";

const {
  pageCoverIndex,
  pageCoverItems,
  pageCoverRotationAvailable,
  pageCoverRotationPaused,
  pageCoverRotationProgress,
  selectPageCover,
  togglePageCoverRotationPaused,
  togglePageCoverVideoPaused,
} = usePageCover();
const expanded = ref<boolean>(false);
const actionPending = ref<{
  url: string;
  action: "copy" | "download" | "download-video";
} | null>(null);
const rotationStateLabel = computed<string>(() =>
  pageCoverRotationPaused.value ? "背景轮换已暂停" : "背景轮换中",
);
const rotationActionLabel = computed<string>(() =>
  pageCoverRotationPaused.value ? "继续轮换" : "暂停轮换",
);
const rotationIcon = computed<string>(() =>
  pageCoverRotationPaused.value ? "mdi-play-circle-outline" : "mdi-pause-circle-outline",
);
const rotationProgressColor = computed<string>(() =>
  pageCoverRotationPaused.value ? "var(--tgc-od-white)" : "var(--tgc-od-blue)",
);

async function loadCoverPng(url: string): Promise<ArrayBuffer> {
  const source = await TGHttps.buffer(url);
  const bitmap = await createImageBitmap(new Blob([new Uint8Array(source)]));
  try {
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d");
    if (context === null) throw new Error("无法处理背景图像");
    context.drawImage(bitmap, 0, 0);
    const png = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob === null) reject(new Error("无法转换背景图像"));
        else resolve(blob);
      }, "image/png");
    });
    return png.arrayBuffer();
  } finally {
    bitmap.close();
  }
}

async function handleCopy(url: string): Promise<void> {
  if (actionPending.value !== null) return;
  actionPending.value = { url, action: "copy" };
  try {
    await copyToClipboard(await loadCoverPng(url));
    showSnackbar.success("背景图像已复制到剪贴板");
  } catch (error) {
    showSnackbar.error(`复制背景图像失败：${TGHttps.getErrMsg(error)}`);
  } finally {
    actionPending.value = null;
  }
}

async function handleDownload(url: string, index: number): Promise<void> {
  if (actionPending.value !== null) return;
  actionPending.value = { url, action: "download" };
  try {
    await saveBufferFile(await loadCoverPng(url), `原神启动器背景-${index + 1}`);
  } catch (error) {
    showSnackbar.error(`下载背景图像失败：${TGHttps.getErrMsg(error)}`);
  } finally {
    actionPending.value = null;
  }
}

async function handleDownloadVideo(index: number): Promise<void> {
  const cover = pageCoverItems.value[index];
  if (actionPending.value !== null || cover === undefined || cover.videoUrl === null) return;
  actionPending.value = { url: cover.imageUrl, action: "download-video" };
  try {
    const buffer = await TGHttps.buffer(cover.videoUrl);
    await saveBufferFile(buffer, `原神启动器动态背景-${index + 1}`, "webm", "WebM 视频");
  } catch (error) {
    showSnackbar.error(`下载动态背景失败：${TGHttps.getErrMsg(error)}`);
  } finally {
    actionPending.value = null;
  }
}
</script>

<style lang="scss" scoped>
.cover-switcher {
  position: absolute;
  z-index: 1;
  right: -16px;
  bottom: 0;
  display: flex;
  height: 40px;
  align-items: flex-end;
  padding-right: 24px;
}

.cover-panel {
  display: flex;
  flex-direction: column;
  padding: 8px;
  border: 1px solid var(--common-shadow-2);
  border-radius: 12px;
  -webkit-backdrop-filter: blur(4px);
  backdrop-filter: blur(4px);
  background: color-mix(in srgb, var(--app-page-bg) 24%, transparent);
  box-shadow: 0 4px 16px var(--common-shadow-2);
  gap: 8px;
}

.cover-panel-strip {
  display: flex;
  gap: 8px;
}

.cover-panel-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.cover-panel-state {
  width: 100px;
  flex-shrink: 0;
  color: var(--app-page-content);
  font-size: 12px;
  line-height: 16px;
}

.cover-panel-progress {
  flex: 1;
}

.cover-panel-pause {
  display: flex;
  height: 24px;
  flex-shrink: 0;
  align-items: center;
  padding: 0 8px;
  border: 1px solid var(--common-shadow-2);
  border-radius: 4px;
  -webkit-backdrop-filter: blur(4px);
  backdrop-filter: blur(4px);
  background: color-mix(in srgb, var(--app-page-bg) 72%, transparent);
  color: var(--app-page-content);
  cursor: pointer;
  font-family: var(--font-text);
  font-size: 12px;
  gap: 4px;
  transition: border-color 0.2s ease;

  &:hover {
    border-color: var(--tgc-od-blue);
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
