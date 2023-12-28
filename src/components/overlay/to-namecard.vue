<template>
  <!-- todo 支持 share -->
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
        <div class="ton-type">{{ getType.text }}</div>
      </div>
      <slot name="right"></slot>
    </div>
  </TOverlay>
</template>
<script setup lang="ts">
import { computed, watch } from "vue";

import TOverlay from "../main/t-overlay.vue";

interface ToNamecardProps {
  modelValue: boolean;
  data?: TGApp.App.NameCard.Item;
}

interface ToNamecardType {
  text: string;
  color: string;
  background: string;
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
  [key in ToNamecardTypeEnum]: ToNamecardType;
};

const typeMap: ToNamecardTypeMap = {
  [ToNamecardTypeEnum.other]: {
    text: "其他",
    color: "var(--tgc-white-1)",
    background: "var(--tgc-black-1)",
  },
  [ToNamecardTypeEnum.achievement]: {
    text: "成就",
    color: "var(--tgc-white-1)",
    background: "var(--tgc-black-1)",
  },
  [ToNamecardTypeEnum.role]: {
    text: "角色",
    color: "var(--tgc-white-1)",
    background: "var(--tgc-black-1)",
  },
  [ToNamecardTypeEnum.record]: {
    text: "纪行",
    color: "var(--tgc-white-1)",
    background: "var(--tgc-black-1)",
  },
  [ToNamecardTypeEnum.activity]: {
    text: "活动",
    color: "var(--tgc-white-1)",
    background: "var(--tgc-black-1)",
  },
  [ToNamecardTypeEnum.unknown]: {
    text: "未知",
    color: "var(--tgc-white-1)",
    background: "var(--tgc-black-1)",
  },
};

type ToNamecardEmits = (e: "update:modelValue", value: boolean) => void;

const props = defineProps<ToNamecardProps>();

const emits = defineEmits<ToNamecardEmits>();

watch(
  () => props.data,
  () => {
    if (props.data) {
      console.log(JSON.stringify(props.data));
    }
  },
);

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
          array.push(...parseDesc(item.slice(1, -1)));
          array.push("」");
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

function parseDesc(desc: string): string[] {
  let res = desc.replace(/。/g, "。\n");
  res = res.replace(/；/g, "；\n");
  res = res.replace(/：/g, "：\n");
  res = res.replace(/？/g, "？\n");
  if (!desc.includes("！」")) {
    res = res.replace(/！/g, "！\n");
  }
  res = res.replace(/…/g, "…\n");
  const match = res.split("\n");
  const array: string[] = [];
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
  return array;
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
  box-shadow: 0 0 5px var(--common-shadow-2);
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
  backdrop-filter: blur(5px);
  color: var(--tgc-white-1);
  text-shadow: 0 0 5px rgb(0 0 0/80%);
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
  background: rgb(0 0 0 / 20%);
  color: var(--tgc-white-1);
  text-shadow: 0 0 5px rgb(0 0 0/80%);
}

.ton-content :nth-child(1) {
  font-family: var(--font-title);
  font-size: 20px;
}

.ton-content :nth-child(2) {
  opacity: 0.8;
  white-space: pre-wrap;
}

.ton-content :nth-child(3) {
  border-top: 1px dotted var(--tgc-white-1);
  opacity: 0.8;
}
</style>
