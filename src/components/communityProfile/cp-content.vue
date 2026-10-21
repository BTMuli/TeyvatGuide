<template>
  <section
    :aria-busy="loading || collectionLoading"
    aria-labelledby="cp-content-title"
    class="cp-content"
  >
    <header class="cp-content-header">
      <div class="cp-content-heading">
        <h2 id="cp-content-title">
          <v-icon size="20" aria-hidden="true">{{ sectionInfo.icon }}</v-icon>
          {{ selectedCollection?.title || sectionInfo.title }}
        </h2>
        <p>{{ selectedCollection ? selectedCollection.desc : sectionInfo.description }}</p>
      </div>
      <v-btn
        v-if="selectedCollection"
        prepend-icon="mdi-arrow-left"
        size="small"
        variant="text"
        @click="closeCollection"
        >返回合集</v-btn
      >
      <span v-else-if="searchKeyword" class="cp-content-count">
        {{
          loading
            ? `已读取 ${fmtUtil.num(scannedCount)} 篇`
            : `找到 ${fmtUtil.num(entries.length)} 篇`
        }}
      </span>
      <span v-else class="cp-content-count">已加载 {{ entries.length }} 条</span>
    </header>

    <div
      v-if="selectedCollection && !collectionLoading && !collectionError && collectionPosts.length"
      class="cp-content-toolbar"
    >
      <span class="cp-content-count">
        {{
          collectionKeyword
            ? `找到 ${fmtUtil.num(filteredCollectionPosts.length)} 篇`
            : `共 ${fmtUtil.num(collectionPosts.length)} 篇`
        }}
      </span>
      <v-text-field
        v-model="collectionSearchInput"
        :clearable="true"
        :hide-details="true"
        append-inner-icon="mdi-magnify"
        aria-label="搜索合集帖子"
        autocomplete="off"
        class="cp-content-search"
        density="compact"
        placeholder="搜索合集帖子"
        variant="outlined"
        @click:append-inner="searchCollection(collectionSearchInput)"
        @click:clear="collectionKeyword = ''"
        @keyup.enter="searchCollection(collectionSearchInput)"
      />
    </div>
    <div v-else-if="section === 'favorites' && !selectedCollection" class="cp-content-toolbar">
      <v-tabs
        v-model="favoriteTab"
        aria-label="收藏内容类型"
        class="cp-favorite-tabs"
        color="var(--common-text-title)"
        density="compact"
      >
        <v-tab value="posts">帖子</v-tab>
        <v-tab value="collections">合集</v-tab>
      </v-tabs>
      <v-text-field
        v-if="favoriteTab === 'posts'"
        v-model="searchInput"
        :clearable="true"
        :hide-details="true"
        append-inner-icon="mdi-magnify"
        aria-label="搜索收藏帖子"
        autocomplete="off"
        class="cp-content-search"
        density="compact"
        placeholder="搜索收藏帖子"
        variant="outlined"
        @click:append-inner="searchFavorites(searchInput)"
        @click:clear="clearSearch"
        @keyup.enter="searchFavorites(searchInput)"
      />
    </div>

    <div v-if="selectedCollection" class="cp-content-body">
      <div v-if="collectionLoading" class="cp-content-state" role="status" aria-live="polite">
        <v-progress-circular indeterminate size="28" />
        <p>正在加载合集帖子…</p>
      </div>
      <div v-else-if="collectionError" class="cp-content-state" role="alert">
        <v-icon size="32">mdi-alert-circle-outline</v-icon>
        <p>{{ collectionError }}</p>
        <v-btn variant="tonal" @click="loadCollection(selectedCollection)">重新加载</v-btn>
      </div>
      <div v-else-if="collectionPosts.length === 0" class="cp-content-state" role="status">
        <v-icon size="32">mdi-folder-open-outline</v-icon>
        <p>这个合集还没有帖子</p>
      </div>
      <div v-else-if="filteredCollectionPosts.length === 0" class="cp-content-state" role="status">
        <v-icon size="32">mdi-text-search-variant</v-icon>
        <p>未找到与“{{ collectionKeyword }}”相关的合集帖子</p>
      </div>
      <div v-else class="cp-collection-posts">
        <CpPost
          v-for="post in filteredCollectionPosts"
          :key="post.post.post_id"
          :post
          @open-post="openPost"
          @open-profile="openProfile"
        />
      </div>
    </div>
    <div v-else class="cp-content-body">
      <div v-if="error" class="cp-content-state cp-content-error" role="alert">
        <v-icon size="28">mdi-alert-circle-outline</v-icon>
        <p>{{ error }}</p>
        <v-btn :disabled="loading" variant="tonal" @click="retry">重新加载</v-btn>
      </div>
      <div v-if="entries.length" class="cp-entry-list">
        <template v-for="entry in entries" :key="`${entry.kind}:${entry.id}`">
          <CpComment
            v-if="entry.kind === 'comment'"
            :comment="entry.comment"
            @open-post="openPost"
          />
          <CpUser
            v-else-if="entry.kind === 'user'"
            :relation="entry.relation"
            @open-profile="openProfile"
          />
          <CpPost
            v-else-if="entry.kind === 'post'"
            :post="entry.post"
            :viewedAt="entry.viewedAt"
            @open-post="openPost"
            @open-profile="openProfile"
          />
          <button
            v-else
            class="cp-entry cp-entry-button"
            type="button"
            @click="loadCollection(entry.collection)"
          >
            <span v-if="entry.collection.cover" class="cp-entry-image">
              <TMiImg :src="entry.collection.cover" alt="合集封面" />
            </span>
            <span class="cp-entry-content">
              <span class="cp-entry-title"><TpTitle :text="entry.collection.title" /></span>
              <span v-if="entry.collection.desc" class="cp-entry-description">{{
                entry.collection.desc
              }}</span>
              <span class="cp-entry-meta"
                >{{ fmtUtil.num(entry.collection.post_num) }} 篇帖子 ·
                {{ fmtUtil.num(entry.collection.view_num) }} 次浏览</span
              >
            </span>
            <v-icon size="18" aria-hidden="true">mdi-chevron-right</v-icon>
          </button>
        </template>
      </div>
      <div v-else-if="!loading && !error && searchKeyword" class="cp-content-state" role="status">
        <v-icon size="32">mdi-text-search-variant</v-icon>
        <p>未找到与“{{ searchKeyword }}”相关的收藏帖子</p>
      </div>
      <div v-else-if="!loading && !error" class="cp-content-state" role="status">
        <v-icon size="32">{{ sectionInfo.icon }}</v-icon>
        <p>{{ sectionInfo.empty }}</p>
      </div>
      <div v-if="loading" class="cp-content-state" role="status" aria-live="polite">
        <v-progress-circular indeterminate size="28" />
        <p>{{ searchKeyword ? "正在搜索收藏帖子…" : `正在加载${sectionInfo.title}…` }}</p>
      </div>
      <footer
        v-if="entries.length && !loading && !error && !searchKeyword"
        class="cp-content-footer"
      >
        <span v-if="isLast">已全部加载</span>
        <v-btn v-else variant="tonal" @click="loadMore">加载更多</v-btn>
      </footer>
    </div>
  </section>
