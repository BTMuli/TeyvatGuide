<!-- 米社视频组件 -->
<template>
  <div class="tp-vod-box">
    <div
      :id="`tp-vod-${props.data.insert.vod.id}`"
      class="tp-vod-container"
      data-html2canvas-ignore
    ></div>
    <div class="tp-vod-share">
      <img :src="coverUrl" alt="cover" class="tp-vod-cover" />
      <img alt="icon" class="tp-vod-icon" src="/source/UI/video_play.svg" />
      <div class="tp-vod-time">
        <v-icon size="12">mdi-clock-time-four-outline</v-icon>
        <span>{{ getVideoDuration(props.data.insert.vod.duration) }}</span>
      </div>
      <div class="tp-vod-view">
        <v-icon size="12">mdi-eye</v-icon>
        <span>{{ props.data.insert.vod.view_num ?? 0 }}</span>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import showLoading from "@comp/func/loading.js";
import useAppStore from "@store/app.js";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { openUrl } from "@tauri-apps/plugin-opener";
import { getImageBuffer, saveCanvasImg, saveImgLocal } from "@utils/TGShare.js";
import { getVideoDuration } from "@utils/toolFunc.js";
import Artplayer, { type Option } from "artplayer";
import { storeToRefs } from "pinia";
import { onMounted, onUnmounted, ref, shallowRef, toRaw, watch } from "vue";

type TpVod = {
  insert: {
    vod: {
      id: string;
      duration: number;
      cover: string;
      resolutions: Array<{
        url: string;
        definition: "480P" | "720P" | "1080P" | "2K"; // 待补充
        height: number;
        width: number;
        bitrate: number;
        size: number;
        format: "MP4"; // 待补充
        label: "480P" | "720P" | "1080P" | "2K"; // 待补充
      }>;
      view_num?: number;
      transcode_status: number;
      review_status: number;
    };
  };
};
type TpVodProps = { data: TpVod };

const appStore = useAppStore();
const props = defineProps<TpVodProps>();

const { postViewWide } = storeToRefs(appStore);

const coverUrl = ref<string>();
const vodAspectRatio = ref<number>(16 / 9);
const coverBuffer = shallowRef<ArrayBuffer | null>(null);
const container = shallowRef<Artplayer | null>(null);

watch(
  () => postViewWide.value,
  () => (vodAspectRatio.value = calcAspectRatio()),
);

console.log("tpVod", props.data.insert.vod.id, toRaw(props.data).insert.vod);

onMounted(async () => {
  const resolutions = props.data.insert.vod.resolutions;
  const highestResolution = resolutions.reduce((prev, curr) =>
    prev.size > curr.size ? prev : curr,
  );
  vodAspectRatio.value = calcAspectRatio();
  const localUrl = appStore.getImageUrl(props.data.insert.vod.cover);
  coverUrl.value = await saveImgLocal(localUrl);
  const option: Option = {
    id: props.data.insert.vod.id,
    container: `#tp-vod-${props.data.insert.vod.id}`,
    url: highestResolution.url,
    poster: coverUrl.value,
    type: highestResolution.format,
    playbackRate: true,
    aspectRatio: false,
    setting: true,
    hotkey: true,
    pip: true,
    quality: resolutions.map((resolution) => ({
      default: resolution.label == highestResolution.label,
      html: resolution.label,
      url: resolution.url,
    })),
    fullscreen: true,
    icons: { state: `<img src="/source/UI/video_play.svg" alt="icon" />` },
    lang: "zh-cn",
    airplay: true,
    controls: [
      {
        name: "subtitle",
        index: 100,
        position: "left",
        html: `
          <span class="vod-box-view">
            <i class="mdi mdi-eye"></i>
            <span>${props.data.insert.vod?.view_num ?? 0}</span>
          </span>
        `,
        tooltip: `播放数：${props.data.insert.vod?.view_num ?? 0}`,
      },
      {
        name: "download-cover",
        index: 0,
        position: "right",
        html: `<span class="mdi mdi-image-check vod-box-act" />`,
        tooltip: "下载封面",
        click: async () => {
          await showLoading.start("正在下载封面", props.data.insert.vod.cover);
          if (!coverBuffer.value) {
            coverBuffer.value = await getImageBuffer(props.data.insert.vod.cover);
          }
          await saveCanvasImg(coverBuffer.value, `vod-cover-${props.data.insert.vod.id}`);
          await showLoading.end();
        },
      },
      {
        name: "download-video",
        index: 0,
        position: "right",
        html: `<span class="mdi mdi-video-check vod-box-act" />`,
        tooltip: "下载视频",
        click: async () => {
          if (!container.value) return;
          await openUrl(container.value.url);
        },
      },
    ],
  };
  container.value = new Artplayer(option);
  container.value?.on("fullscreen", async (s) => await getCurrentWindow().setFullscreen(s));
});

