<template>
  <main :aria-label="isOwnProfile ? '个人信息' : '用户信息'" class="community-profile">
    <CpProfileHeader v-if="profile || loading" :loading @select-game="selectGame" />

    <section
      v-if="!canViewProfile && !profile && !loadError"
      aria-live="polite"
      class="community-profile-state"
      role="status"
    >
      <v-icon size="36">mdi-account-lock-outline</v-icon>
      <p>{{ profileAccessMessage }}</p>
      <v-btn :to="{ name: '设置' }" prepend-icon="mdi-cog-outline" variant="tonal">
        前往设置
      </v-btn>
    </section>

    <section v-else class="community-profile-layout">
      <CpProfileSidebar
        v-model:followRelation="followRelation"
        :loading
        :unreadCounts
        :notificationSettings
        @refresh="loadProfile"
        @follow-change="adjustFollowedCount"
      />

      <section
        v-if="loadError"
        class="community-profile-panel community-profile-state"
        role="alert"
      >
        <v-icon size="32">mdi-alert-circle-outline</v-icon>
        <p>{{ loadError }}</p>
        <v-btn variant="tonal" @click="loadProfile()">重新加载</v-btn>
      </section>
      <section
        v-else-if="loading || !profile || !canOpenSection"
        aria-busy="true"
        aria-live="polite"
        class="community-profile-panel community-profile-state"
        role="status"
      >
        <v-progress-circular indeterminate size="28" />
        <p>正在加载个人信息…</p>
      </section>
      <RouterView v-else class="community-profile-panel" />
    </section>
  </main>
</template>

<script lang="ts" setup>
import CpProfileHeader from "@comp/comiProf/cp-profile-header.vue";
import CpProfileSidebar from "@comp/comiProf/cp-profile-sidebar.vue";
import showSnackbar from "@comp/func/snackbar.js";
import { provideCommunityProfile } from "@hooks/useCommunityProfile.js";
import bbsReq from "@req/bbsReq.js";
import communityReq from "@req/communityReq.js";
import useAppStore from "@store/app.js";
import useBBSStore from "@store/bbs.js";
import useUserStore from "@store/user.js";
import { matchesCurrentAccount } from "@utils/bbs/replyAccount.js";
import { getUserAvatar } from "@utils/common/toolFunc.js";
import { clearNotificationBadge } from "@utils/community/notification.js";
import { parseCommunityProfileGid } from "@utils/community/profile.js";
import { getCommunityProfileRoute } from "@utils/community/profileRoute.js";
import TGHttps from "@utils/network/TGHttps.js";
import TGLogger from "@utils/system/TGLogger.js";
import { storeToRefs } from "pinia";
import { computed, onBeforeUnmount, ref, shallowRef, watch } from "vue";
import { RouterView, useRoute, useRouter } from "vue-router";
import type { RouteLocationRaw } from "vue-router";

/**
 * 查看用户资料时的账户与目标用户快照。
 * @since Beta v0.13.0
 */
type AccountSnapshot = {
  uid: string;
  profileUid: string;
  cookie: TGApp.App.Account.Cookie;
};

const defaultProfileGame: TGApp.BBS.Profile.GameOption = {
  id: 2,
  name: "原神",
  icon: "/UI/nav/paimon.webp",
};

const router = useRouter();
const route = useRoute();
const { isLogin } = storeToRefs(useAppStore());
const bbsStore = useBBSStore();
const { gameList } = storeToRefs(bbsStore);
const { cookie, uid, briefInfo } = storeToRefs(useUserStore());
const profileUid = computed<string>(() => {
  const targetUid = route.params.uid;
  return typeof targetUid === "string" ? targetUid.trim() : (uid.value ?? "");
});
const isOwnProfile = computed<boolean>(
  () => profileUid.value !== "" && profileUid.value === uid.value,
);
const routeGid = computed<number | undefined>(() => parseCommunityProfileGid(route.query.gid));
const selectedGid = ref<number>(routeGid.value ?? defaultProfileGame.id);
const gameOptions = computed<Array<TGApp.BBS.Profile.GameOption>>(() => {
  const options = gameList.value.map<TGApp.BBS.Profile.GameOption>(
    ({ id, name, app_icon, icon }) => ({
      id,
      name,
      icon: app_icon || icon,
    }),
  );
  if (!options.some((item) => item.id === defaultProfileGame.id)) {
    options.unshift(defaultProfileGame);
  }
  return options;
});
const currentGame = computed<TGApp.BBS.Profile.GameOption>(
  () => gameOptions.value.find((item) => item.id === selectedGid.value) ?? defaultProfileGame,
);
const unreadCounts = shallowRef<TGApp.BBS.Notification.UnreadRes["count"]>({});
const notificationSettings = shallowRef<TGApp.BBS.Notification.Settings>();
const currentSection = computed<TGApp.BBS.Profile.Section>(
  () => route.meta.profileSection ?? "posts",
);
const canOpenSection = computed<boolean>(() => !route.meta.profileOwnOnly || isOwnProfile.value);

