<template>
  <TItemBox v-model="box" :title="hoverTitle" />
</template>
<script lang="ts" setup>
import { onMounted, ref } from "vue";

import TItemBox from "../main/t-itembox.vue";
import type { TItemBoxData } from "../main/t-itembox.vue";

interface TibUrAvatarProps {
  modelValue: TGApp.Sqlite.Record.Avatar;
}

const props = defineProps<TibUrAvatarProps>();
const box = ref<TItemBoxData>(<TItemBoxData>{});
const hoverTitle = ref<string>("点击查看详情");
const getName = (): string => {
  return props.modelValue.id === 10000005
    ? "旅行者-空"
    : props.modelValue.id === 10000007
    ? "旅行者-荧"
    : props.modelValue.name;
};

onMounted(async () => {
  box.value = {
    size: "80px",
    height: "80px",
    ltSize: "30px",
    clickable: false,
    bg: `/icon/bg/${props.modelValue.star}-Star.webp`,
    icon: `/WIKI/character/icon/${props.modelValue.id}.webp`,
    lt: `/icon/element/${props.modelValue.element}元素.webp`,
    rt: props.modelValue.constellation.toString() || "0",
    rtSize: "20px",
    innerText: `${getName()}`,
    innerHeight: 20,
    display: "inner",
  };
  hoverTitle.value = `等级：${props.modelValue.level}\n好感：${props.modelValue.fetter}\n角色ID：${props.modelValue.id}`;
});
</script>
