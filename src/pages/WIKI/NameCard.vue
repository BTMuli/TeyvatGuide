<template>
  <v-app-bar>
    <template #prepend>
      <div class="wnc-top-prepend">
        <div class="title">
          <v-icon size="32">mdi-credit-card-outline</v-icon>
          <span>名片图鉴</span>
        </div>
        <v-btn-toggle
          v-model="selectType"
          :mandatory="true"
          aria-label="切换名片类别"
          class="wnc-type-toggle"
          color="var(--tgc-od-orange)"
          density="compact"
          variant="outlined"
        >
          <v-btn :value="null" size="small" title="显示全部名片">
            全部
            <span class="wnc-type-count">{{ AppNameCardsData.length }}</span>
          </v-btn>
          <v-btn
            v-for="item in namecardTypes"
            :key="item.type"
            :title="`显示${item.type}类名片`"
            :value="item.type"
            size="small"
          >
            {{ item.type }}
            <span class="wnc-type-count">{{ item.number }}</span>
          </v-btn>
        </v-btn-toggle>
      </div>
    </template>
    <template #append>
      <div class="wnc-top-append">
        <v-text-field
          v-model="search"
          :clearable="true"
          :hide-details="true"
          append-inner-icon="mdi-magnify"
          density="compact"
          label="搜索"
          variant="outlined"
          @click:append-inner="searchNameCard()"
          @keyup.enter="searchNameCard()"
        />
      </div>
    </template>
  </v-app-bar>
  <div class="tw-nc-list">
    <v-virtual-scroll :item-height="80" :items="sortNameCardsData" class="v-scroll" item-key="id">
      <template #default="{ item }">
        <TopNameCard :data="item" class="item" @selected="showNameCard(item)" />
      </template>
    </v-virtual-scroll>
  </div>
  <ToNameCard v-model="visible" :data="curNameCard" topOffset="64px">
    <template #left>
      <v-btn
        aria-label="上一张名片"
        class="card-arrow"
        icon="mdi-chevron-left"
        title="上一张名片"
        variant="flat"
        @click="switchCard(false)"
      />
    </template>
    <template #right>
      <v-btn
        aria-label="下一张名片"
        class="card-arrow"
        icon="mdi-chevron-right"
        title="下一张名片"
        variant="flat"
        @click="switchCard(true)"
      />
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

function getSelectNameCards(): Array<TGApp.App.NameCard.Item> {
  if (selectType.value === null) return AppNameCardsData;
  else return AppNameCardsData.filter((item) => item.type === selectType.value);
}

function sortData(data: Array<TGApp.App.NameCard.Item>): void {
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
  if (search.value === undefined || search.value === null) {
    sortData(AppNameCardsData);
    showSnackbar.success("已重置");
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
  width: clamp(240px, 32vw, 600px);
  margin-right: 16px;
}

.wnc-type-toggle {
  height: 40px;
  flex-shrink: 0;
  border-radius: 4px;
}

.wnc-type-count {
  margin-left: 4px;
  font-size: 10px;
  font-variant-numeric: tabular-nums;
  opacity: 0.72;
}

.tw-nc-list {
  position: relative;
  display: flex;
  overflow: auto;
  height: calc(100vh - 100px);
  flex-direction: column;
  row-gap: 10px;

  .v-scroll {
    .item {
      margin-bottom: 8px;
    }
  }
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