const profile = shallowRef<TGApp.BBS.User.Info>();
const profileAudit = shallowRef<TGApp.BBS.User.InfoRes["audit_info"]>();
const loading = ref<boolean>(false);
const loadError = ref<string>("");
const followRelation = shallowRef<TGApp.BBS.User.FollowRelation>();
const canViewProfile = computed<boolean>(() => {
  const currentUid = uid.value;
  const currentCookie = cookie.value;
  return (
    isLogin.value &&
    currentUid !== undefined &&
    currentUid.trim() !== "" &&
    currentCookie !== undefined &&
    currentCookie.ltuid === currentUid &&
    currentCookie.ltoken.trim() !== "" &&
    currentCookie.account_id.trim() !== "" &&
    currentCookie.cookie_token.trim() !== ""
  );
});
const profileAccessMessage = computed<string>(() => {
  if (!isLogin.value || !uid.value) return "请先登录米游社账号。";
  return "当前账号凭据不可用，请重新登录米游社账号。";
});
let requestVersion = 0;
let unreadVersion = 0;
const readCategories = new Set<TGApp.BBS.Notification.Category>();
let active = true;

provideCommunityProfile({
  profileUid,
  isOwnProfile,
  canViewProfile,
  profile,
  profileAudit,
  selectedGid,
  gameOptions,
  currentGame,
  refreshProfile: loadProfile,
  adjustPostCount,
  settingsSaved: handleSettingsSaved,
  notificationRead: handleNotificationRead,
  notificationSettingsSaved: handleNotificationSettingsSaved,
});

watch(
  [canViewProfile, canOpenSection, currentSection],
  () => {
    if (canViewProfile.value && !canOpenSection.value)
      void router.replace(getSectionRoute("posts"));
  },
  { immediate: true },
);

watch(
  [
    isLogin,
    uid,
    profileUid,
    () => cookie.value?.account_id,
    () => cookie.value?.cookie_token,
    () => cookie.value?.ltuid,
    () => cookie.value?.ltoken,
  ],
  () => void loadProfile(),
  { immediate: true },
);

watch(routeGid, (gid) => {
  selectedGid.value = gid ?? defaultProfileGame.id;
});

void ensureGameList();

onBeforeUnmount(() => {
  active = false;
  requestVersion += 1;
  unreadVersion += 1;
});

function getSectionRoute(section: TGApp.BBS.Profile.Section): RouteLocationRaw {
  return getCommunityProfileRoute(section, isOwnProfile.value ? undefined : profileUid.value, {
    gid: String(selectedGid.value),
  });
}

function resetProfileData(): void {
  profile.value = undefined;
  profileAudit.value = undefined;
  followRelation.value = undefined;
  loadError.value = "";
  loading.value = false;
  unreadVersion += 1;
  unreadCounts.value = {};
  notificationSettings.value = undefined;
}

function getAccountSnapshot(): AccountSnapshot | undefined {
  if (!canViewProfile.value || uid.value === undefined || cookie.value === undefined)
    return undefined;
  return { uid: uid.value, profileUid: profileUid.value, cookie: { ...cookie.value } };
}

function isCurrentAccount(snapshot: AccountSnapshot): boolean {
  const currentCookie = cookie.value;
  return (
    active &&
    canViewProfile.value &&
    uid.value === snapshot.uid &&
    profileUid.value === snapshot.profileUid &&
    currentCookie?.account_id === snapshot.cookie.account_id &&
    currentCookie?.cookie_token === snapshot.cookie.cookie_token &&
    currentCookie?.ltuid === snapshot.cookie.ltuid &&
    currentCookie?.ltoken === snapshot.cookie.ltoken
  );
}

function isCurrentRequest(version: number, snapshot: AccountSnapshot): boolean {
  return version === requestVersion && isCurrentAccount(snapshot);
}

async function ensureGameList(): Promise<void> {
  if (gameList.value.length > 0) return;
  await bbsStore.refreshGameList();
}

async function loadUnreadCounts(snapshot: AccountSnapshot): Promise<void> {
  if (snapshot.profileUid !== snapshot.uid) return;
  const version = ++unreadVersion;
  readCategories.clear();
  const [unreadResult, settingsResult] = await Promise.allSettled([
    communityReq.notificationUnread(snapshot.cookie),
    communityReq.notificationSettings(snapshot.cookie, snapshot.uid),
  ]);
  if (version !== unreadVersion || !isCurrentAccount(snapshot)) return;
  if (unreadResult.status === "fulfilled" && unreadResult.value.retcode === 0) {
    let count = unreadResult.value.data.count;
    for (const category of readCategories) count = clearNotificationBadge(count, category);
    unreadCounts.value = count;
  } else {
    const message =
      unreadResult.status === "rejected"
        ? TGHttps.getErrMsg(unreadResult.reason)
        : `[${unreadResult.value.retcode}] ${unreadResult.value.message}`;
    void TGLogger.Warn(`[ComiProf] 获取未读消息数失败：${message}`);
  }
  if (settingsResult.status === "fulfilled" && settingsResult.value.retcode === 0) {
    notificationSettings.value = settingsResult.value.data.settings;
  } else {
    const message =
      settingsResult.status === "rejected"
        ? TGHttps.getErrMsg(settingsResult.reason)
        : `[${settingsResult.value.retcode}] ${settingsResult.value.message}`;
    void TGLogger.Warn(`[ComiProf] 获取消息设置失败：${message}`);
  }
}

