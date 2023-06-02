<template>
  <ToLoading v-model="loading" :title="loadingTitle" />
  <div class="ur-box">
    <div class="ur-top">
      <div class="ur-top-title">
        <span v-if="recordData.role">{{ getTitle() }}</span>
        <span v-else>原神战绩</span>
        更新于 {{ recordData.updated }}
      </div>
      <v-btn variant="outlined" class="ur-top-btn" @click="refresh">
        更新数据
      </v-btn>
    </div>
    <div class="ur-sub-title">
      <img src="/src/assets/icons/arrow-right.svg" alt="overview">
      <span>数据总览</span>
    </div>
    <TurOverviewGrid v-if="recordData.stats" :model-value="recordData.stats" />
    <div class="ur-sub-title">
      <img src="/src/assets/icons/arrow-right.svg" alt="overview">
      <span>我的角色</span>
    </div>
    <div v-if="recordData.avatars" class="ur-avatar-grid">
      <TibUrAvatar v-for="avatar in JSON.parse(recordData.avatars) as TGApp.Sqlite.Record.Avatar[]" :key="avatar.id" :model-value="avatar" />
    </div>
    <div class="ur-sub-title">
      <img src="/src/assets/icons/arrow-right.svg" alt="overview">
      <span>世界探索</span>
    </div>
    {{ recordData.worldExplore }}
    <div class="ur-sub-title">
      <img src="/src/assets/icons/arrow-right.svg" alt="overview">
      <span>尘歌壶</span>
    </div>
    {{ recordData.homes }}
  </div>
</template>
<script lang="ts" setup>
// vue
import { computed, onMounted, ref } from "vue";
import ToLoading from "../../components/overlay/to-loading.vue";
import TurOverviewGrid from "../../components/userRecord/tur-overview-grid.vue";
import TibUrAvatar from "../../components/itembox/tib-ur-avatar.vue";
// store
import { useUserStore } from "../../store/modules/user";
// utils
import TGRequest from "../../web/request/TGRequest";
import TGSqlite from "../../plugins/Sqlite";

// store
const userStore = useUserStore();

// loading
const loading = ref(false);
const loadingTitle = ref("");

// data
const recordData = ref({} as TGApp.Sqlite.Record.SingleTable);
const recordCookie = computed(() => userStore.getCookieGroup2() as Record<string, string>);
const user = computed(() => userStore.getCurAccount());

onMounted(async () => {
  loadingTitle.value = "正在加载战绩数据";
  loading.value = true;
  await initUserRecordData();
  loading.value = false;
});

async function initUserRecordData () {
  const recordGet = await TGSqlite.getUserRecord(user.value.gameUid);
  if (recordGet !== false) {
    recordData.value = recordGet;
  }
}

async function refresh () {
  loadingTitle.value = "正在获取战绩数据";
  loading.value = true;
  const res = await TGRequest.User.getRecord(recordCookie.value, user.value);
  if (!res.hasOwnProperty("retcode")) {
    const data = res as TGApp.Game.Record.FullData;
    loadingTitle.value = "正在保存战绩数据";
    await TGSqlite.saveUserRecord(data, user.value.gameUid);
    await initUserRecordData();
  }
  loading.value = false;
}

function getTitle () {
  const role = JSON.parse(recordData.value.role) as TGApp.Sqlite.Record.Role;
  return `${role.nickname} [Lv.${role.level}] [${recordData.value.uid}]`;
}
</script>
<style lang="css" scoped>
.ur-box {
  width: 100%;
  border-radius: 5px;
  padding: 10px;
  box-shadow: 0 0 10px rgb(0 0 0 / 40%);
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
  font-family: Genshin, sans-serif;
  font-size: 20px;
  margin-right: 10px;
  color: rgb(255 255 255 / 80%);
  text-shadow: 0 0 10px rgb(0 0 0 / 80%);
}

.ur-top-btn {
  font-family: Genshin-Light, serif;
  border-radius: 5px;
  background: #393b40;
  color: #faf7e8;
  margin-left: auto;
}

.ur-sub-title {
  background: rgb(0 0 0 / 20%);
  display: flex;
  align-items: center;
  height: 30px;
  padding: 0 10px;
  margin: 5px 0;
  border-radius: 5px;
  font-family: Genshin-Light, serif;
  color: rgb(255 255 255 / 80%);
  text-shadow: 0 0 10px rgb(0 0 0 / 80%);
}

.ur-sub-title img {
  width: 20px;
  height: 20px;
  margin-right: 5px;
}

.ur-avatar-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  grid-gap: 10px;
  margin-bottom: 10px;
}
</style>
