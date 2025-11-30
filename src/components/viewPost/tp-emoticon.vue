<!-- 自定义表情组件 -->
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
    :format="fmt"
    v-model:bgColor="bgColor"
  />
</template>
<script lang="ts" setup>
import { saveImgLocal } from "@utils/TGShare.js";
import { computed, onMounted, onUnmounted, ref } from "vue";

import type { TpImage } from "./tp-image.vue";
import VpOverlayImage from "./vp-overlay-image.vue";

/**
 * 自定义表情组件数据
 */
type TpCustomEmoticon = {
  /* 插入内容 */
  insert: {
    /* 自定义表情 */
    backup_text: "[自定义表情]";
    /* 自定义表情信息 */
    custom_emoticon: {
      /* 表情ID */
      id: string;
      /* 表情链接 */
      url: string;
      /* 表情尺寸 */
      size: {
        /* 宽度 */
        width: number;
        /* 高度 */
        height: number;
        /* 文件大小 */
        file_size?: number;
      };
      /* 是否可用 */
      is_available: boolean;
      /* 哈希值 */
      hash: string;
    };
  };
};
/**
 * 自定义表情组件属性
 */
type TpEmoticonProps = {
  /* 组件数据 */
  data: TpCustomEmoticon;
};

const props = defineProps<TpEmoticonProps>();

const localUrl = ref<string>();
const showOverlay = ref<boolean>(false);
const bgColor = ref<string>("transparent");
const fmt = computed<string>(() => getImageExt());
const image = computed<TpImage>(() => ({
  insert: { image: props.data.insert.custom_emoticon.url },
  attributes: {
    width: props.data.insert.custom_emoticon.size.width,
    height: props.data.insert.custom_emoticon.size.height,
    size: props.data.insert.custom_emoticon.size.file_size,
  },
}));

console.log("tp-emoticon", props.data.insert.custom_emoticon);

onMounted(async () => {
  localUrl.value = await saveImgLocal(props.data.insert.custom_emoticon.url);
});

onUnmounted(() => {
  if (localUrl.value) URL.revokeObjectURL(localUrl.value);
});

function getImageExt(): string {
  const arr = props.data.insert.custom_emoticon.url.split(".");
  return arr[arr.length - 1];
}
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
  text-shadow: 1px 1px 1px var(--tgc-dark-1);
  white-space: nowrap;
}
</style>
