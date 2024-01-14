<template>
  <div class="tp-video-box">
    <!-- todo https://socialsisteryi.github.io/bilibili-API-collect/docs/video/videostream_url.html#%E8%A7%86%E9%A2%91%E4%BC%B4%E9%9F%B3%E9%9F%B3%E8%B4%A8%E4%BB%A3%E7%A0%81 -->
    <iframe
      class="tp-video-container"
      data-html2canvas-ignore
      :src="props.data.insert.video"
      :allowfullscreen="false"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      sandbox="allow-forms allow-same-origin allow-popups allow-presentation"
    >
    </iframe>
    <!-- todo 优化 -->
    <div class="tp-video-cover" v-if="videoData">
      <img alt="cover" :src="videoData.pic" />
      <img src="/source/UI/video_play.svg" alt="icon" />
      <span>{{ getVideoTime() }}</span>
    </div>
  </div>
</template>
<script lang="ts" setup>
import md5 from "js-md5";
import { onMounted, ref } from "vue";

import Bili from "../../plugins/Bili";
import { saveImgLocal } from "../../utils/TGShare";

interface TpVideo {
  insert: {
    video: string;
  };
}

interface TpVideoProps {
  data: TpVideo;
}

const props = defineProps<TpVideoProps>();
const videoAspectRatio = ref<number>(16 / 9);
const videoData = ref<TGApp.Plugins.Bili.Video.ViewData>();

console.log("tpVideo", props.data.insert.video);

onMounted(async () => {
  const url = new URL(props.data.insert.video);
  const aid = url.searchParams.get("aid") ?? undefined;
  const bvid = url.searchParams.get("bvid") ?? undefined;
  videoData.value = await Bili.video.view(aid, bvid);
  if (!videoData.value) {
    return;
  }
  if (!videoData.value?.pic.startsWith("blob")) {
    videoData.value.pic = await saveImgLocal(videoData.value?.pic);
  }
  const meta = videoData.value.dimension;
  if (meta.width > meta.height) {
    videoAspectRatio.value = meta.width / meta.height;
  } else {
    videoAspectRatio.value = meta.height / meta.width;
  }
});

function getVideoTime(): string {
  const duration = videoData.value?.duration ?? 0;
  console.log("duration", duration);
  const seconds = duration % 60;
  const minutes = Math.floor(duration / 60) % 60;
  const hours = Math.floor(duration / 3600);
  let result = "";
  if (hours > 0) {
    result += `${hours.toString().padStart(2, "0")}:`;
  }
  result += `${minutes.toString().padStart(2, "0")}:`;
  result += `${seconds.toString().padStart(2, "0")}`;
  return result;
}

// 计算 md5
function getVideoHash(): string {
  return md5.md5(props.data.insert.video);
}
</script>
<style lang="css" scoped>
.tp-video-box {
  position: relative;
  max-width: 100%;
  margin: 10px auto;
  aspect-ratio: v-bind(videoAspectRatio);
}

.tp-video-container {
  overflow: hidden;
  width: 100%;
  max-width: 100%;
  border: none;
  border-radius: 10px;
  aspect-ratio: v-bind(videoAspectRatio);
}

.tp-video-cover {
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
  aspect-ratio: v-bind(videoAspectRatio);
}

.tp-video-cover :first-child {
  width: 100%;
  object-fit: cover;
}

.tp-video-cover :nth-child(2) {
  position: absolute;
  top: calc(50% - 40px);
  left: calc(50% - 40px);
  width: 80px;
  height: 80px;
}

.tp-video-cover :nth-child(3) {
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
