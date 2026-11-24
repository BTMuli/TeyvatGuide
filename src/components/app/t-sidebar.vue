<!-- 应用侧边栏 -->
<template>
  <v-navigation-drawer :permanent="true" :rail :width="160" class="tsb-box">
    <v-list :nav="true" class="side-list" density="compact">
      <v-list-item
        :append-icon="!rail ? 'mdi-chevron-left' : undefined"
        :prepend-icon="rail ? 'mdi-chevron-right' : undefined"
        @click="rail = !rail"
      />
      <div class="mid-menu">
        <!-- 菜单项 -->
        <v-list-item :link="true" :title.attr="'首页'" class="thin-spacer" href="/">
          <template #title>首页</template>
          <template #prepend>
            <img alt="homeIcon" class="side-icon paimon" src="/UI/nav/paimon.webp" />
          </template>
        </v-list-item>
        <v-list-item :link="true" href="/announcements" title.attr="'公告'">
          <template #title>公告</template>
          <template #prepend>
            <img alt="annoIcon" class="side-icon" src="@/assets/icons/board.svg" />
          </template>
        </v-list-item>
        <v-menu v-model="communityMenuOpen" :offset="[8, 0]" :open-on-click="true" location="end">
          <template #activator="{ props }">
            <v-list-item :title.attr="'米游社'" v-bind="props">
              <template #title>米游社</template>
              <template #prepend>
                <span class="side-icon-wrap">
                  <img alt="mihoyo" class="side-icon" src="/platforms/mhy/mys.webp" />
                  <v-icon
                    class="side-expand-icon"
                    icon="mdi-chevron-right"
                    :class="{ active: communityMenuOpen }"
                    size="12"
                  />
                </span>
              </template>
            </v-list-item>
          </template>
          <v-list :nav="true" class="side-list-menu sub" density="compact">
            <v-list-item
              :link="true"
              :to="{ name: '资讯', params: { gid: newsGid, type: '' }, query: {} }"
              class="side-item-menu"
              title="资讯"
            >
              <template #prepend>
                <img alt="mihoyo" class="side-icon-menu" src="/platforms/mhy/mys.webp" />
              </template>
            </v-list-item>
            <v-list-item
              :link="true"
              :to="{ name: '酒馆', params: { gid: '', forum: '' }, query: {} }"
              class="side-item-menu"
              title="帖子"
            >
              <template #prepend>
                <img alt="posts" class="side-icon-menu" src="/UI/nav/posts.webp" />
              </template>
            </v-list-item>
            <v-list-item
              :link="true"
              class="side-item-menu"
              :to="{ name: '个人信息-history' }"
              title="主页"
            >
              <template #prepend>
                <img :src="userInfo.avatar" alt="userAvatar" class="side-icon-menu side-avatar" />
              </template>
            </v-list-item>
            <v-list-item
              :link="true"
              :to="{ name: '米社商店' }"
              class="side-item-menu"
              title="米社商店"
            >
              <template #prepend>
                <img alt="米社商店" class="side-icon-menu" src="/UI/nav/mybExchange.webp" />
              </template>
            </v-list-item>
          </v-list>
        </v-menu>
        <v-list-item :link="true" :title.attr="'成就'" href="/achievements">
          <template #title>成就</template>
          <template #prepend>
            <img alt="achievementsIcon" class="side-icon" src="@/assets/icons/achievements.svg" />
          </template>
        </v-list-item>
        <v-list-item :title.attr="'七圣召唤'" :to="{ name: '七圣召唤' }">
          <template #title>七圣召唤</template>
          <template #prepend>
            <img alt="" class="side-icon" src="/UI/nav/userGcg.webp" />
          </template>
        </v-list-item>
        <v-list-item v-if="isWindows" :link="true" :title.attr="'游戏安装'" href="/game">
          <template #title>游戏安装</template>
          <template #prepend>
            <img alt="game" class="side-icon game-page-icon" src="/platforms/mhy/launcher.webp" />
          </template>
        </v-list-item>
        <!-- 背包物品，包括材料&武器&圣遗物 -->
        <v-menu v-model="bagMenuOpen" :offset="[8, 0]" :open-on-click="true" location="end">
          <template #activator="{ props }">
            <v-list-item :title.attr="'背包物品'" v-bind="props">
              <template #title>背包物品</template>
              <template #prepend>
                <span class="side-icon-wrap">
                  <img alt="bagIcon" class="side-icon" src="/UI/nav/userBag.webp" />
                  <v-icon
                    class="side-expand-icon"
                    icon="mdi-chevron-right"
                    :class="{ active: bagMenuOpen }"
                    size="12"
                  />
                </span>
              </template>
            </v-list-item>
          </template>
          <nav aria-label="背包物品导航" class="side-list-menu side-menu-icons bag sub">
            <button
              v-if="isWindows"
              aria-label="导入"
              class="side-menu-icon-item"
              title="导入"
              type="button"
              @click="tryImportBag()"
            >
              <v-icon aria-hidden="true" color="var(--tgc-od-orange)" size="20">mdi-import</v-icon>
            </button>
            <a
              aria-label="养成计划"
              class="side-menu-icon-item"
              href="/user/cultivation"
              title="养成计划"
            >
              <v-icon aria-hidden="true" color="var(--tgc-od-orange)" size="20">
                mdi-calculator-variant-outline
              </v-icon>
            </a>
            <a aria-label="材料" class="side-menu-icon-item" href="/bag/material" title="材料">
              <img alt="" src="/icon/material/223.webp" />
            </a>
            <a
              v-if="isWindows"
              aria-label="武器"
              class="side-menu-icon-item"
              href="/bag/weapon"
              title="武器"
            >
              <img alt="" src="/WIKI/weapon/14522.webp" />
            </a>
            <a
              v-if="isWindows"
              aria-label="圣遗物"
              class="side-menu-icon-item"
              href="/bag/relic"
              title="圣遗物"
            >
              <img alt="" src="/WIKI/relic/UI_RelicIcon_15001_1.webp" />
            </a>
          </nav>
        </v-menu>
        <v-divider />
        <v-list-item :link="true" :title.attr="'原神战绩'" href="/user/record">
          <template #title>原神战绩</template>
          <template #prepend>
            <img alt="record" class="side-icon" src="/UI/nav/userRecord.webp" />
          </template>
        </v-list-item>
        <v-list-item :link="true" :title.attr="'角色列表'" href="/user/characters">
          <template #title>角色列表</template>
          <template #prepend>
            <img alt="characters" class="side-icon" src="/UI/nav/userAvatar.webp" />
          </template>
        </v-list-item>
        <v-list-item :link="true" :title.attr="'祈愿记录'" href="/user/gacha">
          <template #title>祈愿记录</template>
          <template #prepend>
            <img alt="gacha" class="side-icon" src="/UI/nav/userGacha.webp" />
          </template>
        </v-list-item>
        <!-- 高难挑战，包括深渊&剧诗&危战 -->
        <v-menu v-model="challengeMenuOpen" :offset="[8, 0]" :open-on-click="true" location="end">
          <template #activator="{ props }">
            <v-list-item :title.attr="'高难挑战'" v-bind="props">
              <template #title>高难挑战</template>
              <template #prepend>
                <span class="side-icon-wrap">
                  <img alt="abyssLab" class="side-icon" src="/UI/nav/userAbyssLab.webp" />
                  <v-icon
                    class="side-expand-icon"
                    icon="mdi-chevron-right"
                    :class="{ active: challengeMenuOpen }"
                    size="12"
                  />
                </span>
              </template>
            </v-list-item>
          </template>
          <v-list :nav="true" class="side-list-menu sub" density="compact">
            <v-list-item :link="true" class="side-item-menu" href="/user/abyss" title="深境螺旋">
              <template #prepend>
                <img alt="abyss" class="side-icon-menu" src="/UI/nav/userAbyss.webp" />
              </template>
            </v-list-item>
            <v-list-item :link="true" class="side-item-menu" href="/user/combat" title="真境剧诗">
              <template #prepend>
                <img alt="combat" class="side-icon-menu" src="/UI/nav/userCombat.webp" />
              </template>
            </v-list-item>
            <v-list-item
              :link="true"
              class="side-item-menu"
              href="/user/challenge"
              title="幽境危战"
            >
              <template #prepend>
                <img alt="challenge" class="side-icon-menu" src="/UI/nav/userChallenge.webp" />
              </template>
            </v-list-item>
          </v-list>
        </v-menu>
        <v-list-item :link="true" :title.attr="'实用脚本'" href="/user/scripts">
          <template #title>实用脚本</template>
          <template #prepend>
            <img alt="scripts" class="side-icon" src="/UI/nav/toolbox.webp" />
          </template>
        </v-list-item>
        <v-divider />
        <v-list-item v-show="isDevEnv" :link="true" :title.attr="'测试页面'" href="/test">
          <template #prepend>
            <v-icon class="side-icon">mdi-test-tube</v-icon>
          </template>
          <template #title>测试页面</template>
        </v-list-item>
        <v-divider v-show="isDevEnv" />
        <!-- 图鉴 -->
        <v-menu v-model="wikiMenuOpen" :offset="[8, 0]" :open-on-click="true" location="end">
          <template #activator="{ props }">
            <v-list-item :title.attr="'图鉴'" v-bind="props">
              <template #title>图鉴</template>
              <template #prepend>
                <span class="side-icon-wrap">
                  <img alt="wikiIcon" class="side-icon" src="/UI/nav/wikiIcon.webp" />
                  <v-icon
                    class="side-expand-icon"
                    icon="mdi-chevron-right"
                    :class="{ active: wikiMenuOpen }"
                    size="12"
                  />
                </span>
              </template>
            </v-list-item>
          </template>
          <nav aria-label="图鉴导航" class="side-list-menu side-menu-icons sub">
            <a
              aria-label="角色图鉴"
              class="side-menu-icon-item"
              href="/wiki/character"
              title="角色图鉴"
            >
              <img alt="" src="/UI/nav/wikiAvatar.webp" />
            </a>
            <a
              aria-label="武器图鉴"
              class="side-menu-icon-item"
              href="/wiki/weapon"
              title="武器图鉴"
            >
              <img alt="" src="/UI/nav/wikiWeapon.webp" />
            </a>
            <a
              aria-label="名片图鉴"
              class="side-menu-icon-item"
              href="/wiki/nameCard"
              title="名片图鉴"
            >
              <v-icon aria-hidden="true" color="var(--tgc-yellow-2)" size="24">
                mdi-credit-card-outline
              </v-icon>
            </a>
            <a
              aria-label="材料图鉴"
              class="side-menu-icon-item"
              href="/wiki/material"
              title="材料图鉴"
            >
              <img alt="" src="/UI/nav/wikiGCG.webp" />
            </a>
            <a
              aria-label="圣遗物图鉴"
              class="side-menu-icon-item"
              href="/wiki/relic"
              title="圣遗物图鉴"
            >
              <img alt="" class="side-wiki-relic" src="/icon/relic/5.webp" />
            </a>
          </nav>
        </v-menu>
        <v-menu v-model="storyMenuOpen" :offset="[8, 0]" :open-on-click="true" location="end">
          <template #activator="{ props }">
            <v-list-item :title.attr="'旅途故事'" v-bind="props">
              <template #title>旅途故事</template>
              <template #prepend>
                <span class="side-icon-wrap">
                  <v-icon class="side-icon">mdi-book-open-page-variant-outline</v-icon>
                  <v-icon
                    class="side-expand-icon"
                    icon="mdi-chevron-right"
                    :class="{ active: storyMenuOpen }"
                    size="12"
                  />
                </span>
              </template>
            </v-list-item>
          </template>
          <v-list :nav="true" class="side-list-menu sub" density="compact">
            <v-list-item
              :link="true"
              class="side-item-menu"
              href="/archive/birthday"
              title="留影叙佳期"
            >
              <template #prepend>
                <img
                  alt="archive_birthday_icon"
                  class="side-icon-menu"
                  src="/UI/nav/act_birthday.webp"
                />
              </template>
            </v-list-item>
            <v-list-item
              :disabled="isOpeningTravelersTales"
              :link="true"
              class="side-item-menu"
              title="游逸旅闻"
              @click="openTravelersTales"
            >
              <template #prepend>
                <v-icon class="side-icon-menu" size="20">
                  mdi-book-open-page-variant-outline
                </v-icon>
              </template>
            </v-list-item>
          </v-list>
        </v-menu>
      </div>
      <!-- 底部菜单 -->
      <div class="bottom-menu">
        <!-- 用户菜单 -->
        <v-menu v-model="userMenuOpen" :open-on-click="true" location="end">
          <template #activator="{ props }">
            <v-list-item :title.attr="userInfo.nickname" class="thin-spacer" v-bind="props">
              <template #title>{{ userInfo.nickname }}</template>
              <template #prepend>
                <span class="side-icon-wrap">
                  <img :src="userInfo.avatar" alt="userIcon" class="side-icon paimon" />
                  <v-icon
                    class="side-expand-icon"
                    icon="mdi-chevron-right"
                    :class="{ active: userMenuOpen }"
                    size="12"
                  />
                </span>
              </template>
            </v-list-item>
          </template>
          <nav v-if="isLogin" aria-label="用户菜单" class="side-list-menu side-menu-icons sub">
            <button
              aria-label="签到"
              class="side-menu-icon-item"
              title="签到"
              type="button"
              @click="openClient('sign_in')"
            >
              <img alt="" src="/UI/nav/subSign.webp" />
            </button>
            <button
              aria-label="战绩"
              class="side-menu-icon-item"
              title="战绩"
              type="button"
              @click="openClient('game_record')"
            >
              <img alt="" src="/UI/nav/subRecord.webp" />
            </button>
            <button
              aria-label="便笺"
              class="side-menu-icon-item"
              title="便笺"
              type="button"
              @click="openClient('daily_note')"
            >
              <img alt="" src="/icon/material/106.webp" />
            </button>
            <a aria-label="收藏" class="side-menu-icon-item" href="/collection" title="收藏">
              <img alt="" src="/UI/nav/posts.webp" />
            </a>
            <button
              aria-label="关注"
              class="side-menu-icon-item"
              title="关注"
              type="button"
              @click="showFollow = true"
            >
              <img alt="" src="/platforms/mhy/mys.webp" />
            </button>
          </nav>
          <v-list v-else :nav="true" class="side-list-menu sub" density="compact">
            <v-list-item :link="true" class="side-item-menu" href="/collection" title="收藏">
              <template #prepend>
                <img alt="collect" class="side-icon-menu" src="/UI/nav/posts.webp" />
              </template>
            </v-list-item>
          </v-list>
        </v-menu>
        <!-- 添加账号 -->
        <v-menu
          v-model="addAccountMenuOpen"
          :disabled="isTryLogin"
          :open-on-click="true"
          location="end"
        >
          <template #activator="{ props }">
            <v-list-item :title.attr="'添加账号'" v-bind="props">
              <template #title>添加账号</template>
              <template #prepend>
                <span class="side-icon-wrap">
                  <v-icon class="side-icon">mdi-account-plus</v-icon>
                  <v-icon
                    class="side-expand-icon"
                    icon="mdi-chevron-right"
                    :class="{ active: addAccountMenuOpen }"
                    size="12"
                  />
                </span>
              </template>
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
        <v-menu
          v-if="isLogin"
          v-model="switchAccountMenuOpen"
          :disabled="isTryLogin"
          :open-on-click="true"
          location="end"
          @update:model-value="handleGameAccountToggle"
        >
          <template #activator="{ props }">
            <v-list-item :title.attr="'切换账号'" v-bind="props">
              <v-list-item-title>切换账号</v-list-item-title>
              <template #prepend>
                <span class="side-icon-wrap">
                  <v-icon class="side-icon">mdi-account-switch</v-icon>
                  <v-icon
                    class="side-expand-icon"
                    icon="mdi-chevron-right"
                    :class="{ active: switchAccountMenuOpen }"
                    size="12"
                  />
                </span>
              </template>
            </v-list-item>
          </template>
          <v-list :nav="true" class="side-list-menu">
            <v-list-item
              v-for="ac in allGameAc"
              :key="ac.gameUid"
              class="side-item-menu sub"
              @click="trySwitchGameAccount(ac)"
            >
              <v-list-item-title>{{ ac.nickname }}</v-list-item-title>
              <v-list-item-subtitle>
                {{ maskUidTail(ac.gameUid) }}({{ ac.regionName }})
              </v-list-item-subtitle>
              <template #append>
                <div v-if="ac.gameUid === account.gameUid" title="当前登录账号">
                  <v-icon color="green">mdi-check</v-icon>
                </div>
              </template>
            </v-list-item>
          </v-list>
        </v-menu>
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
  <VpOverlayFollow v-model="showFollow" />
  <ToGameLogin v-model="showLoginQr" @success="tryGetTokens" />
