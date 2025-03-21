<template>
  <v-app-bar>
    <template #prepend>
      <div class="gacha-top-title">
        <img src="/source/UI/userGacha.webp" alt="gacha" />
        <span>祈愿记录</span>
        <v-select
          :hide-details="true"
          density="compact"
          v-model="uidCur"
          :items="selectItem"
          variant="outlined"
          label="游戏UID"
        />
      </div>
    </template>
    <template #extension>
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
    </template>
  </v-app-bar>
  <div class="gacha-container">
    <v-tabs v-model="tab" align-tabs="start" class="gacha-tab" density="compact">
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
        <gro-echarts :uid="uidCur" v-if="uidCur" />
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
import showDialog from "@comp/func/dialog.js";
import showLoading from "@comp/func/loading.js";
import showSnackbar from "@comp/func/snackbar.js";
import GroEcharts from "@comp/userGacha/gro-echarts.vue";
import GroHistory from "@comp/userGacha/gro-history.vue";
import GroOverview from "@comp/userGacha/gro-overview.vue";
import GroTable from "@comp/userGacha/gro-table.vue";
import UgoUid from "@comp/userGacha/ugo-uid.vue";
import TSUserGacha from "@Sqlite/modules/userGacha.js";
import { path } from "@tauri-apps/api";
import { open, save } from "@tauri-apps/plugin-dialog";
import { storeToRefs } from "pinia";
import { onMounted, ref, shallowRef, watch } from "vue";

import { AppCharacterData, AppWeaponData } from "@/data/index.js";
import { useUserStore } from "@/store/modules/user.js";
import TGLogger from "@/utils/TGLogger.js";
import { exportUigfData, readUigfData, verifyUigfData } from "@/utils/UIGF.js";
import Hk4eApi from "@/web/request/hk4eReq.js";
import takumiReq from "@/web/request/takumiReq.js";

const { account, cookie } = storeToRefs(useUserStore());
const authkey = ref<string>("");
const uidCur = ref<string>();
const tab = ref<string>("overview");
const ovShow = ref<boolean>(false);
const ovMode = ref<"export" | "import">("import");
const selectItem = shallowRef<Array<string>>([]);
const gachaListCur = shallowRef<Array<TGApp.Sqlite.GachaRecords.SingleTable>>([]);

onMounted(async () => {
  await showLoading.start("正在加载祈愿数据", "正在获取祈愿 UID 列表");
  await TGLogger.Info("[UserGacha][onMounted] 进入角色祈愿页面");
  selectItem.value = await TSUserGacha.getUidList();
  if (selectItem.value.length === 0) {
    await showLoading.end();
    showSnackbar.error("暂无祈愿数据，请先导入祈愿数据");
    await TGLogger.Warn("[UserGacha][onMounted] 暂无祈愿数据，请先导入祈愿数据");
    return;
  }
  uidCur.value = selectItem.value[0];
  await showLoading.update(`UID：${uidCur.value}`);
  gachaListCur.value = await TSUserGacha.getGachaRecords(uidCur.value);
  await TGLogger.Info(
    `[UserGacha][onMounted] 获取到 ${uidCur.value} 的 ${gachaListCur.value.length} 条祈愿数据`,
  );
  await showLoading.end();
  showSnackbar.success(`成功获取 ${gachaListCur.value.length} 条祈愿数据`);
});

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

// 刷新按钮点击事件
async function confirmRefresh(force: boolean): Promise<void> {
  await TGLogger.Info(`[UserGacha][${account.value.gameUid}][confirmRefresh] 刷新祈愿数据`);
  if (!cookie.value) {
    showSnackbar.error("请先登录");
    await TGLogger.Warn("[UserGacha][${account.gameUid}][confirmRefresh] 未检测到 cookie");
    return;
  }
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
  await showLoading.start(`正在刷新祈愿数据`, `UID:${account.value.gameUid},正在获取 authkey`);
  const authkeyRes = await takumiReq.bind.authKey(cookie.value, account.value);
  if (typeof authkeyRes === "string") {
    authkey.value = authkeyRes;
    await TGLogger.Info(`[UserGacha][${account.value.gameUid}][confirmRefresh] 成功获取 authkey`);
  } else {
    showSnackbar.error("获取 authkey 失败");
    await TGLogger.Error(`[UserGacha][${account.value.gameUid}][confirmRefresh] 获取 authkey 失败`);
    await TGLogger.Error(
      `[UserGacha][${account.value.gameUid}][confirmRefresh] ${authkeyRes.retcode} ${authkeyRes.message}`,
    );
    await showLoading.end();
    return;
  }
  await refreshGachaPool("100", "新手祈愿", force);
  await refreshGachaPool("200", "常驻祈愿", force);
  await refreshGachaPool("301", "角色祈愿", force);
  await refreshGachaPool("400", "角色祈愿2", force);
  await refreshGachaPool("302", "武器祈愿", force);
  await refreshGachaPool("500", "集录祈愿", force);
  await showLoading.end();
  await TGLogger.Info(`[UserGacha][${account.value.gameUid}][confirmRefresh] 刷新祈愿数据完成`);
  showSnackbar.success("祈愿数据刷新完成，即将刷新页面");
  await new Promise<void>((resolve) => setTimeout(resolve, 1500));
  window.location.reload();
}

