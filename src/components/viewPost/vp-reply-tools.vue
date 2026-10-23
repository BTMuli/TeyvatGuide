<!-- 回复扩展工具：默认表情、图片和用户提及 -->
<template>
  <div class="vprt-tools">
    <div aria-label="回复扩展工具" class="vprt-toolbar" role="group">
      <v-menu
        v-model="emojiOpen"
        :close-on-content-click="false"
        :disabled="disabled"
        location="start top"
        offset="8"
        open-on-click
        origin="end top"
        @update:model-value="handleEmojiOpen"
      >
        <template #activator="{ props: menuProps }">
          <button
            v-bind="menuProps"
            :aria-expanded="emojiOpen"
            :disabled="disabled"
            aria-haspopup="true"
            aria-label="插入表情"
            class="vprt-tool"
            title="插入表情"
            type="button"
          >
            <v-icon size="20">mdi-emoticon-happy-outline</v-icon>
          </button>
        </template>
        <div aria-label="表情面板" class="vprt-panel vprt-panel--emoji" role="region">
          <div class="vprt-heading">
            <span class="vprt-panel-title">选择表情</span>
            <button
              aria-label="收起表情"
              class="vprt-action"
              title="收起表情"
              type="button"
              @click="closePanel"
            >
              <v-icon size="18">mdi-close</v-icon>
            </button>
          </div>
          <div class="vprt-body">
            <div aria-label="表情系列" class="vprt-series">
              <button
                :aria-pressed="favoriteSelected"
                :disabled="disabled"
                aria-label="收藏表情"
                class="vprt-series-item"
                title="收藏表情"
                type="button"
                @click="favoriteSelected = true"
              >
                <v-icon size="24">mdi-star-outline</v-icon>
              </button>
              <v-tooltip
                v-for="series in emojiSeries"
                :key="series.id"
                :text="series.name"
                location="end"
              >
                <template #activator="{ props: tooltipProps }">
                  <button
                    v-bind="tooltipProps"
                    :aria-label="series.name"
                    :aria-pressed="!favoriteSelected && selectedSeries === series.id"
                    :disabled="disabled"
                    class="vprt-series-item"
                    type="button"
                    @click="selectSeries(series.id)"
                  >
                    <img :alt="series.name" :src="series.icon" loading="lazy" />
                  </button>
                </template>
              </v-tooltip>
            </div>
            <div class="vprt-content">
              <VpCustomEmoticons
                v-if="favoriteSelected && emojiOpen"
                :contextId="props.contextId"
                :cookie="props.cookie"
                :disabled
                @select="insertCustomEmoticon"
              />
              <div v-else-if="emojiLoading" aria-live="polite" class="vprt-status" role="status">
                正在加载表情…
              </div>
              <div v-else-if="emojiError" class="vprt-status" role="alert">
                <span>{{ emojiError }}</span>
                <button
                  :disabled="emojiLoading"
                  class="vprt-action"
                  type="button"
                  @click="loadEmoji"
                >
                  重试
                </button>
              </div>
              <div v-else-if="emojiItems.length === 0" class="vprt-status">暂无可用表情</div>
              <div v-else aria-label="表情列表" class="vprt-grid">
                <button
                  v-for="emoji in emojiItems"
                  :key="emoji.id"
                  :aria-label="emoji.name"
                  :disabled="disabled"
                  :title="emoji.name"
                  class="vprt-emoji"
                  type="button"
                  @click="emits('emoticon', emoji)"
                >
                  <img :alt="emoji.name" :src="emoji.icon" loading="lazy" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </v-menu>
      <button
        :disabled="disabled || !replyAssetCapabilities.imageUpload"
        aria-label="添加图片"
        :title="replyAssetCapabilities.imageUpload ? '添加图片' : '图片暂不可用'"
        class="vprt-tool"
        type="button"
        @click="openImagePicker"
      >
        <v-icon size="20">mdi-image-outline</v-icon>
      </button>
      <v-menu
        v-model="mentionOpen"
        :close-on-content-click="false"
        :disabled="disabled || !replyAssetCapabilities.mention"
        location="start top"
        offset="8"
        open-on-click
        origin="end top"
        @update:model-value="handleMentionOpen"
      >
        <template #activator="{ props: menuProps }">
          <button
            v-bind="menuProps"
            :aria-expanded="mentionOpen"
            :disabled="disabled || !replyAssetCapabilities.mention"
            aria-haspopup="true"
            aria-label="提及用户"
            class="vprt-tool"
            title="提及用户"
            type="button"
          >
            <v-icon size="20">mdi-at</v-icon>
          </button>
        </template>
        <div aria-label="提及用户面板" class="vprt-panel vprt-panel--mention" role="region">
          <div class="vprt-heading">
            <span class="vprt-panel-title">提及用户</span>
            <button
              aria-label="收起用户查找"
              class="vprt-action"
              title="收起用户查找"
              type="button"
              @click="closePanel"
            >
              <v-icon size="18">mdi-close</v-icon>
            </button>
          </div>
          <div class="vprt-lookup">
            <v-text-field
              v-model="mentionQuery"
              :disabled="disabled || mentionLoading"
              density="compact"
              hide-details
              label="米游社完整昵称"
              variant="outlined"
              @keydown.enter.prevent="lookupMention"
            />
            <v-btn
              :disabled="disabled || !mentionQuery.trim()"
              :loading="mentionLoading"
              size="small"
              variant="tonal"
              @click="lookupMention"
              >查找</v-btn
            >
          </div>
          <div v-if="mentionError" class="vprt-status" role="alert">
            {{ mentionError }}
          </div>
          <div v-if="mentionResult" class="vprt-result">
            <span>{{ mentionResult.nickname }} · UID {{ mentionResult.uid }}</span>
            <v-btn :disabled="disabled" size="small" variant="tonal" @click="insertMention">
              插入 @
            </v-btn>
          </div>
        </div>
      </v-menu>
      <v-menu
        v-model="gameUidOpen"
        :close-on-content-click="false"
        :disabled="disabled || !props.cookie"
        location="start top"
        offset="8"
        open-on-click
        origin="end top"
        @update:model-value="handleGameUidOpen"
      >
        <template #activator="{ props: menuProps }">
          <button
            v-bind="menuProps"
            :aria-expanded="gameUidOpen"
            :disabled="disabled || !props.cookie"
            aria-haspopup="true"
            aria-label="插入 UID 卡片"
            class="vprt-tool"
            :title="props.cookie ? '插入 UID 卡片' : '请先登录米游社账号'"
            type="button"
          >
            <v-icon size="20">mdi-card-account-details-outline</v-icon>
          </button>
        </template>
        <div aria-label="UID 卡片面板" class="vprt-panel vprt-panel--uid" role="region">
          <div class="vprt-heading">
            <span class="vprt-panel-title">选择游戏账号</span>
            <button
              aria-label="收起 UID 卡片"
              class="vprt-action"
              title="收起 UID 卡片"
              type="button"
              @click="closePanel"
            >
              <v-icon size="18">mdi-close</v-icon>
            </button>
          </div>
          <div v-if="gameUidLoading" aria-live="polite" class="vprt-status" role="status">
            正在加载绑定游戏账号…
          </div>
          <div v-else-if="gameUidError" class="vprt-status" role="alert">
            <span>{{ gameUidError }}</span>
            <button class="vprt-action" type="button" @click="loadGameUidAccounts">重试</button>
          </div>
          <div v-else-if="gameUidInfos.length === 0" class="vprt-status">
            当前分区暂无可用的绑定游戏账号
          </div>
          <div v-else aria-label="当前分区绑定游戏账号列表" class="vprt-game-list">
            <button
              v-for="card in gameUidInfos"
              :key="`${card.game_biz}:${card.game_uid}`"
              :aria-label="`${card.game_name}，UID ${card.game_uid}，${card.nickname}，${card.region_name}`"
              :disabled="disabled"
              class="vprt-game-item"
              type="button"
              @click="insertGameUid(card)"
            >
              <TpUid :copyable="false" :data="{ insert: { game_user_info: card } }" />
            </button>
          </div>
        </div>
      </v-menu>
      <input
        ref="fileInput"
        :disabled="disabled || !replyAssetCapabilities.imageUpload"
        accept="image/jpeg,image/png,image/gif,image/webp"
        hidden
        type="file"
        @cancel="clearImagePicker"
        @change="selectImage"
      />
    </div>
    <div v-if="uploading" aria-live="polite" class="vprt-status vprt-upload-status" role="status">
      <span>正在上传图片…</span>
      <button class="vprt-action" type="button" @click="cancelUpload">取消上传</button>
    </div>
  </div>
