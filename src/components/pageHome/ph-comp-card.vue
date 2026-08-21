<template>
  <div ref="thcRef" class="thc-share">
    <div class="thc-container">
      <div class="thc-title" title="点击生成分享" @click="share()">
        <slot name="title">{{ props.title }}</slot>
      </div>
      <div v-if="append" class="thc-append">
        <slot name="title-append" />
      </div>
      <div class="thc-box">
        <slot name="default" />
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import showLoading from "@comp/func/loading.js";
import TGShare, { generateShareImg, type ShareProgress } from "@utils/TGShare.js";
import { useTemplateRef } from "vue";

/** 首页组件参数 */
type PhCompCardProps = {
  /** 标题 */
  title?: string;
  /** 是否显示append */
  append?: boolean;
  /** 使用 TGShare.modern 截图 */
  modernShare?: boolean;
  /** 是否显示 modern 分享进度 */
  shareProgress?: boolean;
  /** 分享文件名 */
  shareTitle?: string;
};

const props = defineProps<PhCompCardProps>();

const thcEl = useTemplateRef<HTMLDivElement>("thcRef");

async function share(): Promise<void> {
  if (!thcEl.value) return;
  const fileName = props.shareTitle ?? `HomeComp_${props.title}`;
  let progressAt = 0;

  function reportShareProgress(progress: ShareProgress): void {
    const isTail = progress.current >= progress.total;
    const now = performance.now();
    if (!isTail && now - progressAt < 80) return;
    progressAt = now;
    if (progress.phase === "snapshot") {
      void showLoading.update("正在截取背景", { title: "正在烘焙毛玻璃", timeout: 0 });
      return;
    }
    if (progress.phase === "bake") {
      void showLoading.update(`${progress.current}/${progress.total}`, {
        title: "正在烘焙毛玻璃",
        timeout: 0,
      });
      return;
    }
    void showLoading.update(`${progress.current}/${progress.total}`, {
      title: "正在生成图片",
      timeout: 0,
    });
  }

  await showLoading.start("正在生成分享图片", fileName);
  try {
    if (props.modernShare) {
      const options = props.shareProgress ? { onProgress: reportShareProgress } : undefined;
      await TGShare.modern(fileName, thcEl.value, 2, false, options);
      return;
    }
    await generateShareImg(fileName, thcEl.value);
  } finally {
    await showLoading.end();
  }
}
</script>
<style lang="scss" scoped>
@use "@styles/github.styles.scss" as github-styles;

.thc-share {
  padding-top: 16px;
  margin-top: 8px;
}

.thc-container {
  @include github-styles.github-card;

  position: relative;
  min-height: 100px;
  box-sizing: border-box;
  padding: 24px 8px 8px;
  border-radius: 4px;
}

.dark .thc-container {
  @include github-styles.github-card("dark");
}

.thc-title,
.thc-append {
  position: absolute;
  top: -16px;
  display: flex;
  height: 32px;
  box-sizing: border-box;
  align-items: center;
  justify-content: center;
  padding: 0 10px;
  border: 1px solid var(--tgc-od-white);
  border-radius: 4px;
  background: var(--tgc-od-blue);
  font-family: var(--font-title);
}

.thc-title {
  left: 8px;
  color: var(--tgc-white-1);
  cursor: pointer;
  font-size: 20px;
}

.thc-append {
  right: 8px;
  color: var(--tgc-white-1);
  font-size: 16px;
}
</style>
