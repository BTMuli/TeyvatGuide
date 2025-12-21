<!-- 留影叙佳期浮窗 TODO 左右SLOT -->
<template>
  <TOverlay v-model="visible" blur-val="5px">
    <div class="pao-bc-container">
      <div v-if="props.data" class="pao-bc-cover">
        <TMiImg v-if="props.choice" :ori="true" :src="props.data.take_picture[1]" alt="顶部图像" />
        <TMiImg v-else :ori="true" :src="props.data.take_picture[0]" alt="顶部图像" />
      </div>
      <div v-show="showText" class="pao-bc-comments">
        <div v-for="(item, index) in textParse" :key="index" class="pao-bc-comment">
          <div v-if="item.icon" :title="item.name" class="pao-bcc-icon">
            <TMiImg :ori="true" :src="item.icon" alt="对白头像" />
          </div>
          <div v-else-if="item.name !== '未知'" class="pao-bcc-name">
            {{ item.name }}
          </div>
          <div :class="item.icon ? 'pao-bcc-text' : 'pao-bcc-quote'">
            {{ item.text }}
          </div>
        </div>
      </div>
      <div class="pao-bc-top-tools">
        <v-icon title="复制到剪贴板" @click="onCopy">mdi-content-copy</v-icon>
        <v-icon title="下载到本地" @click="onDownload">mdi-download</v-icon>
        <v-icon :title="showText ? '隐藏对白' : '显示对白'" @click="showComments()">
          {{ showText ? "mdi-eye-off" : "mdi-eye" }}
        </v-icon>
      </div>
    </div>
  </TOverlay>
</template>
<script lang="ts" setup>
import TMiImg from "@comp/app/t-mi-img.vue";
import TOverlay from "@comp/app/t-overlay.vue";
import showSnackbar from "@comp/func/snackbar.js";
import { fetch } from "@tauri-apps/plugin-http";
import TGLogger from "@utils/TGLogger.js";
import { copyToClipboard, getImageBuffer, saveCanvasImg } from "@utils/TGShare.js";
import { bytesToSize } from "@utils/toolFunc.js";
import { onMounted, ref, shallowRef, watch } from "vue";
import { xml2json } from "xml-js";

type ToArcBirthProps = { data?: TGApp.Archive.Birth.DrawItem; choice: boolean };
type XmlKeyMap = { id: string; rel: string; group?: string; icon: string };
type XmlTextList = { chara: string; img: string; text: string };
type XmlTextParse = { name: string; icon?: string; text: string };

const props = defineProps<ToArcBirthProps>();
const visible = defineModel<boolean>();
const showText = ref<boolean>(false);
const buffer = shallowRef<ArrayBuffer | null>(null);
const textParse = shallowRef<Array<XmlTextParse>>([]);

onMounted(async () => await clearData());
watch(
  () => [props.data, props.choice],
  async () => await clearData(),
);
watch(
  () => showText.value,
  async () => {
    if (showText.value) await loadText();
    else textParse.value = [];
  },
);

