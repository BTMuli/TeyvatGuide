<!-- 留影叙佳期浮窗 -->
<template>
  <TOverlay v-model="visible" blur-val="5px">
    <div class="pao-bc-container">
      <slot name="left"></slot>
      <div v-if="props.data" class="pao-bc-main">
        <div class="pao-bc-cover">
          <TMiImg v-if="showText && curScene" :ori="true" :src="curScene.bg" alt="顶部图像" />
          <TMiImg
            v-else-if="props.choice"
            :ori="true"
            :src="props.data.take_picture[1]"
            alt="顶部图像"
          />
          <TMiImg v-else :ori="true" :src="props.data.take_picture[0]" alt="顶部图像" />
        </div>
        <div v-if="showText && curScene" class="pao-bc-comments">
          <div v-for="(item, index) in curScene.comments" :key="index" class="pao-bc-comment">
            <div v-if="item.img && item.img !== ''" :title="item.role" class="pao-bcc-icon">
              <template v-if="item.role === '旅行者'">
                <TMiImg
                  :ori="true"
                  :src="props.choice ? item.img : (item.img2 ?? '')"
                  alt="对白头像"
                />
              </template>
              <TMiImg v-else :ori="true" :src="item.img" alt="对白头像" />
            </div>
            <div :class="item.img ? 'pao-bcc-text' : 'pao-bcc-quote'">
              {{ item.img ? "" : item.role === "" ? "" : `${item.role}：` }}{{ item.text }}
            </div>
          </div>
        </div>
        <div class="pao-bc-top-tools">
          <v-icon title="复制到剪贴板" @click="onCopy">mdi-content-copy</v-icon>
          <v-icon title="下载到本地" @click="onDownload">mdi-download</v-icon>
          <template v-if="showText && birthScenes && birthScenes.length > 1">
            <v-icon title="上一幕" @click="switchScene(false)">mdi-arrow-left</v-icon>
          </template>
          <v-icon :title="showText ? '隐藏对白' : '显示对白'" @click="showComments()">
            {{ showText ? "mdi-eye-off" : "mdi-eye" }}
          </v-icon>
          <template v-if="showText && birthScenes && birthScenes.length > 1">
            <v-icon title="下一幕" @click="switchScene(true)">mdi-arrow-right</v-icon>
          </template>
        </div>
      </div>
      <div v-if="props.data" class="pao-bc-info">
        <span class="pao-bci-title">
          {{ props.data.role_name }} {{ props.data.year }}/{{ props.data.birthday }}
        </span>
        <span class="pao-bci-desc">{{ props.data.word_text }}</span>
      </div>
      <slot name="right"></slot>
    </div>
  </TOverlay>
</template>
<script lang="ts" setup>
import TMiImg from "@comp/app/t-mi-img.vue";
import TOverlay from "@comp/app/t-overlay.vue";
import showSnackbar from "@comp/func/snackbar.js";
import { fetch } from "@tauri-apps/plugin-http";
import { parseBirthGal, parseBirthSrc } from "@utils/birthParser.js";
import { copyToClipboard, getImageBuffer, saveCanvasImg } from "@utils/TGShare.js";
import { bytesToSize } from "@utils/toolFunc.js";
import { computed, onMounted, ref, shallowRef, watch } from "vue";

type ToArcBirthProps = { data?: TGApp.Archive.Birth.DrawItem; choice: boolean };

const props = defineProps<ToArcBirthProps>();
const visible = defineModel<boolean>();
const showText = ref<boolean>(false);
const isLoad = ref<boolean>(false);
const sceneIdx = ref<number>(0);
const buffer = shallowRef<ArrayBuffer | null>(null);
const birthSrc = shallowRef<TGApp.Archive.Birth.GalSrcFull | null>(null);
const birthScenes = shallowRef<TGApp.Archive.Birth.GalScenes>([]);
const curScene = computed<TGApp.Archive.Birth.GalScriptScene>(
  () => birthScenes.value![sceneIdx.value],
);

onMounted(async () => await clearData());
watch(
  () => props.data,
  async () => await clearData(),
);
watch(
  () => showText.value,
  async () => {
    if (showText.value && !isLoad.value) await loadText();
  },
);

async function clearData(): Promise<void> {
  buffer.value = null;
  if (showText.value) await loadText();
}

async function onCopy(): Promise<void> {
  if (!props.data) return;
  const image = props.data.take_picture[Number(props.choice)];
  if (buffer.value === null) buffer.value = await getImageBuffer(image);
  const size = bytesToSize(buffer.value.byteLength);
  await copyToClipboard(buffer.value);
  showSnackbar.success(`图片已复制到剪贴板，大小：${size}`);
}

