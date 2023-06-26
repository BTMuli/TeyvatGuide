<template>
  <ToLoading v-model="loading" :title="loadingTitle" />
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
const loading = ref(false);
const loadingTitle = ref("");

// data
const isEmpty = ref(true);
const recordData = ref({} as TGApp.Sqlite.Record.SingleTable);
const recordCookie = computed(() => userStore.getCookieGroup2() as Record<string, string>);
const user = computed(() => userStore.getCurAccount());

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
  if (!res.hasOwnProperty("retcode")) {
    const data = res as TGApp.Game.Record.FullData;
    loadingTitle.value = "正在保存战绩数据";
    await TGSqlite.saveUserRecord(data, user.value.gameUid);
    await initUserRecordData();
  } else {
    console.error(res);
  }
  loading.value = false;
}

function getTitle() {
  const role = JSON.parse(recordData.value.role) as TGApp.Sqlite.Record.Role;
  return `${role.nickname} Lv.${role.level}【${recordData.value.uid}】`;
}

async function shareRecord() {
  const recordBox = document.querySelector(".ur-box") as HTMLElement;
  const fileName = `【原神战绩】-${user.value.gameUid}`;
  await generateShareImg(fileName, recordBox);
}

function getTheme() {
  let theme = localStorage.getItem("theme");
  if (theme) {
    theme = JSON.parse(theme).theme;
  }
  return theme || "default";
}
</script>
<style lang="css" scoped>
.ur-box {
  width: 100%;
  border-radius: 5px;
  padding: 10px;
  box-shadow: 0 0 10px var(--common-shadow-4);
}

.ur-top {
  width: 100%;
  height: 50px;
  border-radius: 5px;
  padding: 10px;
  display: flex;
  align-items: center;
}

.ur-top-title {
  font-family: var(--font-title);
  font-size: 20px;
  margin-right: 10px;
  color: var(--common-text-title);
}

.ur-top-btn {
  font-family: var(--font-text);
  border-radius: 5px;
  background: var(--common-shadow-2);
  color: var(--common-color-white);
  margin-left: 15px;
}
</style>
