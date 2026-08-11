<!-- 材料WIKI -->
<template>
  <v-app-bar>
    <template #prepend>
      <div class="twm-top-prepend">
        <div class="twm-tp-title">
          <img alt="icon" src="/UI/nav/wikiGCG.webp" />
          <span>材料图鉴</span>
        </div>
        <div class="twm-load-status">
          <span class="twm-load-count">
            已显示 <strong>{{ visibleMaterials.length }}</strong> / {{ sortMaterialsData.length }}
          </span>
          <v-progress-linear
            :color="hasMoreMaterials ? 'var(--tgc-od-blue)' : 'var(--tgc-od-green)'"
            :model-value="
              sortMaterialsData.length
                ? (visibleMaterials.length / sortMaterialsData.length) * 100
                : 0
            "
            :rounded="true"
            bg-color="var(--tgc-od-white)"
            class="twm-load-progress"
            height="4"
          />
          <span class="twm-load-hint">
            {{
              hasMoreMaterials
                ? "继续滚动加载"
                : sortMaterialsData.length
                  ? "已全部显示"
                  : "暂无数据"
            }}
          </span>
        </div>
      </div>
    </template>
    <template #append>
      <div class="twm-top-append">
        <v-text-field
          v-model="search"
          :clearable="true"
          :hide-details="true"
          append-inner-icon="mdi-magnify"
          class="twm-search-input"
          density="compact"
          label="搜索"
          variant="outlined"
          @keydown.enter="searchMaterial()"
          @click:append-inner="searchMaterial()"
        />
        <v-checkbox
          v-model="searchAll"
          :hide-details="true"
          class="twm-search-all"
          density="compact"
          label="搜索全部"
        />
      </div>
    </template>
    <template #extension>
      <v-tabs
        v-model="selectType"
        align-tabs="start"
        class="twm-tabs"
        density="compact"
        show-arrows
      >
        <v-tab v-if="searchAll" :value="ALL_MATERIAL_TYPE" title="全部材料">
          全部
          <span class="twm-tab-count">{{ allMaterialCount }}</span>
        </v-tab>
        <v-tab
          v-for="item in materialTypes"
          :key="item.cType"
          :title="item.cType"
          :value="item.cType"
        >
          {{ item.cType }}
          <span class="twm-tab-count">{{ item.number }}</span>
        </v-tab>
      </v-tabs>
    </template>
  </v-app-bar>
  <div class="twm-box">
    <PwMaterialItem
      v-for="material in visibleMaterials"
      :key="material.id"
      :material
      class="twm-item"
      @click="toMaterial(material)"
    />
    <div v-if="hasMoreMaterials" ref="loadMoreRef" class="twm-load-trigger" />
  </div>
  <TwoMaterial
    v-if="curMaterial"
    v-model="visible"
    :data="curMaterial"
    eyebrow="材料图鉴"
    topOffset="112px"
  >
    <template #left>
      <v-btn
        aria-label="上一个材料"
        class="card-arrow"
        icon="mdi-chevron-left"
        title="上一个材料"
        variant="flat"
        @click="switchMaterial(false)"
      />
    </template>
    <template #right>
      <v-btn
        aria-label="下一个材料"
        class="card-arrow"
        icon="mdi-chevron-right"
        title="下一个材料"
        variant="flat"
        @click="switchMaterial(true)"
      />
    </template>
  </TwoMaterial>
</template>
<script lang="ts" setup>
import showSnackbar from "@comp/func/snackbar.js";
import PwMaterialItem from "@comp/pageWiki/pw-material-item.vue";
import TwoMaterial from "@comp/pageWiki/two-material.vue";
import { getBagTypeOrder } from "@Sqlm/userBagMaterial.js";
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  shallowRef,
  useTemplateRef,
  watch,
} from "vue";

import { WikiMaterialData } from "@/data/index.js";

type MaterialType = { cType: string; number: number };

