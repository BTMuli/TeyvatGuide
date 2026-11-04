<!-- 米社视频组件 -->
<template>
  <div class="tp-vod-box">
    <div
      v-if="!isPreview && highestResolution"
      :id="`tp-vod-${props.data.insert.vod.id}`"
      class="tp-vod-container"
      data-html2canvas-ignore
    ></div>
    <div
      :class="{ 'is-preview': isPreview, 'is-unavailable': !highestResolution }"
      class="tp-vod-share"
    >
      <img v-if="coverSource" :src="coverSource" alt="cover" class="tp-vod-cover" />
      <v-progress-circular
        v-else-if="!isPreview && highestResolution"
        color="blue"
        indeterminate
        size="25"
      />
      <span v-if="!isPreview && !highestResolution" class="tp-vod-fallback" role="status"
        >视频暂不可播放</span
      >
      <img
        v-if="isPreview || highestResolution"
        alt="icon"
        class="tp-vod-icon"
        src="/UI/post/video_play.svg"
      />
      <div class="tp-vod-time">
        <v-icon size="12">mdi-clock-time-four-outline</v-icon>
        <span>{{ fmtUtil.videoDuration(props.data.insert.vod.duration) }}</span>
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
import showSnackbar from "@comp/func/snackbar.js";
import { usePostPreview } from "@hooks/usePostPreview.js";
import useAppStore from "@store/app.js";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { openUrl } from "@tauri-apps/plugin-opener";
import { getPostVodResolutions, pickPostVodResolution } from "@utils/bbs/postVod.js";
import fmtUtil from "@utils/display/fmtUtil.js";
import TGHttps from "@utils/network/TGHttps.js";
import { saveBufferFile, saveImgBlob } from "@utils/share/TGShare.js";
import TGLogger from "@utils/system/TGLogger.js";
import Artplayer, { type Option } from "artplayer";
import { storeToRefs } from "pinia";
import { computed, onMounted, onUnmounted, ref, shallowRef, toRaw, watch } from "vue";

/** 帖子视频组件数据类型。 @since Beta v0.13.0 */
type TpVod = {
  insert: {
    vod: {
      id: string;
      duration: number;
      cover?: string;
      resolutions?: unknown;
      view_num?: number;
    };
  };
};
type TpVodProps = { data: TpVod };
const WG_COVER: Readonly<string> = "https://upload-bbs.mihoyo.com/weigui.png";
const DEFAULT_VOD_ASPECT_RATIO: Readonly<number> = 16 / 9;

const appStore = useAppStore();
const props = defineProps<TpVodProps>();
const isPreview = usePostPreview();

const { postViewWide } = storeToRefs(appStore);

const coverLocal = ref<string>();
const coverLink = ref<string>(getCoverLink());
const vodAspectRatio = ref<number>(DEFAULT_VOD_ASPECT_RATIO);
const coverBuffer = shallowRef<ArrayBuffer | null>(null);
const container = shallowRef<Artplayer | null>(null);
const resolutions = computed<Array<TGApp.BBS.PostVod.Resolution>>(() =>
  getPostVodResolutions(props.data.insert.vod.resolutions),
);
const highestResolution = computed<TGApp.BBS.PostVod.Resolution | undefined>(() =>
  pickPostVodResolution(resolutions.value),
);
const coverSource = computed<string>(() =>
  isPreview || !highestResolution.value ? coverLink.value : (coverLocal.value ?? ""),
);
let active = true;

watch(
  () => postViewWide.value,
  () => (vodAspectRatio.value = calcAspectRatio()),
);

console.log("tpVod", props.data.insert.vod.id, toRaw(props.data).insert.vod);

onMounted(async () => {
  vodAspectRatio.value = calcAspectRatio();
  coverLink.value = getCoverLink();
  const resolution = highestResolution.value;
  if (isPreview || resolution === undefined) return;
  const cover = await saveImgBlob(coverLink.value);
  if (!active) {
    if (cover !== coverLink.value) URL.revokeObjectURL(cover);
    return;
  }
  coverLocal.value = cover;
  const option: Option = {
    id: props.data.insert.vod.id,
    container: `#tp-vod-${props.data.insert.vod.id}`,
    url: resolution.url,
    poster: coverLocal.value ?? "",
    type: resolution.format,
    playbackRate: true,
    aspectRatio: false,
    setting: true,
    hotkey: true,
    pip: true,
    quality: resolutions.value.map((resolution) => ({
      default: resolution.label === highestResolution.value?.label,
      html: resolution.label,
      url: resolution.url,
    })),
    fullscreen: true,
    icons: { state: `<img src="/UI/post/video_play.svg" alt="icon" />` },
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
          if (props.data.insert.vod.cover === undefined) {
            showSnackbar.warn("未获取到封面链接");
            return;
          }
          await showLoading.start("正在下载封面", props.data.insert.vod.cover);
          await loadCoverBuffer();
          if (coverBuffer.value === null) {
            await showLoading.end();
            return;
          }
          await saveBufferFile(coverBuffer.value, `vod-cover-${props.data.insert.vod.id}`);
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

function getCoverLink(): string {
  return appStore.getImageUrl(props.data.insert.vod.cover ?? WG_COVER);
}

async function loadCoverBuffer(): Promise<void> {
  if (coverBuffer.value !== null) return;
  if (props.data.insert.vod.cover === undefined) return;
  try {
    coverBuffer.value = await TGHttps.buffer(props.data.insert.vod.cover);
  } catch (e) {
    const errMsg = TGHttps.getErrMsg(e);
    showSnackbar.error(`获取图像Buffer失败：${errMsg}`);
    await TGLogger.Error(
      `[TpVod][loadCoverBuffer] 获取图像Buffer失败：${props.data.insert.vod.cover}`,
    );
    await TGLogger.Error(`[TpVod][loadCoverBuffer] ${e}`);
  }
}

function calcAspectRatio(): number {
  const resolution = highestResolution.value;
  if (resolution === undefined) return DEFAULT_VOD_ASPECT_RATIO;
  const width = resolution.width;
  const height = resolution.height;
  if (!postViewWide.value) return width / height;
  if (width > height) return width / height;
  return height / width;
}

onUnmounted(() => {
  active = false;
  container.value?.destroy();
  if (coverBuffer.value) coverBuffer.value = null;
  if (coverLocal.value && coverLocal.value !== coverLink.value) {
    URL.revokeObjectURL(coverLocal.value);
  }
});
</script>
<style lang="css" scoped>
.tp-vod-box {
  position: relative;
  max-width: 100%;
  margin: 8px auto;
  aspect-ratio: v-bind(vodAspectRatio); /* stylelint-disable-line value-keyword-case */
  background: var(--box-bg-1);
}

.tp-vod-container {
  position: relative;
  z-index: 1;
  overflow: hidden;
  max-width: 100%;
  border-radius: 8px;
  aspect-ratio: v-bind(vodAspectRatio); /* stylelint-disable-line value-keyword-case */
}

.tp-vod-share {
  position: absolute;
  z-index: 0;
  top: 0;
  left: 0;
  display: flex;
  overflow: hidden;
  width: 100%;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  aspect-ratio: v-bind(vodAspectRatio); /* stylelint-disable-line value-keyword-case */

  &.is-preview,
  &.is-unavailable {
    z-index: 1;
  }
}

.tp-vod-cover {
  position: absolute;
  max-width: 100%;
  object-fit: cover;
}

.tp-vod-fallback {
  position: relative;
  padding: 4px 8px;
  border-radius: 4px;
  background: var(--box-bg-1);
  color: var(--box-text-4);
  font-size: 14px;
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
