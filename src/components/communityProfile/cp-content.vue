<template>
  <section
    :aria-busy="loading || collectionLoading"
    aria-labelledby="cp-content-title"
    class="cp-content"
  >
    <header class="cp-content-header">
      <div
        :class="['cp-content-heading', { 'cp-content-heading--collection': selectedCollection }]"
      >
        <span v-if="selectedCollection?.cover" class="cp-content-heading-cover">
          <TMiImg :src="selectedCollection.cover" alt="合集封面" />
        </span>
        <div class="cp-content-heading-text">
          <h2 id="cp-content-title">
            <v-icon size="20" aria-hidden="true">{{ sectionInfo.icon }}</v-icon>
            {{ selectedCollection?.title || sectionInfo.title }}
            <span
              v-if="section === 'history' && entries.length"
              :title="`共 ${fmtUtil.num(historyTotal || entries.length)} 条浏览历史`"
              class="cp-content-title-count"
            >
              {{ fmtUtil.num(historyTotal || entries.length) }}
            </span>
            <v-btn
              v-if="section === 'history' && entries.length && !historySelectMode"
              class="cp-content-manage"
              size="small"
              variant="text"
              @click="enterHistorySelect"
              >管理</v-btn
            >
          </h2>
          <p>{{ selectedCollection ? selectedCollection.desc : sectionInfo.description }}</p>
        </div>
      </div>
      <div v-if="selectedCollection" class="cp-content-actions">
        <v-btn
          v-if="canToggleCollectionFavorite"
          :aria-pressed="isSelectedCollectionFavorite"
          :class="['cp-collection-favorite', { 'is-favorite': isSelectedCollectionFavorite }]"
          :disabled="togglingCollectionFavoriteId !== undefined"
          :loading="togglingCollectionFavoriteId === selectedCollection?.id"
          :prepend-icon="isSelectedCollectionFavorite ? 'mdi-star' : 'mdi-star-outline'"
          :title="isSelectedCollectionFavorite ? '取消收藏合集' : '收藏合集'"
          size="small"
          variant="text"
          @click="toggleCollectionFavorite(selectedCollection)"
        >
          {{ isSelectedCollectionFavorite ? "已收藏" : "收藏" }}
        </v-btn>
        <v-btn prepend-icon="mdi-arrow-left" size="small" variant="text" @click="closeCollection"
          >返回合集</v-btn
        >
        <v-btn
          v-if="canUnfavoriteCollection"
          :disabled="unfavoritingCollectionId !== undefined"
          :loading="unfavoritingCollectionId === selectedCollection?.id"
          prepend-icon="mdi-star-off-outline"
          size="small"
          variant="text"
          @click="unfavoriteCollection()"
          >取消收藏</v-btn
        >
      </div>
      <div v-else-if="section === 'history' && entries.length" class="cp-content-actions">
        <template v-if="historySelectMode">
          <span aria-live="polite" class="cp-content-count">
            已选择 {{ fmtUtil.num(historySelectedCount) }} 条
          </span>
          <v-btn
            :aria-label="historySelectAll ? '取消全选' : '全选'"
            :disabled="deletingHistory"
            :icon="
              historySelectAll
                ? 'mdi-checkbox-multiple-blank-outline'
                : 'mdi-checkbox-multiple-marked-outline'
            "
            :title="historySelectAll ? '取消全选' : '全选'"
            class="cp-history-action"
            size="small"
            variant="text"
            @click="toggleHistorySelectAll"
          />
          <v-btn
            :aria-label="`删除已选 ${fmtUtil.num(historySelectedCount)} 条`"
            :disabled="historySelectedCount === 0 || deletingHistory"
            :loading="deletingHistory"
            :title="`删除已选 ${fmtUtil.num(historySelectedCount)} 条`"
            class="cp-history-action cp-history-delete"
            icon="mdi-delete-outline"
            size="small"
            variant="text"
            @click="deleteSelectedHistory"
          />
          <v-btn
            :disabled="deletingHistory"
            aria-label="取消管理"
            class="cp-history-action"
            icon="mdi-close"
            size="small"
            title="取消管理"
            variant="text"
            @click="exitHistorySelect"
          />
        </template>
        <span class="cp-content-count">已加载 {{ fmtUtil.num(entries.length) }} 条</span>
      </div>
      <span v-else-if="searchKeyword" class="cp-content-count">
        {{
          loading
            ? `已读取 ${fmtUtil.num(scannedCount)} 篇`
            : `找到 ${fmtUtil.num(entries.length)} 篇`
        }}
      </span>
      <div v-else-if="section === 'collections'" class="cp-content-actions">
        <span class="cp-content-count">已加载 {{ fmtUtil.num(entries.length) }} 条</span>
        <template v-if="canManageCollections">
          <v-btn prepend-icon="mdi-plus" size="small" variant="tonal" @click="openCreateCollection"
            >创建合集</v-btn
          >
          <v-btn
            :disabled="!canSortCollections || collectionSortLoading"
            :loading="collectionSortLoading"
            prepend-icon="mdi-sort"
            size="small"
            variant="tonal"
            @click="openCollectionSort"
            >排序</v-btn
          >
        </template>
      </div>
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
        v-model="searchInput"
        :class="{ 'cp-content-search-hidden': favoriteTab !== 'posts' }"
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
      <div v-if="error && !entries.length" class="cp-content-state cp-content-error" role="alert">
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
            :action="getRelationAction(entry.relation)"
            :actionDisabled="relationActionUid !== ''"
            :actionLoading="relationActionUid === entry.relation.user.uid"
            :relation="entry.relation"
            @follow-back="followBack"
            @open-profile="openProfile"
            @unfollow="unfollowUser"
          />
          <CpPost
            v-else-if="entry.kind === 'post'"
            :post="entry.post"
            :selectable="historySelectMode"
            :selected="historySelectMode && isHistorySelected(entry.id)"
            :viewedAt="entry.viewedAt"
            @open-post="openPost"
            @open-profile="openProfile"
            @toggle-select="toggleHistorySelection(entry.id)"
          >
            <template v-if="canUnfavoritePosts" #actions>
              <v-btn
                :disabled="unfavoritingId !== ''"
                :loading="unfavoritingId === entry.post.post.post_id"
                class="cp-post-unfavorite"
                prepend-icon="mdi-star-off-outline"
                size="small"
                title="取消收藏这篇帖子"
                variant="tonal"
                @click.stop="unfavoritePost(entry.post)"
              >
                取消收藏
              </v-btn>
            </template>
          </CpPost>
          <div v-else class="cp-entry cp-entry-card">
            <button class="cp-entry-main" type="button" @click="loadCollection(entry.collection)">
              <span v-if="entry.collection.cover" class="cp-entry-image">
                <TMiImg :src="entry.collection.cover" alt="合集封面" />
              </span>
              <span class="cp-entry-content">
                <span class="cp-entry-title"><TpTitle :text="entry.collection.title" /></span>
                <span v-if="entry.collection.desc" class="cp-entry-description">{{
                  entry.collection.desc
                }}</span>
                <span aria-label="合集统计" class="cp-entry-meta">
                  <span :title="`${fmtUtil.num(entry.collection.post_num)} 篇帖子`">
                    <v-icon aria-hidden="true" size="16">mdi-text-box-outline</v-icon>
                    {{ fmtUtil.num(entry.collection.post_num) }}
                  </span>
                  <span :title="`${fmtUtil.num(entry.collection.view_num)} 次浏览`">
                    <v-icon aria-hidden="true" size="16">mdi-eye-outline</v-icon>
                    {{ fmtUtil.num(entry.collection.view_num) }}
                  </span>
                </span>
              </span>
            </button>
            <div v-if="canManageCollections" class="cp-entry-actions">
              <v-btn
                :aria-label="`编辑合集：${entry.collection.title}`"
                :disabled="deletingCollectionId !== undefined"
                icon="mdi-pencil-outline"
                size="small"
                title="编辑合集"
                type="button"
                variant="text"
                @click="openEditCollection(entry.collection)"
              />
              <v-btn
                :aria-label="`删除合集：${entry.collection.title}`"
                :disabled="deletingCollectionId !== undefined"
                :loading="deletingCollectionId === entry.collection.id"
                class="cp-entry-delete-button"
                icon="mdi-delete-outline"
                size="small"
                title="删除合集"
                type="button"
                variant="text"
                @click="deleteCollection(entry.collection)"
              />
            </div>
            <div v-else-if="canUnfavoriteCollection" class="cp-entry-actions">
              <v-btn
                :aria-label="`取消收藏合集：${entry.collection.title}`"
                :disabled="unfavoritingCollectionId !== undefined"
                :loading="unfavoritingCollectionId === entry.collection.id"
                class="cp-entry-delete-button"
                icon="mdi-delete-outline"
                size="small"
                title="取消收藏"
                type="button"
                variant="text"
                @click="unfavoriteCollection(entry.collection)"
              />
            </div>
            <div v-else-if="canToggleCollectionFavorite" class="cp-entry-actions">
              <v-btn
                :aria-label="`${isCollectionFavorite(entry.collection) ? '取消收藏' : '收藏'}合集：${entry.collection.title}`"
                :aria-pressed="isCollectionFavorite(entry.collection)"
                :class="[
                  'cp-entry-favorite',
                  { 'is-favorite': isCollectionFavorite(entry.collection) },
                ]"
                :disabled="togglingCollectionFavoriteId !== undefined"
                :icon="isCollectionFavorite(entry.collection) ? 'mdi-star' : 'mdi-star-outline'"
                :loading="togglingCollectionFavoriteId === entry.collection.id"
                :title="isCollectionFavorite(entry.collection) ? '取消收藏' : '收藏'"
                size="small"
                type="button"
                variant="text"
                @click="toggleCollectionFavorite(entry.collection)"
              />
            </div>
            <v-icon class="cp-entry-chevron" size="18" aria-hidden="true">mdi-chevron-right</v-icon>
          </div>
        </template>
      </div>
      <div v-else-if="!loading && !error && searchKeyword" class="cp-content-state" role="status">
        <v-icon size="32">mdi-text-search-variant</v-icon>
        <p>未找到与“{{ searchKeyword }}”相关的收藏帖子</p>
      </div>
      <div v-else-if="!loading && !error" class="cp-content-state" role="status">
        <v-icon size="32">{{ sectionInfo.icon }}</v-icon>
        <p>{{ sectionInfo.empty }}</p>
        <v-btn
          v-if="canManageCollections"
          prepend-icon="mdi-plus"
          size="small"
          variant="tonal"
          @click="openCreateCollection"
          >创建合集</v-btn
        >
      </div>
      <div
        v-if="loading && !entries.length"
        class="cp-content-state"
        role="status"
        aria-live="polite"
      >
        <v-progress-circular indeterminate size="28" />
        <p>{{ searchKeyword ? "正在搜索收藏帖子…" : `正在加载${sectionInfo.title}…` }}</p>
      </div>
      <footer v-if="entries.length && !searchKeyword" class="cp-content-footer">
        <template v-if="error">
          <span :title="error">加载失败</span>
          <v-btn :disabled="loading" size="small" variant="tonal" @click="retry">重试</v-btn>
        </template>
        <template v-else-if="loading">
          <v-progress-circular indeterminate size="18" />
          <span>正在加载更多…</span>
        </template>
        <span v-else-if="isLast">已全部加载</span>
        <span v-else ref="loadMoreRef" aria-hidden="true" class="cp-content-load-more-trigger" />
      </footer>
    </div>

    <CpCollectionForm
      v-if="canManageCollections"
      v-model="collectionFormVisible"
      :collection="editingCollection"
      @saved="handleCollectionFormSaved"
    />
    <CpCollectionSort
      v-if="canManageCollections"
      v-model="collectionSortVisible"
      :collections="sortableCollections"
      :error="collectionSortError"
      :saving="collectionSortSaving"
      @save="saveCollectionSort"
    />
  </section>
