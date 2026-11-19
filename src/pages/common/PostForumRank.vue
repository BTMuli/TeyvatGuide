<!-- 版块榜单页面 -->
<template>
  <v-app-bar>
    <template #prepend>
      <div class="post-rank-heading">
        <v-btn
          :to="forumRoute"
          aria-label="返回版块"
          icon="mdi-arrow-left"
          size="small"
          title="返回版块"
          variant="text"
        />
        <h1>{{ forum ? `${forum.name}榜单` : "版块榜单" }}</h1>
        <v-btn
          :loading
          :rounded="true"
          class="post-rank-refresh"
          type="button"
          variant="elevated"
          @click="refresh"
        >
          <v-icon aria-hidden="true">mdi-refresh</v-icon>
          <span>刷新</span>
        </v-btn>
      </div>
    </template>
    <div class="post-rank-actions">
      <div class="post-rank-filters">
        <div v-if="rankedGames.length" class="post-rank-filter-group">
          <span>分区</span>
          <v-btn-toggle
            :mandatory="true"
            :modelValue="gid"
            aria-label="分区"
            class="post-rank-toggle"
            color="var(--tgc-od-blue)"
            variant="outlined"
            @update:model-value="changeGame"
          >
            <v-btn
              v-for="game in rankedGames"
              :key="game.id"
              :aria-label="game.name"
              :aria-pressed="game.id === gid"
              :icon="true"
              :title="game.name"
              :value="game.id"
              size="small"
              type="button"
            >
              <img v-if="game.app_icon || game.icon" :src="game.app_icon || game.icon" alt="" />
              <v-icon v-else aria-hidden="true" icon="mdi-gamepad-variant-outline" />
            </v-btn>
          </v-btn-toggle>
        </div>
        <div v-if="rankedForums.length" class="post-rank-filter-group">
          <span>版块</span>
          <v-btn-toggle
            :mandatory="true"
            :modelValue="forumId"
            aria-label="版块"
            class="post-rank-toggle"
            color="var(--tgc-od-blue)"
            variant="outlined"
            @update:model-value="changeForum"
          >
            <v-btn
              v-for="item in rankedForums"
              :key="item.id"
              :aria-label="item.name"
              :aria-pressed="item.id === forumId"
              :icon="true"
              :title="item.name"
              :value="item.id"
              size="small"
              type="button"
            >
              <img v-if="item.icon" :src="item.icon" alt="" />
              <v-icon v-else aria-hidden="true" icon="mdi-image-multiple-outline" />
            </v-btn>
          </v-btn-toggle>
        </div>
        <div v-if="periods.length" class="post-rank-filter-group">
          <span>类型</span>
          <v-btn-toggle
            v-model="period"
            :mandatory="true"
            aria-label="榜单类型"
            class="post-rank-toggle"
            color="var(--tgc-od-blue)"
            variant="outlined"
          >
            <v-btn
              v-for="item in periods"
              :key="item.value"
              :aria-label="item.title"
              :aria-pressed="item.value === period"
              :icon="item.icon"
              :title="item.title"
              :value="item.value"
              size="small"
              type="button"
            />
          </v-btn-toggle>
        </div>
      </div>
    </div>
    <template #extension>
      <div class="post-rank-extension">
        <TGameNav v-if="gid" :gid class="post-rank-games" />
      </div>
    </template>
  </v-app-bar>

  <Transition :css="false" mode="out-in" @leave="leaveFlow" @after-leave="finishLeave">
    <VpRankPostFlow
      v-if="posts.length && !flowLeaving"
      :key="flowVersion"
      :posts
      @image-click="showCoverPreview"
      @user-click="showAuthor"
    />
  </Transition>
  <template v-if="!posts.length && !flowLeaving">
    <TStatePanel v-if="loading" message="正在加载榜单…" variant="loading" />
    <TStatePanel v-else-if="failed" message="榜单加载失败" variant="error" @retry="refresh" />
    <TStatePanel
      v-else-if="!nextCursor"
      :message="periods.length ? '暂无上榜帖子' : '当前版块暂无榜单'"
      icon="mdi-trophy-outline"
      variant="empty"
    />
  </template>
  <div
    v-if="!flowLeaving && nextCursor && (posts.length || !failed)"
    ref="rankMore"
    class="post-rank-more"
  >
    <v-btn :loading type="button" variant="text" @click="loadMore">
      {{ failed ? "重试加载更多" : "加载更多" }}
    </v-btn>
  </div>
  <VpOverlayUser v-model="showUser" :gid :uid="authorUid" />
  <Teleport to="body">
    <VpOverlayImage
      v-if="previewCover && previewImage"
      :key="previewCover.url"
      v-model="showImage"
      :format="previewFormat"
      :image="previewImage"
      :link="previewCover.url"
      :ori="true"
    />
  </Teleport>
