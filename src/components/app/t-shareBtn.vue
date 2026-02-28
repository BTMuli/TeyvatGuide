<template>
  <div class="share-box" title="分享">
    <div class="share-btn" @click="shareContent()">
      <v-icon size="20">mdi-share-variant</v-icon>
    </div>
  </div>
</template>
<script lang="ts" setup>
import showLoading from "@comp/func/loading.js";
import showSnackbar from "@comp/func/snackbar.js";
import TGLogger from "@utils/TGLogger.js";
import { generateShareImg } from "@utils/TGShare.js";

type TShareBtnProps = { selector: string; title: string };
const props = defineProps<TShareBtnProps>();

async function shareContent(): Promise<void> {
  await showLoading.start("正在生成分享图片", props.title);
  await TGLogger.Info("[TShareBtn][shareContent] 开始生成分享图片");
  const shareDom = document.querySelector<HTMLElement>(props.selector);
  if (shareDom === null) {
    showSnackbar.error("分享内容不存在", 3000);
    await showLoading.end();
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
  await showLoading.end();
  await TGLogger.Info("[TShareBtn][shareContent] 生成分享图片完成");
}
</script>
<style lang="scss" scoped>
@use "@styles/github.styles.scss" as github-styles;

.share-box {
  position: fixed;
  z-index: 1;
  top: 16px;
  right: 16px;
  display: flex;
  width: 36px;
  height: 36px;
  box-sizing: border-box;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--tgc-btn-1);
  box-shadow: 1px 3px 6px var(--common-shadow-2);
  color: var(--btn-text);
  cursor: pointer;
}

.dark .share-box {
  border: 1px solid var(--common-shadow-1);
  box-shadow: 1px 3px 6px var(--common-shadow-t-2);
}

.share-btn {
  position: relative;
  z-index: 1;
  display: flex;
  width: 20px;
  height: 20px;
  align-items: center;
  justify-content: center;
}
</style>
