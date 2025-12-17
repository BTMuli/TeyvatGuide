<!-- 背包材料页面 -->
<template>
  <!-- TODO: 顶部栏，参考材料WIKI页面 -->
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
    <template v-if="false" #extension>
      <div v-if="false" class="pbm-nav-append">
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
    <template #append>
      <div class="pbm-nav-extension">
        <v-btn class="pbm-ne-btn" prepend-icon="mdi-import" @click="tryCallYae()">导入</v-btn>
        <v-btn class="pbm-ne-btn" prepend-icon="mdi-plus" @click="createUid()">新建存档</v-btn>
        <v-btn class="pbm-ne-btn" prepend-icon="mdi-delete" @click="deleteUid()">删除存档</v-btn>
      </div>
    </template>
  </v-app-bar>
  <div class="pbm-container">
    <template v-for="material in materialShow" :key="`${curUid}-${material.info.id}`">
      <PbMaterialItem
        :info="material.info"
        :tb="material.tb"
        @select="handleSelect"
        :cur="curMaterial"
      />
    </template>
  </div>
  <PboMaterial
    v-if="curMaterial"
    v-model="showOverlay"
    :data="curMaterial"
    :uid="`${curUid}`"
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
import TSUserBagMaterial from "@Sqlm/userBagMaterial.js";
import useAppStore from "@store/app.js";
import { path } from "@tauri-apps/api";
import { invoke } from "@tauri-apps/api/core";
import { exists } from "@tauri-apps/plugin-fs";
import { platform } from "@tauri-apps/plugin-os";
import TGLogger from "@utils/TGLogger.js";
import { storeToRefs } from "pinia";
import { nextTick, onMounted, ref, shallowRef, triggerRef, watch } from "vue";

import { WikiMaterialData } from "@/data/index.js";

/** 材料类型 */
type MaterialType = {
  /** 类型 */
  type: string;
  /** 计数 */
  number: number;
};
/** 材料信息 */
export type MaterialInfo = {
  /** 数据库数据 */
  tb: TGApp.Sqlite.UserBag.TableMaterial;
  /** WIKI 数据 */
  info: TGApp.App.Material.WikiItem;
};

const { gameDir } = storeToRefs(useAppStore());

const curUid = ref<number>(0);
const selectType = ref<string | null>(null);
const search = ref<string>();
const showOverlay = ref<boolean>(false);
const curIdx = ref<number>(0);
const uidList = shallowRef<Array<number>>([]);
const materialTypes = shallowRef<Array<MaterialType>>([]);
const curMaterial = shallowRef<MaterialInfo>();
const materialList = shallowRef<Array<MaterialInfo>>([]);
const materialShow = shallowRef<Array<MaterialInfo>>([]);

onMounted(async () => {
  await showLoading.start("正在获取存档列表...");
  uidList.value = await TSUserBagMaterial.getAllUid();
  await showLoading.update(`存档数：${uidList.value.length}`);
  // TODO: 如果用户已登录，优先当前登录UID
  if (uidList.value.length > 0) curUid.value = uidList.value[0];
  else await showLoading.end();
});

watch(
  () => curUid.value,
  async () => {
    if (showOverlay.value) showOverlay.value = false;
    await loadMaterialList(curUid.value);
  },
);
watch(
  () => selectType.value,
  async () => {
    if (showOverlay.value) showOverlay.value = false;
    if (!selectType.value) {
      materialShow.value = materialList.value;
    } else {
      materialShow.value = materialList.value.filter((i) => i.info.type === selectType.value);
    }
    curIdx.value = 0;
  },
);

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
  materialList.value = mList;
  materialShow.value = mList;
  materialTypes.value = tList;
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
  //TODO:搜索材料
}

function handleUpdate(info: MaterialInfo): void {
  let find = materialList.value.find((i) => i.info.id === info.info.id);
  if (find !== undefined) {
    find = info;
    curMaterial.value = info;
    triggerRef(materialList);
  }
}

/**
 * 尝试导入材料(通过Yae)
 */
async function tryCallYae(): Promise<void> {
  if (platform() !== "windows") {
    showSnackbar.warn("该功能仅支持Windows系统");
    return;
  }
  if (gameDir.value === "未设置") {
    showSnackbar.warn("请前往设置页面设置游戏安装目录");
    return;
  }
  const gamePath = `${gameDir.value}${path.sep()}YuanShen.exe`;
  if (!(await exists(gamePath))) {
    showSnackbar.warn("未检测到原神本体应用！");
    return;
  }
  // 判断是否是管理员权限
  let isAdmin = false;
  try {
    isAdmin = await invoke<boolean>("is_in_admin");
  } catch (err) {
    showSnackbar.error(`检测管理员权限失败：${err}`);
    await TGLogger.Error(`[pageAchi][toYae]检测管理员权限失败:${err}`);
    return;
  }
  if (!isAdmin) {
    const check = await showDialog.check("是否以管理员模式重启？", "该功能需要管理员权限才能使用");
    if (!check) {
      showSnackbar.cancel("已取消以管理员模式重启");
      return;
    }
    try {
      await invoke("run_with_admin");
    } catch (err) {
      showSnackbar.error(`以管理员模式重启失败：${err}`);
      await TGLogger.Error(`[pageAchi][toYae]以管理员模式启动失败 - ${err}`);
      return;
    }
  }
  const input = await showDialog.input("请输入存档UID", "UID:", curUid.value?.toString());
  if (!input) {
    showSnackbar.cancel("已取消存档导入");
    return;
  }
  if (input === "" || isNaN(Number(input))) {
    showSnackbar.warn("请输入合法数字");
    return;
  }
  try {
    await invoke("call_yae_dll", { gamePath: gamePath, uid: input.toString() });
  } catch (err) {
    showSnackbar.error(`调用Yae DLL失败: ${err}`);
    await TGLogger.Error(`[pageAchi][toYae]调用Yae DLL失败: ${err}`);
    return;
  }
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
  uidList.value = uidList.value.filter((e) => e !== curUid.value);
  if (uidList.value.length === 0) uidList.value = [0];
  curUid.value = uidList.value[0];
  showSnackbar.success(`已删除对应存档，即将刷新`);
  await new Promise<void>((resolve) => setTimeout(resolve, 1000));
  window.location.reload();
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

.pbm-nav-append {
  position: relative;
  width: 240px;
  margin-right: 8px;
}

.pbm-nav-extension {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
  column-gap: 8px;
}

.pbm-ne-btn {
  height: 40px;
  border: 1px solid var(--common-shadow-2);
  background: var(--tgc-btn-1);
  color: var(--btn-text);
  font-family: var(--font-title);
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
