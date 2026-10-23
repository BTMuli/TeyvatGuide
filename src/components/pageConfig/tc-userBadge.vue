<template>
  <v-card class="tcu-box">
    <template #prepend>
      <v-avatar :image="userInfo.avatar" />
    </template>
    <template #title>{{ userInfo.nickname }}</template>
    <template #subtitle>{{ maskUid(userInfo.uid) }}</template>
    <template #text>{{ userInfo.desc }}</template>
    <template #append>
      <v-menu location="start">
        <template v-slot:activator="{ props }">
          <v-btn
            icon="mdi-gamepad-variant"
            title="切换默认游戏账户"
            v-bind="props"
            variant="outlined"
            @click="showAccounts()"
          />
        </template>
        <v-list>
          <v-list-item
            v-for="ac in gameAccounts"
            :key="ac.gameUid"
            @click="handleSwitchGameAccount(ac.gameUid)"
          >
            <v-list-item-title>{{ ac.nickname }}</v-list-item-title>
            <v-list-item-subtitle>
              {{ maskUidTail(ac.gameUid) }}({{ ac.regionName }})</v-list-item-subtitle
            >
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
      <v-btn
        :disabled="uid === undefined"
        icon="mdi-refresh"
        title="刷新用户信息"
        variant="outlined"
        @click="confirmRefreshUser(uid!)"
      />
      <v-btn
        :disabled="cookie === undefined"
        icon="mdi-cookie"
        title="复制Cookie"
        variant="outlined"
        @click="confirmCopyCookie"
      />
      <v-menu location="start">
        <template v-slot:activator="{ props }">
          <v-btn
            icon="mdi-account-switch"
            title="切换账户"
            v-bind="props"
            variant="outlined"
            @click="showMenu"
          />
        </template>
        <v-list>
          <v-list-item v-for="ac in accounts" :key="ac.uid">
            <template #prepend>
              <v-avatar>
                <v-img :src="ac.brief.avatar" alt="avatar" />
              </v-avatar>
            </template>
            <v-list-item-title>{{ ac.brief.nickname }}</v-list-item-title>
            <v-list-item-subtitle>{{ maskUid(ac.brief.uid) }}</v-list-item-subtitle>
            <template #append>
              <div v-if="ac.uid === uid" title="当前登录账号">
                <v-icon color="green">mdi-account-check</v-icon>
              </div>
              <v-icon
                v-else
                icon="mdi-account-convert"
                size="small"
                title="切换用户"
                @click="loadAccount(ac.uid)"
              />
              <v-icon
                color="var(--tgc-od-red)"
                class="tcu-btn"
                icon="mdi-delete"
                size="small"
                title="删除用户"
                @click="clearUser(ac)"
              />
            </template>
          </v-list-item>
        </v-list>
      </v-menu>
      <v-menu location="start">
        <template v-slot:activator="{ props }">
          <v-btn icon="mdi-account-plus" title="添加账户" v-bind="props" variant="outlined" />
        </template>
        <v-list>
          <v-list-item append-icon="mdi-cellphone" @click="tryCaptchaLogin()">
            <v-list-item-title>验证码登录✨推荐</v-list-item-title>
            <v-list-item-subtitle>使用手机号登录</v-list-item-subtitle>
          </v-list-item>
          <v-list-item @click="tryCodeLogin()">
            <v-list-item-title>扫码登录</v-list-item-title>
            <v-list-item-subtitle>使用米游社扫码登录</v-list-item-subtitle>
            <template #append>
              <img alt="launcher" class="menu-icon" src="/platforms/mhy/mys.webp" />
            </template>
          </v-list-item>
          <v-list-item append-icon="mdi-account-plus" @click="addByCookie()">
            <v-list-item-title>手动添加</v-list-item-title>
            <v-list-item-subtitle>手动输入Cookie</v-list-item-subtitle>
          </v-list-item>
        </v-list>
      </v-menu>
    </template>
  </v-card>
  <ToGameLogin v-model="showLoginQr" @success="tryGetTokens" />
</template>
<script lang="ts" setup>
import showDialog from "@comp/func/dialog.js";
import showLoading from "@comp/func/loading.js";
import showSnackbar from "@comp/func/snackbar.js";
import ToGameLogin from "@comp/pageConfig/tco-gameLogin.vue";
import { useLoginFlow } from "@hooks/useLoginFlow.js";
import bbsReq from "@req/bbsReq.js";
import passportReq from "@req/passportReq.js";
import takumiReq from "@req/takumiReq.js";
import TSUserAccount from "@Sqlm/userAccount.js";
import useAppStore from "@store/app.js";
import useUserStore from "@store/user.js";
import { maskUid, maskUidTail } from "@utils/display/TGUid.js";
import TGHttps from "@utils/network/TGHttps.js";
import TGLogger from "@utils/system/TGLogger.js";
import { storeToRefs } from "pinia";
import { computed, shallowRef } from "vue";

const userStore = useUserStore();
const { isLogin } = storeToRefs(useAppStore());
const { uid, briefInfo, cookie, account } = storeToRefs(userStore);
const { showLoginQr, tryGetTokens, tryCaptchaLogin, tryCodeLogin, addByCookie } = useLoginFlow();