</template>

<script lang="ts" setup>
import TGameNav from "@comp/app/t-gameNav.vue";
import TStatePanel from "@comp/app/t-state-panel.vue";
import type { TpImage } from "@comp/viewPost/tp-image.vue";
import VpOverlayImage from "@comp/viewPost/vp-overlay-image.vue";
import VpOverlayUser from "@comp/viewPost/vp-overlay-user.vue";
import VpRankPostFlow from "@comp/viewPost/vp-rank-post-flow.vue";
import forumRankReq from "@req/forumRankReq.js";
import useBBSStore from "@store/bbs.js";
import { getImageRankOptions } from "@utils/bbs/forumRank.js";
import { getRankMasonryTimings } from "@utils/bbs/forumRankMasonry.js";
import TGHttps from "@utils/network/TGHttps.js";
import TGLogger from "@utils/system/TGLogger.js";
import { storeToRefs } from "pinia";
import { computed, onMounted, onScopeDispose, ref, shallowRef, useTemplateRef, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import type { RouteLocationRaw } from "vue-router";

const route = useRoute();
const router = useRouter();
const bbsStore = useBBSStore();
const { forumList, gameList } = storeToRefs(bbsStore);

const gid = computed<number>(() => Number(route.params.gid) || 0);
const forumId = computed<number>(() => Number(route.params.forum) || 0);
const catalog = shallowRef<Map<number, Array<TGApp.BBS.Forum.ImageRankForum>>>(new Map());
const catalogLoading = ref<boolean>(true);
const incompleteCatalog = ref<boolean>(false);
const rankedGames = computed<Array<TGApp.BBS.Game.Item>>(() =>
  gameList.value.filter((game) => catalog.value.get(game.id)?.length),
);
const currentGameForums = computed<Array<TGApp.BBS.Forum.GameForumItem>>(
  () => forumList.value.find((item) => item.game_id === gid.value)?.forums ?? [],
);
const forum = computed<TGApp.BBS.Forum.GameForumItem | undefined>(() =>
  currentGameForums.value.find((item) => item.id === forumId.value),
);
const rankForum = computed<TGApp.BBS.Forum.ImageRankForum | undefined>(() =>
  catalog.value.get(gid.value)?.find((item) => item.forum_id === forumId.value),
);
const rankedForums = computed<Array<{ id: number; name: string; icon: string | undefined }>>(() =>
  (catalog.value.get(gid.value) ?? []).map((item) => {
    const board = currentGameForums.value.find((candidate) => candidate.id === item.forum_id);
    return {
      id: item.forum_id,
      name: board?.name ?? item.post_image_list_name,
      icon: board?.icon_pure,
    };
  }),
);
const forumRoute = computed<RouteLocationRaw>(() => ({
  name: "酒馆",
  params: gid.value && forumId.value ? { gid: gid.value, forum: forumId.value } : {},
}));
const periods = computed<Array<{ title: string; value: number; icon: string }>>(() =>
  getImageRankOptions(rankForum.value?.typeList ?? []),
);
const preferredPeriod = ref<number>();
const period = computed<number | undefined>({
  get: () =>
    periods.value.find((item) => item.value === preferredPeriod.value)?.value ??
    periods.value[0]?.value,
  set: (value) => (preferredPeriod.value = value),
});
const posts = shallowRef<Array<TGApp.BBS.Forum.ImageRankPost>>([]);
const nextCursor = ref<string>();
const rankMore = useTemplateRef<HTMLDivElement>("rankMore");
const postLoading = ref<boolean>(false);
const postFailed = ref<boolean>(false);
const flowVersion = ref<number>(0);
const flowLeaving = ref<boolean>(false);
const showUser = ref<boolean>(false);
const authorUid = ref<string>("");
const showImage = ref<boolean>(false);
const previewCover = shallowRef<TGApp.BBS.Forum.ImageRankCover>();
const previewFormat = ref<string>("png");
const previewImage = computed<TpImage | undefined>(() => {
  const cover = previewCover.value;
  if (!cover) return undefined;
  return {
    insert: { image: cover.url },
    attributes:
      cover.width > 0 && cover.height > 0
        ? { width: cover.width, height: cover.height }
        : undefined,
  };
});
const loading = computed<boolean>(
  () => postLoading.value || (catalogLoading.value && !catalog.value.has(gid.value)),
);
const failed = computed<boolean>(
  () =>
    postFailed.value || (!catalogLoading.value && gid.value > 0 && !catalog.value.has(gid.value)),
);
let catalogRequest: AbortController | undefined;
let request: AbortController | undefined;

onMounted(() => void loadCatalog());
onScopeDispose(() => {
  catalogRequest?.abort();
  request?.abort();
});

watch([gid, forumId, period], () => {
  showUser.value = false;
  showImage.value = false;
  if (period.value !== undefined) {
    void loadPosts();
    return;
  }
  request?.abort();
  posts.value = [];
  nextCursor.value = undefined;
  postLoading.value = false;
  postFailed.value = false;
});

watch(
  [rankMore, nextCursor],
  ([element, cursor], _, onCleanup) => {
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (
        entry?.isIntersecting &&
        rankMore.value === element &&
        nextCursor.value === cursor &&
        !failed.value
      ) {
        loadMore();
      }
    });
    observer.observe(element);
    onCleanup(() => observer.disconnect());
  },
  { flush: "post" },
);

