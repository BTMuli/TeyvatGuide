<!-- 背包材料页面 -->
<template>
  <v-app-bar>
    <template #prepend>
      <div class="pbm-nav-prepend">
        <img alt="icon" src="/icon/material/121234.webp" />
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
      </div>
    </template>
    <template #append>
      <div class="pbm-nav-append">
        <div class="pbm-nav-search">
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
        <v-btn
          class="pbm-ne-btn"
          prepend-icon="mdi-import"
          variant="elevated"
          @click="tryImportMaterial()"
          title="通过Yae导入（请确保导入前游戏未启动）"
        >
          导入
        </v-btn>
        <v-btn class="pbm-ne-btn" prepend-icon="mdi-plus" variant="elevated" @click="createUid()">
          新建存档
        </v-btn>
        <v-btn class="pbm-ne-btn" prepend-icon="mdi-delete" variant="elevated" @click="deleteUid()">
          删除存档
        </v-btn>
      </div>
    </template>
    <template #extension>
      <div class="pbm-nav-extension">
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
        <v-select
          v-model="curSort"
          :clearable="true"
          :hide-details="true"
          :items="sortList"
          density="compact"
          item-title="text"
          item-value="value"
          label="排序"
          variant="outlined"
          width="160px"
        />
      </div>
    </template>
  </v-app-bar>
  <div class="pbm-container">
    <template v-for="material in materialShow" :key="material.info.id">
      <PbMaterialItem
        :cur="curMaterial"
        :info="material.info"
        :tb="material.tb"
        @select="handleSelect"
      />
    </template>
  </div>
  <PboMaterial
    v-if="curMaterial"
    v-model="showOverlay"
    :data="curMaterial"
    :uid="curUid"
    @updateDB="handleUpdate"
  >
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
  </PboMaterial>
</template>
<script lang="ts" setup>
import showDialog from "@comp/func/dialog.js";
import showLoading from "@comp/func/loading.js";
import showSnackbar from "@comp/func/snackbar.js";
import PbMaterialItem from "@comp/pageBag/pb-materialItem.vue";
import PboMaterial from "@comp/pageBag/pbo-material.vue";
import TSUserBagMaterial, { BAG_TYPE_LIST } from "@Sqlm/userBagMaterial.js";
import useAppStore from "@store/app.js";
import useUserStore from "@store/user.js";
import { tryCallYae } from "@utils/TGGame.js";
import { storeToRefs } from "pinia";
import { nextTick, onMounted, ref, shallowRef, triggerRef, watch } from "vue";

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
  /** 类型 */
  type: string;
  /** 计数 */
  number: number;
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

const curUid = ref<number>(0);
const selectType = ref<string | null>(null);
const search = ref<string>();
const showOverlay = ref<boolean>(false);
const curIdx = ref<number>(0);
const curSort = ref<MaterialSortType | null>(null);
const uidList = shallowRef<Array<number>>([]);
const materialTypes = shallowRef<Array<MaterialType>>([]);
const curMaterial = shallowRef<MaterialInfo>();
const materialList = shallowRef<Array<MaterialInfo>>([]);
const materialShow = shallowRef<Array<MaterialInfo>>([]);

onMounted(async () => {
  await showLoading.start("正在获取存档列表...");
  await reloadUid();
  await showLoading.end();
});

watch(
  () => curUid.value,
  async () => {
    if (showOverlay.value) showOverlay.value = false;
    await loadMaterialList(curUid.value);
  },
);
watch(
  () => [selectType.value, curSort.value],
  async () => {
    if (showOverlay.value) showOverlay.value = false;
    const renderMaterials = getSelectMaterials();
    materialShow.value = sortMaterials(renderMaterials);
    triggerRef(materialShow);
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
  if (!selectType.value) return materialList.value;
  return materialList.value.filter((i) => i.info.type === selectType.value);
}

function sortMaterials(data: Array<MaterialInfo>): Array<MaterialInfo> {
  if (curSort.value === null) {
    return data.sort(
      (a, b) =>
        BAG_TYPE_LIST.indexOf(a.info.type) - BAG_TYPE_LIST.indexOf(b.info.type) ||
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

/**
 * 加载存档数据
 * @param {number} uid 存档UID
 * @returns {Promise<void>}
 */
async function loadMaterialList(uid: number): Promise<void> {
  if (showOverlay.value) showOverlay.value = false;
  await showLoading.start(`正在加载 ${uid} 的材料数据`);
  // 初始化
  materialTypes.value = [];
  materialShow.value = [];
  materialList.value = [];
  selectType.value = null;
  const dList = await TSUserBagMaterial.getMaterial(uid);
  const mList = [];
  const tList: Array<MaterialType> = [];
  for (const material of dList) {
    const info = getItemInfo(material.id);
    if (info === false) continue;
    mList.push({ tb: material, info: info });
    const findT = tList.findIndex((i) => i.type === info.type);
    if (findT !== -1) {
      tList[findT].number += material.count;
    } else {
      tList.push({ type: info.type, number: material.count });
    }
  }
  tList.sort(
    (a, b) =>
      BAG_TYPE_LIST.indexOf(a.type) - BAG_TYPE_LIST.indexOf(b.type) || a.type.localeCompare(b.type),
  );
  materialList.value = sortMaterials(mList);
  materialShow.value = materialList.value;
  materialTypes.value = tList;
  curSort.value = null;
  curIdx.value = 0;
  await showLoading.end();
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
  if (search.value === undefined || search.value === "") {
    if (materialShow.value.length === selectData.length) {
      showSnackbar.warn("请输入搜索内容!");
      return;
    }
    materialShow.value = selectData;
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
  materialShow.value = selectData;
  showSnackbar.success(`找到${selectData.length}条符合条件的材料`);
}

function handleUpdate(info: MaterialInfo): void {
  let find = materialList.value.find((i) => i.info.id === info.info.id);
  if (find !== undefined) {
    find = info;
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
  const uidInput = await showDialog.input("请输入新存档UID", "UID:");
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
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  column-gap: 8px;
}

.pbm-ne-btn {
  height: 40px;
  background: var(--tgc-btn-1);
  color: var(--btn-text);
  font-family: var(--font-title);
}

.pbm-nav-extension {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 4px;
  margin-left: 16px;
  column-gap: 8px;
}

.pbm-container {
  position: relative;
  display: grid;
  width: 100%;
  gap: 8px;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
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