</template>

<script lang="ts" setup>
import TMiImg from "@comp/app/t-mi-img.vue";
import CpCollectionForm from "@comp/communityProfile/cp-collection-form.vue";
import CpCollectionSort from "@comp/communityProfile/cp-collection-sort.vue";
import CpComment from "@comp/communityProfile/cp-comment.vue";
import CpPost from "@comp/communityProfile/cp-post.vue";
import CpUser from "@comp/communityProfile/cp-user.vue";
import showDialog from "@comp/func/dialog.js";
import showSnackbar from "@comp/func/snackbar.js";
import TpTitle from "@comp/viewPost/tp-title.vue";
import communityReq from "@req/communityReq.js";
import postReq from "@req/postReq.js";
import useAppStore from "@store/app.js";
import useUserStore from "@store/user.js";
import { createPost } from "@utils/app/TGWindow.js";
import { matchesPostKeyword, openCommunityProfile } from "@utils/community/profile.js";
import fmtUtil from "@utils/display/fmtUtil.js";
import TGHttps from "@utils/network/TGHttps.js";
import { storeToRefs } from "pinia";
import { computed, nextTick, onBeforeUnmount, ref, shallowRef, useTemplateRef, watch } from "vue";

type ContentSection =
  "comments" | "collections" | "favorites" | "following" | "followers" | "history";