async function onDownload(): Promise<void> {
  if (!props.data) return;
  const image = props.data.take_picture[Number(props.choice)];
  if (buffer.value === null) buffer.value = await getImageBuffer(image);
  const size = bytesToSize(buffer.value.byteLength);
  await saveCanvasImg(buffer.value, Date.now().toString());
  showSnackbar.success(`图片已下载到本地，大小：${size}`);
}

function showComments(): void {
  showText.value = !showText.value;
}

function switchScene(isNext: boolean): void {
  if (sceneIdx.value < birthScenes.value.length - 1 && isNext) {
    sceneIdx.value++;
  } else if (sceneIdx.value > 0 && !isNext) {
    sceneIdx.value--;
  }
}

async function loadText(): Promise<void> {
  if (!props.data) return;
  birthSrc.value = null;
  birthScenes.value = [];
  birthSrc.value = await loadXmlSrc(props.data.gal_resource);
  birthScenes.value = await loadXmlGal(props.data.gal_xml);
  sceneIdx.value = 0;
  console.log("birthSrc", curScene.value);
}

async function loadXmlSrc(link: string): Promise<TGApp.Archive.Birth.GalSrcFull> {
  console.log("srcLink", link);
  const srcResp = await fetch(link, {
    method: "GET",
    headers: { "Content-Type": "text/xml" },
  });
  const srcRes = await srcResp.text();
  return parseBirthSrc(new DOMParser().parseFromString(srcRes, "text/xml"));
}

async function loadXmlGal(link: string): Promise<TGApp.Archive.Birth.GalScenes> {
  console.log("sceneLink", link);
  const galResp = await fetch(link, {
    method: "GET",
    headers: { "Content-Type": "text/xml" },
  });
  const galRes = await galResp.text();
  return parseBirthGal(new DOMParser().parseFromString(galRes, "text/xml"), birthSrc.value!);
}
</script>
<style lang="css" scoped>
.pao-bc-container {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  column-gap: 16px;
}

.pao-bc-main {
  position: relative;
  display: flex;
  overflow: hidden;
  width: 50vw;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  aspect-ratio: 125 / 54;
  background: var(--app-page-bg);
}

.pao-bc-cover {
  position: relative;
  z-index: 0;
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;

  img {
    width: 100%;
    height: 100%;
  }
}

.pao-bc-comments {
  position: absolute;
  z-index: 1;
  bottom: 0;
  left: 0;
  display: flex;
  width: 100%;
  height: 100%;
  max-height: 100%;
  box-sizing: border-box;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  padding: 8px;
  border-radius: 4px;
  -webkit-backdrop-filter: blur(2px);
  backdrop-filter: blur(2px);
  background: var(--common-shadow-t-2);
  color: var(--box-text-1);
  overflow-y: auto;
  row-gap: 4px;
}

.pao-bc-comment {
  position: relative;
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: flex-start;
  column-gap: 4px;
}

.pao-bcc-icon {
  position: relative;
  width: 64px;
  flex-shrink: 0;

  img {
    width: 100%;
  }
}

.pao-bcc-text {
  font-size: 18px;
  text-shadow: 0 0 2px var(--common-shadow-t-8);
  word-break: break-all;
}

.pao-bcc-quote {
  position: relative;
  width: 100%;
  box-sizing: border-box;
  padding: 0 64px;
  font-size: 16px;
  font-style: italic;
  opacity: 0.8;
  text-align: center;
  text-decoration: underline;
  text-shadow: 0 0 2px var(--common-shadow-t-8);
  text-underline-offset: 4px;
}

.pao-bc-top-tools {
  position: absolute;
  z-index: 2;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  -webkit-backdrop-filter: blur(2px);
  backdrop-filter: blur(2px);
  background-color: var(--common-shadow-t-2);
  border-bottom-right-radius: 4px;
  border-top-left-radius: 4px;
}

.pao-bc-info {
  position: absolute;
  z-index: 1;
  top: calc(50vw * 54 / 125 + 24px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.pao-bci-title {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--tgc-od-orange);
  column-gap: 8px;
  font-family: var(--font-title);
  font-size: 20px;
}

.pao-bci-desc {
  position: relative;
  width: fit-content;
  color: var(--tgc-od-red);
  font-family: var(--font-title);
  font-size: 16px;
  text-align: center;
}
</style>
