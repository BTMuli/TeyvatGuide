<!-- 用户战绩页面 -->
<template>
  <v-app-bar>
    <template #prepend>
      <div class="ur-top-title">
        <img alt="icon" src="/UI/nav/userRecord.webp" />
        <span>原神战绩</span>
        <v-select
          v-model="uidCur"
          :hide-details="true"
          :items="uidList"
          density="compact"
          label="游戏UID"
          variant="outlined"
        />
      </div>
    </template>
    <template #append>
      <div class="ur-top-btns">
        <v-btn
          :loading="isRefresh"
          class="ur-top-btn"
          prepend-icon="mdi-refresh"
          variant="elevated"
          @click="refreshRecord()"
        >
          更新
        </v-btn>
        <v-btn
          :disabled="recordData === undefined || isRefresh"
          class="ur-top-btn"
          prepend-icon="mdi-share"
          variant="elevated"
          @click="shareRecord()"
        >
          分享
        </v-btn>
        <v-btn
          :disabled="recordData === undefined || isRefresh"
          class="ur-top-btn"
          prepend-icon="mdi-delete"
          variant="elevated"
          @click="deleteRecord()"
        >
          删除
        </v-btn>
      </div>
    </template>
  </v-app-bar>
  <div v-if="recordData" class="ur-box">
    <div class="ur-box-title">
      <TurRoleInfo :role="recordData.role" :uid="uidCur ?? 0" />
      <span class="sign">TeyvatGuide v{{ version }} | {{ recordData.updated }}</span>
    </div>
    <PhCompCard :shareTitle="`战绩_数据总览_${uidCur}`" modernShare title="数据总览">
      <TurOverviewGrid :model-value="recordData.stats" />
    </PhCompCard>
    <PhCompCard :shareTitle="`战绩_角色信息_${uidCur}`" modernShare shareProgress title="角色信息">
      <TurAvatarGrid :model-value="recordData.avatars" />
    </PhCompCard>
    <PhCompCard :shareTitle="`战绩_世界探索_${uidCur}`" modernShare shareProgress title="世界探索">
      <TurWorldGrid :uid="uidCur ?? 0" :version :worlds="recordData.wed" />
    </PhCompCard>
    <PhCompCard :shareTitle="`战绩_尘歌壶_${uidCur}`" modernShare title="尘歌壶">
      <TurHomeOverview :homes="recordData.homes" />
    </PhCompCard>
  </div>
  <div v-else class="ur-empty">
    <img alt="empty" src="/UI/app/empty.webp" />
    <span>DATA NOT FOUND</span>
  </div>
</template>
<script lang="ts" setup>
import showDialog from "@comp/func/dialog.js";
import showLoading from "@comp/func/loading.js";
import showSnackbar from "@comp/func/snackbar.js";
import PhCompCard from "@comp/pageHome/ph-comp-card.vue";
import TurAvatarGrid from "@comp/userRecord/tur-avatar-grid.vue";
import TurHomeOverview from "@comp/userRecord/tur-home-overview.vue";
import TurOverviewGrid from "@comp/userRecord/tur-overview-grid.vue";
import TurRoleInfo from "@comp/userRecord/tur-role-info.vue";
import TurWorldGrid from "@comp/userRecord/tur-world-grid.vue";
import recordReq from "@req/recordReq.js";
import TSUserAccount from "@Sqlm/userAccount.js";
import TSUserRecord from "@Sqlm/userRecord.js";
import useUserStore from "@store/user.js";
import { getVersion } from "@tauri-apps/api/app";
import { getRfAc } from "@utils/acUtils.js";
import TGHttps from "@utils/TGHttps.js";
import TGLogger from "@utils/TGLogger.js";
import TGShare from "@utils/TGShare.js";
import { storeToRefs } from "pinia";
import { onMounted, ref, shallowRef, watch } from "vue";

const userStore = useUserStore();
const { account, cookie } = storeToRefs(userStore);

const version = ref<string>();
const isRefresh = ref<boolean>(false);
const uidCur = ref<number>();
const uidList = shallowRef<Array<number>>([]);
const recordData = shallowRef<TGApp.Sqlite.Record.TableTrans>();
let recordLoadSequence = 0;

onMounted(async () => {
  await showLoading.start("正在获取战绩数据");
  await TGLogger.Info("[UserRecord][onMounted] 打开角色战绩页面");
  version.value = await getVersion();
  await loadUid();
  isRefresh.value = false;
  await showLoading.end();
});