async function handleSwitchGameAccount(gameUid: string): Promise<void> {
  await userStore.switchGameAccount(gameUid);
}

const accounts = shallowRef<Array<TGApp.App.Account.User>>([]);
const gameAccounts = shallowRef<Array<TGApp.Sqlite.Account.Game>>([]);
const userInfo = computed<TGApp.App.Account.BriefInfo>(() => {
  if (uid.value) return briefInfo.value;
  return {
    nickname: "未登录",
    uid: "-1",
    desc: "请登录",
    avatar: "/UI/nav/lumine.webp",
  };
});

async function refreshUser(uid: string, full: boolean) {
  let account = await TSUserAccount.account.getAccount(uid);
  if (!account) {
    showSnackbar.warn(`未获取到${maskUid(uid)}账号数据，请重新登录!`);
    return;
  }
  let ck = account.cookie;
  await showLoading.start("正在刷新用户信息", "正在验证 LToken");
  try {
    const verifyLTokenRes = await passportReq.lToken.verify(ck);
    if (verifyLTokenRes.retcode === 0) {
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
      try {
        const ltokenRes = await passportReq.lToken.get(ck);
        if (ltokenRes.retcode === 0) {
          await showLoading.update("获取 LToken 成功");
          ck.ltoken = ltokenRes.data.ltoken;
          await TGLogger.Info("[tc-userBadge][refreshUser] 获取 LToken 成功");
        } else {
          await showLoading.update("获取 LToken 失败");
          showSnackbar.error(`[${ltokenRes.retcode}]${ltokenRes.message}`);
          await TGLogger.Warn("[tc-userBadge][refreshUser] 获取 LToken 失败");
          await TGLogger.Warn(
            `[tc-userBadge][refreshUser] ${ltokenRes.retcode}: ${ltokenRes.message}`,
          );
        }
      } catch (e) {
        const errMsg = TGHttps.getErrMsg(e);
        await showLoading.update("获取 LToken 失败");
        showSnackbar.error(`获取 LToken 失败：${errMsg}`);
        await TGLogger.Error(`[tc-userBadge][refreshUser] 获取 LToken 异常：${errMsg}`);
      }
    }
  } catch (e) {
    const errMsg = TGHttps.getErrMsg(e);
    await showLoading.update("验证 LToken 失败");
    showSnackbar.error(`验证 LToken 失败：${errMsg}`);
    await TGLogger.Error(`[tc-userBadge][refreshUser] 验证 LToken 异常：${errMsg}`);
  }
  await showLoading.update("正在获取 CookieToken");
  try {
    const cookieTokenRes = await passportReq.cookieToken(ck);
    if (cookieTokenRes.retcode === 0) {
      await showLoading.update("获取 CookieToken 成功");
      ck.cookie_token = cookieTokenRes.data.cookie_token;
      await TGLogger.Info("[tc-userBadge][refreshUser] 获取 CookieToken 成功");
    } else {
      await showLoading.update("获取 CookieToken 失败");
      showSnackbar.error(`[${cookieTokenRes.retcode}]${cookieTokenRes.message}`);
      await TGLogger.Warn("[tc-userBadge][refreshUser] 获取 CookieToken 失败");
      await TGLogger.Warn(
        `[tc-userBadge][refreshUser] ${cookieTokenRes.retcode}: ${cookieTokenRes.message}`,
      );
    }
  } catch (e) {
    const errMsg = TGHttps.getErrMsg(e);
    await showLoading.update("获取 CookieToken 失败");
    showSnackbar.error(`获取 CookieToken 失败：${errMsg}`);
    await TGLogger.Error(`[tc-userBadge][refreshUser] 获取 CookieToken 异常：${errMsg}`);
  }
  account.cookie = ck;
  await showLoading.update("正在获取用户信息");
  try {
    const infoRes = await bbsReq.userInfo(ck);
    if (infoRes.retcode !== 0) {
      await showLoading.update("获取用户信息失败");
      showSnackbar.error(`[${infoRes.retcode}]${infoRes.message}`);
      await TGLogger.Warn("[tc-userBadge][refreshUserInfo] 获取用户信息失败");
      await TGLogger.Warn(`[tc-userBadge][refreshUserInfo] ${infoRes.retcode}: ${infoRes.message}`);
    } else {
      await showLoading.update("获取用户信息成功");
      account.brief = {
        nickname: infoRes.data.user_info.nickname,
        uid: infoRes.data.user_info.uid,
        avatar: infoRes.data.user_info.avatar_url,
        desc: infoRes.data.user_info.introduce,
      };
      await TGLogger.Info("[tc-userBadge][refreshUserInfo] 获取用户信息成功");
    }
  } catch (e) {
    const errMsg = TGHttps.getErrMsg(e);
    await showLoading.update("获取用户信息失败");
    showSnackbar.error(`获取用户信息失败：${errMsg}`);
    await TGLogger.Error(`[tc-userBadge][refreshUserInfo] 获取用户信息异常：${errMsg}`);
  }
  if (!full) {
    await showLoading.end();
    return;
  }
  await TSUserAccount.account.saveAccount(account);
  await showLoading.update("正在获取游戏账号信息");
  let accountRes: TGApp.BBS.Game.AccountResp | undefined;
  try {
    accountRes = await takumiReq.bind.gameRoles(ck);
    if (accountRes.retcode !== 0) {
      await showLoading.update("获取游戏账号信息失败");
      showSnackbar.error(`[${accountRes.retcode}] ${accountRes.message}`);
      await TGLogger.Warn("[tc-userBadge][refreshUserInfo] 获取账号信息失败");
      await TGLogger.Warn(
        `[tc-userBadge][refreshUserInfo] ${accountRes.retcode}: ${accountRes.message}`,
      );
    } else {
      await showLoading.update("获取游戏账号信息成功");
      await TGLogger.Info("[tc-userBadge][refreshUserInfo] 获取账号信息成功");
      await TSUserAccount.game.saveAccounts(account.uid, accountRes.data.list);
    }
  } catch (e) {
    const errMsg = TGHttps.getErrMsg(e);
    await showLoading.update("获取游戏账号信息失败");
    showSnackbar.error(`获取游戏账号信息失败：${errMsg}`);
    await TGLogger.Error(`[tc-userBadge][refreshUserInfo] 获取账号信息异常：${errMsg}`);
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
    showSnackbar.warn(`未找到${maskUid(ac)}的账号信息，请重新登录`);
    return;
  }
  uid.value = ac;
  briefInfo.value = accountGet.brief;
  cookie.value = accountGet.cookie;
  const gameAccount = await TSUserAccount.game.getCurAccount(ac);
  if (!gameAccount) {
    showSnackbar.warn(`未找到${maskUid(uid.value)}的游戏账号信息，请尝试刷新`);
    return;
  }
  account.value = gameAccount;
  isLogin.value = true;
  showSnackbar.success(`成功切换到用户${maskUid(uid.value)}`);
}