</template>

<script lang="ts" setup>
import TMiImg from "@comp/app/t-mi-img.vue";
import CpComment from "@comp/communityProfile/cp-comment.vue";
import CpPost from "@comp/communityProfile/cp-post.vue";
import CpUser from "@comp/communityProfile/cp-user.vue";
import showSnackbar from "@comp/func/snackbar.js";
import TpTitle from "@comp/viewPost/tp-title.vue";
import communityReq from "@req/communityReq.js";
import postReq from "@req/postReq.js";
import useAppStore from "@store/app.js";
import useUserStore from "@store/user.js";
import { matchesPostKeyword, openCommunityProfile } from "@utils/communityProfile.js";
import fmtUtil from "@utils/fmtUtil.js";
import TGHttps from "@utils/TGHttps.js";
import { createPost } from "@utils/TGWindow.js";
import { storeToRefs } from "pinia";
import { computed, onBeforeUnmount, ref, shallowRef, watch } from "vue";

type ContentSection =
  "comments" | "collections" | "favorites" | "following" | "followers" | "history";
type FavoriteTab = "posts" | "collections";
type SectionInfo = { title: string; description: string; icon: string; empty: string };
type ContentEntry =
  | { kind: "comment"; id: string; comment: TGApp.BBS.Community.Comment }
  | { kind: "user"; id: string; relation: TGApp.BBS.Community.UserRelation }
  | { kind: "post"; id: string; post: TGApp.BBS.Post.FullData; viewedAt?: number }
  | { kind: "collection"; id: string; collection: TGApp.BBS.Collection.Collection };
