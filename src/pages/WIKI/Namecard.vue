<template>
  <div class="tw-nc-box">
    <v-text-field
      v-model="search"
      prepend-inner-icon="mdi-magnify"
      label="搜索"
      :hide-details="true"
      variant="outlined"
      @click:prepend-inner="searchNamecard"
      @keyup.enter="searchNamecard"
    />
    <div class="tw-nc-list">
      <v-virtual-scroll :items="sortNameCardsData" :item-height="80">
        <template #default="{ item }">
          <TopNamecard :data="item" @selected="toNameCard" />
          <div style="height: 10px" />
        </template>
      </v-virtual-scroll>
    </div>
  </div>
  <ToNamecard v-model="visible" :data="curNameCard">
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
  </ToNamecard>
</template>
<script lang="ts" setup>
import { onMounted, ref } from "vue";

import showSnackbar from "../../components/func/snackbar.js";
import ToNamecard from "../../components/overlay/to-namecard.vue";
import TopNamecard from "../../components/overlay/top-namecard.vue";
import { AppNameCardsData } from "../../data/index.js";

const curNameCard = ref<TGApp.App.NameCard.Item>();
const sortNameCardsData = ref<TGApp.App.NameCard.Item[]>([]);
const curIndex = ref(0);
const total = ref(0);
const visible = ref(false);
const search = ref("");

onMounted(() => {
  sortData(AppNameCardsData);
});

function sortData(data: TGApp.App.NameCard.Item[]) {
  sortNameCardsData.value = data.sort((a, b) => a.type - b.type || a.index - b.index);
  curIndex.value = 0;
  total.value = sortNameCardsData.value.length;
  curNameCard.value = sortNameCardsData.value[curIndex.value];
  showSnackbar({
    text: `共搜索到 ${sortNameCardsData.value.length} 个结果`,
    color: "success",
  });
}

function toNameCard(item: TGApp.App.NameCard.Item) {
  curNameCard.value = item;
  curIndex.value = sortNameCardsData.value.findIndex((i) => i.name === item.name);
  visible.value = true;
}

function switchCard(isNext: boolean) {
  if (isNext) {
    if (curIndex.value === total.value - 1) {
      showSnackbar({
        text: "已经是最后一个了",
        color: "warn",
      });
      return;
    }
    curIndex.value++;
  } else {
    if (curIndex.value === 0) {
      showSnackbar({
        text: "已经是第一个了",
        color: "warn",
      });
      return;
    }
    curIndex.value--;
  }
  curNameCard.value = sortNameCardsData.value[curIndex.value];
}

function searchNamecard() {
  if (!search.value) {
    sortData(AppNameCardsData);
  } else if (search.value === "") {
    if (sortNameCardsData.value.length === AppNameCardsData.length) {
      showSnackbar({
        text: "请先输入搜索内容",
        color: "warn",
      });
    } else {
      sortData(AppNameCardsData);
    }
  } else {
    const searchResult = AppNameCardsData.filter((item) => {
      return (
        item.name.includes(search.value) ||
        item.desc.includes(search.value) ||
        item.source.includes(search.value)
      );
    });
    sortData(searchResult);
  }
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