</template>
<script lang="ts" setup>
import showSnackbar from "@comp/func/snackbar.js";
import { useReplyInteraction } from "@hooks/useReplyInteraction.js";
import bbsReq from "@req/bbsReq.js";
import replyAssetReq, { replyAssetCapabilities } from "@req/replyAssetReq.js";
import takumiReq from "@req/takumiReq.js";
import useBBSStore from "@store/bbs.js";
import { getGameUidInfos, validateGameUidCookie } from "@utils/bbsGameUid.js";
import { executeReplyForCurrentAccount, matchesCurrentAccount } from "@utils/bbsReplyAccount.js";
import { storeToRefs } from "pinia";
import { computed, onBeforeUnmount, ref, useTemplateRef, watch } from "vue";

import TpUid from "./tp-uid.vue";
import VpCustomEmoticons from "./vp-custom-emoticons.vue";

type ReplyToolsProps = {
  disabled: boolean;
  contextId: number;
  gid: number;
  cookie?: TGApp.App.Account.Cookie;
};

/**
 * 打开图片选择器时的账号与帖子上下文
 * @since Beta v0.12.6
 */
type ImagePickerContext = {
  version: number;
  gid: number;
  cookie: TGApp.App.Account.LoginCookie;
};

/**
 * UID 卡片请求所需的账号上下文
 * @since Beta v0.12.6
 */