// 刷新单个池子
async function refreshGachaPool(
  type: string,
  label: string,
  force: boolean = false,
): Promise<void> {
  let endId = "0";
  let reqId = "0";
  let gachaDataMap: Record<string, string[]> | undefined = undefined;
  let page = 0;
  await showLoading.start(`正在刷新${label}数据`);
  if (!force) endId = (await TSUserGacha.getGachaCheck(account.value.gameUid, type)) ?? "0";
  while (true) {
    page++;
    const gachaRes = await Hk4eApi.gacha(authkey.value, type, reqId);
    if (!Array.isArray(gachaRes)) {
      showSnackbar.error(`[${type}][${gachaRes.retcode}] ${gachaRes.message}`);
      await TGLogger.Error(
        `[UserGacha][${account.value.gameUid}][refreshGachaPool] 获取祈愿数据失败`,
      );
      await TGLogger.Error(
        `[UserGacha][${account.value.gameUid}][refreshGachaPool] ${gachaRes.retcode} ${gachaRes.message}`,
      );
      await new Promise<void>((resolve) => setTimeout(resolve, 1000));
      break;
    }
    if (gachaRes.length === 0) {
      if (force) {
        await showLoading.update(`正在清理${label}数据`);
        if (gachaDataMap) {
          await TSUserGacha.cleanGachaRecords(account.value.gameUid, type, gachaDataMap);
        }
      }
      break;
    }
    const uigfList: TGApp.Plugins.UIGF.GachaItem[] = [];
    if (force) await showLoading.update(`[${label}] 第${page}页，${gachaRes.length}条`);
    for (const item of gachaRes) {
      if (!force) {
        await showLoading.update(`[${item.item_type}][${item.time}] ${item.name}`);
      }
      const tempItem: TGApp.Plugins.UIGF.GachaItem = {
        gacha_type: item.gacha_type,
        item_id: item.item_id,
        count: item.count,
        time: item.time,
        name: item.name,
        item_type: item.item_type,
        rank_type: item.rank_type,
        id: item.id.toString(),
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
        gachaDataMap[item.time].push(item.id.toString());
      }
    }
    await TSUserGacha.mergeUIGF(account.value.gameUid, uigfList);
    if (!force && gachaRes.some((i) => i.id.toString() === endId.toString())) break;
    reqId = gachaRes[gachaRes.length - 1].id.toString();
    if (force) await new Promise<void>((resolve) => setTimeout(resolve, 1000));
  }
}

function importUigf4(): void {
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
  await showLoading.start("正在导入祈愿数据", "正在验证祈愿数据");
  const check = await verifyUigfData(selectedFile, false);
  if (!check) {
    await showLoading.end();
    return;
  }
  await showLoading.update("正在读取祈愿数据");
  const remoteData = await readUigfData(selectedFile);
  await showLoading.update(`UID：${remoteData.info.uid}，共 ${remoteData.list.length} 条数据`);
  if (remoteData.list.length === 0) {
    await showLoading.end();
    showSnackbar.error("导入的祈愿数据为空");
    return;
  }
  await TSUserGacha.mergeUIGF(remoteData.info.uid, remoteData.list);
  await showLoading.end();
  showSnackbar.success(`成功导入 ${remoteData.list.length} 条祈愿数据，即将刷新页面`);
  await TGLogger.Info(
    `[UserGacha][importUigf] 成功导入 ${remoteData.info.uid} 的 ${remoteData.list.length} 条祈愿数据`,
  );
  await new Promise<void>((resolve) => setTimeout(resolve, 1500));
  window.location.reload();
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
  await showLoading.start("正在导出祈愿数据", `UID:${uidCur.value}`);
  await exportUigfData(uidCur.value, gachaList, file);
  await showLoading.end();
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
  await showLoading.start("正在删除祈愿数据", `UID:${uidCur.value}`);
  await TSUserGacha.deleteGachaRecords(uidCur.value);
  await showLoading.end();
  showSnackbar.success(`已成功删除 ${uidCur.value} 的祈愿数据，即将刷新页面`);
  await TGLogger.Info(
    `[UserGacha][${uidCur.value}][deleteGacha] 成功删除 ${gachaListCur.value.length} 条祈愿数据`,
  );
  await new Promise<void>((resolve) => setTimeout(resolve, 1500));
  window.location.reload();
}
</script>
<style lang="css" scoped>
.gacha-top-title {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 12px;
  column-gap: 8px;

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

.gacha-top-btns {
  display: flex;
  margin-left: 16px;
  column-gap: 8px;
}

.gacha-top-btn {
  border-radius: 5px;
  background: var(--tgc-btn-1);
  color: var(--btn-text);
}

.dark .gacha-top-btn {
  border: 1px solid var(--common-shadow-2);
}

.gacha-container {
  display: flex;
  height: calc(100vh - 144px);
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  border: 1px solid var(--common-shadow-2);
  border-radius: 4px;
  background: var(--app-page-bg);
}

.gacha-tab {
  height: 40px;
  color: var(--box-text-4);
  font-family: var(--font-title);
}

.gacha-window {
  width: 100%;
  height: 100%;
  padding: 8px;
}

.gacha-window-item {
  height: 100%;
}
</style>
