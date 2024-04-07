<template>
  <div class="tp-image-box" @click="showOverlay = true">
    <img
      :style="getImageStyle()"
      :src="getImageUrl()"
      :alt="props.data.insert.image"
      :title="getImageTitle()"
    />
  </div>
  <TpoImage :image="props.data" v-model="showOverlay" />
</template>
<script lang="ts" setup>
import { StyleValue, ref } from "vue";

import TpoImage from "./tpo-image.vue";
import { bytesToSize } from "../../utils/toolFunc";

export interface TpImage {
  insert: {
    image: string;
  };
  attributes?: {
    width: number;
    height: number;
    size?: number;
    ext?: "png" | "jpg"; // 待补充
    align?: "center"; // 待补充
  };
}
interface TpImageProps {
  data: TpImage;
}

const props = defineProps<TpImageProps>();
const showOverlay = ref(false);

console.log("tp-image", props.data.insert.image, props.data.attributes);

function getImageStyle(): StyleValue {
  let style: StyleValue = <Array<StyleValue>>[];
  style.push("cursor: pointer");
  if (props.data.attributes == undefined) return style;
  if (props.data.attributes.width < 800) {
    const widthFullRule: StyleValue = "width: 100%";
    style.push(widthFullRule);
  }
  return style;
}

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

function getImageUrl(): string {
  const img = props.data.insert.image;
  const append = "?x-oss-process=image/format,png";
  if (img.endsWith(".gif")) return img;
  return img + append;
}
</script>
<style lang="css" scoped>
.tp-image-box {
  margin: 10px auto;
}

.tp-image-box img {
  max-width: 100%;
  height: auto;
  border-radius: 10px;
}
</style>
