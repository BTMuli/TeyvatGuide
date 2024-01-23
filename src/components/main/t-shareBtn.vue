<template>
  <div class="share-box">
    <div class="share-btn" @click="shareContent()">
      <v-icon> mdi-share-variant</v-icon>
    </div>
  </div>
</template>
<script lang="ts" setup>
// utils
import TGLogger from "../../utils/TGLogger";
import { generateShareImg } from "../../utils/TGShare";

interface TShareBtnProps {
  modelValue: HTMLElement;
  title: string;
  loading: boolean;
}

type TShareBtnEmits = (e: "update:loading", value: boolean) => void;

const props = defineProps<TShareBtnProps>();
const emit = defineEmits<TShareBtnEmits>();

async function shareContent(): Promise<void> {
  await TGLogger.Info("[TShareBtn][shareContent] 开始生成分享图片");
  emit("update:loading", true);
  props.modelValue.querySelectorAll("details").forEach((item) => {
    if (item.open) {
      item.setAttribute("details-open", "");
    } else {
      item.open = true;
    }
  });
  await generateShareImg(props.title, props.modelValue);
  props.modelValue.querySelectorAll("details").forEach((item) => {
    if (item.hasAttribute("details-open")) {
      item.removeAttribute("details-open");
    } else {
      item.open = false;
    }
  });
  emit("update:loading", false);
  await TGLogger.Info("[TShareBtn][shareContent] 生成分享图片完成");
}
</script>
<style lang="css" scoped>
.share-box {
  position: absolute;
  top: 20px;
  right: 20px;
  border: 2px solid var(--common-shadow-8);
  border-radius: 50%;
  cursor: pointer;
}

.share-box:hover {
  opacity: 0.8;
}

.share-btn {
  display: flex;
  width: 24px;
  height: 24px;
  align-items: center;
  justify-content: center;
  padding-right: 2px;
  margin: 5px;
}
</style>
