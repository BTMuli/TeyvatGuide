<template>
  <span
    :class="{
      'cp-image-thumbnail--cropped': cropped,
      'cp-image-thumbnail--interactive': originalUrl,
    }"
    :style="{
      '--cp-thumbnail-height': `${thumbnailHeight}px`,
      '--cp-thumbnail-min-width': `${thumbnailMinWidth}px`,
      width: displayWidth,
    }"
    class="cp-image-thumbnail"
  >
    <img
      :alt
      :data-post-card-action="originalUrl ? '' : undefined"
      :src="imageUrl"
      decoding="async"
      loading="lazy"
      @click="handleImageClick"
      @load="measureThumbnail"
    />
    <span v-if="cropped" aria-hidden="true" class="cp-image-thumbnail-cut">
      <v-icon icon="mdi-chevron-down" size="16" />
    </span>
    <button
      v-if="originalUrl"
      :aria-label="`放大${alt}`"
      class="cp-image-thumbnail-preview"
      data-html2canvas-ignore
      data-post-card-action
      title="放大图片"
      type="button"
      @click.stop="openPreview"
    >
      <v-icon aria-hidden="true" icon="mdi-magnify-plus-outline" size="16" />
    </button>
    <slot />
    <Teleport v-if="previewImage" to="body">
      <VpOverlayImage
        :key="previewImage.url"
        v-model="showImage"
        :format="previewImage.format"
        :image="previewImage.data"
        :link="previewImage.url"
        :ori="true"
        style="z-index: calc(var(--tgi-loading) - 1)"
        @after-leave="clearPreview"
      />
    </Teleport>
  </span>
</template>

<script lang="ts" setup>
import type { TpImage } from "@comp/viewPost/tp-image.vue";
import VpOverlayImage from "@comp/viewPost/vp-overlay-image.vue";
import useAppStore from "@store/app.js";
import { getPostImageOriginalUrl, getPostImageThumbnailUrl } from "@utils/bbs/postImage.js";
import { computed, ref, shallowRef } from "vue";

type CpImageThumbnailProps = {
  source: string;
  alt: string;
  attributes?: TpImage["attributes"];
};

const { source, alt, attributes } = defineProps<CpImageThumbnailProps>();
const appStore = useAppStore();
const thumbnailHeight = 160;
const thumbnailMinWidth = 120;
const showImage = ref<boolean>(false);
const narrowSource = ref<string>();
const openedSource = ref<string>();
const previewImage = shallowRef<{ url: string; format: string; data: TpImage }>();
const originalUrl = computed<URL | undefined>(() => getPostImageOriginalUrl(source));
const scaledWidth = computed<number>(() =>
  attributes && attributes.width > 0 && attributes.height > 0
    ? (thumbnailHeight * attributes.width) / attributes.height
    : 0,
);
const cropped = computed<boolean>(() =>
  scaledWidth.value > 0 ? scaledWidth.value < thumbnailMinWidth : narrowSource.value === source,
);
const displayWidth = computed<string | undefined>(() =>
  cropped.value || scaledWidth.value > 0
    ? `${Math.max(thumbnailMinWidth, scaledWidth.value)}px`
    : undefined,
);
const imageUrl = computed<string>(() => {
  if (openedSource.value === source && originalUrl.value) return originalUrl.value.href;
  return getPostImageThumbnailUrl(
    source,
    cropped.value ? thumbnailMinWidth : thumbnailHeight,
    appStore.imageQualityPercent,
    cropped.value ? "width" : "height",
  );
});

function measureThumbnail(event: Event): void {
  if (scaledWidth.value > 0 || cropped.value) return;
  const img = event.currentTarget;
  if (!(img instanceof HTMLImageElement) || img.naturalHeight <= 0) return;
  if (img.naturalWidth * thumbnailHeight < img.naturalHeight * thumbnailMinWidth) {
    narrowSource.value = source;
  }
}

function handleImageClick(event: MouseEvent): void {
  if (!originalUrl.value) return;
  event.stopPropagation();
  openPreview();
}

function openPreview(): void {
  const url = originalUrl.value;
  if (!url) return;
  openedSource.value = source;
  previewImage.value = {
    url: url.href,
    format: url.pathname.match(/\.([a-z0-9]+)$/i)?.[1].toLowerCase() ?? "png",
    data: { insert: { image: url.href }, attributes },
  };
  showImage.value = true;
}

function clearPreview(): void {
  if (!showImage.value) previewImage.value = undefined;
}
</script>

<style lang="scss" scoped>
.cp-image-thumbnail {
  position: relative;
  display: flex;
  overflow: hidden;
  min-width: var(--cp-thumbnail-min-width);
  height: var(--cp-thumbnail-height);
  flex-shrink: 0;
  justify-content: center;
  border-radius: 4px;
  background: var(--box-bg-2);

  img {
    display: block;
    width: auto;
    max-width: 100%;
    height: 100%;
    object-fit: contain;
  }

  &--cropped img {
    width: 100%;
    height: auto;
    align-self: flex-start;
  }

  &--interactive img {
    cursor: zoom-in;
  }
}

.cp-image-thumbnail-preview {
  position: absolute;
  bottom: 8px;
  left: 8px;
  display: grid;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 1px solid var(--common-shadow-t-2);
  border-radius: 50%;
  -webkit-backdrop-filter: blur(12px);
  backdrop-filter: blur(12px);
  background: color-mix(in srgb, var(--box-bg-t-1) 76%, transparent);
  color: var(--box-bg-1);
  cursor: pointer;
  place-items: center;

  &:hover {
    background: color-mix(in srgb, var(--box-bg-t-1) 88%, transparent);
  }

  &:focus-visible {
    outline: 2px solid var(--box-bg-1);
    outline-offset: 2px;
  }
}

.cp-image-thumbnail-cut {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  height: 4px;
  align-items: flex-end;
  justify-content: center;
  background: linear-gradient(to bottom, transparent, var(--tgc-dark-1));
  color: var(--tgc-white-1);
  pointer-events: none;
  text-shadow: 0 1px 4px var(--tgc-dark-1);
}
</style>
