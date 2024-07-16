<template>
  <div class="twm-box">
    <div
      class="twm-item"
      v-for="item in sortMaterialsData"
      :key="item.id"
      @click="toMaterial(item)"
    >
      <div class="twm-item-left">
        <div class="twm-item-bg">
          <img :src="`/icon/bg/${item.star}-Star.webp`" alt="bg" />
        </div>
        <div class="twm-item-icon">
          <img :src="`/icon/material/${item.id}.webp`" alt="icon" />
        </div>
      </div>
      <div class="twm-item-right">
        {{ item.name }}
      </div>
    </div>
  </div>
  <TwoMaterial v-model="visible" :data="curMaterial">
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
import { onMounted, ref } from "vue";

import TwoMaterial from "../../components/wiki/two-material.vue";
import { WikiMaterialData } from "../../data/index.js";

const curMaterial = ref<TGApp.App.Material.WikiItem>(<TGApp.App.Material.WikiItem>{});
const sortMaterialsData = ref<Array<TGApp.App.Material.WikiItem>>([]);
const curIndex = ref(0);
const total = ref(0);
const visible = ref(false);

onMounted(() => sortData(WikiMaterialData));

function sortData(data: TGApp.App.Material.WikiItem[]) {
  sortMaterialsData.value = data;
  curIndex.value = 0;
  total.value = sortMaterialsData.value.length;
  curMaterial.value = sortMaterialsData.value[curIndex.value];
}

function toMaterial(item: TGApp.App.Material.WikiItem) {
  curMaterial.value = item;
  curIndex.value = sortMaterialsData.value.findIndex((i) => i.id === item.id);
  visible.value = true;
}

function switchMaterial(isNext: boolean) {
  if (isNext) {
    if (curIndex.value === total.value - 1) {
      return;
    }
    curIndex.value++;
  } else {
    if (curIndex.value === 0) {
      return;
    }
    curIndex.value--;
  }
  curMaterial.value = sortMaterialsData.value[curIndex.value];
}
</script>
<style lang="css" scoped>
.twm-box {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  padding: 10px;
  gap: 10px;
}

.twm-item {
  position: relative;
  display: flex;
  height: 45px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 5px;
  background: var(--box-bg-1);
  cursor: pointer;
  gap: 10px;
}

.twm-item-left {
  width: 45px;
  height: 45px;
  border-bottom-left-radius: 5px;
  border-top-left-radius: 5px;
}

.twm-item-bg,
.twm-item-icon {
  position: absolute;
  top: 0;
  width: 45px;
  height: 45px;
  border-bottom-left-radius: 5px;
  border-top-left-radius: 5px;
}

.twm-item-bg img,
.twm-item-icon img {
  width: 100%;
  height: 100%;
  border-bottom-left-radius: 5px;
  border-top-left-radius: 5px;
}

.twm-item-right {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 10px;
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
