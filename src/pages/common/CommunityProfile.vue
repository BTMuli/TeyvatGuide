<template>
  <main :aria-label="isOwnProfile ? '个人信息' : '用户信息'" class="community-profile">
    <header
      v-if="profile || loading"
      :aria-busy="!profile || headerLevelLoading"
      class="community-profile-header"
    >
      <div class="community-profile-header-content">
        <div class="community-profile-identity">
          <CpAvatar v-if="profile" :user="profile" :size="80" />
          <span v-else aria-hidden="true" class="community-profile-avatar-placeholder" />
          <div class="community-profile-intro">
            <div class="community-profile-name">
              <h2 :title="profile?.nickname">{{ profile?.nickname ?? "加载中…" }}</h2>
              <v-menu
                v-model="gameMenuVisible"
                :close-on-content-click="false"
                location="bottom start"
                offset="4"
              >
                <template #activator="{ props: menuProps }">
                  <button
                    :aria-label="`当前分区：${currentGame.name}，${levelLabel}，点击切换分区`"
                    :title="headerLevelError || `当前分区：${currentGame.name}，点击切换分区`"
                    class="community-profile-level"
                    type="button"
                    v-bind="menuProps"
                  >
                    <img v-if="currentGame.icon" :src="currentGame.icon" alt="" />
                    <span
                      :class="{
                        'community-profile-level-tag':
                          headerLevel && !headerLevelLoading && !headerLevelError,
                      }"
                      class="community-profile-level-label"
                    >
                      <span aria-live="polite">{{ levelLabel }}</span>
                      <v-icon aria-hidden="true" size="14">mdi-chevron-down</v-icon>
                    </span>
                  </button>
                </template>
                <div aria-label="选择分区" class="community-profile-game-menu" role="group">
                  <button
                    v-for="game in gameOptions"
                    :key="game.id"
                    :aria-label="`选择分区：${game.name}`"
                    :aria-pressed="selectedGid === game.id"
                    :class="{ dimmed: selectedGid !== game.id }"
                    :disabled="headerLevelLoading"
                    :title.attr="game.name"
                    class="community-profile-game-choice"
                    type="button"
                    @click="selectGame(game.id)"
                  >
                    <img v-if="game.icon" :alt="`${game.name}图标`" :src="game.icon" />
                    <v-icon v-else aria-hidden="true" size="24">mdi-gamepad-variant-outline</v-icon>
                  </button>
                  <div
                    v-if="!headerLevelLoading && headerLevelError"
                    class="community-profile-game-error"
                    role="alert"
                  >
                    <span :title="headerLevelError">{{ headerLevelError }}</span>
                    <button type="button" @click="retryHeaderLevel">重试</button>
                  </div>
                </div>
              </v-menu>
              <span :title="`米游社 ID：${profileUidText}`" class="community-profile-uid">
                ID: {{ profileUidText }}
              </span>
            </div>
            <p :title="profile?.introduce" class="community-profile-description">
              {{
                profile
                  ? profile.introduce || "这个人很神秘，什么都没有留下。"
                  : "正在加载个人信息…"
              }}
            </p>
          </div>
        </div>
        <div aria-label="个人统计" class="community-profile-stats">
          <div v-for="stat in profileStats" :key="stat.label" class="community-profile-stat">
            <strong>{{ stat.value }}</strong>
            <span>{{ stat.label }}</span>
          </div>
        </div>
      </div>
    </header>

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
              <v-progress-circular v-if="followLoading" indeterminate size="14" width="2" />
              <v-icon v-else aria-hidden="true" size="16">{{ followState.icon }}</v-icon>
            </button>
          </div>
          <div class="community-profile-sidebar-actions">
            <div class="community-profile-sidebar-trail">
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
            </div>
            <v-btn
              :disabled="!canViewProfile || loading"
              :loading
              aria-label="刷新个人中心"
              icon="mdi-refresh"
              size="x-small"
              title="刷新个人中心"
              variant="text"
              @click="loadProfile(true)"
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
                v-if="item.badge"
                :title="`${item.badge} 条未读`"
                class="community-profile-nav-badge"
              >
                {{ item.badge > 99 ? "99+" : item.badge }}
              </span>
            </RouterLink>
          </template>
        </nav>
      </aside>

      <section
        v-if="currentSection === 'posts' || loading || !profile"
        :aria-busy="loading"
        aria-labelledby="community-profile-posts-title"
        class="community-profile-posts"
      >
        <header class="community-profile-posts-header">
          <div class="community-profile-posts-heading">
            <h2 id="community-profile-posts-title">
              <v-icon size="20" aria-hidden="true">{{ activeNavigation?.icon }}</v-icon>
              {{ activeNavigation?.label }}
              <span
                v-if="profile && currentSection === 'posts' && (!searchKeyword || !loading)"
                class="community-profile-post-count"
              >
                {{
                  searchKeyword
                    ? fmtUtil.num(searchTotal)
                    : fmtUtil.num(Number(profile.achieve.post_num))
                }}
              </span>
            </h2>
            <p v-if="currentSection === 'posts'">
              {{
                isOwnProfile
                  ? "当前账号在米游社发布的帖子，可打开查看或编辑"
                  : "TA 在米游社发布的帖子，点击可打开查看"
              }}
            </p>
          </div>
          <div v-if="profile && currentSection === 'posts'" class="community-profile-posts-actions">
            <v-text-field
              v-model="searchInput"
              :clearable="true"
              :hide-details="true"
              append-inner-icon="mdi-magnify"
              aria-label="搜索帖子"
              autocomplete="off"
              class="community-profile-search"
              density="compact"
              placeholder="搜索帖子"
              variant="outlined"
              @click:append-inner="searchPosts(searchInput)"
              @click:clear="clearSearch"
              @keyup.enter="searchPosts(searchInput)"
            />
          </div>
        </header>

        <div v-if="loading" aria-live="polite" class="community-profile-state" role="status">
          <v-progress-circular indeterminate size="28" />
          <p>
            {{
              profile ? (searchKeyword ? "正在搜索帖子…" : "正在加载帖子…") : "正在加载个人信息…"
            }}
          </p>
        </div>
        <div
          v-else-if="loadError"
          aria-live="assertive"
          class="community-profile-state"
          role="alert"
        >
          <v-icon size="32">mdi-alert-circle-outline</v-icon>
          <p>{{ loadError }}</p>
          <v-btn variant="tonal" @click="retryPosts">重新加载</v-btn>
        </div>
        <div
          v-else-if="currentPosts.length === 0 && searchKeyword"
          class="community-profile-state"
          role="status"
        >
          <v-icon size="32">mdi-text-search-variant</v-icon>
          <p>未找到与“{{ searchKeyword }}”相关的帖子</p>
          <span>换个关键词试试</span>
        </div>
        <div v-else-if="currentPosts.length === 0" class="community-profile-state" role="status">
          <v-icon size="32">mdi-post-off</v-icon>
          <p>{{ isOwnProfile ? "暂未发布帖子" : "暂无公开帖子" }}</p>
          <span>{{
            isOwnProfile ? "发布后可在这里查看和编辑" : "用户的公开帖子会在这里展示"
          }}</span>
        </div>
        <div v-else class="community-profile-post-list">
          <article
            v-for="post in currentPosts"
            :key="post.post.post_id"
            class="community-profile-post"
          >
            <header class="community-profile-post-meta">
              <div class="community-profile-post-channels">
                <CpTypeBadge v-if="post.typeLabel" :icon="post.typeIcon" :label="post.typeLabel" />
                <CpChannelTag
                  v-if="post.game"
                  :aria-label="`进入分区：${post.game.name}`"
                  :icon="post.game.icon"
                  kind="game"
                  :name="post.game.name"
                  :to="`/posts/forum/${post.post.game_id}`"
                />
                <CpChannelTag
                  v-if="post.forum"
                  :aria-label="`进入版块：${post.forum.name}`"
                  :icon="post.forumIcon"
                  kind="forum"
                  :name="post.forum.name"
                  :to="`/posts/forum/${post.post.game_id}/${post.forum.id}`"
                />
              </div>
              <time
                class="community-profile-post-time"
                :title="`发布于 ${fmtUtil.dateTime(post.post.created_at * 1000)}`"
              >
                <v-icon size="16" aria-hidden="true">mdi-clock-outline</v-icon>
                {{ fmtUtil.dateTime(post.post.created_at * 1000) }}
              </time>
            </header>
            <h3 class="community-profile-post-title">
              <button type="button" @click="openPost(post)">
                <TpTitle :text="post.post.subject || '无标题帖子'" />
              </button>
            </h3>
            <div v-if="post.images.length" class="community-profile-post-images">
              <span
                v-for="(image, index) in post.images"
                :key="`${index}:${image}`"
                class="community-profile-post-image"
              >
                <TMiImg :alt="`第 ${index + 1} 张帖子图片`" :src="image" />
                <span
                  v-if="index === post.images.length - 1 && post.remainingImages > 0"
                  class="community-profile-post-image-more"
                >
                  <v-icon aria-hidden="true" size="10">mdi-folder-multiple-image</v-icon>
                  +{{ fmtUtil.num(post.remainingImages) }}
                </span>
              </span>
            </div>
            <div v-if="post.topics.length" class="community-profile-post-topics">
              <RouterLink
                v-for="topic in post.topics"
                :key="topic.id"
                class="community-profile-post-topic"
                :to="`/posts/topic/${post.post.game_id}/${topic.id}`"
              >
                <TpcTag :tag="topic.name" />
              </RouterLink>
            </div>
            <footer class="community-profile-post-footer">
              <div v-if="post.stat" aria-label="帖子统计" class="community-profile-post-stats">
                <span :title="`浏览 ${fmtUtil.num(post.stat.view_num)}`">
                  <v-icon size="16" aria-hidden="true">mdi-eye-outline</v-icon>
                  {{ fmtUtil.num(post.stat.view_num) }}
                </span>
                <span :title="`回复 ${fmtUtil.num(post.stat.reply_num)}`">
                  <v-icon size="16" aria-hidden="true">mdi-comment-outline</v-icon>
                  {{ fmtUtil.num(post.stat.reply_num) }}
                </span>
                <span :title="`点赞 ${fmtUtil.num(post.stat.like_num)}`">
                  <v-icon size="16" aria-hidden="true">mdi-thumb-up-outline</v-icon>
                  {{ fmtUtil.num(post.stat.like_num) }}
                </span>
                <span
                  v-if="post.stat.bookmark_num > 0"
                  :title="`收藏 ${fmtUtil.num(post.stat.bookmark_num)}`"
                >
                  <v-icon size="16" aria-hidden="true">mdi-star-outline</v-icon>
                  {{ fmtUtil.num(post.stat.bookmark_num) }}
                </span>
                <span
                  v-if="post.stat.forward_num > 0"
                  :title="`转发 ${fmtUtil.num(post.stat.forward_num)}`"
                >
                  <v-icon size="16" aria-hidden="true">mdi-share-variant-outline</v-icon>
                  {{ fmtUtil.num(post.stat.forward_num) }}
                </span>
              </div>
              <div class="community-profile-post-actions">
                <v-btn
                  v-if="isEditablePost(post)"
                  class="community-profile-edit-button"
                  prepend-icon="mdi-pencil-outline"
                  size="small"
                  title="编辑这篇帖子"
                  variant="tonal"
                  @click="editPost(post)"
                >
                  编辑
                </v-btn>
                <v-btn
                  v-if="isDeletablePost(post)"
                  :disabled="deletingPostId !== ''"
                  :loading="deletingPostId === post.post.post_id"
                  class="community-profile-delete-button"
                  prepend-icon="mdi-delete-outline"
                  size="small"
                  title="删除这篇帖子"
                  variant="tonal"
                  @click="deletePost(post)"
                >
                  删除
                </v-btn>
              </div>
            </footer>
          </article>
          <footer v-if="currentPosts.length" class="community-profile-post-list-footer">
            <template v-if="loadMoreError">
              <span :title="loadMoreError">加载失败</span>
              <v-btn :disabled="loadingMore" size="small" variant="tonal" @click="loadMorePosts">
                重试
              </v-btn>
            </template>
            <template v-else-if="loadingMore">
              <v-progress-circular indeterminate size="18" />
              <span>正在加载更多…</span>
            </template>
            <span v-else-if="isLast">已全部加载</span>
            <span
              v-else
              ref="postsLoadMoreRef"
              aria-hidden="true"
              class="community-profile-load-more-trigger"
            />
          </footer>
        </div>
      </section>
      <CpSettings
        v-else-if="isOwnProfile && (currentSection === 'privacy' || currentSection === 'edit')"
        :key="`${profileUid}:${currentSection}:${refreshVersion}`"
        :audit="profileAudit"
        :section="currentSection"
        :profile
        class="community-profile-panel"
        @saved="handleSettingsSaved"
      />
      <CpNotifications
        v-else-if="isOwnProfile && isNotificationSection(currentSection)"
        :key="`${profileUid}:${currentSection}:${refreshVersion}`"
        :category="notificationCategories[currentSection]"
        class="community-profile-panel"
        @item-read="handleNotificationItemRead"
        @read="handleNotificationRead"
      />
      <CpNotifySettings
        v-else-if="isOwnProfile && currentSection === 'notifySettings'"
        :key="`${profileUid}:${currentSection}:${refreshVersion}`"
        class="community-profile-panel"
      />
      <CpContent
        v-else-if="
          currentSection !== 'privacy' &&
          currentSection !== 'edit' &&
          currentSection !== 'notifySettings' &&
          !isNotificationSection(currentSection)
        "
        :key="`${profileUid}:${currentSection}:${refreshVersion}`"
        :profileUid
        :section="currentSection"
        class="community-profile-panel"
      />
    </section>
  </main>
