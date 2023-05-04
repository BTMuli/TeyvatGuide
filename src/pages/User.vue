<template>
  <h1>用户页</h1>
  <div class="testDiv">
    <v-btn @click="getTokens">
      获取 Tokens
    </v-btn>
    <v-btn @click="saveToken">
      保存 Token 到数据库
    </v-btn>
  </div>
</template>
<script setup lang="ts">
// vue
import { onMounted, ref } from "vue";
// tauri
import { dialog } from "@tauri-apps/api";
// utils
import TGRequest from "../core/request/TGRequest";
import TGSqlite from "../utils/TGSqlite";

const cookie = ref({} as BTMuli.User.Base.Cookie);
const tokens = ref([] as BTMuli.User.Base.TokenItem[]);

export interface tokenRes {
  name: string;
  token: string;
}

onMounted(async () => {
  cookie.value = JSON.parse(await TGSqlite.getCookie()) as BTMuli.User.Base.Cookie;
});

async function getTokens () {
  const tokenRes = await TGRequest.User.getTokens(cookie.value);
  if (Array.isArray(tokenRes)) tokens.value = tokenRes;
  else {
    console.log(tokenRes);
    tokens.value = [];
    await dialog.message(
      tokenRes.message,
      {
        type: "error",
        title: `获取 Token 失败,retcode: ${tokenRes.retcode}`,
      },
    );
  }
}

async function saveToken () {
  console.log(tokens.value);
  const lToken = tokens.value.find((item) => item.name === "ltoken");
  const sToken = tokens.value.find((item) => item.name === "stoken");
  if (lToken) await TGSqlite.saveAppData("ltoken", lToken.token);
  if (sToken) await TGSqlite.saveAppData("stoken", sToken.token);
  console.log("保存成功");
}

</script>
<style scoped>
.testDiv {
  display: flex;
  flex-direction: row;
  justify-content: space-around;
}
</style>
