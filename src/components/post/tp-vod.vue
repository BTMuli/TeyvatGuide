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
        <span>{{ getVodTime() }}</span>
      </div>
      <div class="tp-vod-view">
        <v-icon size="12">mdi-eye</v-icon>
        <span>{{ props.data.insert.vod.view_num ?? 0 }}</span>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { window as TauriWindow } from "@tauri-apps/api";
import Artplayer from "artplayer";
import type { Option } from "artplayer/types/option.js";
import { onMounted, ref, toRaw } from "vue";

import { getImageBuffer, saveCanvasImg } from "../../utils/TGShare.js";
import { bytesToSize } from "../../utils/toolFunc.js";
import showSnackbar from "../func/snackbar.js";

interface TpVod {
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
}

interface TpVodProps {
  data: TpVod;
}

const props = defineProps<TpVodProps>();
const container = ref<Artplayer | null>(null);
const vodAspectRatio = ref<number>(16 / 9);

console.log("tpVod", props.data.insert.vod.id, toRaw(props.data).insert.vod);

onMounted(async () => {
  const resolutions = props.data.insert.vod.resolutions;
  const highestResolution = resolutions.reduce((prev, curr) => {
    return prev.size > curr.size ? prev : curr;
  });
  const width = highestResolution.width;
  const height = highestResolution.height;
  if (width && height) {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    width > height
      ? (vodAspectRatio.value = width / height)
      : (vodAspectRatio.value = height / width);
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
    quality: resolutions.map((resolution) => {
      return {
        default: resolution.label == highestResolution.label,
        html: resolution.label,
        url: resolution.url,
      };
    }),
    fullscreen: true,
    icons: {
      state: `<img src="/source/UI/video_play.svg" alt="icon" />`,
    },
    lang: "zh-cn",
    airplay: true,
    controls: [
      {
        name: "subtitle",
        index: 100,
        position: "left",
        html: `<i class="mdi mdi-eye"></i><span style="padding-left: 5px">${
          props.data.insert.vod?.view_num ?? 0
        }</span>`,
        tooltip: `播放数：${props.data.insert.vod?.view_num ?? 0}`,
      },
      {
        name: "download-cover",
        index: 0,
        position: "right",
        html: `<i class="mdi mdi-download"></i>`,
        tooltip: "下载封面",
        click: async () => {
          const buffer = await getImageBuffer(props.data.insert.vod.cover);
          const size = bytesToSize(buffer.byteLength);
          await saveCanvasImg(buffer, `vod-cover-${props.data.insert.vod.id}`);
          showSnackbar({ text: `封面已下载到本地，大小：${size}` });
        },
      },
    ],
  };
  container.value = new Artplayer(option);
  container.value?.on("fullscreen", async (state) => {
    await TauriWindow.getCurrentWindow().setFullscreen(state);
  });
});

function getVodTime(): string {
  const duration = props.data.insert.vod.duration;
  const secTotal = Math.floor(duration / 1000);
  const seconds = secTotal % 60;
  const minutes = Math.floor(secTotal / 60) % 60;
  const hours = Math.floor(secTotal / 3600);
  let result = "";
  if (hours > 0) {
    result += `${hours.toString().padStart(2, "0")}:`;
  }
  result += `${minutes.toString().padStart(2, "0")}:`;
  result += `${seconds.toString().padStart(2, "0")}`;
  return result;
}
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
