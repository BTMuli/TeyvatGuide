<template>
  <ToLoading v-model="loading" :title="loadingTitle" :subtitle="loadingSub" />
  <div class="gacha-top-bar">
    <div class="gacha-top-title">祈愿记录</div>
    <v-select v-model="uidCur" class="gacha-top-select" :items="selectItem" variant="outlined" />
    <div class="gacha-top-btns">
      <v-btn prepend-icon="mdi-refresh" class="gacha-top-btn" @click="confirmRefresh"
        >增量刷新
      </v-btn>
      <v-btn prepend-icon="mdi-refresh" class="gacha-top-btn" @click="confirmRefresh(true)"
        >全量刷新
      </v-btn>
      <v-btn prepend-icon="mdi-import" class="gacha-top-btn" @click="handleImportBtn(false)"
        >导入
      </v-btn>
      <v-btn prepend-icon="mdi-import" class="gacha-top-btn" @click="handleImportBtn(true)"
        >导入(v4)
      </v-btn>
      <v-btn prepend-icon="mdi-export" class="gacha-top-btn" @click="exportUigf()">导出</v-btn>
      <v-btn prepend-icon="mdi-export" class="gacha-top-btn" @click="exportUigf4()"
        >导出(v4)
      </v-btn>
      <v-btn prepend-icon="mdi-delete" class="gacha-top-btn" @click="deleteGacha()">删除</v-btn>
    </div>
  </div>
  <div class="gacha-container">
    <v-tabs v-model="tab" align-tabs="start" class="gacha-tab">
      <v-tab value="echarts">图表概览</v-tab>
      <v-tab value="overview">数据概览</v-tab>
      <v-tab value="history">过往祈愿</v-tab>
    </v-tabs>
    <v-window v-model="tab" class="gacha-window">
      <v-window-item value="echarts" class="gacha-window-item">
        <gro-echarts v-model="gachaListCur" />
      </v-window-item>
      <v-window-item value="overview" class="gacha-window-item">
        <gro-overview v-model="gachaListCur" />
      </v-window-item>
      <v-window-item value="history" class="gacha-window-item">
        <gro-history />
      </v-window-item>
    </v-window>
  </div>
</template>
<script lang="ts" setup>
import { path } from "@tauri-apps/api";
import { open, save } from "@tauri-apps/plugin-dialog";
import { storeToRefs } from "pinia";
import { onMounted, ref, watch } from "vue";

import showConfirm from "../../components/func/confirm.js";
import showSnackbar from "../../components/func/snackbar.js";
import GroEcharts from "../../components/gachaRecord/gro-echarts.vue";
import GroHistory from "../../components/gachaRecord/gro-history.vue";
import GroOverview from "../../components/gachaRecord/gro-overview.vue";
import ToLoading from "../../components/overlay/to-loading.vue";
import { AppCharacterData, AppWeaponData } from "../../data/index.js";
import TSUserGacha from "../../plugins/Sqlite/modules/userGacha.js";
import { useUserStore } from "../../store/modules/user.js";
import TGLogger from "../../utils/TGLogger.js";
import {
  exportUigfData,
  readUigf4Data,
  readUigfData,
  verifyUigfData,
  exportUigf4Data,
} from "../../utils/UIGF.js";
import TGRequest from "../../web/request/TGRequest.js";

// store
const userStore = storeToRefs(useUserStore());
const account = userStore.account.value;
const authkey = ref<string>("");

// loading
const loading = ref<boolean>(true);
const loadingTitle = ref<string>();
const loadingSub = ref<string>();

// data
const selectItem = ref<string[]>([]);
const uidCur = ref<string>("");
const gachaListCur = ref<TGApp.Sqlite.GachaRecords.SingleTable[]>([]);
const tab = ref<string>("");

