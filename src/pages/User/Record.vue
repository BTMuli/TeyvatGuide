<template>
  <v-app-bar>
    <template #prepend>
      <div class="ur-top-title">
        <img alt="icon" src="/source/UI/userRecord.webp" />
        <span>原神战绩</span>
        <v-select
          density="compact"
          variant="outlined"
          v-model="uidCur"
          :items="uidList"
          :hide-details="true"
          label="游戏UID"
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
      <TurRoleInfo :role="recordData.role" :uid="uidCur ?? 0" />
      <span class="sign">
        原神战绩|Render by TeyvatGuide v{{ version }}|更新于 {{ recordData.updated }}
      </span>
    </div>
    <PhCompCard>
      <template #title>数据总览</template>
      <TurOverviewGrid :model-value="recordData.stats" />
    </PhCompCard>
    <PhCompCard>
      <template #title>角色信息</template>
      <TurAvatarGrid :model-value="recordData.avatars" />
    </PhCompCard>
    <PhCompCard>
      <template #title>世界探索</template>
      <TurWorldGrid :model-value="recordData.worldExplore" />
    </PhCompCard>
    <PhCompCard>
      <template #title>尘歌壶</template>
      <TurHomeGrid :model-value="recordData.homes" />
    </PhCompCard>
  </div>
  <div class="ur-empty" v-else>
    <img alt="empty" src="/source/UI/empty.webp" />
    <span>DATA NOT FOUND</span>
  </div>
</template>
<script lang="ts" setup>
import showDialog from "@comp/func/dialog.js";
import showLoading from "@comp/func/loading.js";
import showSnackbar from "@comp/func/snackbar.js";
import PhCompCard from "@comp/pageHome/ph-comp-card.vue";
import TurAvatarGrid from "@comp/userRecord/tur-avatar-grid.vue";
import TurHomeGrid from "@comp/userRecord/tur-home-grid.vue";
import TurOverviewGrid from "@comp/userRecord/tur-overview-grid.vue";
import TurRoleInfo from "@comp/userRecord/tur-role-info.vue";
import TurWorldGrid from "@comp/userRecord/tur-world-grid.vue";
import TSUserRecord from "@Sqlite/modules/userRecord.js";
import { getVersion } from "@tauri-apps/api/app";
import { storeToRefs } from "pinia";
import { onMounted, ref, shallowRef, watch } from "vue";

import { useUserStore } from "@/store/modules/user.js";
import TGLogger from "@/utils/TGLogger.js";
import { generateShareImg } from "@/utils/TGShare.js";
import TakumiRecordGenshinApi from "@/web/request/recordReq.js";

const userStore = useUserStore();
const { account, cookie } = storeToRefs(userStore);
const uidCur = ref<number>();
const version = ref<string>();
const uidList = shallowRef<Array<number>>([]);
const recordData = shallowRef<TGApp.Sqlite.Record.RenderData>();

onMounted(async () => {
  await showLoading.start("正在获取战绩数据");
  await TGLogger.Info("[UserRecord][onMounted] 打开角色战绩页面");
  version.value = await getVersion();
  await loadUid();
  await showLoading.end();
});

watch(() => uidCur.value, loadRecord);

async function loadUid(): Promise<void> {
  uidList.value = await TSUserRecord.getAllUid();
  if (uidList.value.length === 0) uidList.value = [Number(account.value.gameUid)];
  if (uidList.value.includes(Number(account.value.gameUid))) {
    uidCur.value = Number(account.value.gameUid);
  } else uidCur.value = uidList.value[0];
}

async function loadRecord(): Promise<void> {
  recordData.value = undefined;
  if (!uidCur.value) return;
  const record = await TSUserRecord.getRecord(uidCur.value);
  if (!record) return;
  recordData.value = record;
}

async function refreshRecord(): Promise<void> {
  if (!cookie.value) {
    showSnackbar.warn("请先登录");
    await TGLogger.Warn(`[UserRecord][refresh][${account.value.gameUid}] 未登录`);
    return;
  }
  if (uidCur.value && uidCur.value.toString() !== account.value.gameUid) {
    const switchCheck = await showDialog.check(
      "是否切换游戏账户",
      `确认则尝试切换至${uidCur.value}`,
    );
    if (switchCheck) {
      await userStore.switchGameAccount(uidCur.value.toString());
      await refreshRecord();
      return;
    }
    const freshCheck = await showDialog.check(
      "是否刷新战绩数据",
      `用户${account.value.gameUid}与当前UID${uidCur.value}不一致`,
    );
    if (!freshCheck) {
      showSnackbar.cancel("已取消战绩数据刷新");
      return;
    }
  }
  await showLoading.start(`正在刷新${account.value.gameUid}的战绩数据`);
  await TGLogger.Info(`[UserRecord][refresh][${account.value.gameUid}] 刷新战绩数据`);
  const res = await TakumiRecordGenshinApi.index(cookie.value, account.value);
  if ("retcode" in res) {
    await showLoading.end();
    showSnackbar.error(`[${res.retcode}] ${res.message}`);
    await TGLogger.Error(`[UserRecord][refresh][${account.value.gameUid}] 获取战绩数据失败`);
    await TGLogger.Error(
      `[UserRecord][refresh][${account.value.gameUid}] ${res.retcode} ${res.message}`,
    );
    return;
  }
  await TGLogger.Info(`[UserRecord][refresh][${account.value.gameUid}] 获取战绩数据成功`);
  await TGLogger.Info(`[UserRecord][refresh][${account.value.gameUid}]`, false);
  console.log(res);
  await showLoading.update("正在保存战绩数据");
  await TSUserRecord.saveRecord(Number(account.value.gameUid), res);
  await showLoading.update("正在加载战绩数据");
  await loadUid();
  await loadRecord();
  await showLoading.end();
  showSnackbar.success(`成功刷新${account.value.gameUid}的战绩数据`);
}

async function shareRecord(): Promise<void> {
  if (!recordData.value) {
    showSnackbar.warn("未找到战绩数据，请尝试刷新");
    return;
  }
  await TGLogger.Info(`[UserRecord][shareRecord][${account.value.gameUid}] 生成分享图片`);
  const recordBox = document.querySelector<HTMLElement>(".ur-box");
  if (recordBox === null) {
    showSnackbar.error("未找到战绩数据，请尝试刷新");
    return;
  }
  const fileName = `【原神战绩】-${account.value.gameUid}.png`;
  await showLoading.start("正在生成图片", fileName);
  await generateShareImg(fileName, recordBox);
  await showLoading.end();
  await TGLogger.Info(`[UserRecord][shareRecord][${account.value.gameUid}] 生成分享图片成功`);
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
  margin-left: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
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
  margin-right: 16px;
  gap: 8px;
}

.ur-top-btn {
  border-radius: 4px;
  background: var(--tgc-btn-1);
  color: var(--btn-text);
  font-family: var(--font-text);
}

.dark .ur-top-btn {
  border: 1px solid var(--common-shadow-2);
}

.ur-box {
  @include github-styles.github-card-shadow();

  position: relative;
  display: flex;
  flex-direction: column;
  padding: 8px;
  box-sizing: border-box;
  border: 1px solid var(--common-shadow-2);
  border-radius: 4px;
  row-gap: 4px;
  background: var(--app-page-bg);
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
