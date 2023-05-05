<template>
  <h1>用户页</h1>
  <div class="testDiv">
    <v-btn @click="updateTokens">
      更新 Tokens
    </v-btn>
    <v-btn @click="vertifyStoken">
      验证 stoken
    </v-btn>
    <v-btn @click="getLToken">
      获取 ltoken
    </v-btn>
    <v-btn @click="getUserGameCard">
      获取游戏数据
    </v-btn>
    <v-btn @click="getBindRole">
      获取绑定角色
    </v-btn>
    <v-btn @click="getBindRoleV2">
      获取绑定角色 v2
    </v-btn>
    <v-btn @click="getCookieToken">
      获取 cookieToken
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
import TGUtils from "../core/utils/TGUtils";

const cookie = ref({} as BTMuli.User.Base.Cookie);

export interface tokenRes {
  name: string;
  token: string;
}

onMounted(async () => {
  const getCookie = await TGSqlite.getDataByKey("AppData", "key", "cookie") as Array<{
    key: string;
    value: string;
    updated: string;
  }>;
  cookie.value = JSON.parse(getCookie[0].value) as BTMuli.User.Base.Cookie;
});

// 根据获取到的 cookie.login_ticket 获取 stoken 和 ltoken
async function updateTokens () {
  const tokenRes = await TGRequest.User.byLoginTicket.getLTokens(cookie.value);
  console.log(tokenRes);
  if (Array.isArray(tokenRes)) {
    const lToken = tokenRes.find((item) => item.name === "ltoken");
    const sToken = tokenRes.find((item) => item.name === "stoken");
    if (lToken) await TGSqlite.saveAppData("ltoken", lToken.token);
    if (sToken) await TGSqlite.saveAppData("stoken", sToken.token);
  } else {
    await dialog.message(
      tokenRes.message,
      {
        type: "error",
        title: `获取 Token 失败,retcode: ${tokenRes.retcode}`,
      },
    );
  }
}

// 验证 stoken 的有效性
async function vertifyStoken () {
  // 获取 stoken
  const stoken = (await TGSqlite.getDataByKey("AppData", "key", "stoken") as unknown as Array<{
    key: string;
    value: string;
  }>)[0].value as string;
  console.log("stoken", stoken);
  const vertifyRes = await TGRequest.User.bySToken.vertify(cookie.value, stoken);
  console.log(vertifyRes);
}

// 获取 ltoken
async function getLToken () {
  const stoken = (await TGSqlite.getDataByKey("AppData", "key", "stoken") as unknown as Array<{
    key: string;
    value: string;
  }>)[0].value as string;
  console.log("stoken", stoken);
  const tokenRes = await TGRequest.User.bySToken.getLToken(cookie.value, stoken);
  console.log(tokenRes);
}

// 获取 cookieToken, done, 但是登录失效
async function getCookieToken () {
  const stoken = (await TGSqlite.getDataByKey("AppData", "key", "stoken") as unknown as Array<{
    key: string;
    value: string;
  }>)[0].value as string;
  console.log("stoken", stoken);
  const cookieRes = await TGRequest.User.bySToken.getCookieToken(cookie.value, stoken);
  console.log(cookieRes);
}

// 获取游戏数据
async function getUserGameCard () {
  const gameCard = await TGRequest.User.byCookie.getGameCard(cookie.value);
  console.log(gameCard);
}

// 通过 stoken 获取绑定角色，但是登录失效
async function getBindRole () {
  const ck = TGUtils.Tools.cookieToString(cookie.value);
  const stoken = (await TGSqlite.getDataByKey("AppData", "key", "stoken") as unknown as Array<{
    key: string;
    value: string;
  }>)[0].value as string;
  const bindRole = await TGRequest.User.bySToken.getAccounts(ck, stoken);
  console.log(bindRole);
}

// 通过 cookie 获取绑定角色
async function getBindRoleV2 () {
  const ck = TGUtils.Tools.cookieToString(cookie.value);
  const bindRole = await TGRequest.User.byCookie.getAccounts(ck);
  console.log(bindRole);
  // 如果是数组，说明数据获取成功
  if (Array.isArray(bindRole)) {
    bindRole.map(async (role: BTMuli.User.Game.Account) => {
      const sql = `
        INSERT INTO GameAccount (gameBiz, gameUid, isChosen, isOfficial, level, nickname, region, regionName, updated)
        VALUES ('${role.game_biz}', '${role.game_uid}', ${role.is_chosen ? 1 : 0}, ${role.is_official ? 1 : 0}, '${role.level}', '${role.nickname}', '${role.region}', '${role.region_name}', datetime('now', 'localtime'))
        ON CONFLICT (gameBiz, gameUid) DO UPDATE SET
        isChosen = ${role.is_chosen ? 1 : 0},
        isOfficial = ${role.is_official ? 1 : 0},
        level = '${role.level}',
        nickname = '${role.nickname}',
        region = '${role.region}',
        regionName = '${role.region_name}',
        updated = datetime('now', 'localtime');
      `;
      // 保存到数据库
      await TGSqlite.saveData(sql);
    });
    console.log("保存成功");
  } else {
    await dialog.message(
      bindRole.message,
      {
        type: "error",
        title: `获取绑定角色失败,retcode: ${bindRole.retcode}`,
      },
    );
  }
}

</script>
<style scoped>
.testDiv {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  width: 100%;
  margin-top: 20px;
}
</style>