function handleNotificationRead(category: TGApp.BBS.Notification.Category): void {
  readCategories.add(category);
  unreadCounts.value = clearNotificationBadge(unreadCounts.value, category);
}

function handleNotificationSettingsSaved(settings: TGApp.BBS.Notification.Settings): void {
  notificationSettings.value = settings;
  const snapshot = getAccountSnapshot();
  if (snapshot !== undefined) void loadUnreadCounts(snapshot);
}

async function loadProfile(): Promise<void> {
  const version = ++requestVersion;
  resetProfileData();
  const snapshot = getAccountSnapshot();
  if (snapshot === undefined) return;
  if (!/^[1-9]\d*$/.test(snapshot.profileUid)) {
    loadError.value = "用户 ID 无效。";
    return;
  }
  void loadUnreadCounts(snapshot);
  loading.value = true;
  try {
    const userResponse =
      snapshot.profileUid === snapshot.uid
        ? await bbsReq.userInfo(snapshot.cookie)
        : await bbsReq.otherUserInfo("2", snapshot.profileUid, snapshot.cookie);
    if (!isCurrentRequest(version, snapshot)) return;
    if (userResponse.retcode !== 0) {
      throw new Error(`[${userResponse.retcode}] ${userResponse.message}`);
    }
    if (userResponse.data.user_info.uid !== snapshot.profileUid) {
      throw new Error("用户信息与当前查看的用户不一致");
    }
    profile.value = userResponse.data.user_info;
    followRelation.value =
      snapshot.profileUid === snapshot.uid ? undefined : userResponse.data.follow_relation;
    profileAudit.value =
      snapshot.profileUid === snapshot.uid ? userResponse.data.audit_info : undefined;
    if (snapshot.profileUid === snapshot.uid && matchesCurrentAccount(snapshot)) {
      briefInfo.value = {
        uid: profile.value.uid,
        nickname: profile.value.nickname,
        avatar: getUserAvatar(profile.value),
        desc: profile.value.introduce,
      };
    }
  } catch (cause) {
    if (isCurrentRequest(version, snapshot)) loadError.value = TGHttps.getErrMsg(cause);
  } finally {
    if (isCurrentRequest(version, snapshot)) loading.value = false;
  }
}

async function selectGame(gid: number): Promise<void> {
  selectedGid.value = gid;
  await router.replace({ query: { ...route.query, gid: String(gid) } });
}

function adjustFollowedCount(delta: number): void {
  const current = profile.value;
  if (current === undefined) return;
  const followedCount = Number.parseInt(current.achieve.followed_cnt, 10);
  if (!Number.isFinite(followedCount)) return;
  profile.value = {
    ...current,
    achieve: {
      ...current.achieve,
      followed_cnt: String(Math.max(followedCount + delta, 0)),
    },
  };
}

function handleSettingsSaved(section: TGApp.BBS.Profile.SettingsSection, warning?: string): void {
  if (warning) {
    showSnackbar.warn(warning);
  } else {
    showSnackbar.success(section === "privacy" ? "隐私设置已保存" : "资料已提交保存");
  }
  void loadProfile();
}

function adjustPostCount(delta: number): void {
  const current = profile.value;
  if (current === undefined) return;
  const count = Number.parseInt(current.achieve.post_num, 10);
  profile.value = {
    ...current,
    achieve: {
      ...current.achieve,
      post_num: String(Math.max((Number.isFinite(count) ? count : 0) + delta, 0)),
    },
  };
}
</script>

<style lang="scss" scoped>
.community-profile {
  display: flex;
  overflow: hidden;
  width: 100%;
  max-width: 1200px;
  height: calc(100dvh - 32px);
  min-height: 0;
  box-sizing: border-box;
  flex-direction: column;
  margin: 0 auto;
  color: var(--app-page-content);
  font-size: 14px;
  gap: 16px;
  line-height: 20px;
}

.community-profile-layout {
  display: grid;
  min-height: 0;
  flex: 1 1 auto;
  align-items: stretch;
  gap: 16px;
  grid-template-columns: 140px minmax(0, 1fr);
}

.community-profile-panel {
  min-width: 0;
  min-height: 0;
  padding: 16px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--app-page-bg);

  &:not(.community-profile-posts) {
    overflow: auto;
  }
}

.community-profile-state {
  display: flex;
  min-height: 220px;
  box-sizing: border-box;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  color: var(--box-text-4);
  gap: 12px;
  overflow-wrap: anywhere;
  text-align: center;

  p {
    margin: 0;
  }
}

.community-profile > .community-profile-state {
  min-height: 0;
  flex: 1 1 auto;
}

@media (width <= 640px) {
  .community-profile {
    padding: 8px 0 0;
  }

  .community-profile-layout {
    display: flex;
    min-height: 0;
    flex: 1 1 auto;
    flex-direction: column;
    gap: 8px;
  }

  .community-profile-panel {
    flex: 1 1 auto;
  }
}
</style>
