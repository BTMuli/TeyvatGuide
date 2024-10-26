<template>
  <v-card class="tcu-box">
    <template #prepend>
      <v-avatar :image="userInfo.avatar" />
    </template>
    <template #title>{{ userInfo.nickname }}</template>
    <template #subtitle>UID:{{ userInfo.uid }}</template>
    <template #text>{{ userInfo.desc }}</template>
    <template #append>
      <v-menu location="start">
        <template v-slot:activator="{ props }">
          <v-btn
            variant="outlined"
            @click="showAccounts()"
            title="切换默认游戏账户"
            v-bind="props"
            icon="mdi-gamepad-variant"
          />
        </template>
        <v-list>
          <v-list-item
            v-for="account in gameAccounts"
            :key="account.gameUid"
            @click="useUserStore().switchGameAccount(account.gameUid)"
          >
            <v-list-item-title>{{ account.nickname }}</v-list-item-title>
            <v-list-item-subtitle>
              {{ account.gameUid }}({{ account.regionName }})
            </v-list-item-subtitle>
            <template #append>
              <div v-if="account.gameUid === userStore.account.value.gameUid" title="当前登录账号">
                <v-icon color="green">mdi-check</v-icon>
              </div>
            </template>
          </v-list-item>
        </v-list>
      </v-menu>
    </template>
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
        @click="confirmRefreshUser(userStore.uid.value!)"
        :disabled="userStore.uid.value === undefined"
        icon="mdi-refresh"
        :loading="loading"
        title="刷新用户信息"
      />
      <v-btn
        variant="outlined"
        @click="confirmCopyCookie"
        :disabled="!userStore.cookie.value"
        icon="mdi-cookie"
        title="复制Cookie"
      />
      <v-menu location="start">
        <template v-slot:activator="{ props }">
          <v-btn
            variant="outlined"
            icon="mdi-account-switch"
            title="切换账户"
            @click="showMenu"
            v-bind="props"
          />
        </template>
        <v-list>
          <v-list-item v-for="account in accounts" :key="account.uid">
            <v-list-item-title>{{ account.brief.nickname }}</v-list-item-title>
            <v-list-item-subtitle>{{ account.brief.uid }}</v-list-item-subtitle>
            <template #append>
              <div v-if="account.uid === userStore.uid.value" title="当前登录账号">
                <v-icon color="green">mdi-account-check</v-icon>
              </div>
              <v-icon
                v-else
                size="small"
                icon="mdi-account-convert"
                title="切换用户"
                @click="loadAccount(account.uid)"
              />
              <v-icon
                class="tcu-btn"
                icon="mdi-delete"
                title="删除用户"
                size="small"
                @click="clearUser(account)"
              />
            </template>
          </v-list-item>
          <v-list-item @click="addByCookie()" append-icon="mdi-account-plus">
            <v-list-item-title>手动添加</v-list-item-title>
            <v-list-item-subtitle>手动输入Cookie</v-list-item-subtitle>
          </v-list-item>
        </v-list>
      </v-menu>
    </template>
  </v-card>
</template>
<script lang="ts" setup>
import { storeToRefs } from "pinia";
import { computed, ref } from "vue";

import Mys from "../../plugins/Mys/index.js";
import TSUserAccount from "../../plugins/Sqlite/modules/userAccount.js";
import { useUserStore } from "../../store/modules/user.js";
import TGLogger from "../../utils/TGLogger.js";
import TGRequest from "../../web/request/TGRequest.js";
import showConfirm from "../func/confirm.js";
import showGeetest from "../func/geetest.js";
import showSnackbar from "../func/snackbar.js";

interface TcUserBadgeEmits {
  (e: "loadOuter", v: TGApp.Component.Loading.EmitParams): void;
}

const emits = defineEmits<TcUserBadgeEmits>();
const userStore = storeToRefs(useUserStore());

