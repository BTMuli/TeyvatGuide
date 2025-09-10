<template>
  <v-app-bar>
    <template #prepend>
      <div class="wnc-top-prepend">
        <div class="title">
          <v-icon size="32">mdi-credit-card-outline</v-icon>
          <span>名片图鉴</span>
        </div>
        <v-select
          v-model="selectType"
          :items="namecardTypes"
          item-title="type"
          :hide-details="true"
          :clearable="true"
          width="250px"
          label="名片类别"
          density="compact"
          variant="outlined"
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
      <div class="wnc-top-append">
        <v-text-field
          v-model="search"
          density="compact"
          prepend-inner-icon="mdi-magnify"
          label="搜索"
          :hide-details="true"
          variant="outlined"
          @click:prepend-inner="searchNameCard()"
          @keyup.enter="searchNameCard()"
        />
      </div>
    </template>
  </v-app-bar>
  <div class="tw-nc-list">
    <v-virtual-scroll class="v-scroll" :items="sortNameCardsData" :item-height="80" item-key="id">
      <template #default="{ item }">
        <TopNameCard :data="item" @selected="showNameCard(item)" />
      </template>
    </v-virtual-scroll>
  </div>
  <ToNameCard v-model="visible" :data="curNameCard">
    <template #left>
      <div class="card-arrow left" @click="switchCard(false)">
        <img src="@/assets/icons/arrow-right.svg" alt="right" />
      </div>
    </template>
    <template #right>
      <div class="card-arrow" @click="switchCard(true)">
        <img src="@/assets/icons/arrow-right.svg" alt="right" />
      </div>
    </template>
  </ToNameCard>
</template>
<script lang="ts" setup>
import ToNameCard from "@comp/app/to-nameCard.vue";
import TopNameCard from "@comp/app/top-nameCard.vue";
import showSnackbar from "@comp/func/snackbar.js";
import { onMounted, ref, shallowRef, watch } from "vue";

import { AppNameCardsData } from "@/data/index.js";

type NameCardType = { type: string; number: number };

const curIndex = ref<number>(0);
const total = ref<number>(0);
const visible = ref<boolean>(false);
const search = ref<string>();
const selectType = ref<string | null>(null);
const namecardTypes = shallowRef<Array<NameCardType>>([]);
const curNameCard = shallowRef<TGApp.App.NameCard.Item>();
const sortNameCardsData = shallowRef<Array<TGApp.App.NameCard.Item>>([]);

onMounted(() => {
  const tmpData: Array<NameCardType> = [];
  for (const item of AppNameCardsData) {
    const typeFindIndex = tmpData.findIndex((itemT) => itemT.type === item.type);
    if (typeFindIndex === -1) {
      const itemN: NameCardType = { type: item.type, number: 1 };
      tmpData.push(itemN);
      continue;
    }
    tmpData[typeFindIndex].number++;
  }
  namecardTypes.value = tmpData;
  sortData(AppNameCardsData);
  showSnackbar.success(`成功获取${sortNameCardsData.value.length}条数据`);
});

watch(
  () => selectType.value,
  () => sortData(getSelectNameCards()),
);

function getSelectNameCards(): TGApp.App.NameCard.Item[] {
  if (selectType.value === null) return AppNameCardsData;
  else return AppNameCardsData.filter((item) => item.type === selectType.value);
}

function sortData(data: TGApp.App.NameCard.Item[]): void {
  sortNameCardsData.value = data.sort((a, b) => a.type.localeCompare(b.type) || a.id - b.id);
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
.wnc-top-prepend {
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
  }
}

.wnc-top-append {
  position: relative;
  width: 600px;
  margin-right: 16px;
}

.tw-nc-list {
  position: relative;
  display: flex;
  overflow: auto;
  height: calc(100vh - 100px);
  flex-direction: column;
  row-gap: 10px;

  .v-scroll {
    padding-right: 8px;
  }
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