</template>

<script lang="ts" setup>
import TMiImg from "@comp/app/t-mi-img.vue";
import CpAvatar from "@comp/communityProfile/cp-avatar.vue";
import CpChannelTag from "@comp/communityProfile/cp-channel-tag.vue";
import CpContent from "@comp/communityProfile/cp-content.vue";
import CpNotifications from "@comp/communityProfile/cp-notifications.vue";
import CpNotifySettings from "@comp/communityProfile/cp-notify-settings.vue";
import CpSettings from "@comp/communityProfile/cp-settings.vue";
import CpTypeBadge from "@comp/communityProfile/cp-type-badge.vue";
import showDialog from "@comp/func/dialog.js";
import showSnackbar from "@comp/func/snackbar.js";
import TpTitle from "@comp/viewPost/tp-title.vue";
import TpcTag from "@comp/viewPost/tpc-tag.vue";
import bbsReq from "@req/bbsReq.js";
import communityReq from "@req/communityReq.js";
import postEditReq from "@req/postEditReq.js";
import postReq from "@req/postReq.js";
import useAppStore from "@store/app.js";
import useBBSStore from "@store/bbs.js";
import useUserStore from "@store/user.js";
import { createPost } from "@utils/app/TGWindow.js";
import { executeReplyForCurrentAccount, matchesCurrentAccount } from "@utils/bbs/replyAccount.js";
import { getUserAvatar } from "@utils/common/toolFunc.js";
import {
  getPostForumIcon,
  getPostImageCount,
  getPostPreviewImages,
  getPostTypeIcon,
  getPostTypeLabel,
  hasNextProfile,
  hasPreviousProfile,
  recordProfileVisit,
  stepProfileTrail,
} from "@utils/community/profile.js";
import {
  getCommunityProfileLevel,
  getCommunityProfileLevelColor,
} from "@utils/community/profileLevel.js";
import fmtUtil from "@utils/display/fmtUtil.js";
import { maskUid } from "@utils/display/TGUid.js";
import TGHttps from "@utils/network/TGHttps.js";
import TGLogger from "@utils/system/TGLogger.js";
import { storeToRefs } from "pinia";
import { computed, nextTick, onBeforeUnmount, ref, shallowRef, useTemplateRef, watch } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";
import type { RouteLocationRaw } from "vue-router";

