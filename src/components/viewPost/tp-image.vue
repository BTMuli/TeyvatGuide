<template>
  <div class="tp-image-box" v-if="localUrl !== undefined">
    <img
      :src="localUrl"
      @click="showOverlay = true"
      :alt="props.data.insert.image"
      :title="getImageTitle()"
    />
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
  <div v-else class="tp-image-load" :title="props.data.insert.image">
    <v-progress-circular :indeterminate="true" color="primary" size="small" />
    <span>加载中...</span>
  </div>
  <VpOverlayImage
    :image="props.data"
    v-model="showOverlay"
    v-model:link="localUrl"
    v-model:ori="showOri"
    v-model:bgColor="bgColor"
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
  insert: { image: string };
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
const showOri = ref<boolean>(
  props.data.insert.image.endsWith(".gif") || imageQualityPercent.value === 100,
);
const localUrl = ref<string>();
const bgColor = ref<string>("transparent");

const imgWidth = computed<string>(() => {
  if (props.data.attributes === undefined) return "auto";
  if (props.data.attributes.width >= 690) return "100%";
  return `${props.data.attributes.width}px`;
});

console.log("tp-image", props.data.insert.image, props.data.attributes);

onMounted(async () => {
  const link = appStore.getImageUrl(props.data.insert.image);
  localUrl.value = await saveImgLocal(link);
});

watch(
  () => showOri.value,
  async () => {
    if (!showOri.value) return;
    await showLoading.start("正在加载原图", props.data.insert.image);
    if (localUrl.value) URL.revokeObjectURL(localUrl.value);
    localUrl.value = await saveImgLocal(props.data.insert.image);
    await showLoading.end();
  },
);

onUnmounted(() => {
  if (localUrl.value) URL.revokeObjectURL(localUrl.value);
});

function getImageTitle(): string {
  if (props.data.attributes == undefined) return "";
  const res: string[] = [];
  res.push(`宽度：${props.data.attributes.width}px`);
  res.push(`高度：${props.data.attributes.height}px`);
  if (props.data.attributes.size) {
    const size = bytesToSize(props.data.attributes.size);
    res.push(`大小：${size}`);
  }
  if (props.data.attributes.ext) {
    res.push(`格式：${props.data.attributes.ext}`);
  }
  return res.join("\n");
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
