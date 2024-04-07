<template>
  <div class="tp-vod-box">
    <div
      class="tp-vod-container"
      data-html2canvas-ignore
      :id="`tp-vod-${props.data.insert.vod.id}`"
    ></div>
    <div class="tp-vod-cover">
      <img alt="cover" :src="props.data.insert.vod.cover" />
      <img src="/source/UI/video_play.svg" alt="icon" />
      <span>{{ getVodTime() }}</span>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { window as TauriWindow } from "@tauri-apps/api";
import Artplayer from "artplayer";
import type { Option } from "artplayer/types/option";
import { onMounted, ref, toRaw } from "vue";

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
      // eslint-disable-next-line @typescript-eslint/quotes
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
    ],
  };
  container.value = new Artplayer(option);
  container.value?.on("fullscreen", async (state) => {
    await TauriWindow.getCurrent().setFullscreen(state);
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

.tp-vod-cover {
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

.tp-vod-cover :first-child {
  width: 100%;
  object-fit: cover;
}

.tp-vod-cover :nth-child(2) {
  position: absolute;
  top: calc(50% - 40px);
  left: calc(50% - 40px);
  width: 80px;
  height: 80px;
}

.tp-vod-cover :nth-child(3) {
  position: absolute;
  right: 10px;
  bottom: 10px;
  padding: 0 5px;
  border-radius: 5px;
  background: rgb(0 0 0/50%);
  color: var(--tgc-white-4);
  font-family: var(--font-title);
  font-size: 12px;
}
</style>