watch(() => uidCur.value, loadRecord);
watch(
  () => account.value,
  async () => await loadUid(),
);

async function loadUid(uid?: string): Promise<void> {
  uidList.value = await TSUserRecord.getAllUid();
  const accountUid = Number(account.value.gameUid);
  if (uidList.value.length === 0) uidList.value = [accountUid];
  if (!uidList.value.includes(accountUid)) uidList.value = [accountUid, ...uidList.value];
  const preferredUid = uid === undefined ? undefined : Number(uid);
  uidCur.value =
    preferredUid !== undefined && uidList.value.includes(preferredUid)
      ? preferredUid
      : uidList.value.includes(accountUid)
        ? accountUid
        : uidList.value[0];
}

async function loadRecord(): Promise<void> {
  const sequence = ++recordLoadSequence;
  const uid = uidCur.value;
  recordData.value = undefined;
  if (!uid) return;
  try {
    const source = await TSUserRecord.getRecordSource(uid);
    if (sequence !== recordLoadSequence || uidCur.value !== uid) return;
    if (source === "legacy") {
      await handleLegacyRecord(uid, sequence);
      return;
    }
    if (source === false) return;
    const record = await TSUserRecord.getRecord(uid);
    if (!record) return;
    if (sequence !== recordLoadSequence || uidCur.value !== uid) return;
    recordData.value = record;
  } catch (error) {
    const errMsg = TGHttps.getErrMsg(error);
    showSnackbar.error(`加载战绩数据异常: ${errMsg}`);
    await TGLogger.Error(`[UserRecord][loadRecord][${uid}] 加载战绩数据异常`);
    await TGLogger.Error(`${error}`);
  }
}

async function canRefreshRecord(uid: number): Promise<boolean> {
  const gameAccount = await TSUserAccount.game.getAccountByGid(uid.toString());
  if (gameAccount === false) return false;
  const userAccount = await TSUserAccount.account.getAccount(gameAccount.uid);
  return userAccount !== false && userAccount.cookie !== undefined;
}

async function handleLegacyRecord(uid: number, sequence: number): Promise<void> {
  const refreshSupported = await canRefreshRecord(uid);
  if (sequence !== recordLoadSequence || uidCur.value !== uid) return;

  if (refreshSupported) {
    const refreshCheck = await showDialog.check(
      "检测到旧版战绩数据",
      `UID ${uid} 的战绩数据需要刷新为新版原始数据，确认后才会加载。`,
    );
    if (!refreshCheck) {
      showSnackbar.cancel("已取消刷新旧版战绩数据");
      return;
    }
    if (sequence !== recordLoadSequence || uidCur.value !== uid) return;
    const refreshed = await refreshRecord(uid);
    if (!refreshed) return;
    await TSUserRecord.deleteLegacyUid(uid);
    await loadRecord();
    return;
  }

  const deleteCheck = await showDialog.check(
    "检测到旧版战绩数据",
    `UID ${uid} 没有可用的刷新账号，确认后将删除旧版战绩数据。`,
  );
  if (!deleteCheck) {
    showSnackbar.cancel("已取消删除旧版战绩数据");
    return;
  }
  if (sequence !== recordLoadSequence || uidCur.value !== uid) return;
  await TSUserRecord.deleteLegacyUid(uid);
  showSnackbar.success(`成功删除${uid}的旧版战绩数据`);
  await loadUid();
  await loadRecord();
}

