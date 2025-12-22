<template>
  <v-navigation-drawer :permanent="true" :rail="rail" class="tsb-box">
    <v-list :nav="true" class="side-list" density="compact">
      <v-list-item
        :append-icon="!rail ? 'mdi-chevron-left' : undefined"
        :prepend-icon="rail ? 'mdi-chevron-right' : undefined"
        @click="rail = !rail"
      />
      <!-- 菜单项 -->
      <v-list-item :link="true" :title.attr="'首页'" href="/">
        <template #title>首页</template>
        <template #prepend>
          <img alt="homeIcon" class="side-icon paimon" src="/source/UI/paimon.webp" />
        </template>
      </v-list-item>
      <v-list-item :link="true" href="/announcements" title.attr="'公告'">
        <template #title>公告</template>
        <template #prepend>
          <img alt="annoIcon" class="side-icon" src="@/assets/icons/board.svg" />
        </template>
      </v-list-item>
      <v-list-item :href="`/news/2/${recentNewsType}`" :link="true" :title.attr="'资讯'">
        <template #title>资讯</template>
        <template #prepend>
          <img alt="mihoyo" class="side-icon" src="/platforms/mhy/mys.webp" />
        </template>
      </v-list-item>
      <v-list-item :link="true" :title.attr="'帖子'" href="/posts/forum">
        <template #title>帖子</template>
        <template #prepend>
          <img alt="posts" class="side-icon" src="/source/UI/posts.webp" />
        </template>
      </v-list-item>
      <v-list-item :link="true" :title.attr="'成就'" href="/achievements">
        <template #title>成就</template>
        <template #prepend>
          <img alt="achievementsIcon" class="side-icon" src="@/assets/icons/achievements.svg" />
        </template>
      </v-list-item>
      <v-list-item :link="true" :title.attr="'背包材料'" href="/bag/material">
        <template #title>背包材料</template>
        <template #prepend>
          <img alt="materialBagIcon" class="side-icon" src="/icon/material/121234.webp" />
        </template>
      </v-list-item>
      <v-divider />
      <v-list-item :link="true" :title.attr="'原神战绩'" href="/user/record">
        <template #title>原神战绩</template>
        <template #prepend>
          <img alt="record" class="side-icon" src="/source/UI/userRecord.webp" />
        </template>
      </v-list-item>
      <v-list-item :link="true" :title.attr="'我的角色'" href="/user/characters">
        <template #title>我的角色</template>
        <template #prepend>
          <img alt="characters" class="side-icon" src="/source/UI/userAvatar.webp" />
        </template>
      </v-list-item>
      <v-menu :offset="[8, 0]" :open-on-click="true" location="end">
        <template #activator="{ props }">
          <v-list-item :title.attr="'高难挑战'" v-bind="props">
            <template #title>高难挑战</template>
            <template #prepend>
              <img alt="abyssLab" class="side-icon" src="/source/UI/userAbyssLab.webp" />
            </template>
          </v-list-item>
        </template>
        <v-list :nav="true" class="side-list-menu sub" density="compact">
          <v-list-item :link="true" class="side-item-menu" href="/user/abyss" title="深境螺旋">
            <template #prepend>
              <img alt="abyss" class="side-icon-menu" src="/source/UI/userAbyss.webp" />
            </template>
          </v-list-item>
          <v-list-item :link="true" class="side-item-menu" href="/user/combat" title="真境剧诗">
            <template #prepend>
              <img alt="combat" class="side-icon-menu" src="/source/UI/userCombat.webp" />
            </template>
          </v-list-item>
          <v-list-item :link="true" class="side-item-menu" href="/user/challenge" title="幽境危战">
            <template #prepend>
              <img alt="challenge" class="side-icon-menu" src="/source/UI/userChallenge.webp" />
            </template>
          </v-list-item>
        </v-list>
      </v-menu>
      <v-list-item :link="true" :title.attr="'祈愿记录'" href="/user/gacha">
        <template #title>祈愿记录</template>
        <template #prepend>
          <img alt="gacha" class="side-icon" src="/source/UI/userGacha.webp" />
        </template>
      </v-list-item>
      <v-list-item :link="true" :title.attr="'实用脚本'" href="/user/scripts">
        <template #title>实用脚本</template>
        <template #prepend>
          <img alt="scripts" class="side-icon" src="/source/UI/toolbox.webp" />
        </template>
      </v-list-item>
      <v-divider />
      <v-list-item
        v-show="isDevEnv"
        :link="true"
        :title.attr="'测试页面'"
        href="/test"
        prepend-icon="mdi-test-tube"
      >
        <template #title>测试页面</template>
      </v-list-item>
      <v-divider v-show="isDevEnv" />
      <v-menu :offset="[8, 0]" :open-on-click="true" location="end">
        <template #activator="{ props }">
          <v-list-item :title.attr="'图鉴'" v-bind="props">
            <template #title>图鉴</template>
            <template #prepend>
              <img alt="wikiIcon" class="side-icon" src="/source/UI/wikiIcon.webp" />
            </template>
          </v-list-item>
        </template>
        <v-list :nav="true" class="side-list-menu sub" density="compact">
          <v-list-item :link="true" class="side-item-menu" href="/wiki/character" title="角色图鉴">
            <template #prepend>
              <img alt="characterIcon" class="side-icon-menu" src="/source/UI/wikiAvatar.webp" />
            </template>
          </v-list-item>
          <v-list-item :link="true" class="side-item-menu" href="/wiki/weapon" title="武器图鉴">
            <template #prepend>
              <img alt="weaponIcon" class="side-icon-menu" src="/source/UI/wikiWeapon.webp" />
            </template>
          </v-list-item>
          <v-list-item :link="true" class="side-item-menu" href="/wiki/nameCard">
            <template #default>
              <v-icon color="var(--tgc-yellow-2)" size="20">mdi-credit-card-outline</v-icon>
              <span style="margin-left: 10px; font-size: 0.8125rem">名片图鉴</span>
            </template>
          </v-list-item>
          <v-list-item :link="true" class="side-item-menu" href="/wiki/material" title="材料图鉴">
            <template #prepend>
              <img alt="gcgIcon" class="side-icon-menu" src="/source/UI/wikiGCG.webp" />
            </template>
          </v-list-item>
        </v-list>
      </v-menu>
      <v-list-item :link="true" :title.attr="'留影叙佳期'" href="/archive/birthday">
        <template #title>留影叙佳期</template>
        <template #prepend>
          <img alt="archive_birthday_icon" class="side-icon" src="/source/UI/act_birthday.webp" />
        </template>
      </v-list-item>
      <!-- 底部菜单 -->
      <div class="bottom-menu">
        <!-- 用户菜单 -->
        <v-menu :open-on-click="true" location="end">
          <template #activator="{ props }">
            <v-list-item :title.attr="userInfo.nickname" v-bind="props">
              <template #title>{{ userInfo.nickname }}</template>
              <template #prepend>
                <img :src="userInfo.avatar" alt="userIcon" class="side-icon paimon" />
              </template>
            </v-list-item>
          </template>
          <v-list :nav="true" class="side-list-menu sub" density="compact">
            <v-list-item
              v-if="isLogin"
              class="side-item-menu"
              title="签到"
              @click="openClient('sign_in')"
            >
              <template #prepend>
                <img alt="sing_in" class="side-icon-menu" src="/source/UI/userGacha.webp" />
              </template>
            </v-list-item>
            <v-list-item
              v-if="isLogin"
              class="side-item-menu"
              title="战绩"
              @click="openClient('game_record')"
            >
              <template #prepend>
                <img alt="game_record" class="side-icon-menu" src="/source/UI/userRecord.webp" />
              </template>
            </v-list-item>
            <v-list-item
              v-if="isLogin"
              class="side-item-menu"
              title="便笺"
              @click="openClient('daily_note')"
            >
              <template #prepend>
                <img alt="daily_note" class="side-icon-menu" src="/icon/material/210.webp" />
              </template>
            </v-list-item>
            <v-list-item :link="true" class="side-item-menu" href="/collection" title="收藏">
              <template #prepend>
                <img alt="collect" class="side-icon-menu" src="/source/UI/posts.webp" />
              </template>
            </v-list-item>
            <v-list-item
              v-if="isLogin"
              class="side-item-menu"
              title="关注"
              @click="showFollow = true"
            >
              <template #prepend>
                <img alt="follow" class="side-icon-menu" src="/platforms/mhy/mys.webp" />
              </template>
            </v-list-item>
            <v-list-item
              v-if="canLaunch"
              class="side-item-menu"
              title="启动"
              @click="tryLaunchGame()"
            >
              <template #prepend>
                <img alt="genshin" class="side-icon-menu" src="/icon/material/220120.webp" />
              </template>
            </v-list-item>
          </v-list>
        </v-menu>
        <!-- 添加账号 -->
        <v-menu :disabled="isTryLogin" :open-on-click="true" location="end">
          <template #activator="{ props }">
            <v-list-item :title.attr="'添加账号'" prepend-icon="mdi-account-plus" v-bind="props">
              <template #title>添加账号</template>
            </v-list-item>
          </template>
          <v-list :nav="true" class="side-list-menu" density="compact">
            <v-list-item class="side-item-menu sub" @click="tryCaptchaLogin()">
              <v-list-item-title>验证码登录✨推荐</v-list-item-title>
              <v-list-item-subtitle>使用手机号登录</v-list-item-subtitle>
              <template #prepend>
                <v-icon class="side-icon-menu">mdi-shield-key-outline</v-icon>
              </template>
            </v-list-item>
            <v-list-item class="side-item-menu sub" @click="tryCodeLogin()">
              <v-list-item-title>扫码登录✨推荐</v-list-item-title>
              <v-list-item-subtitle>使用米游社扫码登录</v-list-item-subtitle>
              <template #prepend>
                <img alt="launcher" class="side-icon-menu" src="/platforms/mhy/mys.webp" />
              </template>
            </v-list-item>
            <v-list-item class="side-item-menu sub" @click="addByCookie()">
              <v-list-item-title>手动添加</v-list-item-title>
              <v-list-item-subtitle>手动输入Cookie</v-list-item-subtitle>
              <template #prepend>
                <v-icon class="side-icon-menu">mdi-cookie</v-icon>
              </template>
            </v-list-item>
          </v-list>
        </v-menu>
        <!-- 切换账号 -->
        <v-list-item
          v-if="isLogin"
          :disabled="isTryLogin"
          :title.attr="'切换账号'"
          prepend-icon="mdi-account-switch"
          @click="trySwitchAccount()"
        >
          <v-list-item-title>切换账号</v-list-item-title>
        </v-list-item>
        <!-- 主题切换 -->
        <v-list-item
          :prepend-icon="theme === 'default' ? 'mdi-weather-night' : 'mdi-weather-sunny'"
          :title.attr="themeTitle"
          @click="switchTheme()"
        >
          <template #title>{{ themeTitle }}</template>
        </v-list-item>
        <!-- 设置页面 -->
        <v-list-item :link="true" :title.attr="'设置'" href="/config" value="config">
          <template #title>设置</template>
          <template #prepend>
            <img alt="setting" class="side-icon" src="@/assets/icons/setting.svg" />
          </template>
        </v-list-item>
      </div>
    </v-list>
  </v-navigation-drawer>
  <vp-overlay-follow v-model="showFollow" />
  <ToGameLogin v-model="showLoginQr" :launcher="false" @success="tryGetTokens" />
  <ToSwitchAc v-model="showAcSwitch" />