type FavoriteTab = "posts" | "collections";
type SectionInfo = { title: string; description: string; icon: string; empty: string };
type ContentEntry =
  | { kind: "comment"; id: string; comment: TGApp.BBS.Community.Comment }
  | { kind: "user"; id: string; relation: TGApp.BBS.Community.UserRelation }
  | {
      kind: "post";
      id: string;
      post: TGApp.BBS.Post.FullData;
      viewedAt?: number;
      historyId?: TGApp.BBS.Community.HistoryItemId;
    }
  | { kind: "collection"; id: string; collection: TGApp.BBS.Collection.Collection };
/**
 * 浏览历史列表中的帖子条目。
 * @since Beta v0.13.0
 */
type HistoryEntry = Extract<ContentEntry, { kind: "post" }> & {
  historyId: TGApp.BBS.Community.HistoryItemId;
};
/**
 * 内容列表的登录账户和目标用户快照。
 * @since Beta v0.13.0
 */
type AccountSnapshot = { uid: string; profileUid: string; cookie: TGApp.App.Account.Cookie };
type ContentPage = {
  entries: Array<ContentEntry>;
  offset: string;
  isLast: boolean;
  total?: number;
};

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
const canUnfavoritePosts = computed<boolean>(
  () => section === "favorites" && favoriteTab.value === "posts" && !isViewingOtherProfile.value,
);
const unfavoritingId = ref<string>("");
const relationActionUid = ref<string>("");
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
const unfavoritingCollectionId = ref<number | undefined>();
const collectionSearchInput = ref<string | null>("");
const collectionKeyword = ref<string>("");
const filteredCollectionPosts = computed<Array<TGApp.BBS.Post.FullData>>(() => {
  const keyword = collectionKeyword.value;
  if (keyword === "") return collectionPosts.value;
  return collectionPosts.value.filter((post) => matchesPostKeyword(post, keyword));
});
const canUnfavoriteCollection = computed<boolean>(
  () =>
    section === "favorites" && favoriteTab.value === "collections" && !isViewingOtherProfile.value,
);
const canToggleCollectionFavorite = computed<boolean>(
  () => section === "collections" && isViewingOtherProfile.value,
);
const togglingCollectionFavoriteId = ref<number | undefined>();
const isSelectedCollectionFavorite = computed<boolean>(() =>
  Boolean(selectedCollection.value?.is_following),
);
const collectionFormVisible = ref<boolean>(false);
const editingCollection = shallowRef<TGApp.BBS.Collection.Collection>();
const collectionSortVisible = ref<boolean>(false);
const sortableCollections = shallowRef<Array<TGApp.BBS.Collection.Collection>>([]);
const collectionSortLoading = ref<boolean>(false);
const collectionSortSaving = ref<boolean>(false);
const collectionSortError = ref<string>("");
const deletingCollectionId = ref<number | undefined>();
const searchInput = ref<string | null>("");
const searchKeyword = ref<string>("");
const scannedCount = ref<number>(0);
const historySelectMode = ref<boolean>(false);
const historySelectAll = ref<boolean>(false);
const historySelectedIds = ref<Set<string>>(new Set());
const historyTotal = ref<number>(0);
const deletingHistory = ref<boolean>(false);
const historyEntries = computed<Array<HistoryEntry>>(() =>
  entries.value.filter(
    (entry): entry is HistoryEntry => entry.kind === "post" && entry.historyId !== undefined,
  ),
);
const historySelectedCount = computed<number>(() => {
  if (!historySelectAll.value) return historySelectedIds.value.size;
  const total = historyTotal.value || historyEntries.value.length;
  return Math.max(total - historySelectedIds.value.size, 0);
});
const loadMoreRef = useTemplateRef<HTMLElement>("loadMoreRef");
let loadMoreObserver: IntersectionObserver | undefined;
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
    closeCollectionManagement();
    exitHistorySelect();
    historyTotal.value = 0;
    void loadMore();
  },
  { immediate: true },
);

