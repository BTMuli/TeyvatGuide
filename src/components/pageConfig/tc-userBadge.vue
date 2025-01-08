<template>
  <ToGameLogin v-model="showLoginQr" @success="tryGetTokens" />
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
            v-for="ac in gameAccounts"
            :key="ac.gameUid"
            @click="useUserStore().switchGameAccount(ac.gameUid)"
          >
            <v-list-item-title>{{ ac.nickname }}</v-list-item-title>
            <v-list-item-subtitle> {{ ac.gameUid }}({{ ac.regionName }})</v-list-item-subtitle>
            <template #append>
              <div v-if="ac.gameUid === account.gameUid" title="当前登录账号">
                <v-icon color="green">mdi-check</v-icon>
              </div>
            </template>
          </v-list-item>
        </v-list>
      </v-menu>
    </template>
    <template #actions>
      <v-spacer />
      <!--      <v-btn-->
      <!--        variant="outlined"-->
      <!--        @click="showLoginQr = true"-->
      <!--        icon="mdi-qrcode-scan"-->
      <!--        title="扫码登录"-->
      <!--      />-->
      <!--      <v-btn-->
      <!--        variant="outlined"-->
      <!--        @click="tryCaptchaLogin()"-->
      <!--        icon="mdi-cellphone"-->
      <!--        title="验证码登录"-->
      <!--      />-->
      <v-btn
        variant="outlined"
        @click="confirmRefreshUser(uid!)"
        :disabled="uid === undefined"
        icon="mdi-refresh"
        title="刷新用户信息"
      />
      <v-btn
        variant="outlined"
        @click="confirmCopyCookie"
        :disabled="cookie === undefined"
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
          <v-list-item v-for="ac in accounts" :key="ac.uid">
            <v-list-item-title>{{ ac.brief.nickname }}</v-list-item-title>
            <v-list-item-subtitle>{{ ac.brief.uid }}</v-list-item-subtitle>
            <template #append>
              <div v-if="ac.uid === uid" title="当前登录账号">
                <v-icon color="green">mdi-account-check</v-icon>
              </div>
              <v-icon
                v-else
                size="small"
                icon="mdi-account-convert"
                title="切换用户"
                @click="loadAccount(ac.uid)"
              />
              <v-icon
                class="tcu-btn"
                icon="mdi-delete"
                title="删除用户"
                size="small"
                @click="clearUser(ac)"
              />
            </template>
          </v-list-item>
        </v-list>
      </v-menu>
      <v-menu location="start">
        <template v-slot:activator="{ props }">
          <v-btn variant="outlined" icon="mdi-login" title="登录" v-bind="props" />
        </template>
        <v-list>
          <v-list-item @click="addByCookie()" append-icon="mdi-account-plus">
            <v-list-item-title>手动添加</v-list-item-title>
            <v-list-item-subtitle>手动输入Cookie</v-list-item-subtitle>
          </v-list-item>
          <v-list-item @click="tryCaptchaLogin()" append-icon="mdi-cellphone">
            <v-list-item-title>验证码登录</v-list-item-title>
            <v-list-item-subtitle>使用手机号登录</v-list-item-subtitle>
          </v-list-item>
          <v-list-item @click="showLoginQr = true" append-icon="mdi-qrcode-scan">
            <v-list-item-title>扫码登录</v-list-item-title>
            <v-list-item-subtitle>使用米游社扫码登录</v-list-item-subtitle>
          </v-list-item>
        </v-list>
      </v-menu>
    </template>
  </v-card>
</template>
<script lang="ts" setup>
import showDialog from "@comp/func/dialog.js";
import showGeetest from "@comp/func/geetest.js";
import showLoading from "@comp/func/loading.js";
import showSnackbar from "@comp/func/snackbar.js";
import ToGameLogin from "@comp/pageConfig/tco-gameLogin.vue";
import Mys from "@Mys/index.js";
import TSUserAccount from "@Sqlite/modules/userAccount.js";
import { storeToRefs } from "pinia";
import { computed, ref, shallowRef } from "vue";

