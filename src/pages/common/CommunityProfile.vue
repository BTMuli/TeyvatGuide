<template>
  <main :aria-label="isOwnProfile ? '个人信息' : '用户信息'" class="community-profile">
    <header v-if="profile || loading" :aria-busy="!profile" class="community-profile-header">
      <div class="community-profile-identity">
        <CpAvatar v-if="profile" :user="profile" :size="80" />
        <span v-else aria-hidden="true" class="community-profile-avatar-placeholder" />
        <div class="community-profile-intro">
          <div class="community-profile-name">
            <h2 :title="profile?.nickname">{{ profile?.nickname ?? "加载中…" }}</h2>
            <span v-if="profile" class="community-profile-level">
              Lv.{{ profile.level_exp.level }}
            </span>
            <span :title="`米游社 ID：${profileUid}`" class="community-profile-uid">
              ID: {{ profileUid }}
            </span>
          </div>
          <p :title="profile?.introduce" class="community-profile-description">
            {{
              profile ? profile.introduce || "这个人很神秘，什么都没有留下。" : "正在加载个人信息…"
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
    </header>

    <section
      v-if="!canViewProfile && !profile && !loadError"
      aria-live="polite"
      class="community-profile-state"
      role="status"
    >
      <v-icon size="36">{{ incognito ? "mdi-incognito" : "mdi-account-lock-outline" }}</v-icon>
      <p>{{ profileAccessMessage }}</p>
      <v-btn :to="{ name: '设置' }" prepend-icon="mdi-cog-outline" variant="tonal">
        前往设置
      </v-btn>
    </section>

    <section v-else class="community-profile-layout">
      <aside aria-label="个人中心导航" class="community-profile-sidebar">
        <div class="community-profile-sidebar-header">
          <h2>{{ isOwnProfile ? "个人中心" : "用户信息" }}</h2>
          <div class="community-profile-sidebar-actions">
            <v-btn
              :disabled="!hasPreviousProfile"
              aria-label="上一个主页"
              icon="mdi-chevron-left"
              size="small"
              title="上一个主页"
              variant="text"
              @click="openTrailProfile(-1)"
            />
            <v-btn
              :disabled="!hasNextProfile"
              aria-label="下一个主页"
              icon="mdi-chevron-right"
              size="small"
              title="下一个主页"
              variant="text"
              @click="openTrailProfile(1)"
            />
            <v-btn
              :disabled="!canViewProfile || loading"
              :loading
              aria-label="刷新个人中心"
              icon="mdi-refresh"
              size="small"
              title="刷新个人中心"
              variant="text"
              @click="loadProfile"
            />
          </div>
        </div>
        <nav class="community-profile-nav">
          <RouterLink
            v-for="item in navigation"
            :key="item.label"
            :aria-current="item.section === currentSection ? 'page' : 'false'"
            :class="{ 'is-active': item.section === currentSection }"
            class="community-profile-nav-item"
            :to="getSectionRoute(item.section)"
          >
            <v-icon size="18" aria-hidden="true">{{ item.icon }}</v-icon>
            <span>{{ item.label }}</span>
          </RouterLink>
        </nav>
      </aside>

      <section
        v-if="currentSection === 'posts' || loading || !profile"
        :aria-busy="loading"
        aria-labelledby="community-profile-posts-title"
        class="community-profile-posts"
      >
        <header class="community-profile-posts-header">
          <div>
            <h2 id="community-profile-posts-title">
              <v-icon size="20" aria-hidden="true">{{ activeNavigation?.icon }}</v-icon>
              {{ activeNavigation?.label }}
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
            <span v-if="!searchKeyword" class="community-profile-post-count">
              共 {{ fmtUtil.num(Number(profile.achieve.post_num)) }} 篇
            </span>
            <span v-else-if="!loading" class="community-profile-post-count">
              找到 {{ fmtUtil.num(searchTotal) }} 篇
            </span>
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
        <div v-else :key="page" class="community-profile-post-list">
          <article
            v-for="post in currentPosts"
            :key="post.post.post_id"
            class="community-profile-post"
          >
            <div class="community-profile-post-meta">
              <v-icon size="16" aria-hidden="true">mdi-clock-outline</v-icon>
              <time>{{ fmtUtil.dateTime(post.post.created_at * 1000) }}</time>
              <RouterLink
                v-if="post.forum"
                :aria-label="`进入版块：${post.forum.name}`"
                class="community-profile-post-forum"
                :to="`/posts/forum/${post.post.game_id}/${post.forum.id}`"
              >
                <TMiImg
                  v-if="post.forum.icon"
                  :alt="post.forum.name"
                  :ori="true"
                  :src="post.forum.icon"
                />
                {{ post.forum.name }}
              </RouterLink>
            </div>
            <h3 class="community-profile-post-title">
              <button type="button" @click="openPost(post)">
                <TpTitle :text="post.post.subject || '无标题帖子'" />
              </button>
            </h3>
            <div v-if="getPostImages(post).length" class="community-profile-post-images">
              <span
                v-for="(image, index) in getPostImages(post)"
                :key="`${index}:${image}`"
                class="community-profile-post-image"
              >
                <TMiImg :alt="`第 ${index + 1} 张帖子图片`" :src="image" />
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
                <span :title="`浏览 ${post.stat.view_num}`">
                  <v-icon size="16" aria-hidden="true">mdi-eye-outline</v-icon>
                  {{ post.stat.view_num }}
                </span>
                <span :title="`回复 ${post.stat.reply_num}`">
                  <v-icon size="16" aria-hidden="true">mdi-comment-outline</v-icon>
                  {{ post.stat.reply_num }}
                </span>
                <span :title="`点赞 ${post.stat.like_num}`">
                  <v-icon size="16" aria-hidden="true">mdi-thumb-up-outline</v-icon>
                  {{ post.stat.like_num }}
                </span>
              </div>
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
            </footer>
          </article>
        </div>

        <div v-if="pageCount > 1" class="community-profile-pagination">
          <v-pagination
            v-model="page"
            :disabled="loading"
            :length="pageCount"
            :total-visible="5"
            density="compact"
            @update:model-value="handlePageChange"
          />
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
      <CpContent
        v-else-if="currentSection !== 'privacy' && currentSection !== 'edit'"
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
import CpContent from "@comp/communityProfile/cp-content.vue";
import CpSettings from "@comp/communityProfile/cp-settings.vue";
import showSnackbar from "@comp/func/snackbar.js";
import TpTitle from "@comp/viewPost/tp-title.vue";
import TpcTag from "@comp/viewPost/tpc-tag.vue";
import bbsReq from "@req/bbsReq.js";
import communityReq from "@req/communityReq.js";
import postReq from "@req/postReq.js";
import useAppStore from "@store/app.js";
import useUserStore from "@store/user.js";
import { matchesCurrentAccount } from "@utils/bbsReplyAccount.js";
import {
  hasNextProfile,
  hasPreviousProfile,
  recordProfileVisit,
  stepProfileTrail,
} from "@utils/communityProfile.js";
import fmtUtil from "@utils/fmtUtil.js";
import TGHttps from "@utils/TGHttps.js";
import { createPost } from "@utils/TGWindow.js";
import { getUserAvatar } from "@utils/toolFunc.js";
import { storeToRefs } from "pinia";
import { computed, onBeforeUnmount, ref, shallowRef, watch } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";
import type { RouteLocationRaw } from "vue-router";

type ProfileSection =
  | "posts"
  | "comments"
  | "collections"
  | "favorites"
  | "following"
  | "followers"
  | "privacy"
  | "edit";

type NavigationItem = {
  section: ProfileSection;
  label: string;
  icon: string;
};

/**
 * 查看用户资料时的账户与目标用户快照。
 * @since Beta v0.12.6
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

/**
 * 归一化后的帖子分页数据。
 * @since Beta v0.12.6
 */
type PostPage = {
  list: Array<TGApp.BBS.Post.FullData>;
  isLast: boolean;
  nextOffset: string;
  total: number;
};

const router = useRouter();
const route = useRoute();
const { isLogin, incognito } = storeToRefs(useAppStore());
const { cookie, uid, briefInfo } = storeToRefs(useUserStore());
const profileUid = computed<string>(() => {
  const targetUid = route.params.uid;
  return typeof targetUid === "string" ? targetUid.trim() : (uid.value ?? "");
});
const isOwnProfile = computed<boolean>(
  () => profileUid.value !== "" && profileUid.value === uid.value,
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
    items.push(
      { section: "privacy", label: "隐私设置", icon: "mdi-shield-lock-outline" },
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
    case "privacy":
    case "edit":
      return isOwnProfile.value ? section : "posts";
    default:
      return "posts";
  }
});
const activeNavigation = computed<NavigationItem | undefined>(() =>
  navigation.value.find((item) => item.section === currentSection.value),
);

const profile = shallowRef<TGApp.BBS.User.Info>();
const profileAudit = shallowRef<TGApp.BBS.User.InfoRes["audit_info"]>();
const postPages = shallowRef<Array<Array<TGApp.BBS.Post.FullData>>>([]);
const pageOffsets = shallowRef<Array<string>>([]);
const pageLastFlags = shallowRef<Array<boolean>>([]);
const page = ref<number>(1);
const loading = ref<boolean>(false);
const loadError = ref<string>("");
const refreshVersion = ref<number>(0);
const searchInput = ref<string | null>("");
const searchKeyword = ref<string>("");
const searchTotal = ref<number>(0);
const canViewProfile = computed<boolean>(() => {
  const currentUid = uid.value;
  const currentCookie = cookie.value;
  return (
    !incognito.value &&
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
  if (incognito.value) return "无痕浏览已开启，关闭后才能查看个人信息。";
  if (!isLogin.value || !uid.value) return "请先登录米游社账号。";
  return "当前账号凭据不可用，请重新登录米游社账号。";
});
const profileStats = computed<Array<ProfileStat>>(() => {
  const achieve = profile.value?.achieve;
  const format = (value: string | undefined): string =>
    value === undefined ? "-" : fmtUtil.num(Number(value));
  return [
    { label: "获赞", value: format(achieve?.like_num) },
    { label: "发帖", value: format(achieve?.post_num) },
    { label: "回帖", value: format(achieve?.replypost_num) },
    { label: "粉丝", value: format(achieve?.followed_cnt) },
  ];
});
const levelColor = computed<string>(() => {
  if (!profile.value) return "var(--tgc-od-green)";
  const level = profile.value.level_exp.level;
  if (level < 5) return "var(--tgc-od-green)";
  if (level < 9) return "var(--tgc-od-blue)";
  if (level < 13) return "var(--tgc-od-purple)";
  return "var(--tgc-od-orange)";
});
const currentPosts = computed<Array<TGApp.BBS.Post.FullData>>(
  () => postPages.value[page.value - 1] ?? [],
);
const pageCount = computed<number>(() => {
  if (postPages.value.length === 0) return 1;
  const lastPageIndex = postPages.value.length - 1;
  return pageLastFlags.value[lastPageIndex] ? postPages.value.length : postPages.value.length + 1;
});

let requestVersion = 0;
let active = true;

watch(
  [
    isLogin,
    incognito,
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

watch(profileUid, recordProfileVisit, { immediate: true });

watch(currentSection, (section) => {
  if (section === "posts" && profile.value && !loading.value && postPages.value.length === 0) {
    void loadProfile();
  }
});

onBeforeUnmount(() => {
  active = false;
  requestVersion += 1;
});

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
  postPages.value = [postPage.list];
  pageOffsets.value = [postPage.nextOffset];
  pageLastFlags.value = [postPage.isLast];
  searchTotal.value = postPage.total;
}

function resetPostPages(): void {
  postPages.value = [];
  pageOffsets.value = [];
  pageLastFlags.value = [];
  page.value = 1;
  searchTotal.value = 0;
}

function resetProfileData(): void {
  profile.value = undefined;
  profileAudit.value = undefined;
  resetPostPages();
  searchInput.value = "";
  searchKeyword.value = "";
  loadError.value = "";
  loading.value = false;
}

function getAccountSnapshot(): AccountSnapshot | undefined {
  if (!canViewProfile.value || uid.value === undefined || cookie.value === undefined)
    return undefined;
  return { uid: uid.value, profileUid: profileUid.value, cookie: { ...cookie.value } };
}

function isCurrentRequest(version: number, snapshot: AccountSnapshot): boolean {
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

async function loadProfile(): Promise<void> {
  const version = ++requestVersion;
  refreshVersion.value += 1;
  resetProfileData();
  const snapshot = getAccountSnapshot();
  if (snapshot === undefined) return;
  if (!/^[1-9]\d*$/.test(snapshot.profileUid)) {
    loadError.value = "用户 ID 无效。";
    return;
  }
  loading.value = true;
  try {
    const userResponse =
      snapshot.profileUid === snapshot.uid
        ? await bbsReq.userInfo(snapshot.cookie)
        : await bbsReq.otherUserInfo("2", snapshot.profileUid);
    if (!isCurrentRequest(version, snapshot)) return;
    if (userResponse.retcode !== 0) {
      throw new Error(`[${userResponse.retcode}] ${userResponse.message}`);
    }
    if (userResponse.data.user_info.uid !== snapshot.profileUid) {
      throw new Error("用户信息与当前查看的用户不一致");
    }
    profile.value = userResponse.data.user_info;
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
  resetPostPages();
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
    void loadProfile();
  }
}

function handleSettingsSaved(warning?: string): void {
  if (warning) {
    showSnackbar.warn(warning);
  } else {
    showSnackbar.success(currentSection.value === "privacy" ? "隐私设置已保存" : "资料已提交保存");
  }
  void loadProfile();
}

async function handlePageChange(nextPage: number): Promise<void> {
  const loadedPageCount = postPages.value.length;
  if (nextPage <= loadedPageCount) {
    loadError.value = "";
    return;
  }
  if (nextPage !== loadedPageCount + 1) {
    page.value = loadedPageCount;
    return;
  }
  const snapshot = getAccountSnapshot();
  const offset = pageOffsets.value[loadedPageCount - 1];
  if (snapshot === undefined || offset === undefined || offset.trim() === "") {
    page.value = loadedPageCount;
    loadError.value = "帖子分页游标无效，请重新加载。";
    return;
  }
  const version = requestVersion;
  loading.value = true;
  loadError.value = "";
  try {
    const postPage = await fetchPostPage(snapshot, searchKeyword.value, offset);
    if (!isCurrentRequest(version, snapshot)) return;
    postPages.value = [...postPages.value, postPage.list];
    pageOffsets.value = [...pageOffsets.value, postPage.nextOffset];
    pageLastFlags.value = [...pageLastFlags.value, postPage.isLast];
  } catch (cause) {
    if (isCurrentRequest(version, snapshot)) {
      page.value = loadedPageCount;
      loadError.value = TGHttps.getErrMsg(cause);
    }
  } finally {
    if (isCurrentRequest(version, snapshot)) loading.value = false;
  }
}

function isEditablePost(post: TGApp.BBS.Post.FullData): boolean {
  return (
    isOwnProfile.value &&
    canViewProfile.value &&
    post.post.uid === uid.value &&
    (post.post.view_type === 1 || post.post.view_type === 2)
  );
}

function getPostImages(post: TGApp.BBS.Post.FullData): Array<string> {
  if (post.post.images.length) return post.post.images.slice(0, 3);
  const cover = post.cover?.url || post.post.cover;
  return cover ? [cover] : [];
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
  padding: 16px 24px 32px;
  margin: 0 auto;
  color: var(--app-page-content);
  font-size: 14px;
  line-height: 20px;
}

.community-profile-header {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  padding: 24px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--box-bg-1);
  gap: 24px;
}

.community-profile-identity {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 16px;
}

.community-profile-intro {
  min-width: 0;
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
  flex-shrink: 0;
  padding: 2px 6px;
  border-radius: 4px;
  background: v-bind(levelColor); /* stylelint-disable-line value-keyword-case */
  color: var(--tgc-white-1);
  font-size: 12px;
  line-height: 16px;
  white-space: nowrap;
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
  margin: 8px 0 0;
  color: var(--app-page-content);
  font-size: 14px;
  overflow-wrap: anywhere;
}

.community-profile-stats {
  display: grid;
  min-width: 240px;
  gap: 12px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
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
  margin-top: 16px;
  gap: 16px;
  grid-template-columns: 180px minmax(0, 1fr);
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
  max-height: 100%;
  align-self: start;
  overflow-y: auto;
}

.community-profile-sidebar-header {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  margin-bottom: 12px;
  gap: 4px;

  h2 {
    margin: 0;
    color: var(--common-text-title);
    font-family: var(--font-title);
    font-size: 16px;
    font-weight: normal;
  }
}

.community-profile-sidebar-actions {
  display: flex;
  align-items: center;
  gap: 4px;

  & > :last-child {
    margin-left: auto;
  }
}

.community-profile-nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.community-profile-nav-item {
  display: flex;
  align-items: center;
  padding: 8px;
  border-radius: 4px;
  color: var(--box-text-2);
  gap: 8px;
  text-decoration: none;

  &:hover,
  &.is-active {
    background: var(--box-bg-2);
    color: var(--common-text-title);
  }

  &:focus-visible {
    outline: 2px solid var(--common-text-title);
    outline-offset: 2px;
  }
}

.community-profile-posts {
  display: flex;
  overflow: hidden;
  min-height: 0;
  flex-direction: column;
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
  margin-bottom: 16px;
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
    margin: 4px 0 0;
    color: var(--box-text-4);
    font-size: 12px;
  }
}

.community-profile-posts-actions {
  display: flex;
  min-width: 0;
  align-items: center;
  margin-left: auto;
  gap: 12px;
}

.community-profile-search {
  width: 240px;
  max-width: 100%;
  flex: 0 1 auto;
}

.community-profile-post-count {
  flex-shrink: 0;
  color: var(--box-text-4);
  font-size: 12px;
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
  transition: background-color 120ms ease;

  &:hover {
    background: var(--box-bg-2);
  }
}

.community-profile-post-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  color: var(--box-text-4);
  font-size: 12px;
  gap: 8px;
}

.community-profile-post-forum {
  position: relative;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--box-bg-2);
  color: var(--box-text-5);
  gap: 4px;
  text-decoration: none;

  :deep(img) {
    width: 16px;
    height: 16px;
    border-radius: 4px;
  }

  &:hover {
    background: var(--box-bg-3);
  }

  &:focus-visible {
    outline: 2px solid var(--common-text-title);
    outline-offset: 2px;
  }
}

