<!-- 帖子回复按钮&一级回复列表组件 -->
<template>
  <div class="tpr-main-box" title="查看回复">
    <v-menu
      v-model="showOverlay"
      :close-on-content-click="false"
      :no-click-animation="true"
      :offset="[12, 0]"
      :persistent="true"
      eager
      location="end"
      z-index="60"
    >
      <template #activator="{ props }">
        <v-btn
          :disabled="writing"
          :loading
          aria-label="查看回复"
          class="tpr-btn"
          size="36"
          v-bind="props"
          variant="outlined"
          @click="showReply()"
        >
          <template #default>
            <v-icon size="20">mdi-message-text-outline</v-icon>
          </template>
        </v-btn>
      </template>
      <div aria-label="回复列表与编辑器" class="tpr-main-reply">
        <div class="tpr-main-filter">
          <div class="tpr-title">
            <div class="tpr-title-copy">
              <v-icon size="18">mdi-message-text-outline</v-icon>
              <span>回复列表</span>
            </div>
            <div class="tpr-title-actions">
              <v-btn
                :disabled="writing"
                :loading
                aria-label="刷新回复列表"
                icon="mdi-refresh"
                size="32"
                title="刷新回复列表"
                variant="text"
                @click="reloadReply"
              />
              <v-btn
                :disabled="writing"
                aria-label="关闭回复列表"
                class="tpr-btn-close"
                icon="mdi-close"
                size="32"
                title="关闭回复列表"
                @click="showOverlay = false"
              />
            </div>
          </div>
          <div class="tpr-subtitle">
            <button
              :aria-pressed="onlyLz"
              :disabled="writing"
              class="tpr-switch"
              type="button"
              @click="switchOnlyLz()"
            >
              <v-icon v-if="onlyLz" color="var(--tgc-od-green)">
                mdi-checkbox-marked-circle-outline
              </v-icon>
              <v-icon v-else color="var(--tgc-od-white)">mdi-circle</v-icon>
              <span>只看楼主</span>
            </button>
            <div class="tpr-select">
              <v-select
                v-model="orderType"
                :disabled="writing"
                :hide-details="true"
                :items="orderList"
                density="compact"
                item-title="label"
                item-value="value"
                label="排序方式"
                variant="outlined"
              />
            </div>
          </div>
        </div>
        <v-list aria-label="回复列表" class="tpr-reply-list" @scroll="handleListScroll">
          <VpReplyItem
            v-for="item in reply"
            :key="item.reply.reply_id"
            :modelValue="item"
            :pinId
            :postOwnerId
            mode="main"
            @changed="handleReplyChanged"
            @reply="selectReply"
          />
          <div v-if="isLast" class="tpr-list-item">
            <v-chip label variant="tonal">没有更多了</v-chip>
          </div>
          <div v-else class="tpr-list-item">
            <v-btn :loading size="small" variant="tonal" @click="loadReply()">加载更多</v-btn>
          </div>
        </v-list>
        <VpReplyComposer
          :gid="props.gid"
          :postId="props.postId"
          :target="replyTarget"
          @cancel="replyTarget = undefined"
          @published="handlePublished"
        />
      </div>
    </v-menu>
  </div>
</template>
<script lang="ts" setup>
import showSnackbar from "@comp/func/snackbar.js";
import bbsEnum from "@enum/bbs.js";
import { createReplyInteraction, replyInteractionKey } from "@hooks/useReplyInteraction.js";
import postReq from "@req/postReq.js";
import useAppStore from "@store/app.js";
import useUserStore from "@store/user.js";
import { emit } from "@tauri-apps/api/event";
import TGHttps from "@utils/TGHttps.js";
import TGLogger from "@utils/TGLogger.js";
import { storeToRefs } from "pinia";
import { computed, onBeforeUnmount, provide, ref, shallowRef, watch } from "vue";

import VpReplyComposer from "./vp-reply-composer.vue";
import VpReplyItem from "./vp-reply-item.vue";

/**
 * 帖子一级回复列表组件参数
 */
type TprMainProps = {
  /* 版块ID */
  gid: number;
  /* 帖子ID */
  postId: string;
};

/**
 * 选择项类型
 */
type SelectItem = {
  /* 文本 */
  label: string;
  /* 值 */
  value: TGApp.BBS.Reply.ReplyOrderTypeEnum;
};

const props = defineProps<TprMainProps>();
const { uid, cookie } = storeToRefs(useUserStore());
const { incognito } = storeToRefs(useAppStore());
const interaction = createReplyInteraction();
provide(replyInteractionKey, interaction);
const writing = interaction.busy;