async function refreshRecord(uidOverride?: number): Promise<boolean> {
  const refreshData = await getRfAc(
    (uidOverride ?? uidCur.value)?.toString(),
    account.value,
    cookie.value,
    "UserRecord.refresh",
  );
  if (!refreshData) return false;
  const { account: rfAccount, cookie: rfCk } = refreshData;
  await showLoading.start(`正在刷新${rfAccount.gameUid}的战绩数据`);
  await TGLogger.Info(`[UserRecord][refresh][${rfAccount.gameUid}] 刷新战绩数据`);
  isRefresh.value = true;
  try {
    const indexResp = await recordReq.index(rfCk, rfAccount);
    console.debug("recordIndexResp", indexResp);
    if (indexResp.retcode !== 0) {
      showSnackbar.error(`[${indexResp.retcode}] ${indexResp.message}`);
      await TGLogger.Warn(`[UserRecord][refresh][${rfAccount.gameUid}] 获取战绩数据失败`);
      await TGLogger.Warn(
        `[UserRecord][refresh][${rfAccount.gameUid}] ${indexResp.retcode} ${indexResp.message}`,
      );
      return false;
    }
    await TGLogger.Info(`[UserRecord][refresh][${rfAccount.gameUid}] 获取战绩数据成功`);
    await TGLogger.Info(`[UserRecord][refresh][${rfAccount.gameUid}]`, false);
    await showLoading.update("正在保存战绩数据");
    await TSUserRecord.saveRawRecord(Number(rfAccount.gameUid), indexResp.data);
    await showLoading.update("正在加载战绩数据");
    await loadUid(rfAccount.gameUid);
    await loadRecord();
    showSnackbar.success(`成功刷新${rfAccount.gameUid}的战绩数据`);
    return true;
  } catch (error) {
    const errMsg = TGHttps.getErrMsg(error);
    showSnackbar.error(`刷新战绩数据异常: ${errMsg}`);
    await TGLogger.Error(`[Record][refreshRecord] 获取战绩异常`);
    await TGLogger.Error(`${error}`);
    return false;
  } finally {
    isRefresh.value = false;
    await showLoading.end();
  }
}

async function shareRecord(): Promise<void> {
  if (!recordData.value) {
    showSnackbar.warn("未找到战绩数据，请尝试刷新");
    return;
  }
  await TGLogger.Info(`[UserRecord][shareRecord][${uidCur.value}] 生成分享图片`);
  const recordBox = document.querySelector<HTMLElement>(".ur-box");
  if (recordBox === null) {
    showSnackbar.error("未找到战绩数据，请尝试刷新");
    return;
  }
  const fileName = `【原神战绩】-${uidCur.value}.png`;
  let progressAt = 0;

  function reportShareProgress(progress: {
    phase: "snapshot" | "bake" | "capture";
    current: number;
    total: number;
  }): void {
    const isTail = progress.current >= progress.total;
    const now = performance.now();
    if (!isTail && now - progressAt < 80) return;
    progressAt = now;
    if (progress.phase === "snapshot") {
      void showLoading.update("正在截取背景", { title: "正在烘焙毛玻璃", timeout: 0 });
      return;
    }
    if (progress.phase === "bake") {
      void showLoading.update(`${progress.current}/${progress.total}`, {
        title: "正在烘焙毛玻璃",
        timeout: 0,
      });
      return;
    }
    void showLoading.update(`${progress.current}/${progress.total}`, {
      title: "正在生成图片",
      timeout: 0,
    });
  }

  await showLoading.start("正在生成图片", fileName, 0);
  try {
    await TGShare.modern(fileName, recordBox, 2, false, {
      bakeBackdrop: true,
      onProgress: reportShareProgress,
    });
    await TGLogger.Info(`[UserRecord][shareRecord][${uidCur.value}] 生成分享图片成功`);
  } finally {
    await showLoading.end();
  }
}

async function deleteRecord(): Promise<void> {
  if (!uidCur.value) {
    showSnackbar.warn("未找到当前UID");
    return;
  }
  const delCheck = await showDialog.check("确定删除？", `将删除${uidCur.value}对应的战绩数据`);
  if (!delCheck) {
    showSnackbar.cancel("已取消删除战绩数据");
    return;
  }
  await TSUserRecord.deleteUid(uidCur.value);
  showSnackbar.success(`成功删除${uidCur.value}的战绩数据`);
  await loadUid();
  await loadRecord();
}
</script>
<style lang="scss" scoped>
@use "@styles/github.styles.scss" as github-styles;

.ur-top-title {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 12px;
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

.ur-top-btns {
  position: relative;
  display: flex;
  margin-right: 12px;
  gap: 8px;
}

.ur-top-btn {
  border-radius: 4px;
  background: var(--tgc-btn-1);
  color: var(--btn-text);
  font-family: var(--font-text);
}

.ur-box {
  @include github-styles.github-card-shadow;

  position: relative;
  display: flex;
  box-sizing: border-box;
  flex-direction: column;
  padding: 8px;
  border: 1px solid var(--common-shadow-2);
  border-radius: 4px;
  background: var(--app-page-bg);
  row-gap: 4px;
}

.dark .ur-box {
  @include github-styles.github-card-shadow("dark");
}

.ur-box-title {
  position: relative;
  display: flex;
  width: 100%;
  align-items: flex-end;
  justify-content: space-between;

  .sign {
    z-index: -1;
    font-size: 14px;
    opacity: 0.8;
  }
}

.ur-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-family: var(--font-title);
}
</style>
