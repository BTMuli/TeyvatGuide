<template>
  <div class="tp-vod-box">
    <div class="tp-vod-container" data-html2canvas-ignore />
    <div class="tp-vod-cover">
      <img alt="cover" :src="props.data.insert.vod.cover" />
      <img src="/source/UI/video_play.svg" alt="icon" />
      <span>{{ getVodTime() }}</span>
    </div>
  </div>
</template>
<script lang="ts" setup>
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
    autoSize: true,
    playbackRate: true,
    aspectRatio: true,
    setting: true,
    hotkey: true,
    pip: true,
    quality: [],
    icons: {
      // eslint-disable-next-line @typescript-eslint/quotes
      state: `<img src="/source/UI/video_play.svg" alt="icon" />`,
    },
    lang: "zh-cn",
    airplay: true,
  };
  const resolutions = props.data.insert.vod.resolutions;
  resolutions.forEach((resolution) => {
    if (option.url === "") {
      option.url = resolution.url;
      option.type = resolution.format;
    }
    const quality = {
      default: false,
      html: resolution.label,
      url: resolution.url,
    };
    option.quality?.push(quality);
  });
  container.value = new Artplayer(option);
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
  border-radius: 10px;
  aspect-ratio: 16 / 9;
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
