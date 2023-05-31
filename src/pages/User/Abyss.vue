<template>
  <ToLoading v-model="loading" :title="loadingTitle" />
  <v-tabs v-model="abyssTab" align-tabs="start" class="abyss-tab">
    <v-tab value="record">
      深渊统计
    </v-tab>
    <v-tab value="user">
      深渊记录
    </v-tab>
  </v-tabs>
  <v-window v-model="abyssTab">
    <v-window-item value="record">
      <h1>胡桃深渊数据统计</h1>
    </v-window-item>
    <v-window-item value="user" class="user-window">
      <v-tabs v-model="userTab" direction="vertical" align-tabs="start" class="ua-tab">
        <v-tab v-for="item in localAbyss" :key="item.id" :value="item.id" @click="toAbyss(item.id)">
          第  {{ item.id }} 期
        </v-tab>
      </v-tabs>
      <v-window v-model="userTab" class="ua-window">
        <v-window-item v-for="item in localAbyss" :key="item.id" :value="item.id">
          <h1>第 {{ item.id }} 期</h1>
          {{ JSON.stringify(curAbyss) }}
        </v-window-item>
      </v-window>
    </v-window-item>
  </v-window>
</template>
<script lang="ts" setup>
// vue
import { onMounted, ref } from "vue";
import ToLoading from "../../components/overlay/to-loading.vue";
// store
import { useUserStore } from "../../store/modules/user";
// utils
import TGRequest from "../../web/request/TGRequest";
import TGSqlite from "../../plugins/Sqlite";

// store
const userStore = useUserStore();
// loading
const loading = ref(true);
const loadAbyss = ref(false);
const loadingTitle = ref("");

// data
const abyssNow = ref(true);
const abyssTab = ref("");
const userTab = ref("");
const abyssCookie = ref({
  cookie_token: "",
  account_id: "",
  ltoken: "",
  ltuid: "",
});
const user = ref({} as TGApp.Sqlite.Account.Game);

const localAbyss = ref([] as TGApp.Sqlite.Abyss.SingleTable[]);
const localAbyssID = ref([] as number[]);
const curAbyss = ref({} as TGApp.Sqlite.Abyss.SingleTable);

onMounted(async () => {
  loadingTitle.value = "正在加载深渊数据";
  const curUser = await TGSqlite.getCurAccount();
  if (curUser) {
    user.value = curUser;
  }
  abyssCookie.value = {
    cookie_token: userStore.getCookieItem("cookie_token"),
    account_id: userStore.getCookieItem("account_id"),
    ltoken: userStore.getCookieItem("ltoken"),
    ltuid: userStore.getCookieItem("ltuid"),
  };
  localAbyss.value = await TGSqlite.getAbyss();
  localAbyss.value.forEach((item) => {
    localAbyssID.value.push(item.id);
  });
  curAbyss.value = localAbyss.value[0];
  loading.value = false;
});

async function getAbyssData (): Promise<void> {
  loadAbyss.value = true;
  const schedule = abyssNow.value ? "1" : "2";
  console.log(schedule);
  const res = await TGRequest.User.byCookie.getAbyss(abyssCookie.value, schedule, user.value);
  console.log(res);
  loadAbyss.value = false;
}

function toAbyss (id: number): void {
  curAbyss.value = localAbyss.value.find((item) => item.id === id)!;
}
</script>
<style lang="css" scoped>
.abyss-tab {
  font-family: Genshin, serif;
  margin-bottom: 20px;
  color: var(--content-text-3);
}

.user-window {
  background: rgb(0 0 0 / 10%);
  display: flex;
  justify-content: left;
  align-items: center;
  height: calc(100vh - 100px);
}

.ua-window {
  padding: 10px;
  width: calc(100% - 100px);
  height: 100%;
  overflow-y: auto;
}

.ua-tab {
  font-family: Genshin-Light, serif;
  color: var(--content-text-3);
  width: 100px;
  height: 100%;
}
</style>
