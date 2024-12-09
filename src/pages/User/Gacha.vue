<template>
  <div class="gacha-top-bar">
    <div class="gacha-top-title">
      <img src="/source/UI/userGacha.webp" alt="gacha" />
      <span>祈愿记录</span>
    </div>
    <v-select v-model="uidCur" class="gacha-top-select" :items="selectItem" variant="outlined" />
    <div class="gacha-top-btns">
      <v-btn prepend-icon="mdi-refresh" class="gacha-top-btn" @click="confirmRefresh(false)">
        增量刷新
      </v-btn>
      <v-btn prepend-icon="mdi-refresh" class="gacha-top-btn" @click="confirmRefresh(true)">
        全量刷新
      </v-btn>
      <v-btn prepend-icon="mdi-import" class="gacha-top-btn" @click="importUigf()">导入</v-btn>
      <v-btn prepend-icon="mdi-import" class="gacha-top-btn" @click="importUigf4()">
        导入(v4)
      </v-btn>
      <v-btn prepend-icon="mdi-export" class="gacha-top-btn" @click="exportUigf()">导出</v-btn>
      <v-btn prepend-icon="mdi-export" class="gacha-top-btn" @click="exportUigf4()">
        导出(v4)
      </v-btn>
      <v-btn prepend-icon="mdi-delete" class="gacha-top-btn" @click="deleteGacha()">删除</v-btn>
    </div>
  </div>
  <div class="gacha-container">
    <v-tabs v-model="tab" align-tabs="start" class="gacha-tab">
      <v-tab value="overview">数据概览</v-tab>
      <v-tab value="echarts">图表概览</v-tab>
      <v-tab value="table">数据表格</v-tab>
      <v-tab value="history">过往祈愿</v-tab>
    </v-tabs>
    <v-window v-model="tab" class="gacha-window">
      <v-window-item value="overview" class="gacha-window-item">
        <gro-overview v-model="gachaListCur" />
      </v-window-item>
      <v-window-item value="echarts" class="gacha-window-item">
        <gro-echarts v-model="gachaListCur" />
      </v-window-item>
      <v-window-item value="table" class="gacha-window-item">
        <gro-table v-model="gachaListCur" />
      </v-window-item>
      <v-window-item value="history" class="gacha-window-item">
        <gro-history />
      </v-window-item>
    </v-window>
  </div>
  <UgoUid v-model="ovShow" :mode="ovMode" />
</template>
<script lang="ts" setup>
import { path } from "@tauri-apps/api";
import { open, save } from "@tauri-apps/plugin-dialog";
import { storeToRefs } from "pinia";
import { computed, onMounted, ref, watch } from "vue";

import showDialog from "../../components/func/dialog.js";
import showLoading from "../../components/func/loading.js";
import showSnackbar from "../../components/func/snackbar.js";
import GroEcharts from "../../components/userGacha/gro-echarts.vue";
import GroHistory from "../../components/userGacha/gro-history.vue";
import GroOverview from "../../components/userGacha/gro-overview.vue";
import GroTable from "../../components/userGacha/gro-table.vue";
import UgoUid from "../../components/userGacha/ugo-uid.vue";
import { AppCharacterData, AppWeaponData } from "../../data/index.js";
import TSUserGacha from "../../plugins/Sqlite/modules/userGacha.js";
import { useUserStore } from "../../store/modules/user.js";
import TGLogger from "../../utils/TGLogger.js";
import { exportUigfData, readUigfData, verifyUigfData } from "../../utils/UIGF.js";
import Hk4eApi from "../../web/request/hk4eReq.js";
import TakumiApi from "../../web/request/takumiReq.js";

// store
const userStore = storeToRefs(useUserStore());
const account = computed<TGApp.Sqlite.Account.Game>(() => userStore.account.value);
const authkey = ref<string>("");

// data
const selectItem = ref<string[]>([]);
const uidCur = ref<string>();
const gachaListCur = ref<TGApp.Sqlite.GachaRecords.SingleTable[]>([]);
const tab = ref<string>("overview");

// overlay
const ovShow = ref<boolean>(false);
const ovMode = ref<"export" | "import">("import");

// 监听 UID 变化
watch(
  () => uidCur.value,
  async (newUid) => {
    if (!newUid) return;
    gachaListCur.value = await TSUserGacha.getGachaRecords(newUid);
    showSnackbar.success(`成功获取 ${gachaListCur.value.length} 条祈愿数据`);
    await TGLogger.Info(
      `[UserGacha][${newUid}][watch] 成功获取 ${gachaListCur.value.length} 条祈愿数据`,
    );
  },
);

