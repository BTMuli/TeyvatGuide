<template>
  <div class="tp-emo-box" title="自定义表情">
    <TMiImg
      :src="props.data.insert.custom_emoticon.url"
      :alt="props.data.insert.custom_emoticon.hash"
      :ori="true"
    />
    <div
      class="tp-emo-info"
      v-if="props.data.insert.custom_emoticon.size.width > 100"
      @click="download()"
      title="点击下载到本地"
    >
      自定义表情
    </div>
  </div>
</template>
<script lang="ts" setup>
import TMiImg from "@comp/app/t-mi-img.vue";
import showSnackbar from "@comp/func/snackbar.js";
import { shallowRef } from "vue";

import { getImageBuffer, saveCanvasImg } from "@/utils/TGShare.js";
import { bytesToSize } from "@/utils/toolFunc.js";

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
const buffer = shallowRef<Uint8Array | null>(null);

console.log("tp-emoticon", props.data.insert.custom_emoticon);

async function download(): Promise<void> {
  const image = props.data.insert.custom_emoticon.url;
  if (buffer.value === null) buffer.value = await getImageBuffer(image);
  let size: number;
  if (props.data.insert.custom_emoticon.size.file_size) {
    size = props.data.insert.custom_emoticon.size.file_size;
  } else size = buffer.value.byteLength;
  if (size > 80000000) {
    showSnackbar.warn(`图片过大(${bytesToSize(size)})，无法下载到本地`);
    return;
  }
  const format = image.split(".").pop();
  const title = props.data.insert.custom_emoticon.hash;
  await saveCanvasImg(buffer.value, props.data.insert.custom_emoticon.hash, format);
  showSnackbar.success(`已保存${title}.${format}到本地，大小为${bytesToSize(size)}`);
}
</script>
<style lang="css" scoped>
.tp-emo-box {
  position: relative;
  display: flex;
  width: fit-content;
  align-items: center;
  justify-content: center;
  margin: 10px auto;
}

.tp-emo-box img {
  width: v-bind("props.data.insert.custom_emoticon.size.width + 'px'");
  max-width: 100%;
  height: auto;
  border-radius: 10px;
}

.tp-emo-info {
  position: absolute;
  top: 0;
  right: 0;
  padding: 0 5px;
  border-bottom: 1px solid var(--common-shadow-1);
  border-left: 1px solid var(--common-shadow-1);
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
  background: var(--common-shadow-t-2);
  border-bottom-left-radius: 10px;
  border-top-right-radius: 10px;
  box-shadow: -1px 1px 3px var(--common-shadow-2);
  cursor: pointer;
  font-family: var(--font-title);
  font-size: 12px;
}

.tp-emo-load {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 10px auto;
  column-gap: 5px;
}
</style>