type NotificationSection = "reply" | "mention" | "system" | "likes";

type ProfileSection =
  | "posts"
  | "comments"
  | "collections"
  | "favorites"
  | "following"
  | "followers"
  | "history"
  | "privacy"
  | "edit"
  | NotificationSection
  | "notifySettings";

type NavigationItem = {
  section: ProfileSection;
  label: string;
  icon: string;
  divided?: boolean;
  badge?: number;
};

const notificationCategories: Readonly<
  Record<NotificationSection, TGApp.BBS.Notification.Category>
> = { reply: "reply", mention: "active_mention", system: "system", likes: "comment" };

/**
 * 查看用户资料时的账户与目标用户快照。
 * @since Beta v0.13.0
 */
type AccountSnapshot = {
  uid: string;
  profileUid: string;
  cookie: TGApp.App.Account.Cookie;
};

type ProfileStat = {
  label: string;
  value: string;
};

type FollowState = {
  icon: string;
  label: string;
};

type ProfileGameOption = Pick<TGApp.BBS.Game.Item, "id" | "name"> & {
  icon?: string;
};

type ProfilePost = TGApp.BBS.Post.FullData & {
  forumIcon?: string;
  game?: ProfileGameOption;
  images: Array<string>;
  remainingImages: number;
  typeIcon?: string;
  typeLabel?: string;
};

const defaultProfileGame: ProfileGameOption = {
  id: 2,
  name: "原神",
  icon: "/UI/nav/paimon.webp",
};

/**
 * 归一化后的帖子分页数据。
 * @since Beta v0.13.0
 */
type PostPage = {
  list: Array<TGApp.BBS.Post.FullData>;
  isLast: boolean;
  nextOffset: string;
  total: number;
};

const router = useRouter();
const route = useRoute();
const { isLogin } = storeToRefs(useAppStore());
const bbsStore = useBBSStore();
const { gameList, forumList } = storeToRefs(bbsStore);
const { cookie, uid, briefInfo } = storeToRefs(useUserStore());
const profileUid = computed<string>(() => {
  const targetUid = route.params.uid;
  return typeof targetUid === "string" ? targetUid.trim() : (uid.value ?? "");
});
const isOwnProfile = computed<boolean>(
  () => profileUid.value !== "" && profileUid.value === uid.value,
);
const profileUidText = computed<string>(() =>
  isOwnProfile.value ? maskUid(profileUid.value) : profileUid.value,
);
const selectedGid = ref<number>(defaultProfileGame.id);
const gameOptions = computed<Array<ProfileGameOption>>(() => {
  const options = gameList.value.map<ProfileGameOption>(({ id, name, app_icon, icon }) => ({
    id,
    name,
    icon: app_icon || icon,
  }));
  if (!options.some((item) => item.id === defaultProfileGame.id)) {
    options.unshift(defaultProfileGame);
  }
  return options;
});
const currentGame = computed<ProfileGameOption>(
  () => gameOptions.value.find((item) => item.id === selectedGid.value) ?? defaultProfileGame,
);
const unreadCounts = shallowRef<Partial<Record<TGApp.BBS.Notification.Category, number>>>({});
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
    const unread = unreadCounts.value;
    items.splice(1, 0, { section: "history", label: "浏览历史", icon: "mdi-history" });
    items.push(
      {
        section: "reply",
        label: "回复我的",
        icon: "mdi-comment-processing-outline",
        divided: true,
        badge: unread.reply,
      },
      { section: "mention", label: "主动@我", icon: "mdi-at", badge: unread.active_mention },
      { section: "system", label: "系统通知", icon: "mdi-bell-outline", badge: unread.system },
      { section: "likes", label: "收到的赞", icon: "mdi-thumb-up-outline", badge: unread.comment },
      { section: "privacy", label: "隐私设置", icon: "mdi-shield-lock-outline", divided: true },
      { section: "notifySettings", label: "消息设置", icon: "mdi-bell-cog-outline" },
      { section: "edit", label: "编辑资料", icon: "mdi-account-edit-outline" },
    );
  }
  return items;
});
const currentSection = computed<ProfileSection>(() => {
  const section = route.query.section;
  switch (section) {
    case "comments":
    case "collections":
    case "favorites":
    case "following":
    case "followers":
      return section;
    case "history":
    case "privacy":
    case "edit":
    case "reply":
    case "mention":
    case "system":
    case "likes":
    case "notifySettings":
      return isOwnProfile.value ? section : "posts";
    default:
      return "posts";
  }
});
const activeNavigation = computed<NavigationItem | undefined>(() =>
  navigation.value.find((item) => item.section === currentSection.value),
);