const loading = ref<boolean>(false);
const accounts = ref<TGApp.App.Account.User[]>([]);
const gameAccounts = ref<TGApp.Sqlite.Account.Game[]>([]);
const userInfo = computed<TGApp.App.Account.BriefInfo>(() => {
  if (userStore.uid.value === undefined)
    return {
      nickname: "未登录",
      uid: "-1",
      desc: "请使用短信验证码登录",
      avatar: "/source/UI/lumine.webp",
    };
  return userStore.briefInfo.value;
});

async function tryCaptchaLogin(): Promise<void> {
  const phone = await showConfirm({ mode: "input", title: "请输入手机号", text: "+86" });
  if (!phone) {
    showSnackbar({ color: "cancel", text: "已取消验证码登录" });
    return;
  }
  const phoneReg = /^1[3-9]\d{9}$/;
  if (!phoneReg.test(phone)) {
    showSnackbar({ color: "error", text: "请输入正确的手机号" });
    return;
  }
  const actionType = await tryGetCaptcha(phone);
  if (!actionType) return;
  showSnackbar({ text: `已发送验证码到 ${phone}` });
  const captcha = await showConfirm({
    mode: "input",
    title: "请输入验证码",
    text: "验证码：",
    otcancel: false,
  });
  if (!captcha) {
    showSnackbar({ color: "error", text: "输入验证码为空" });
    return;
  }
  const loginResp = await tryLoginByCaptcha(phone, captcha, actionType);
  if (!loginResp) return;
  loading.value = true;
  const ck: TGApp.App.Account.Cookie = {
    account_id: loginResp.user_info.aid,
    ltuid: loginResp.user_info.aid,
    stuid: loginResp.user_info.aid,
    mid: loginResp.user_info.mid,
    cookie_token: "",
    stoken: loginResp.token.token,
    ltoken: "",
  };
  emits("loadOuter", { show: true, title: "正在获取 LToken" });
  const ltokenRes = await TGRequest.User.bySToken.getLToken(ck.mid, ck.stoken);
  if (typeof ltokenRes !== "string") {
    showSnackbar({ text: `[${ltokenRes.retcode}]${ltokenRes.message}`, color: "error" });
    await TGLogger.Error(`获取LToken失败：${ltokenRes.retcode}-${ltokenRes.message}`);
    loading.value = false;
    emits("loadOuter", { show: false });
    return;
  }
  ck.ltoken = ltokenRes;
  emits("loadOuter", { show: true, title: "正在获取 cookieToken " });
  const cookieTokenRes = await TGRequest.User.bySToken.getCookieToken(ck.mid, ck.stoken);
  if (typeof cookieTokenRes !== "string") {
    showSnackbar({ text: `[${cookieTokenRes.retcode}]${cookieTokenRes.message}`, color: "error" });
    await TGLogger.Error(
      `获取CookieToken失败：${cookieTokenRes.retcode}-${cookieTokenRes.message}`,
    );
    loading.value = false;
    emits("loadOuter", { show: false });
    return;
  }
  ck.cookie_token = cookieTokenRes;
  emits("loadOuter", { show: true, title: "正在获取用户信息" });
  const briefRes = await TGRequest.User.byCookie.getUserInfo(ck.cookie_token, ck.account_id);
  if ("retcode" in briefRes) {
    showSnackbar({ text: `[${briefRes.retcode}]${briefRes.message}` });
    await TGLogger.Error(`获取用户数据失败：${briefRes.retcode}-${briefRes.message}`);
    loading.value = false;
    emits("loadOuter", { show: false });
    return;
  }
  const briefInfo: TGApp.App.Account.BriefInfo = {
    nickname: briefRes.nickname,
    uid: briefRes.uid,
    avatar: briefRes.avatar_url,
    desc: briefRes.introduce,
  };
  emits("loadOuter", { show: true, title: "正在保存并切换用户" });
  await TSUserAccount.account.saveAccount({
    uid: briefInfo.uid,
    cookie: ck,
    brief: briefInfo,
    updated: "",
  });
  userStore.uid.value = briefInfo.uid;
  userStore.briefInfo.value = briefInfo;
  userStore.cookie.value = ck;
  emits("loadOuter", { show: true, title: "正在获取游戏账号" });
  const gameRes = await TGRequest.User.bySToken.getAccounts(ck.stoken, ck.stuid);
  if (!Array.isArray(gameRes)) {
    loading.value = false;
    emits("loadOuter", { show: false });
    showSnackbar({ text: `[${gameRes.retcode}]${gameRes.message}` });
    return;
  }
  await TSUserAccount.game.saveAccounts(briefInfo.uid, gameRes);
  const curAccount = await TSUserAccount.game.getCurAccount(briefInfo.uid);
  if (!curAccount) {
    showSnackbar({ text: "未检测到游戏账号，请重新刷新", color: "warn" });
    loading.value = false;
    emits("loadOuter", { show: false });
    return;
  }
  userStore.account.value = curAccount;
  loading.value = false;
  emits("loadOuter", { show: false });
  showSnackbar({ text: "成功加载用户数据!" });
}