/**
 * 内容列表的登录账户和目标用户快照。
 * @since Beta v0.12.6
 */
type AccountSnapshot = { uid: string; profileUid: string; cookie: TGApp.App.Account.Cookie };
type ContentPage = { entries: Array<ContentEntry>; offset: string; isLast: boolean };

const { section, profileUid } = defineProps<{ section: ContentSection; profileUid?: string }>();
const favoriteTab = ref<FavoriteTab>("posts");
const { isLogin } = storeToRefs(useAppStore());
const { uid, cookie } = storeToRefs(useUserStore());

function getTargetUid(loginUid: string): string {
  return profileUid?.trim() || loginUid;
}

const isViewingOtherProfile = computed<boolean>(() => {
  const loginUid = uid.value?.trim() ?? "";
  return loginUid !== "" && getTargetUid(loginUid) !== loginUid;
});
const sectionInfo = computed<SectionInfo>(
  () =>
    ({
      comments: {
        title: isViewingOtherProfile.value ? "TA的评论" : "我的评论",
        description: isViewingOtherProfile.value
          ? "查看 TA 发表的评论，点击可打开原帖"
          : "查看自己发表的评论，点击可打开原帖",
        icon: "mdi-comment-text-outline",
        empty: isViewingOtherProfile.value ? "TA暂未发表评论" : "暂未发表评论",
      },
      collections: {
        title: isViewingOtherProfile.value ? "TA的合集" : "我的合集",
        description: isViewingOtherProfile.value
          ? "查看 TA 创建的合集和合集内的帖子"
          : "查看自己创建的合集和合集内的帖子",
        icon: "mdi-folder-outline",
        empty: isViewingOtherProfile.value ? "TA暂未创建合集" : "暂未创建合集",
      },
      favorites: {
        title: isViewingOtherProfile.value ? "TA的收藏" : "我的收藏",
        description: isViewingOtherProfile.value
          ? "查看 TA 在米游社收藏的内容"
          : "查看你在米游社收藏的内容",
        icon: "mdi-star-outline",
        empty:
          favoriteTab.value === "collections"
            ? isViewingOtherProfile.value
              ? "TA暂未收藏合集"
              : "暂未收藏合集"
            : isViewingOtherProfile.value
              ? "TA暂未收藏帖子"
              : "暂未收藏帖子",
      },
      following: {
        title: isViewingOtherProfile.value ? "TA的关注" : "我的关注",
        description: isViewingOtherProfile.value
          ? "TA 关注的用户，点击可查看用户信息"
          : "你关注的用户，点击可查看用户信息",
        icon: "mdi-heart-outline",
        empty: isViewingOtherProfile.value ? "TA暂未关注用户" : "暂未关注用户",
      },
      followers: {
        title: isViewingOtherProfile.value ? "TA的粉丝" : "我的粉丝",
        description: isViewingOtherProfile.value
          ? "关注 TA 的用户，点击可查看用户信息"
          : "关注你的用户，点击可查看用户信息",
        icon: "mdi-account-multiple-outline",
        empty: isViewingOtherProfile.value ? "TA暂无粉丝" : "暂无粉丝",
      },
      history: {
        title: "浏览历史",
        description: "查看你在米游社浏览过的帖子，点击可打开原帖",
        icon: "mdi-history",
        empty: "暂无浏览记录",
      },
    })[section],
);
const entries = shallowRef<Array<ContentEntry>>([]);
const loading = ref<boolean>(false);
const error = ref<string>("");
const offset = ref<string>("");
const isLast = ref<boolean>(false);
const selectedCollection = shallowRef<TGApp.BBS.Collection.Collection>();
const collectionPosts = shallowRef<Array<TGApp.BBS.Post.FullData>>([]);
const collectionLoading = ref<boolean>(false);
const collectionError = ref<string>("");
const collectionSearchInput = ref<string | null>("");
const collectionKeyword = ref<string>("");
const filteredCollectionPosts = computed<Array<TGApp.BBS.Post.FullData>>(() => {
  const keyword = collectionKeyword.value;
  if (keyword === "") return collectionPosts.value;
  return collectionPosts.value.filter((post) => matchesPostKeyword(post, keyword));
});
const searchInput = ref<string | null>("");
const searchKeyword = ref<string>("");
const scannedCount = ref<number>(0);
let favoriteCache: Array<TGApp.BBS.Post.FullData> | undefined;
let generation = 0;
let collectionGeneration = 0;
let active = true;