type GameUidCookie = TGApp.App.Account.Cookie;

const props = defineProps<ReplyToolsProps>();
const emits = defineEmits<{
  customEmoticon: [value: TGApp.BBS.CustomEmoticon.Value];
  emoticon: [emoji: TGApp.BBS.Emoji.Item];
  gameUid: [value: TGApp.BBS.GameUid.Info];
  mention: [user: TGApp.BBS.ReplyAsset.Mention];
  image: [image: TGApp.BBS.ReplyAsset.UploadedImage];
}>();
const interaction = useReplyInteraction();
const { gameList } = storeToRefs(useBBSStore());
const fileInput = useTemplateRef<HTMLInputElement>("fileInput");
const emojiOpen = ref<boolean>(false);
const mentionOpen = ref<boolean>(false);
const gameUidOpen = ref<boolean>(false);
const emojiSeries = ref<Array<TGApp.BBS.Emoji.Series>>([]);
const selectedSeries = ref<number>();
const favoriteSelected = ref<boolean>(false);
const emojiLoading = ref<boolean>(false);
const emojiError = ref<string>("");
const mentionQuery = ref<string>("");
const mentionResult = ref<TGApp.BBS.ReplyAsset.Mention>();
const mentionLoading = ref<boolean>(false);
const mentionError = ref<string>("");
const gameUidAccounts = ref<Array<TGApp.BBS.Game.Account>>([]);
const gameUidLoading = ref<boolean>(false);
const gameUidError = ref<string>("");
const uploading = ref<boolean>(false);
let mentionController: AbortController | undefined;
let uploadController: AbortController | undefined;
let imagePickerContext: ImagePickerContext | undefined;
let contextVersion = 0;
let mounted = true;