watch([loading, isLast, () => entries.value.length, searchKeyword, error], () => {
  loadMoreObserver?.disconnect();
  if (loading.value || isLast.value || searchKeyword.value !== "" || error.value !== "") return;
  void nextTick(observeLoadMore);
});

onBeforeUnmount(() => {
  active = false;
  generation += 1;
  collectionGeneration += 1;
  loadMoreObserver?.disconnect();
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

const canManageCollections = computed<boolean>(
  () => section === "collections" && !isViewingOtherProfile.value && getSnapshot() !== undefined,
);
const canSortCollections = computed<boolean>(
  () =>
    canManageCollections.value && !loading.value && (entries.value.length >= 2 || !isLast.value),
);

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
    if (result.total !== undefined) historyTotal.value = result.total;
  } catch (cause) {
    if (isCurrent(snapshot, version)) error.value = TGHttps.getErrMsg(cause);
  } finally {
    if (isCurrent(snapshot, version)) loading.value = false;
  }
}

function observeLoadMore(): void {
  const target = loadMoreRef.value;
  if (
    target === null ||
    loading.value ||
    isLast.value ||
    error.value !== "" ||
    searchKeyword.value !== ""
  )
    return;
  loadMoreObserver ??= new IntersectionObserver(
    (records) => {
      const entry = records.find((record) => record.isIntersecting);
      if (entry === undefined) return;
      loadMoreObserver?.unobserve(entry.target);
      void loadMore();
    },
    { rootMargin: "240px 0px" },
  );
  loadMoreObserver.observe(target);
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

function removeFavorite(postId: string): void {
  entries.value = entries.value.filter((entry) => entry.kind !== "post" || entry.id !== postId);
  if (favoriteCache !== undefined) {
    favoriteCache = favoriteCache.filter((item) => item.post.post_id !== postId);
  }
  if (!searchKeyword.value && entries.value.length === 0 && !isLast.value) void loadMore();
}

async function unfavoritePost(post: TGApp.BBS.Post.FullData): Promise<void> {
  if (!canUnfavoritePosts.value || unfavoritingId.value !== "") return;
  const snapshot = getSnapshot();
  if (snapshot === undefined) {
    showSnackbar.warn("当前账号凭据不可用，请重新登录米游社账号。");
    return;
  }
  const postId = post.post.post_id;
  const version = generation;
  unfavoritingId.value = postId;
  try {
    const response = await communityReq.unfavoritePost(snapshot.cookie, postId);
    if (!isCurrent(snapshot, version)) return;
    if (response.retcode !== 0) throw new Error(`[${response.retcode}] ${response.message}`);
    removeFavorite(postId);
    showSnackbar.success("已取消收藏");
  } catch (cause) {
    if (!isCurrent(snapshot, version)) return;
    showSnackbar.error(`取消收藏失败：${TGHttps.getErrMsg(cause)}`);
  } finally {
    unfavoritingId.value = "";
  }
}

function getRelationAction(
  relation: TGApp.BBS.Community.UserRelation,
): TGApp.BBS.Community.UserRelationAction | undefined {
  if (!isLogin.value || isViewingOtherProfile.value) return undefined;
  if (section === "following") return "unfollow";
  if (section === "followers" && !relation.is_follow && !relation.is_following)
    return "follow-back";
  return undefined;
}

function markUserFollowed(uid: string): void {
  entries.value = entries.value.map((entry) =>
    entry.kind === "user" && entry.id === uid
      ? { ...entry, relation: { ...entry.relation, is_follow: true, is_following: true } }
      : entry,
  );
}

async function followBack(relation: TGApp.BBS.Community.UserRelation): Promise<void> {
  if (relationActionUid.value !== "") return;
  const snapshot = getSnapshot();
  if (snapshot === undefined) {
    showSnackbar.warn("当前账号凭据不可用，请重新登录米游社账号。");
    return;
  }
  const uid = relation.user.uid;
  const version = generation;
  relationActionUid.value = uid;
  try {
    const response = await communityReq.setFollow(snapshot.cookie, uid, true);
    if (!isCurrent(snapshot, version)) return;
    if (response.retcode !== 0) throw new Error(`[${response.retcode}] ${response.message}`);
    markUserFollowed(uid);
    showSnackbar.success("回关成功");
  } catch (cause) {
    if (!isCurrent(snapshot, version)) return;
    showSnackbar.error(`回关失败：${TGHttps.getErrMsg(cause)}`);
  } finally {
    relationActionUid.value = "";
  }
}

async function unfollowUser(relation: TGApp.BBS.Community.UserRelation): Promise<void> {
  if (relationActionUid.value !== "") return;
  const snapshot = getSnapshot();
  if (snapshot === undefined) {
    showSnackbar.warn("当前账号凭据不可用，请重新登录米游社账号。");
    return;
  }
  const uid = relation.user.uid;
  const version = generation;
  const nickname = relation.user.nickname.trim() || `用户 ${uid}`;
  const confirmed = await showDialog.checkF({
    cancelLabel: "继续关注",
    confirmLabel: "取消关注",
    text: `确定要取消关注“${nickname}”吗？`,
    title: "取消关注",
  });
  if (!confirmed || !isCurrent(snapshot, version) || relationActionUid.value !== "") return;
  relationActionUid.value = uid;
  try {
    const response = await communityReq.setFollow(snapshot.cookie, uid, false);
    if (!isCurrent(snapshot, version)) return;
    if (response.retcode !== 0) throw new Error(`[${response.retcode}] ${response.message}`);
    entries.value = entries.value.filter((entry) => entry.kind !== "user" || entry.id !== uid);
    if (entries.value.length === 0 && !isLast.value) void loadMore();
    showSnackbar.success("已取消关注");
  } catch (cause) {
    if (!isCurrent(snapshot, version)) return;
    showSnackbar.error(`取消关注失败：${TGHttps.getErrMsg(cause)}`);
  } finally {
    relationActionUid.value = "";
  }
}

function retry(): void {
  if (searchKeyword.value) void searchFavorites(searchKeyword.value);
  else void loadMore();
}

function enterHistorySelect(): void {
  if (section !== "history" || entries.value.length === 0) return;
  historySelectMode.value = true;
  historySelectAll.value = false;
  historySelectedIds.value = new Set();
}

function exitHistorySelect(): void {
  historySelectMode.value = false;
  historySelectAll.value = false;
  historySelectedIds.value = new Set();
}

function isHistorySelected(entryId: string): boolean {
  return historySelectAll.value
    ? !historySelectedIds.value.has(entryId)
    : historySelectedIds.value.has(entryId);
}

function toggleHistorySelection(entryId: string): void {
  if (!historySelectMode.value || deletingHistory.value) return;
  const next = new Set(historySelectedIds.value);
  if (next.has(entryId)) next.delete(entryId);
  else next.add(entryId);
  historySelectedIds.value = next;
}

function toggleHistorySelectAll(): void {
  if (!historySelectMode.value || deletingHistory.value) return;
  historySelectAll.value = !historySelectAll.value;
  historySelectedIds.value = new Set();
}

async function deleteSelectedHistory(): Promise<void> {
  if (!historySelectMode.value || deletingHistory.value) return;
  const selectedCount = historySelectedCount.value;
  if (selectedCount === 0) return;
  const snapshot = getSnapshot();
  if (snapshot === undefined) {
    showSnackbar.warn("当前账号凭据不可用，请重新登录米游社账号。");
    return;
  }
  if (!snapshot.cookie.stoken.trim() || !snapshot.cookie.mid.trim()) {
    showSnackbar.warn("当前账号缺少 SToken，请重新登录后再操作浏览历史。");
    return;
  }
  const version = generation;
  const confirmed = await showDialog.checkF({
    cancelLabel: "取消",
    confirmLabel: "删除",
    text: `确定删除选中的 ${fmtUtil.num(selectedCount)} 条浏览历史吗？删除后无法恢复。`,
    title: "删除浏览历史",
  });
  if (!confirmed || !isCurrent(snapshot, version) || !historySelectMode.value) return;
  const operateList = historyEntries.value
    .filter((entry) => historySelectedIds.value.has(entry.id))
    .map((entry) => entry.historyId);
  if (!historySelectAll.value && operateList.length === 0) return;
  const latestViewAt = historyEntries.value.reduce(
    (latest, entry) => Math.max(latest, entry.viewedAt ?? 0),
    0,
  );
  deletingHistory.value = true;
  try {
    const response = await communityReq.deleteHistory(snapshot.cookie, {
      is_delete_all: historySelectAll.value,
      operate_id_list: operateList,
      user_last_view_at: latestViewAt,
    });
    if (!isCurrent(snapshot, version)) return;
    if (response.retcode !== 0) throw new Error(`[${response.retcode}] ${response.message}`);
    exitHistorySelect();
    generation += 1;
    resetEntries();
    void loadMore();
    showSnackbar.success("已删除浏览历史");
  } catch (cause) {
    if (!isCurrent(snapshot, version)) return;
    showSnackbar.error(`删除失败：${TGHttps.getErrMsg(cause)}`);
  } finally {
    deletingHistory.value = false;
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
                historyId: item.id,
              },
            ]
          : [],
      ),
      offset: String(response.data.next_offset ?? ""),
      isLast: response.data.is_last,
      total: response.data.total,
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

