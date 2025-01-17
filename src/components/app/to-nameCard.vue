<template>
  <TOverlay v-model="visible" v-if="props.data">
    <slot name="left"></slot>
    <div class="ton-box">
      <img
        alt="bg"
        class="ton-bg"
        v-if="props.data"
        :src="`/WIKI/nameCard/profile/${props.data.name}.webp`"
      />
      <div class="ton-content">
        <span>{{ props.data.name }}</span>
        <span>{{ parseNameCard(props.data.desc) }}</span>
        <span>获取途径：{{ props.data.source }}</span>
      </div>
      <div class="ton-type">{{ getType }}</div>
      <v-btn
        class="ton-share"
        @click="shareNameCard"
        variant="outlined"
        :loading="loading"
        data-html2canvas-ignore
      >
        <v-icon>mdi-share-variant</v-icon>
        <span>分享</span>
      </v-btn>
    </div>
    <slot name="right"></slot>
  </TOverlay>
</template>
<script setup lang="ts">
import showSnackbar from "@comp/func/snackbar.js";
import { computed, ref } from "vue";

import TOverlay from "./t-overlay.vue";

import { generateShareImg } from "@/utils/TGShare.js";

enum ToNameCardTypeEnum {
  other,
  achievement,
  role,
  record,
  activity,
  unknown,
}

type ToNameCardTypeMap = { [key in ToNameCardTypeEnum]: string };
type ToNameCardProps = { data?: TGApp.App.NameCard.Item };

const props = defineProps<ToNameCardProps>();
const visible = defineModel<boolean>();
const typeMap: ToNameCardTypeMap = {
  0: "其他",
  1: "成就",
  2: "角色",
  3: "纪行",
  4: "活动",
  5: "未知",
};
const loading = ref<boolean>(false);
const getType = computed<string>(() => {
  if (!props.data) return typeMap[ToNameCardTypeEnum.unknown];
  if (!(props.data.type satisfies ToNameCardTypeEnum)) return typeMap[5];
  const type: ToNameCardTypeEnum = props.data.type;
  return typeMap[type];
});

function parseNameCard(desc: string): string {
  let array = [];
  if (desc.startsWith("名片纹饰。「") && desc.endsWith("」")) {
    array.push("名片纹饰。");
    const reg = /「.+?」/g;
    const match = desc.match(reg);
    if (match !== null) {
      for (const item of match) {
        if (item.length <= 34) {
          array.push(item);
          continue;
        }
        array.push("「");
        array.push(...parseDesc(item.slice(1, -1), true));
        const maxLength = Math.max(...array.map((item) => item.length));
        array.push("  ".repeat(maxLength - 4) + "」");
      }
    }
  } else {
    array.push("名片纹饰。");
    const content = desc.slice(5);
    if (content.length <= 32) array.push(content);
    else array.push(...parseDesc(content));
  }
  const res = array.join("\n");
  if (!res.endsWith("\n")) return res + "\n";
  return res;
}

function parseDesc(desc: string, inQuote: boolean = false): string[] {
  let res = desc.replace(/。/g, "。\n");
  res = res.replace(/；/g, "；\n");
  if (props?.data?.index !== 187) {
    res = res.replace(/：/g, "：\n");
    res = res.replace(/？/g, "？\n");
  } else {
    res = res.replace("时候，", "时候，\n");
    res = res.replace("。\n」", "。」");
  }
  if (!desc.includes("！」")) res = res.replace(/！/g, "！\n");
  res = res.replace(/…/g, "…\n");
  const match = res.split("\n");
  let array: string[] = [];
  for (const item of match) {
    if (item.length > 0 && item.length <= 32) {
      array.push(item);
      continue;
    }
    const match2 = item.replace(/，/g, "，\n").split("\n");
    match2.map((i) => (i.length > 0 ? array.push(i) : null));
  }
  if (inQuote) array = array.map((item) => `  ${item}`);
  return array;
}

async function shareNameCard(): Promise<void> {
  const nameCardBox = document.querySelector<HTMLElement>(".ton-box");
  if (nameCardBox === null) {
    showSnackbar.error("未找到名片内容");
    return;
  }
  const fileName = `【${getType.value}名片】-${props.data?.name}`;
  loading.value = true;
  await generateShareImg(fileName, nameCardBox);
  loading.value = false;
}
</script>
<style lang="css" scoped>
.ton-box {
  position: relative;
  overflow: hidden;
  width: 800px;
  height: 400px;
  border-radius: 10px;
}

.ton-bg {
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 10px;
}

.ton-type {
  position: absolute;
  top: 10px;
  left: 10px;
  padding: 0 5px;
  border: 1px solid var(--tgc-white-1);
  border-radius: 5px;
  color: var(--tgc-white-1);
}

.ton-content {
  position: absolute;
  right: 0;
  left: 0;
  display: flex;
  overflow: hidden;
  width: 100%;
  height: 100%;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-end;
  padding: 10px;
  border-radius: 10px;
  backdrop-filter: blur(5px);
  background: rgb(0 0 0 / 25%);
  color: var(--tgc-white-1);
}

.dark .ton-content {
  background: rgb(0 0 0/ 50%);
}

.ton-content :first-child {
  font-family: var(--font-title);
  font-size: 20px;
  text-shadow: 0 0 5px rgb(0 0 0/80%);
}

.ton-content :nth-child(2) {
  border-bottom: 1px dotted var(--tgc-white-1);
  text-shadow: 0 0 2px rgb(0 0 0/80%);
  white-space: pre-wrap;
}

.ton-content :last-child {
  opacity: 0.8;
  text-shadow: 0 0 2px black;
}

.ton-share {
  position: absolute;
  right: 10px;
  bottom: 10px;
  border: 1px solid var(--tgc-white-1);
  border-radius: 5px;
  color: var(--tgc-white-1);
}
</style>
