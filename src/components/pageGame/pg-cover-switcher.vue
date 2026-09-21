<!-- 渲染容器右下角的启动器背景轮换示意 -->
<template>
  <div v-if="pageCoverUrls.length > 1" class="cover-switcher">
    <Transition name="cover-panel">
      <div v-if="expanded" aria-label="启动器背景轮换" class="cover-panel" role="group">
        <PgCoverItem
          v-for="(url, index) in pageCoverUrls"
          :key="url"
          :actionPending="actionPending !== null"
          :count="pageCoverUrls.length"
          :current="index === pageCoverIndex"
          :index
          :loadingAction="actionPending?.url === url ? actionPending.action : null"
          :url
          @select="selectPageCover(index)"
          @copy="handleCopy(url)"
          @download="handleDownload(url, index)"
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
import showSnackbar from "@comp/func/snackbar.js";
import { selectPageCover, usePageCover } from "@hooks/usePageCover.js";
import TGHttps from "@utils/TGHttps.js";
import { copyToClipboard, saveBufferFile } from "@utils/TGShare.js";
import { ref } from "vue";

import PgCoverItem from "./pg-cover-item.vue";

const { pageCoverIndex, pageCoverUrls } = usePageCover();
const expanded = ref<boolean>(false);
const actionPending = ref<{ url: string; action: "copy" | "download" } | null>(null);

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
  padding: 8px;
  border: 1px solid var(--common-shadow-2);
  border-radius: 12px;
  -webkit-backdrop-filter: blur(4px);
  backdrop-filter: blur(4px);
  background: color-mix(in srgb, var(--app-page-bg) 24%, transparent);
  box-shadow: 0 4px 16px var(--common-shadow-2);
  gap: 8px;
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
