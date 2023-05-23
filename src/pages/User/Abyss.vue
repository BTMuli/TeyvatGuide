<template>
  <h1>深渊数据获取、显示、上传</h1>
  <v-btn @click="getCurAbyss()">
    获取当期深渊数据
  </v-btn>
  <v-btn @click="getLastAbyss()">
    获取上期深渊数据
  </v-btn>
</template>
<script lang="ts" setup>
// vue
import { onMounted, ref } from "vue";
// store
import { useUserStore } from "../../store/modules/user";
// request
import TGRequest from "../../web/request/TGRequest";
import TGSqlite from "../../utils/TGSqlite";

// store
const userStore = useUserStore();

// data
const abyssCookie = ref({
  cookie_token: "",
  account_id: "",
  ltoken: "",
  ltuid: "",
});
const user = ref({} as TGApp.Sqlite.Account.Game);

onMounted(async () => {
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
});

async function getAbyssData (schedule:string): Promise<void> {
  const res = await TGRequest.User.byCookie.getAbyss(abyssCookie.value, schedule, user.value);
  if (res.hasOwnProperty("retcode")) {
    const warn = res as TGApp.BBS.Response.Base;
    console.warn(warn);
  } else {
    console.log(res);
  }
}

async function getCurAbyss (): Promise<void> {
  await getAbyssData("1");
}

async function getLastAbyss (): Promise<void> {
  await getAbyssData("2");
}

</script>
<style lang="css" scoped>
</style>