const ALL_MATERIAL_TYPE = "all";
const DEFAULT_MATERIAL_TYPE = "默认";
const MATERIAL_RENDER_SIZE: Readonly<number> = 100;
const allMaterialCount: number = WikiMaterialData.length;

const curIndex = ref<number>(0);
const visible = ref<boolean>(false);
const search = ref<string>();
const searchAll = ref<boolean>(false);
const selectType = ref<string>(DEFAULT_MATERIAL_TYPE);
const lastMaterialType = ref<string>(DEFAULT_MATERIAL_TYPE);
const materialTypes = shallowRef<Array<MaterialType>>([]);
const curMaterial = shallowRef<TGApp.App.Material.WikiItem | undefined>();
const sortMaterialsData = shallowRef<Array<TGApp.App.Material.WikiItem>>([]);
const renderedCount = ref<number>(MATERIAL_RENDER_SIZE);
const loadMoreRef = useTemplateRef<HTMLElement>("loadMoreRef");
let loadMoreObserver: IntersectionObserver | undefined;

const visibleMaterials = computed<Array<TGApp.App.Material.WikiItem>>(() =>
  sortMaterialsData.value.slice(0, renderedCount.value),
);
const hasMoreMaterials = computed<boolean>(
  () => renderedCount.value < sortMaterialsData.value.length,
);

onMounted(() => {
  const tmpData: Array<MaterialType> = [];
  for (const item of WikiMaterialData) {
    const typeFindIndex = tmpData.findIndex((itemT) => itemT.cType === item.cType);
    if (typeFindIndex === -1) {
      const itemN: MaterialType = { cType: item.cType, number: 1 };
      tmpData.push(itemN);
      continue;
    }
    tmpData[typeFindIndex].number++;
  }
  tmpData.sort((a, b) => compareMaterialTypes(a.cType, b.cType));
  materialTypes.value = tmpData;
  initLoadMoreObserver();
  sortData(getSelectMaterials());
  showSnackbar.success(`成功获取${sortMaterialsData.value.length}条数据`);
});

onBeforeUnmount(() => {
  loadMoreObserver?.disconnect();
});

watch(
  () => selectType.value,
  (type) => {
    if (type !== ALL_MATERIAL_TYPE) {
      lastMaterialType.value = type;
      if (searchAll.value) searchAll.value = false;
    }
    sortData(getSelectMaterials());
  },
);

watch(
  () => searchAll.value,
  (isSearchAll) => {
    if (isSearchAll) {
      if (selectType.value !== ALL_MATERIAL_TYPE) lastMaterialType.value = selectType.value;
      selectType.value = ALL_MATERIAL_TYPE;
    } else if (selectType.value === ALL_MATERIAL_TYPE) {
      selectType.value = lastMaterialType.value;
    }
  },
);

function getSelectMaterials(): Array<TGApp.App.Material.WikiItem> {
  if (selectType.value === ALL_MATERIAL_TYPE) return WikiMaterialData;
  return WikiMaterialData.filter((item) => item.cType === selectType.value);
}

function sortData(data: Array<TGApp.App.Material.WikiItem>): void {
  sortMaterialsData.value = [...data].sort(
    (a, b) => getBagTypeOrder(a.type) - getBagTypeOrder(b.type) || b.star - a.star || a.id - b.id,
  );
  curIndex.value = 0;
  curMaterial.value = sortMaterialsData.value[curIndex.value];
  resetRenderedMaterials();
}

function compareMaterialTypes(a: string, b: string): number {
  return getMaterialTypeOrder(a) - getMaterialTypeOrder(b) || a.localeCompare(b);
}

function getMaterialTypeOrder(type: string): number {
  return type === DEFAULT_MATERIAL_TYPE ? 0 : 1;
}

function toMaterial(item: TGApp.App.Material.WikiItem): void {
  curMaterial.value = item;
  curIndex.value = sortMaterialsData.value.findIndex((i) => i.id === item.id);
  visible.value = true;
}

