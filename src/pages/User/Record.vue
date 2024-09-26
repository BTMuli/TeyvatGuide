<template>
  <ToLoading v-model="loading" :title="loadingTitle" :subtitle="loadingSub" />
  <v-app-bar>
    <template #prepend>
      <div class="ur-top-title">
        <img alt="icon" src="/source/UI/userRecord.webp" />
        <span>原神战绩</span>
        <v-select
          variant="outlined"
          v-model="uidCur"
          :items="uidList"
          :hide-details="true"
          title="游戏UID"
        />
      </div>
    </template>
    <template #append>
      <div class="ur-top-btns">
        <v-btn prepend-icon="mdi-refresh" class="ur-top-btn" @click="refreshRecord()">更新</v-btn>
        <v-btn
          prepend-icon="mdi-share"
          class="ur-top-btn"
          @click="shareRecord()"
          :disabled="recordData === undefined"
        >
          分享
        </v-btn>
        <v-btn
          prepend-icon="mdi-delete"
          class="ur-top-btn"
          @click="deleteRecord()"
          :disabled="recordData === undefined"
        >
          删除
        </v-btn>
      </div>
    </template>
  </v-app-bar>
  <div class="ur-box" v-if="recordData">
    <div class="ur-box-title">
      <TurRoleInfo :model-value="recordData.role" :uid="uidCur ?? 0" />
      <span>Render by TeyvatGuide v{{ version }}</span>
    </div>
    <TSubLine>数据总览</TSubLine>
    <TurOverviewGrid :model-value="recordData.stats" />
    <TSubLine>角色信息</TSubLine>
    <TurAvatarGrid :model-value="recordData.avatars" />
    <TSubLine>世界探索</TSubLine>
    <TurWorldGrid :model-value="recordData.worldExplore" />
    <TSubLine>尘歌壶</TSubLine>
    <TurHomeGrid :model-value="recordData.homes" />
  </div>
  <div class="ur-empty" v-else>
    <img alt="empty" src="/source/UI/empty.webp" />
    <span>DATA NOT FOUND</span>
  </div>
</template>
<script lang="ts" setup>
import { getVersion } from "@tauri-apps/api/app";
import { storeToRefs } from "pinia";
import { computed, onMounted, ref, watch } from "vue";

import showConfirm from "../../components/func/confirm.js";
import showSnackbar from "../../components/func/snackbar.js";
import TSubLine from "../../components/main/t-subline.vue";
import ToLoading from "../../components/overlay/to-loading.vue";
import TurAvatarGrid from "../../components/userRecord/tur-avatar-grid.vue";
import TurHomeGrid from "../../components/userRecord/tur-home-grid.vue";
import TurOverviewGrid from "../../components/userRecord/tur-overview-grid.vue";
import TurRoleInfo from "../../components/userRecord/tur-role-info.vue";
import TurWorldGrid from "../../components/userRecord/tur-world-grid.vue";
import TSUserRecord from "../../plugins/Sqlite/modules/userRecord.js";
import { useUserStore } from "../../store/modules/user.js";
import TGLogger from "../../utils/TGLogger.js";
import { generateShareImg } from "../../utils/TGShare.js";
import TGRequest from "../../web/request/TGRequest.js";

// store
const userStore = storeToRefs(useUserStore());
const user = computed<TGApp.Sqlite.Account.Game>(() => userStore.account.value);

// loading
const loading = ref<boolean>(false);
const loadingTitle = ref<string>();
const loadingSub = ref<string>();

// data
const uidCur = ref<number>();
const uidList = ref<number[]>([]);
const recordData = ref<TGApp.Sqlite.Record.RenderData>();
const version = ref<string>();

onMounted(async () => {
  await TGLogger.Info("[UserRecord][onMounted] 打开角色战绩页面");
  loadingTitle.value = "正在加载战绩数据";
  loading.value = true;
  version.value = await getVersion();
  await loadUid();
  loading.value = false;
});

watch(
  () => uidCur.value,
  async () => await loadRecord(),
);

async function loadUid(): Promise<void> {
  uidList.value = await TSUserRecord.getAllUid();
  if (uidList.value.length === 0) uidList.value = [Number(user.value.gameUid)];
  if (uidList.value.includes(Number(user.value.gameUid))) {
    uidCur.value = Number(user.value.gameUid);
  } else {
    uidCur.value = uidList.value[0];
  }
}

