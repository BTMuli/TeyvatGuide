<!-- 角色/武器材料列表 -->
<template>
  <div class="pw-ml-box">
    <PwMaterialItem
      v-for="(material, index) in materialList"
      :key="index"
      :material
      @click="checkData(material, index)"
    />
  </div>
  <TwoMaterial v-model="showOverlay" :data="curData">
    <template #left>
      <div class="card-arrow" @click="switchMaterial(false)">
        <img alt="right" src="@/assets/icons/arrow-right.svg" />
      </div>
    </template>
    <template #right>
      <div class="card-arrow" @click="switchMaterial(true)">
        <img alt="right" src="@/assets/icons/arrow-right.svg" />
      </div>
    </template>
  </TwoMaterial>
</template>
<script lang="ts" setup>
import showSnackbar from "@comp/func/snackbar.js";
import { ref, shallowRef, watch } from "vue";

import PwMaterialItem from "./pw-material-item.vue";
import TwoMaterial from "./two-material.vue";

import { WikiMaterialData } from "@/data/index.js";

type TwcMaterialsProp = { data: Array<TGApp.App.Calendar.Material> };

const props = defineProps<TwcMaterialsProp>();
const showOverlay = ref<boolean>(false);
const curIndex = ref<number>(0);
const materialList = shallowRef<Array<TGApp.App.Material.WikiItem>>(loadData());
const curData = shallowRef<TGApp.App.Material.WikiItem>({
  id: 0,
  name: "",
  description: "",
  type: "",
  star: 0,
  source: [],
  convert: [],
});

watch(
  () => props.data,
  () => (materialList.value = loadData()),
);

function loadData(): Array<TGApp.App.Material.WikiItem> {
  const tmp: Array<TGApp.App.Material.WikiItem> = [];
  for (const d of props.data) {
    const material = WikiMaterialData.find((m) => m.id === d.id);
    if (material) tmp.push(material);
  }
  return tmp;
}

function checkData(item: TGApp.App.Material.WikiItem, index: number): void {
  if (showOverlay.value) showOverlay.value = false;
  curData.value = item;
  curIndex.value = index;
  showOverlay.value = true;
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
.pw-ml-box {
  display: grid;
  width: 100%;
  gap: 8px;
  grid-template-columns: repeat(3, 1fr);
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