async function refreshUser(uid: string) {
  let account = await TSUserAccount.account.getAccount(uid);
  if (!account) {
    showSnackbar({ text: `未获取到${userStore.uid.value}账号数据，请重新登录!`, color: "error" });
    return;
  }
  let ck = account.cookie;
  loading.value = true;
  emits("loadOuter", { show: true, title: "正在刷新用户信息" });
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
  }
  account.cookie = ck;
  emits("loadOuter", { show: true, title: "正在获取用户信息" });
  const infoRes = await TGRequest.User.byCookie.getUserInfo(ck.cookie_token, ck.account_id);
  if ("retcode" in infoRes) {
    emits("loadOuter", { show: true, title: "正在获取用户信息", text: "获取用户信息失败!" });
    await TGLogger.Error("[tc-userBadge][refreshUserInfo] 获取用户信息失败");
    await TGLogger.Error(`[tc-userBadge][refreshUserInfo] ${infoRes.retcode}: ${infoRes.message}`);
  } else {
    emits("loadOuter", { show: true, title: "正在获取用户信息", text: "获取用户信息成功!" });
    account.brief = {
      nickname: infoRes.nickname,
      uid: infoRes.uid,
      avatar: infoRes.avatar_url,
      desc: infoRes.introduce,
    };
    await TGLogger.Info("[tc-userBadge][refreshUserInfo] 获取用户信息成功");
  }
  await TSUserAccount.account.saveAccount(account);
  emits("loadOuter", { show: true, title: "正在获取账号信息" });
  const accountRes = await TGRequest.User.byCookie.getAccounts(ck.cookie_token, ck.account_id);
  if (Array.isArray(accountRes)) {
    emits("loadOuter", { show: true, title: "正在获取账号信息", text: "获取账号信息成功!" });
    await TGLogger.Info("[tc-userBadge][refreshUserInfo] 获取账号信息成功");
    await TSUserAccount.game.saveAccounts(account.uid, accountRes);
  } else {
    emits("loadOuter", { show: true, title: "正在获取账号信息", text: "获取账号信息失败!" });
    await TGLogger.Error("[tc-userBadge][refreshUserInfo] 获取账号信息失败");
    await TGLogger.Error(
      `[tc-userBadge][refreshUserInfo] ${accountRes.retcode}: ${accountRes.message}`,
    );
  }
  loading.value = false;
  emits("loadOuter", { show: false });
}

async function loadAccount(uid: string): Promise<void> {
  if (userStore.uid.value && uid === userStore.uid.value) {
    showSnackbar({ text: "该账户已经登录，无需切换", color: "warn" });
    return;
  }
  const account = await TSUserAccount.account.getAccount(uid);
  if (!account) {
    showSnackbar({ text: `无法获取${uid}的账号信息`, color: "warn" });
    return;
  }
  userStore.uid.value = uid;
  userStore.briefInfo.value = account.brief;
  userStore.cookie.value = account.cookie;
  const gameAccount = await TSUserAccount.game.getCurAccount(uid);
  if (!gameAccount) {
    showSnackbar({ text: `无法获取${uid}的游戏信息`, color: "warn" });
    return;
  }
  userStore.account.value = gameAccount;
  showSnackbar({ text: `成功切换到用户${uid}` });
}