function calcAspectRatio(): number {
  const resolutions = props.data.insert.vod.resolutions;
  const highestResolution = resolutions.reduce((prev, curr) =>
    prev.size > curr.size ? prev : curr,
  );
  const width = highestResolution.width;
  const height = highestResolution.height;
  if (!postViewWide.value) return width / height;
  if (width > height) return width / height;
  return height / width;
}

onUnmounted(() => {
  container.value?.destroy();
  if (coverBuffer.value) coverBuffer.value = null;
  if (coverUrl.value) URL.revokeObjectURL(coverUrl.value);
});
</script>
<style lang="css" scoped>
.tp-vod-box {
  position: relative;
  max-width: 100%;
  margin: 8px auto;
  aspect-ratio: v-bind(vodAspectRatio); /* stylelint-disable-line value-keyword-case */
}

.tp-vod-container {
  overflow: hidden;
  max-width: 100%;
  border-radius: 8px;
  aspect-ratio: v-bind(vodAspectRatio); /* stylelint-disable-line value-keyword-case */
}

.tp-vod-share {
  position: absolute;
  z-index: -1;
  top: 0;
  left: 0;
  display: flex;
  overflow: hidden;
  width: 100%;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  aspect-ratio: v-bind(vodAspectRatio); /* stylelint-disable-line value-keyword-case */
}

.tp-vod-cover {
  position: absolute;
  max-width: 100%;
  object-fit: cover;
}

.tp-vod-icon {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 50px;
  height: 50px;
  opacity: 0.8;
  transform: translate(-50%, -50%);
}

.tp-vod-time {
  position: absolute;
  bottom: 8px;
  left: 8px;
  display: flex;
  align-items: center;
  padding: 2px 4px;
  border-radius: 4px;
  background: #00000080;
  color: var(--tgc-white-4);
  font-family: var(--font-title);
  font-size: 12px;
  gap: 4px;
}

.tp-vod-view {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  align-items: center;
  padding: 2px 4px;
  border-radius: 4px;
  background: #00000080;
  color: var(--tgc-white-4);
  font-family: var(--font-title);
  font-size: 12px;
  gap: 4px;
}

/** Artplayer 内部控件 */

:deep(.art-video-player) {
  --art-control-height: 32px;
  --art-control-icon-size: 24px;
  --art-control-icon-scale: 1;
  --art-padding: 8px;
  --art-bottom-gap: 4px;

  .art-bottom {
    display: flex;
    box-sizing: border-box;
    flex-direction: column;
    justify-content: flex-end;
    padding: var(--art-padding);
  }

  .art-controls {
    height: fit-content;
    flex-wrap: wrap;
  }

  .art-controls-left,
  .art-controls-right {
    height: fit-content;
  }
}

:deep(.vod-box-view) {
  font-size: 16px;
}

:deep(.vod-box-act) {
  margin: 0 4px;
  cursor: pointer;
  font-size: 20px;
}
</style>