const emojiItems = computed<Array<TGApp.BBS.Emoji.Item>>(() =>
  (emojiSeries.value.find((series) => series.id === selectedSeries.value)?.list ?? [])
    .filter((emoji) => emoji.is_available && !!emoji.icon)
    .toSorted((a, b) => a.sort_order - b.sort_order),
);

const gameUidInfos = computed<Array<TGApp.BBS.GameUid.Info>>(() =>
  getGameUidInfos(gameUidAccounts.value, gameList.value, props.gid),
);

watch(mentionQuery, () => {
  cancelMention();
  mentionResult.value = undefined;
  mentionError.value = "";
});

watch(
  () => [
    props.contextId,
    props.gid,
    props.cookie?.ltuid,
    props.cookie?.ltoken,
    props.cookie?.account_id,
    props.cookie?.cookie_token,
  ],
  resetContext,
  { flush: "sync" },
);
watch(
  () => props.disabled,
  (disabled) => {
    if (disabled) closePanel();
  },
);

onBeforeUnmount(() => {
  mounted = false;
  resetContext();
});

function resetContext(): void {
  contextVersion += 1;
  favoriteSelected.value = false;
  closePanel();
  cancelUpload();
  clearImagePicker();
  mentionQuery.value = "";
  mentionResult.value = undefined;
  mentionError.value = "";
  gameUidAccounts.value = [];
  gameUidError.value = "";
  gameUidLoading.value = false;
  emojiLoading.value = false;
}

function closePanel(): void {
  emojiOpen.value = false;
  mentionOpen.value = false;
  gameUidOpen.value = false;
  cancelMention();
}

function cancelMention(): void {
  mentionController?.abort();
  mentionController = undefined;
  mentionLoading.value = false;
}

function selectSeries(id: number): void {
  favoriteSelected.value = false;
  selectedSeries.value = id;
}

function insertCustomEmoticon(value: TGApp.BBS.CustomEmoticon.Value): void {
  if (props.disabled) return;
  emits("customEmoticon", value);
  closePanel();
}

function cancelUpload(): void {
  uploadController?.abort();
}

function openImagePicker(): void {
  if (props.disabled || !replyAssetCapabilities.imageUpload || !props.cookie) return;
  const cookie = { ltoken: props.cookie.ltoken, ltuid: props.cookie.ltuid };
  if (!matchesCurrentAccount({ uid: cookie.ltuid, cookie })) {
    clearImagePicker();
    showSnackbar.warn("账号状态已变化，请重新打开帖子窗口");
    return;
  }
  imagePickerContext = {
    version: contextVersion,
    gid: props.gid,
    cookie,
  };
  fileInput.value?.click();
}

function clearImagePicker(): void {
  imagePickerContext = undefined;
  if (fileInput.value) fileInput.value.value = "";
}

function handleEmojiOpen(open: boolean): void {
  if (!open) return;
  mentionOpen.value = false;
  if (emojiSeries.value.length === 0) void loadEmoji();
}

function handleMentionOpen(open: boolean): void {
  if (open) emojiOpen.value = false;
}

function handleGameUidOpen(open: boolean): void {
  if (!open) return;
  emojiOpen.value = false;
  mentionOpen.value = false;
  if (gameUidAccounts.value.length === 0 && !gameUidLoading.value) {
    void loadGameUidAccounts();
  }
}

function getGameUidCookie(cookie: GameUidCookie): GameUidCookie {
  return validateGameUidCookie(cookie);
}