const profile = shallowRef<TGApp.BBS.User.Info>();
const headerUserInfo = shallowRef<TGApp.BBS.User.Info>();
const profileAudit = shallowRef<TGApp.BBS.User.InfoRes["audit_info"]>();
const posts = shallowRef<Array<TGApp.BBS.Post.FullData>>([]);
const nextOffset = ref<string>("");
const isLast = ref<boolean>(false);
const loading = ref<boolean>(false);
const loadingMore = ref<boolean>(false);
const loadMoreError = ref<string>("");
const postsLoadMoreRef = useTemplateRef<HTMLElement>("postsLoadMoreRef");
let postsLoadMoreObserver: IntersectionObserver | undefined;
const deletingPostId = ref<string>("");
const loadError = ref<string>("");
const refreshVersion = ref<number>(0);
const searchInput = ref<string | null>("");
const searchKeyword = ref<string>("");
const searchTotal = ref<number>(0);
const headerLevelLoading = ref<boolean>(false);
const headerLevelError = ref<string>("");
const followRelation = shallowRef<TGApp.BBS.User.FollowRelation>();
const followLoading = ref<boolean>(false);
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
const profileStats = computed<Array<ProfileStat>>(() => {
  const achieve = profile.value?.achieve;
  const format = (value: string | undefined): string =>
    value === undefined ? "-" : fmtUtil.num(Number(value));
  return [
    { label: "获赞", value: format(achieve?.like_num) },
    { label: "发布", value: format(achieve?.post_num) },
    { label: "评论", value: format(achieve?.replypost_num) },
    { label: "粉丝", value: format(achieve?.followed_cnt) },
    { label: "关注", value: format(achieve?.follow_cnt) },
  ];
});
const headerLevel = computed<TGApp.BBS.User.LevelExp | undefined>(() =>
  headerUserInfo.value === undefined
    ? undefined
    : getCommunityProfileLevel(headerUserInfo.value, selectedGid.value, selectedGid.value),
);
const levelColor = computed<string>(() => getCommunityProfileLevelColor(headerLevel.value?.level));
const levelLabel = computed<string>(() => {
  if (headerLevelLoading.value) return "加载中…";
  if (headerLevelError.value) return "加载失败";
  if (headerUserInfo.value === undefined) return "Lv.-";
  return headerLevel.value ? `Lv.${headerLevel.value.level}` : "暂无等级";
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
const gameMenuVisible = ref<boolean>(false);
const currentPosts = computed<Array<ProfilePost>>(() =>
  posts.value.map((post) => {
    const images = getPostPreviewImages(post);
    return {
      ...post,
      forumIcon: getPostForumIcon(post, forumList.value),
      game: getPostGame(post),
      images,
      remainingImages: getPostImageCount(post) - images.length,
      typeIcon: getPostTypeIcon(post),
      typeLabel: getPostTypeLabel(post),
    };
  }),
);
let requestVersion = 0;
let unreadVersion = 0;
let headerRequestVersion = 0;
let headerContextKey = "";
const readCategories = new Set<TGApp.BBS.Notification.Category>();
let active = true;

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

watch(
  [
    isLogin,
    uid,
    profileUid,
    () => cookie.value?.account_id,
    () => cookie.value?.cookie_token,
    () => cookie.value?.ltuid,
    () => cookie.value?.ltoken,
    selectedGid,
  ],
  () => {
    const nextContextKey = [
      isLogin.value ? "1" : "0",
      uid.value ?? "",
      profileUid.value,
      cookie.value?.account_id ?? "",
      cookie.value?.cookie_token ?? "",
      cookie.value?.ltuid ?? "",
      cookie.value?.ltoken ?? "",
    ].join("\u001f");
    if (nextContextKey !== headerContextKey) {
      headerContextKey = nextContextKey;
      headerRequestVersion += 1;
      headerUserInfo.value = undefined;
      headerLevelError.value = "";
      headerLevelLoading.value = false;
    }
    if (selectedGid.value === defaultProfileGame.id) {
      if (profile.value !== undefined) syncHeaderProfile();
      return;
    }
    void loadHeaderLevel();
  },
  { immediate: true },
);

watch(
  profile,
  () => {
    if (selectedGid.value !== defaultProfileGame.id || profile.value === undefined) return;
    syncHeaderProfile();
  },
  { immediate: true },
);

watch(profileUid, recordProfileVisit, { immediate: true });

watch(currentSection, (section) => {
  if (section === "posts" && profile.value && !loading.value && posts.value.length === 0) {
    void loadProfile();
  }
});
watch(
  [loading, loadingMore, isLast, () => posts.value.length, loadMoreError, currentSection],
  () => {
    postsLoadMoreObserver?.disconnect();
    if (
      currentSection.value !== "posts" ||
      loading.value ||
      loadingMore.value ||
      isLast.value ||
      loadMoreError.value !== ""
    )
      return;
    void nextTick(observePostsLoadMore);
  },
);

void ensureGameList();

onBeforeUnmount(() => {
  active = false;
  requestVersion += 1;
  unreadVersion += 1;
  headerRequestVersion += 1;
  postsLoadMoreObserver?.disconnect();
});

function isNotificationSection(section: ProfileSection): section is NotificationSection {
  return Object.hasOwn(notificationCategories, section);
}

async function openTrailProfile(step: -1 | 1): Promise<void> {
  const targetUid = stepProfileTrail(step);
  if (targetUid === undefined) return;
  await router.push(
    targetUid === uid.value
      ? { name: "个人信息" }
      : { name: "用户信息", params: { uid: targetUid } },
  );
}

function getSectionRoute(section: ProfileSection): RouteLocationRaw {
  return isOwnProfile.value
    ? { name: "个人信息", query: { section } }
    : { name: "用户信息", params: { uid: profileUid.value }, query: { section } };
}

async function fetchPostPage(
  snapshot: AccountSnapshot,
  keyword: string,
  offset?: string,
): Promise<PostPage> {
  let postPage: PostPage;
  if (keyword === "") {
    const response =
      snapshot.profileUid === snapshot.uid
        ? await communityReq.posts(snapshot.cookie, offset)
        : await postReq.user.post(snapshot.profileUid, 0, offset);
    if (response.retcode !== 0) throw new Error(`[${response.retcode}] ${response.message}`);
    postPage = {
      list: response.data.list,
      isLast: response.data.is_last,
      nextOffset: response.data.next_offset,
      total: 0,
    };
  } else {
    const response = await communityReq.searchPosts(snapshot.profileUid, keyword, offset);
    if (response.retcode !== 0) throw new Error(`[${response.retcode}] ${response.message}`);
    postPage = {
      list: response.data.list.filter((item) => item.entity_type === 1).map((item) => item.post),
      isLast: response.data.is_last,
      nextOffset: String(response.data.next_offset),
      total: response.data.total,
    };
  }
  if (!postPage.isLast && postPage.nextOffset.trim() === "") {
    throw new Error("帖子分页游标无效");
  }
  return postPage;
}

function applyFirstPostPage(postPage: PostPage): void {
  posts.value = postPage.list;
  nextOffset.value = postPage.nextOffset;
  isLast.value = postPage.isLast;
  searchTotal.value = postPage.total;
}

function resetPostList(): void {
  posts.value = [];
  nextOffset.value = "";
  isLast.value = false;
  loadingMore.value = false;
  loadMoreError.value = "";
  searchTotal.value = 0;
}

function resetProfileData(): void {
  profile.value = undefined;
  profileAudit.value = undefined;
  followRelation.value = undefined;
  followLoading.value = false;
  resetPostList();
  searchInput.value = "";
  searchKeyword.value = "";
  loadError.value = "";
  loading.value = false;
  unreadVersion += 1;
  unreadCounts.value = {};
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

function isCurrentHeaderRequest(version: number, snapshot: AccountSnapshot, gid: number): boolean {
  return (
    version === headerRequestVersion && selectedGid.value === gid && isCurrentAccount(snapshot)
  );
}

function syncHeaderProfile(): void {
  if (profile.value === undefined) return;
  headerRequestVersion += 1;
  headerUserInfo.value = profile.value;
  headerLevelError.value = "";
  headerLevelLoading.value = false;
}

async function ensureGameList(): Promise<void> {
  if (gameList.value.length > 0) return;
  await bbsStore.refreshGameList();
}

async function loadHeaderLevel(): Promise<void> {
  const version = ++headerRequestVersion;
  const gid = selectedGid.value;
  if (gid === defaultProfileGame.id && profile.value !== undefined) {
    syncHeaderProfile();
    return;
  }
  headerUserInfo.value = undefined;
  headerLevelError.value = "";
  headerLevelLoading.value = false;
  const snapshot = getAccountSnapshot();
  if (snapshot === undefined) return;
  if (!/^[1-9]\d*$/.test(snapshot.profileUid)) {
    headerLevelError.value = "用户 ID 无效。";
    return;
  }
  headerLevelLoading.value = true;
  try {
    const userResponse =
      snapshot.profileUid === snapshot.uid
        ? await bbsReq.userInfo(snapshot.cookie, gid.toString())
        : await bbsReq.otherUserInfo(gid.toString(), snapshot.profileUid);
    if (!isCurrentHeaderRequest(version, snapshot, gid)) return;
    if (userResponse.retcode !== 0) {
      throw new Error(`[${userResponse.retcode}] ${userResponse.message}`);
    }
    if (userResponse.data.user_info.uid !== snapshot.profileUid) {
      throw new Error("用户信息与当前查看的用户不一致");
    }
    headerUserInfo.value = userResponse.data.user_info;
  } catch (cause) {
    if (isCurrentHeaderRequest(version, snapshot, gid)) {
      headerLevelError.value = TGHttps.getErrMsg(cause);
    }
  } finally {
    if (isCurrentHeaderRequest(version, snapshot, gid)) headerLevelLoading.value = false;
  }
}

async function loadUnreadCounts(snapshot: AccountSnapshot): Promise<void> {
  if (snapshot.profileUid !== snapshot.uid) return;
  const version = ++unreadVersion;
  readCategories.clear();
  try {
    const response = await communityReq.notificationUnread(snapshot.cookie);
    if (version !== unreadVersion || !isCurrentAccount(snapshot)) return;
    if (response.retcode !== 0) throw new Error(`[${response.retcode}] ${response.message}`);
    const count = response.data.count;
    const getCount = (category: TGApp.BBS.Notification.Category): number =>
      readCategories.has(category) ? 0 : (count[category] ?? 0);
    unreadCounts.value = {
      reply: getCount("reply"),
      active_mention: getCount("active_mention"),
      system: getCount("system"),
      comment: getCount("comment"),
    };
  } catch (cause) {
    await TGLogger.Warn(`[CommunityProfile] 获取未读消息数失败：${TGHttps.getErrMsg(cause)}`);
  }
}

function handleNotificationRead(category: TGApp.BBS.Notification.Category): void {
  readCategories.add(category);
  unreadCounts.value = { ...unreadCounts.value, [category]: 0 };
}

function handleNotificationItemRead(category: TGApp.BBS.Notification.Category): void {
  const current = unreadCounts.value[category] ?? 0;
  if (current <= 0) return;
  unreadCounts.value = { ...unreadCounts.value, [category]: current - 1 };
}

async function loadProfile(refreshHeader: boolean = false): Promise<void> {
  const version = ++requestVersion;
  refreshVersion.value += 1;
  resetProfileData();
  const snapshot = getAccountSnapshot();
  if (snapshot === undefined) return;
  if (refreshHeader) {
    headerRequestVersion += 1;
    headerUserInfo.value = undefined;
    headerLevelError.value = "";
    headerLevelLoading.value = false;
    if (selectedGid.value !== defaultProfileGame.id) void loadHeaderLevel();
  }
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
    if (currentSection.value !== "posts") return;
    const postPage = await fetchPostPage(snapshot, searchKeyword.value);
    if (!isCurrentRequest(version, snapshot)) return;
    applyFirstPostPage(postPage);
  } catch (cause) {
    if (isCurrentRequest(version, snapshot)) loadError.value = TGHttps.getErrMsg(cause);
  } finally {
    if (isCurrentRequest(version, snapshot)) loading.value = false;
  }
}

async function searchPosts(input: string | null): Promise<void> {
  const keyword = (input ?? "").trim();
  if (loading.value || !profile.value) return;
  const snapshot = getAccountSnapshot();
  if (snapshot === undefined) return;
  const version = ++requestVersion;
  searchKeyword.value = keyword;
  resetPostList();
  loadError.value = "";
  loading.value = true;
  try {
    const postPage = await fetchPostPage(snapshot, keyword);
    if (!isCurrentRequest(version, snapshot)) return;
    applyFirstPostPage(postPage);
  } catch (cause) {
    if (isCurrentRequest(version, snapshot)) loadError.value = TGHttps.getErrMsg(cause);
  } finally {
    if (isCurrentRequest(version, snapshot)) loading.value = false;
  }
}

function clearSearch(): void {
  if (searchKeyword.value !== "") void searchPosts("");
}

function retryPosts(): void {
  if (profile.value && currentSection.value === "posts") {
    void searchPosts(searchKeyword.value);
  } else {
    void loadProfile(true);
  }
}

function retryHeaderLevel(): void {
  void loadHeaderLevel();
}

function selectGame(gid: number): void {
  selectedGid.value = gid;
  gameMenuVisible.value = false;
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
    if (!confirmed || !isCurrentAccount(snapshot)) return;
  }
  followLoading.value = true;
  try {
    const response = await communityReq.setFollow(snapshot.cookie, snapshot.profileUid, follow);
    if (!isCurrentAccount(snapshot)) return;
    if (response.retcode !== 0) throw new Error(`[${response.retcode}] ${response.message}`);
    followRelation.value = { ...relation, is_following: follow };
    adjustFollowedCount(follow ? 1 : -1);
    showSnackbar.success(follow ? "关注成功" : "已取消关注");
  } catch (cause) {
    if (!isCurrentAccount(snapshot)) return;
    showSnackbar.error(`${follow ? "关注" : "取消关注"}失败：${TGHttps.getErrMsg(cause)}`);
  } finally {
    if (isCurrentAccount(snapshot)) followLoading.value = false;
  }
}

function handleSettingsSaved(warning?: string): void {
  if (warning) {
    showSnackbar.warn(warning);
  } else {
    showSnackbar.success(currentSection.value === "privacy" ? "隐私设置已保存" : "资料已提交保存");
  }
  void loadProfile(true);
}

async function loadMorePosts(): Promise<void> {
  if (loading.value || loadingMore.value || isLast.value) return;
  const snapshot = getAccountSnapshot();
  const offset = nextOffset.value.trim();
  if (snapshot === undefined || offset === "") return;
  const version = requestVersion;
  loadingMore.value = true;
  loadMoreError.value = "";
  try {
    const postPage = await fetchPostPage(snapshot, searchKeyword.value, offset);
    if (!isCurrentRequest(version, snapshot)) return;
    if (!postPage.isLast && postPage.nextOffset === offset)
      throw new Error("帖子分页游标无效，请刷新后重试。");
    const ids = new Set(posts.value.map((post) => post.post.post_id));
    posts.value = [
      ...posts.value,
      ...postPage.list.filter((post) => {
        if (ids.has(post.post.post_id)) return false;
        ids.add(post.post.post_id);
        return true;
      }),
    ];
    nextOffset.value = postPage.nextOffset;
    isLast.value = postPage.isLast;
  } catch (cause) {
    if (isCurrentRequest(version, snapshot)) loadMoreError.value = TGHttps.getErrMsg(cause);
  } finally {
    if (isCurrentRequest(version, snapshot)) loadingMore.value = false;
  }
}

function observePostsLoadMore(): void {
  const target = postsLoadMoreRef.value;
  if (
    target === null ||
    currentSection.value !== "posts" ||
    loading.value ||
    loadingMore.value ||
    isLast.value ||
    loadMoreError.value !== ""
  )
    return;
  postsLoadMoreObserver ??= new IntersectionObserver(
    (records) => {
      const entry = records.find((record) => record.isIntersecting);
      if (entry === undefined) return;
      postsLoadMoreObserver?.unobserve(entry.target);
      void loadMorePosts();
    },
    { rootMargin: "240px 0px" },
  );
  postsLoadMoreObserver.observe(target);
}

function isEditablePost(post: TGApp.BBS.Post.FullData): boolean {
  return (
    isOwnProfile.value &&
    canViewProfile.value &&
    post.post.uid === uid.value &&
    (post.post.view_type === 1 || post.post.view_type === 2)
  );
}

function isDeletablePost(post: TGApp.BBS.Post.FullData): boolean {
  return isOwnProfile.value && canViewProfile.value && post.post.uid === uid.value;
}

function removePostFromList(postId: string): void {
  posts.value = posts.value.filter((item) => item.post.post_id !== postId);
  if (profile.value !== undefined) {
    const postNum = Number.parseInt(profile.value.achieve.post_num, 10);
    profile.value = {
      ...profile.value,
      achieve: {
        ...profile.value.achieve,
        post_num: String(Math.max((Number.isFinite(postNum) ? postNum : 0) - 1, 0)),
      },
    };
  }
  if (searchKeyword.value) searchTotal.value = Math.max(searchTotal.value - 1, 0);
  if (posts.value.length === 0 && !isLast.value) void loadMorePosts();
}

async function deletePost(post: TGApp.BBS.Post.FullData): Promise<void> {
  if (!isDeletablePost(post) || deletingPostId.value !== "") return;
  const snapshot = getAccountSnapshot();
  if (snapshot === undefined) {
    showSnackbar.warn("当前账号凭据不可用，请重新登录米游社账号。");
    return;
  }
  const postId = post.post.post_id;
  const subject = post.post.subject.trim() || `帖子 ${postId}`;
  const account: TGApp.BBS.Reply.AccountSnapshot = {
    uid: snapshot.uid,
    cookie: { ltoken: snapshot.cookie.ltoken, ltuid: snapshot.cookie.ltuid },
  };
  const requestCookie = { ...account.cookie };
  const version = requestVersion;
  deletingPostId.value = postId;
  try {
    const confirmed = await showDialog.checkF({
      cancelLabel: "取消",
      confirmLabel: "删除",
      text: `确定删除“${subject}”（ID：${postId}）吗？此操作不可撤销。`,
      title: "删除帖子",
    });
    if (!confirmed) return;
    if (!isCurrentRequest(version, snapshot) || !matchesCurrentAccount(account)) {
      showSnackbar.warn("登录账号或页面状态已变化，请重新操作");
      return;
    }
    const latest = await postReq.post(postId, requestCookie);
    if (!isCurrentRequest(version, snapshot) || !matchesCurrentAccount(account)) return;
    if (latest.retcode !== 0) throw new Error(`[${latest.retcode}] ${latest.message}`);
    if (latest.data.post.post.post_id !== postId || latest.data.post.post.uid !== snapshot.uid) {
      throw new Error("帖子状态已变化，请刷新后重试");
    }
    const result = await executeReplyForCurrentAccount(account, () =>
      postEditReq.delete(latest.data.post, requestCookie),
    );
    if (!result.allowed) {
      showSnackbar.warn("登录账号已变化，请重新操作");
      return;
    }
    if (result.data.retcode !== 0) {
      showSnackbar.error(`[${result.data.retcode}] ${result.data.message}`);
      return;
    }
    if (!isCurrentRequest(version, snapshot)) return;
    removePostFromList(postId);
    showSnackbar.success("帖子已删除");
  } catch (cause) {
    if (!isCurrentRequest(version, snapshot)) return;
    showSnackbar.error(`删除帖子失败：${TGHttps.getErrMsg(cause)}`);
  } finally {
    deletingPostId.value = "";
  }
}

function getPostGame(post: TGApp.BBS.Post.FullData): ProfileGameOption | undefined {
  return gameOptions.value.find((game) => game.id === post.post.game_id);
}

async function openPost(post: TGApp.BBS.Post.FullData): Promise<void> {
  await createPost(post.post.post_id, post.post.subject);
}

async function editPost(post: TGApp.BBS.Post.FullData): Promise<void> {
  if (!isEditablePost(post)) return;
  await router.push(`/community/profile/posts/${post.post.post_id}/edit`);
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
  padding: 16px 24px 0;
  margin: 0 auto;
  color: var(--app-page-content);
  font-size: 14px;
  gap: 16px;
  line-height: 20px;
}

.community-profile-header {
  display: flex;
  min-width: 0;
  flex-direction: column;
  flex-shrink: 0;
  align-items: stretch;
  padding: 24px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--box-bg-1);
  gap: 16px;
}