function isCollectionFavorite(collection: TGApp.BBS.Collection.Collection): boolean {
  return Boolean(collection.is_following);
}

function setCollectionFavorite(id: number, favorite: boolean): void {
  entries.value = entries.value.map((entry) =>
    entry.kind === "collection" && entry.id === String(id)
      ? { ...entry, collection: { ...entry.collection, is_following: favorite } }
      : entry,
  );
  if (selectedCollection.value?.id === id) {
    selectedCollection.value = { ...selectedCollection.value, is_following: favorite };
  }
}

async function toggleCollectionFavorite(
  collection: TGApp.BBS.Collection.Collection | undefined,
): Promise<void> {
  if (
    collection === undefined ||
    !canToggleCollectionFavorite.value ||
    togglingCollectionFavoriteId.value !== undefined
  )
    return;
  const snapshot = getSnapshot();
  if (snapshot === undefined) {
    showSnackbar.warn("当前账号凭据不可用，请重新登录米游社账号。");
    return;
  }
  const version = generation;
  const favorite = !isCollectionFavorite(collection);
  togglingCollectionFavoriteId.value = collection.id;
  try {
    const response = favorite
      ? await communityReq.followCollection(snapshot.cookie, collection.id)
      : await communityReq.unfollowCollection(snapshot.cookie, collection.id);
    if (!isCurrent(snapshot, version)) return;
    if (response.retcode !== 0) throw new Error(`[${response.retcode}] ${response.message}`);
    setCollectionFavorite(collection.id, favorite);
    showSnackbar.success(favorite ? "收藏成功" : "已取消收藏");
  } catch (cause) {
    if (!isCurrent(snapshot, version)) return;
    showSnackbar.error(`${favorite ? "收藏" : "取消收藏"}失败：${TGHttps.getErrMsg(cause)}`);
  } finally {
    togglingCollectionFavoriteId.value = undefined;
  }
}

