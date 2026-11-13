<template>
  <section
    :aria-busy="loading"
    aria-labelledby="community-profile-posts-title"
    class="community-profile-posts"
  >
    <header class="community-profile-posts-header">
      <div class="community-profile-posts-heading">
        <h2 id="community-profile-posts-title">
          <v-icon size="20" aria-hidden="true">mdi-post-outline</v-icon>
          {{ isOwnProfile ? "我的发帖" : "TA 的发帖" }}
          <span v-if="profile && (!searchKeyword || !loading)" class="community-profile-post-count">
            {{
              searchKeyword
                ? fmtUtil.num(searchTotal)
                : fmtUtil.num(Number(profile.achieve.post_num))
            }}
          </span>
        </h2>
        <p>
          {{
            isOwnProfile
              ? "当前账号在米游社发布的帖子，可打开查看或编辑"
              : "TA 在米游社发布的帖子，点击可打开查看"
          }}
        </p>
      </div>
      <div v-if="profile" class="community-profile-posts-actions">
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
        {{ profile ? (searchKeyword ? "正在搜索帖子…" : "正在加载帖子…") : "正在加载个人信息…" }}
      </p>
    </div>
    <div v-else-if="loadError" aria-live="assertive" class="community-profile-state" role="alert">
      <v-icon size="32">mdi-alert-circle-outline</v-icon>
      <p>{{ loadError }}</p>
      <v-btn variant="tonal" @click="retryPosts">重新加载</v-btn>
    </div>
    <div
      v-else-if="posts.length === 0 && searchKeyword"
      class="community-profile-state"
      role="status"
    >
      <v-icon size="32">mdi-text-search-variant</v-icon>
      <p>未找到与“{{ searchKeyword }}”相关的帖子</p>
      <span>换个关键词试试</span>
    </div>
    <div v-else-if="posts.length === 0" class="community-profile-state" role="status">
      <v-icon size="32">mdi-post-off</v-icon>
      <p>{{ isOwnProfile ? "暂未发布帖子" : "暂无公开帖子" }}</p>
      <span>{{ isOwnProfile ? "发布后可在这里查看和编辑" : "用户的公开帖子会在这里展示" }}</span>
    </div>
    <div v-else class="community-profile-post-list">
      <VVirtualScroll :items="posts" itemKey="post.post_id" renderless>
        <template #default="{ item: post, index, itemRef }">
          <div
            :ref="itemRef"
            :class="{ 'community-profile-post-row--spaced': index < posts.length - 1 }"
          >
            <CpPost :game="getPostGame(post)" :post :showAuthor="false" @open-post="openPost">
              <template v-if="isEditablePost(post) || isDeletablePost(post)" #actions>
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
              </template>
            </CpPost>
          </div>
        </template>
      </VVirtualScroll>
      <footer v-if="posts.length" class="community-profile-post-list-footer">
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
</template>

<script lang="ts" setup>
import CpPost from "@comp/comiProf/cp-post.vue";
import showDialog from "@comp/func/dialog.js";
import showSnackbar from "@comp/func/snackbar.js";
import { useCommunityProfile } from "@hooks/useCommunityProfile.js";
import { createCommunityProfilePostsController } from "@hooks/useCommunityProfilePosts.js";
import communityReq from "@req/communityReq.js";
import postEditReq from "@req/postEditReq.js";
import postReq from "@req/postReq.js";
import useAppStore from "@store/app.js";
import useUserStore from "@store/user.js";
import { createPost } from "@utils/app/TGWindow.js";
import { executeReplyForCurrentAccount, matchesCurrentAccount } from "@utils/bbs/replyAccount.js";
import fmtUtil from "@utils/display/fmtUtil.js";
import TGHttps from "@utils/network/TGHttps.js";
import { storeToRefs } from "pinia";
import { nextTick, onBeforeUnmount, ref, useTemplateRef, watch } from "vue";
import { useRouter } from "vue-router";
import { VVirtualScroll } from "vuetify/components/VVirtualScroll";

/**
 * 查看用户资料时的账户与目标用户快照。
 * @since Beta v0.13.1
 */
type AccountSnapshot = {
  uid: string;
  profileUid: string;
  cookie: TGApp.App.Account.Cookie;
};

const router = useRouter();
const profileContext = useCommunityProfile();
const { profileUid, isOwnProfile, canViewProfile, profile, gameOptions, adjustPostCount } =
  profileContext;
const { isLogin } = storeToRefs(useAppStore());
const { cookie, uid } = storeToRefs(useUserStore());

const postsController = createCommunityProfilePostsController<AccountSnapshot>({
  getSnapshot: getAccountSnapshot,
  isCurrentSnapshot: isCurrentAccount,
  fetchPage: fetchPostPage,
  getErrorMessage: (cause: unknown): string => TGHttps.getErrMsg(cause),
});
const {
  posts,
  isLast,
  loading,
  loadingMore,
  loadMoreError,
  loadError,
  searchKeyword,
  searchTotal,
} = postsController;
const deletingPostId = ref<string>("");
const searchInput = ref<string | null>("");
const postsLoadMoreRef = useTemplateRef<HTMLElement>("postsLoadMoreRef");
let postsLoadMoreObserver: IntersectionObserver | undefined;
let initializedContextKey = "";

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
  () => {
    initializedContextKey = "";
    resetPostData();
    if (profile.value !== undefined) {
      initializedContextKey = getContextKey();
      void postsController.loadInitial();
    }
  },
  { immediate: true },
);