.community-profile-header-content {
  display: flex;
  width: 100%;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}

.community-profile-identity {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 16px;
}

.community-profile-intro {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 8px;
}

.community-profile-avatar-placeholder {
  display: inline-flex;
  width: 80px;
  height: 80px;
  flex: 0 0 80px;
  align-items: center;
  justify-content: center;

  &::before {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: var(--box-bg-3);
    content: "";
  }
}

.community-profile-name {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 8px;

  h2 {
    overflow: hidden;
    min-width: 0;
    flex: 0 1 auto;
    margin: 0;
    color: var(--common-text-title);
    font-family: var(--font-title);
    font-size: 20px;
    font-weight: normal;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.community-profile-level {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  padding: 0 2px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: var(--box-text-4);
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  gap: 4px;
  line-height: 16px;
  white-space: nowrap;

  &:hover {
    background: var(--box-bg-2);
  }

  &:focus-visible {
    outline: 1px solid var(--tgc-od-orange);
    outline-offset: 1px;
  }

  img {
    width: 20px;
    height: 20px;
    object-fit: contain;
  }
}

.community-profile-level-label {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

.community-profile-level-tag {
  padding: 2px 4px 2px 6px;
  border-radius: 4px;
  background: v-bind(levelColor); /* stylelint-disable-line value-keyword-case */
  color: var(--tgc-white-1);
}

.community-profile-uid {
  flex-shrink: 0;
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--box-bg-2);
  color: var(--box-text-4);
  font-size: 12px;
  line-height: 16px;
  white-space: nowrap;
}

.community-profile-description {
  overflow: hidden;
  max-width: 560px;
  margin: 0;
  color: var(--app-page-content);
  font-size: 14px;
  overflow-wrap: anywhere;
}

.community-profile-game-menu {
  display: flex;
  width: fit-content;
  max-width: min(320px, calc(100vw - 32px));
  box-sizing: border-box;
  flex-wrap: wrap;
  padding: 4px;
  border: 1px solid var(--common-shadow-2);
  border-radius: 4px;
  background: var(--box-bg-1);
  box-shadow: 0 4px 12px var(--common-shadow-4);
  gap: 4px;
}

.community-profile-game-choice {
  display: flex;
  width: 24px;
  height: 24px;
  box-sizing: border-box;
  flex: 0 0 24px;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--box-text-1);
  cursor: pointer;

  &.dimmed {
    opacity: 0.3;
  }

  &.dimmed:not(:disabled):hover {
    opacity: 0.7;
  }

  &:disabled {
    cursor: default;
  }

  &:focus-visible {
    outline: 1px solid var(--tgc-od-orange);
    outline-offset: 1px;
  }

  img {
    width: 24px;
    height: 24px;
    object-fit: contain;
  }
}

.community-profile-game-error {
  display: flex;
  min-width: 0;
  flex: 1 0 100%;
  align-items: center;
  color: var(--tgc-od-red);
  font-size: 12px;
  gap: 4px;
  line-height: 16px;

  span {
    overflow: hidden;
    min-width: 0;
    flex: 1 1 auto;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  button {
    flex-shrink: 0;
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--tgc-od-orange);
    cursor: pointer;
    font: inherit;
    text-decoration: underline;
    text-underline-offset: 2px;
  }
}

.community-profile-stats {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 24px;
}

.community-profile-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  color: var(--box-text-4);
  gap: 4px;

  strong {
    color: var(--common-text-title);
    font-family: var(--font-title);
    font-size: 18px;
    font-weight: normal;
  }

  span {
    font-size: 12px;
  }
}