onMounted(async () => {
  await TGLogger.Info("[UserGacha][onMounted] 进入角色祈愿页面");
  loadingTitle.value = "正在获取祈愿 UID 列表";
  selectItem.value = await TSUserGacha.getUidList();
  if (selectItem.value.length === 0) {
    showSnackbar({
      color: "error",
      text: "暂无祈愿数据，请先导入祈愿数据",
    });
    loading.value = false;
    await TGLogger.Warn("[UserGacha][onMounted] 暂无祈愿数据，请先导入祈愿数据");
    return;
  }
  uidCur.value = selectItem.value[0];
  loadingTitle.value = `正在获取祈愿数据，默认 UID：${uidCur.value}`;
  gachaListCur.value = await TSUserGacha.getGachaRecords(uidCur.value);
  await TGLogger.Info(
    `[UserGacha][onMounted] 获取到 ${uidCur.value} 的 ${gachaListCur.value.length} 条祈愿数据`,
  );
  loadingTitle.value = "正在渲染数据";
  tab.value = "echarts";
  loading.value = false;
  showSnackbar({
    text: `成功获取 ${gachaListCur.value.length} 条祈愿数据`,
  });
});

// 刷新按钮点击事件
async function confirmRefresh(force: boolean = false): Promise<void> {
  await TGLogger.Info(`[UserGacha][${account.gameUid}][confirmRefresh] 刷新祈愿数据`);
  const confirmRes = await showConfirm({
    title: "是否刷新祈愿数据？",
    text: `将刷新 UID：${account.gameUid} 的祈愿数据`,
  });
  if (!confirmRes) {
    showSnackbar({
      color: "cancel",
      text: "已取消刷新祈愿数据",
    });
    await TGLogger.Warn("[UserGacha][${account.gameUid}][confirmRefresh] 已取消刷新祈愿数据");
    return;
  }
  loadingTitle.value = "正在获取 authkey";
  loading.value = true;
  if (!userStore.cookie.value) {
    showSnackbar({
      color: "error",
      text: "请先登录",
    });
    loading.value = false;
    await TGLogger.Warn("[UserGacha][${account.gameUid}][confirmRefresh] 未检测到 cookie");
    return;
  }
  const cookie = {
    stoken: userStore.cookie.value.stoken,
    mid: userStore.cookie.value.mid,
  };
  const gameUid = account.gameUid;
  const authkeyRes = await TGRequest.User.getAuthkey(cookie, gameUid);
  if (typeof authkeyRes === "string") {
    authkey.value = authkeyRes;
    await TGLogger.Info(`[UserGacha][${account.gameUid}][confirmRefresh] 成功获取 authkey`);
  } else {
    showSnackbar({
      color: "error",
      text: "获取 authkey 失败",
    });
    await TGLogger.Error(`[UserGacha][${account.gameUid}][confirmRefresh] 获取 authkey 失败`);
    await TGLogger.Error(
      `[UserGacha][${account.gameUid}][confirmRefresh] ${authkeyRes.retcode} ${authkeyRes.message}`,
    );
    loading.value = false;
    return;
  }
  let checkList: Array<string | undefined> = [
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
  ];
  if (force) {
    loadingTitle.value = "正在获取数据库祈愿最新 ID";
    checkList[0] = await TSUserGacha.getGachaCheck(account.gameUid, "200");
    checkList[1] = await TSUserGacha.getGachaCheck(account.gameUid, "301");
    checkList[2] = await TSUserGacha.getGachaCheck(account.gameUid, "400");
    checkList[3] = await TSUserGacha.getGachaCheck(account.gameUid, "302");
    checkList[4] = await TSUserGacha.getGachaCheck(account.gameUid, "500");
  }
  console.log(checkList);
  loadingTitle.value = "正在刷新新手祈愿数据";
  await getGachaLogs("100", "0", undefined);
  loadingTitle.value = "正在刷新常驻祈愿数据";
  await getGachaLogs("200", "0", checkList[0]);
  loadingTitle.value = "正在刷新角色祈愿数据";
  await getGachaLogs("301", "0", checkList[1]);
  loadingTitle.value = "正在刷新角色祈愿2数据";
  await getGachaLogs("400", "0", checkList[2]);
  loadingTitle.value = "正在刷新武器祈愿数据";
  await getGachaLogs("302", "0", checkList[3]);
  loadingTitle.value = "正在刷新集录祈愿数据";
  await getGachaLogs("500", "0", checkList[4]);
  loadingTitle.value = "数据获取完成，即将刷新页面";
  loadingSub.value = "";
  loading.value = false;
  await new Promise((resolve) => {
    setTimeout(() => {
      resolve("");
    }, 1000);
  });
  await TGLogger.Info(`[UserGacha][${account.gameUid}][confirmRefresh] 刷新祈愿数据完成`);
  window.location.reload();
}