async function unfavoriteCollection(
  collection: TGApp.BBS.Collection.Collection | undefined = selectedCollection.value,
): Promise<void> {
  if (collection === undefined || unfavoritingCollectionId.value !== undefined) return;
  const snapshot = getSnapshot();
  if (!snapshot) return;
  const version = generation;
  const isOpenCollection = selectedCollection.value?.id === collection.id;
  const title = collection.title.trim() || `合集 ${collection.id}`;
  const confirmed = await showDialog.checkF({
    cancelLabel: "保留收藏",
    confirmLabel: "取消收藏",
    text: `确定取消收藏“${title}”吗？`,
    title: "取消收藏",
  });
  if (!confirmed || !isCurrent(snapshot, version)) return;
  if (isOpenCollection && selectedCollection.value?.id !== collection.id) return;
  unfavoritingCollectionId.value = collection.id;
  try {
    const response = await communityReq.unfollowCollection(snapshot.cookie, collection.id);
    if (!isCurrent(snapshot, version)) return;
    if (response.retcode !== 0) throw new Error(`[${response.retcode}] ${response.message}`);
    if (isOpenCollection) {
      closeCollection();
      generation += 1;
      resetEntries();
      void loadMore();
    } else {
      entries.value = entries.value.filter(
        (entry) => entry.kind !== "collection" || entry.id !== String(collection.id),
      );
      if (entries.value.length === 0 && !isLast.value) void loadMore();
    }
    showSnackbar.success("取消收藏成功");
  } catch (cause) {
    if (!isCurrent(snapshot, version)) return;
    showSnackbar.error(`取消收藏失败：${TGHttps.getErrMsg(cause)}`);
  } finally {
    unfavoritingCollectionId.value = undefined;
  }
}

