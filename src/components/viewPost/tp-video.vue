<template>
  <div class="tp-video-box" v-if="videoData">
    <iframe
      class="tp-video-container"
      :src="props.data.insert.video"
      :allowfullscreen="true"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      sandbox="allow-forms allow-same-origin allow-popups allow-presentation allow-scripts"
      :id="`tp-video-${props.data.insert.video}`"
    />
    <div class="tp-video-share">
      <img alt="cover" :src="videoCover" class="tp-video-cover" />
      <img alt="icon" src="/source/UI/video_play_bili.webp" class="tp-video-icon" />
      <div class="tp-video-info">
        <span>{{ videoData.bvid }}|{{ timestampToDate(videoData.ctime * 1000) }}</span>
        <span>{{ videoData.title }}</span>
      </div>
      <div class="tp-video-view">
        <v-icon size="12">mdi-eye</v-icon>
        <span>{{ videoData.stat.view }}</span>
      </div>
      <div class="tp-video-time">
        <v-icon size="12">mdi-clock-time-four-outline</v-icon>
        <span>{{ getVideoDuration(videoData.duration * 1000) }}</span>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import Bili from "@Bili/index.js";
import showSnackbar from "@comp/func/snackbar.js";
import { saveImgLocal } from "@utils/TGShare.js";
import { getVideoDuration, timestampToDate } from "@utils/toolFunc.js";
import { onMounted, onUnmounted, ref, shallowRef } from "vue";

type TpVideo = { insert: { video: string } };
type TpVideoProps = { data: TpVideo };

const props = defineProps<TpVideoProps>();
const videoAspectRatio = ref<number>(16 / 9);
const videoCover = ref<string>();
const videoData = shallowRef<TGApp.Plugins.Bili.Video.ViewData>();

console.log("tpVideo", props.data.insert.video);

onMounted(async () => {
  const url = new URL(props.data.insert.video);
  const aid = url.searchParams.get("aid") ?? undefined;
  const bvid = url.searchParams.get("bvid") ?? undefined;
  videoData.value = await Bili.video.view(aid, bvid);
  if (!videoData.value) {
    showSnackbar.error(`获取B站视频信息失败：${props.data.insert.video}`);
    return;
  }
  console.log(`videoData ${props.data.insert.video}`, videoData.value);
  const meta = videoData.value.dimension;
  if (meta.width > meta.height) videoAspectRatio.value = meta.width / meta.height;
  else videoAspectRatio.value = meta.height / meta.width;
  videoCover.value = await saveImgLocal(videoData.value.pic);
});

onUnmounted(() => {
  if (videoCover.value) URL.revokeObjectURL(videoCover.value);
});
</script>
<style lang="css" scoped>
.tp-video-box {
  position: relative;
  max-width: 100%;
  margin: 10px auto;
  aspect-ratio: v-bind(videoAspectRatio); /* stylelint-disable-line value-keyword-case */
}

.tp-video-container {
  position: relative;
  z-index: 1;
  overflow: hidden;
  width: 100%;
  max-width: 100%;
  border: none;
  border-radius: 10px;
  aspect-ratio: v-bind(videoAspectRatio); /* stylelint-disable-line value-keyword-case */
}

.tp-video-share {
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
  aspect-ratio: v-bind(videoAspectRatio); /* stylelint-disable-line value-keyword-case */
}

.tp-video-cover {
  position: absolute;
  max-width: 100%;
  object-fit: cover;
}

.tp-video-icon {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 80px;
  height: 80px;
  transform: translate(-50%, -50%);
}

.tp-video-time {
  position: absolute;
  bottom: 10px;
  left: 10px;
  display: flex;
  align-items: center;
  padding: 2px 5px;
  border-radius: 5px;
  background: #00000080;
  color: var(--tgc-white-4);
  font-family: var(--font-title);
  font-size: 12px;
  gap: 5px;
}

.tp-video-info {
  position: absolute;
  top: 10px;
  left: 10px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  padding: 5px;
  border-radius: 5px;
  background: #00000080;
  color: var(--tgc-white-1);
  font-family: var(--font-title);
  font-size: 12px;
}

.tp-video-view {
  position: absolute;
  top: 10px;
  right: 10px;
  display: flex;
  align-items: center;
  padding: 2px 5px;
  border-radius: 5px;
  background: #00000080;
  color: var(--tgc-white-4);
  font-family: var(--font-title);
  font-size: 12px;
  gap: 5px;
}
</style>
