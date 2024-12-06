<template>
  <div class="tw-nc-box">
    <v-text-field
      v-model="search"
      prepend-inner-icon="mdi-magnify"
      label="搜索"
      :hide-details="true"
      variant="outlined"
      @click:prepend-inner="searchNameCard()"
      @keyup.enter="searchNameCard()"
    />
    <div class="tw-nc-list">
      <v-virtual-scroll :items="sortNameCardsData" :item-height="80">
        <template #default="{ item }">
          <TopNameCard :data="item" @selected="showNameCard(item)" />
          <div style="height: 10px" />
        </template>
      </v-virtual-scroll>
    </div>
  </div>
  <ToNameCard v-model="visible" :data="curNameCard">
    <template #left>
      <div class="card-arrow left" @click="switchCard(false)">
        <img src="../../assets/icons/arrow-right.svg" alt="right" />
      </div>
    </template>
    <template #right>
      <div class="card-arrow" @click="switchCard(true)">
        <img src="../../assets/icons/arrow-right.svg" alt="right" />
      </div>
    </template>
  </ToNameCard>
</template>
<script lang="ts" setup>
import { onMounted, ref, shallowRef } from "vue";

import ToNameCard from "../../components/app/to-namecard.vue";
import TopNameCard from "../../components/app/top-namecard.vue";
import showSnackbar from "../../components/func/snackbar.js";
import { AppNameCardsData } from "../../data/index.js";

const curNameCard = shallowRef<TGApp.App.NameCard.Item>();
const sortNameCardsData = shallowRef<TGApp.App.NameCard.Item[]>([]);
const curIndex = ref<number>(0);
const total = ref<number>(0);
const visible = ref<boolean>(false);
const search = ref<string>();

onMounted(() => sortData(AppNameCardsData));

function sortData(data: TGApp.App.NameCard.Item[]): void {
  sortNameCardsData.value = data.sort((a, b) => a.type - b.type || a.index - b.index);
  curIndex.value = 0;
  total.value = sortNameCardsData.value.length;
  curNameCard.value = sortNameCardsData.value[curIndex.value];
  showSnackbar.success(`共搜索到 ${sortNameCardsData.value.length} 个结果`);
}

function showNameCard(item: TGApp.App.NameCard.Item): void {
  curNameCard.value = item;
  curIndex.value = sortNameCardsData.value.findIndex((i) => i.name === item.name);
  visible.value = true;
}

function switchCard(isNext: boolean): void {
  if (isNext && curIndex.value === total.value - 1) {
    showSnackbar.warn("已经是最后一个了");
    return;
  }
  if (!isNext && curIndex.value === 0) {
    showSnackbar.warn("已经是第一个了");
    return;
  }
  curIndex.value += isNext ? 1 : -1;
  curNameCard.value = sortNameCardsData.value[curIndex.value];
}

function searchNameCard(): void {
  if (search.value === undefined) {
    sortData(AppNameCardsData);
    return;
  }
  if (search.value === "") {
    if (sortNameCardsData.value.length === AppNameCardsData.length) {
      showSnackbar.warn("请先输入搜索内容");
      return;
    }
    sortData(AppNameCardsData);
    return;
  }
  const searchResult = AppNameCardsData.filter(
    (item) =>
      item.name.includes(search.value!) ||
      item.desc.includes(search.value!) ||
      item.source.includes(search.value!),
  );
  sortData(searchResult);
}
</script>
<style lang="css" scoped>
.tw-nc-box {
  display: flex;
  flex-direction: column;
  row-gap: 10px;
}

.tw-nc-list {
  overflow: auto;
  height: calc(100vh - 100px);
  padding-right: 10px;
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