async function loadRecord(): Promise<void> {
  recordData.value = undefined;
  if (!uidCur.value) return;
  const record = await TSUserRecord.getRecord(uidCur.value);
  if (!record) return;
  recordData.value = record;
}

async function refreshRecord(): Promise<void> {
  if (!user.value) return;
  if (uidCur.value && uidCur.value.toString() !== user.value.gameUid) {
    const switchConfirm = await showConfirm({
      title: "是否切换游戏账户",
      text: `确认则尝试切换至${uidCur.value}`,
    });
    if (switchConfirm) {
      await useUserStore().switchGameAccount(uidCur.value.toString());
      await refreshRecord();
      return;
    }
    const confirm = await showConfirm({
      title: "确定刷新？",
      text: `用户${user.value.gameUid}与当前UID${uidCur.value}不一致`,
    });
    if (!confirm) {
      showSnackbar({ text: "已取消战绩数据刷新", color: "cancel" });
      return;
    }
  }
  await TGLogger.Info(`[UserRecord][refresh][${user.value.gameUid}] 刷新战绩数据`);
  loadingTitle.value = "正在获取战绩数据";
  loading.value = true;
  if (!userStore.cookie.value) {
    showSnackbar({ text: "请先登录", color: "error" });
    loading.value = false;
    await TGLogger.Warn(`[UserRecord][refresh][${user.value.gameUid}] 未登录`);
    return;
  }
  const cookie = {
    account_id: userStore.cookie.value.account_id,
    cookie_token: userStore.cookie.value.cookie_token,
  };
  const res = await TGRequest.User.getRecord(cookie, user.value);
  if (!("retcode" in res)) {
    await TGLogger.Info(`[UserRecord][refresh][${user.value.gameUid}] 获取战绩数据成功`);
    await TGLogger.Info(`[UserRecord][refresh][${user.value.gameUid}]`, false);
    await TGLogger.Info(JSON.stringify(res), false);
    loadingTitle.value = "正在保存战绩数据";
    await TSUserRecord.saveRecord(Number(user.value.gameUid), res);
    await loadUid();
    await loadRecord();
    if (recordData.value === undefined) await loadRecord();
  } else {
    showSnackbar({ text: `[${res.retcode}] ${res.message}`, color: "error" });
    await TGLogger.Error(`[UserRecord][refresh][${user.value.gameUid}] 获取战绩数据失败`);
    await TGLogger.Error(
      `[UserRecord][refresh][${user.value.gameUid}] ${res.retcode} ${res.message}`,
    );
  }
  loading.value = false;
}

async function shareRecord(): Promise<void> {
  if (!recordData.value) {
    showSnackbar({ text: "未找到战绩数据，请尝试刷新", color: "warn" });
    return;
  }
  await TGLogger.Info(`[UserRecord][shareRecord][${user.value.gameUid}] 生成分享图片`);
  const recordBox = <HTMLElement>document.querySelector(".ur-box");
  const fileName = `【原神战绩】-${user.value.gameUid}`;
  loadingTitle.value = "正在生成图片";
  loadingSub.value = `${fileName}.png`;
  loading.value = true;
  await generateShareImg(fileName, recordBox);
  loadingSub.value = "";
  loading.value = false;
  await TGLogger.Info(`[UserRecord][shareRecord][${user.value.gameUid}] 生成分享图片成功`);
}

async function deleteRecord(): Promise<void> {
  if (!uidCur.value) {
    showSnackbar({ text: "未找到当前UID", color: "error" });
    return;
  }
  const confirm = await showConfirm({
    title: "确定删除？",
    text: `将删除${uidCur.value}对应的战绩数据`,
  });
  if (!confirm) {
    showSnackbar({ text: "已取消删除战绩数据", color: "cancel" });
    return;
  }
  await TSUserRecord.deleteUid(uidCur.value);
  showSnackbar({ text: `成功删除${uidCur.value}的战绩数据` });
  await loadUid();
  await loadRecord();
}
</script>
<style lang="css" scoped>
.ur-top-title {
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

.ur-top-btns {
  display: flex;
  gap: 15px;
}

.ur-top-btn {
  border-radius: 5px;
  background: var(--tgc-btn-1);
  color: var(--btn-text);
  font-family: var(--font-text);
}

.ur-box {
  display: flex;
  flex-direction: column;
  padding: 10px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 5px;
  background: var(--box-bg-1);
  row-gap: 5px;
}

.ur-box-title {
  display: flex;
  width: 100%;
  align-items: flex-end;
  justify-content: space-between;
}

.ur-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-family: var(--font-title);
}
</style>
