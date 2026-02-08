<!-- 千星奇域祈愿记录页面 TODO：处理活动卡池次数共享 -->
<template>
  <v-app-bar>
    <template #prepend>
      <div class="gb-top-title">
        <img alt="byd" class="gb-top-byd" src="/icon/nation/千星奇域.webp" />
        <span>颂愿记录</span>
        <v-select
          v-model="uidCur"
          :hide-details="true"
          :items="selectItem"
          density="compact"
          label="游戏UID"
          variant="outlined"
        />
        <img alt="gacha" src="/source/UI/userGacha.webp" title="祈愿" @click="toGacha()" />
      </div>
    </template>
    <template #extension>
      <div class="gb-top-btns">
        <v-btn
          class="gb-top-btn"
          prepend-icon="mdi-refresh"
          variant="elevated"
          @click="confirmRefresh(false)"
        >
          增量刷新
        </v-btn>
        <v-btn
          class="gb-top-btn"
          prepend-icon="mdi-refresh"
          variant="elevated"
          @click="confirmRefresh(true)"
        >
          全量刷新
        </v-btn>
        <v-btn
          class="gb-top-btn"
          prepend-icon="mdi-import"
          variant="elevated"
          @click="importUigf()"
        >
          导入
        </v-btn>
        <v-btn
          class="gb-top-btn"
          prepend-icon="mdi-export"
          variant="elevated"
          @click="exportUigf()"
        >
          导出
        </v-btn>
        <v-btn
          class="gb-top-btn"
          prepend-icon="mdi-database"
          title="将数据库中非中文数据转换为中文"
          variant="elevated"
          @click="checkData()"
        >
          检测数据
        </v-btn>
        <v-btn
          class="gb-top-btn"
          prepend-icon="mdi-delete"
          variant="elevated"
          @click="deleteGacha()"
        >
          删除
        </v-btn>
      </div>
    </template>
  </v-app-bar>
  <div class="gb-container">
    <v-tabs v-model="tab" align-tabs="start" class="gb-tab" density="compact">
      <v-tab value="overview">数据概览</v-tab>
      <v-tab value="table">数据表格</v-tab>
    </v-tabs>
    <v-window v-model="tab" class="gb-window">
      <v-window-item class="gb-window-item" value="overview">
        <gbr-overview v-model="gachaListCur" />
      </v-window-item>
      <v-window-item class="gb-window-item" value="table">
        <gbr-table v-model="gachaListCur" />
      </v-window-item>
    </v-window>
  </div>
  <UgoUid v-model="ovShow" :fpi="ovFpi" :mode="ovMode" />
</template>
<script lang="ts" setup>
import showDialog from "@comp/func/dialog.js";
import showLoading from "@comp/func/loading.js";
import showSnackbar from "@comp/func/snackbar.js";
import GbrOverview from "@comp/userGacha/gbr-overview.vue";
import GbrTable from "@comp/userGacha/gbr-table.vue";
import UgoUid from "@comp/userGacha/ugo-uid.vue";
import hk4eReq from "@req/hk4eReq.js";
import takumiReq from "@req/takumiReq.js";
import TSUserGachaB from "@Sqlm/userGachaB.js";
import useAppStore from "@store/app.js";
import useUserStore from "@store/user.js";
import { path } from "@tauri-apps/api";
import { open } from "@tauri-apps/plugin-dialog";
import TGLogger from "@utils/TGLogger.js";
import { storeToRefs } from "pinia";
import { onMounted, ref, shallowRef, watch } from "vue";
import { useRouter } from "vue-router";

import { AppGachaBData } from "@/data/index.js";

const router = useRouter();
const { isLogin } = storeToRefs(useAppStore());
const { account, cookie } = storeToRefs(useUserStore());

const ovMode = ref<"export" | "import">("import");
const ovShow = ref<boolean>(false);
const ovFpi = ref<string>();

const authkey = ref<string>("");
const uidCur = ref<string>();
const tab = ref<string>("overview");
const selectItem = shallowRef<Array<string>>([]);
const gachaListCur = shallowRef<Array<TGApp.Sqlite.Gacha.GachaB>>([]);

onMounted(async () => {
  await TGLogger.Info("[UserGachaB][onMounted] 进入千星奇域页面");
  await showLoading.start("正在加载千星奇域祈愿数据", "正在获取UID列表...");
  await reloadUid();
  if (uidCur.value) {
    await showLoading.update(`UID: ${uidCur.value}`);
    gachaListCur.value = await TSUserGachaB.getGachaRecords(uidCur.value);
    await TGLogger.Info(`[UserGachaB][onMounted] 祈愿记录数: ${gachaListCur.value.length}`);
  }
  await showLoading.end();
  showSnackbar.success(`加载完成，共 ${gachaListCur.value.length} 条祈愿记录`);
});

