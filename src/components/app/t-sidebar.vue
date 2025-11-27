<template>
  <v-navigation-drawer :permanent="true" :rail="rail" class="tsb-box">
    <v-list class="side-list" density="compact" :nav="true">
      <v-list-item
        @click="rail = !rail"
        :prepend-icon="rail ? 'mdi-chevron-right' : undefined"
        :append-icon="!rail ? 'mdi-chevron-left' : undefined"
      />
      <!-- 菜单项 -->
      <v-list-item :title.attr="'首页'" :link="true" href="/">
        <template #title>首页</template>
        <template #prepend>
          <img src="/source/UI/paimon.webp" alt="homeIcon" class="side-icon paimon" />
        </template>
      </v-list-item>
      <v-list-item title.attr="'公告'" :link="true" href="/announcements">
        <template #title>公告</template>
        <template #prepend>
          <img src="@/assets/icons/board.svg" alt="annoIcon" class="side-icon" />
        </template>
      </v-list-item>
      <v-list-item :title.attr="'咨讯'" :link="true" :href="`/news/2/${recentNewsType}`">
        <template #title>咨讯</template>
        <template #prepend>
          <img src="/platforms/mhy/mys.webp" alt="mihoyo" class="side-icon" />
        </template>
      </v-list-item>
      <v-list-item :title.attr="'帖子'" :link="true" href="/posts/forum">
        <template #title>帖子</template>
        <template #prepend>
          <img src="/source/UI/posts.webp" alt="posts" class="side-icon" />
        </template>
      </v-list-item>
      <v-list-item :title.attr="'成就'" :link="true" href="/achievements">
        <template #title>成就</template>
        <template #prepend>
          <img src="@/assets/icons/achievements.svg" alt="achievementsIcon" class="side-icon" />
        </template>
      </v-list-item>
      <v-divider />
      <v-list-item :title.attr="'原神战绩'" :link="true" href="/user/record">
        <template #title>原神战绩</template>
        <template #prepend>
          <img src="/source/UI/userRecord.webp" alt="record" class="side-icon" />
        </template>
      </v-list-item>
      <v-list-item :title.attr="'我的角色'" :link="true" href="/user/characters">
        <template #title>我的角色</template>
        <template #prepend>
          <img src="/source/UI/userAvatar.webp" alt="characters" class="side-icon" />
        </template>
      </v-list-item>
      <v-menu :open-on-click="true" location="end" :offset="[8, 0]">
        <template #activator="{ props }">
          <v-list-item :title.attr="'高难挑战'" v-bind="props">
            <template #title>高难挑战</template>
            <template #prepend>
              <img src="/source/UI/userAbyssLab.webp" alt="abyssLab" class="side-icon" />
            </template>
          </v-list-item>
        </template>
        <v-list class="side-list-menu sub" density="compact" :nav="true">
          <v-list-item class="side-item-menu" title="深境螺旋" :link="true" href="/user/abyss">
            <template #prepend>
              <img src="/source/UI/userAbyss.webp" alt="abyss" class="side-icon-menu" />
            </template>
          </v-list-item>
          <v-list-item class="side-item-menu" title="真境剧诗" :link="true" href="/user/combat">
            <template #prepend>
              <img src="/source/UI/userCombat.webp" alt="combat" class="side-icon-menu" />
            </template>
          </v-list-item>
          <v-list-item class="side-item-menu" title="幽境危战" :link="true" href="/user/challenge">
            <template #prepend>
              <img src="/source/UI/userChallenge.webp" alt="challenge" class="side-icon-menu" />
            </template>
          </v-list-item>
        </v-list>
      </v-menu>
      <v-list-item :title.attr="'祈愿记录'" :link="true" href="/user/gacha">
        <template #title>祈愿记录</template>
        <template #prepend>
          <img src="/source/UI/userGacha.webp" alt="gacha" class="side-icon" />
        </template>
      </v-list-item>
      <v-list-item :title.attr="'实用脚本'" :link="true" href="/user/scripts">
        <template #title>实用脚本</template>
        <template #prepend>
          <img src="/source/UI/toolbox.webp" alt="scripts" class="side-icon" />
        </template>
      </v-list-item>
      <v-divider />
      <v-list-item
        v-show="isDevEnv"
        :title.attr="'测试页面'"
        :link="true"
        href="/test"
        prepend-icon="mdi-test-tube"
      >
        <template #title>测试页面</template>
      </v-list-item>
      <v-divider v-show="isDevEnv" />
      <v-menu :open-on-click="true" location="end" :offset="[8, 0]">
        <template #activator="{ props }">
          <v-list-item :title.attr="'图鉴'" v-bind="props">
            <template #title>图鉴</template>
            <template #prepend>
              <img src="/source/UI/wikiIcon.webp" alt="wikiIcon" class="side-icon" />
            </template>
          </v-list-item>
        </template>
        <v-list class="side-list-menu sub" density="compact" :nav="true">
          <v-list-item class="side-item-menu" title="角色图鉴" :link="true" href="/wiki/character">
            <template #prepend>
              <img src="/source/UI/wikiAvatar.webp" alt="characterIcon" class="side-icon-menu" />
            </template>
          </v-list-item>
          <v-list-item class="side-item-menu" title="武器图鉴" :link="true" href="/wiki/weapon">
            <template #prepend>
              <img src="/source/UI/wikiWeapon.webp" alt="weaponIcon" class="side-icon-menu" />
            </template>
          </v-list-item>
          <v-list-item class="side-item-menu" :link="true" href="/wiki/nameCard">
            <template #default>
              <v-icon size="20" color="var(--tgc-yellow-2)">mdi-credit-card-outline</v-icon>
              <span style="margin-left: 10px; font-size: 0.8125rem">名片图鉴</span>
            </template>
          </v-list-item>
          <v-list-item class="side-item-menu" title="材料图鉴" :link="true" href="/wiki/material">
            <template #prepend>
              <img src="/source/UI/wikiGCG.webp" alt="gcgIcon" class="side-icon-menu" />
            </template>
          </v-list-item>
        </v-list>
      </v-menu>
      <v-list-item :title.attr="'留影叙佳期'" :link="true" href="/archive/birthday">
        <template #title>留影叙佳期</template>
        <template #prepend>
          <img src="/source/UI/act_birthday.webp" alt="archive_birthday_icon" class="side-icon" />
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
          <v-list class="side-list-menu sub" density="compact" :nav="true">
            <v-list-item
              class="side-item-menu"
              v-if="isLogin"
              title="签到"
              @click="openClient('sign_in')"
            >
              <template #prepend>
                <img src="/source/UI/userGacha.webp" class="side-icon-menu" alt="sing_in" />
              </template>
            </v-list-item>
            <v-list-item
              class="side-item-menu"
              v-if="isLogin"
              title="战绩"
              @click="openClient('game_record')"
            >
              <template #prepend>
                <img src="/source/UI/userRecord.webp" class="side-icon-menu" alt="game_record" />
              </template>
            </v-list-item>
            <v-list-item
              class="side-item-menu"
              v-if="isLogin"
              title="便笺"
              @click="openClient('daily_note')"
            >
              <template #prepend>
                <img src="/icon/material/210.webp" class="side-icon-menu" alt="daily_note" />
              </template>
            </v-list-item>
            <v-list-item class="side-item-menu" title="收藏" :link="true" href="/collection">
              <template #prepend>
                <img src="/source/UI/posts.webp" alt="collect" class="side-icon-menu" />
              </template>
            </v-list-item>
            <v-list-item
              class="side-item-menu"
              v-if="isLogin"
              title="关注"
              @click="showFollow = true"
            >
              <template #prepend>
                <img src="/platforms/mhy/mys.webp" alt="follow" class="side-icon-menu" />
              </template>
            </v-list-item>
          </v-list>
        </v-menu>
        <!-- 添加账号 -->
        <v-menu location="end" :open-on-click="true" :disabled="isTryLogin">
          <template #activator="{ props }">
            <v-list-item :title.attr="'添加账号'" v-bind="props" prepend-icon="mdi-account-plus">
              <template #title>添加账号</template>
            </v-list-item>
          </template>
          <v-list class="side-list-menu" density="compact" :nav="true">
            <v-list-item @click="tryCaptchaLogin()" class="side-item-menu sub">
              <v-list-item-title>验证码登录✨推荐</v-list-item-title>
              <v-list-item-subtitle>使用手机号登录</v-list-item-subtitle>
              <template #prepend>
                <v-icon class="side-icon-menu">mdi-shield-key-outline</v-icon>
              </template>
            </v-list-item>
            <v-list-item @click="tryCodeLogin()" class="side-item-menu sub">
              <v-list-item-title>扫码登录✨推荐</v-list-item-title>
              <v-list-item-subtitle>使用米游社扫码登录</v-list-item-subtitle>
              <template #prepend>
                <img class="side-icon-menu" src="/platforms/mhy/mys.webp" alt="launcher" />
              </template>
            </v-list-item>
            <v-list-item @click="addByCookie()" class="side-item-menu sub">
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
          :title.attr="'切换账号'"
          @click="trySwitchAccount()"
          prepend-icon="mdi-account-switch"
          v-if="isLogin"
          :disabled="isTryLogin"
        />
        <!-- 主题切换 -->
        <v-list-item
          :title.attr="themeTitle"
          @click="switchTheme()"
          :prepend-icon="theme === 'default' ? 'mdi-weather-night' : 'mdi-weather-sunny'"
        >
          <template #title>{{ themeTitle }}</template>
        </v-list-item>
        <!-- 设置页面 -->
        <v-list-item :title.attr="'设置'" value="config" :link="true" href="/config">
          <template #title>设置</template>
          <template #prepend>
            <img src="@/assets/icons/setting.svg" alt="setting" class="side-icon" />
          </template>
        </v-list-item>
      </div>
    </v-list>
  </v-navigation-drawer>
  <vp-overlay-follow v-model="showFollow" />
  <ToGameLogin v-model="showLoginQr" @success="tryGetTokens" :launcher="false" />
