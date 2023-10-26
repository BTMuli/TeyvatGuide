<template>
  <ToLoading v-model="loading" :title="loadingTitle" :subtitle="loadingSub" />
  <div class="ur-box">
    <div class="ur-top">
      <div class="ur-top-title">
        <span v-if="!isEmpty">{{ getTitle() }} 更新于 {{ recordData.updated }}</span>
        <span v-else>原神战绩【暂无数据】</span>
      </div>
      <div class="ur-top-btns">
        <v-btn class="ur-top-btn" @click="refresh()">
          <template #prepend>
            <v-icon>mdi-refresh</v-icon>
          </template>
          更新数据
        </v-btn>
        <v-btn class="ur-top-btn" @click="shareRecord()">
          <template #prepend>
            <v-icon>mdi-share</v-icon>
          </template>
          分享
        </v-btn>
      </div>
    </div>
    <TSubLine>数据总览</TSubLine>
    <TurOverviewGrid v-model="recordData.stats" />
    <TSubLine>角色信息</TSubLine>
    <TurAvatarGrid v-model="recordData.avatars" />
    <TSubLine>世界探索</TSubLine>
    <TurWorldGrid v-model="recordData.worldExplore" />
    <TSubLine>尘歌壶</TSubLine>
    <TurHomeGrid v-model="recordData.homes" />
  </div>
</template>
<script lang="ts" setup>
import { computed, onMounted, ref } from "vue";

import showSnackbar from "../../components/func/snackbar";
import TSubLine from "../../components/main/t-subline.vue";
import ToLoading from "../../components/overlay/to-loading.vue";
import TurAvatarGrid from "../../components/userRecord/tur-avatar-grid.vue";
import TurHomeGrid from "../../components/userRecord/tur-home-grid.vue";
import TurOverviewGrid from "../../components/userRecord/tur-overview-grid.vue";
import TurWorldGrid from "../../components/userRecord/tur-world-grid.vue";
import TGSqlite from "../../plugins/Sqlite";
import { useUserStore } from "../../store/modules/user";
import { generateShareImg } from "../../utils/TGShare";
import TGRequest from "../../web/request/TGRequest";

// store
const userStore = useUserStore();
const user = userStore.getCurAccount();

// loading
const loading = ref<boolean>(false);
const loadingTitle = ref<string>();
const loadingSub = ref<string>();

// data
const isEmpty = ref<boolean>(true);
const recordData = ref<TGApp.Sqlite.Record.SingleTable>(<TGApp.Sqlite.Record.SingleTable>{});
const recordCookie = computed<TGApp.BBS.Constant.CookieGroup2>(() => userStore.getCookieGroup2());

onMounted(async () => {
  loadingTitle.value = "正在加载战绩数据";
  loading.value = true;
  await initUserRecordData();
  // 保证图片加载完毕
  setTimeout(() => {
    loading.value = false;
  }, 3000);
});

async function initUserRecordData(): Promise<void> {
  const recordGet = await TGSqlite.getUserRecord(user.gameUid);
  if (recordGet !== false) {
    recordData.value = recordGet;
    isEmpty.value = false;
  } else {
    isEmpty.value = true;
  }
}

async function refresh(): Promise<void> {
  loadingTitle.value = "正在获取战绩数据";
  loading.value = true;
  const res = await TGRequest.User.getRecord(recordCookie.value, user);
  if (!("retcode" in res)) {
    console.log(res);
    loadingTitle.value = "正在保存战绩数据";
    await TGSqlite.saveUserRecord(res, user.gameUid);
    await initUserRecordData();
  } else {
    showSnackbar({
      text: `[${res.retcode}] ${res.message}`,
      color: "error",
    });
    console.error(res);
  }
  loading.value = false;
}

function getTitle(): string {
  const role = <TGApp.Sqlite.Record.Role>JSON.parse(recordData.value.role);
  return `${role.nickname} Lv.${role.level}【${recordData.value.uid}】`;
}

async function shareRecord(): Promise<void> {
  const recordBox = <HTMLElement>document.querySelector(".ur-box");
  const fileName = `【原神战绩】-${user.gameUid}`;
  loadingTitle.value = "正在生成图片";
  loadingSub.value = `${fileName}.png`;
  loading.value = true;
  await generateShareImg(fileName, recordBox);
  loadingSub.value = "";
  loading.value = false;
}
</script>
<style lang="css" scoped>
.ur-box {
  display: flex;
  width: 100%;
  flex-direction: column;
  padding: 10px;
  border-radius: 5px;
  background: var(--box-bg-1);
  row-gap: 5px;
}

.ur-top {
  display: flex;
  width: 100%;
  height: 50px;
  align-items: center;
  justify-content: space-between;
  padding: 10px;
  border-bottom: 1px solid var(--common-shadow-2);
}

.ur-top-title {
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 20px;
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
</style>