// 获取祈愿数据并写入数据库，不用考虑多语言，因为从api获取的数据是中文
async function getGachaLogs(
  pool: string,
  endId: string = "0",
  check: string | undefined,
): Promise<void> {
  await TGLogger.Info(
    `[UserGacha][${account.gameUid}][getGachaLogs] 获取祈愿数据，pool：${pool}，endId：${endId}`,
  );
  const gachaRes = await TGRequest.User.getGachaLog(authkey.value, pool, endId);
  console.log(pool, endId, gachaRes);
  if (Array.isArray(gachaRes)) {
    await TGLogger.Info(
      `[UserGacha][${account.gameUid}][getGachaLogs] 成功获取到 ${gachaRes.length} 条祈愿数据`,
    );
    if (gachaRes.length === 0) {
      await new Promise((resolve) => {
        setTimeout(() => {
          resolve("");
        }, 1000);
      });
      return;
    }
    const uigfList: TGApp.Plugins.UIGF.GachaItem[] = [];
    gachaRes.forEach((item) => {
      loadingSub.value = `[${item.item_type}][${item.time}] ${item.name}`;
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
    });
    await TSUserGacha.mergeUIGF(account.gameUid, uigfList);
    if (check !== undefined && gachaRes.some((i) => i.id === check)) {
      await new Promise((resolve) => {
        setTimeout(() => {
          resolve("");
        }, 1000);
      });
      return;
    }
    if (gachaRes.length === 20) {
      await new Promise((resolve) => {
        setTimeout(() => {
          resolve("");
        }, 1000);
      });
      await getGachaLogs(pool, gachaRes[gachaRes.length - 1].id, check);
    }
  } else {
    showSnackbar({
      color: "error",
      text: `[${pool}][${gachaRes.retcode}] ${gachaRes.message}`,
    });
    await TGLogger.Error(`[UserGacha][${account.gameUid}][getGachaLogs] 获取祈愿数据失败`);
    await TGLogger.Error(
      `[UserGacha][${account.gameUid}][getGachaLogs] ${gachaRes.retcode} ${gachaRes.message}`,
    );
  }
}

// 导入按钮点击事件
async function handleImportBtn(isV4: boolean): Promise<void> {
  if (isV4) {
    const checkConfirm = await showConfirm({
      title: "确定导入UIGFv4格式的祈愿数据？",
      text: "该标准尚在制定完善当中，可能会有不兼容的情况",
    });
    if (!checkConfirm) {
      showSnackbar({
        color: "cancel",
        text: "已取消 UIGF v4 格式导入",
      });
      return;
    }
    await TGLogger.Info("[UserGacha][handleImportBtn] 导入祈愿数据(v4)");
  } else {
    await TGLogger.Info("[UserGacha][handleImportBtn] 导入祈愿数据");
  }
  const selectedFile = await open({
    multiple: false,
    title: "选择要导入的祈愿数据文件",
    filters: [
      {
        name: "UIGF JSON",
        extensions: ["json"],
      },
    ],
    defaultPath: await path.downloadDir(),
    directory: false,
  });
  if (!selectedFile) {
    showSnackbar({
      color: "cancel",
      text: "已取消文件选择",
    });
    return;
  }
  const check = await verifyUigfData(selectedFile.path, isV4);
  if (!check) return;
  if (isV4) {
    await importUigf4(selectedFile.path);
  } else {
    await importUigf(selectedFile.path);
  }
}