async function confirmRefreshUser(uid: string): Promise<void> {
  const res = await showConfirm({ title: "确认刷新用户信息吗？", text: "将会重新获取用户信息" });
  if (!res) {
    showSnackbar({ color: "cancel", text: "已取消刷新" });
    return;
  }
  await refreshUser(uid);
  const confirm = await showConfirm({ title: "是否切换用户？", text: `将切换到用户${uid}` });
  if (!confirm) return;
  await loadAccount(uid);
}

async function confirmCopyCookie(): Promise<void> {
  const res = await showConfirm({
    title: "确认复制 Cookie 吗？",
    text: "将会复制当前登录的 Cookie",
  });
  if (!res) {
    showSnackbar({ color: "cancel", text: "已取消复制" });
    return;
  }
  if (!userStore.cookie.value) {
    showSnackbar({ color: "error", text: "请先登录" });
    return;
  }
  const ckText = TSUserAccount.account.copy(userStore.cookie.value);
  await navigator.clipboard.writeText(ckText);
  showSnackbar({ text: "已复制 Cookie!", color: "success" });
}

async function tryGetCaptcha(phone: string, aigis?: string): Promise<string | false> {
  const captchaResp = await Mys.User.getCaptcha(phone, aigis);
  if ("retcode" in captchaResp) {
    if (!captchaResp.data || captchaResp.data === "") {
      showSnackbar({ text: `[${captchaResp.retcode}] ${captchaResp.message}`, color: "error" });
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
      showSnackbar({ text: `[${loginResp.retcode}] ${loginResp.message}`, color: "error" });
      return false;
    }
    const aigisResp: TGApp.Plugins.Mys.CaptchaLogin.CaptchaAigis = JSON.parse(loginResp.data);
    const resp = await showGeetest(JSON.parse(aigisResp.data));
    const aigisStr = `${aigisResp.session_id};${btoa(JSON.stringify(resp))}`;
    return await tryLoginByCaptcha(phone, captcha, actionType, aigisStr);
  }
  return loginResp;
}

async function showMenu(): Promise<void> {
  accounts.value = await TSUserAccount.account.getAllAccount();
}

async function showAccounts(): Promise<void> {
  if (!userStore.uid.value) {
    showSnackbar({ text: "未登录!", color: "error" });
    return;
  }
  gameAccounts.value = await TSUserAccount.game.getAccount(userStore.uid.value);
  if (gameAccounts.value.length === 0) {
    showSnackbar({ text: "未找到账户的游戏数据，请尝试刷新!", color: "warn" });
    return;
  }
}

