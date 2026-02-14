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
          class="ur-top-btn"
          prepend-icon="mdi-refresh"
          variant="elevated"
          @click="refreshRecord()"
        >
          更新
        </v-btn>
        <v-btn
          :disabled="recordData === undefined"
          class="ur-top-btn"
          prepend-icon="mdi-share"
          variant="elevated"
          @click="shareRecord()"
        >
          分享
        </v-btn>
        <v-btn
          :disabled="recordData === undefined"
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
    <PhCompCard title="数据总览">
      <TurOverviewGrid :model-value="recordData.stats" />
    </PhCompCard>
    <PhCompCard title="角色信息">
      <TurAvatarGrid :model-value="recordData.avatars" />
    </PhCompCard>
    <PhCompCard title="世界探索">
      <TurWorldGrid :worlds="recordData.worldExplore" />
    </PhCompCard>
    <!-- TODO: 优化UI -->
    <PhCompCard title="尘歌壶">
      <TurHomeGrid :model-value="recordData.homes" />
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
import TurHomeGrid from "@comp/userRecord/tur-home-grid.vue";
import TurOverviewGrid from "@comp/userRecord/tur-overview-grid.vue";
import TurRoleInfo from "@comp/userRecord/tur-role-info.vue";
import TurWorldGrid from "@comp/userRecord/tur-world-grid.vue";
import recordReq from "@req/recordReq.js";
import TSUserAccount from "@Sqlm/userAccount.js";
import TSUserRecord from "@Sqlm/userRecord.js";
import useUserStore from "@store/user.js";
import { getVersion } from "@tauri-apps/api/app";
import TGLogger from "@utils/TGLogger.js";
import { generateShareImg } from "@utils/TGShare.js";
import { storeToRefs } from "pinia";
import { onMounted, ref, shallowRef, watch } from "vue";

const userStore = useUserStore();
const { account, cookie } = storeToRefs(userStore);
const uidCur = ref<number>();
const version = ref<string>();
const uidList = shallowRef<Array<number>>([]);
const recordData = shallowRef<TGApp.Sqlite.Record.TableTrans>();

onMounted(async () => {
  await showLoading.start("正在获取战绩数据");
  await TGLogger.Info("[UserRecord][onMounted] 打开角色战绩页面");
  version.value = await getVersion();
  await loadUid();
  await showLoading.end();
});

watch(() => uidCur.value, loadRecord);
watch(
  () => account.value,
  async () => await loadUid(),
);

async function loadUid(uid?: string): Promise<void> {
  uidList.value = await TSUserRecord.getAllUid();
  if (uidList.value.length === 0) uidList.value = [Number(account.value.gameUid)];
  if (uidList.value.includes(Number(account.value.gameUid))) {
    if (uid === undefined) uidCur.value = Number(account.value.gameUid);
  } else {
    uidList.value = [Number(account.value.gameUid), ...uidList.value];
    if (uid === undefined) uidCur.value = uidList.value[0];
  }
}

async function loadRecord(): Promise<void> {
  recordData.value = undefined;
  if (!uidCur.value) return;
  const record = await TSUserRecord.getRecord(uidCur.value);
  if (!record) return;
  recordData.value = record;
  console.log(recordData.value);
}

async function refreshRecord(): Promise<void> {
  let rfAccount = account.value;
  let rfCk = cookie.value;
  if (!uidCur.value) {
    if (!rfCk) {
      showSnackbar.warn("请先登录");
      await TGLogger.Warn(`[UserRecord][refresh][${rfAccount.gameUid}] 未登录`);
      return;
    }
  } else {
    const gcFind = await TSUserAccount.game.getAccountByGid(uidCur.value.toString());
    console.log(uidCur.value, gcFind);
    if (!gcFind) {
      const check = await showDialog.check(
        `确定刷新？`,
        `未找到 ${uidCur.value} 对应 UID，将刷新 ${rfAccount.gameUid} 数据`,
      );
      if (!check) return;
    } else {
      const acFind = await TSUserAccount.account.getAccount(gcFind.uid);
      if (!acFind) {
        const check = await showDialog.check(
          `确定刷新？`,
          `未找到 ${uidCur.value} 对应 CK，将刷新 ${rfAccount.gameUid} 数据`,
        );
        if (!check) return;
      } else {
        rfAccount = gcFind;
        rfCk = acFind.cookie;
      }
    }
  }
  await showLoading.start(`正在刷新${rfAccount.gameUid}的战绩数据`);
  await TGLogger.Info(`[UserRecord][refresh][${rfAccount.gameUid}] 刷新战绩数据`);
  const resp = await recordReq.index(rfCk!, rfAccount);
  console.log(resp);
  if ("retcode" in resp) {
    await showLoading.end();
    showSnackbar.error(`[${resp.retcode}] ${resp.message}`);
    await TGLogger.Error(`[UserRecord][refresh][${rfAccount.gameUid}] 获取战绩数据失败`);
    await TGLogger.Error(
      `[UserRecord][refresh][${rfAccount.gameUid}] ${resp.retcode} ${resp.message}`,
    );
    return;
  }
  await TGLogger.Info(`[UserRecord][refresh][${rfAccount.gameUid}] 获取战绩数据成功`);
  await TGLogger.Info(`[UserRecord][refresh][${rfAccount.gameUid}]`, false);
  await showLoading.update("正在保存战绩数据");
  await TSUserRecord.saveRecord(Number(rfAccount.gameUid), resp);
  await showLoading.update("正在加载战绩数据");
  await loadUid(rfAccount.gameUid);
  await loadRecord();
  await showLoading.end();
  showSnackbar.success(`成功刷新${rfAccount.gameUid}的战绩数据`);
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
  await showLoading.start("正在生成图片", fileName);
  await generateShareImg(fileName, recordBox);
  await showLoading.end();
  await TGLogger.Info(`[UserRecord][shareRecord][${uidCur.value}] 生成分享图片成功`);
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