onMounted(async () => {
  showLoading.start("正在加载祈愿数据...", "正在获取祈愿 UID 列表");
  await TGLogger.Info("[UserGacha][onMounted] 进入角色祈愿页面");
  selectItem.value = await TSUserGacha.getUidList();
  if (selectItem.value.length === 0) {
    showLoading.end();
    showSnackbar.error("暂无祈愿数据，请先导入祈愿数据");
    await TGLogger.Warn("[UserGacha][onMounted] 暂无祈愿数据，请先导入祈愿数据");
    return;
  }
  uidCur.value = selectItem.value[0];
  showLoading.update("正在获取祈愿数据...", `UID：${uidCur.value}`);
  gachaListCur.value = await TSUserGacha.getGachaRecords(uidCur.value);
  await TGLogger.Info(
    `[UserGacha][onMounted] 获取到 ${uidCur.value} 的 ${gachaListCur.value.length} 条祈愿数据`,
  );
  showLoading.end();
  showSnackbar.success(`成功获取 ${gachaListCur.value.length} 条祈愿数据`);
});

// 刷新按钮点击事件
async function confirmRefresh(force: boolean): Promise<void> {
  await TGLogger.Info(`[UserGacha][${account.value.gameUid}][confirmRefresh] 刷新祈愿数据`);
  if (uidCur.value && uidCur.value !== account.value.gameUid) {
    const switchCheck = await showDialog.check(
      "是否切换游戏账户",
      `确认则尝试切换至 ${uidCur.value}`,
    );
    if (switchCheck) {
      await useUserStore().switchGameAccount(uidCur.value);
      await confirmRefresh(force);
      return;
    }
    const freshCheck = await showDialog.check(
      "确定刷新?",
      `用户${account.value.gameUid}与当前UID${uidCur.value}不一致`,
    );
    if (!freshCheck) {
      showSnackbar.cancel("已取消祈愿数据刷新");
      return;
    }
  }
  showLoading.start("正在刷新祈愿数据", "正在获取 authkey");
  if (!userStore.cookie.value) {
    showLoading.end();
    showSnackbar.error("请先登录");
    await TGLogger.Warn("[UserGacha][${account.gameUid}][confirmRefresh] 未检测到 cookie");
    return;
  }
  const authkeyRes = await TakumiApi.bind.authKey(userStore.cookie.value, account.value);
  if (typeof authkeyRes === "string") {
    authkey.value = authkeyRes;
    await TGLogger.Info(`[UserGacha][${account.value.gameUid}][confirmRefresh] 成功获取 authkey`);
  } else {
    showSnackbar.error("获取 authkey 失败");
    await TGLogger.Error(`[UserGacha][${account.value.gameUid}][confirmRefresh] 获取 authkey 失败`);
    await TGLogger.Error(
      `[UserGacha][${account.value.gameUid}][confirmRefresh] ${authkeyRes.retcode} ${authkeyRes.message}`,
    );
    showLoading.end();
    return;
  }
  await refreshGachaPool("100", "新手祈愿", force);
  await refreshGachaPool("200", "常驻祈愿", force);
  await refreshGachaPool("301", "角色祈愿", force);
  await refreshGachaPool("400", "角色祈愿2", force);
  await refreshGachaPool("302", "武器祈愿", force);
  await refreshGachaPool("500", "集录祈愿", force);
  showLoading.update("正在刷新祈愿数据", "数据获取完成，即将刷新页面");
  showLoading.end();
  await TGLogger.Info(`[UserGacha][${account.value.gameUid}][confirmRefresh] 刷新祈愿数据完成`);
  window.location.reload();
}