</template>
<script lang="ts" setup>
import showSnackbar from "@comp/func/snackbar.js";
import ToGameLogin from "@comp/pageConfig/tco-gameLogin.vue";
import VpOverlayFollow from "@comp/viewPost/vp-overlay-follow.vue";
import { useLoginFlow } from "@hooks/useLoginFlow.js";
import TSUserAccount from "@Sqlm/userAccount.js";
import useAppStore from "@store/app.js";
import useBBSStore from "@store/bbs.js";
import useCommunityBrowsingStore from "@store/communityBrowsing.js";
import useUserStore from "@store/user.js";
import { event, webviewWindow } from "@tauri-apps/api";
import { invoke } from "@tauri-apps/api/core";
import type { Event, UnlistenFn } from "@tauri-apps/api/event";
import { platform } from "@tauri-apps/plugin-os";
import mhyClient from "@utils/app/TGClient.js";
import { defaultCommunityGid } from "@utils/bbs/browsing.js";
import { maskUid, maskUidTail } from "@utils/display/TGUid.js";
import { tryCallYae } from "@utils/game/TGGame.js";
import TGHttps from "@utils/network/TGHttps.js";
import TGLogger from "@utils/system/TGLogger.js";
import { storeToRefs } from "pinia";
import { computed, onMounted, onUnmounted, ref, shallowRef } from "vue";

