<template>
  <div class="tp-vod-box">
    <div class="tp-vod-container" data-html2canvas-ignore></div>
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
      id: number;
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
      view_num: number;
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

console.log("tpVod", props.data.insert.vod.id, toRaw(props.data).insert.vod);

onMounted(async () => {
  const option: Option = {
    container: ".tp-vod-container",
    url: "",
    poster: props.data.insert.vod.cover,
    type: "",
    playbackRate: true,
    aspectRatio: true,
    setting: true,
    hotkey: true,
    pip: true,
    quality: [],
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
        html: `<i class="mdi mdi-eye"></i><span style="padding-left: 5px">${props.data.insert.vod.view_num}</span>`,
        tooltip: `播放数：${props.data.insert.vod.view_num}`,
      },
    ],
  };
  const resolutions = props.data.insert.vod.resolutions;
  let size = 0,
    label = "";
  for (const resolution of resolutions) {
    if (option.url === "") {
      option.url = resolution.url;
      option.type = resolution.format;
      size = resolution.size;
      label = resolution.label;
    }
    if (resolution.size > size) {
      size = resolution.size;
      label = resolution.label;
    }
    const quality = {
      default: false,
      html: resolution.label,
      url: resolution.url,
    };
    option.quality?.push(quality);
  }
  option?.quality?.map((item) => {
    if (item.html == label) {
      item.default = true;
    }
  });
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
  margin: 10px auto;
}

.tp-vod-container {
  overflow: hidden;
  max-width: 100%;
  height: 450px;
  border-radius: 10px;
}

.tp-vod-cover {
  position: absolute;
  z-index: -1;
  top: 0;
  left: 0;
  display: flex;
  overflow: hidden;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
}

.tp-vod-cover :nth-child(1) {
  max-width: 100%;
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
