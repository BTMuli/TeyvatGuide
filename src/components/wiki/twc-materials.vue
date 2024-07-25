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
          <img :src="item.bg" alt="bg" />
        </div>
        <div class="twc-material-icon">
          <img :src="item.icon" alt="icon" />
        </div>
      </div>
      <div class="twc-material-right">
        {{ item.name }}
      </div>
    </div>
  </div>
  <TwoMaterial :data="curData" v-model="showOverlay">
    <template #left>
      <div class="card-arrow left" @click="switchMaterial(false)">
        <img src="../../assets/icons/arrow-right.svg" alt="right" />
      </div>
    </template>
    <template #right>
      <div class="card-arrow" @click="switchMaterial(true)">
        <img src="../../assets/icons/arrow-right.svg" alt="right" />
      </div>
    </template>
  </TwoMaterial>
</template>
<script lang="ts" setup>
import { ref } from "vue";

import { WikiMaterialData } from "../../data/index.js";
import showSnackbar from "../func/snackbar.js";

import TwoMaterial from "./two-material.vue";

interface TwcMaterialsProp {
  data: TGApp.App.Calendar.Material[];
}

const props = defineProps<TwcMaterialsProp>();
const showOverlay = ref(false);
const curIndex = ref(0);
const curData = ref<TGApp.App.Material.WikiItem>({
  id: 0,
  name: "",
  description: "",
  type: "",
  star: 0,
  source: [],
  convert: [],
});

function checkData(item: TGApp.App.Calendar.Material, index: number) {
  if (showOverlay.value) showOverlay.value = false;
  const material = WikiMaterialData.find((m) => m.id === item.id);
  if (material) {
    curData.value = material;
    curIndex.value = index;
    showOverlay.value = true;
  } else {
    showSnackbar({
      text: `材料 ${item.name} 暂无详细信息`,
      color: "warn",
    });
  }
}

function switchMaterial(isNext: boolean) {
  if (isNext) {
    if (curIndex.value === props.data.length - 1) {
      showSnackbar({
        text: "已经是最后一个材料了",
        color: "warn",
      });
      return;
    }
    curIndex.value++;
  } else {
    if (curIndex.value === 0) {
      showSnackbar({
        text: "已经是第一个材料了",
        color: "warn",
      });
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
  showSnackbar({
    text: `材料 ${curItem.name} 暂无详细信息`,
    color: "warn",
  });
  isNext ? curIndex.value-- : curIndex.value++;
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
}

.dark .card-arrow {
  filter: invert(11%) sepia(73%) saturate(11%) hue-rotate(139deg) brightness(97%) contrast(81%);
}

.card-arrow img {
  width: 100%;
  height: 100%;
}

.card-arrow.left img {
  transform: rotate(180deg);
}
</style>
