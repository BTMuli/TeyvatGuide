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
      <v-btn variant="outlined" @click="toWebLogin" icon="mdi-web" />
      <v-btn variant="outlined" @click="confirmRefreshUser" icon="mdi-refresh" :loading="loading" />
    </template>
  </v-card>
</template>
<script lang="ts" setup>
import { event, window as windowTauri } from "@tauri-apps/api";
import type { UnlistenFn } from "@tauri-apps/api/helpers/event";
import { storeToRefs } from "pinia";
import { onMounted, onUnmounted, ref, watch } from "vue";

import TGSqlite from "../../plugins/Sqlite";
import { useAppStore } from "../../store/modules/app";
import { useUserStore } from "../../store/modules/user";
import TGClient from "../../utils/TGClient";
import TGLogger from "../../utils/TGLogger";
import { getDeviceFp } from "../../web/request/getDeviceFp";
import TGRequest from "../../web/request/TGRequest";
import showConfirm from "../func/confirm";
import showSnackbar from "../func/snackbar";
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

async function toWebLogin(): Promise<void> {
  const confirm = await showConfirm({
    title: "请在子窗口中完成登录操作",
    text: "请操作完成后点击子窗口的“用户登录”菜单",
  });
  if (!confirm) {
    showSnackbar({
      color: "cancel",
      text: "已取消登录",
    });
    return;
  }
  await TGClient.open("config_sign_in", "https://user.mihoyo.com");
  signListener = await event.listen("config_user_sign", async (e) => {
    if (typeof e.payload !== "string") {
      showSnackbar({
        color: "error",
        text: "登录失败!",
      });
      return;
    }
    await getTokenWeb(e.payload);
  });
}

async function getTokenWeb(cookie: string): Promise<void> {
  await windowTauri.appWindow.setFocus();
  emits("loadOuter", { show: true, title: "正在解析 cookie" });
  const ck = cookie.split(";").reduce(
    (prev, curr) => {
      const [key, value] = curr.split("=");
      prev[key.trim()] = value.trim();
      return prev;
    },
    <Record<string, string>>{},
  );
  if (!("login_ticket" in ck) || !("login_uid" in ck)) {
    emits("loadOuter", { show: false });
    showSnackbar({
      text: "未检测到 login_ticket, 请确认是否登录成功!",
      color: "error",
    });
    try {
      setTimeout(() => {
        windowTauri.WebviewWindow.getByLabel("mhy_client")?.setFocus();
      }, 2000);
    } catch (e) {
      await TGLogger.Error("[tc-userBadge][getTokenWeb] 无法获取子窗口");
      await TGClient.open("config_sign_in", "https://user.mihoyo.com/");
    }
    return;
  }
  emits("loadOuter", { show: true, title: "正在获取 token" });
  let cookieUser: TGApp.User.Account.Cookie = {
    account_id: "",
    ltuid: "",
    stuid: "",
    mid: "",
    cookie_token: "",
    stoken: "",
    ltoken: "",
  };
  cookieUser.account_id = ck["login_uid"];
  cookieUser.ltuid = ck["login_uid"];
  cookieUser.stuid = ck["login_uid"];
  const tokenRes = await TGRequest.User.byLoginTicket.getTokens(
    ck["login_ticket"],
    ck["login_uid"],
  );
  if ("retcode" in tokenRes) {
    emits("loadOuter", { show: false });
    showSnackbar({
      text: "获取 token 失败!",
      color: "error",
    });
    await TGLogger.Error("[tc-userBadge][getTokenWeb] 获取 token 失败");
    await TGLogger.Error(`[tc-userBadge][getTokenWeb] ${tokenRes.retcode}: ${tokenRes.message}`);
    return;
  }
  tokenRes.map((i) => {
    if (i.name === "ltoken") return (cookieUser.ltoken = i.token);
    if (i.name === "stoken") return (cookieUser.stoken = i.token);
  });
  if (cookieUser.ltoken === "" || cookieUser.stoken === "") {
    emits("loadOuter", { show: false });
    showSnackbar({
      text: "获取 ltoken 或者 stoken 失败!",
      color: "error",
    });
    await TGLogger.Error("[tc-userBadge][getTokenWeb] 获取 ltoken 或者 stoken 失败");
    return;
  }
  const ltokenRes = await TGRequest.User.byLToken.verify(cookieUser.ltoken, cookieUser.ltuid);
  if (typeof ltokenRes !== "string") {
    showSnackbar({
      text: "ltoken 验证失败!",
      color: "error",
    });
  } else {
    cookieUser.mid = ltokenRes;
  }
  if (!cookieUser.stoken.startsWith("v2")) {
    const stokenRes = await TGRequest.User.bySToken.update(cookieUser.stoken, cookieUser.stuid);
    if ("retcode" in stokenRes) {
      showSnackbar({
        text: "stoken 更新失败!",
        color: "error",
      });
      await TGLogger.Error("[tc-userBadge][getTokenWeb] stoken 更新失败");
      await TGLogger.Error(
        `[tc-userBadge][getTokenWeb] ${stokenRes.retcode}: ${stokenRes.message}`,
      );
    } else {
      cookieUser.stoken = stokenRes.token.token;
      if (cookieUser.mid === "" && stokenRes.user_info.mid !== "")
        cookieUser.mid = stokenRes.user_info.mid;
    }
  }
  const cookieTokenRes = await TGRequest.User.bySToken.getCookieToken(
    cookieUser.mid,
    cookieUser.stoken,
  );
  if (typeof cookieTokenRes !== "string") {
    showSnackbar({
      text: "cookie_token 获取失败!",
      color: "error",
    });
    await TGLogger.Error("[tc-userBadge][getTokenWeb] cookie_token 获取失败");
    await TGLogger.Error(
      `[tc-userBadge][getTokenWeb] ${cookieTokenRes.retcode}: ${cookieTokenRes.message}`,
    );
  } else {
    cookieUser.cookie_token = cookieTokenRes;
  }
  userStore.cookie.value = cookieUser;
  try {
    await windowTauri.WebviewWindow.getByLabel("mhy_client")?.close();
  } catch (e) {
    await TGLogger.Error("[tc-userBadge][getTokenWeb] 无法获取子窗口");
    showSnackbar({
      text: "请手动关闭子窗口!",
      color: "error",
    });
  }
  signListener();
  if (Object.values(cookieUser).some((i) => i === "")) {
    showSnackbar({
      text: "获取 cookie 失败!部分项为空!",
      color: "error",
    });
    await TGLogger.Error("[tc-userBadge][getTokenWeb] 获取 cookie 失败");
    return;
  }
  await TGSqlite.saveAppData("cookie", JSON.stringify(cookieUser));
  const failCount = await refreshUserInfo();
  if (failCount > 0) {
    showSnackbar({
      color: "error",
      text: "获取用户信息失败！",
    });
  } else {
    showSnackbar({
      text: "登录成功!",
      color: "success",
    });
    appStore.isLogin = true;
  }
  loading.value = false;
  emits("loadOuter", { show: false });
}

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