async function loadGameUidAccounts(): Promise<void> {
  if (props.disabled || gameUidLoading.value || !props.cookie) return;
  const version = contextVersion;
  let requestCookie: GameUidCookie;
  try {
    requestCookie = getGameUidCookie(props.cookie);
  } catch {
    gameUidError.value = "当前账号缺少绑定游戏账号所需凭据";
    return;
  }
  gameUidLoading.value = true;
  gameUidError.value = "";
  try {
    const execution = await executeReplyForCurrentAccount(
      {
        uid: requestCookie.ltuid,
        cookie: { ltoken: requestCookie.ltoken, ltuid: requestCookie.ltuid },
      },
      () => takumiReq.bind.gameRoles(requestCookie),
    );
    if (!mounted || version !== contextVersion) return;
    if (
      !execution.allowed ||
      !matchesCurrentAccount({
        uid: requestCookie.ltuid,
        cookie: { ltoken: requestCookie.ltoken, ltuid: requestCookie.ltuid },
      })
    ) {
      gameUidAccounts.value = [];
      gameUidError.value = "账号状态已变化，请重新打开帖子窗口";
      return;
    }
    if (execution.data.retcode !== 0 || !Array.isArray(execution.data.data?.list)) {
      throw new Error("绑定游戏账号响应无效");
    }
    gameUidAccounts.value = execution.data.data.list;
  } catch {
    if (mounted && version === contextVersion) {
      gameUidError.value = "绑定游戏账号加载失败，请重试";
    }
  } finally {
    if (mounted && version === contextVersion) gameUidLoading.value = false;
  }
}

function insertGameUid(info: TGApp.BBS.GameUid.Info): void {
  if (props.disabled) return;
  const current = gameUidInfos.value.find(
    (card) => card.game_biz === info.game_biz && card.game_uid === info.game_uid,
  );
  if (!current) return;
  emits("gameUid", { ...current });
  closePanel();
}

async function loadEmoji(): Promise<void> {
  if (emojiLoading.value || props.disabled) return;
  const version = contextVersion;
  emojiLoading.value = true;
  emojiError.value = "";
  try {
    const response = await bbsReq.emojis();
    if (!mounted || version !== contextVersion) return;
    if (response.retcode !== 0) throw new Error("加载失败");
    emojiSeries.value = response.data.list
      .filter((series) => series.is_available && series.list.some((item) => item.is_available))
      .toSorted((a, b) => a.sort_order - b.sort_order);
    if (!emojiSeries.value.some((series) => series.id === selectedSeries.value)) {
      selectedSeries.value = emojiSeries.value[0]?.id;
    }
  } catch {
    if (mounted && version === contextVersion) emojiError.value = "表情加载失败，请重试";
  } finally {
    if (mounted && version === contextVersion) emojiLoading.value = false;
  }
}

async function lookupMention(): Promise<void> {
  const nickname = mentionQuery.value.trim();
  if (props.disabled || mentionLoading.value || !nickname || !props.cookie) return;
  const requestCookie = { ...props.cookie };
  const version = contextVersion;
  const controller = new AbortController();
  mentionController = controller;
  mentionResult.value = undefined;
  mentionError.value = "";
  mentionLoading.value = true;
  try {
    const execution = await executeReplyForCurrentAccount(
      {
        uid: requestCookie.ltuid,
        cookie: { ltoken: requestCookie.ltoken, ltuid: requestCookie.ltuid },
      },
      () => replyAssetReq.resolveMention(nickname, requestCookie, props.gid, controller.signal),
    );
    if (!mounted || version !== contextVersion || controller.signal.aborted) return;
    if (!execution.allowed) {
      mentionError.value = "账号状态已变化，请重新打开帖子窗口";
      return;
    }
    mentionResult.value = execution.data;
  } catch {
    if (mounted && version === contextVersion && !controller.signal.aborted) {
      mentionError.value = "查找失败，请检查完整昵称或稍后重试";
    }
  } finally {
    if (mentionController === controller) {
      mentionController = undefined;
      mentionLoading.value = false;
    }
  }
}

function insertMention(): void {
  if (props.disabled || !mentionResult.value) return;
  emits("mention", { ...mentionResult.value });
  closePanel();
}