// 导入 v4 版本的祈愿数据
async function importUigf4(filePath: string): Promise<void> {
  const remoteData = await readUigf4Data(filePath);
  const uidCount = remoteData.hk4e.length;
  const dataCount = remoteData.hk4e.reduce((acc, cur) => acc + cur.list.length, 0);
  const res = await showConfirm({
    title: "是否导入祈愿数据？",
    text: `共 ${uidCount} 个 UID，${dataCount} 条数据`,
  });
  if (!res) {
    showSnackbar({
      color: "cancel",
      text: "已取消祈愿数据导入",
    });
    return;
  }
  loadingTitle.value = "正在导入祈愿数据(v4)";
  loading.value = true;
  for (const account of remoteData.hk4e) {
    loadingSub.value = `正在导入 ${account.uid} 的祈愿数据`;
    await TSUserGacha.mergeUIGF4(account);
  }
  loading.value = false;
  showSnackbar({
    text: `成功导入 ${uidCount} 个 UID 的 ${dataCount} 条祈愿数据`,
  });
  await TGLogger.Info(
    `[UserGacha][importUigf4] 成功导入 ${uidCount} 个 UID，${dataCount} 条祈愿数据`,
  );
  setTimeout(() => {
    window.location.reload();
  }, 1000);
}

async function importUigf(filePath: string): Promise<void> {
  const remoteData = await readUigfData(filePath);
  const confirm = await showConfirm({
    title: "是否导入祈愿数据？",
    text: `UID：${remoteData.info.uid}，共 ${remoteData.list.length} 条数据`,
  });
  if (!confirm) {
    showSnackbar({
      color: "cancel",
      text: "已取消祈愿数据导入",
    });
    return;
  }
  loadingTitle.value = "正在导入祈愿数据";
  loading.value = true;
  if (remoteData.list.length === 0) {
    loading.value = false;
    showSnackbar({
      color: "error",
      text: "导入的祈愿数据为空",
    });
    return;
  }
  await TSUserGacha.mergeUIGF(remoteData.info.uid, remoteData.list);
  loading.value = false;
  showSnackbar({
    text: `成功导入 ${remoteData.list.length} 条祈愿数据`,
  });
  await TGLogger.Info(
    `[UserGacha][importUigf] 成功导入 ${remoteData.info.uid} 的 ${remoteData.list.length} 条祈愿数据`,
  );
  setTimeout(() => {
    window.location.reload();
  }, 1000);
}

// 导出当前UID的祈愿数据
async function exportUigf(): Promise<void> {
  await TGLogger.Info(`[UserGacha][${uidCur.value}][exportUigf] 导出祈愿数据`);
  const gachaList = await TSUserGacha.getGachaRecords(uidCur.value);
  if (gachaList.length === 0) {
    showSnackbar({
      color: "error",
      text: `UID ${uidCur.value} 暂无祈愿数据`,
    });
    return;
  }
  const res = showConfirm({
    title: "是否导出祈愿数据？",
    text: `UID：${uidCur.value}，共 ${gachaList.length} 条数据`,
  });
  if (!res) {
    showSnackbar({
      color: "cancel",
      text: `已取消 UID ${uidCur.value} 的祈愿数据导出`,
    });
    return;
  }
  const file = await save({
    title: "选择导出祈愿数据的文件路径",
    filters: [
      {
        name: "UIGF JSON",
        extensions: ["json"],
      },
    ],
    defaultPath: `${await path.downloadDir()}${path.sep()}UIGF_${uidCur.value}.json`,
  });
  if (!file) {
    showSnackbar({
      color: "cancel",
      text: "已取消文件保存",
    });
    return;
  }
  await TGLogger.Info(
    `[UserGacha][${uidCur.value}][exportUigf] 导出${gachaList.length} 条祈愿数据到 ${file}`,
  );
  loadingTitle.value = `正在导出 ${uidCur.value} 的祈愿数据`;
  loading.value = true;
  await exportUigfData(uidCur.value, gachaList, file);
  loading.value = false;
  showSnackbar({ text: `成功导出 ${uidCur.value} 的祈愿数据` });
  await TGLogger.Info(`[UserGacha][${uidCur.value}][exportUigf] 导出祈愿数据完成`);
}

