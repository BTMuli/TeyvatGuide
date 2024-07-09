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
import type { UnlistenFn } from "@tauri-apps/api/event";
import { storeToRefs } from "pinia";
import { onMounted, onUnmounted, ref, watch } from "vue";

import TGSqlite from "../../plugins/Sqlite/index.js";
import { useAppStore } from "../../store/modules/app.js";
import { useUserStore } from "../../store/modules/user.js";
import TGLogger from "../../utils/TGLogger.js";
import { getDeviceFp } from "../../web/request/getDeviceFp.js";
import TGRequest from "../../web/request/TGRequest.js";
import showConfirm from "../func/confirm.js";
import showSnackbar from "../func/snackbar.js";
import ToGameLogin from "../overlay/to-gameLogin.vue";

interface TcUserBadgeEmits {
  (e: "loadOuter", v: TGApp.Component.Loading.EmitParams): void;
}

const emits = defineEmits<TcUserBadgeEmits>();

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

let signListener: UnlistenFn;

onMounted(() => {
  if (userStore.briefInfo.value && userStore.briefInfo.value.nickname) {
    userInfo.value = userStore.briefInfo.value;
  }
});

watch(userStore.briefInfo, (v) => {
  if (v && v.nickname) {
    userInfo.value = v;
  }
});

async function refreshUser() {
  const ck = userStore.cookie.value;
  if (ck === undefined || JSON.stringify(ck) === "{}") {
    await TGLogger.Error("[tc-userBadge][refreshUser] cookie 不存在");
    showSnackbar({
      color: "error",
      text: "扫码登录后才能刷新用户信息!",
    });
    appStore.isLogin = false;
    return;
  }
  loading.value = true;
  emits("loadOuter", { show: true, title: "正在刷新用户信息" });
  const deviceInfo = appStore.deviceInfo;
  if (deviceInfo.device_fp === "00000000000") {
    appStore.deviceInfo = await getDeviceFp(appStore.deviceInfo);
    await TGLogger.Warn("[tc-userBadge][refreshUser] 刷新设备信息");
  }
  let failCount = 0;
  emits("loadOuter", { show: true, title: "正在验证 LToken" });
  const verifyLTokenRes = await TGRequest.User.byLToken.verify(ck.ltoken, ck.ltuid);
  if (typeof verifyLTokenRes === "string") {
    emits("loadOuter", { show: true, title: "正在验证 LToken", text: "验证 LToken 成功!" });
    await TGLogger.Info("[tc-userBadge][refreshUser] 验证 LToken 成功");
  } else {
    emits("loadOuter", {
      show: true,
      title: "正在验证 LToken",
      text: "验证 LToken 失败!即将重新获取",
    });
    await TGLogger.Warn("[tc-userBadge][refreshUser] 验证 LToken 失败");
    await TGLogger.Warn(
      `[tc-userBadge][refreshUser] ${verifyLTokenRes.retcode}: ${verifyLTokenRes.message}`,
    );
    const ltokenRes = await TGRequest.User.bySToken.getLToken(ck.mid, ck.stoken);
    if (typeof ltokenRes === "string") {
      ck.ltoken = ltokenRes;
      emits("loadOuter", { show: true, title: "正在验证 LToken", text: "获取 LToken 成功!" });
      await TGLogger.Info("[tc-userBadge][refreshUser] 获取 LToken 成功");
    } else {
      emits("loadOuter", { show: true, title: "正在验证 LToken", text: "获取 LToken 失败!" });
      await TGLogger.Error("[tc-userBadge][refreshUser] 获取 LToken 失败");
      await TGLogger.Error(
        `[tc-userBadge][refreshUser] ${ltokenRes.retcode}: ${ltokenRes.message}`,
      );
      failCount++;
    }
  }
  emits("loadOuter", { show: true, title: "正在获取 CookieToken" });
  const cookieTokenRes = await TGRequest.User.bySToken.getCookieToken(ck.mid, ck.stoken);
  if (typeof cookieTokenRes === "string") {
    ck.cookie_token = cookieTokenRes;
    emits("loadOuter", {
      show: true,
      title: "正在获取 CookieToken",
      text: "获取 CookieToken 成功!",
    });
    await TGLogger.Info("[tc-userBadge][refreshUser] 获取 CookieToken 成功");
  } else {
    emits("loadOuter", {
      show: true,
      title: "正在获取 CookieToken",
      text: "获取 CookieToken 失败!",
    });
    await TGLogger.Error("[tc-userBadge][refreshUser] 获取 CookieToken 失败");
    await TGLogger.Error(
      `[tc-userBadge][refreshUser] ${cookieTokenRes.retcode}: ${cookieTokenRes.message}`,
    );
    failCount++;
  }
  userStore.cookie.value = ck;
  await TGSqlite.saveAppData("cookie", JSON.stringify(ck));
  failCount = await refreshUserInfo();
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
  emits("loadOuter", { show: false });
}

