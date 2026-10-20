<template>
  <section
    :aria-busy="loading || collectionLoading"
    aria-labelledby="cp-content-title"
    class="cp-content"
  >
    <header class="cp-content-header">
      <div>
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
      <span v-else class="cp-content-count">已加载 {{ entries.length }} 条</span>
    </header>

    <v-tabs
      v-if="section === 'favorites' && !selectedCollection"
      v-model="favoriteTab"
      aria-label="收藏内容类型"
      class="cp-favorite-tabs"
      color="var(--common-text-title)"
      density="compact"
    >
      <v-tab value="posts">帖子</v-tab>
      <v-tab value="collections">合集</v-tab>
    </v-tabs>

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
      <div v-else class="cp-collection-posts">
        <CpPost
          v-for="post in collectionPosts"
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
        <v-btn :disabled="loading" variant="tonal" @click="loadMore">重新加载</v-btn>
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
                >{{ entry.collection.post_num }} 篇帖子 ·
                {{ entry.collection.view_num }} 次浏览</span
              >
            </span>
            <v-icon size="18" aria-hidden="true">mdi-chevron-right</v-icon>
          </button>
        </template>
      </div>
      <div v-else-if="!loading && !error" class="cp-content-state" role="status">
        <v-icon size="32">{{ sectionInfo.icon }}</v-icon>
        <p>{{ sectionInfo.empty }}</p>
      </div>
      <div v-if="loading" class="cp-content-state" role="status" aria-live="polite">
        <v-progress-circular indeterminate size="28" />
        <p>正在加载{{ sectionInfo.title }}…</p>
      </div>
      <footer v-if="entries.length && !loading && !error" class="cp-content-footer">
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
import { openCommunityProfile } from "@utils/communityProfile.js";
import TGHttps from "@utils/TGHttps.js";
import { createPost } from "@utils/TGWindow.js";
import { storeToRefs } from "pinia";
import { computed, onBeforeUnmount, ref, shallowRef, watch } from "vue";

type ContentSection = "comments" | "collections" | "favorites" | "following" | "followers";
type FavoriteTab = "posts" | "collections";
type SectionInfo = { title: string; description: string; icon: string; empty: string };
type ContentEntry =
  | { kind: "comment"; id: string; comment: TGApp.BBS.Community.Comment }
  | { kind: "user"; id: string; relation: TGApp.BBS.Community.UserRelation }
  | { kind: "post"; id: string; post: TGApp.BBS.Post.FullData }
  | { kind: "collection"; id: string; collection: TGApp.BBS.Collection.Collection };
/**
 * 内容列表的登录账户和目标用户快照。
 * @since Beta v0.12.6
 */
type AccountSnapshot = { uid: string; profileUid: string; cookie: TGApp.App.Account.Cookie };
type ContentPage = { entries: Array<ContentEntry>; offset: string; isLast: boolean };

const { section, profileUid } = defineProps<{ section: ContentSection; profileUid?: string }>();
const favoriteTab = ref<FavoriteTab>("posts");
const { isLogin, incognito } = storeToRefs(useAppStore());
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
let generation = 0;
let collectionGeneration = 0;
let active = true;

watch(
  [
    () => section,
    () => profileUid,
    favoriteTab,
    isLogin,
    incognito,
    uid,
    () => cookie.value?.account_id,
    () => cookie.value?.cookie_token,
    () => cookie.value?.ltuid,
    () => cookie.value?.ltoken,
  ],
  () => {
    generation += 1;
    entries.value = [];
    offset.value = "";
    isLast.value = false;
    loading.value = false;
    error.value = "";
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

function getSnapshot(): AccountSnapshot | undefined {
  const loginUid = uid.value?.trim() ?? "";
  if (
    incognito.value ||
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
}

.cp-content-header {
  display: flex;
  flex-shrink: 0;
  align-items: flex-start;
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
    overflow-wrap: anywhere;
  }

  p {
    margin: 4px 0 0;
    color: var(--box-text-4);
    font-size: 12px;
    overflow-wrap: anywhere;
  }
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

.cp-favorite-tabs {
  flex-shrink: 0;
  border-bottom: 1px solid var(--common-shadow-1);
  margin-bottom: 12px;
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