// 导出 UIGF v4 版本的祈愿数据
async function exportUigf4(): Promise<void> {
  const checkConfirm = await showConfirm({
    title: "确定导出UIGFv4格式的祈愿数据？",
    text: "该标准尚在制定完善当中，可能会有不兼容的情况",
  });
  if (!checkConfirm) {
    showSnackbar({
      color: "cancel",
      text: "已取消 UIGF v4 格式导出",
    });
    return;
  }
  await TGLogger.Info(`[UserGacha][${uidCur.value}][exportUigf4] 导出祈愿数据(v4)`);
  const allConfirm = await showConfirm({
    title: "是否导出所有 UID 的祈愿数据？",
    text: "取消则只导出当前 UID 的祈愿数据",
  });
  if (allConfirm === undefined) {
    showSnackbar({
      color: "cancel",
      text: "已取消祈愿数据导出",
    });
    return;
  }
  if (allConfirm === false) {
    const gachaList = await TSUserGacha.getGachaRecords(uidCur.value);
    if (gachaList.length === 0) {
      showSnackbar({
        color: "error",
        text: `UID ${uidCur.value} 暂无祈愿数据`,
      });
      return;
    }
  }
  const file = await save({
    title: "选择导出祈愿数据的文件路径",
    filters: [
      {
        name: "UIGF JSON",
        extensions: ["json"],
      },
    ],
    defaultPath: `${await path.downloadDir()}${path.sep()}UIGF4.json`,
  });
  if (!file) {
    showSnackbar({
      color: "cancel",
      text: "已取消文件保存",
    });
    return;
  }
  loadingTitle.value = "正在导出祈愿数据";
  loading.value = true;
  if (allConfirm === false) {
    await exportUigf4Data(file, uidCur.value);
  } else {
    await exportUigf4Data(file);
  }
  loading.value = false;
  showSnackbar({
    text: "祈愿数据已成功导出",
  });
  await TGLogger.Info(`[UserGacha][${uidCur.value}][exportUigf4] 导出祈愿数据完成`);
}

// 删除当前 UID 的祈愿数据
async function deleteGacha(): Promise<void> {
  if (gachaListCur.value.length === 0) {
    showSnackbar({
      color: "error",
      text: "暂无祈愿数据",
    });
    return;
  }
  await TGLogger.Info(`[UserGacha][${uidCur.value}][deleteGacha] 删除祈愿数据`);
  const firstConfirm = await showConfirm({
    title: "是否删除祈愿数据？",
    text: `UID：${uidCur.value}，共 ${gachaListCur.value.length} 条数据`,
  });
  if (!firstConfirm) {
    showSnackbar({
      color: "cancel",
      text: "已取消祈愿数据删除",
    });
    await TGLogger.Info(`[UserGacha][${uidCur.value}][deleteGacha] 已取消祈愿数据删除`);
    return;
  }
  const uidList = await TSUserGacha.getUidList();
  let secondConfirm: string | boolean | undefined;
  if (uidList.length <= 1) {
    secondConfirm = await showConfirm({
      title: "删除后数据库将为空，确定删除？",
      text: `UID：${uidCur.value}，共 ${gachaListCur.value.length} 条数据`,
    });
    if (!secondConfirm) {
      showSnackbar({
        color: "cancel",
        text: "已取消祈愿数据删除",
      });
      await TGLogger.Info(`[UserGacha][${uidCur.value}][deleteGacha] 已取消祈愿数据删除`);
      return;
    }
  }
  loadingTitle.value = `正在删除${uidCur.value}的祈愿数据`;
  loading.value = true;
  await TSUserGacha.deleteGachaRecords(uidCur.value);
  loading.value = false;
  showSnackbar({
    text: `已成功删除 ${uidCur.value} 的祈愿数据`,
  });
  await TGLogger.Info(
    `[UserGacha][${uidCur.value}][deleteGacha] 成功删除 ${gachaListCur.value.length} 条祈愿数据`,
  );
  setTimeout(() => {
    window.location.reload();
  }, 1000);
}

// 监听 UID 变化
watch(uidCur, async (newUid) => {
  gachaListCur.value = await TSUserGacha.getGachaRecords(newUid);
  showSnackbar({
    text: `成功获取 ${gachaListCur.value.length} 条祈愿数据`,
  });
  await TGLogger.Info(
    `[UserGacha][${newUid}][watch] 成功获取 ${gachaListCur.value.length} 条祈愿数据`,
  );
});
</script>
<style lang="css" scoped>
.gacha-top-bar {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  padding: 10px;
  border-radius: 5px;
  margin-bottom: 10px;
  background: var(--box-bg-1);
  column-gap: 50px;
  font-family: var(--font-title);
  font-size: 20px;
}

.gacha-top-title {
  color: var(--common-text-title);
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
