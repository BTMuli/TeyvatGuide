<template>
  <aside aria-label="个人中心导航" class="community-profile-sidebar">
    <div class="community-profile-sidebar-header">
      <div class="community-profile-sidebar-heading">
        <h2>{{ isOwnProfile ? "个人中心" : "用户信息" }}</h2>
        <button
          v-if="!isOwnProfile && followState"
          :aria-label="followState.label"
          :disabled="followLoading"
          :title="followState.label"
          class="community-profile-follow-state"
          type="button"
          @click="toggleFollow"
        >
          <v-progress-circular v-if="followLoading" indeterminate size="14" tag="span" width="2" />
          <v-icon v-else aria-hidden="true" size="16">{{ followState.icon }}</v-icon>
        </button>
      </div>
      <div class="community-profile-sidebar-actions">
        <v-btn
          :disabled="!hasPreviousProfile"
          aria-label="上一个主页"
          icon="mdi-chevron-left"
          size="x-small"
          title="上一个主页"
          variant="text"
          @click="openTrailProfile(-1)"
        />
        <v-btn
          :disabled="!hasNextProfile"
          aria-label="下一个主页"
          icon="mdi-chevron-right"
          size="x-small"
          title="下一个主页"
          variant="text"
          @click="openTrailProfile(1)"
        />
        <v-btn
          v-if="!isOwnProfile"
          :to="getCommunityProfileRoute('posts', undefined, { gid: String(sectionGid) })"
          aria-label="我的主页"
          icon="mdi-home-outline"
          size="x-small"
          title="我的主页"
          variant="text"
        />
        <CpProfilePublish />
        <v-btn
          :disabled="!canViewProfile || loading"
          :loading
          aria-label="刷新个人中心"
          icon="mdi-refresh"
          size="x-small"
          title="刷新个人中心"
          variant="text"
          @click="emits('refresh')"
        />
      </div>
    </div>
    <nav class="community-profile-nav">
      <template v-for="item in navigation" :key="item.section">
        <v-divider v-if="item.divided" class="community-profile-nav-divider" />
        <RouterLink
          :aria-current="item.section === currentSection ? 'page' : 'false'"
          :class="{ 'is-active': item.section === currentSection }"
          class="community-profile-nav-item"
          :to="getSectionRoute(item.section)"
        >
          <v-icon size="18" aria-hidden="true">{{ item.icon }}</v-icon>
          <span>{{ item.label }}</span>
          <span
            v-if="item.badge?.count"
            :title="item.badge.label"
            class="community-profile-nav-badge"
          >
            {{ item.badge.count > 99 ? "99+" : item.badge.count }}
          </span>
          <span
            v-else-if="item.badge?.dot"
            :aria-label="item.badge.label"
            :title="item.badge.label"
            class="community-profile-nav-badge is-dot"
            role="img"
          />
        </RouterLink>
      </template>
    </nav>
  </aside>
</template>

<script lang="ts" setup>
import CpProfilePublish from "@comp/comiProf/cp-profile-publish.vue";
import showDialog from "@comp/func/dialog.js";
import showSnackbar from "@comp/func/snackbar.js";
import { useCommunityProfile } from "@hooks/useCommunityProfile.js";
import communityReq from "@req/communityReq.js";
import useAppStore from "@store/app.js";
import useUserStore from "@store/user.js";
import { getNotificationBadge } from "@utils/community/notification.js";
import {
  hasNextProfile,
  hasPreviousProfile,
  recordProfileVisit,
  stepProfileTrail,
} from "@utils/community/profile.js";
import { getCommunityProfileRoute } from "@utils/community/profileRoute.js";
import TGHttps from "@utils/network/TGHttps.js";
import { storeToRefs } from "pinia";
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";
import type { RouteLocationRaw } from "vue-router";

type CpProfileSidebarProps = {
  loading: boolean;
  unreadCounts: TGApp.BBS.Notification.UnreadRes["count"];
  notificationSettings?: TGApp.BBS.Notification.Settings;
};

type CpProfileSidebarEmits = {
  refresh: [];
  followChange: [delta: number];
};

type NavigationItem = {
  section: TGApp.BBS.Profile.Section;
  label: string;
  icon: string;
  divided?: boolean;
  badge?: TGApp.BBS.Notification.Badge;
};

type FollowState = {
  icon: string;
  label: string;
};

type AccountSnapshot = {
  uid: string;
  profileUid: string;
  cookie: TGApp.App.Account.Cookie;
};

const { loading, unreadCounts, notificationSettings } = defineProps<CpProfileSidebarProps>();
const emits = defineEmits<CpProfileSidebarEmits>();
const followRelation = defineModel<TGApp.BBS.User.FollowRelation | undefined>("followRelation", {
  required: true,
});
const { profileUid, isOwnProfile, canViewProfile, profile, selectedGid, gameOptions, currentGame } =
  useCommunityProfile();
