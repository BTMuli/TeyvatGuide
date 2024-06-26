<template>
  <TOverlay v-model="visible" hide :to-click="onCancel" blur-val="5px">
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
            <div :class="item.icon ? 'toab-dialog-item-text' : 'toab-dialog-item-text-mini'">
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
import { http } from "@tauri-apps/api";
import { ResponseType } from "@tauri-apps/api/http";
import { computed, onMounted, ref, watch } from "vue";
import { xml2json } from "xml-js";

import { copyToClipboard, getImageBuffer, saveCanvasImg } from "../../utils/TGShare.js";
import { bytesToSize } from "../../utils/toolFunc.js";
import showSnackbar from "../func/snackbar.js";
import TOverlay from "../main/t-overlay.vue";

interface ToArcBirthProps {
  modelValue: boolean;
  data?: TGApp.Archive.Birth.DrawItem;
  choice: boolean;
}

interface ToArcBirthEmits {
  (event: "update:modelValue", value: boolean): void;
}

const props = defineProps<ToArcBirthProps>();
const emits = defineEmits<ToArcBirthEmits>();
const buffer = ref<Uint8Array | null>(null);
const showText = ref(false);
const textParse = ref<Array<XmlTextParse>>([]);

const visible = computed({
  get: () => props.modelValue,
  set: (value) => {
    emits("update:modelValue", value);
  },
});

onMounted(loadData);
watch(() => props.data, loadData);
watch(() => props.choice, loadData);

interface XmlKeyMap {
  id: string;
  rel: string;
  group?: string;
  icon: string;
}

interface XmlTextList {
  chara: string;
  img: string;
  text: string;
}

interface XmlTextParse {
  name: string;
  icon?: string;
  text: string;
}

function loadData() {
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
  showSnackbar({ text: `图片已复制到剪贴板，大小：${size}` });
}

async function onDownload() {
  if (!props.data) return;
  const image = props.data.take_picture[Number(props.choice)];
  if (buffer.value === null) buffer.value = await getImageBuffer(image);
  const size = bytesToSize(buffer.value.byteLength);
  await saveCanvasImg(buffer.value, Date.now().toString());
  showSnackbar({ text: `图片已下载到本地，大小：${size}` });
}

async function loadText(): Promise<void> {
  if (!props.data) return;
  if (textParse.value.length > 0) {
    showText.value = !showText.value;
    return;
  }
  const resSource: any = await parseXml(props.data.gal_resource);
  if (resSource === false) {
    showSnackbar({
      text: "对白数据加载失败",
      color: "error",
    });
    return;
  }
  const keyMap: XmlKeyMap[] = resSource["elements"][0]["elements"][0]["elements"]
    .map((item: any) => {
      if (item["name"] === "chara")
        return <XmlKeyMap>{
          id: item["attributes"]["id"],
          rel: item["attributes"]["rel"],
          group: item["attributes"]["group"],
          icon: item["attributes"]["src"],
        };
    })
    .filter((item: any) => item !== undefined);
  const resXml = await parseXml(props.data.gal_xml);
  const textList: XmlTextList[] = resXml["elements"][0]["elements"][0]["elements"][0]["elements"]
    .map((item: any) => {
      if (item["name"] === "simple_dialog") {
        let img = item["attributes"]["img"];
        if (!props.choice && img) img = img.replace("aether", "lumine");
        return <XmlTextList>{
          chara: item["attributes"]["chara"],
          img: img,
          text: item["elements"][0]["text"],
        };
      }
    })
    .filter((item: any) => item !== undefined);
  textParse.value = textList.map((item: XmlTextList) => {
    const key = keyMap.find((keyItem: XmlKeyMap) => keyItem.id === item.img);
    if (!key) {
      return {
        name: "未知",
        text: item.text,
      };
    }
    return {
      name: key.group ?? key.id,
      text: item.text,
      icon: key.icon,
    };
  });
  showText.value = true;
}

async function parseXml(link: string) {
  try {
    const res = await http.fetch<string>(link, {
      method: "GET",
      responseType: ResponseType.Text,
    });
    return JSON.parse(xml2json(res.data));
  } catch (error) {
    console.error(error);
    return false;
  }
}

function onCancel() {
  visible.value = false;
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
  border-bottom-right-radius: 10px;
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
