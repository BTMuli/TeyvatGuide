<template>
  <TItemBox v-model="box" @click="showData" />
</template>
<script lang="ts" setup>
// vue
import { onMounted, ref } from "vue";
import TItemBox, { TItemBoxData } from "../main/t-itembox.vue";

interface TibUrAvatarProps {
  modelValue: TGApp.Sqlite.Record.Avatar;
}

const props = defineProps<TibUrAvatarProps>();
const box = ref({} as TItemBoxData);
const getName = () => {
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
    bg: `/icon/bg/${props.modelValue.star}-Star.webp`,
    icon: `/WIKI/character/icon/${props.modelValue.id}.webp`,
    lt: `/icon/element/${props.modelValue.element}元素.webp`,
    rt: props.modelValue.constellation.toString() || "0",
    rtSize: "20px",
    innerText: `${getName()}`,
    innerHeight: 20,
    display: "inner",
  };
});

function showData() {
  // todo @click 应该出来的是一个弹窗，而不是 console
  console.log(props.modelValue);
}
</script>