import { useAppStore } from "@/store/modules/app.js";
import { useUserStore } from "@/store/modules/user.js";
import TGLogger from "@/utils/TGLogger.js";
import BBSApi from "@/web/request/bbsReq.js";
import PassportApi from "@/web/request/passportReq.js";
import TakumiApi from "@/web/request/takumiReq.js";

const { isLogin } = storeToRefs(useAppStore());
const { uid, briefInfo, cookie, account } = storeToRefs(useUserStore());

const showLoginQr = ref<boolean>(false);
const accounts = shallowRef<Array<TGApp.App.Account.User>>([]);
const gameAccounts = shallowRef<Array<TGApp.Sqlite.Account.Game>>([]);
const userInfo = computed<TGApp.App.Account.BriefInfo>(() => {
  if (uid.value) return briefInfo.value;
  return {
    nickname: "未登录",
    uid: "-1",
    desc: "请登录",
    avatar: "/source/UI/lumine.webp",
  };
});

async function tryGetTokens(ck: TGApp.App.Account.Cookie): Promise<void> {
  await showLoading.update("正在获取 LToken");
  const ltokenRes = await PassportApi.lToken.get(ck);
  if (typeof ltokenRes !== "string") {
    await showLoading.end();
    showSnackbar.error(`[${ltokenRes.retcode}]${ltokenRes.message}`);
    await TGLogger.Error(`获取LToken失败：${ltokenRes.retcode}-${ltokenRes.message}`);
    return;
  }
  showSnackbar.success("获取LToken成功");
  ck.ltoken = ltokenRes;
  await showLoading.update("正在获取 CookieToken");
  const cookieTokenRes = await PassportApi.cookieToken(ck);
  if (typeof cookieTokenRes !== "string") {
    await showLoading.end();
    showSnackbar.error(`[${cookieTokenRes.retcode}]${cookieTokenRes.message}`);
    await TGLogger.Error(
      `获取CookieToken失败：${cookieTokenRes.retcode}-${cookieTokenRes.message}`,
    );
    return;
  }
  showSnackbar.success("获取CookieToken成功");
  ck.cookie_token = cookieTokenRes;
  await showLoading.update("正在获取用户信息");
  const briefRes = await BBSApi.userInfo(ck);
  if ("retcode" in briefRes) {
    await showLoading.end();
    showSnackbar.error(`[${briefRes.retcode}]${briefRes.message}`);
    await TGLogger.Error(`获取用户数据失败：${briefRes.retcode}-${briefRes.message}`);
    return;
  }
  showSnackbar.success("获取用户信息成功");
  const briefInfoGet: TGApp.App.Account.BriefInfo = {
    nickname: briefRes.nickname,
    uid: briefRes.uid,
    avatar: briefRes.avatar_url,
    desc: briefRes.introduce,
  };
  await showLoading.update("正在保存用户数据");
  await TSUserAccount.account.saveAccount({
    uid: briefInfoGet.uid,
    cookie: ck,
    brief: briefInfoGet,
    updated: "",
  });
  uid.value = briefInfoGet.uid;
  briefInfo.value = briefInfoGet;
  cookie.value = ck;
  isLogin.value = true;
  await showLoading.update("正在获取游戏账号");
  const gameRes = await TakumiApi.bind.gameRoles(cookie.value);
  if (!Array.isArray(gameRes)) {
    await showLoading.end();
    showSnackbar.error(`[${gameRes.retcode}]${gameRes.message}`);
    await TGLogger.Error(`获取游戏账号失败：${gameRes.retcode}-${gameRes.message}`);
    return;
  }
  showSnackbar.success("获取游戏账号成功");
  await TSUserAccount.game.saveAccounts(briefInfoGet.uid, gameRes);
  const curAccount = await TSUserAccount.game.getCurAccount(briefInfoGet.uid);
  if (!curAccount) {
    showSnackbar.warn("未检测到游戏账号，请重新刷新");
    await showLoading.end();
    return;
  }
  account.value = curAccount;
  await showLoading.end();
  showSnackbar.success("成功登录!");
}