// 刷新单个池子
async function refreshGachaPool(
  type: string,
  label: string,
  force: boolean = false,
): Promise<void> {
  let endId = "0";
  // 全量刷新时时间与id的对应关系
  let gachaDataMap: Record<string, string[]> | undefined = undefined;
  if (!force) {
    showLoading.update(`正在刷新${label}数据`, "正在获取数据库祈愿最新 ID");
    endId = (await TSUserGacha.getGachaCheck(account.value.gameUid, type)) ?? "0";
    showLoading.update(`正在刷新${label}数据`, `最新 ID：${endId}`);
  } else {
    showLoading.update(`正在刷新${label}数据`);
  }
  while (true) {
    const gachaRes = await Hk4eApi.gacha(authkey.value, type, endId);
    if (!Array.isArray(gachaRes)) {
      showSnackbar.error(`[${type}][${gachaRes.retcode}] ${gachaRes.message}`);
      await TGLogger.Error(
        `[UserGacha][${account.value.gameUid}][refreshGachaPool] 获取祈愿数据失败`,
      );
      await TGLogger.Error(
        `[UserGacha][${account.value.gameUid}][refreshGachaPool] ${gachaRes.retcode} ${gachaRes.message}`,
      );
      break;
    }
    if (gachaRes.length === 0) {
      if (force) {
        showLoading.update(`正在清理${label}数据`);
        if (gachaDataMap)
          await TSUserGacha.cleanGachaRecords(account.value.gameUid, type, gachaDataMap);
      }
      break;
    }
    const uigfList: TGApp.Plugins.UIGF.GachaItem[] = [];
    for (const item of gachaRes) {
      showLoading.update(`正在刷新${label}数据`, `[${item.item_type}][${item.time}] ${item.name}`);
      const tempItem: TGApp.Plugins.UIGF.GachaItem = {
        gacha_type: item.gacha_type,
        item_id: item.item_id,
        count: item.count,
        time: item.time,
        name: item.name,
        item_type: item.item_type,
        rank_type: item.rank_type,
        id: item.id,
        uigf_gacha_type: item.gacha_type === "400" ? "301" : item.gacha_type,
      };
      if (item.item_type === "角色") {
        const find = AppCharacterData.find((char) => char.name === item.name);
        if (find) tempItem.item_id = find.id.toString();
      } else if (item.item_type === "武器") {
        const find = AppWeaponData.find((weapon) => weapon.name === item.name);
        if (find) tempItem.item_id = find.id.toString();
      }
      uigfList.push(tempItem);
      if (force) {
        if (!gachaDataMap) gachaDataMap = {};
        if (!gachaDataMap[item.time]) gachaDataMap[item.time] = [];
        gachaDataMap[item.time].push(item.id);
      }
    }
    await TSUserGacha.mergeUIGF(account.value.gameUid, uigfList);
    endId = gachaRes[gachaRes.length - 1].id;
    await new Promise<void>((resolve) => setTimeout(() => resolve(), 1000));
  }
}

// 导入 v4 版本的祈愿数据
async function importUigf4(): Promise<void> {
  ovMode.value = "import";
  ovShow.value = true;
}

async function importUigf(): Promise<void> {
  await TGLogger.Info(`[UserGacha][handleImportBtn] 导入祈愿数据`);
  const selectedFile = await open({
    multiple: false,
    title: "导入UIGF文件",
    filters: [{ name: "UIGF JSON", extensions: ["json"] }],
    defaultPath: await path.downloadDir(),
    directory: false,
  });
  if (selectedFile === null) {
    showSnackbar.cancel("已取消文件选择");
    return;
  }
  const check = await verifyUigfData(selectedFile, false);
  if (!check) return;
  const remoteData = await readUigfData(selectedFile);
  const importCheck = await showDialog.check(
    "是否导入祈愿数据？",
    `UID：${remoteData.info.uid}，共 ${remoteData.list.length} 条数据`,
  );
  if (!importCheck) {
    showSnackbar.cancel("已取消祈愿数据导入");
    return;
  }
  showLoading.start("正在导入祈愿数据");
  if (remoteData.list.length === 0) {
    showLoading.end();
    showSnackbar.error("导入的祈愿数据为空");
    return;
  }
  showLoading.update("正在导入祈愿数据", `UID：${remoteData.info.uid}`);
  await TSUserGacha.mergeUIGF(remoteData.info.uid, remoteData.list);
  showLoading.end();
  showSnackbar.success(`成功导入 ${remoteData.list.length} 条祈愿数据`);
  await TGLogger.Info(
    `[UserGacha][importUigf] 成功导入 ${remoteData.info.uid} 的 ${remoteData.list.length} 条祈愿数据`,
  );
  setTimeout(() => window.location.reload(), 1000);
}