async function clearData(): Promise<void> {
  buffer.value = null;
  if (showText.value) {
    textParse.value = [];
    await loadText();
  }
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

async function loadText(): Promise<void> {
  if (!props.data) return;
  if (textParse.value.length > 0) {
    showText.value = !showText.value;
    return;
  }
  const resSource: unknown = await parseXml(props.data.gal_resource);
  if (resSource === false) {
    showSnackbar.warn("对白数据加载失败");
    return;
  }
  const keyMap = getKeyMap(resSource);
  const resXml: unknown = await parseXml(props.data.gal_xml);
  console.log(resXml);
  const textList = getTextList(resXml);
  console.log(textList);
  textParse.value = textList.map((item) => {
    const key = keyMap.find((keyItem) => keyItem.id === item.img);
    if (!key) return { name: "未知", text: item.text };
    return { name: key.group ?? key.id, text: item.text, icon: key.icon };
  });
}

function getKeyMap(resSource: unknown): Array<XmlKeyMap> {
  const res: Array<XmlKeyMap> = [];
  if (!resSource || typeof resSource !== "object") return res;
  if (!("elements" in resSource) || !Array.isArray(resSource["elements"])) return res;
  const arr1 = resSource.elements;
  if (arr1.length === 0 || !("elements" in arr1[0]) || !Array.isArray(arr1[0].elements)) return res;
  const arr2 = arr1[0].elements;
  if (arr2.length === 0 || !("elements" in arr2[0]) || !Array.isArray(arr2[0].elements)) return res;
  const arr3 = arr2[0].elements;
  for (const item of arr3) {
    if (!("name" in item)) continue;
    if (!("attributes" in item)) continue;
    const attr = item.attributes;
    if (!("id" in attr) || !("rel" in attr) || !("group" in attr) || !("src" in attr)) continue;
    if (item.name !== "chara") continue;
    res.push({ id: attr.id, rel: attr.rel, group: attr.group, icon: attr.src });
  }
  return res;
}

// TODO: 重构文本解析||调整渲染方式
function getTextList(resXml: unknown): Array<XmlTextList> {
  const res: Array<XmlTextList> = [];
  if (!resXml || typeof resXml !== "object") return res;
  if (!("elements" in resXml) || !Array.isArray(resXml["elements"])) return res;
  const arr1 = resXml.elements;
  if (arr1.length === 0 || !("elements" in arr1[0]) || !Array.isArray(arr1[0].elements)) return res;
  const arr2 = arr1[0].elements;
  if (arr2.length === 0 || !("elements" in arr2[0]) || !Array.isArray(arr2[0].elements)) return res;
  const arr3 = arr2[0].elements;
  if (arr3.length === 0 || !("elements" in arr3[0]) || !Array.isArray(arr3[0].elements)) return res;
  const arr4 = arr3[0].elements;
  for (const item of arr4) {
    if (!("name" in item)) continue;
    if (!("attributes" in item)) continue;
    if (!("elements" in item) || !Array.isArray(item.elements)) continue;
    const attr = item.attributes;
    if (!("chara" in attr) || !("img" in attr)) continue;
    if (item.name !== "simple_dialog") continue;
    const img = props.choice ? attr.img : attr.img.replace("aether", "lumine");
    let findText = "";
    const arr5 = item.elements[0].elements;
    if (arr5 && arr5.length > 0 && arr5[0].text !== "") findText = arr5[0].text;
    else findText = item.elements[0].text;
    res.push({ chara: attr.chara, img: img, text: findText });
  }
  return res;
}

async function parseXml(link: string): Promise<false | unknown> {
  try {
    const response = await fetch(link, { method: "GET" });
    const data = await response.arrayBuffer();
    return JSON.parse(xml2json(new TextDecoder("utf-8").decode(data)));
  } catch (error) {
    if (error instanceof Error) {
      await TGLogger.Error(`[to-arcBirth] parseXml: ${error.message}`);
    } else {
      await TGLogger.Error(`[to-arcBirth] parseXml: 未知错误-${error}`);
    }
    return false;
  }
}
</script>
<style lang="css" scoped>
.pao-bc-container {
  position: relative;
  display: flex;
  overflow: hidden;
  width: 50vw;
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
  align-items: center;
  justify-content: flex-start;
  column-gap: 4px;
}

.pao-bcc-icon {
  position: relative;
  width: 40px;
  flex-shrink: 0;

  img {
    width: 100%;
  }
}

.pao-bcc-name {
  font-size: 1.5rem;
  font-weight: bold;
}

.pao-bcc-text {
  font-size: 16px;
  text-shadow: 0 0 2px var(--common-shadow-t-8);
  word-break: break-all;
}

.pao-bcc-quote {
  margin-left: 3rem;
  font-size: 1rem;
  opacity: 0.8;
  word-break: break-all;
}

.pao-bc-top-tools {
  position: absolute;
  z-index: 2;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 5px;
  -webkit-backdrop-filter: blur(2px);
  backdrop-filter: blur(2px);
  background-color: var(--common-shadow-t-2);
  border-bottom-right-radius: 5px;
  border-top-left-radius: 5px;
}
</style>