function reloadEntries(): void {
  generation += 1;
  resetEntries();
  void loadMore();
}

async function loadAllCollections(
  snapshot: AccountSnapshot,
  version: number,
): Promise<Array<TGApp.BBS.Collection.Collection> | undefined> {
  const collections: Array<TGApp.BBS.Collection.Collection> = [];
  const ids = new Set<number>();
  let cursor = "";
  let last = false;
  while (!last) {
    const response = await communityReq.collections(snapshot.cookie, snapshot.profileUid, cursor);
    if (!isCurrent(snapshot, version)) return undefined;
    if (response.retcode !== 0) throw new Error(`[${response.retcode}] ${response.message}`);
    for (const collection of response.data.list) {
      if (ids.has(collection.id)) continue;
      ids.add(collection.id);
      collections.push(collection);
    }
    const next = response.data.next_offset ?? "";
    last = response.data.is_last;
    if (!last && (!next.trim() || next === cursor)) throw new Error("分页游标无效，请刷新后重试。");
    cursor = next;
  }
  return collections;
}

function closeCollectionManagement(): void {
  collectionFormVisible.value = false;
  editingCollection.value = undefined;
  collectionSortVisible.value = false;
  sortableCollections.value = [];
  collectionSortLoading.value = false;
  collectionSortSaving.value = false;
  collectionSortError.value = "";
  deletingCollectionId.value = undefined;
}

function openCreateCollection(): void {
  if (!canManageCollections.value) return;
  editingCollection.value = undefined;
  collectionFormVisible.value = true;
}

function openEditCollection(collection: TGApp.BBS.Collection.Collection): void {
  if (!canManageCollections.value) return;
  if (collection.status !== 2) {
    showSnackbar.warn("合集审核中，暂不支持编辑。");
    return;
  }
  editingCollection.value = collection;
  collectionFormVisible.value = true;
}

function handleCollectionFormSaved(): void {
  showSnackbar.success(editingCollection.value ? "合集信息已更新" : "合集已创建");
  editingCollection.value = undefined;
  reloadEntries();
}

async function openCollectionSort(): Promise<void> {
  if (!canSortCollections.value || collectionSortLoading.value) return;
  const snapshot = getSnapshot();
  if (!snapshot) return;
  const version = generation;
  collectionSortLoading.value = true;
  collectionSortError.value = "";
  try {
    const collections = await loadAllCollections(snapshot, version);
    if (collections === undefined || !isCurrent(snapshot, version)) return;
    if (collections.length < 2) {
      showSnackbar.warn("至少需要两个合集才能调整排序。");
      return;
    }
    sortableCollections.value = collections;
    collectionSortVisible.value = true;
  } catch (cause) {
    if (isCurrent(snapshot, version))
      showSnackbar.error(`加载合集失败：${TGHttps.getErrMsg(cause)}`);
  } finally {
    collectionSortLoading.value = false;
  }
}

async function saveCollectionSort(ids: Array<number>): Promise<void> {
  if (!collectionSortVisible.value || collectionSortSaving.value) return;
  const snapshot = getSnapshot();
  if (!snapshot) {
    collectionSortError.value = "当前账号凭据不可用，请重新登录米游社账号。";
    return;
  }
  const version = generation;
  collectionSortSaving.value = true;
  collectionSortError.value = "";
  try {
    const response = await communityReq.sortCollections(snapshot.cookie, ids);
    if (!isCurrent(snapshot, version)) return;
    if (response.retcode !== 0) throw new Error(`[${response.retcode}] ${response.message}`);
    collectionSortVisible.value = false;
    sortableCollections.value = [];
    reloadEntries();
    showSnackbar.success("合集排序已保存");
  } catch (cause) {
    if (isCurrent(snapshot, version)) collectionSortError.value = TGHttps.getErrMsg(cause);
  } finally {
    collectionSortSaving.value = false;
  }
}

