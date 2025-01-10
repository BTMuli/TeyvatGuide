<template>
  <div class="tp-image-box" @click="showOverlay = true" v-if="localUrl !== undefined">
    <img :src="localUrl" :alt="props.data.insert.image" :title="getImageTitle()" />
  </div>
  <div v-else class="tp-image-load" :title="props.data.insert.image">
    <v-progress-circular :indeterminate="true" color="primary" size="small" />
    <span>加载中...</span>
  </div>
  <VpOverlayImage :image="props.data" v-model="showOverlay" />
</template>
<script lang="ts" setup>
import { computed, onMounted, onUnmounted, ref } from "vue";

import VpOverlayImage from "./vp-overlay-image.vue";

import { useAppStore } from "@/store/modules/app.js";
import { saveImgLocal } from "@/utils/TGShare.js";
import { bytesToSize } from "@/utils/toolFunc.js";

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
const props = defineProps<TpImageProps>();
const showOverlay = ref<boolean>(false);
const localUrl = ref<string>();

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
<style lang="css" scoped>
.tp-image-box {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 10px auto;
}

.tp-image-box img {
  width: v-bind(imgWidth);
  max-width: 100%;
  height: auto;
  border-radius: 10px;
  cursor: pointer;
}

.tp-image-load {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 10px auto;
  column-gap: 5px;
}
</style>
