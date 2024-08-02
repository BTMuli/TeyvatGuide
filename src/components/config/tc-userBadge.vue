<template>
  <v-card class="tcu-box">
    <template #prepend>
      <v-avatar :image="userInfo.avatar" />
    </template>
    <template #title>{{ userInfo.nickname }}</template>
    <template #subtitle>UID:{{ userInfo.uid }}</template>
    <template #text>{{ userInfo.desc }}</template>
    <template #actions>
      <v-spacer />
      <v-btn
        variant="outlined"
        @click="tryCaptchaLogin()"
        icon="mdi-cellphone"
        title="验证码登录"
      />
      <v-btn
        variant="outlined"
        @click="confirmRefreshUser"
        icon="mdi-refresh"
        :loading="loading"
        title="刷新用户信息"
      />
      <v-btn variant="outlined" @click="confirmCopyCookie" icon="mdi-cookie" title="复制Cookie" />
    </template>
  </v-card>
</template>
<script lang="ts" setup>
import { UnlistenFn } from "@tauri-apps/api/event";
import { storeToRefs } from "pinia";
import { onMounted, onUnmounted, ref, watch } from "vue";

import Mys from "../../plugins/Mys/index.js";
import TGSqlite from "../../plugins/Sqlite/index.js";
import { useAppStore } from "../../store/modules/app.js";
import { useUserStore } from "../../store/modules/user.js";
import TGLogger from "../../utils/TGLogger.js";
import { getDeviceFp } from "../../web/request/getDeviceFp.js";
import TGRequest from "../../web/request/TGRequest.js";
import showConfirm from "../func/confirm.js";
import showGeetest from "../func/geetest.js";
import showSnackbar from "../func/snackbar.js";

interface TcUserBadgeEmits {
  (e: "loadOuter", v: TGApp.Component.Loading.EmitParams): void;
}

const emits = defineEmits<TcUserBadgeEmits>();

const appStore = useAppStore();
const userStore = storeToRefs(useUserStore());

const loading = ref<boolean>(false);
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

async function tryCaptchaLogin(): Promise<void> {
  const phone = await showConfirm({
    mode: "input",
    title: "请输入手机号",
    text: "+86",
  });
  if (!phone) {
    showSnackbar({
      color: "cancel",
      text: "已取消验证码登录",
    });
    return;
  }
  const phoneReg = /^1[3-9]\d{9}$/;
  if (!phoneReg.test(phone)) {
    showSnackbar({
      color: "error",
      text: "请输入正确的手机号",
    });
    return;
  }
  const actionType = await tryGetCaptcha(phone);
  if (!actionType) return;
  showSnackbar({
    text: `已发送验证码到 ${phone}`,
  });
  const captcha = await showConfirm({
    mode: "input",
    title: "请输入验证码",
    text: "验证码：",
    otcancel: false,
  });
  if (!captcha) {
    showSnackbar({
      color: "error",
      text: "输入验证码为空",
    });
    return;
  }
  const loginResp = await tryLoginByCaptcha(phone, captcha, actionType);
  if (!loginResp) return;
  userStore.cookie.value = {
    account_id: loginResp.user_info.aid,
    ltuid: loginResp.user_info.aid,
    stuid: loginResp.user_info.aid,
    mid: loginResp.user_info.mid,
    cookie_token: "",
    stoken: loginResp.token.token,
    ltoken: "",
  };
  showSnackbar({
    text: "登录成功，即将刷新用户信息",
    color: "success",
  });
  setTimeout(() => {
    refreshUser();
  }, 1000);
}

async function refreshUser() {
  const ck = userStore.cookie.value;
  if (ck === undefined || JSON.stringify(ck) === "{}") {
    await TGLogger.Error("[tc-userBadge][refreshUser] cookie 不存在");
    showSnackbar({
      color: "error",
      text: "登录后才能刷新用户信息!",
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

async function refreshUserInfo(): Promise<number> {
  let failCount = 0;
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

async function confirmCopyCookie(): Promise<void> {
  const res = await showConfirm({
    title: "确认复制 Cookie 吗？",
    text: "将会复制当前登录的 Cookie",
  });
  if (!res) {
    showSnackbar({
      color: "cancel",
      text: "已取消复制",
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
  const ckText = useUserStore().getAllCookie();
  await navigator.clipboard.writeText(ckText);
  showSnackbar({
    text: "已复制 Cookie!",
    color: "success",
  });
}

async function tryGetCaptcha(phone: string, aigis?: string): Promise<string | false> {
  const captchaResp = await Mys.User.getCaptcha(phone, aigis);
  if ("retcode" in captchaResp) {
    if (!captchaResp.data || captchaResp.data === "") {
      showSnackbar({
        text: `[${captchaResp.retcode}] ${captchaResp.message}`,
        color: "error",
      });
      return false;
    }
    const aigisResp: TGApp.Plugins.Mys.CaptchaLogin.CaptchaAigis = JSON.parse(captchaResp.data);
    const resp = await showGeetest(JSON.parse(aigisResp.data));
    const aigisStr = `${aigisResp.session_id};${btoa(JSON.stringify(resp))}`;
    return await tryGetCaptcha(phone, aigisStr);
  }
  return captchaResp.action_type;
}

async function tryLoginByCaptcha(
  phone: string,
  captcha: string,
  actionType: string,
  aigis?: string,
): Promise<TGApp.Plugins.Mys.CaptchaLogin.LoginData | false> {
  const loginResp = await Mys.User.login(phone, captcha, actionType, aigis);
  if ("retcode" in loginResp) {
    if (!loginResp.data || loginResp.data === "") {
      showSnackbar({
        text: `[${loginResp.retcode}] ${loginResp.message}`,
        color: "error",
      });
      return false;
    }
    const aigisResp: TGApp.Plugins.Mys.CaptchaLogin.CaptchaAigis = JSON.parse(loginResp.data);
    const resp = await showGeetest(JSON.parse(aigisResp.data));
    const aigisStr = `${aigisResp.session_id};${btoa(JSON.stringify(resp))}`;
    return await tryLoginByCaptcha(phone, captcha, actionType, aigisStr);
  }
  return loginResp;
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
