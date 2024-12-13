<template>
  <div class="share-box" title="分享">
    <div class="share-btn" @click="shareContent()">
      <v-icon>mdi-share-variant</v-icon>
    </div>
  </div>
</template>
<script lang="ts" setup>
import showLoading from "@comp/func/loading.js";
import showSnackbar from "@comp/func/snackbar.js";

import TGLogger from "@/utils/TGLogger.js";
import { generateShareImg } from "@/utils/TGShare.js";

type TShareBtnProps = { selector: string; title: string };
const props = defineProps<TShareBtnProps>();

async function shareContent(): Promise<void> {
  showLoading.start("正在生成分享图片", props.title);
  await TGLogger.Info("[TShareBtn][shareContent] 开始生成分享图片");
  const shareDom = document.querySelector<HTMLElement>(props.selector);
  if (shareDom === null) {
    showSnackbar.error("分享内容不存在", 3000);
    showLoading.end();
    return;
  }
  shareDom.querySelectorAll("details").forEach((item) => {
    if (item.open) item.setAttribute("details-open", "");
    else item.open = true;
  });
  await generateShareImg(props.title, shareDom);
  shareDom.querySelectorAll("details").forEach((item) => {
    if (item.hasAttribute("details-open")) item.removeAttribute("details-open");
    else item.open = false;
  });
  showLoading.end();
  await TGLogger.Info("[TShareBtn][shareContent] 生成分享图片完成");
}
</script>
<style lang="css" scoped>
.share-box {
  position: fixed;
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
  padding-right: 3px;
  margin: 5px;
}
</style>
