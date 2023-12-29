<template>
  <TOverlay v-model="visible" hide :to-click="onCancel" blur-val="20px">
    <div v-if="props.data" class="ton-container">
      <slot name="left"></slot>
      <div class="ton-box">
        <img alt="bg" class="ton-bg" v-if="props.data" :src="props.data.profile" />
        <div class="ton-content">
          <span>{{ props.data.name }}</span>
          <span>{{ parseNamecard(props.data.desc) }}</span>
          <span>获取途径：{{ props.data.source }}</span>
        </div>
        <div class="ton-type">{{ getType }}</div>
        <v-btn
          class="ton-share"
          @click="shareNamecard"
          variant="outlined"
          :loading="loading"
          data-html2canvas-ignore
        >
          <v-icon>mdi-share-variant</v-icon>
          <span>分享</span>
        </v-btn>
      </div>
      <slot name="right"></slot>
    </div>
  </TOverlay>
</template>
<script setup lang="ts">
import { computed, ref } from "vue";

import { generateShareImg } from "../../utils/TGShare";
import TOverlay from "../main/t-overlay.vue";

interface ToNamecardProps {
  modelValue: boolean;
  data?: TGApp.App.NameCard.Item;
}

enum ToNamecardTypeEnum {
  other = 0,
  achievement = 1,
  role = 2,
  record = 3,
  activity = 4,
  unknown = 5,
}

type ToNamecardTypeMap = {
  [key in ToNamecardTypeEnum]: string;
};

const typeMap: ToNamecardTypeMap = {
  [ToNamecardTypeEnum.other]: "其他",
  [ToNamecardTypeEnum.achievement]: "成就",
  [ToNamecardTypeEnum.role]: "角色",
  [ToNamecardTypeEnum.record]: "纪行",
  [ToNamecardTypeEnum.activity]: "活动",
  [ToNamecardTypeEnum.unknown]: "未知",
};

type ToNamecardEmits = (e: "update:modelValue", value: boolean) => void;

const props = defineProps<ToNamecardProps>();

const emits = defineEmits<ToNamecardEmits>();

const loading = ref<boolean>(false);

const getType = computed(() => {
  if (!props.data) return typeMap[ToNamecardTypeEnum.unknown];
  switch (props.data.type) {
    case ToNamecardTypeEnum.achievement:
      return typeMap[ToNamecardTypeEnum.achievement];
    case ToNamecardTypeEnum.role:
      return typeMap[ToNamecardTypeEnum.role];
    case ToNamecardTypeEnum.record:
      return typeMap[ToNamecardTypeEnum.record];
    case ToNamecardTypeEnum.activity:
      return typeMap[ToNamecardTypeEnum.activity];
    default:
      return typeMap[ToNamecardTypeEnum.other];
  }
});

const visible = computed({
  get: () => props.modelValue,
  set: (value) => {
    emits("update:modelValue", value);
  },
});

function onCancel() {
  visible.value = false;
}

function parseNamecard(desc: string): string {
  let array = [];
  if (desc.startsWith("名片纹饰。「")) {
    array.push("名片纹饰。");
    const reg = /「.+?」/g;
    const match = desc.match(reg);
    if (match !== null) {
      for (const item of match) {
        if (item.length <= 34) {
          array.push(item);
        } else {
          array.push("「");
          array.push(...parseDesc(item.slice(1, -1), true));
          const maxLength = Math.max(...array.map((item) => item.length));
          array.push("  ".repeat(maxLength - 4) + "」");
        }
      }
    }
  } else {
    array.push("名片纹饰。");
    const content = desc.slice(5);
    if (content.length <= 32) {
      array.push(content);
    } else {
      array.push(...parseDesc(content));
    }
  }
  const res = array.join("\n");
  if (!res.endsWith("\n")) return res + "\n";
  return res;
}

function parseDesc(desc: string, inQuote: boolean = false): string[] {
  let res = desc.replace(/。/g, "。\n");
  res = res.replace(/；/g, "；\n");
  res = res.replace(/：/g, "：\n");
  res = res.replace(/？/g, "？\n");
  if (!desc.includes("！」")) {
    res = res.replace(/！/g, "！\n");
  }
  res = res.replace(/…/g, "…\n");
  const match = res.split("\n");
  let array: string[] = [];
  for (const item of match) {
    if (item.length > 0 && item.length <= 32) {
      array.push(item);
    } else {
      const match2 = item.replace(/，/g, "，\n").split("\n");
      for (const item2 of match2) {
        if (item2.length > 0) array.push(item2);
      }
    }
  }
  if (inQuote) array = array.map((item) => `  ${item}`);
  return array;
}

async function shareNamecard(): Promise<void> {
  const namecardBox = <HTMLElement>document.querySelector(".ton-box");
  const fileName = `【${getType.value}名片】-${props.data?.name}`;
  loading.value = true;
  await generateShareImg(fileName, namecardBox);
  loading.value = false;
}
</script>
<style lang="css" scoped>
.ton-container {
  display: flex;
  align-items: center;
  justify-content: center;
  column-gap: 10px;
}

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
}

.ton-type {
  position: absolute;
  top: 10px;
  left: 10px;
  padding: 0 5px;
  border: 1px solid var(--tgc-white-1);
  border-radius: 5px;
  backdrop-filter: blur(20px);
  color: var(--tgc-white-1);
}

.ton-content {
  position: absolute;
  right: 0;
  left: 0;
  display: flex;
  width: 100%;
  height: 100%;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-end;
  padding: 10px;
  background: var(--common-shadow-t-1);
  color: var(--tgc-white-1);
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
  backdrop-filter: blur(5px);
  color: var(--tgc-white-1);
}
</style>