// 简单封装选项
const genOrderItem = (order: TGApp.BBS.Reply.ReplyOrderTypeEnum): SelectItem => ({
  label: bbsEnum.post.replyOrderTypeDesc(order),
  value: order,
});
const orderList: Array<SelectItem> = [
  bbsEnum.post.replyOrderType.HOT,
  bbsEnum.post.replyOrderType.LATEST,
  bbsEnum.post.replyOrderType.OLDEST,
].map(genOrderItem);

const pinId = ref<string>("0");
const postOwnerId = ref<string>("");
const replyTarget = shallowRef<TGApp.BBS.Reply.ReplyFull>();
let requestVersion = 0;
const lastId = ref<string>();
const isLast = ref<boolean>(false);
const loading = ref<boolean>(false);
const showOverlay = ref<boolean>(false);
const onlyLz = ref<boolean>(false);
const orderType = ref<TGApp.BBS.Reply.ReplyOrderTypeEnum>(bbsEnum.post.replyOrderType.HOT);
const reply = shallowRef<Array<TGApp.BBS.Reply.ReplyFull>>([]);
const readCookie = computed<Record<string, string> | undefined>(() => {
  if (
    incognito.value ||
    !uid.value ||
    !cookie.value?.ltoken.trim() ||
    cookie.value.ltuid !== uid.value
  )
    return undefined;
  return { ltoken: cookie.value.ltoken, ltuid: cookie.value.ltuid };
});
const isHot = computed<boolean>(() => orderType.value === bbsEnum.post.replyOrderType.HOT);
const replyOrder = computed<TGApp.BBS.Reply.ReplyOrderTypeEnum | undefined>(() => {
  if (orderType.value === bbsEnum.post.replyOrderType.HOT) return undefined;
  return orderType.value;
});

watch(
  () => orderType.value,
  async () => {
    onlyLz.value = false;
    await reloadReply();
  },
);

watch(
  () => [
    props.postId,
    props.gid,
    uid.value,
    cookie.value?.ltoken,
    cookie.value?.ltuid,
    incognito.value,
  ],
  async () => {
    replyTarget.value = undefined;
    resetReplies();
    if (showOverlay.value) await loadReply();
  },
  { flush: "sync" },
);

onBeforeUnmount(() => {
  requestVersion += 1;
});

function handleListScroll(e: Event): void {
  if (!(e.target instanceof HTMLElement)) return;
  // Emit event to close sub-reply menus when parent scrolls
  emit("closeReplySub");
  // Check if scrolled to bottom for auto-load
  const scrollTop = e.target.scrollTop;
  const clientHeight = e.target.clientHeight;
  const scrollHeight = e.target.scrollHeight;
  if (scrollTop + clientHeight >= scrollHeight - 1) {
    if (!loading.value && !isLast.value) {
      loadReply();
    }
  }
}

async function showReply(): Promise<void> {
  if (loading.value) return;
  if (reply.value.length > 0) return;
  if (isLast.value) return;
  await loadReply();
}

async function switchOnlyLz(): Promise<void> {
  onlyLz.value = !onlyLz.value;
  await reloadReply();
}

async function reloadReply(): Promise<void> {
  resetReplies();
  await loadReply();
}

function resetReplies(): void {
  requestVersion += 1;
  lastId.value = undefined;
  isLast.value = false;
  pinId.value = "0";
  postOwnerId.value = "";
  reply.value = [];
  loading.value = false;
}

function selectReply(item: TGApp.BBS.Reply.ReplyFull): void {
  if (!writing.value) replyTarget.value = item;
}

async function handleReplyChanged(): Promise<void> {
  replyTarget.value = undefined;
  await reloadReply();
}

async function handlePublished(): Promise<void> {
  replyTarget.value = undefined;
  onlyLz.value = false;
  if (orderType.value === bbsEnum.post.replyOrderType.LATEST) await reloadReply();
  else orderType.value = bbsEnum.post.replyOrderType.LATEST;
}