async function loadCatalog(): Promise<void> {
  catalogRequest?.abort();
  catalogRequest = new AbortController();
  const { signal } = catalogRequest;
  catalogLoading.value = true;
  catalog.value = new Map();
  const next = new Map<number, Array<TGApp.BBS.Forum.ImageRankForum>>();
  const loadGameCatalog = async (gameId: number): Promise<void> => {
    try {
      const resp = await forumRankReq.imageForums(gameId, signal);
      if (signal.aborted) return;
      if (resp.retcode !== 0) throw new Error(`[${resp.retcode}] ${resp.message}`);
      next.set(
        gameId,
        resp.data.list.filter((item) => getImageRankOptions(item.typeList).length),
      );
      catalog.value = new Map(next);
    } catch (error) {
      if (!signal.aborted) {
        void TGLogger.Warn(`[PostForumRank] 获取榜单目录失败：${TGHttps.getErrMsg(error)}`);
      }
    }
  };
  const activeGame = gid.value;
  const first =
    Number.isSafeInteger(activeGame) && activeGame > 0 ? loadGameCatalog(activeGame) : undefined;
  const metadata = await Promise.allSettled([
    gameList.value.length ? undefined : bbsStore.refreshGameList(),
    forum.value ? undefined : bbsStore.refreshForumList(),
  ]);
  if (signal.aborted) return;
  const ids = new Set(gameList.value.map((game) => game.id));
  if (Number.isSafeInteger(gid.value) && gid.value > 0) ids.add(gid.value);
  if (first) ids.add(activeGame);
  const remaining = [...ids].filter((id) => id !== activeGame || !first);
  await Promise.all([first, ...remaining.map(loadGameCatalog)]);
  if (signal.aborted) return;

  incompleteCatalog.value =
    next.size < ids.size ||
    !gameList.value.length ||
    metadata.some((item) => item.status === "rejected");
  catalogLoading.value = false;
}

async function loadPosts(cursor: string = "0"): Promise<void> {
  const type = period.value;
  if (type === undefined) return;
  request?.abort();
  request = new AbortController();
  const { signal } = request;
  postLoading.value = true;
  postFailed.value = false;
  if (cursor === "0") {
    if (!posts.value.length && !flowLeaving.value) window.scrollTo({ top: 0, behavior: "instant" });
    flowVersion.value++;
    posts.value = [];
    nextCursor.value = undefined;
  }
  try {
    const resp = await forumRankReq.imagePosts(forumId.value, type, cursor, signal);
    if (signal.aborted) return;
    if (resp.retcode !== 0) throw new Error(`[${resp.retcode}] ${resp.message}`);
    const { list, is_last, last_id } = resp.data;
    const byId = new Map(posts.value.map((post) => [post.post.post_id, post]));
    for (const post of list) {
      if (!byId.has(post.post.post_id)) byId.set(post.post.post_id, post);
    }
    posts.value = [...byId.values()];
    const next = String(last_id);
    nextCursor.value = !is_last && next && next !== "0" && next !== cursor ? next : undefined;
  } catch (e) {
    if (signal.aborted) return;
    postFailed.value = true;
    await TGLogger.Warn(`[PostForumRank] 获取榜单帖子失败：${TGHttps.getErrMsg(e)}`);
  } finally {
    if (!signal.aborted) postLoading.value = false;
  }
}

