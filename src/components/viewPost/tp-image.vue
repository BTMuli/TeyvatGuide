<!-- TODO: 链接处理重构 -->
<template>
  <div class="tp-image-box" v-if="localUrl !== undefined">
    <img :src="localUrl" @click="showOverlay = true" :alt="oriUrl" :title="getImageTitle()" />
    <div
      class="act"
      @click.stop="showOri = true"
      title="查看原图"
      v-if="!showOri"
      data-html2canvas-ignore
    >
      <v-icon size="16" color="white">mdi-magnify</v-icon>
    </div>
  </div>
  <div v-else class="tp-image-load" :title="oriUrl">
    <v-progress-circular :indeterminate="true" color="primary" size="small" />
    <span>加载中...</span>
  </div>
  <VpOverlayImage
    :image="props.data"
    v-model="showOverlay"
    v-model:link="localUrl"
    v-model:ori="showOri"
    v-model:bgColor="bgColor"
    v-model:format="imgExt"
  />
</template>
<script lang="ts" setup>
import showLoading from "@comp/func/loading.js";
import useAppStore from "@store/app.js";
import { saveImgLocal } from "@utils/TGShare.js";
import { bytesToSize } from "@utils/toolFunc.js";
import { storeToRefs } from "pinia";
import { computed, onMounted, onUnmounted, ref, watch } from "vue";

import VpOverlayImage from "./vp-overlay-image.vue";

export type TpImage = {
  insert: { image: string | TGApp.BBS.Post.Image };
  attributes?: {
    width: number;
    height: number;
    size?: number;
    ext?: "png" | "jpg"; // 待补充
    align?: "center"; // 待补充
  };
};
type TpImageProps = { data: TpImage };

const appStore = useAppStore();
const { imageQualityPercent } = storeToRefs(appStore);
const props = defineProps<TpImageProps>();
const showOverlay = ref<boolean>(false);

const localUrl = ref<string>();
const bgColor = ref<string>("transparent");

const oriUrl = ref<string>("");
const imgExt = computed<string>(() => getImageExt());
const showOri = ref<boolean>(imgExt.value === "gif" || imageQualityPercent.value === 100);

const imgWidth = computed<string>(() => {
  if (props.data.attributes === undefined) return "auto";
  if (props.data.attributes.width >= 690) return "100%";
  return `${props.data.attributes.width}px`;
});

console.log("tp-image", props.data.insert.image, props.data.attributes);

onMounted(async () => {
  oriUrl.value = miniImgUrl();
  const link = appStore.getImageUrl(oriUrl.value, imgExt.value);
  localUrl.value = await saveImgLocal(link);
});

watch(
  () => showOri.value,
  async () => {
    if (!showOri.value) return;
    await showLoading.start("正在加载原图", oriUrl.value);
    if (localUrl.value) URL.revokeObjectURL(localUrl.value);
    const ext = getImageExt();
    if (!["png", "jpg", "jpeg", "gif", "webp"].includes(ext.toLowerCase())) {
      localUrl.value = await saveImgLocal(`${oriUrl.value}?format=jpg`);
    } else localUrl.value = await saveImgLocal(oriUrl.value);
    await showLoading.end();
  },
);

onUnmounted(() => {
  if (localUrl.value) URL.revokeObjectURL(localUrl.value);
});

function miniImgUrl(): string {
  let url: string;
  if (typeof props.data.insert.image === "string") {
    url = props.data.insert.image;
  } else {
    url = props.data.insert.image.url;
  }
  const link = new URL(url);
  return `${link.origin}${link.pathname}`;
}

function getImageTitle(): string {
  const res: string[] = [];
  if (props.data.attributes) {
    res.push(`宽度：${props.data.attributes.width}px`);
    res.push(`高度：${props.data.attributes.height}px`);
    if (props.data.attributes.size) {
      const size = bytesToSize(props.data.attributes.size);
      res.push(`大小：${size}`);
    }
    res.push(`格式：${getImageExt()}`);
    return res.join("\n");
  }
  if (typeof props.data.insert.image !== "string") {
    res.push(`宽度：${props.data.insert.image.width}px`);
    res.push(`高度：${props.data.insert.image.height}px`);
    if (props.data.insert.image.size) {
      const size = bytesToSize(Number(props.data.insert.image.size));
      res.push(`大小：${size}`);
    }
    res.push(`格式：${getImageExt()}`);
    return res.join("\n");
  }
  return "";
}

function getImageExt(): string {
  if (props.data.attributes && props.data.attributes.ext) return props.data.attributes.ext;
  if (typeof props.data.insert.image === "string") {
    const arr = props.data.insert.image.split(".");
    return arr[arr.length - 1];
  }
  return props.data.insert.image.format;
}
</script>
<style lang="scss" scoped>
.tp-image-box {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 8px auto;
}

.tp-image-box img {
  width: v-bind(imgWidth); /* stylelint-disable-line value-keyword-case */
  max-width: 100%;
  height: auto;
  border-radius: 4px;
  background: v-bind(bgColor); /* stylelint-disable-line value-keyword-case */
  cursor: pointer;
}

.tp-image-load {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 8px auto;
  column-gap: 4px;
}

.act {
  position: absolute;
  right: 4px;
  bottom: 4px;
  display: flex;
  width: 25px;
  height: 25px;
  box-sizing: border-box;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--tgc-od-white);
  box-shadow: 0 0 4px #00000080;
  cursor: pointer;
}
</style>
