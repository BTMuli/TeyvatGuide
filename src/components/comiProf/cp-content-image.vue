<template>
  <CpImageThumbnail :key="source" :attributes :source alt="正文图片" class="cp-content-image" />
</template>

<script lang="ts" setup>
import type { TpImage } from "@comp/viewPost/tp-image.vue";
import { computed } from "vue";

import CpImageThumbnail from "./cp-image-thumbnail.vue";

const { data } = defineProps<{ data: TpImage }>();
const source = computed<string>(() => {
  const image = data.insert.image;
  return typeof image === "string" ? image : image.url;
});
const attributes = computed<TpImage["attributes"]>(() => {
  const image = data.insert.image;
  if (typeof image === "string" || image.width <= 0 || image.height <= 0) return data.attributes;
  return { width: image.width, height: image.height, size: Number(image.size) };
});
</script>

<style lang="scss" scoped>
.cp-content-image {
  width: fit-content;
  max-width: 100%;
  margin: 8px 0;
}
</style>