watch(
  () => uidCur.value,
  async (newUid) => {
    if (!newUid) return;
    gachaListCur.value = await TSUserGachaB.getGachaRecords(newUid);
    showSnackbar.success(`成功获取 ${gachaListCur.value.length} 条祈愿数据`);
    await TGLogger.Info(
      `[UserGachaB][${newUid}][watch] 成功获取 ${gachaListCur.value.length} 条祈愿数据`,
    );
  },
);

/**
 * 跳转至祈愿页面
 */
async function toGacha(): Promise<void> {
  await router.push({ name: "祈愿记录" });
}

async function reloadUid(): Promise<void> {
  selectItem.value = await TSUserGachaB.getUidList();
  if (selectItem.value.includes(account.value.gameUid)) uidCur.value = account.value.gameUid;
  else if (selectItem.value.length > 0) uidCur.value = selectItem.value[0];
  else if (isLogin.value) {
    selectItem.value = [account.value.gameUid];
    uidCur.value = account.value.gameUid;
  } else uidCur.value = undefined;
}

/**
 * 刷新祈愿数据
 * @param {boolean} force 是否强制刷新
 * @return {Promise<void>} void
 */
async function confirmRefresh(force: boolean): Promise<void> {
  if (!isLogin.value || !cookie.value) {
    showSnackbar.warn("请先登录账号");
    return;
  }
  await TGLogger.Info(`[UserGachaB][${account.value.gameUid}] 开始刷新千星奇域祈愿数据`);
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
    await TGLogger.Info(`[UserGacha][${account.value.gameUid}] 成功获取 authkey`);
  } else {
    showSnackbar.error("获取 authkey 失败");
    await TGLogger.Error(`[UserGacha][${account.value.gameUid}] 获取 authkey 失败`);
    await TGLogger.Error(
      `[UserGachaB][${account.value.gameUid}] ${authkeyRes.retcode} ${authkeyRes.message}`,
    );
    await showLoading.end();
    return;
  }
  await refreshGachaPool("1000", "常驻颂愿", force);
  await refreshGachaPool("2000", "活动颂愿", force);
  // await refreshGachaPool("20011", "活动颂愿·男", force);
  // await refreshGachaPool("20012", "活动颂愿·男2", force);
  // await refreshGachaPool("20021", "活动颂愿·女", force);
  // await refreshGachaPool("20022", "活动颂愿·女2", force);
  await showLoading.end();
  await TGLogger.Info(`[UserGacha][${account.value.gameUid}] 刷新祈愿数据完成`);
  showSnackbar.success("祈愿数据刷新完成，即将刷新页面");
  await new Promise<void>((resolve) => setTimeout(resolve, 1500));
  window.location.reload();
}

/**
 * 刷新指定祈愿池数据
 * @param {string} gachaType 祈愿池类型
 * @param {string} gachaName 祈愿池名称
 * @param {boolean} force 是否强制刷新
 * @return {Promise<void>} void
 */
async function refreshGachaPool(
  gachaType: string,
  gachaName: string,
  force: boolean,
): Promise<void> {
  let endId = "0";
  let reqId = "0";
  let page = 0;
  await showLoading.start(`正在刷新${gachaName}数据`, "");
  if (!force) {
    endId = (await TSUserGachaB.getGachaCheck(account.value.gameUid, gachaType)) ?? "0";
  }
  while (true) {
    page++;
    const gachaRes = await hk4eReq.gachaB(authkey.value, gachaType, reqId);
    console.log(gachaRes);
    if (!Array.isArray(gachaRes)) {
      showSnackbar.error(`[${gachaType}][${gachaRes.retcode}] ${gachaRes.message}`);
      await TGLogger.Error(
        `[UserGachaB][${account.value.gameUid}][refreshGachaPool] 获取祈愿数据失败`,
      );
      await TGLogger.Error(
        `[UserGachaB][${account.value.gameUid}][refreshGachaPool] ${gachaRes.retcode} ${gachaRes.message}`,
      );
      await new Promise<void>((resolve) => setTimeout(resolve, 1000));
      break;
    }
    if (gachaRes.length === 0) break;
    const uigfList: Array<TGApp.Plugins.UIGF.GachaItemB> = [];
    if (force) await showLoading.update(`[${gachaName}] 第${page}页，${gachaRes.length}条`);
    for (const item of gachaRes) {
      if (!force) {
        await showLoading.update(`[${item.item_type}][${item.time}] ${item.item_name}`);
      }
      const tempItem: TGApp.Plugins.UIGF.GachaItemB = {
        id: item.id,
        item_id: item.item_id,
        item_name: item.item_name,
        item_type: item.item_type,
        op_gacha_type: item.op_gacha_type,
        rank_type: item.rank_type,
        schedule_id: item.schedule_id,
        time: item.time,
      };
      uigfList.push(tempItem);
    }
    await TSUserGachaB.insertGachaList(account.value.gameUid, uigfList);
    if (!force && gachaRes.some((i) => i.id.toString() === endId.toString())) break;
    reqId = gachaRes[gachaRes.length - 1].id.toString();
    if (force) await new Promise<void>((resolve) => setTimeout(resolve, 1000));
  }
}