async function selectImage(event: Event): Promise<void> {
  const input = event.target;
  if (!(input instanceof HTMLInputElement)) return;
  const file = input.files?.[0];
  input.value = "";
  const picker = imagePickerContext;
  imagePickerContext = undefined;
  if (
    !file ||
    props.disabled ||
    !replyAssetCapabilities.imageUpload ||
    !picker ||
    picker.version !== contextVersion
  )
    return;
  const requestCookie = picker.cookie;
  const version = picker.version;
  const controller = new AbortController();
  await interaction.run(async () => {
    uploadController = controller;
    uploading.value = true;
    try {
      const execution = await executeReplyForCurrentAccount(
        {
          uid: requestCookie.ltuid,
          cookie: { ltoken: requestCookie.ltoken, ltuid: requestCookie.ltuid },
        },
        () => replyAssetReq.uploadImage(file, requestCookie, picker.gid, controller.signal),
      );
      if (!mounted || version !== contextVersion || controller.signal.aborted) return;
      if (
        !execution.allowed ||
        !matchesCurrentAccount({
          uid: requestCookie.ltuid,
          cookie: requestCookie,
        })
      ) {
        showSnackbar.warn("账号状态已变化，请重新打开帖子窗口");
        return;
      }
      emits("image", execution.data);
    } catch (error) {
      if (mounted && version === contextVersion && !controller.signal.aborted) {
        showSnackbar.error(
          error instanceof Error ? error.message : "图片上传失败，请重新选择图片后重试",
        );
      }
    } finally {
      if (uploadController === controller) {
        uploadController = undefined;
        uploading.value = false;
      }
    }
  });
}
</script>
<style lang="scss" scoped>
.vprt-tools {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 8px;
}

.vprt-toolbar,
.vprt-heading,
.vprt-status,
.vprt-lookup,
.vprt-result {
  display: flex;
  align-items: center;
  gap: 8px;
}

.vprt-toolbar {
  width: fit-content;
  max-width: 100%;
  flex-wrap: wrap;
  align-self: flex-start;
  padding: 4px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--box-bg-4);
  gap: 4px;
}

.vprt-tool,
.vprt-action,
.vprt-series-item,
.vprt-emoji {
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: var(--app-page-content);
  cursor: pointer;
  font: inherit;
}

.vprt-tool {
  display: flex;
  width: 32px;
  height: 32px;
  box-sizing: border-box;
  flex: none;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 1px solid transparent;
  color: var(--box-text-2);
}

.vprt-tool[aria-expanded="true"] {
  border-color: var(--common-shadow-2);
  background: var(--app-page-bg);
  box-shadow: inset 0 -2px var(--tgc-btn-1);
  color: var(--common-text-title);
}

.vprt-panel {
  display: flex;
  overflow: hidden;
  width: 360px;
  max-width: calc(100vw - 24px);
  max-height: min(420px, 60vh);
  box-sizing: border-box;
  flex-direction: column;
  padding: 8px;
  border: 1px solid var(--common-shadow-2);
  border-radius: 8px;
  background: var(--app-page-bg);
  box-shadow: 0 8px 24px var(--common-shadow-2);
  gap: 8px;
  overscroll-behavior: contain;
}

.vprt-panel--emoji {
  width: 380px;
}

.vprt-panel--mention {
  overflow: auto;
  max-height: min(320px, 50vh);
}

.vprt-panel--uid {
  overflow: auto;
  max-height: min(360px, 52vh);
}

.dark .vprt-panel {
  box-shadow: 0 8px 24px var(--common-shadow-t-4);
}

.vprt-body {
  display: flex;
  overflow: hidden;
  min-height: 0;
  max-height: 300px;
  flex: 1 1 auto;
  align-items: stretch;
  gap: 8px;
}

.vprt-content {
  display: flex;
  overflow: hidden;
  min-width: 0;
  min-height: 0;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 8px;
}