async function addByCookie(): Promise<void> {
  const ckInput = await showConfirm({
    mode: "input",
    title: "请输入cookie",
    text: "Cookie:",
  });
  if (!ckInput) {
    showSnackbar({ text: "已取消Cookie输入", color: "cancel" });
    return;
  }
  if (ckInput === "") {
    showSnackbar({ text: "请输入Cookie!", color: "warn" });
    return;
  }
  const ckArr = ckInput.split(";");
  let ckRes = { stoken: "", stuid: "", mid: "" };
  for (const ck of ckArr) {
    if (ck.startsWith("mid=")) ckRes.mid = ck.substring(4);
    else if (ck.startsWith("stoken=")) ckRes.stoken = ck.substring(7);
    else if (ck.startsWith("stuid=")) ckRes.stuid = ck.substring(6);
  }
  if (ckRes.mid === "" || ckRes.stoken === "" || ckRes.stuid === "") {
    showSnackbar({ text: "解析Cookie失败", color: "error" });
    await TGLogger.Error(`解析Cookie失败：${ckInput}`);
    return;
  }
  loading.value = true;
  emits("loadOuter", { show: true, title: "尝试刷新Cookie" });
  const ck: TGApp.App.Account.Cookie = {
    account_id: ckRes.stuid,
    ltuid: ckRes.stuid,
    stuid: ckRes.stuid,
    mid: ckRes.mid,
    cookie_token: "",
    stoken: ckRes.stoken,
    ltoken: "",
  };
  emits("loadOuter", { show: true, title: "正在获取 LToken" });
  const ltokenRes = await TGRequest.User.bySToken.getLToken(ck.mid, ck.stoken);
  if (typeof ltokenRes !== "string") {
    showSnackbar({ text: `[${ltokenRes.retcode}]${ltokenRes.message}`, color: "error" });
    await TGLogger.Error(`获取LToken失败：${ltokenRes.retcode}-${ltokenRes.message}`);
    loading.value = false;
    emits("loadOuter", { show: false });
    return;
  }
  ck.ltoken = ltokenRes;
  emits("loadOuter", { show: true, title: "正在获取 cookieToken " });
  const cookieTokenRes = await TGRequest.User.bySToken.getCookieToken(ck.mid, ck.stoken);
  if (typeof cookieTokenRes !== "string") {
    showSnackbar({ text: `[${cookieTokenRes.retcode}]${cookieTokenRes.message}`, color: "error" });
    await TGLogger.Error(
      `获取CookieToken失败：${cookieTokenRes.retcode}-${cookieTokenRes.message}`,
    );
    loading.value = false;
    emits("loadOuter", { show: false });
    return;
  }
  ck.cookie_token = cookieTokenRes;
  emits("loadOuter", { show: true, title: "正在获取用户信息" });
  const briefRes = await TGRequest.User.byCookie.getUserInfo(ck.cookie_token, ck.account_id);
  if ("retcode" in briefRes) {
    showSnackbar({ text: `[${briefRes.retcode}]${briefRes.message}` });
    await TGLogger.Error(`获取用户数据失败：${briefRes.retcode}-${briefRes.message}`);
    loading.value = false;
    emits("loadOuter", { show: false });
    return;
  }
  const briefInfo: TGApp.App.Account.BriefInfo = {
    nickname: briefRes.nickname,
    uid: briefRes.uid,
    avatar: briefRes.avatar_url,
    desc: briefRes.introduce,
  };
  emits("loadOuter", { show: true, title: "正在保存用户数据" });
  await TSUserAccount.account.saveAccount({
    uid: briefInfo.uid,
    cookie: ck,
    brief: briefInfo,
    updated: "",
  });
  emits("loadOuter", { show: true, title: "正在获取游戏账号" });
  const gameRes = await TGRequest.User.bySToken.getAccounts(ck.stoken, ck.stuid);
  if (!Array.isArray(gameRes)) {
    loading.value = false;
    emits("loadOuter", { show: false });
    showSnackbar({ text: `[${gameRes.retcode}]${gameRes.message}` });
    return;
  }
  await TSUserAccount.game.saveAccounts(briefInfo.uid, gameRes);
  const curAccount = await TSUserAccount.game.getCurAccount(briefInfo.uid);
  if (!curAccount) {
    showSnackbar({ text: "未检测到游戏账号，请重新刷新", color: "warn" });
    loading.value = false;
    emits("loadOuter", { show: false });
    return;
  }
  loading.value = false;
  emits("loadOuter", { show: false });
  showSnackbar({ text: "成功加载用户数据!" });
}

async function clearUser(user: TGApp.App.Account.User): Promise<void> {
  if (user.uid === userStore.uid.value) {
    showSnackbar({ text: "当前登录用户不许删除！", color: "warn" });
    return;
  }
  const confirm = await showConfirm({ title: "确认删除", text: "将删除账号及其游戏账号数据" });
  if (!confirm) {
    showSnackbar({ text: "取消删除用户数据", color: "cancel" });
    return;
  }
  await TSUserAccount.account.deleteAccount(user.uid);
  showSnackbar({ text: "成功删除用户!", color: "success" });
}
</script>
<style lang="css" scoped>
.tcu-box {
  border-radius: 10px;
  background-image: linear-gradient(to right, #f78ca0 0%, #f9748f 19%, #fd868c 60%, #fe9a8b 100%);
}

.tcu-btn {
  margin-left: 5px;
}
</style>