async function confirmRefreshUser(ac: string): Promise<void> {
  const freshCheck = await showDialog.checkF({
    title: "确认刷新用户信息?",
    text: "将刷新用户Cookie跟游戏账号",
    cancelLabel: "仅刷新Cookie",
  });
  if (freshCheck === undefined) {
    showSnackbar.cancel("已取消刷新用户信息");
    return;
  }
  await refreshUser(ac, freshCheck);
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
  const ckText = TSUserAccount.account.copy(cookie.value);
  await navigator.clipboard.writeText(ckText);
  showSnackbar.success("已复制 Cookie!");
}

async function showMenu(): Promise<void> {
  accounts.value = await TSUserAccount.account.getAllAccount();
}

async function showAccounts(): Promise<void> {
  if (!uid.value) {
    showSnackbar.warn("未登录!");
    return;
  }
  const accountsGet = await TSUserAccount.game.getAccount(uid.value);
  gameAccounts.value = accountsGet.filter((a) => a.gameBiz === "hk4e_cn");
  if (gameAccounts.value.length === 0) {
    showSnackbar.warn("未找到账户的游戏数据，请尝试刷新!");
    return;
  }
}

async function clearUser(user: TGApp.App.Account.User): Promise<void> {
  const isCurrent = user.uid === uid.value;
  const delCheck = await showDialog.check(
    isCurrent ? "确认退出当前米社账号？" : "确认删除米社账号？",
    "将清除该米社账号的 Cookie 及游戏账号绑定；\n以游戏 UID 保存的战绩等数据会保留",
  );
  if (!delCheck) {
    showSnackbar.cancel(isCurrent ? "已取消退出" : "已取消删除米社账号");
    return;
  }
  await showLoading.start("正在清除米社账号", `正在清除米社账号${maskUid(user.uid)}`);
  const hasFallbackAccount = await userStore.removeAccount(user.uid);
  accounts.value = accounts.value.filter((accountItem) => accountItem.uid !== user.uid);
  if (isCurrent) {
    isLogin.value = hasFallbackAccount;
    gameAccounts.value = hasFallbackAccount
      ? (await TSUserAccount.game.getAccount(uid.value!)).filter(
          (item) => item.gameBiz === "hk4e_cn",
        )
      : [];
  }
  await showLoading.end();
  const switchHint = isCurrent && hasFallbackAccount ? `，已切换至${briefInfo.value.nickname}` : "";
  showSnackbar.success(`${isCurrent ? "已退出米社账号" : "已删除米社账号"}${switchHint}`);
}
</script>
<style lang="css" scoped>
.tcu-box {
  position: relative;
  width: 100%;
  flex-shrink: 0;
  border-radius: 8px;
  background-image: linear-gradient(to right, #f78ca0 0%, #f9748f 19%, #fd868c 60%, #fe9a8b 100%);
  color: var(--tgc-white-1);
}

.tcu-btn {
  margin-left: 5px;
}

.menu-icon {
  width: 24px;
  height: 24px;
  border-radius: 4px;
}
</style>