async function tryCaptchaLogin(): Promise<void> {
  const phone = await showDialog.input("请输入手机号", "+86");
  if (!phone) {
    showSnackbar.cancel("已取消验证码登录");
    return;
  }
  const phoneReg = /^1[3-9]\d{9}$/;
  if (!phoneReg.test(phone)) {
    showSnackbar.warn("请输入正确的手机号");
    return;
  }
  const actionType = await tryGetCaptcha(phone);
  if (!actionType) return;
  showSnackbar.success(`已发送验证码到 ${phone}`);
  const captcha = await showDialog.input("请输入验证码", "验证码：", undefined, false);
  if (!captcha) {
    showSnackbar.warn("输入验证码为空");
    return;
  }
  const loginResp = await tryLoginByCaptcha(phone, captcha, actionType);
  if (!loginResp) return;
  await showLoading.start("正在尝试登录...");
  const ck: TGApp.App.Account.Cookie = {
    account_id: loginResp.user_info.aid,
    ltuid: loginResp.user_info.aid,
    stuid: loginResp.user_info.aid,
    mid: loginResp.user_info.mid,
    cookie_token: "",
    stoken: loginResp.token.token,
    ltoken: "",
  };
  await tryGetTokens(ck);
}

async function refreshUser(uid: string) {
  let account = await TSUserAccount.account.getAccount(uid);
  if (!account) {
    showSnackbar.warn(`未获取到${uid}账号数据，请重新登录!`);
    return;
  }
  let ck = account.cookie;
  await showLoading.start("正在刷新用户信息", "正在验证 LToken");
  const verifyLTokenRes = await PassportApi.lToken.verify(ck);
  if (typeof verifyLTokenRes === "string") {
    await showLoading.update("验证 LToken 成功");
    showSnackbar.success("验证 LToken 成功");
    await TGLogger.Info("[tc-userBadge][refreshUser] 验证 LToken 成功");
  } else {
    await showLoading.update("验证 LToken 失败，将尝试重新获取 LToken");
    showSnackbar.error(`[${verifyLTokenRes.retcode}]${verifyLTokenRes.message}`);
    await TGLogger.Warn("[tc-userBadge][refreshUser] 验证 LToken 失败");
    await TGLogger.Warn(
      `[tc-userBadge][refreshUser] ${verifyLTokenRes.retcode}: ${verifyLTokenRes.message}`,
    );
    const ltokenRes = await PassportApi.lToken.get(ck);
    if (typeof ltokenRes === "string") {
      await showLoading.update("获取 LToken 成功");
      ck.ltoken = ltokenRes;
      await TGLogger.Info("[tc-userBadge][refreshUser] 获取 LToken 成功");
    } else {
      await showLoading.update("获取 LToken 失败");
      showSnackbar.error(`[${ltokenRes.retcode}]${ltokenRes.message}`);
      await TGLogger.Error("[tc-userBadge][refreshUser] 获取 LToken 失败");
      await TGLogger.Error(
        `[tc-userBadge][refreshUser] ${ltokenRes.retcode}: ${ltokenRes.message}`,
      );
    }
  }
  await showLoading.update("正在获取 CookieToken");
  const cookieTokenRes = await PassportApi.cookieToken(ck);
  if (typeof cookieTokenRes === "string") {
    await showLoading.update("获取 CookieToken 成功");
    ck.cookie_token = cookieTokenRes;
    await TGLogger.Info("[tc-userBadge][refreshUser] 获取 CookieToken 成功");
  } else {
    await showLoading.update("获取 CookieToken 失败");
    showSnackbar.error(`[${cookieTokenRes.retcode}]${cookieTokenRes.message}`);
    await TGLogger.Error("[tc-userBadge][refreshUser] 获取 CookieToken 失败");
    await TGLogger.Error(
      `[tc-userBadge][refreshUser] ${cookieTokenRes.retcode}: ${cookieTokenRes.message}`,
    );
  }
  account.cookie = ck;
  await showLoading.update("正在获取用户信息");
  const infoRes = await BBSApi.userInfo(ck);
  if ("retcode" in infoRes) {
    await showLoading.update("获取用户信息失败");
    showSnackbar.error(`[${infoRes.retcode}]${infoRes.message}`);
    await TGLogger.Error("[tc-userBadge][refreshUserInfo] 获取用户信息失败");
    await TGLogger.Error(`[tc-userBadge][refreshUserInfo] ${infoRes.retcode}: ${infoRes.message}`);
  } else {
    await showLoading.update("获取用户信息成功");
    account.brief = {
      nickname: infoRes.nickname,
      uid: infoRes.uid,
      avatar: infoRes.avatar_url,
      desc: infoRes.introduce,
    };
    await TGLogger.Info("[tc-userBadge][refreshUserInfo] 获取用户信息成功");
  }
  await TSUserAccount.account.saveAccount(account);
  await showLoading.update("正在获取账号信息");
  const accountRes = await TakumiApi.bind.gameRoles(ck);
  if (Array.isArray(accountRes)) {
    await showLoading.update("获取账号信息成功");
    await TGLogger.Info("[tc-userBadge][refreshUserInfo] 获取账号信息成功");
    await TSUserAccount.game.saveAccounts(account.uid, accountRes);
  } else {
    await showLoading.update("获取账号信息失败");
    showSnackbar.error(`[${accountRes.retcode}]${accountRes.message}`);
    await TGLogger.Error("[tc-userBadge][refreshUserInfo] 获取账号信息失败");
    await TGLogger.Error(
      `[tc-userBadge][refreshUserInfo] ${accountRes.retcode}: ${accountRes.message}`,
    );
  }
  await showLoading.end();
}