watch(profile, (value) => {
  if (value === undefined || initializedContextKey === getContextKey()) return;
  initializedContextKey = getContextKey();
  void postsController.loadInitial();
});

watch([loading, loadingMore, isLast, () => posts.value.length, loadMoreError], () => {
  postsLoadMoreObserver?.disconnect();
  if (loading.value || loadingMore.value || isLast.value || loadMoreError.value !== "") return;
  void nextTick(observePostsLoadMore);
});

onBeforeUnmount(() => {
  postsController.dispose();
  postsLoadMoreObserver?.disconnect();
});

function getContextKey(): string {
  return [
    isLogin.value ? "1" : "0",
    uid.value ?? "",
    profileUid.value,
    cookie.value?.account_id ?? "",
    cookie.value?.cookie_token ?? "",
    cookie.value?.ltuid ?? "",
    cookie.value?.ltoken ?? "",
  ].join("\u001f");
}

function getAccountSnapshot(): AccountSnapshot | undefined {
  if (!canViewProfile.value || uid.value === undefined || cookie.value === undefined)
    return undefined;
  return { uid: uid.value, profileUid: profileUid.value, cookie: { ...cookie.value } };
}

function isCurrentAccount(snapshot: AccountSnapshot): boolean {
  const currentCookie = cookie.value;
  return (
    canViewProfile.value &&
    uid.value === snapshot.uid &&
    profileUid.value === snapshot.profileUid &&
    currentCookie?.account_id === snapshot.cookie.account_id &&
    currentCookie?.cookie_token === snapshot.cookie.cookie_token &&
    currentCookie?.ltuid === snapshot.cookie.ltuid &&
    currentCookie?.ltoken === snapshot.cookie.ltoken
  );
}

function resetPostData(): void {
  postsController.reset();
  searchInput.value = "";
  deletingPostId.value = "";
}

async function fetchPostPage(
  snapshot: AccountSnapshot,
  keyword: string,
  offset?: string,
): Promise<TGApp.BBS.Profile.PostPage> {
  let postPage: TGApp.BBS.Profile.PostPage;
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
  if (!postPage.isLast && postPage.nextOffset.trim() === "") throw new Error("帖子分页游标无效");
  return postPage;
}

function searchPosts(input: string | null): void {
  void postsController.search(input);
}

function clearSearch(): void {
  if (searchKeyword.value !== "") void searchPosts("");
}

function retryPosts(): void {
  if (profile.value === undefined) {
    void profileContext.refreshProfile();
    return;
  }
  void searchPosts(searchKeyword.value);
}

function loadMorePosts(): void {
  void postsController.loadMore();
}

function observePostsLoadMore(): void {
  const target = postsLoadMoreRef.value;
  if (
    target === null ||
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
  adjustPostCount(-1);
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
  const version = postsController.getVersion();
  deletingPostId.value = postId;
  try {
    const confirmed = await showDialog.checkF({
      cancelLabel: "取消",
      confirmLabel: "删除",
      text: `确定删除“${subject}”（ID：${postId}）吗？此操作不可撤销。`,
      title: "删除帖子",
    });
    if (!confirmed) return;
    if (!postsController.isCurrent(version, snapshot) || !matchesCurrentAccount(account)) {
      showSnackbar.warn("登录账号或页面状态已变化，请重新操作");
      return;
    }
    const latest = await postReq.post(postId, requestCookie);
    if (!postsController.isCurrent(version, snapshot) || !matchesCurrentAccount(account)) return;
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
    if (!postsController.isCurrent(version, snapshot)) return;
    removePostFromList(postId);
    showSnackbar.success("帖子已删除");
  } catch (cause) {
    if (!postsController.isCurrent(version, snapshot)) return;
    showSnackbar.error(`删除帖子失败：${TGHttps.getErrMsg(cause)}`);
  } finally {
    deletingPostId.value = "";
  }
}

function getPostGame(post: TGApp.BBS.Post.FullData): TGApp.BBS.Profile.GameOption | undefined {
  return gameOptions.value.find((game) => game.id === post.post.game_id);
}

async function openPost(postId: string, title: string): Promise<void> {
  await createPost(postId, title);
}

async function editPost(post: TGApp.BBS.Post.FullData): Promise<void> {
  if (!isEditablePost(post)) return;
  await router.push(`/community/profile/posts/${post.post.post_id}/edit`);
}
</script>

<style lang="scss" scoped>
.community-profile-posts {
  display: flex;
  overflow: hidden;
  min-width: 0;
  min-height: 0;
  flex-direction: column;
  padding: 16px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--app-page-bg);
  gap: 16px;
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
  position: relative;
  min-height: 0;
  flex: 1 1 auto;
  padding: 4px;
  overflow-y: auto;
  scrollbar-gutter: stable;
}

.community-profile-post-row--spaced {
  padding-bottom: 12px;
}

.community-profile-post-list-footer {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  padding: 4px 0;
  margin-top: 12px;
  color: var(--box-text-4);
  font-size: 12px;
  gap: 8px;
}

.community-profile-load-more-trigger {
  width: 100%;
  height: 1px;
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

@media (width <= 640px) {
  .community-profile-posts {
    flex: 1 1 auto;
    padding: 16px;
  }

  .community-profile-post-list {
    padding: 2px;
  }

  .community-profile-post-row--spaced {
    padding-bottom: 8px;
  }

  .community-profile-post-list-footer {
    margin-top: 8px;
  }

  .community-profile-posts-header {
    align-items: flex-start;
  }
}
</style>