</template>
<script lang="ts" setup>
import showDialog from "@comp/func/dialog.js";
import showGeetest from "@comp/func/geetest.js";
import showLoading from "@comp/func/loading.js";
import showSnackbar from "@comp/func/snackbar.js";
import ToGameLogin from "@comp/pageConfig/tco-gameLogin.vue";
import VpOverlayFollow from "@comp/viewPost/vp-overlay-follow.vue";
import BBSApi from "@req/bbsReq.js";
import passportReq from "@req/passportReq.js";
import PassportApi from "@req/passportReq.js";
import takumiReq from "@req/takumiReq.js";
import TSUserAccount from "@Sqlm/userAccount.js";
import useAppStore from "@store/app.js";
import useUserStore from "@store/user.js";
import { event, webviewWindow } from "@tauri-apps/api";
import type { Event, UnlistenFn } from "@tauri-apps/api/event";
import mhyClient from "@utils/TGClient.js";
import TGLogger from "@utils/TGLogger.js";
import { storeToRefs } from "pinia";
import { computed, onMounted, onUnmounted, ref } from "vue";

const { sidebar, theme, isLogin, recentNewsType } = storeToRefs(useAppStore());
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
  console.log("切换账号");
  showAcSwitch.value = true;
  // TODO: 切换账号浮窗
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
  const ltokenRes = await PassportApi.lToken.get(ck);
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
  const cookieTokenRes = await PassportApi.cookieToken(ck);
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
  const briefRes = await BBSApi.userInfo(ck);
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
  const ltokenRes = await PassportApi.lToken.get(ck);
  if (typeof ltokenRes !== "string") {
    await showLoading.end();
    showSnackbar.error(`[${ltokenRes.retcode}]${ltokenRes.message}`);
    await TGLogger.Error(`获取LToken失败：${ltokenRes.retcode}-${ltokenRes.message}`);
    isTryLogin.value = false;
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
    isTryLogin.value = false;
    return;
  }
  ck.cookie_token = cookieTokenRes;
  await showLoading.update("正在获取用户信息");
  const briefRes = await BBSApi.userInfo(ck);
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