</template>
<script lang="ts" setup>
import showDialog from "@comp/func/dialog.js";
import showGeetest from "@comp/func/geetest.js";
import showLoading from "@comp/func/loading.js";
import showSnackbar from "@comp/func/snackbar.js";
import ToGameLogin from "@comp/pageConfig/tco-gameLogin.vue";
import VpOverlayFollow from "@comp/viewPost/vp-overlay-follow.vue";
import bbsReq from "@req/bbsReq.js";
import passportReq from "@req/passportReq.js";
import takumiReq from "@req/takumiReq.js";
import TSUserAccount from "@Sqlm/userAccount.js";
import useAppStore from "@store/app.js";
import useUserStore from "@store/user.js";
import { event, path, webviewWindow } from "@tauri-apps/api";
import { invoke } from "@tauri-apps/api/core";
import type { Event, UnlistenFn } from "@tauri-apps/api/event";
import { exists } from "@tauri-apps/plugin-fs";
import { Command } from "@tauri-apps/plugin-shell";
import mhyClient from "@utils/TGClient.js";
import TGLogger from "@utils/TGLogger.js";
import { storeToRefs } from "pinia";
import { computed, onMounted, onUnmounted, ref } from "vue";

import ToSwitchAc from "./to-switchAc.vue";

const { sidebar, theme, isLogin, recentNewsType, gameDir, isInAdmin } = storeToRefs(useAppStore());
const { uid, briefInfo, cookie, account } = storeToRefs(useUserStore());
let themeListener: UnlistenFn | null = null;
// @ts-expect-error The import.meta meta-property is not allowed in files which will build into CommonJS output.
const isDevEnv = import.meta.env.MODE === "development";
const showFollow = ref<boolean>();
const showLoginQr = ref<boolean>(false);
const showAcSwitch = ref<boolean>(false);
const isTryLogin = ref<boolean>(false);
const rail = computed<boolean>({
  get: () => sidebar.value.collapse,
  set: (v) => (sidebar.value.collapse = v),
});
const userInfo = computed<TGApp.App.Account.BriefInfo>(() => {
  if (briefInfo.value && briefInfo.value.nickname) return briefInfo.value;
  return { nickname: "未登录", uid: "-1", desc: "请扫码登录", avatar: "/source/UI/lumine.webp" };
});
const themeTitle = computed<string>(() => (theme.value === "default" ? "深色模式" : "浅色模式"));
const canLaunch = computed<boolean>(() => {
  if (!isLogin.value) return false;
  if (!gameDir.value || gameDir.value === "未设置") return false;
  return account.value.isOfficial === 1;
});