.community-profile-layout {
  display: grid;
  min-height: 0;
  flex: 1 1 auto;
  align-items: stretch;
  gap: 16px;
  grid-template-columns: 140px minmax(0, 1fr);
}

.community-profile-sidebar,
.community-profile-posts,
.community-profile-panel {
  min-width: 0;
  padding: 16px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--app-page-bg);
}

.community-profile-sidebar {
  display: flex;
  overflow: hidden;
  flex-direction: column;
  padding: 12px 4px;
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
}

.community-profile-sidebar-trail {
  display: flex;
  align-items: center;
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
}

.community-profile-posts {
  display: flex;
  overflow: hidden;
  min-height: 0;
  flex-direction: column;
  gap: 16px;
}

.community-profile-panel {
  overflow: auto;
  min-height: 0;
}

.community-profile-posts-header {
  display: flex;
  flex-shrink: 0;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 16px;

  h2 {
    display: flex;
    align-items: center;
    margin: 0;
    color: var(--common-text-title);
    font-family: var(--font-title);
    font-size: 16px;
    font-weight: normal;
    gap: 8px;
  }

  p {
    margin: 0;
    color: var(--box-text-4);
    font-size: 12px;
  }
}

.community-profile-posts-heading {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.community-profile-posts-actions {
  display: flex;
  min-width: 0;
  flex: 1 1 auto;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
}

.community-profile-search {
  width: 240px;
  max-width: 100%;
  flex: 0 1 auto;
}

.community-profile-post-count {
  flex-shrink: 0;
  padding: 1px 8px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 999px;
  background: var(--box-bg-2);
  color: var(--box-text-4);
  font-size: 12px;
  font-weight: normal;
  line-height: 18px;
  white-space: nowrap;
}

.community-profile-post-list {
  display: flex;
  min-height: 0;
  flex: 1 1 auto;
  flex-direction: column;
  padding: 4px;
  gap: 12px;
  overflow-y: auto;
  scrollbar-gutter: stable;
}

.community-profile-post-list-footer {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  padding: 4px 0;
  color: var(--box-text-4);
  font-size: 12px;
  gap: 8px;
}

.community-profile-load-more-trigger {
  width: 100%;
  height: 1px;
}

.community-profile-post {
  position: relative;
  z-index: 0;
  display: flex;
  min-width: 0;
  flex: 0 0 auto;
  flex-direction: column;
  padding: 16px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--box-bg-1);
  gap: 12px;
  transition: background-color 120ms ease;

  &:hover {
    background: var(--box-bg-2);
  }
}

