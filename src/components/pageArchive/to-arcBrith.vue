<template>
  <TOverlay v-model="visible" blur-val="5px">
    <div class="toab-container" v-if="props.data">
      <div class="toab-img">
        <img :src="props.data.take_picture[Number(props.choice)]" alt="顶部图像" />
        <div class="toab-dialog" v-show="showText">
          <div v-for="(item, index) in textParse" :key="index" class="toab-dialog-item">
            <div class="toab-dialog-item-icon" v-if="item.icon" :title="item.name">
              <img :src="item.icon" alt="对白头像" />
            </div>
            <div v-else-if="item.name !== '未知'" class="toab-dialog-item-name">
              {{ item.name }}
            </div>
            <div
              :class="{
                'toab-dialog-item-text': item.icon !== undefined,
                'toab-dialog-item-text-mini': item.icon === undefined,
              }"
            >
              {{ item.text }}
            </div>
          </div>
        </div>
      </div>
      <div class="toab-top-tools">
        <v-icon @click="onCopy" title="复制到剪贴板">mdi-content-copy</v-icon>
        <v-icon @click="onDownload" title="下载到本地">mdi-download</v-icon>
        <v-icon @click="loadText" :title="showText ? '隐藏对白' : '显示对白'">
          {{ showText ? "mdi-eye-off" : "mdi-eye" }}
        </v-icon>
      </div>
    </div>
  </TOverlay>
</template>
<script setup lang="ts">
import TOverlay from "@comp/app/t-overlay.vue";
import showSnackbar from "@comp/func/snackbar.js";
import { fetch } from "@tauri-apps/plugin-http";
import { computed, onMounted, ref, shallowRef, watch } from "vue";
import { xml2json } from "xml-js";

import TGLogger from "@/utils/TGLogger.js";
import { copyToClipboard, getImageBuffer, saveCanvasImg } from "@/utils/TGShare.js";
import { bytesToSize } from "@/utils/toolFunc.js";

type ToArcBirthProps = {
  modelValue: boolean;
  data?: TGApp.Archive.Birth.DrawItem;
  choice: boolean;
};
type ToArcBirthEmits = (e: "update:modelValue", v: boolean) => void;
type XmlKeyMap = { id: string; rel: string; group?: string; icon: string };
type XmlTextList = { chara: string; img: string; text: string };
type XmlTextParse = { name: string; icon?: string; text: string };

const props = defineProps<ToArcBirthProps>();
const emits = defineEmits<ToArcBirthEmits>();
const showText = ref<boolean>(false);
const buffer = shallowRef<Uint8Array | null>(null);
const textParse = shallowRef<Array<XmlTextParse>>([]);
const visible = computed<boolean>({
  get: () => props.modelValue,
  set: (v) => emits("update:modelValue", v),
});
onMounted(() => clearData());
watch(() => props.data, clearData);
watch(() => props.choice, clearData);

function clearData(): void {
  buffer.value = null;
  textParse.value = [];
  showText.value = false;
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
  const textList = getTextList(resXml);
  textParse.value = textList.map((item) => {
    const key = keyMap.find((keyItem) => keyItem.id === item.img);
    if (!key) return { name: "未知", text: item.text };
    return { name: key.group ?? key.id, text: item.text, icon: key.icon };
  });
  showText.value = true;
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
    res.push({ chara: attr.chara, img: img, text: item.elements[0].text });
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
.toab-container {
  position: relative;
  display: flex;
  width: 50vw;
  align-items: center;
  justify-content: center;
}

.toab-img {
  position: relative;
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: center;
}

.toab-img img {
  overflow: hidden;
  width: 100%;
  max-width: 100%;
  height: auto;
  border-radius: 10px;
}

.toab-top-tools {
  position: absolute;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 5px;
  -webkit-backdrop-filter: blur(5px);
  backdrop-filter: blur(5px);
  background-color: var(--common-shadow-t-2);
  border-bottom-right-radius: 5px;
  border-top-left-radius: 5px;
}

.toab-dialog {
  position: absolute;
  bottom: 0;
  left: 0;
  display: flex;
  width: 100%;
  height: 100%;
  max-height: 40vh;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  border-radius: 10px;
  -webkit-backdrop-filter: blur(5px);
  backdrop-filter: blur(5px);
  background: var(--common-shadow-t-2);
  color: var(--box-text-1);
  overflow-y: auto;
}

.toab-dialog-item {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: flex-start;
}

.toab-dialog-item-icon {
  width: 50px;
  min-width: 50px;
}

.toab-dialog-item-name {
  font-size: 1.5rem;
  font-weight: bold;
}

.toab-dialog-item-text {
  font-size: 1.2rem;
  word-break: break-all;
}

.toab-dialog-item-text-mini {
  margin-left: 3rem;
  font-size: 1rem;
  opacity: 0.8;
  word-break: break-all;
}
</style>
