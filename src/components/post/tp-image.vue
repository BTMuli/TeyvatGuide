<template>
  <div class="tp-image-box">
    <img
      :style="getImageStyle()"
      :src="getImageUrl()"
      :alt="props.data.insert.image"
      :title="getImageTitle()"
    />
  </div>
</template>
<script lang="ts" setup>
import { StyleValue, toRaw } from "vue";

import { bytesToSize } from "../../utils/toolFunc";

interface TpImage {
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

console.log("tp-image", props.data.insert.image, toRaw(props.data).attributes);

function getImageStyle(): StyleValue {
  let style: StyleValue = <Array<StyleValue>>[];
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
  const append = "?x-oss-process=image/format,webp";
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
