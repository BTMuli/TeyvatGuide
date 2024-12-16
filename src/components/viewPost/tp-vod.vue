<template>
  <div class="tp-vod-box">
    <div
      class="tp-vod-container"
      data-html2canvas-ignore
      :id="`tp-vod-${props.data.insert.vod.id}`"
    ></div>
    <div class="tp-vod-share">
      <img alt="cover" :src="props.data.insert.vod.cover" class="tp-vod-cover" />
      <img src="/source/UI/video_play.svg" alt="icon" class="tp-vod-icon" />
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
import { getCurrentWindow } from "@tauri-apps/api/window";
import Artplayer from "artplayer";
import type { Option } from "artplayer/types/option.js";
import { onMounted, ref, shallowRef, toRaw } from "vue";

import { getImageBuffer, saveCanvasImg } from "@/utils/TGShare.js";
import { getVideoDuration } from "@/utils/toolFunc.js";

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

const props = defineProps<TpVodProps>();
const container = shallowRef<Artplayer | null>(null);
const vodAspectRatio = ref<number>(16 / 9);
const coverBuffer = shallowRef<Uint8Array | null>(null);

console.log("tpVod", props.data.insert.vod.id, toRaw(props.data).insert.vod);

onMounted(async () => {
  const resolutions = props.data.insert.vod.resolutions;
  const highestResolution = resolutions.reduce((prev, curr) =>
    prev.size > curr.size ? prev : curr,
  );
  const width = highestResolution.width;
  const height = highestResolution.height;
  if (width && height) {
    if (width > height) vodAspectRatio.value = width / height;
    else vodAspectRatio.value = height / width;
  }
  const option: Option = {
    id: props.data.insert.vod.id,
    container: `#tp-vod-${props.data.insert.vod.id}`,
    url: highestResolution.url,
    poster: props.data.insert.vod.cover,
    type: highestResolution.format,
    playbackRate: true,
    aspectRatio: true,
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
        html: `<i class="mdi mdi-eye"></i><span style="padding-left: 5px">${props.data.insert.vod?.view_num ?? 0}</span>`,
        tooltip: `播放数：${props.data.insert.vod?.view_num ?? 0}`,
      },
      {
        name: "download-cover",
        index: 0,
        position: "right",
        html: `<i class="mdi mdi-download"></i>`,
        tooltip: "下载封面",
        click: async () => {
          if (!coverBuffer.value) {
            coverBuffer.value = await getImageBuffer(props.data.insert.vod.cover);
          }
          await saveCanvasImg(coverBuffer.value, `vod-cover-${props.data.insert.vod.id}`);
        },
      },
    ],
  };
  container.value = new Artplayer(option);
  container.value?.on("fullscreen", async (s) => await getCurrentWindow().setFullscreen(s));
});
</script>
<style lang="css" scoped>
.tp-vod-box {
  position: relative;
  max-width: 100%;
  margin: 10px auto;
  aspect-ratio: v-bind(vodAspectRatio);
}

.tp-vod-container {
  overflow: hidden;
  max-width: 100%;
  border-radius: 10px;
  aspect-ratio: v-bind(vodAspectRatio);
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
  border-radius: 10px;
  aspect-ratio: v-bind(vodAspectRatio);
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
  bottom: 10px;
  left: 10px;
  display: flex;
  align-items: center;
  padding: 2px 5px;
  border-radius: 5px;
  background: rgb(0 0 0/50%);
  color: var(--tgc-white-4);
  font-family: var(--font-title);
  font-size: 12px;
  gap: 5px;
}

.tp-vod-view {
  position: absolute;
  top: 10px;
  right: 10px;
  display: flex;
  align-items: center;
  padding: 2px 5px;
  border-radius: 5px;
  background: rgb(0 0 0/50%);
  color: var(--tgc-white-4);
  font-family: var(--font-title);
  font-size: 12px;
  gap: 5px;
}
</style>