function refresh(): void {
  if (loading.value) return;
  if (period.value === undefined || incompleteCatalog.value) void loadCatalog();
  else void loadPosts();
}

function loadMore(): void {
  if (loading.value || flowLeaving.value || !nextCursor.value) return;
  void loadPosts(nextCursor.value);
}

function leaveFlow(element: Element, done: () => void): void {
  flowLeaving.value = true;
  element.setAttribute("data-rank-flow-leaving", "");
  if (
    typeof element.animate !== "function" ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    done();
    return;
  }
  const cards = [...element.querySelectorAll(".rank-flow-cell-visible")];
  const timings = getRankMasonryTimings(cards.length, 800);
  const animations = cards.map(
    (card, index) =>
      card.animate(
        [
          { opacity: 1, transform: "translateY(0) scale(1)" },
          { opacity: 0, transform: "translateY(-28px) scale(0.94)" },
        ],
        {
          ...timings[index],
          easing: "ease-in-out",
          fill: "forwards",
        },
      ).finished,
  );
  void Promise.allSettled(animations).then(() => done());
}

function finishLeave(): void {
  window.scrollTo({ top: 0, behavior: "instant" });
  flowLeaving.value = false;
}

function showAuthor(uid: string): void {
  showImage.value = false;
  authorUid.value = uid;
  showUser.value = true;
}

function showCoverPreview(cover: TGApp.BBS.Forum.ImageRankCover): void {
  if (!URL.canParse(cover.url)) return;
  const url = new URL(cover.url);
  if (url.protocol !== "https:" && url.protocol !== "http:") return;
  url.searchParams.delete("x-oss-process");
  previewCover.value = { ...cover, url: url.href };
  previewFormat.value = url.pathname.match(/\.([a-z0-9]+)$/i)?.[1].toLowerCase() ?? "png";
  showUser.value = false;
  showImage.value = true;
}

async function changeGame(gameId: number): Promise<void> {
  if (gameId === gid.value) return;
  const forums = catalog.value.get(gameId);
  const previousName = rankForum.value?.post_image_list_name;
  const target = forums?.find((item) => item.post_image_list_name === previousName) ?? forums?.[0];
  if (!target) return;
  await router.push({ name: "版块榜单", params: { gid: gameId, forum: target.forum_id } });
}

async function changeForum(id: number): Promise<void> {
  if (id === forumId.value || !rankedForums.value.some((item) => item.id === id)) return;
  await router.push({ name: "版块榜单", params: { gid: gid.value, forum: id } });
}
</script>

<style lang="scss" scoped>
.post-rank-heading {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
  margin-inline: 8px;

  h1 {
    overflow: hidden;
    margin: 0;
    color: var(--common-text-title);
    font-family: var(--font-title);
    font-size: 20px;
    font-weight: normal;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.post-rank-actions {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
  margin-inline: auto 16px;
}

.post-rank-filters {
  display: flex;
  min-width: 0;
  align-items: center;
  padding: 2px;
  gap: 12px;
  overflow-x: auto;
  scrollbar-width: none;
}

.post-rank-toggle {
  height: 36px;
  flex-shrink: 0;

  img {
    width: 24px;
    height: 24px;
    object-fit: contain;
  }
}

.post-rank-filter-group {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 6px;

  > span {
    color: var(--box-text-4);
    font-size: 12px;
    white-space: nowrap;
  }
}

.post-rank-refresh {
  height: 40px;
  flex-shrink: 0;
  background: var(--tgc-btn-1);
  color: var(--btn-text);
  font-family: var(--font-title);
  font-weight: normal;
}

.post-rank-extension {
  display: flex;
  width: 100%;
  min-width: 0;
  height: 100%;
  align-items: center;
  padding-inline: 8px 16px;

  > .post-rank-games {
    padding: 0;
  }
}

.post-rank-more {
  display: flex;
  justify-content: center;
  padding: 8px 0 16px;
}
</style>
