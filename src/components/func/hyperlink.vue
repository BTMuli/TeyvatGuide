<!-- HyperLink Overlay -->
<template>
  <transition name="func-hyperlink">
    <div v-show="show || showOuter" class="hyperlink-overlay" @click.self.prevent="handleOuter">
      <transition name="func-hyperlink-inner">
        <div v-show="showInner" ref="hyperlinkRef" class="hyperlink-box">
          <div class="hyperlink-title" @click="shareHyperLink()">{{ data.name }}</div>
          <div class="hyperlink-desc">
            <span v-html="parseHtmlText(data.desc)" />
          </div>
          <div class="hyperlink-id">{{ data.id }}</div>
        </div>
      </transition>
    </div>
  </transition>
</template>
<script lang="ts" setup>
import showSnackbar from "@comp/func/snackbar.js";
import { generateShareImg } from "@utils/TGShare.js";
import { parseHtmlText } from "@utils/toolFunc.js";
import { onMounted, ref, shallowRef, useTemplateRef, watch } from "vue";

import type { HyperLinkParams } from "./hyperlink.js";

const show = ref<boolean>(false);
const showOuter = ref<boolean>(false);
const showInner = ref<boolean>(false);

const props = defineProps<HyperLinkParams>();
const data = shallowRef<HyperLinkParams>(props);
const hyperLinkEl = useTemplateRef<HTMLDivElement>("hyperlinkRef");

watch(
  () => show.value,
  async () => {
    if (show.value) {
      showOuter.value = true;
      await new Promise<void>((resolve) => setTimeout(resolve, 100));
      showInner.value = true;
      return;
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 100));
    showInner.value = false;
    await new Promise<void>((resolve) => setTimeout(resolve, 300));
    showOuter.value = false;
  },
);

onMounted(async () => await displayBox(props));

function handleOuter(): void {
  show.value = false;
}

async function displayBox(params: HyperLinkParams): Promise<void> {
  data.value = params;
  show.value = true;
}

async function shareHyperLink(): Promise<void> {
  if (!hyperLinkEl.value) {
    showSnackbar.warn("未捕获到 HyperLinkBox");
    return;
  }
  const fileName = `Hyperlink_${props.id}_${props.name}`;
  await generateShareImg(fileName, hyperLinkEl.value);
}

defineExpose({ displayBox });
</script>
<style lang="scss" scoped>
.func-hyperlink-outer-enter-active,
.func-hyperlink-outer-leave-active,
.func-hyperlink-inner-enter-active {
  transition: all 0.3s;
}

.func-hyperlink-inner-leave-active {
  transition: all 0.5s ease-in-out;
}

.func-hyperlink-inner-enter-from {
  opacity: 0;
  transform: scale(1.5);
}

.func-hyperlink-inner-enter-to,
.func-hyperlink-inner-leave-from {
  opacity: 1;
  transform: scale(1);
}

.func-hyperlink-outer-enter-to,
.func-hyperlink-outer-leave-from {
  opacity: 1;
}

.func-hyperlink-outer-enter-from,
.func-hyperlink-outer-leave-to {
  opacity: 0;
}

.func-hyperlink-inner-leave-to {
  opacity: 0;
  transform: scale(0);
}

.hyperlink-overlay {
  position: fixed;
  z-index: var(--tgi-hyperlink);
  top: 0;
  left: 0;
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
}

.hyperlink-box {
  position: relative;
  display: flex;
  width: 520px;
  max-height: 800px;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: 10px 10px 16px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--app-page-bg);
  box-shadow: 0 0 10px var(--common-shadow-t-1);
  color: var(--app-page-content);
  row-gap: 8px;
}

.hyperlink-title {
  position: relative;
  color: var(--common-text-title);
  cursor: pointer;
  font-family: var(--font-title);
  font-size: 20px;
}

.hyperlink-desc {
  position: relative;
  padding-right: 8px;
  overflow-y: auto;
  white-space: pre-wrap;
}

.hyperlink-id {
  position: absolute;
  right: 8px;
  bottom: 0;
  font-size: 12px;
}
</style>