async function loadReply(): Promise<void> {
  if (loading.value || isLast.value) return;
  const version = requestVersion;
  loading.value = true;
  try {
    const resp = await postReq.reply.main(
      props.postId,
      props.gid,
      isHot.value,
      lastId.value,
      onlyLz.value,
      replyOrder.value,
      20,
      readCookie.value,
    );
    if (version !== requestVersion) return;
    if (resp.retcode !== 0) {
      showSnackbar.error(`[${resp.retcode}] ${resp.message}`);
      return;
    }
    isLast.value = resp.data.is_last;
    lastId.value = resp.data.last_id;
    pinId.value = resp.data.pin_reply_id;
    postOwnerId.value = resp.data.post_owner_id;
    const existingIds = new Set(reply.value.map((item) => item.reply.reply_id));
    reply.value = reply.value.concat(
      resp.data.list.filter((item) => !existingIds.has(item.reply.reply_id)),
    );
  } catch (e) {
    if (version !== requestVersion) return;
    const errMsg = TGHttps.getErrMsg(e);
    showSnackbar.error(`获取回复失败：${errMsg}`);
    await TGLogger.Error(`[VpBtnReply] 获取回复异常`);
  } finally {
    if (version === requestVersion) loading.value = false;
  }
}
</script>
<style lang="scss" scoped>
.tpr-main-box {
  position: fixed;
  z-index: 1;
  bottom: 16px;
  left: 16px;
  display: flex;
  width: 36px;
  height: 36px;
  box-sizing: border-box;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--tgc-btn-1);
  box-shadow: 1px 3px 6px var(--common-shadow-2);
  color: var(--btn-text);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.tpr-main-box:hover {
  box-shadow: 2px 4px 12px var(--common-shadow-4);
  transform: scale(1.15);
}

.tpr-main-box:active {
  transform: scale(0.95);
}

.tpr-main-box:focus-within {
  outline: 2px solid var(--common-text-title);
  outline-offset: 3px;
}

.dark .tpr-main-box {
  border: 1px solid var(--common-shadow-1);
  box-shadow: 1px 3px 6px var(--common-shadow-t-2);
}

.tpr-btn {
  position: relative;
  z-index: 1;
  width: 36px;
  height: 36px;
  border: unset;
  border-radius: 50%;
}

.tpr-main-reply {
  position: relative;
  display: flex;
  overflow: hidden;
  width: min(360px, calc(100vw - 72px));
  min-height: 0;
  max-height: min(720px, calc(100vh - 24px));
  box-sizing: border-box;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: 12px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 12px;
  background: var(--app-page-bg);
  box-shadow: 2px 2px 8px var(--common-shadow-4);
  row-gap: 8px;
  transition: height 0.5s ease-in-out;
}

.tpr-main-filter {
  position: relative;
  display: flex;
  width: 100%;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  color: var(--app-page-content);
  row-gap: 4px;
}

.tpr-title {
  position: relative;
  display: flex;
  width: 100%;
  box-sizing: border-box;
  align-items: center;
  justify-content: space-between;
}

.tpr-title-copy,
.tpr-title-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.tpr-title-copy {
  color: var(--common-text-title);
  font-size: 14px;
  font-weight: 600;
}

.tpr-title-actions {
  margin-left: auto;
}

.tpr-btn-close {
  border: 1px solid var(--common-shadow-2);
  border-radius: 4px;
  background: var(--tgc-btn-1);
  color: var(--btn-text);
}

.tpr-subtitle {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.tpr-select {
  position: relative;
  width: 120px;
}

.tpr-switch {
  position: relative;
  display: flex;
  min-height: 32px;
  align-items: center;
  justify-content: center;
  padding: 4px 8px;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  color: var(--app-page-content);
  cursor: pointer;
  font-family: var(--font-title);
  font-size: 12px;
  font-weight: normal;
  gap: 4px;
}

.tpr-switch[aria-pressed="true"] {
  border-color: var(--common-shadow-2);
  background: var(--box-bg-4);
}

.tpr-switch:focus-visible {
  outline: 2px solid var(--common-text-title);
  outline-offset: 2px;
}

.tpr-reply-list {
  position: relative;
  display: flex;
  overflow: hidden auto;
  width: 100%;
  min-height: 80px;
  max-height: min(440px, 42vh);
  box-sizing: border-box;
  flex: 1 1 auto;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: 0 4px 0 0;
  background: var(--app-page-bg);
  row-gap: 8px;
  scrollbar-gutter: stable;
}

.tpr-list-item {
  position: relative;
  display: flex;
  width: 100%;
  height: 40px;
  align-items: center;
  justify-content: center;
}

@media (width <= 480px) {
  .tpr-main-box {
    bottom: 12px;
    left: 12px;
  }

  .tpr-main-reply {
    width: min(360px, calc(100vw - 24px));
    max-height: calc(100vh - 16px);
    padding: 8px;
    border-radius: 8px;
  }

  .tpr-subtitle {
    flex-wrap: wrap;
    align-items: stretch;
  }

  .tpr-select {
    min-width: 120px;
    flex: 1;
  }
}
</style>
