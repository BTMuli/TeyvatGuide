<!-- 角色/武器材料列表 -->
<template>
  <div class="pw-ml-box">
    <TMaterialStarChip
      v-for="(material, index) in materialList"
      :key="material.id"
      mode="wiki"
      :id="material.id"
      :name="material.name"
      role="button"
      :star="material.star"
      tabindex="0"
      :type="material.type"
      @click="checkData(material, index)"
      @keydown.enter.prevent="checkData(material, index)"
      @keydown.space.prevent="checkData(material, index)"
    />
  </div>
  <TwoMaterial v-if="curData" v-model="showOverlay" :data="curData">
    <template #left>
      <v-btn
        aria-label="上一个养成物品"
        class="card-arrow"
        icon="mdi-chevron-left"
        title="上一个养成物品"
        variant="flat"
        @click="switchMaterial(false)"
      />
    </template>
    <template #right>
      <v-btn
        aria-label="下一个养成物品"
        class="card-arrow"
        icon="mdi-chevron-right"
        title="下一个养成物品"
        variant="flat"
        @click="switchMaterial(true)"
      />
    </template>
  </TwoMaterial>
</template>
<script lang="ts" setup>
import TMaterialStarChip from "@comp/app/t-material-star-chip.vue";
import showSnackbar from "@comp/func/snackbar.js";
import { nextTick, ref, shallowRef, watch } from "vue";

import TwoMaterial from "./two-material.vue";

import { WikiMaterialData } from "@/data/index.js";

type TwcMaterialsProp = { data: Array<TGApp.App.Calendar.Material> };

const props = defineProps<TwcMaterialsProp>();
const showOverlay = ref<boolean>(false);
const curIndex = ref<number>(0);
const materialList = shallowRef<Array<TGApp.App.Material.WikiItem>>(loadData());
const curData = shallowRef<TGApp.App.Material.WikiItem | undefined>();

watch(
  () => props.data,
  () => {
    materialList.value = loadData();
    curData.value = undefined;
    curIndex.value = 0;
    showOverlay.value = false;
  },
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
  void nextTick(() => {
    if (curData.value?.id === item.id) showOverlay.value = true;
  });
}

function switchMaterial(isNext: boolean): void {
  if (isNext) {
    if (curIndex.value === materialList.value.length - 1) {
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
  curData.value = materialList.value[curIndex.value];
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
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border: 1px solid var(--common-shadow-2);
  border-radius: 8px;
  background: var(--box-bg-1);
  color: var(--box-text-2);
}
</style>
