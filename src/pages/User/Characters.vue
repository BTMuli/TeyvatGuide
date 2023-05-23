<template>
  <h1>角色数据获取、展示、详情</h1>
  <v-btn @click="getRoleList">
    获取角色列表
  </v-btn>
  {{ roleList }}
</template>
<script lang="ts" setup>
// vue
import { onMounted, ref } from "vue";
// store
import { useUserStore } from "../../store/modules/user";
// request
import TGRequest from "../../web/request/TGRequest";
// utils
import TGSqlite from "../../utils/TGSqlite";

const userStore = useUserStore();
const roleList = ref([]);

// data
const characterCookie = ref({
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
  characterCookie.value = {
    cookie_token: userStore.getCookieItem("cookie_token"),
    account_id: userStore.getCookieItem("account_id"),
    ltoken: userStore.getCookieItem("ltoken"),
    ltuid: userStore.getCookieItem("ltuid"),
  };
});

async function getRoleList () {
  const res = await TGRequest.User.byLToken.getRoleList(characterCookie.value, user.value);
  console.log(res);
}
</script>
<style lang="css" scoped>
</style>
