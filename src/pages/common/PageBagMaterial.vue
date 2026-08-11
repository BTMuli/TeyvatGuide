<!-- 背包材料页面 -->
<template>
  <v-app-bar>
    <template #prepend>
      <div class="pbm-nav-prepend">
        <img alt="icon" src="/UI/nav/userBag.webp" />
        <span>背包材料</span>
        <v-select
          v-model="curUid"
          :hide-details="true"
          :items="uidList"
          density="compact"
          label="存档UID"
          variant="outlined"
          width="200px"
        />
        <v-select
          v-model="curSort"
          :clearable="true"
          :hide-details="true"
          :items="sortList"
          class="pbm-sort-select"
          density="compact"
          item-title="text"
          item-value="value"
          label="排序"
          variant="outlined"
          width="160px"
        />
      </div>
    </template>
    <template #append>
      <div class="pbm-nav-append">
        <v-checkbox
          v-model="searchAll"
          :hide-details="true"
          class="pbm-search-all"
          density="compact"
          label="搜索全部"
        />
        <v-checkbox
          v-model="hideZero"
          :hide-details="true"
          class="pbm-hide-zero"
          density="compact"
          label="隐藏0数据"
        />
        <div class="pbm-nav-search">
          <v-text-field
            v-model="search"
            :clearable="true"
            :hide-details="true"
            append-inner-icon="mdi-magnify"
            density="compact"
            label="搜索"
            variant="outlined"
            @keydown.enter="searchMaterial()"
            @click:append-inner="searchMaterial()"
          />
        </div>
        <v-btn
          aria-label="导入材料"
          class="pbm-icon-btn"
          icon="mdi-import"
          title="通过Yae导入（请确保导入前游戏未启动）"
          variant="elevated"
          @click="tryImportMaterial()"
        />
        <v-btn
          aria-label="新建存档"
          class="pbm-icon-btn"
          icon="mdi-plus"
          title="新建存档"
          variant="elevated"
          @click="createUid()"
        />
        <v-btn
          aria-label="删除存档"
          class="pbm-icon-btn"
          icon="mdi-delete"
          title="删除存档"
          variant="elevated"
          @click="deleteUid()"
        />
      </div>
    </template>
    <template #extension>
      <div class="pbm-nav-extension">
        <v-tabs
          v-model="selectType"
          align-tabs="start"
          class="pbm-tabs"
          density="compact"
          show-arrows
        >
          <v-tab v-if="searchAll" :value="ALL_MATERIAL_TYPE" title="全部材料"> 全部 </v-tab>
          <v-tab
            v-for="item in materialTypes"
            :key="item.cType"
            :title="item.cType"
            :value="item.cType"
          >
            {{ item.cType }}
          </v-tab>
        </v-tabs>
      </div>
    </template>
  </v-app-bar>
  <div class="pbm-container">
    <template v-for="material in visibleMaterials" :key="material.info.id">
      <PbMaterialItem
        :cur="curMaterial"
        :info="material.info"
        :tb="material.tb"
        @select="handleSelect"
      />
    </template>
    <div v-if="hasMoreMaterials" ref="loadMoreRef" class="pbm-load-trigger" />
  </div>
  <PboMaterial
    v-if="curMaterial"
    v-model="showOverlay"
    :data="curMaterial"
    :uid="curUid"
    topOffset="112px"
    @update-db="handleUpdate"
  >
    <template #left>
      <v-btn
        aria-label="上一个背包物品"
        class="card-arrow"
        icon="mdi-chevron-left"
        title="上一个背包物品"
        variant="flat"
        @click="switchMaterial(false)"
      />
    </template>
    <template #right>
      <v-btn
        aria-label="下一个背包物品"
        class="card-arrow"
        icon="mdi-chevron-right"
        title="下一个背包物品"
        variant="flat"
        @click="switchMaterial(true)"
      />
    </template>
  </PboMaterial>
</template>
<script lang="ts" setup>
import showDialog from "@comp/func/dialog.js";
import showLoading from "@comp/func/loading.js";
import showSnackbar from "@comp/func/snackbar.js";
import PbMaterialItem from "@comp/pageBag/pb-materialItem.vue";
import PboMaterial from "@comp/pageBag/pbo-material.vue";
import TSUserBagMaterial, { getBagTypeOrder, SKIP_BAG_TYPES } from "@Sqlm/userBagMaterial.js";
import useAppStore from "@store/app.js";
import useUserStore from "@store/user.js";
import { tryCallYae } from "@utils/TGGame.js";
import { storeToRefs } from "pinia";
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  shallowRef,
  triggerRef,
  useTemplateRef,
  watch,
} from "vue";