.vprt-heading,
.vprt-result {
  justify-content: space-between;
}

.vprt-heading {
  min-height: 28px;
  padding-bottom: 4px;
  border-bottom: 1px solid var(--common-shadow-1);
}

.vprt-panel-title {
  color: var(--common-text-title);
  font-size: 14px;
  font-weight: 600;
}

.vprt-series {
  display: flex;
  overflow: hidden auto;
  width: 60px;
  max-height: 300px;
  box-sizing: border-box;
  flex: 0 0 60px;
  flex-direction: column;
  align-items: center;
  padding: 4px;
  gap: 4px;
  scrollbar-width: thin;

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

.vprt-series-item {
  display: flex;
  width: 44px;
  height: 44px;
  box-sizing: border-box;
  flex: 0 0 44px;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border: 1px solid transparent;
  color: var(--app-page-content);
}

.vprt-series-item[aria-pressed="true"] {
  border-color: var(--common-shadow-2);
  background: var(--box-bg-4);
  box-shadow: inset 0 -2px var(--tgc-btn-1);
}

.vprt-series-item img {
  width: 28px;
  height: 28px;
  object-fit: contain;
}

.vprt-grid {
  display: grid;
  overflow: hidden auto;
  min-height: 0;
  max-height: 300px;
  flex: 1 1 auto;
  align-content: start;
  padding: 4px;
  gap: 4px;
  grid-auto-rows: 44px;
  grid-template-columns: repeat(auto-fill, minmax(44px, 1fr));
  scrollbar-width: thin;

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

.vprt-emoji {
  display: grid;
  min-height: 44px;
  border: 1px solid transparent;
  place-items: center;
}

.vprt-emoji img {
  width: 36px;
  height: 36px;
  object-fit: contain;
}

.vprt-action {
  min-width: 28px;
  min-height: 28px;
  padding: 4px 6px;
}

.vprt-status,
.vprt-result {
  min-width: 0;
  padding: 4px 8px;
  border-radius: 4px;
  background: var(--box-bg-4);
  color: var(--app-page-content);
  font-size: 12px;
  line-height: 16px;
  overflow-wrap: anywhere;
}

.vprt-upload-status {
  box-sizing: border-box;
  padding: 8px 12px;
  border: 1px solid var(--common-shadow-2);
  border-radius: 8px;
  border-left: 3px solid var(--tgc-od-blue);
  background: var(--box-bg-3);
}

.vprt-lookup > :first-child {
  min-width: 0;
  flex: 1;
}

.vprt-result span {
  overflow: hidden;
  min-width: 0;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.vprt-game-list {
  display: flex;
  overflow: auto;
  min-height: 0;
  flex-direction: column;
  gap: 4px;
}

.vprt-game-item {
  display: block;
  width: 100%;
  min-width: 0;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  font: inherit;
  text-align: left;
}

.vprt-game-item :deep(.tpu-box) {
  min-height: 72px;
}

.vprt-tool:focus-visible,
.vprt-action:focus-visible,
.vprt-series-item:focus-visible,
.vprt-emoji:focus-visible,
.vprt-game-item:focus-visible {
  outline: 2px solid var(--common-text-title);
  outline-offset: 2px;
}

.vprt-tool:disabled,
.vprt-action:disabled,
.vprt-series-item:disabled,
.vprt-emoji:disabled,
.vprt-game-item:disabled {
  cursor: default;
  opacity: 0.45;
}

.vprt-game-item:hover:not(:disabled) {
  border-color: var(--common-shadow-2);
  background: var(--box-bg-3);
}

.vprt-tool:hover:not(:disabled, [aria-expanded="true"]),
.vprt-action:hover:not(:disabled),
.vprt-series-item:hover:not(:disabled, [aria-pressed="true"]),
.vprt-emoji:hover:not(:disabled) {
  opacity: 0.82;
}
</style>