watch(
  [
    () => section,
    () => profileUid,
    favoriteTab,
    isLogin,
    uid,
    () => cookie.value?.account_id,
    () => cookie.value?.cookie_token,
    () => cookie.value?.ltuid,
    () => cookie.value?.ltoken,
    () => cookie.value?.stoken,
  ],
  () => {
    generation += 1;
    favoriteCache = undefined;
    searchInput.value = "";
    searchKeyword.value = "";
    resetEntries();
    closeCollection();
    void loadMore();
  },
  { immediate: true },
);
onBeforeUnmount(() => {
  active = false;
  generation += 1;
  collectionGeneration += 1;
});

function resetEntries(): void {
  entries.value = [];
  offset.value = "";
  isLast.value = false;
  loading.value = false;
  error.value = "";
}

function getSnapshot(): AccountSnapshot | undefined {
  const loginUid = uid.value?.trim() ?? "";
  if (
    !isLogin.value ||
    !loginUid ||
    !cookie.value ||
    cookie.value.ltuid !== loginUid ||
    !cookie.value.cookie_token.trim() ||
    !cookie.value.account_id.trim() ||
    !cookie.value.ltoken.trim()
  )
    return undefined;
  return { uid: loginUid, profileUid: getTargetUid(loginUid), cookie: { ...cookie.value } };
}

function isCurrent(snapshot: AccountSnapshot, version: number): boolean {
  const current = getSnapshot();
  return (
    active &&
    generation === version &&
    current?.uid === snapshot.uid &&
    current.profileUid === snapshot.profileUid &&
    current.cookie.account_id === snapshot.cookie.account_id &&
    current.cookie.cookie_token === snapshot.cookie.cookie_token &&
    current.cookie.ltuid === snapshot.cookie.ltuid &&
    current.cookie.ltoken === snapshot.cookie.ltoken
  );
}

async function loadMore(): Promise<void> {
  if (loading.value || isLast.value) return;
  const snapshot = getSnapshot();
  if (!snapshot) return;
  const version = generation;
  loading.value = true;
  error.value = "";
  try {
    const result = await loadEntries(snapshot, offset.value);
    if (!isCurrent(snapshot, version)) return;
    if (!result.isLast && (!result.offset.trim() || result.offset === offset.value))
      throw new Error("分页游标无效，请刷新后重试。");
    const ids = new Set(entries.value.map((entry) => entry.id));
    entries.value = [
      ...entries.value,
      ...result.entries.filter((entry) => {
        if (ids.has(entry.id)) return false;
        ids.add(entry.id);
        return true;
      }),
    ];
    offset.value = result.offset;
    isLast.value = result.isLast;
  } catch (cause) {
    if (isCurrent(snapshot, version)) error.value = TGHttps.getErrMsg(cause);
  } finally {
    if (isCurrent(snapshot, version)) loading.value = false;
  }
}

async function loadAllFavorites(
  snapshot: AccountSnapshot,
  version: number,
): Promise<Array<TGApp.BBS.Post.FullData> | undefined> {
  const posts: Array<TGApp.BBS.Post.FullData> = [];
  const ids = new Set<string>();
  let cursor = "";
  let last = false;
  scannedCount.value = 0;
  while (!last) {
    const response = await communityReq.favorites(snapshot.cookie, snapshot.profileUid, cursor);
    if (!isCurrent(snapshot, version)) return undefined;
    if (response.retcode !== 0) throw new Error(`[${response.retcode}] ${response.message}`);
    for (const post of response.data.list) {
      if (ids.has(post.post.post_id)) continue;
      ids.add(post.post.post_id);
      posts.push(post);
    }
    scannedCount.value = posts.length;
    const next = response.data.next_offset ?? "";
    last = response.data.is_last;
    if (!last && (!next.trim() || next === cursor)) throw new Error("分页游标无效，请刷新后重试。");
    cursor = next;
  }
  return posts;
}