import { WikiMaterialData } from "@/data/index.js";

/**
 * 材料排序类型枚举
 */
enum MaterialSortType {
  /** 最近更新 */
  Latest,
  /** 最多数量 */
  MaxCount,
  /** 最少数量 */
  MinCount,
}

/** 材料类型 */
type MaterialType = {
  /** 归并类型 */
  cType: string;
};
/** 材料排序 */
type MaterialSort = {
  /** 文本 */
  text: string;
  /** 值 */
  value: MaterialSortType;
};
/** 材料信息 */
export type MaterialInfo = {
  /** 数据库数据 */
  tb: TGApp.Sqlite.UserBag.MaterialTable;
  /** WIKI 数据 */
  info: TGApp.App.Material.WikiItem;
};

const { gameDir, isLogin } = storeToRefs(useAppStore());
const { account } = storeToRefs(useUserStore());

const sortList: Array<MaterialSort> = [
  { text: "最近更新", value: MaterialSortType.Latest },
  { text: "最多数量", value: MaterialSortType.MaxCount },
  { text: "最少数量", value: MaterialSortType.MinCount },
];

const ALL_MATERIAL_TYPE = "all";
const DEFAULT_MATERIAL_TYPE = "默认";
const MATERIAL_RENDER_SIZE: Readonly<number> = 100;

const curUid = ref<number>(0);
const selectType = ref<string>(DEFAULT_MATERIAL_TYPE);
const lastMaterialType = ref<string>(DEFAULT_MATERIAL_TYPE);
const search = ref<string>();
const searchAll = ref<boolean>(false);
const hideZero = ref<boolean>(false);
const showOverlay = ref<boolean>(false);
const curIdx = ref<number>(0);
const curSort = ref<MaterialSortType | null>(null);
const uidList = shallowRef<Array<number>>([]);
const materialTypes = shallowRef<Array<MaterialType>>([]);
const curMaterial = shallowRef<MaterialInfo>();
const materialList = shallowRef<Array<MaterialInfo>>([]);
const materialShow = shallowRef<Array<MaterialInfo>>([]);
const renderedCount = ref<number>(MATERIAL_RENDER_SIZE);
const loadMoreRef = useTemplateRef<HTMLElement>("loadMoreRef");
let materialLoadVersion = 0;
let loadMoreObserver: IntersectionObserver | undefined;

const visibleMaterials = computed<Array<MaterialInfo>>(() =>
  materialShow.value.slice(0, renderedCount.value),
);
const hasMoreMaterials = computed<boolean>(() => renderedCount.value < materialShow.value.length);

onMounted(async () => {
  initLoadMoreObserver();
  await showLoading.start("正在获取存档列表...");
  await reloadUid();
  await showLoading.end();
});

onBeforeUnmount(() => {
  loadMoreObserver?.disconnect();
});

