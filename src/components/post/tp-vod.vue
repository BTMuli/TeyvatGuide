<template>
  <!-- todo 可以根据视频大小调整尺存 -->
  <div class="mys-post-div">
    <video class="mys-post-vod" :poster="getVodCover()" controls>
      <!-- 这边 type 暂时写死 todo -->
      <source :src="getVodSrc()" :type="getVodType()" />
    </video>
    <div class="mys-post-vod-cover-div">
      <img class="mys-post-vod-cover" alt="cover" :src="getVodCover()" />
      <img class="mys-post-vod-icon" src="/source/UI/video_play.svg" alt="icon" />
      <div class="mys-post-vod-time">{{ getVodTime() }}</div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { computed } from "vue";

interface TpVod {
  insert: {
    vod: {
      id: number;
      duration: number;
      cover: string;
      resolutions: Array<{
        url: string;
        definition: string;
        height: number;
        width: number;
        bitrate: number;
        size: number;
        format: string;
        label: string;
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
const highestResolution = computed(() => {
  let res = undefined;
  for (const resolution of props.data.insert.vod.resolutions) {
    if (res === undefined) {
      res = resolution;
    } else if (resolution.size > res.size) {
      res = resolution;
    }
  }
  return res;
});

function getVodSrc(): string {
  return highestResolution.value.url;
}

function getVodCover(): string {
  return props.data.insert.vod.cover;
}

function getVodType(): string {
  if (highestResolution.value.format === "MP4") {
    return "video/mp4";
  }
  // todo 还没有遇到过其他格式的视频
  return "video/webm";
}

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