.community-profile-post-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  color: var(--box-text-4);
  font-size: 12px;
  gap: 8px 12px;
}

.community-profile-post-channels {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.community-profile-post-time {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  margin-left: auto;
  gap: 4px;
  white-space: nowrap;
}

.community-profile-post-title {
  margin: 0;
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 18px;
  font-weight: normal;
  line-height: 28px;
  overflow-wrap: anywhere;

  button {
    padding: 0;
    border: 0;
    background: transparent;
    color: inherit;
    cursor: pointer;
    font: inherit;
    text-align: left;

    &::after {
      position: absolute;
      z-index: 1;
      content: "";
      inset: 0;
    }

    &:focus-visible {
      outline: none;

      &::after {
        border-radius: 8px;
        outline: 2px solid var(--common-text-title);
        outline-offset: 2px;
      }
    }
  }
}

.community-profile-post-images {
  display: flex;
  width: fit-content;
  max-width: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
  gap: 8px;
  text-align: left;
}

.community-profile-post-image {
  position: relative;
  display: grid;
  overflow: hidden;
  width: 160px;
  max-width: 100%;
  height: auto;
  flex: 0 1 160px;
  border-radius: 4px;
  aspect-ratio: 1;
  background: var(--box-bg-2);
  place-items: center;

  :deep(img) {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.community-profile-post:hover .community-profile-post-image {
  background: var(--box-bg-1);
}

.community-profile-post-image-more {
  position: absolute;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding-right: 4px;
  padding-left: 8px;
  background: var(--tgc-od-blue);
  border-top-left-radius: 12px;
  box-shadow: -1px -1px 6px var(--tgc-dark-1);
  color: var(--tgc-white-1);
  column-gap: 2px;
  font-size: 12px;
  line-height: 18px;
}

.community-profile-post-topics {
  display: flex;
  flex-wrap: wrap;
  font-size: 12px;
  gap: 4px;
}

.community-profile-post-topic {
  position: relative;
  z-index: 2;
  display: inline-flex;
  border-radius: 12px;
  text-decoration: none;

  &:focus-visible {
    outline: 2px solid var(--common-text-title);
    outline-offset: 2px;
  }
}

.community-profile-post-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 16px;
}

.community-profile-post-actions {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 8px;
}

.community-profile-post-stats {
  display: flex;
  min-width: 0;
  flex: 1 1 auto;
  flex-wrap: wrap;
  color: var(--box-text-4);
  font-size: 12px;
  gap: 16px;

  span {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
}

.community-profile-edit-button {
  position: relative;
  z-index: 2;
  flex-shrink: 0;
  color: var(--common-text-title);
}

.community-profile-delete-button {
  position: relative;
  z-index: 2;
  flex-shrink: 0;
  color: var(--tgc-od-red);
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

  > span {
    font-size: 12px;
  }
}

.community-profile > .community-profile-state,
.community-profile-posts > .community-profile-state {
  min-height: 0;
  flex: 1 1 auto;
}

@media (width <= 900px) {
  .community-profile-header-content {
    flex-direction: column;
    align-items: flex-start;
  }

  .community-profile-stats {
    width: 100%;
  }
}

@media (width <= 640px) {
  .community-profile {
    padding: 8px 0 0;
  }

  .community-profile-header,
  .community-profile-posts,
  .community-profile-panel {
    padding: 16px;
  }

  .community-profile-layout {
    display: flex;
    min-height: 0;
    flex: 1 1 auto;
    flex-direction: column;
    gap: 8px;
  }

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

  .community-profile-posts,
  .community-profile-panel {
    flex: 1 1 auto;
  }

  .community-profile-post-list {
    padding: 2px;
    gap: 8px;
  }

  .community-profile-post {
    padding: 12px;
  }

  .community-profile-posts-header {
    align-items: flex-start;
  }

  .community-profile-post-footer {
    gap: 8px;
  }

  .community-profile-post-stats {
    gap: 8px;
  }
}
</style>