async function searchFavorites(input: string | null): Promise<void> {
  const keyword = (input ?? "").trim();
  if (keyword === "") {
    clearSearch();
    return;
  }
  const snapshot = getSnapshot();
  if (!snapshot) return;
  const version = ++generation;
  resetEntries();
  searchKeyword.value = keyword;
  isLast.value = true;
  loading.value = true;
  try {
    const posts = favoriteCache ?? (await loadAllFavorites(snapshot, version));
    if (posts === undefined || !isCurrent(snapshot, version)) return;
    favoriteCache = posts;
    entries.value = posts
      .filter((post) => matchesPostKeyword(post, keyword))
      .map((post) => ({ kind: "post", id: post.post.post_id, post }));
  } catch (cause) {
    if (isCurrent(snapshot, version)) error.value = TGHttps.getErrMsg(cause);
  } finally {
    if (isCurrent(snapshot, version)) loading.value = false;
  }
}

function clearSearch(): void {
  if (searchKeyword.value === "") return;
  generation += 1;
  searchKeyword.value = "";
  resetEntries();
  void loadMore();
}

function retry(): void {
  if (searchKeyword.value) void searchFavorites(searchKeyword.value);
  else void loadMore();
}

async function loadEntries(snapshot: AccountSnapshot, cursor: string): Promise<ContentPage> {
  if (section === "comments") {
    const response = await communityReq.comments(snapshot.cookie, snapshot.profileUid, cursor);
    if (response.retcode !== 0) throw new Error(`[${response.retcode}] ${response.message}`);
    return {
      entries: response.data.list.map((item) => ({
        kind: "comment",
        id: item.reply.reply_id,
        comment: item,
      })),
      offset: response.data.next_offset ?? "",
      isLast: response.data.is_last,
    };
  }
  if (
    section === "collections" ||
    (section === "favorites" && favoriteTab.value === "collections")
  ) {
    const response =
      section === "collections"
        ? await communityReq.collections(snapshot.cookie, snapshot.profileUid, cursor)
        : await communityReq.favoriteCollections(snapshot.cookie, snapshot.profileUid, cursor);
    if (response.retcode !== 0) throw new Error(`[${response.retcode}] ${response.message}`);
    return {
      entries: response.data.list.map((item) => ({
        kind: "collection",
        id: String(item.id),
        collection: item,
      })),
      offset: response.data.next_offset ?? "",
      isLast: response.data.is_last,
    };
  }
  if (section === "favorites") {
    const response = await communityReq.favorites(snapshot.cookie, snapshot.profileUid, cursor);
    if (response.retcode !== 0) throw new Error(`[${response.retcode}] ${response.message}`);
    return {
      entries: response.data.list.map((post) => ({ kind: "post", id: post.post.post_id, post })),
      offset: response.data.next_offset ?? "",
      isLast: response.data.is_last,
    };
  }
  if (section === "history") {
    if (!snapshot.cookie.stoken.trim() || !snapshot.cookie.mid.trim())
      throw new Error("当前账号缺少 SToken，请重新登录后再查看浏览历史。");
    const response = await communityReq.history(snapshot.cookie, cursor);
    if (response.retcode !== 0) throw new Error(`[${response.retcode}] ${response.message}`);
    return {
      entries: response.data.list.flatMap<ContentEntry>((item) =>
        item.post && !item.is_deleted
          ? [
              {
                kind: "post",
                id: item.post.post.post_id,
                post: item.post,
                viewedAt: Number(item.view_at) || undefined,
              },
            ]
          : [],
      ),
      offset: String(response.data.next_offset ?? ""),
      isLast: response.data.is_last,
    };
  }
  const response = await communityReq[section](snapshot.cookie, snapshot.profileUid, cursor);
  if (response.retcode !== 0) throw new Error(`[${response.retcode}] ${response.message}`);
  return {
    entries: response.data.result.map((relation) => ({
      kind: "user",
      id: relation.user.uid,
      relation,
    })),
    offset: response.data.last_id ?? "",
    isLast: response.data.is_last,
  };
}

async function openProfile(userId: string): Promise<void> {
  try {
    await openCommunityProfile(userId);
  } catch (cause) {
    showSnackbar.error(`打开个人主页失败：${TGHttps.getErrMsg(cause)}`);
  }
}

async function openPost(postId: string, title: string): Promise<void> {
  try {
    await createPost(postId, title);
  } catch (cause) {
    showSnackbar.error(`打开帖子失败：${TGHttps.getErrMsg(cause)}`);
  }
}