function switchMaterial(isNext: boolean): void {
  if (isNext) {
    if (curIndex.value === sortMaterialsData.value.length - 1) return;
    curIndex.value++;
  } else {
    if (curIndex.value === 0) return;
    curIndex.value--;
  }
  curMaterial.value = sortMaterialsData.value[curIndex.value];
}

function searchMaterial(): void {
  let selectData = searchAll.value ? WikiMaterialData : getSelectMaterials();
  const keyword = search.value?.trim() ?? "";
  if (keyword === "") {
    if (sortMaterialsData.value.length === selectData.length) {
      showSnackbar.warn("请输入搜索内容!");
      return;
    }
    sortData(selectData);
    showSnackbar.success("已重置!");
    return;
  }
  selectData = selectData.filter(
    (i) => i.name.includes(keyword) || i.description.includes(keyword),
  );
  if (selectData.length === 0) {
    showSnackbar.warn("未找到符合条件的材料!");
    return;
  }
  sortData(selectData);
  showSnackbar.success(`找到${selectData.length}条符合条件的材料`);
}

function resetRenderedMaterials(): void {
  renderedCount.value = Math.min(MATERIAL_RENDER_SIZE, sortMaterialsData.value.length);
  nextTick(() => observeLoadMore());
}

function loadMoreMaterials(): void {
  if (!hasMoreMaterials.value) return;
  renderedCount.value = Math.min(
    renderedCount.value + MATERIAL_RENDER_SIZE,
    sortMaterialsData.value.length,
  );
}

function initLoadMoreObserver(): void {
  loadMoreObserver = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) loadMoreMaterials();
    },
    { rootMargin: "360px" },
  );
  observeLoadMore();
}

function observeLoadMore(): void {
  if (!loadMoreObserver || !loadMoreRef.value) return;
  loadMoreObserver.disconnect();
  loadMoreObserver.observe(loadMoreRef.value);
}
</script>
<style lang="scss" scoped>
@use "@styles/github.styles.scss" as github-styles;

.twm-top-prepend {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  margin-left: 16px;
  column-gap: 16px;
}

.twm-tp-title {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--common-text-title);
  column-gap: 4px;
  font-family: var(--font-title);
  font-size: 20px;
  white-space: nowrap;

  img {
    width: 32px;
    height: 32px;
    object-fit: cover;
  }
}

.twm-top-append {
  position: relative;
  display: flex;
  width: 600px;
  align-items: center;
  margin-right: 16px;
  gap: 8px;
}

.twm-search-input {
  min-width: 0;
  flex: 1;
}

.twm-search-all {
  flex: none;
}

.twm-tabs {
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  padding: 0 16px;
  color: var(--common-text-title);
  font-family: var(--font-title);
}

.twm-tab-count {
  @include github-styles.github-tag-dark-gen(#e06c75);

  display: inline-flex;
  box-sizing: border-box;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
  border-radius: 16px;
  margin-bottom: 8px;
  margin-left: 2px;
  font-family: var(--font-text);
  font-size: 10px;
  line-height: 12px;
}

.twm-load-status {
  display: flex;
  min-width: 260px;
  flex: 0 1 320px;
  align-items: center;
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 12px;
  gap: 12px;
}

.twm-load-count,
.twm-load-hint {
  flex: none;
  white-space: nowrap;
}

.twm-load-count strong {
  color: rgb(var(--v-theme-primary));
  font-size: 14px;
}

.twm-load-progress {
  min-width: 48px;
  flex: 1;
}

.twm-load-hint {
  color: var(--common-text-secondary);
}

.twm-box {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(auto-fill, minmax(200px, 0.25fr));
}

.twm-item {
  cursor: pointer;
}

.twm-load-trigger {
  width: 100%;
  height: 1px;
  grid-column: 1 / -1;
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