const router = useRouter();
const route = useRoute();
const { isLogin } = storeToRefs(useAppStore());
const { cookie, uid } = storeToRefs(useUserStore());
const followLoading = ref<boolean>(false);
const currentSection = computed<TGApp.BBS.Profile.Section>(
  () => route.meta.profileSection ?? "posts",
);
const sectionGid = computed<number>(() =>
  gameOptions.value.some((game) => game.id === selectedGid.value)
    ? selectedGid.value
    : currentGame.value.id,
);
const navigation = computed<Array<NavigationItem>>(() => {
  const prefix = isOwnProfile.value ? "我的" : "TA 的";
  const items: Array<NavigationItem> = [
    { section: "posts", label: `${prefix}发帖`, icon: "mdi-post-outline" },
    { section: "comments", label: `${prefix}评论`, icon: "mdi-comment-text-outline" },
    { section: "collections", label: `${prefix}合集`, icon: "mdi-folder-outline" },
    { section: "favorites", label: `${prefix}收藏`, icon: "mdi-star-outline" },
    { section: "followers", label: `${prefix}粉丝`, icon: "mdi-account-multiple-outline" },
    { section: "following", label: `${prefix}关注`, icon: "mdi-heart-outline" },
  ];
  if (isOwnProfile.value) {
    const badge = (category: TGApp.BBS.Notification.Category): TGApp.BBS.Notification.Badge =>
      getNotificationBadge(category, unreadCounts, notificationSettings);
    items.splice(1, 0, { section: "history", label: "浏览历史", icon: "mdi-history" });
    items.push(
      {
        section: "reply",
        label: "回复我的",
        icon: "mdi-comment-processing-outline",
        divided: true,
        badge: badge("reply"),
      },
      { section: "mention", label: "主动@我", icon: "mdi-at", badge: badge("active_mention") },
      { section: "system", label: "系统通知", icon: "mdi-bell-outline", badge: badge("system") },
      {
        section: "likes",
        label: "收到的赞",
        icon: "mdi-thumb-up-outline",
        badge: badge("comment"),
      },
      { section: "privacy", label: "隐私设置", icon: "mdi-shield-lock-outline", divided: true },
      { section: "notifySettings", label: "消息设置", icon: "mdi-bell-cog-outline" },
      { section: "edit", label: "编辑资料", icon: "mdi-account-edit-outline" },
    );
  }
  return items;
});
const followState = computed<FollowState | undefined>(() => {
  const relation = followRelation.value;
  if (relation === undefined) return undefined;
  if (relation.is_following && relation.is_followed) {
    return { icon: "mdi-account-multiple-check-outline", label: "互关，点击取关" };
  }
  if (relation.is_following) {
    return { icon: "mdi-account-check-outline", label: "已关注，点击取关" };
  }
  if (relation.is_followed) {
    return { icon: "mdi-account-heart-outline", label: "粉丝，点击回关" };
  }
  return { icon: "mdi-account-plus-outline", label: "未关注，点击关注" };
});
let active = true;
let requestVersion = 0;

watch(profileUid, recordProfileVisit, { immediate: true });
watch(
  [
    followRelation,
    isLogin,
    uid,
    profileUid,
    () => cookie.value?.account_id,
    () => cookie.value?.cookie_token,
    () => cookie.value?.ltuid,
    () => cookie.value?.ltoken,
  ],
  () => {
    requestVersion += 1;
    followLoading.value = false;
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  active = false;
  requestVersion += 1;
});

function getSectionRoute(section: TGApp.BBS.Profile.Section): RouteLocationRaw {
  return getCommunityProfileRoute(section, isOwnProfile.value ? undefined : profileUid.value, {
    gid: String(sectionGid.value),
  });
}

async function openTrailProfile(step: -1 | 1): Promise<void> {
  const targetUid = stepProfileTrail(step);
  if (targetUid === undefined) return;
  await router.push(
    getCommunityProfileRoute("posts", targetUid === uid.value ? undefined : targetUid, {
      gid: String(sectionGid.value),
    }),
  );
}

function getAccountSnapshot(): AccountSnapshot | undefined {
  if (!canViewProfile.value || uid.value === undefined || cookie.value === undefined)
    return undefined;
  return { uid: uid.value, profileUid: profileUid.value, cookie: { ...cookie.value } };
}

function isCurrentAccount(snapshot: AccountSnapshot, version: number): boolean {
  const currentCookie = cookie.value;
  return (
    active &&
    version === requestVersion &&
    canViewProfile.value &&
    uid.value === snapshot.uid &&
    profileUid.value === snapshot.profileUid &&
    currentCookie?.account_id === snapshot.cookie.account_id &&
    currentCookie?.cookie_token === snapshot.cookie.cookie_token &&
    currentCookie?.ltuid === snapshot.cookie.ltuid &&
    currentCookie?.ltoken === snapshot.cookie.ltoken
  );
}