function closeCollection(): void {
  collectionGeneration += 1;
  selectedCollection.value = undefined;
  collectionPosts.value = [];
  collectionLoading.value = false;
  collectionError.value = "";
  resetCollectionSearch();
}

function resetCollectionSearch(): void {
  collectionSearchInput.value = "";
  collectionKeyword.value = "";
}

function searchCollection(input: string | null): void {
  collectionKeyword.value = (input ?? "").trim();
}

async function loadCollection(entry: TGApp.BBS.Collection.Collection): Promise<void> {
  const snapshot = getSnapshot();
  if (!snapshot) return;
  const version = generation;
  const collectionVersion = ++collectionGeneration;
  selectedCollection.value = entry;
  collectionPosts.value = [];
  collectionError.value = "";
  collectionLoading.value = true;
  resetCollectionSearch();
  try {
    const response = await postReq.collection(String(entry.id));
    if (!isCurrent(snapshot, version) || collectionVersion !== collectionGeneration) return;
    if (response.retcode !== 0) throw new Error(`[${response.retcode}] ${response.message}`);
    collectionPosts.value = response.data.posts;
  } catch (cause) {
    if (isCurrent(snapshot, version) && collectionVersion === collectionGeneration)
      collectionError.value = TGHttps.getErrMsg(cause);
  } finally {
    if (isCurrent(snapshot, version) && collectionVersion === collectionGeneration)
      collectionLoading.value = false;
  }
}
</script>

<style lang="scss" scoped>
.cp-content {
  display: flex;
  flex-direction: column;
  color: var(--app-page-content);
  gap: 16px;
}

.cp-content-header {
  display: flex;
  flex-shrink: 0;
  align-items: flex-start;
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
    overflow-wrap: anywhere;
  }

  p {
    margin: 0;
    color: var(--box-text-4);
    font-size: 12px;
    overflow-wrap: anywhere;
  }
}

.cp-content-heading {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
}

.cp-content-count,
.cp-entry-meta {
  flex-shrink: 0;
  color: var(--box-text-4);
  font-size: 12px;
}

.cp-content-body {
  min-height: 0;
  flex: 1 1 auto;
  padding: 4px;
  overflow-y: auto;
  scrollbar-gutter: stable;
}

.cp-content-toolbar {
  display: flex;
  flex-shrink: 0;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  border-bottom: 1px solid var(--common-shadow-1);
  gap: 8px 12px;
}

.cp-favorite-tabs {
  flex-shrink: 0;
}

.cp-content-search {
  width: 240px;
  max-width: 100%;
  flex: 0 1 auto;
  padding-bottom: 4px;
}

.cp-entry-list,
.cp-collection-posts {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.cp-entry {
  display: flex;
  width: 100%;
  min-width: 0;
  flex-shrink: 0;
  align-items: center;
  padding: 16px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--box-bg-1);
  color: inherit;
  gap: 16px;
  text-align: left;
}

.cp-entry-button {
  cursor: pointer;

  &:hover {
    background: var(--box-bg-2);
  }

  &:focus-visible {
    outline: 2px solid var(--common-text-title);
    outline-offset: 2px;
  }
}

.cp-entry-image {
  display: grid;
  overflow: hidden;
  width: 64px;
  height: 64px;
  flex-shrink: 0;
  border-radius: 4px;
  background: var(--box-bg-2);
  place-items: center;

  :deep(img) {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.cp-entry-content {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 8px;
}

.cp-entry-title {
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 16px;
  font-weight: normal;
  overflow-wrap: anywhere;
}

.cp-entry-description {
  font-size: 14px;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}

.cp-content-state {
  display: flex;
  min-height: 160px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
  color: var(--box-text-4);
  gap: 12px;
  overflow-wrap: anywhere;
  text-align: center;

  p {
    margin: 0;
  }
}

.cp-content-footer {
  display: flex;
  justify-content: center;
  padding: 16px 0 4px;
  color: var(--box-text-4);
  font-size: 12px;
}

@media (width <= 640px) {
  .cp-content-header {
    flex-wrap: wrap;
    gap: 8px;
  }

  .cp-entry {
    flex-wrap: wrap;
    padding: 12px;
    gap: 8px;
  }
}
</style>