watch(
  () => curUid.value,
  async () => {
    const requestVersion = ++materialLoadVersion;
    if (showOverlay.value) showOverlay.value = false;
    await loadMaterialList(curUid.value, requestVersion);
  },
);
watch(
  () => selectType.value,
  (type) => {
    if (type !== ALL_MATERIAL_TYPE) {
      lastMaterialType.value = type;
      if (searchAll.value) searchAll.value = false;
    }
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
watch(
  () => [selectType.value, curSort.value, hideZero.value],
  () => {
    if (showOverlay.value) showOverlay.value = false;
    updateMaterialShow();
    curIdx.value = 0;
  },
);

async function reloadUid(): Promise<void> {
  uidList.value = await TSUserBagMaterial.getAllUid();
  if (uidList.value.includes(Number(account.value.gameUid))) {
    curUid.value = Number(account.value.gameUid);
  } else if (uidList.value.length > 0) curUid.value = uidList.value[0];
  else if (isLogin.value) {
    uidList.value = [Number(account.value.gameUid)];
    curUid.value = Number(account.value.gameUid);
  } else curUid.value = 0;
}

/**
 * 获取对应类别下的材料列表
 * @return {Array<MaterialInfo>}
 */
function getSelectMaterials(): Array<MaterialInfo> {
  const data =
    selectType.value === ALL_MATERIAL_TYPE
      ? materialList.value
      : materialList.value.filter((i) => i.info.cType === selectType.value);
  return data.filter(
    (item) => !SKIP_BAG_TYPES.includes(item.info.type) && (!hideZero.value || item.tb.count !== 0),
  );
}

function sortMaterials(data: Array<MaterialInfo>): Array<MaterialInfo> {
  if (curSort.value === null) {
    return data.sort(
      (a, b) =>
        getBagTypeOrder(a.info.type) - getBagTypeOrder(b.info.type) ||
        a.info.type.localeCompare(b.info.type) ||
        b.info.star - a.info.star ||
        a.info.id - b.info.id,
    );
  }
  switch (curSort.value) {
    case MaterialSortType.Latest:
      return data.sort((a, b) => b.tb.updated.localeCompare(a.tb.updated));
    case MaterialSortType.MaxCount:
      return data.sort((a, b) => b.tb.count - a.tb.count);
    case MaterialSortType.MinCount:
      return data.sort((a, b) => a.tb.count - b.tb.count);
  }
}

function updateMaterialShow(data: Array<MaterialInfo> = getSelectMaterials()): void {
  materialShow.value = sortMaterials(data);
  triggerRef(materialShow);
  resetRenderedMaterials();
}

/**
 * 加载存档数据
 * @param {number} uid 存档UID
 * @returns {Promise<void>}
 */
async function loadMaterialList(uid: number, requestVersion: number): Promise<void> {
  if (showOverlay.value) showOverlay.value = false;
  await showLoading.start(`正在加载 ${uid} 的材料数据`);
  if (requestVersion !== materialLoadVersion) return;
  // 初始化
  materialTypes.value = [];
  materialShow.value = [];
  materialList.value = [];
  searchAll.value = false;
  lastMaterialType.value = DEFAULT_MATERIAL_TYPE;
  selectType.value = DEFAULT_MATERIAL_TYPE;
  const dList = await TSUserBagMaterial.getMaterial(uid);
  if (requestVersion !== materialLoadVersion) return;
  const mList = [];
  const tList: Array<MaterialType> = [];
  for (const material of dList) {
    const info = getItemInfo(material.id);
    if (info === false || SKIP_BAG_TYPES.includes(info.type)) continue;
    mList.push({ tb: material, info: info });
    const findT = tList.findIndex((i) => i.cType === info.cType);
    if (findT === -1) tList.push({ cType: info.cType });
  }
  tList.sort((a, b) => compareMaterialTypes(a.cType, b.cType));
  curSort.value = null;
  materialList.value = mList;
  materialTypes.value = tList;
  updateMaterialShow();
  curIdx.value = 0;
  await showLoading.end();
}

function compareMaterialTypes(a: string, b: string): number {
  return getMaterialTypeOrder(a) - getMaterialTypeOrder(b) || a.localeCompare(b);
}

function getMaterialTypeOrder(type: string): number {
  return type === DEFAULT_MATERIAL_TYPE ? 0 : 1;
}

/**
 * 获取材料信息
 * @param {number} id 材料ID
 * @returns {TGApp.App.Material.WikiItem|false}
 */
function getItemInfo(id: number): TGApp.App.Material.WikiItem | false {
  const find = WikiMaterialData.find((i) => i.id.toString() === id.toString());
  if (find) return find;
  return false;
}

function searchMaterial(): void {
  let selectData = getSelectMaterials();
  if (search.value === undefined || search.value === "" || search.value === null) {
    if (materialShow.value.length === selectData.length) {
      showSnackbar.warn("请输入搜索内容!");
      return;
    }
    updateMaterialShow(selectData);
    showSnackbar.success("已重置!");
    return;
  }
  // 正则
  const overReg = /^>(\d+)$/;
  const lessReg = /^<(\d+)$/;
  if (overReg.test(search.value.trim())) {
    const overNum = Number(search.value.trim().match(overReg)?.[1] ?? 0);
    selectData = selectData.filter((i) => i.tb.count > overNum);
  } else if (lessReg.test(search.value.trim())) {
    const lessNum = Number(search.value.trim().match(lessReg)?.[1] ?? 0);
    selectData = selectData.filter((i) => i.tb.count < lessNum);
  } else {
    selectData = selectData.filter(
      (i) => i.info.name.includes(search.value!) || i.info.description.includes(search.value!),
    );
  }
  if (selectData.length === 0) {
    showSnackbar.warn("未找到符合条件的材料!");
    return;
  }
  updateMaterialShow(selectData);
  showSnackbar.success(`找到${selectData.length}条符合条件的材料`);
}

function resetRenderedMaterials(): void {
  renderedCount.value = Math.min(MATERIAL_RENDER_SIZE, materialShow.value.length);
  nextTick(() => observeLoadMore());
}

function loadMoreMaterials(): void {
  if (!hasMoreMaterials.value) return;
  renderedCount.value = Math.min(
    renderedCount.value + MATERIAL_RENDER_SIZE,
    materialShow.value.length,
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

function handleUpdate(info: MaterialInfo): void {
  const find = materialList.value.find((i) => i.info.id === info.info.id);
  if (find !== undefined) {
    Object.assign(find, info);
    curMaterial.value = info;
  }
}

async function tryImportMaterial(): Promise<void> {
  await tryCallYae(gameDir.value, curUid.value.toString());
}

/**
 * 新建存档
 */
async function createUid(): Promise<void> {
  let uidDefault: string = "";
  if (account.value && !uidList.value.includes(Number(account.value.gameUid))) {
    uidDefault = account.value.gameUid;
  }
  const uidInput = await showDialog.input("请输入新存档UID", "UID:", uidDefault);
  if (uidInput === undefined || uidInput === false) {
    showSnackbar.cancel("已取消");
    return;
  }
  if (isNaN(Number(uidInput))) {
    showSnackbar.warn("请输入合法数字");
    return;
  }
  if (uidList.value.includes(Number(uidInput))) {
    showSnackbar.warn("该存档已存在！");
    return;
  }
  uidList.value.push(Number(uidInput));
  curUid.value = Number(uidInput);
  showSnackbar.success(`切换到新存档 ${Number(uidInput)}`);
}

/**
 * 删除当前存档
 */
async function deleteUid(): Promise<void> {
  if (!curUid.value) {
    showSnackbar.warn("未检测到存档数据!");
    return;
  }
  const delCheck = await showDialog.check(
    "确定删除该存档?",
    `确认则清空存档-${curUid.value}对应数据`,
  );
  if (!delCheck) {
    showSnackbar.cancel("已取消删除存档");
    return;
  }
  await TSUserBagMaterial.delUid(curUid.value);
  await reloadUid();
  showSnackbar.success(`已删除对应存档，即将刷新`);
}

/**
 * 处理材料点击事件
 */
async function handleSelect(material: MaterialInfo): Promise<void> {
  curMaterial.value = material;
  await nextTick();
  curIdx.value = materialShow.value.findIndex((i) => i.tb.id === material.info.id);
  showOverlay.value = true;
}

/**
 * 切换材料
 */
function switchMaterial(isNext: boolean): void {
  if (isNext) {
    if (curIdx.value === materialShow.value.length - 1) return;
    curIdx.value++;
  } else {
    if (curIdx.value === 0) return;
    curIdx.value--;
  }
  curMaterial.value = materialShow.value[curIdx.value];
}
</script>
<style lang="scss" scoped>
.pbm-nav-prepend {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 8px;
  gap: 8px;

  img {
    width: 32px;
    height: 32px;
  }

  span {
    color: var(--common-text-title);
    font-family: var(--font-title);
    font-size: 20px;
  }
}

.pbm-nav-search {
  position: relative;
  width: 240px;
  margin-right: 8px;
}

.pbm-nav-append {
  position: relative;
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  column-gap: 8px;
}

.pbm-search-all,
.pbm-hide-zero {
  flex: none;
}

.pbm-icon-btn {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  background: var(--tgc-btn-1);
  color: var(--btn-text);
}

.pbm-nav-extension {
  position: relative;
  display: flex;
  width: 100%;
  min-width: 0;
  align-items: center;
  justify-content: flex-start;
  margin-bottom: 4px;
  margin-left: 16px;
  column-gap: 8px;
}

.pbm-tabs {
  min-width: 0;
  flex: 1;
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-weight: normal;
}

.pbm-sort-select {
  flex: 0 0 160px;
}

.pbm-container {
  position: relative;
  display: grid;
  width: 100%;
  gap: 8px;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
}

.pbm-load-trigger {
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