async function loadAccount(ac: string): Promise<void> {
  if (uid.value && ac === uid.value) {
    showSnackbar.warn("该账户已经登录，无需切换");
    return;
  }
  const accountGet = await TSUserAccount.account.getAccount(ac);
  if (!accountGet) {
    showSnackbar.warn(`未找到${uid}的账号信息，请重新登录`);
    return;
  }
  uid.value = ac;
  briefInfo.value = accountGet.brief;
  cookie.value = accountGet.cookie;
  const gameAccount = await TSUserAccount.game.getCurAccount(ac);
  if (!gameAccount) {
    showSnackbar.warn(`未找到${uid}的游戏账号信息，请尝试刷新`);
    return;
  }
  account.value = gameAccount;
  showSnackbar.success(`成功切换到用户${uid}`);
}

async function confirmRefreshUser(ac: string): Promise<void> {
  const freshCheck = await showDialog.check("确认刷新用户信息吗？", "将会重新获取用户信息");
  if (!freshCheck) {
    showSnackbar.cancel("已取消刷新用户信息");
    return;
  }
  await refreshUser(ac);
  if (uid.value === ac) {
    showSnackbar.success("成功刷新用户信息");
    return;
  }
  const switchCheck = await showDialog.check("是否切换用户？", `将切换到用户${ac}`);
  if (!switchCheck) return;
  await loadAccount(ac);
}

async function confirmCopyCookie(): Promise<void> {
  if (!cookie.value) {
    showSnackbar.warn("请先登录");
    return;
  }
  const copyCheck = await showDialog.check("确认复制 Cookie 吗？", "将会复制当前登录的 Cookie");
  if (!copyCheck) {
    showSnackbar.cancel("已取消复制 Cookie");
    return;
  }
  const ckText = TSUserAccount.account.copy(cookie.value);
  await navigator.clipboard.writeText(ckText);
  showSnackbar.success("已复制 Cookie!");
}

