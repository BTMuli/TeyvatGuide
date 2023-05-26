<template>
  <h1>实时便笺、数据总览、世界探索、尘歌壶、札记跳转</h1>
  <!-- todo Invalid uid -->
  <v-btn @click="getInfo1">
    获取用户游戏数据1
  </v-btn>
  <v-btn @click="getInfo2">
    获取用户游戏数据2
  </v-btn>
</template>
<script lang="ts" setup>
// vue
import { computed, onMounted, ref } from "vue";
// store
import { useUserStore } from "../../store/modules/user";
// utils
import TGRequest from "../../web/request/TGRequest";
import TGSqlite from "../../utils/TGSqlite";

// store
const userStore = useUserStore();

// data
const cookie_token = computed(() => userStore.getCookieItem("cookie_token"));
const account_id = computed(() => userStore.getCookieItem("account_id"));
const ltoken = computed(() => userStore.getCookieItem("ltoken"));
const ltuid = computed(() => userStore.getCookieItem("ltuid"));
const user = ref({} as TGApp.Sqlite.Account.Game);

onMounted(async () => {
  const curUser = await TGSqlite.getCurAccount();
  if (curUser) {
    user.value = curUser;
  }
  console.log(user.value);
});

async function getInfo1 () {
  const ck = {
    cookie_token: cookie_token.value,
    account_id: account_id.value,
  };
  console.log(ck);
  const res = await TGRequest.User.getCard(ck, user.value);
  console.log(res);
}

async function getInfo2 () {
  const ck = {
    ltoken: ltoken.value,
    ltuid: ltuid.value,
  };
  console.log(ck);
  const res = await TGRequest.User.getCard(ck, user.value);
  console.log(res);
}
</script>
<style lang="css" scoped>
</style>
