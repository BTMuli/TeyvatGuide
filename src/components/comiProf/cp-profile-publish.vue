<template>
  <v-menu
    v-model="publishMenuVisible"
    :close-on-content-click="false"
    location="bottom start"
    offset="4"
  >
    <template #activator="{ props: menuProps }">
      <v-btn
        v-bind="menuProps"
        aria-label="发帖"
        icon="mdi-pencil-plus-outline"
        size="x-small"
        title="发帖"
        variant="text"
      />
    </template>
    <div aria-label="发帖选项" class="community-profile-publish-menu" role="group">
      <div class="community-profile-publish-heading">
        <span>发布分区</span>
        <strong>{{ publishGame.name }}</strong>
      </div>
      <div aria-label="选择发帖分区" class="community-profile-publish-games" role="group">
        <button
          v-for="game in gameOptions"
          :key="game.id"
          :aria-label="`发帖分区：${game.name}`"
          :aria-pressed="publishGid === game.id"
          :class="{ dimmed: publishGid !== game.id }"
          :title.attr="game.name"
          class="community-profile-game-choice"
          type="button"
          @click="selectPublishGame(game.id)"
        >
          <img v-if="game.icon" :alt="`${game.name}图标`" :src="game.icon" />
          <v-icon v-else aria-hidden="true" size="24">mdi-gamepad-variant-outline</v-icon>
        </button>
      </div>
      <div aria-label="选择发布版块" class="community-profile-publish-forums" role="group">
        <span class="community-profile-publish-label">版块</span>
        <span v-if="publishForumsLoading" class="community-profile-publish-status" role="status">
          正在加载版块…
        </span>
        <div v-else-if="publishForumsError" class="community-profile-publish-status" role="alert">
          <span :title="publishForumsError">版块加载失败</span>
          <button type="button" @click="loadPublishForums(true)">重试</button>
        </div>
        <template v-else>
          <button
            v-for="forum in publishForums"
            :key="forum.id"
            :aria-pressed="publishForum?.id === forum.id"
            :class="{ selected: publishForum?.id === forum.id }"
            :title.attr="forum.name"
            class="community-profile-publish-forum"
            type="button"
            @click="publishForumId = forum.id"
          >
            <img v-if="forum.icon_pure || forum.icon" :src="forum.icon_pure || forum.icon" alt="" />
            <v-icon v-else aria-hidden="true" size="16">mdi-forum-outline</v-icon>
            <span>{{ forum.name }}</span>
          </button>
          <span
            v-if="publishForums.length === 0"
            class="community-profile-publish-status"
            role="status"
          >
            当前分区暂无可发布版块
          </span>
        </template>
      </div>
      <div class="community-profile-publish-types">
        <button
          :disabled="!canPublishType(1)"
          class="community-profile-publish-type"
          type="button"
          @click="newPost(1)"
        >
          <v-icon aria-hidden="true" size="20">mdi-text-box-plus-outline</v-icon>
          <span>发布长文</span>
        </button>
        <button
          :disabled="!canPublishType(2)"
          class="community-profile-publish-type"
          type="button"
          @click="newPost(2)"
        >
          <v-icon aria-hidden="true" size="20">mdi-image-plus-outline</v-icon>
          <span>发布图文</span>
        </button>
      </div>
      <span
        v-if="canPublishType(2) && !canPublishType(1)"
        class="community-profile-publish-status"
        role="status"
      >
        当前版块仅支持图文
      </span>
    </div>
  </v-menu>
</template>

<script lang="ts" setup>
import { useCommunityProfile } from "@hooks/useCommunityProfile.js";
import apiHubReq from "@req/apiHubReq.js";
import useBBSStore from "@store/bbs.js";
import { canPublishForumPost } from "@utils/bbs/postPublish.js";
import TGHttps from "@utils/network/TGHttps.js";
import { storeToRefs } from "pinia";
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { useRouter } from "vue-router";

const { selectedGid, gameOptions, currentGame } = useCommunityProfile();
const router = useRouter();
const bbsStore = useBBSStore();
const { forumList } = storeToRefs(bbsStore);
const publishMenuVisible = ref<boolean>(false);
const publishGid = ref<number>(currentGame.value.id);
const publishForumId = ref<number>();
const publishForumsLoading = ref<boolean>(false);
const publishForumsError = ref<string>("");
const publishForums = computed<Array<TGApp.BBS.Forum.GameForumItem>>(() =>
  (forumList.value.find((item) => item.game_id === publishGid.value)?.forums ?? []).filter(
    (forum) => canPublishForumPost(forum, 2),
  ),
);
const publishGame = computed<TGApp.BBS.Profile.GameOption>(
  () => gameOptions.value.find((item) => item.id === publishGid.value) ?? currentGame.value,
);
const publishForum = computed<TGApp.BBS.Forum.GameForumItem | undefined>(
  () =>
    publishForums.value.find((forum) => forum.id === publishForumId.value) ??
    publishForums.value[0],
);
let active = true;
let requestVersion = 0;