onMounted(async () => {
  themeListener = await event.listen<string>("readTheme", (e: Event<string>) => {
    theme.value = e.payload === "default" ? "default" : "dark";
  });
  if (webviewWindow.getCurrentWebviewWindow().label === "TeyvatGuide") await mhyClient.run();
});

onUnmounted(() => {
  if (themeListener !== null) {
    themeListener();
    themeListener = null;
  }
});

async function trySwitchAccount(): Promise<void> {
  showAcSwitch.value = true;
}

async function switchTheme(): Promise<void> {
  await event.emit("readTheme", theme.value === "default" ? "dark" : "default");
}

async function openClient(func: string): Promise<void> {
  if (isLogin.value) await mhyClient.open(func);
  else showSnackbar.warn("请前往设置页面登录！");
}

async function tryGetTokens(ck: TGApp.App.Account.Cookie): Promise<void> {
  await showLoading.update("正在获取 LToken");
  const ltokenRes = await passportReq.lToken.get(ck);
  if (typeof ltokenRes !== "string") {
    await showLoading.end();
    showSnackbar.error(`[${ltokenRes.retcode}]${ltokenRes.message}`);
    await TGLogger.Error(`获取LToken失败：${ltokenRes.retcode}-${ltokenRes.message}`);
    isTryLogin.value = false;
    return;
  }
  showSnackbar.success("获取LToken成功");
  ck.ltoken = ltokenRes;
  await showLoading.update("正在获取 CookieToken");
  const cookieTokenRes = await passportReq.cookieToken(ck);
  if (typeof cookieTokenRes !== "string") {
    await showLoading.end();
    showSnackbar.error(`[${cookieTokenRes.retcode}]${cookieTokenRes.message}`);
    await TGLogger.Error(
      `获取CookieToken失败：${cookieTokenRes.retcode}-${cookieTokenRes.message}`,
    );
    isTryLogin.value = false;
    return;
  }
  showSnackbar.success("获取CookieToken成功");
  ck.cookie_token = cookieTokenRes;
  await showLoading.update("正在获取用户信息");
  const briefRes = await bbsReq.userInfo(ck);
  if ("retcode" in briefRes) {
    await showLoading.end();
    showSnackbar.error(`[${briefRes.retcode}]${briefRes.message}`);
    await TGLogger.Error(`获取用户数据失败：${briefRes.retcode}-${briefRes.message}`);
    isTryLogin.value = false;
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
  const gameRes = await takumiReq.bind.gameRoles(cookie.value);
  if (!Array.isArray(gameRes)) {
    await showLoading.end();
    showSnackbar.error(`[${gameRes.retcode}]${gameRes.message}`);
    await TGLogger.Error(`获取游戏账号失败：${gameRes.retcode}-${gameRes.message}`);
    isTryLogin.value = false;
    return;
  }
  showSnackbar.success("获取游戏账号成功");
  await TSUserAccount.game.saveAccounts(briefInfoGet.uid, gameRes);
  const curAccount = await TSUserAccount.game.getCurAccount(briefInfoGet.uid);
  if (!curAccount) {
    showSnackbar.warn("未检测到游戏账号，请重新刷新");
    await showLoading.end();
    isTryLogin.value = false;
    return;
  }
  account.value = curAccount;
  await showLoading.end();
  showSnackbar.success("成功登录!");
  isTryLogin.value = false;
}

/**
 * 验证码登录
 * @since Beta v0.8.7
 * @returns {Promise<void>}
 */
async function tryCaptchaLogin(): Promise<void> {
  if (showLoginQr.value) showLoginQr.value = false;
  isTryLogin.value = true;
  const phone = await showDialog.input("请输入手机号", "+86");
  if (!phone) {
    showSnackbar.cancel("已取消验证码登录");
    isTryLogin.value = false;
    return;
  }
  const phoneReg = /^1[3-9]\d{9}$/;
  if (!phoneReg.test(phone)) {
    showSnackbar.warn("请输入正确的手机号");
    isTryLogin.value = false;
    return;
  }
  const actionType = await tryGetCaptcha(phone);
  if (!actionType) {
    showSnackbar.warn("获取验证码失败");
    isTryLogin.value = false;
    return;
  }
  showSnackbar.success(`已发送验证码到 ${phone}`);
  const captcha = await showDialog.input("请输入验证码", "验证码：", undefined, false);
  if (!captcha) {
    showSnackbar.warn("输入验证码为空");
    isTryLogin.value = false;
    return;
  }
  const loginResp = await tryLoginByCaptcha(phone, captcha, actionType);
  if (!loginResp) {
    showSnackbar.warn("验证码登录失败");
    isTryLogin.value = false;
    return;
  }
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

/**
 * 扫码登录
 * @since Beta v0.8.7
 * @returns {Promise<void>}
 */
async function tryCodeLogin(): Promise<void> {
  showLoginQr.value = true;
}

/**
 * 尝试获取验证码
 * @since Beta v0.8.7
 * @param {string} phone 手机号
 * @param {string} [aigis] aegis参数
 * @returns {Promise<string | null>} 返回 action_type 或 null
 */
async function tryGetCaptcha(phone: string, aigis?: string): Promise<string | false> {
  const captchaResp = await passportReq.captcha.create(phone, aigis);
  if ("retcode" in captchaResp) {
    if (!captchaResp.data || captchaResp.data === "") {
      showSnackbar.error(`[${captchaResp.retcode}] ${captchaResp.message}`);
      await TGLogger.Error(
        `[tc-userBadge][tryGetCaptcha] ${captchaResp.retcode} ${captchaResp.message}`,
      );
      return false;
    }
    const aigisResp: TGApp.BBS.CaptchaLogin.CaptchaAigis = JSON.parse(captchaResp.data);
    const resp = await showGeetest(JSON.parse(aigisResp.data), aigisResp);
    const aigisStr = `${aigisResp.session_id};${btoa(JSON.stringify(resp))}`;
    return await tryGetCaptcha(phone, aigisStr);
  }
  return captchaResp.action_type;
}

/**
 * 尝试通过验证码登录
 * @since Beta v0.8.7
 * @param {string} phone 手机号
 * @param {string} captcha 验证码
 * @param {string} actionType action_type
 * @param {string} [aigis] aegis参数
 * @returns {Promise<TGApp.BBS.CaptchaLogin.LoginResp | null>} 返回登录响应或 null
 */
async function tryLoginByCaptcha(
  phone: string,
  captcha: string,
  actionType: string,
  aigis?: string,
): Promise<TGApp.BBS.CaptchaLogin.LoginRes | false> {
  const loginResp = await passportReq.captcha.login(phone, captcha, actionType, aigis);
  if ("retcode" in loginResp) {
    if (!loginResp.data || loginResp.data === "") {
      showSnackbar.error(`[${loginResp.retcode}] ${loginResp.message}`);
      await TGLogger.Error(
        `[tc-userBadge][tryLoginByCaptcha] ${loginResp.retcode} ${loginResp.message}`,
      );
      return false;
    }
    const aigisResp: TGApp.BBS.CaptchaLogin.CaptchaAigis = JSON.parse(loginResp.data);
    const resp = await showGeetest(JSON.parse(aigisResp.data));
    const aigisStr = `${aigisResp.session_id};${btoa(JSON.stringify(resp))}`;
    return await tryLoginByCaptcha(phone, captcha, actionType, aigisStr);
  }
  return loginResp;
}

/**
 * 通过ck添加账号
 * @since Beta v0.8.7
 * @returns {Promise<void>}
 */
async function addByCookie(): Promise<void> {
  if (showLoginQr.value) showLoginQr.value = false;
  isTryLogin.value = true;
  const ckInput = await showDialog.input("请输入Cookie", "Cookie:");
  if (!ckInput) {
    showSnackbar.cancel("已取消Cookie输入");
    isTryLogin.value = false;
    return;
  }
  if (ckInput === "") {
    showSnackbar.warn("请输入Cookie!");
    isTryLogin.value = false;
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
    isTryLogin.value = false;
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
  const ltokenRes = await passportReq.lToken.get(ck);
  if (typeof ltokenRes !== "string") {
    await showLoading.end();
    showSnackbar.error(`[${ltokenRes.retcode}]${ltokenRes.message}`);
    await TGLogger.Error(`获取LToken失败：${ltokenRes.retcode}-${ltokenRes.message}`);
    isTryLogin.value = false;
    return;
  }
  ck.ltoken = ltokenRes;
  await showLoading.update("正在获取 CookieToken");
  const cookieTokenRes = await passportReq.cookieToken(ck);
  if (typeof cookieTokenRes !== "string") {
    await showLoading.end();
    showSnackbar.error(`[${cookieTokenRes.retcode}]${cookieTokenRes.message}`);
    await TGLogger.Error(
      `获取CookieToken失败：${cookieTokenRes.retcode}-${cookieTokenRes.message}`,
    );
    isTryLogin.value = false;
    return;
  }
  ck.cookie_token = cookieTokenRes;
  await showLoading.update("正在获取用户信息");
  const briefRes = await bbsReq.userInfo(ck);
  if ("retcode" in briefRes) {
    await showLoading.end();
    showSnackbar.error(`[${briefRes.retcode}]${briefRes.message}`);
    await TGLogger.Error(`获取用户数据失败：${briefRes.retcode}-${briefRes.message}`);
    isTryLogin.value = false;
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
  const gameRes = await takumiReq.bind.gameRoles(ck);
  if (!Array.isArray(gameRes)) {
    await showLoading.end();
    showSnackbar.error(`[${gameRes.retcode}]${gameRes.message}`);
    isTryLogin.value = false;
    return;
  }
  await showLoading.update("正在保存游戏账号");
  await TSUserAccount.game.saveAccounts(briefInfo.uid, gameRes);
  const curAccount = await TSUserAccount.game.getCurAccount(briefInfo.uid);
  if (!curAccount) {
    await showLoading.end();
    showSnackbar.warn("未检测到游戏账号，请重新刷新");
    isTryLogin.value = false;
    return;
  }
  await showLoading.end();
  showSnackbar.success("成功添加用户!");
  isTryLogin.value = false;
}

/**
 * 尝试启动游戏
 */
async function tryLaunchGame(): Promise<void> {
  if (!uid.value || !cookie.value) {
    showSnackbar.warn("请先登录！");
    return;
  }
  const gamePath = `${gameDir.value}${path.sep()}YuanShen.exe`;
  if (!(await exists(gamePath))) {
    showSnackbar.warn("未检测到原神本体应用！");
    return;
  }
  const resp = await passportReq.authTicket(account.value, cookie.value);
  if (typeof resp !== "string") {
    showSnackbar.error(`[${resp.retcode}] ${resp.message}`);
    await TGLogger.Error(
      `[sidebar][tryLaunchGame] 尝试获取authTicket失败，当前用户：${account.value.uid}-${account.value.gameUid}`,
    );
    await TGLogger.Error(`[sidebar][tryLaunchGame] resp: ${JSON.stringify(resp)}`);
    return;
  }
  if (!isInAdmin.value) {
    showSnackbar.success(`成功获取ticket:${resp}，正在启动应用...`);
    const cmd = Command.create("exec-sh", [`&"${gamePath}" login_auth_ticket=${resp}`], {
      cwd: gameDir.value,
      encoding: "utf-8",
    });
    const result = await cmd.execute();
    if (result.stderr) {
      await TGLogger.Error(`[sidebar][tryLaunchGame] 启动游戏本体失败！`);
      showSnackbar.error(`启动游戏本体失败，代码：${result.code}`);
    }
  } else {
    try {
      await invoke("call_yae_dll", {
        gamePath: gamePath,
        uid: account.value.gameUid,
        ticket: resp,
      });
    } catch (err) {
      showSnackbar.error(`调用Yae DLL失败: ${err}`);
      await TGLogger.Error(`[pageAchi][toYae]调用Yae DLL失败: ${err}`);
      return;
    }
  }
}
</script>
<style lang="css" scoped>
.tsb-box {
  background: var(--app-side-bg);
  color: var(--app-side-content);
}

.side-list {
  height: 100%;
  font-family: var(--font-title);
}

.bottom-menu {
  position: absolute;
  bottom: 0;
  width: 100%;
}

.side-icon {
  width: 24px;
  height: 24px;
  border-radius: 5px;
  margin-right: 32px;
}

.side-icon.paimon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  margin-right: 24px;
  transform: translateX(-4px);
}

.side-list-menu {
  background: var(--app-side-bg) !important;
  color: var(--app-side-content) !important;
  font-family: var(--font-title);

  :deep(.v-list-item__spacer) {
    width: 0 !important;
  }
}

.side-list-menu.sub {
  box-shadow: -2px 0 4px var(--common-shadow-2) !important;
}

.side-item-menu {
  border: 1px solid var(--common-shadow-2);
  background: var(--box-bg-1);
}

.side-icon-menu {
  width: 20px;
  height: 20px;
  border-radius: 5px;
  margin-right: 10px;
}
</style>