async function refreshUserInfo(cnt: number = 0): Promise<number> {
  let failCount = cnt;
  const ck = userStore.cookie.value;
  if (ck === undefined) {
    showSnackbar({
      text: "未获取到用户 ck!",
      color: "error",
    });
    await TGLogger.Error("[tc-userBadge][refreshUserInfo] 未获取到用户 ck");
    return 0;
  }
  emits("loadOuter", { show: true, title: "正在获取用户信息" });
  const infoRes = await TGRequest.User.byCookie.getUserInfo(ck.cookie_token, ck.account_id);
  if ("retcode" in infoRes) {
    emits("loadOuter", { show: true, title: "正在获取用户信息", text: "获取用户信息失败!" });
    await TGLogger.Error("[tc-userBadge][refreshUserInfo] 获取用户信息失败");
    await TGLogger.Error(`[tc-userBadge][refreshUserInfo] ${infoRes.retcode}: ${infoRes.message}`);
    failCount++;
  } else {
    emits("loadOuter", { show: true, title: "正在获取用户信息", text: "获取用户信息成功!" });
    const briefInfo: TGApp.App.Account.BriefInfo = {
      nickname: infoRes.nickname,
      uid: infoRes.uid,
      avatar: infoRes.avatar_url,
      desc: infoRes.introduce,
    };
    userStore.briefInfo.value = briefInfo;
    await TGSqlite.saveAppData("userInfo", JSON.stringify(briefInfo));
    await TGLogger.Info("[tc-userBadge][refreshUserInfo] 获取用户信息成功");
  }
  emits("loadOuter", { show: true, title: "正在获取账号信息" });
  const accountRes = await TGRequest.User.byCookie.getAccounts(ck.cookie_token, ck.account_id);
  if (Array.isArray(accountRes)) {
    emits("loadOuter", { show: true, title: "正在获取账号信息", text: "获取账号信息成功!" });
    await TGLogger.Info("[tc-userBadge][refreshUserInfo] 获取账号信息成功");
    await TGSqlite.saveAccount(accountRes);
    const curAccount = await TGSqlite.getCurAccount();
    if (curAccount) userStore.account.value = curAccount;
  } else {
    emits("loadOuter", { show: true, title: "正在获取账号信息", text: "获取账号信息失败!" });
    await TGLogger.Error("[tc-userBadge][refreshUserInfo] 获取账号信息失败");
    await TGLogger.Error(
      `[tc-userBadge][refreshUserInfo] ${accountRes.retcode}: ${accountRes.message}`,
    );
    failCount++;
  }
  return failCount;
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

onUnmounted(() => {
  if (signListener) signListener();
});
</script>
<style lang="css" scoped>
.tcu-box {
  border-radius: 10px;
  background-image: linear-gradient(to right, #f78ca0 0%, #f9748f 19%, #fd868c 60%, #fe9a8b 100%);
}
</style>