const userStore = useUserStore();
const { sidebar, theme, isLogin } = storeToRefs(useAppStore());
const { gameList } = storeToRefs(useBBSStore());
const { recentGid } = storeToRefs(useCommunityBrowsingStore());
const { uid, briefInfo, account } = storeToRefs(userStore);
const newsGid = computed<number>(() => {
  const rememberedGid =
    Number.isSafeInteger(recentGid.value) && recentGid.value > 0 ? recentGid.value : undefined;
  if (gameList.value.length === 0) return rememberedGid ?? defaultCommunityGid;
  return (
    gameList.value.find((game) => game.id === rememberedGid)?.id ??
    gameList.value.find((game) => game.id === defaultCommunityGid)?.id ??
    gameList.value[0]?.id ??
    defaultCommunityGid
  );
});
let themeListener: UnlistenFn | null = null;

// @ts-expect-error The import.meta meta-property is not allowed in files which will build into CommonJS output.
const isDevEnv = import.meta.env.DEV;
const isWindows = platform() === "windows";
const showFollow = ref<boolean>();
const { showLoginQr, isTryLogin, tryGetTokens, tryCaptchaLogin, tryCodeLogin, addByCookie } =
  useLoginFlow();
const isOpeningTravelersTales = ref<boolean>(false);
const bagMenuOpen = ref<boolean>(false);
const challengeMenuOpen = ref<boolean>(false);
const communityMenuOpen = ref<boolean>(false);
const wikiMenuOpen = ref<boolean>(false);
const storyMenuOpen = ref<boolean>(false);
const userMenuOpen = ref<boolean>(false);
const addAccountMenuOpen = ref<boolean>(false);
const switchAccountMenuOpen = ref<boolean>(false);
const allGameAc = shallowRef<Array<TGApp.Sqlite.Account.Game>>([]);