// 导出当前UID的祈愿数据
async function exportUigf(): Promise<void> {
  if (!uidCur.value) return;
  await TGLogger.Info(`[UserGacha][${uidCur.value}][exportUigf] 导出祈愿数据`);
  const gachaList = await TSUserGacha.getGachaRecords(uidCur.value);
  if (gachaList.length === 0) {
    showSnackbar.error(`UID ${uidCur.value} 暂无祈愿数据`);
    return;
  }
  const exportCheck = await showDialog.check(
    "是否导出祈愿数据？",
    `UID：${uidCur.value}，共 ${gachaList.length} 条数据`,
  );
  if (!exportCheck) {
    showSnackbar.cancel(`已取消 UID ${uidCur.value} 的祈愿数据导出`);
    return;
  }
  const file = await save({
    title: "导出祈愿数据",
    filters: [{ name: "UIGF JSON", extensions: ["json"] }],
    defaultPath: `${await path.downloadDir()}${path.sep()}UIGF_${uidCur.value}.json`,
  });
  if (!file) {
    showSnackbar.cancel("已取消文件保存");
    return;
  }
  await TGLogger.Info(
    `[UserGacha][${uidCur.value}][exportUigf] 导出${gachaList.length} 条祈愿数据到 ${file}`,
  );
  showLoading.start("正在导出祈愿数据", `正在导出 ${uidCur.value} 的祈愿数据`);
  await exportUigfData(uidCur.value, gachaList, file);
  showLoading.end();
  showSnackbar.success(`成功导出 ${uidCur.value} 的祈愿数据`);
  await TGLogger.Info(`[UserGacha][${uidCur.value}][exportUigf] 导出祈愿数据完成`);
}

// 导出 UIGF v4 版本的祈愿数据
async function exportUigf4(): Promise<void> {
  if (!uidCur.value) {
    showSnackbar.error("未获取到 UID");
    return;
  }
  await TGLogger.Info(`[UserGacha][${uidCur.value}][exportUigf4] 导出祈愿数据(v4)`);
  ovMode.value = "export";
  ovShow.value = true;
}

// 删除当前 UID 的祈愿数据
async function deleteGacha(): Promise<void> {
  if (gachaListCur.value.length === 0 || !uidCur.value) {
    showSnackbar.error("暂无祈愿数据");
    return;
  }
  await TGLogger.Info(`[UserGacha][${uidCur.value}][deleteGacha] 删除祈愿数据`);
  const delCheck = await showDialog.check(
    "确定删除祈愿数据？",
    `UID：${uidCur.value}，共 ${gachaListCur.value.length} 条数据`,
  );
  if (!delCheck) {
    showSnackbar.cancel("已取消祈愿数据删除");
    await TGLogger.Info(`[UserGacha][${uidCur.value}][deleteGacha] 已取消祈愿数据删除`);
    return;
  }
  const uidList = await TSUserGacha.getUidList();
  if (uidList.length <= 1) {
    const forceCheck = await showDialog.check("删除后数据库将为空，确定删除？");
    if (!forceCheck) {
      showSnackbar.cancel("已取消祈愿数据删除");
      return;
    }
  }
  showLoading.start("正在删除祈愿数据", `正在删除${uidCur.value}的祈愿数据`);
  await TSUserGacha.deleteGachaRecords(uidCur.value);
  showLoading.end();
  showSnackbar.success(`已成功删除 ${uidCur.value} 的祈愿数据`);
  await TGLogger.Info(
    `[UserGacha][${uidCur.value}][deleteGacha] 成功删除 ${gachaListCur.value.length} 条祈愿数据`,
  );
  setTimeout(() => window.location.reload(), 1000);
}
</script>
<style lang="css" scoped>
.gacha-top-bar {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  padding: 10px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 5px;
  margin-bottom: 10px;
  background: var(--box-bg-1);
  column-gap: 50px;
  font-family: var(--font-title);
  font-size: 20px;
}

.gacha-top-title {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px;
  gap: 10px;

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

.gacha-top-select {
  height: 60px;
}

.gacha-top-btns {
  display: flex;
  column-gap: 10px;
}

.gacha-top-btn {
  border-radius: 5px;
  background: var(--tgc-btn-1);
  color: var(--btn-text);
}

.gacha-container {
  display: flex;
  height: calc(100vh - 130px);
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  border: 1px solid var(--common-shadow-1);
  border-radius: 5px;
  background: var(--box-bg-1);
}

.gacha-tab {
  height: 50px;
  color: var(--box-text-4);
  font-family: var(--font-title);
}

.gacha-window {
  width: 100%;
  height: 100%;
  padding: 10px;
}

.gacha-window-item {
  height: 100%;
  border-radius: 5px;
}
</style>