/**
 * 删除当前UID的祈愿数据
 * @return {Promise<void>} void
 */
async function deleteGacha(): Promise<void> {
  if (gachaListCur.value.length === 0 || !uidCur.value) {
    showSnackbar.error("暂无祈愿数据");
    return;
  }
  await TGLogger.Info(`[UserGachaB][${uidCur.value}][deleteGacha] 删除祈愿数据`);
  const delCheck = await showDialog.check(
    "确定删除祈愿数据？",
    `UID：${uidCur.value}，共 ${gachaListCur.value.length} 条数据`,
  );
  if (!delCheck) {
    showSnackbar.cancel("已取消祈愿数据删除");
    await TGLogger.Info(`[UserGachaB][${uidCur.value}][deleteGacha] 已取消祈愿数据删除`);
    return;
  }
  const uidList = await TSUserGachaB.getUidList();
  if (uidList.length <= 1) {
    const forceCheck = await showDialog.check("删除后数据库将为空，确定删除？");
    if (!forceCheck) {
      showSnackbar.cancel("已取消祈愿数据删除");
      return;
    }
  }
  await showLoading.start("正在删除祈愿数据", `UID:${uidCur.value}`);
  await TSUserGachaB.deleteRecords(uidCur.value);
  await showLoading.end();
  showSnackbar.success(`已成功删除 ${uidCur.value} 的祈愿数据，即将刷新页面`);
  await TGLogger.Info(
    `[UserGachaB][${uidCur.value}][deleteGacha] 成功删除 ${gachaListCur.value.length} 条祈愿数据`,
  );
  await new Promise<void>((resolve) => setTimeout(resolve, 1500));
  window.location.reload();
}

async function importUigf(): Promise<void> {
  await TGLogger.Info(`[UserGachaB][importUigf] 导入祈愿数据`);
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
  ovFpi.value = selectedFile;
  ovMode.value = "import";
  ovShow.value = true;
}

async function exportUigf(): Promise<void> {
  if (!uidCur.value) {
    showSnackbar.error("未获取到 UID");
    return;
  }
  await TGLogger.Info(`[UserGachaB][${uidCur.value}][exportUigf] 导出祈愿数据`);
  ovMode.value = "export";
  ovShow.value = true;
}

async function checkData(): Promise<void> {
  let cnt = 0;
  let fail = 0;
  await showLoading.start(
    "正在检测数据",
    `UID:${uidCur.value}，共${gachaListCur.value.length}条颂愿数据`,
  );
  for (const data of gachaListCur.value) {
    const find = AppGachaBData.find((i) => i.id === data.itemId);
    if (!find) {
      await showLoading.update(`未找到 ${data.itemId} 对应元数据，跳过`);
      fail++;
      continue;
    }
    if (data.name !== find.name) {
      await showLoading.update(`${data.name}->${find.name}`);
      await TSUserGachaB.updateNt(data, find);
      cnt++;
    }
  }
  await showLoading.end();
  if (cnt > 0 || fail > 0) {
    showSnackbar.success(`成功补充遗漏数据${cnt}条，失败${fail}条，即将刷新`);
    await new Promise<void>((resolve) => setTimeout(resolve, 1500));
    window.location.reload();
  } else {
    showSnackbar.success(`成功检测${gachaListCur.value.length}条数据，无需更新`);
  }
}
</script>
<style lang="scss" scoped>
.gb-top-title {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 12px;
  column-gap: 8px;

  img {
    width: 32px;
    height: 32px;

    &:last-child {
      cursor: pointer;
    }
  }

  span {
    color: var(--common-text-title);
    font-family: var(--font-title);
    font-size: 20px;
  }
}

.gb-top-byd {
  filter: invert(0.75);
}

.dark .gb-top-byd {
  filter: none;
}

.gb-top-btns {
  display: flex;
  margin-bottom: 4px;
  margin-left: 16px;
  column-gap: 8px;
}

.gb-top-btn {
  background: var(--tgc-btn-1);
  color: var(--btn-text);
}

.gb-container {
  display: flex;
  height: calc(100vh - 144px);
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  border: 1px solid var(--common-shadow-2);
  border-radius: 4px;
  background: var(--app-page-bg);
}

.gb-tab {
  height: 40px;
  color: var(--box-text-4);
  font-family: var(--font-title);

  img {
    width: 16px;
    height: 16px;
    margin-right: 4px;
  }
}

.gb-window {
  width: 100%;
  height: 100%;
  padding: 8px;
}

.gb-window-item {
  height: 100%;
}
</style>
