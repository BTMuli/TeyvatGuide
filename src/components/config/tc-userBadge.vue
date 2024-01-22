<template>
  <ToGameLogin v-model="scan" @success="refreshUser" />
  <v-card class="tcu-box">
    <template #prepend>
      <v-avatar :image="userInfo.avatar" />
    </template>
    <template #title>{{ userInfo.nickname }}</template>
    <template #subtitle>UID:{{ userInfo.uid }}</template>
    <template #text>{{ userInfo.desc }}</template>
    <template #actions>
      <v-spacer />
      <v-btn variant="outlined" @click="scan = true" icon="mdi-qrcode-scan" />
      <v-btn variant="outlined" @click="confirmRefreshUser" icon="mdi-refresh" :loading="loading" />
    </template>
  </v-card>
</template>
<script lang="ts" setup>
import { storeToRefs } from "pinia";
import { onMounted, ref } from "vue";

import TGSqlite from "../../plugins/Sqlite";
import { useAppStore } from "../../store/modules/app";
import { useUserStore } from "../../store/modules/user";
import { getDeviceFp } from "../../web/request/getDeviceFp";
import TGRequest from "../../web/request/TGRequest";
import showConfirm from "../func/confirm";
import showSnackbar from "../func/snackbar";
import ToGameLogin from "../overlay/to-gameLogin.vue";

const appStore = useAppStore();
const userStore = storeToRefs(useUserStore());

const loading = ref<boolean>(false);
const scan = ref<boolean>(false);
const userInfo = ref<TGApp.App.Account.BriefInfo>({
  nickname: "未登录",
  uid: "-1",
  desc: "请扫码登录",
  avatar: "/source/UI/lumine.webp",
});

onMounted(() => {
  if (userStore.briefInfo.value && userStore.briefInfo.value.nickname) {
    userInfo.value = userStore.briefInfo.value;
  }
});

// todo 完善 log
async function refreshUser() {
  const ck = userStore.cookie.value;
  if (ck === undefined || JSON.stringify(ck) === "{}") {
    showSnackbar({
      color: "error",
      text: "扫码登录后才能刷新用户信息!",
    });
    appStore.isLogin = false;
    return;
  }
  loading.value = true;
  const deviceInfo = appStore.deviceInfo;
  if (deviceInfo.device_fp === "00000000000") {
    appStore.deviceInfo = await getDeviceFp(appStore.deviceInfo);
  }
  let failCount = 0;
  const verifyLTokenRes = await TGRequest.User.byLToken.verify(ck.ltoken, ck.ltuid);
  if (typeof verifyLTokenRes === "string") {
    showSnackbar({
      color: "success",
      text: "验证 LToken 成功!",
    });
  } else {
    showSnackbar({
      color: "warn",
      text: "验证 LToken 失败!即将重新获取 LToken",
    });
    const ltokenRes = await TGRequest.User.bySToken.getLToken(ck.mid, ck.stoken);
    if (typeof ltokenRes === "string") {
      ck.ltoken = ltokenRes;
      showSnackbar({
        color: "success",
        text: "获取 LToken 成功!",
      });
    } else {
      showSnackbar({
        color: "error",
        text: "获取 LToken 失败!",
      });
      failCount++;
    }
  }
  const cookieTokenRes = await TGRequest.User.bySToken.getCookieToken(ck.mid, ck.stoken);
  if (typeof cookieTokenRes === "string") {
    ck.cookie_token = cookieTokenRes;
    showSnackbar({
      color: "success",
      text: "获取 CookieToken 成功!",
    });
  } else {
    showSnackbar({
      color: "error",
      text: "获取 CookieToken 失败!",
    });
    failCount++;
  }
  userStore.cookie.value = ck;
  await TGSqlite.saveAppData("cookie", JSON.stringify(ck));
  const infoRes = await TGRequest.User.byCookie.getUserInfo(ck.cookie_token, ck.account_id);
  if ("retcode" in infoRes) {
    showSnackbar({
      color: "error",
      text: "获取用户信息失败!",
    });
    failCount++;
  } else {
    const briefInfo: TGApp.App.Account.BriefInfo = {
      nickname: infoRes.nickname,
      uid: infoRes.uid,
      avatar: infoRes.avatar_url,
      desc: infoRes.introduce,
    };
    userStore.briefInfo.value = briefInfo;
    await TGSqlite.saveAppData("userInfo", JSON.stringify(briefInfo));
    showSnackbar({
      color: "success",
      text: "获取用户信息成功!",
    });
  }
  const accountRes = await TGRequest.User.byCookie.getAccounts(ck.cookie_token, ck.account_id);
  if (Array.isArray(accountRes)) {
    showSnackbar({
      color: "success",
      text: "获取账号信息成功!",
    });
    await TGSqlite.saveAccount(accountRes);
    const curAccount = await TGSqlite.getCurAccount();
    if (curAccount) userStore.account.value = curAccount;
  } else {
    showSnackbar({
      color: "error",
      text: "获取账号信息失败!",
    });
    failCount++;
  }
  loading.value = false;
  if (failCount > 0) {
    showSnackbar({
      color: "error",
      text: "刷新失败!重试或者重新扫码登录！",
    });
  } else {
    showSnackbar({ text: "刷新成功!" });
    appStore.isLogin = true;
  }
  loading.value = false;
}

async function confirmRefreshUser(): Promise<void> {
  const res = await showConfirm({
    title: "确认刷新用户信息吗？",
    text: "将会重新获取用户信息",
  });
  if (!res) {
    showSnackbar({
      color: "cancel",
      text: "已取消刷新",
    });
    return;
  }
  if (!userStore.cookie) {
    showSnackbar({
      color: "error",
      text: "请先登录",
    });
    return;
  }
  await refreshUser();
}
</script>
<style lang="css" scoped>
.tcu-box {
  border-radius: 10px;
  background-image: linear-gradient(to right, #f78ca0 0%, #f9748f 19%, #fd868c 60%, #fe9a8b 100%);
}
</style>