async function toggleFollow(): Promise<void> {
  const relation = followRelation.value;
  if (relation === undefined || followLoading.value) return;
  const snapshot = getAccountSnapshot();
  if (snapshot === undefined) {
    showSnackbar.warn("当前账号凭据不可用，请重新登录米游社账号。");
    return;
  }
  const follow = !relation.is_following;
  if (!follow) {
    const nickname = profile.value?.nickname.trim() || `用户 ${snapshot.profileUid}`;
    const confirmed = await showDialog.checkF({
      cancelLabel: "继续关注",
      confirmLabel: "取消关注",
      text: `确定要取消关注“${nickname}”吗？`,
      title: "取消关注",
    });
    if (!confirmed || !isCurrentAccount(snapshot, requestVersion)) return;
  }
  const version = ++requestVersion;
  followLoading.value = true;
  try {
    const response = await communityReq.setFollow(snapshot.cookie, snapshot.profileUid, follow);
    if (!isCurrentAccount(snapshot, version)) return;
    if (response.retcode !== 0) throw new Error(`[${response.retcode}] ${response.message}`);
    followRelation.value = { ...relation, is_following: follow };
    emits("followChange", follow ? 1 : -1);
    showSnackbar.success(follow ? "关注成功" : "已取消关注");
  } catch (cause) {
    if (!isCurrentAccount(snapshot, version)) return;
    showSnackbar.error(`${follow ? "关注" : "取消关注"}失败：${TGHttps.getErrMsg(cause)}`);
  } finally {
    if (isCurrentAccount(snapshot, version)) followLoading.value = false;
  }
}
</script>

<style lang="scss" scoped>
.community-profile-sidebar {
  display: flex;
  overflow: hidden;
  min-width: 0;
  box-sizing: border-box;
  flex-direction: column;
  flex-shrink: 0;
  padding: 12px 4px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--app-page-bg);
  gap: 8px;
}

.community-profile-sidebar-header {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  align-items: stretch;
  gap: 4px;

  h2 {
    padding: 0;
    margin: 0;
    color: var(--common-text-title);
    font-family: var(--font-title);
    font-size: 16px;
    font-weight: normal;
  }
}

.community-profile-sidebar-heading {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  padding: 0 6px;
  gap: 4px;
}

.community-profile-follow-state {
  display: inline-flex;
  width: 28px;
  height: 28px;
  box-sizing: border-box;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
  background: var(--box-bg-2);
  color: var(--box-text-2);
  cursor: pointer;
  transition:
    background-color 120ms ease,
    border-color 120ms ease;

  &:disabled {
    cursor: default;
    opacity: 0.7;
  }

  &:focus-visible {
    outline: 1px solid var(--tgc-od-orange);
    outline-offset: 1px;
  }

  &:hover:not(:disabled) {
    border-color: var(--common-shadow-2);
    background: var(--box-bg-3);
  }
}

.community-profile-sidebar-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;

  :deep(.v-btn) {
    width: 24px;
    height: 28px;
  }
}

.community-profile-nav {
  display: flex;
  min-height: 0;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 4px;
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-thumb {
    min-width: 0;
    min-height: 0;
    border: 0;
    border-radius: 3px;
    background: var(--common-shadow-2);
  }
}

.community-profile-nav-item {
  position: relative;
  display: flex;
  align-items: center;
  padding: 8px 6px;
  border-radius: 4px;
  color: var(--box-text-2);
  gap: 6px;
  text-decoration: none;
  white-space: nowrap;

  &:hover,
  &.is-active {
    background: var(--box-bg-2);
    color: var(--common-text-title);
  }

  &:focus-visible {
    outline: 2px solid var(--common-text-title);
    outline-offset: -2px;
  }
}

.community-profile-nav-divider {
  flex: 0 0 auto;
}

.community-profile-nav-badge {
  position: absolute;
  top: 2px;
  left: 16px;
  min-width: 14px;
  height: 14px;
  box-sizing: border-box;
  padding: 0 3px;
  border-radius: 7px;
  background: var(--tgc-od-red);
  box-shadow: 0 0 0 1px var(--app-page-bg);
  color: var(--tgc-white-1);
  font-size: 10px;
  line-height: 14px;
  text-align: center;

  &.is-dot {
    width: 8px;
    min-width: 8px;
    height: 8px;
    padding: 0;
    border-radius: 50%;
  }
}

@media (width <= 640px) {
  .community-profile-sidebar {
    flex-shrink: 0;
  }

  .community-profile-nav {
    overflow: auto hidden;
    flex-direction: row;
  }

  .community-profile-nav-item {
    flex-shrink: 0;
  }

  .community-profile-nav-divider {
    width: 0;
    max-width: 0;
    height: 20px;
    max-height: none;
    align-self: center;
    border-width: 0 thin 0 0;
  }
}
</style>