const rail = computed<boolean>({
  get: () => sidebar.value.collapse,
  set: (v) => (sidebar.value.collapse = v),
});

function handleGameAccountToggle(value: boolean): void {
  if (value) void loadAllGameAc();
}
const userInfo = computed<TGApp.App.Account.BriefInfo>(() => {
  if (briefInfo.value && briefInfo.value.nickname) return briefInfo.value;
  return { nickname: "未登录", uid: "-1", desc: "请扫码登录", avatar: "/UI/nav/lumine.webp" };
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

async function loadAllGameAc(): Promise<void> {
  allGameAc.value = [];
  let res: Array<TGApp.Sqlite.Account.Game> = [];
  const uidList = await TSUserAccount.account.getAllUid();
  for (const r of uidList) {
    const gameAcs = await TSUserAccount.game.getAccount(r);
    res = res.concat(gameAcs);
  }
  res = res.filter((i) => i.gameBiz === "hk4e_cn");
  allGameAc.value = res;
}

async function trySwitchGameAccount(ac: TGApp.Sqlite.Account.Game): Promise<void> {
  try {
    const acM = await TSUserAccount.account.getAccount(ac.uid);
    if (!acM) {
      showSnackbar.warn(`未找到米社用户${maskUid(ac.uid)}的用户信息`);
      return;
    }
    const res = await userStore.switchGameAccount(ac.gameUid, acM);
    if (!res) return;
    await TGLogger.Info(`[ToSwitchAc] 切换到用户${uid.value}的游戏UID${ac.gameUid}成功`);
  } catch (e) {
    const errMsg = TGHttps.getErrMsg(e);
    showSnackbar.error(`切换游戏账户失败：${errMsg}`);
    await TGLogger.Error(`[ToSwitchAc] 切换游戏UID${ac.gameUid}失败：${errMsg}`);
  }
}

async function switchTheme(): Promise<void> {
  await event.emit("readTheme", theme.value === "default" ? "dark" : "default");
}

async function tryImportBag(): Promise<void> {
  await tryCallYae(account.value.gameUid || undefined);
}

async function openClient(func: string): Promise<void> {
  if (isLogin.value) await mhyClient.open(func);
  else showSnackbar.warn("请前往设置页面登录！");
}

async function openTravelersTales(): Promise<void> {
  if (isOpeningTravelersTales.value) return;
  isOpeningTravelersTales.value = true;
  try {
    await invoke<void>("create_travelers_tales");
    await TGLogger.Info("[TSidebar][openTravelersTales] 打开游逸旅闻");
  } catch (e) {
    const errMsg = TGHttps.getErrMsg(e);
    showSnackbar.error(`打开游逸旅闻失败：${errMsg}`);
    await TGLogger.Error(`[TSidebar][openTravelersTales] 打开游逸旅闻失败：${errMsg}`);
  } finally {
    isOpeningTravelersTales.value = false;
  }
}
</script>
<style lang="scss" scoped>
.tsb-box {
  --v-list-prepend-gap: 24px;

  position: relative;
  background: var(--app-side-bg);
  color: var(--app-side-content);
}

.side-list {
  position: relative;
  height: 100%;
  font-family: var(--font-title);
}

.mid-menu {
  position: relative;
  overflow: hidden auto;
  width: 100%;
  max-height: calc(100vh - 280px);
}

.bottom-menu {
  position: absolute;
  bottom: 8px;
  width: 100%;
}

.thin-spacer {
  --v-list-prepend-gap: 16px;
}

.side-icon {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  transition: transform 0.2s ease;

  &.paimon {
    position: relative;
    left: -4px;
    width: 32px;
    height: 32px;
    border-radius: 50%;
  }

  &.game-page-icon {
    filter: var(--icon-filter);
  }

  &:hover {
    transform: scale(1.15);
  }
}

.side-icon-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.side-expand-icon {
  position: absolute;
  bottom: -4px;
  left: -5px;
  width: 14px;
  min-width: 14px;
  max-width: 14px;
  height: 14px;
  min-height: 14px;
  max-height: 14px;
  flex-shrink: 0;
  border: 1px solid var(--common-shadow-2);
  border-radius: 50%;
  -webkit-backdrop-filter: blur(4px);
  backdrop-filter: blur(4px);
  background: var(--common-shadow-1);
  color: var(--app-side-content);
  transition: transform 0.2s ease;

  &.active {
    transform: rotate(90deg);
  }
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

.side-item-menu,
.side-menu-icon-item {
  border: 1px solid var(--common-shadow-2);
  background: var(--box-bg-1);
}

.side-menu-icons {
  display: grid;
  width: 144px;
  padding: 8px;
  border-radius: 8px;
  gap: 4px;
  grid-template-columns: repeat(6, minmax(0, 1fr));
}

.side-menu-icon-item {
  display: grid;
  height: 40px;
  padding: 0;
  border-radius: 4px;
  color: inherit;
  cursor: pointer;
  grid-column: span 2;
  place-items: center;
  text-decoration: none;

  &:nth-child(n + 4) {
    grid-column: span 3;
  }

  &:hover {
    background: var(--box-bg-4);
  }

  &:focus-visible {
    outline: 2px solid var(--common-text-title);
    outline-offset: -2px;
  }

  img {
    width: 24px;
    height: 24px;
    border-radius: 4px;
    object-fit: contain;
  }
}

.side-menu-icons.bag {
  .side-menu-icon-item {
    grid-column: span 2;

    &:nth-child(-n + 2) {
      grid-column: span 3;
    }
  }
}

.side-wiki-relic {
  filter: var(--icon-filter);
}

.side-icon-menu {
  width: 20px;
  height: 20px;
  border-radius: 5px;
  margin-right: 10px;

  &[alt="relicIcon"] {
    filter: var(--icon-filter);
  }

  &.side-avatar {
    border-radius: 50%;
  }
}
</style>