watch(publishMenuVisible, (visible) => {
  if (visible) selectPublishGame(selectedGid.value);
});
watch(selectedGid, (gid) => {
  if (!publishMenuVisible.value) {
    publishGid.value = gid;
    publishForumId.value = undefined;
  }
});

onBeforeUnmount(() => {
  active = false;
  requestVersion += 1;
});

function selectPublishGame(gid: number): void {
  requestVersion += 1;
  publishForumsLoading.value = false;
  publishForumsError.value = "";
  publishGid.value = gid;
  publishForumId.value = undefined;
  void loadPublishForums();
}

async function loadPublishForums(force: boolean = false): Promise<void> {
  if (publishForumsLoading.value) return;
  if (
    !force &&
    forumList.value.some((item) => item.game_id === publishGid.value) &&
    !forumList.value.some((item) => item.forums.some((forum) => forum.view_type === undefined))
  ) {
    publishForumsError.value = "";
    return;
  }
  const version = ++requestVersion;
  publishForumsLoading.value = true;
  publishForumsError.value = "";
  try {
    const response = await apiHubReq.forum();
    if (!active || version !== requestVersion) return;
    if (response.retcode !== 0) throw new Error(`[${response.retcode}] ${response.message}`);
    bbsStore.forumList = response.data.list;
  } catch (cause) {
    if (active && version === requestVersion) publishForumsError.value = TGHttps.getErrMsg(cause);
  } finally {
    if (active && version === requestVersion) publishForumsLoading.value = false;
  }
}

function canPublishType(viewType: 1 | 2): boolean {
  const forum = publishForum.value;
  return (
    !publishForumsLoading.value &&
    publishForumsError.value === "" &&
    forum !== undefined &&
    canPublishForumPost(forum, viewType)
  );
}

async function newPost(viewType: 1 | 2): Promise<void> {
  const forum = publishForum.value;
  if (forum === undefined || !canPublishType(viewType)) return;
  publishMenuVisible.value = false;
  await router.push({
    name: "新建帖子",
    params: { gid: String(publishGid.value), viewType: String(viewType) },
    query: { from: "profile", forum: String(forum.id) },
  });
}
</script>

<style lang="scss" scoped>
.community-profile-game-choice {
  display: flex;
  width: 24px;
  height: 24px;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  border-radius: 4px;
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

.community-profile-publish-menu {
  display: flex;
  width: 280px;
  max-width: calc(100vw - 32px);
  box-sizing: border-box;
  flex-direction: column;
  padding: 12px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 12px;
  background: var(--app-page-bg);
  box-shadow: 0 4px 16px var(--common-shadow-1);
  gap: 12px;
}

.community-profile-publish-heading {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  color: var(--app-page-content);
  font-size: 12px;
  gap: 8px;
  line-height: 20px;

  span {
    flex-shrink: 0;
  }

  strong {
    overflow: hidden;
    min-width: 0;
    color: var(--common-text-title);
    font-size: 14px;
    font-weight: 600;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.community-profile-publish-games {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.community-profile-publish-forums {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
}

.community-profile-publish-label,
.community-profile-publish-status {
  color: var(--app-page-content);
  font-size: 12px;
  line-height: 20px;
}

.community-profile-publish-label {
  flex-shrink: 0;
  margin-right: 4px;
}

.community-profile-publish-status {
  display: flex;
  align-items: center;
  gap: 8px;

  button {
    color: var(--box-text-8);
    cursor: pointer;
    text-decoration: underline;
    text-underline-offset: 2px;
  }
}

.community-profile-publish-forum {
  display: inline-flex;
  max-width: 100%;
  align-items: center;
  padding: 2px 8px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
  background: transparent;
  color: var(--box-text-1);
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  gap: 4px;
  line-height: 20px;
  overflow-wrap: anywhere;

  img {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    object-fit: contain;
  }

  &:hover {
    background: var(--box-bg-3);
  }

  &.selected {
    border-color: var(--common-shadow-2);
    background: var(--box-bg-2);
    color: var(--common-text-title);
  }

  &:focus-visible {
    outline: 2px solid var(--tgc-od-orange);
    outline-offset: 2px;
  }
}

.community-profile-publish-types {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.community-profile-publish-type {
  display: flex;
  min-width: 0;
  min-height: 44px;
  align-items: center;
  justify-content: center;
  padding: 8px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
  background: var(--box-bg-1);
  color: var(--box-text-1);
  cursor: pointer;
  font: inherit;
  font-size: 14px;
  gap: 8px;
  line-height: 20px;
  transition:
    background-color 120ms ease,
    border-color 120ms ease;
  white-space: nowrap;

  &:focus-visible {
    outline: 2px solid var(--tgc-od-orange);
    outline-offset: 2px;
  }

  &:disabled {
    cursor: default;
    opacity: 0.45;
  }

  &:hover:not(:disabled) {
    border-color: var(--common-shadow-2);
    background: var(--box-bg-3);
  }

  &:active:not(:disabled) {
    background: var(--box-bg-2);
  }
}
</style>