.community-profile-post-title {
  margin: 12px 0 0;
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
  width: 100%;
  max-width: 520px;
  padding: 0;
  border: 0;
  margin-top: 12px;
  background: transparent;
  cursor: pointer;
  gap: 8px;
  text-align: left;
}

.community-profile-post-image {
  display: grid;
  overflow: hidden;
  width: min(30%, 160px);
  height: auto;
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

.community-profile-post-topics {
  display: flex;
  flex-wrap: wrap;
  margin-top: 12px;
  font-size: 12px;
  gap: 8px 16px;
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
  justify-content: space-between;
  margin-top: 16px;
  gap: 16px;
}

.community-profile-post-stats {
  display: flex;
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
  margin-left: auto;
  color: var(--common-text-title);
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

.community-profile-pagination {
  display: flex;
  flex-shrink: 0;
  justify-content: center;
  padding-top: 16px;
}

@media (width <= 900px) {
  .community-profile-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .community-profile-stats {
    width: 100%;
    min-width: 0;
  }
}

@media (width <= 640px) {
  .community-profile {
    padding: 8px 0 16px;
  }

  .community-profile-header,
  .community-profile-sidebar,
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
    flex-direction: row;
    overflow-x: auto;
  }

  .community-profile-nav-item {
    flex-shrink: 0;
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