async function deleteCollection(collection: TGApp.BBS.Collection.Collection): Promise<void> {
  if (!canManageCollections.value || deletingCollectionId.value !== undefined) return;
  const snapshot = getSnapshot();
  if (!snapshot) {
    showSnackbar.warn("当前账号凭据不可用，请重新登录米游社账号。");
    return;
  }
  const version = generation;
  const title = collection.title.trim() || `合集 ${collection.id}`;
  const confirmed = await showDialog.checkF({
    cancelLabel: "保留合集",
    confirmLabel: "删除合集",
    text: `确定要删除“${title}”吗？合集内的帖子不会被删除。`,
    title: "删除合集",
  });
  if (!confirmed || !isCurrent(snapshot, version) || deletingCollectionId.value !== undefined)
    return;
  deletingCollectionId.value = collection.id;
  try {
    const response = await communityReq.deleteCollection(snapshot.cookie, collection.id);
    if (!isCurrent(snapshot, version)) return;
    if (response.retcode !== 0) throw new Error(`[${response.retcode}] ${response.message}`);
    entries.value = entries.value.filter(
      (entry) => entry.kind !== "collection" || entry.id !== String(collection.id),
    );
    if (entries.value.length === 0 && !isLast.value) void loadMore();
    showSnackbar.success("合集已删除");
  } catch (cause) {
    if (!isCurrent(snapshot, version)) return;
    showSnackbar.error(`删除合集失败：${TGHttps.getErrMsg(cause)}`);
  } finally {
    deletingCollectionId.value = undefined;
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

.cp-content-actions {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 8px;
}

.cp-collection-favorite {
  border: 1px solid var(--common-shadow-1);
  background: var(--box-bg-2);
  color: var(--box-text-4);
  font-weight: normal;

  &.is-favorite {
    color: var(--tgc-od-orange);
  }

  &:hover {
    border-color: var(--common-shadow-2);
    background: var(--box-bg-3);
  }
}

.cp-content-heading {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
}

.cp-content-heading--collection {
  flex-direction: row;
  align-items: center;
  gap: 8px;
}

.cp-content-heading-cover {
  display: grid;
  overflow: hidden;
  width: 48px;
  height: 48px;
  flex-shrink: 0;
  border-radius: 4px;
  background: var(--box-bg-3);
  place-items: center;

  :deep(img) {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.cp-content-heading-text {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
}

.cp-content-count {
  flex-shrink: 0;
  color: var(--box-text-4);
  font-size: 12px;
}

.cp-content-title-count {
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

.cp-content-manage {
  min-width: 0;
  padding: 0 6px;
  color: var(--box-text-4);
  font-weight: normal;

  &:hover {
    color: var(--common-text-title);
  }
}

.cp-entry-meta {
  display: flex;
  min-width: 0;
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

.cp-history-action {
  border: 1px solid var(--common-shadow-1);
  border-radius: 6px;
  background: var(--box-bg-2);
}

.cp-history-delete {
  color: var(--tgc-od-red);
}

.cp-post-unfavorite {
  position: relative;
  z-index: 2;
  flex-shrink: 0;
  color: var(--tgc-od-red);
}

.cp-content-search {
  width: 240px;
  max-width: 100%;
  flex: 0 1 auto;
  padding-bottom: 4px;

  &.cp-content-search-hidden {
    visibility: hidden;
  }
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
  gap: 8px;
  text-align: left;
}

.cp-entry-card {
  position: relative;
  z-index: 0;
  padding: 0 8px 0 0;
  gap: 0;

  &:hover {
    background: var(--box-bg-2);
  }
}

.cp-entry-main {
  display: flex;
  min-width: 0;
  flex: 1 1 auto;
  align-items: center;
  padding: 16px;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font: inherit;
  gap: 8px;
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

.cp-entry-actions {
  position: relative;
  z-index: 2;
  display: flex;
  flex: none;
  align-items: center;
  gap: 2px;
}

.cp-entry-delete-button {
  flex: none;
  border: 1px solid var(--common-shadow-1);
  background: var(--box-bg-2);
  color: var(--tgc-od-red);
}

.cp-entry-card:hover .cp-entry-delete-button {
  background: var(--box-bg-1);
}

.cp-entry-favorite {
  flex: none;
  border: 1px solid var(--common-shadow-1);
  background: var(--box-bg-2);
  color: var(--box-text-4);

  &.is-favorite {
    color: var(--tgc-od-orange);
  }
}

.cp-entry-card:hover .cp-entry-favorite {
  background: var(--box-bg-1);
}

.cp-entry-card:hover .cp-entry-favorite:hover {
  background: var(--box-bg-3);
}

.cp-entry-chevron {
  flex: none;
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

.cp-entry-card:hover .cp-entry-image {
  background: var(--box-bg-1);
}

.cp-entry-content {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
}

.cp-entry-title {
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 16px;
  font-weight: normal;
  overflow-wrap: anywhere;
}

.cp-entry-description {
  overflow: hidden;
  min-width: 0;
  color: var(--box-text-4);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
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
  align-items: center;
  justify-content: center;
  padding: 16px 0 4px;
  color: var(--box-text-4);
  font-size: 12px;
  gap: 8px;
}

.cp-content-load-more-trigger {
  width: 100%;
  height: 1px;
}

@media (width <= 640px) {
  .cp-content-header {
    flex-wrap: wrap;
    gap: 8px;
  }

  .cp-entry-main {
    padding: 12px;
  }
}
</style>
