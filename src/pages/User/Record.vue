<template>
  <ToLoading v-model="loading" :title="loadingTitle" :subtitle="loadingSub" />
  <div class="ur-box">
    <div class="ur-top">
      <div class="ur-top-title">
        <span v-if="!isEmpty">{{ getTitle() }} 更新于 {{ recordData.updated }}</span>
        <span v-else>原神战绩【暂无数据】【{{ user.gameUid }}】</span>
      </div>
      <v-btn variant="outlined" class="ur-top-btn" @click="refresh()">
        <template #prepend>
          <v-icon>mdi-refresh</v-icon>
        </template>
        更新数据
      </v-btn>
      <v-btn variant="outlined" class="ur-top-btn" @click="shareRecord()">
        <template #prepend>
          <v-icon>mdi-share</v-icon>
        </template>
        分享
      </v-btn>
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
// vue
import { computed, onMounted, ref } from "vue";
import ToLoading from "../../components/overlay/to-loading.vue";
import TSubLine from "../../components/main/t-subline.vue";
import TurOverviewGrid from "../../components/userRecord/tur-overview-grid.vue";
import TurAvatarGrid from "../../components/userRecord/tur-avatar-grid.vue";
import TurWorldGrid from "../../components/userRecord/tur-world-grid.vue";
import TurHomeGrid from "../../components/userRecord/tur-home-grid.vue";
// store
import { useUserStore } from "../../store/modules/user";
// utils
import TGRequest from "../../web/request/TGRequest";
import TGSqlite from "../../plugins/Sqlite";
import { generateShareImg } from "../../utils/TGShare";

// store
const userStore = useUserStore();

// loading
const loading = ref<boolean>(false);
const loadingTitle = ref<string>();
const loadingSub = ref<string>();

// data
const isEmpty = ref<boolean>(true);
const recordData = ref<TGApp.Sqlite.Record.SingleTable>(<TGApp.Sqlite.Record.SingleTable>{});
const recordCookie = computed<TGApp.BBS.Constant.CookieGroup2>(() => userStore.getCookieGroup2());
const user = computed<TGApp.Sqlite.Account.Game>(() => userStore.getCurAccount());

onMounted(async () => {
  loadingTitle.value = "正在加载战绩数据";
  loading.value = true;
  await initUserRecordData();
  // 保证图片加载完毕
  setTimeout(() => {
    loading.value = false;
  }, 3000);
});

async function initUserRecordData() {
  const recordGet = await TGSqlite.getUserRecord(user.value.gameUid);
  if (recordGet !== false) {
    recordData.value = recordGet;
    isEmpty.value = false;
  } else {
    isEmpty.value = true;
  }
}

async function refresh() {
  loadingTitle.value = "正在获取战绩数据";
  loading.value = true;
  const res = await TGRequest.User.getRecord(recordCookie.value, user.value);
  if (!("retcode" in res)) {
    loadingTitle.value = "正在保存战绩数据";
    await TGSqlite.saveUserRecord(res, user.value.gameUid);
    await initUserRecordData();
  } else {
    console.error(res);
  }
  loading.value = false;
}

function getTitle() {
  const role = <TGApp.Sqlite.Record.Role>JSON.parse(recordData.value.role);
  return `${role.nickname} Lv.${role.level}【${recordData.value.uid}】`;
}

async function shareRecord() {
  const recordBox = <HTMLElement>document.querySelector(".ur-box");
  const fileName = `【原神战绩】-${user.value.gameUid}`;
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
  width: 100%;
  padding: 10px;
  border-radius: 5px;
  box-shadow: 0 0 10px var(--common-shadow-4);
}

.ur-top {
  display: flex;
  width: 100%;
  height: 50px;
  align-items: center;
  padding: 10px;
  border-radius: 5px;
}

.ur-top-title {
  margin-right: 10px;
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 20px;
}

.ur-top-btn {
  border-radius: 5px;
  margin-left: 15px;
  background: var(--common-shadow-2);
  color: var(--common-color-white);
  font-family: var(--font-text);
}
</style>