async function tryGetCaptcha(phone: string, aigis?: string): Promise<string | false> {
  const captchaResp = await Mys.User.getCaptcha(phone, aigis);
  if ("retcode" in captchaResp) {
    if (!captchaResp.data || captchaResp.data === "") {
      showSnackbar.error(`[${captchaResp.retcode}] ${captchaResp.message}`);
      return false;
    }
    // @ts-expect-error type {} is not assignable to type string
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
      showSnackbar.error(`[${loginResp.retcode}] ${loginResp.message}`);
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
  if (!uid.value) {
    showSnackbar.warn("未登录!");
    return;
  }
  gameAccounts.value = await TSUserAccount.game.getAccount(uid.value);
  if (gameAccounts.value.length === 0) {
    showSnackbar.warn("未找到账户的游戏数据，请尝试刷新!");
    return;
  }
}

async function addByCookie(): Promise<void> {
  const ckInput = await showDialog.input("请输入Cookie", "Cookie:");
  if (!ckInput) {
    showSnackbar.cancel("已取消Cookie输入");
    return;
  }
  if (ckInput === "") {
    showSnackbar.warn("请输入Cookie!");
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
    showSnackbar.warn("Cookie格式错误");
    await TGLogger.Error(`解析Cookie失败：${ckInput}`);
    return;
  }
  await showLoading.start("正在添加用户", "正在尝试刷新Cookie");
  const ck: TGApp.App.Account.Cookie = {
    account_id: ckRes.stuid,
    ltuid: ckRes.stuid,
    stuid: ckRes.stuid,
    mid: ckRes.mid,
    cookie_token: "",
    stoken: ckRes.stoken,
    ltoken: "",
  };
  await showLoading.update("正在获取 LToken");
  const ltokenRes = await PassportApi.lToken.get(ck);
  if (typeof ltokenRes !== "string") {
    await showLoading.end();
    showSnackbar.error(`[${ltokenRes.retcode}]${ltokenRes.message}`);
    await TGLogger.Error(`获取LToken失败：${ltokenRes.retcode}-${ltokenRes.message}`);
    return;
  }
  ck.ltoken = ltokenRes;
  await showLoading.update("正在获取 CookieToken");
  const cookieTokenRes = await PassportApi.cookieToken(ck);
  if (typeof cookieTokenRes !== "string") {
    await showLoading.end();
    showSnackbar.error(`[${cookieTokenRes.retcode}]${cookieTokenRes.message}`);
    await TGLogger.Error(
      `获取CookieToken失败：${cookieTokenRes.retcode}-${cookieTokenRes.message}`,
    );
    return;
  }
  ck.cookie_token = cookieTokenRes;
  await showLoading.update("正在获取用户信息");
  const briefRes = await BBSApi.userInfo(ck);
  if ("retcode" in briefRes) {
    await showLoading.end();
    showSnackbar.error(`[${briefRes.retcode}]${briefRes.message}`);
    await TGLogger.Error(`获取用户数据失败：${briefRes.retcode}-${briefRes.message}`);
    return;
  }
  const briefInfo: TGApp.App.Account.BriefInfo = {
    nickname: briefRes.nickname,
    uid: briefRes.uid,
    avatar: briefRes.avatar_url,
    desc: briefRes.introduce,
  };
  await showLoading.update("正在保存用户数据");
  await TSUserAccount.account.saveAccount({
    uid: briefInfo.uid,
    cookie: ck,
    brief: briefInfo,
    updated: "",
  });
  await showLoading.update("正在获取游戏账号");
  const gameRes = await TakumiApi.bind.gameRoles(ck);
  if (!Array.isArray(gameRes)) {
    await showLoading.end();
    showSnackbar.error(`[${gameRes.retcode}]${gameRes.message}`);
    return;
  }
  await showLoading.update("正在保存游戏账号");
  await TSUserAccount.game.saveAccounts(briefInfo.uid, gameRes);
  const curAccount = await TSUserAccount.game.getCurAccount(briefInfo.uid);
  if (!curAccount) {
    await showLoading.end();
    showSnackbar.warn("未检测到游戏账号，请重新刷新");
    return;
  }
  await showLoading.end();
  showSnackbar.success("成功添加用户!");
}

async function clearUser(user: TGApp.App.Account.User): Promise<void> {
  if (user.uid === uid.value) {
    showSnackbar.warn("当前登录用户不许删除！");
    return;
  }
  const delCheck = await showDialog.check("确认删除用户吗？", "将删除账号及其游戏账号数据");
  if (!delCheck) {
    showSnackbar.cancel("已取消删除用户数据");
    return;
  }
  await showLoading.start("正在删除用户数据", `正在删除用户${user.uid}`);
  await TSUserAccount.account.deleteAccount(user.uid);
  await showLoading.end();
  showSnackbar.success("成功删除用户!");
}
</script>
<style lang="css" scoped>
.tcu-box {
  border-radius: 10px;
  background-image: linear-gradient(to right, #f78ca0 0%, #f9748f 19%, #fd868c 60%, #fe9a8b 100%);
  color: var(--tgc-white-1);
}

.tcu-btn {
  margin-left: 5px;
}
</style>
