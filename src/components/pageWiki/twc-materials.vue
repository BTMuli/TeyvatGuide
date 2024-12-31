<template>
  <div class="twc-materials-grid">
    <div
      class="twc-material-box"
      v-for="(item, index) in props.data"
      :key="index"
      @click="checkData(item, index)"
    >
      <div class="twc-material-left">
        <div class="twc-material-bg">
          <img :src="`/icon/bg/${item.star}-Star.webp`" alt="bg" />
        </div>
        <div class="twc-material-icon">
          <img :src="`/icon/material/${item.id}.webp`" alt="icon" />
        </div>
      </div>
      <div class="twc-material-right">{{ item.name }}</div>
    </div>
  </div>
  <TwoMaterial :data="curData" v-model="showOverlay">
    <template #left>
      <div class="card-arrow" @click="switchMaterial(false)">
        <img src="@/assets/icons/arrow-right.svg" alt="right" />
      </div>
    </template>
    <template #right>
      <div class="card-arrow" @click="switchMaterial(true)">
        <img src="@/assets/icons/arrow-right.svg" alt="right" />
      </div>
    </template>
  </TwoMaterial>
</template>
<script lang="ts" setup>
import showSnackbar from "@comp/func/snackbar.js";
import { ref, shallowRef } from "vue";

import TwoMaterial from "./two-material.vue";

import { WikiMaterialData } from "@/data/index.js";

type TwcMaterialsProp = { data: Array<TGApp.App.Calendar.Material> };

const props = defineProps<TwcMaterialsProp>();
const showOverlay = ref<boolean>(false);
const curIndex = ref<number>(0);
const curData = shallowRef<TGApp.App.Material.WikiItem>({
  id: 0,
  name: "",
  description: "",
  type: "",
  star: 0,
  source: [],
  convert: [],
});

function checkData(item: TGApp.App.Calendar.Material, index: number): void {
  if (showOverlay.value) showOverlay.value = false;
  const material = WikiMaterialData.find((m) => m.id === item.id);
  if (material) {
    curData.value = material;
    curIndex.value = index;
    showOverlay.value = true;
    return;
  }
  showSnackbar.warn(`材料 ${item.name} 暂无详细信息`);
}

function switchMaterial(isNext: boolean): void {
  if (isNext) {
    if (curIndex.value === props.data.length - 1) {
      showSnackbar.warn("已经是最后一个材料了");
      return;
    }
    curIndex.value++;
  } else {
    if (curIndex.value === 0) {
      showSnackbar.warn("已经是第一个材料了");
      return;
    }
    curIndex.value--;
  }
  const curItem = props.data[curIndex.value];
  const material = WikiMaterialData.find((m) => m.id === curItem.id);
  if (material) {
    curData.value = material;
    return;
  }
  showSnackbar.warn(`材料 ${curItem.name} 暂无详细信息`);
  if (isNext) curIndex.value--;
  else curIndex.value++;
}
</script>
<style lang="css" scoped>
.twc-materials-grid {
  display: grid;
  width: 100%;
  grid-gap: 5px;
  grid-template-columns: repeat(3, 1fr);
}

.twc-material-box {
  position: relative;
  display: flex;
  height: 45px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 5px;
  background: var(--box-bg-1);
  cursor: pointer;
  gap: 10px;
}

.twc-material-left {
  width: 45px;
  height: 45px;
  border-bottom-left-radius: 5px;
  border-top-left-radius: 5px;
}

.twc-material-bg,
.twc-material-icon {
  position: absolute;
  top: 0;
  width: 45px;
  height: 45px;
  border-bottom-left-radius: 5px;
  border-top-left-radius: 5px;
}

.twc-material-bg img,
.twc-material-icon img {
  width: 100%;
  height: 100%;
  border-bottom-left-radius: 5px;
  border-top-left-radius: 5px;
  object-fit: cover;
}

.twc-material-right {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--box-text-2);
  font-size: 14px;
}

.card-arrow {
  position: relative;
  display: flex;
  width: 30px;
  height: 30px;
  align-items: center;
  justify-content: center;
  cursor: pointer;

  img {
    width: 100%;
    height: 100%;
  }

  &:first-child img {
    transform: rotate(180deg);
  }
}

.dark .card-arrow {
  filter: invert(11%) sepia(73%) saturate(11%) hue-rotate(139deg) brightness(97%) contrast(81%);
}
</style>
