<!-- 材料WIKI -->
<template>
  <v-app-bar>
    <template #prepend>
      <div class="twm-top-prepend">
        <div class="title">
          <img alt="icon" src="/source/UI/wikiGCG.webp" />
          <span>材料图鉴</span>
        </div>
        <v-select
          v-model="selectType"
          :clearable="true"
          :hide-details="true"
          :items="materialTypes"
          density="compact"
          item-title="type"
          label="材料类别"
          variant="outlined"
          width="250px"
        >
          <template #item="{ props, item }">
            <v-list-item v-bind="props">
              <template #append>
                <v-chip>{{ item.raw.number }}</v-chip>
              </template>
            </v-list-item>
          </template>
        </v-select>
      </div>
    </template>
    <template #append>
      <div class="twm-top-append">
        <v-text-field
          v-model="search"
          :hide-details="true"
          :single-line="true"
          density="compact"
          label="搜索"
          prepend-inner-icon="mdi-magnify"
          variant="outlined"
          @keydown.enter="searchMaterial()"
          @click:prepend-inner="searchMaterial()"
        />
      </div>
    </template>
  </v-app-bar>
  <div class="twm-box">
    <PwMaterialItem
      v-for="material in sortMaterialsData"
      :key="material.id"
      :material
      class="twm-item"
      @click="toMaterial(material)"
    />
  </div>
  <TwoMaterial v-if="curMaterial" v-model="visible" :data="curMaterial">
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
import PwMaterialItem from "@comp/pageWiki/pw-material-item.vue";
import TwoMaterial from "@comp/pageWiki/two-material.vue";
import { onMounted, ref, shallowRef, watch } from "vue";

import { WikiMaterialData } from "@/data/index.js";

type MaterialType = { type: string; number: number };

const curIndex = ref<number>(0);
const total = ref<number>(0);
const visible = ref<boolean>(false);
const search = ref<string>();
const selectType = ref<string | null>(null);
const materialTypes = shallowRef<Array<MaterialType>>([]);
const curMaterial = shallowRef<TGApp.App.Material.WikiItem | undefined>();
const sortMaterialsData = shallowRef<Array<TGApp.App.Material.WikiItem>>([]);

onMounted(() => {
  const tmpData: Array<MaterialType> = [];
  for (const item of WikiMaterialData) {
    const typeFindIndex = tmpData.findIndex((itemT) => itemT.type === item.type);
    if (typeFindIndex === -1) {
      const itemN: MaterialType = { type: item.type, number: 1 };
      tmpData.push(itemN);
      continue;
    }
    tmpData[typeFindIndex].number++;
  }
  materialTypes.value = tmpData;
  sortData(WikiMaterialData);
  showSnackbar.success(`成功获取${sortMaterialsData.value.length}条数据`);
});

watch(
  () => selectType.value,
  () => sortData(getSelectMaterials()),
);

function getSelectMaterials(): Array<TGApp.App.Material.WikiItem> {
  if (selectType.value === null) return WikiMaterialData;
  else return WikiMaterialData.filter((item) => item.type === selectType.value);
}

function sortData(data: Array<TGApp.App.Material.WikiItem>): void {
  sortMaterialsData.value = data;
  curIndex.value = 0;
  total.value = sortMaterialsData.value.length;
  curMaterial.value = sortMaterialsData.value[curIndex.value];
}

function toMaterial(item: TGApp.App.Material.WikiItem): void {
  curMaterial.value = item;
  curIndex.value = sortMaterialsData.value.findIndex((i) => i.id === item.id);
  visible.value = true;
}

function switchMaterial(isNext: boolean): void {
  if (isNext) {
    if (curIndex.value === total.value - 1) return;
    curIndex.value++;
  } else {
    if (curIndex.value === 0) return;
    curIndex.value--;
  }
  curMaterial.value = sortMaterialsData.value[curIndex.value];
}

function searchMaterial(): void {
  let selectData = getSelectMaterials();
  if (search.value === undefined || search.value === "") {
    if (sortMaterialsData.value.length === selectData.length) {
      showSnackbar.warn("请输入搜索内容!");
      return;
    }
    sortData(selectData);
    showSnackbar.success("已重置!");
    return;
  }
  selectData = selectData.filter(
    (i) => i.name.includes(search.value!) || i.description.includes(search.value!),
  );
  if (selectData.length === 0) {
    showSnackbar.warn("未找到符合条件的材料!");
    return;
  }
  sortData(selectData);
  showSnackbar.success(`找到${selectData.length}条符合条件的材料`);
}
</script>
<style lang="css" scoped>
.twm-top-prepend {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  margin-left: 16px;
  column-gap: 16px;

  .title {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--common-text-title);
    column-gap: 4px;
    font-family: var(--font-title);
    font-size: 20px;

    img {
      width: 32px;
      height: 32px;
      object-fit: cover;
    }
  }
}

.twm-top-append {
  position: relative;
  width: 600px;
  margin-right: 16px;
}

.twm-box {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(auto-fill, minmax(200px, 0.25fr));
}

.twm-item {
  cursor: pointer;
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
    width: 30px;
    aspect-ratio: 1;
  }

  &:first-child {
    transform: rotate(180deg);
  }
}

.dark .card-arrow {
  filter: invert(11%) sepia(73%) saturate(11%) hue-rotate(139deg) brightness(97%) contrast(81%);
}
</style>
