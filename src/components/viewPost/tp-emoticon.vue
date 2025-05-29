<template>
  <div class="tp-emo-box" title="自定义表情" v-if="localUrl !== undefined">
    <img
      :src="localUrl"
      @click="showOverlay = true"
      :alt="props.data.insert.custom_emoticon.hash"
    />
    <div class="tp-emo-info" v-if="props.data.insert.custom_emoticon.size.width > 100">
      自定义表情
    </div>
  </div>
  <div v-else class="tp-image-load" :title="props.data.insert.custom_emoticon.url">
    <v-progress-circular :indeterminate="true" color="primary" size="small" />
    <span>加载中...</span>
  </div>
  <VpOverlayImage
    :image="image"
    v-model="showOverlay"
    v-model:link="localUrl"
    :ori="true"
    v-model:bgColor="bgColor"
  />
</template>
<script lang="ts" setup>
import { saveImgLocal } from "@utils/TGShare.js";
import { computed, onMounted, onUnmounted, ref } from "vue";

import type { TpImage } from "./tp-image.vue";
import VpOverlayImage from "./vp-overlay-image.vue";

type TpCustomEmoticon = {
  insert: {
    backup_text: "[自定义表情]";
    custom_emoticon: {
      id: string;
      url: string;
      size: { width: number; height: number; file_size?: number };
      is_available: boolean;
      hash: string;
    };
  };
};
type TpEmoticonProps = { data: TpCustomEmoticon };

const props = defineProps<TpEmoticonProps>();
const localUrl = ref<string>();
const showOverlay = ref<boolean>(false);
const bgColor = ref<string>("transparent");
const image = computed<TpImage>(() => {
  return {
    insert: { image: props.data.insert.custom_emoticon.url },
    attributes: {
      width: props.data.insert.custom_emoticon.size.width,
      height: props.data.insert.custom_emoticon.size.height,
      size: props.data.insert.custom_emoticon.size.file_size,
    },
  };
});

console.log("tp-emoticon", props.data.insert.custom_emoticon);

onMounted(async () => {
  localUrl.value = await saveImgLocal(props.data.insert.custom_emoticon.url);
});

onUnmounted(() => {
  if (localUrl.value) URL.revokeObjectURL(localUrl.value);
});
</script>
<style lang="scss" scoped>
.tp-emo-box {
  position: relative;
  display: flex;
  width: fit-content;
  align-items: center;
  justify-content: center;
  margin: 8px auto;
  cursor: pointer;
}

.tp-emo-box img {
  width: v-bind("props.data.insert.custom_emoticon.size.width + 'px'");
  max-width: 100%;
  height: auto;
  border-radius: 4px;
  background: v-bind(bgColor); /* stylelint-disable-line value-keyword-case */
}

.tp-emo-info {
  position: absolute;
  top: 0;
  right: 0;
  padding: 0 4px;
  border-bottom: 1px solid var(--common-shadow-1);
  border-left: 1px solid var(--common-shadow-1);
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
  background: var(--common-shadow-t-2);
  border-bottom-left-radius: 4px;
  border-top-right-radius: 4px;
  box-shadow: -1px 1px 4px var(--common-shadow-2);
  cursor: default;
  font-family: var(--font-title);
  font-size: 12px;
  white-space: nowrap;
}
</style>
