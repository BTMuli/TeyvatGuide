<template>
  <div
    ref="VpReplyRef"
    :aria-label="`第 ${props.modelValue.reply.floor_id} 楼回复`"
    :class="{ 'tpr-reply-box--nested': props.mode === 'sub' }"
    class="tpr-reply-box"
    role="article"
  >
    <div
      v-if="props.modelValue.user.reply_bubble !== null"
      :title="props.modelValue.user.reply_bubble.name"
      class="tpr-bubble"
    >
      <TMiImg :ori="true" :src="props.modelValue.user.reply_bubble.url" alt="bubble" />
    </div>
    <div
      :aria-label="`查看 ${props.modelValue.user.nickname} 的用户信息`"
      class="tpr-user"
      role="button"
      tabindex="0"
      @click="handleUser()"
      @keydown.enter.space.prevent="handleUser()"
    >
      <div class="tpru-left">
        <div class="avatar">
          <img v-if="avatarUrl.endsWith('.gif')" :src="avatarUrl" alt="avatar" />
          <TMiImg v-else :ori="true" :src="avatarUrl" alt="avatar" />
        </div>
        <div v-if="props.modelValue.user.pendant !== ''" class="pendant">
          <TMiImg :ori="true" :src="props.modelValue.user.pendant" alt="pendant" />
        </div>
      </div>
      <div :title="props.modelValue.user.nickname" class="tpru-right">
        <span>{{ props.modelValue.user.nickname }}</span>
        <span class="level">Lv.{{ props.modelValue.user.level_exp.level }}</span>
        <span v-if="props.modelValue.is_lz" class="tpru-lz">楼主</span>
      </div>
    </div>
    <div aria-label="回复内容" class="tpr-content">
      <TpParser :data="replyContent" />
    </div>
    <div aria-label="回复互动" class="tpr-info">
      <div class="tpri-left">
        <span :title="fmtUtil.dateTime(props.modelValue.reply.created_at * 1000)">
          {{ fmtUtil.nearTime(props.modelValue.reply.created_at) }}
        </span>
        <span>{{ props.modelValue.user.ip_region }}</span>
      </div>
      <div class="tpri-right">
        <button
          :aria-pressed="isLiked"
          :disabled="interactionBusy || actionBusy !== null"
          :aria-busy="actionBusy === 'like'"
          :class="{ active: isLiked, 'tpr-action-busy': actionBusy === 'like' }"
          :title="isLiked ? '取消点赞' : '点赞'"
          :aria-label="isLiked ? '取消点赞' : '点赞'"
          class="tpr-action tpr-like"
          type="button"
          @click.stop="tryLike()"
        >
          <v-progress-circular v-if="actionBusy === 'like'" indeterminate size="14" width="2" />
          <v-icon v-else size="small">mdi-thumb-up</v-icon>
          {{ likeCount }}
        </button>
        <button
          :disabled="interactionBusy || actionBusy !== null"
          aria-label="回复"
          class="tpr-action tpr-reply-action"
          title="回复"
          type="button"
          @click.stop="handleReply()"
        >
          <v-icon size="small">mdi-reply</v-icon>
        </button>
        <span
          v-if="props.modelValue.sub_reply_count > 0"
          :aria-expanded="showSub"
          aria-label="查看子回复"
          class="tpr-reply"
          role="button"
          tabindex="0"
          title="查看子回复"
          @click.stop="showReply()"
          @keydown.enter.space.prevent.stop="showReply()"
        >
          <v-icon size="small">mdi-message-text</v-icon>
          <span>{{ props.modelValue.sub_reply_count }}</span>
          <v-menu
            v-model="showSub"
            :close-on-content-click="false"
            activator="parent"
            location="end"
            submenu
          >
            <v-list
              class="tpr-reply-sub"
              max-height="400px"
              width="300px"
              @scroll="handleSubScroll"
            >
              <VpReplyItem
                v-for="reply in subReplies"
                :key="reply.reply.reply_id"
                :modelValue="reply"
                :postOwnerId="props.postOwnerId"
                mode="sub"
                @changed="handleChanged"
                @reply="handleReplyFromChild"
              />
              <div v-if="isLast" class="tpr-list-item">
                <v-chip label variant="tonal">没有更多了</v-chip>
              </div>
              <div v-else class="tpr-list-item">
                <v-btn :loading size="small" variant="tonal" @click="loadSub()">加载更多</v-btn>
              </div>
            </v-list>
          </v-menu>
        </span>
      </div>
    </div>
    <div :title="`ID:${props.modelValue.reply.reply_id}`" aria-label="回复操作" class="tpr-extra">
      <button
        aria-label="分享回复"
        class="tpr-action tpr-share"
        data-html2canvas-ignore
        title="分享"
        type="button"
        @click.stop="share"
      >
        <v-icon size="small">mdi-share-variant</v-icon>
      </button>
      <button
        v-if="isPinned && canPin"
        :disabled="interactionBusy || actionBusy !== null"
        :aria-busy="actionBusy === 'pin'"
        :class="{ 'tpr-action-busy': actionBusy === 'pin' }"
        aria-label="取消置顶"
        class="tpr-action tpr-pin actionable"
        title="取消置顶"
        type="button"
        @click.stop="togglePin()"
      >
        <v-progress-circular v-if="actionBusy === 'pin'" indeterminate size="14" width="2" />
        <v-icon v-else size="small">mdi-pin</v-icon>
        <span>取消置顶</span>
      </button>
      <span v-else-if="isPinned" class="tpr-pin" title="已置顶">
        <v-icon size="small">mdi-pin</v-icon>
        <span>已置顶</span>
      </span>
      <button
        v-else-if="canPin"
        :disabled="interactionBusy || actionBusy !== null"
        :aria-busy="actionBusy === 'pin'"
        :class="{ 'tpr-action-busy': actionBusy === 'pin' }"
        aria-label="置顶回复"
        class="tpr-action tpr-pin actionable"
        title="置顶回复"
        type="button"
        @click.stop="togglePin()"
      >
        <v-progress-circular v-if="actionBusy === 'pin'" indeterminate size="14" width="2" />
        <v-icon v-else size="small">mdi-pin-outline</v-icon>
        <span>置顶回复</span>
      </button>
      <button
        v-if="canDeleteReply"
        :disabled="interactionBusy || actionBusy !== null"
        :aria-busy="actionBusy === 'delete'"
        :class="{ 'tpr-action-busy': actionBusy === 'delete' }"
        aria-label="删除回复"
        class="tpr-action tpr-delete"
        data-html2canvas-ignore
        title="删除回复"
        type="button"
        @click.stop="deleteReply()"
      >
        <v-progress-circular v-if="actionBusy === 'delete'" indeterminate size="14" width="2" />
        <v-icon v-else size="small">mdi-delete-outline</v-icon>
      </button>
      <button
        :disabled="interactionBusy"
        :aria-busy="interactionBusy"
        aria-label="导出数据"
        class="tpr-action tpr-debug"
        data-html2canvas-ignore
        title="导出数据"
        type="button"
        @click.stop="exportData()"
      >
        <v-icon size="small">mdi-file-export</v-icon>
      </button>
      <span v-if="props.modelValue.r_user" class="tpr-reply-user">
        <span>回复</span>
        <span>{{ props.modelValue.r_user.nickname }}</span>
      </span>
      <span v-if="props.mode === 'main'" class="tpr-floor">
        {{ props.modelValue.reply.floor_id }}F
      </span>
    </div>
    <div class="tpr-share-info bottom">
      <span>{{ props.modelValue.reply.post_id }}</span>
      <span v-if="props.mode === 'sub'"> | {{ props.modelValue.reply.floor_id }}F</span>
    </div>
    <div class="tpr-share-info top">{{ props.modelValue.reply.reply_id }}</div>
  </div>
</template>
<script lang="ts" setup>
import TMiImg from "@comp/app/t-mi-img.vue";
import showDialog from "@comp/func/dialog.js";
import showSnackbar from "@comp/func/snackbar.js";
import { useReplyInteraction } from "@hooks/useReplyInteraction.js";
import postReq from "@req/postReq.js";
import useAppStore from "@store/app.js";
import useUserStore from "@store/user.js";
import { event, path } from "@tauri-apps/api";
import { emit, type Event, type UnlistenFn } from "@tauri-apps/api/event";
import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import { executeReplyForCurrentAccount } from "@utils/bbsReplyAccount.js";
import fmtUtil from "@utils/fmtUtil.js";
import TGHttps from "@utils/TGHttps.js";
import TGLogger from "@utils/TGLogger.js";
import { generateShareImg } from "@utils/TGShare.js";
import { getUserAvatar } from "@utils/toolFunc.js";
import { storeToRefs } from "pinia";
import {
  computed,
  onMounted,
  onUnmounted,
  ref,
  shallowRef,
  toRaw,
  useTemplateRef,
  watch,
} from "vue";

import TpParser from "./tp-parser.vue";

/**
 * 回复项参数。
 * @since Beta v0.12.6
 */
type TprReplyProps =
  | { mode: "sub"; modelValue: TGApp.BBS.Reply.ReplyFull; postOwnerId?: string }
  | { mode: "main"; modelValue: TGApp.BBS.Reply.ReplyFull; pinId?: string; postOwnerId?: string };

/**
 * 回复项事件。
 * @since Beta v0.12.6
 */
type TprReplyEmits = {
  reply: [item: TGApp.BBS.Reply.ReplyFull];
  changed: [];
};

/**
 * 回复变更的账号与上下文快照。
 * @since Beta v0.12.6
 */
type WriteSnapshot = TGApp.BBS.Reply.AccountSnapshot & {
  postId: string;
  replyId: string;
  gid: number;
  contextVersion: number;
};

const props = defineProps<TprReplyProps>();
const emits = defineEmits<TprReplyEmits>();
const replyLabel = `reply_${props.modelValue.reply.post_id}_${props.modelValue.reply.floor_id}_${props.modelValue.reply.reply_id}`;
let subListener: UnlistenFn | null = null;
let closeSubListener: UnlistenFn | null = null;
let subLoadGeneration = 0;
let actionContextVersion = 0;
let mounted = false;

const existingIds = new Set<string>();

const { incognito } = storeToRefs(useAppStore());
const { cookie, uid } = storeToRefs(useUserStore());
const interaction = useReplyInteraction();
const interactionBusy = interaction.busy;

const actionBusy = ref<"like" | "delete" | "pin" | null>(null);
const isLiked = ref<boolean>(isReplyLiked(props.modelValue));
const likeCount = ref<number>(props.modelValue.stat.like_num);
const showSub = ref<boolean>(false);
const lastId = ref<string>();
const isLast = ref<boolean>(false);
const loading = ref<boolean>(false);
const subReplies = shallowRef<Array<TGApp.BBS.Reply.ReplyFull>>([]);
const vpReplyEl = useTemplateRef<HTMLDivElement>("VpReplyRef");
const avatarUrl = computed<string>(() => getUserAvatar(props.modelValue.user));
const replyContent = computed<Array<TGApp.BBS.SctPost.Base>>(() => getReplyContent());
const isPinned = computed<boolean>(
  () => props.mode === "main" && props.modelValue.reply.reply_id === props.pinId,
);
const canDeleteReply = computed<boolean>(
  () =>
    props.modelValue.reply.is_deleted === 0 &&
    uid.value !== undefined &&
    props.modelValue.user.uid === uid.value,
);
const canPin = computed<boolean>(
  () =>
    props.mode === "main" &&
    props.modelValue.reply.is_deleted === 0 &&
    props.postOwnerId !== undefined &&
    props.postOwnerId !== "" &&
    uid.value !== undefined &&
    uid.value === props.postOwnerId,
);
const levelColor = computed<string>(() => {
  const level = props.modelValue.user.level_exp.level;
  if (level < 5) return "var(--tgc-od-green)";
  if (level < 9) return "var(--tgc-od-blue)";
  if (level < 13) return "var(--tgc-od-purple)";
  if (level > 12) return "var(--tgc-od-orange)";
  return "var(--tgc-od-white)";
});

function isReplyLiked(item: TGApp.BBS.Reply.ReplyFull): boolean {
  return item.self_operation?.attitude === 1;
}

function isSctPostBase(value: unknown): value is TGApp.BBS.SctPost.Base {
  return typeof value === "object" && value !== null && "insert" in value;
}

function getReplyContent(): Array<TGApp.BBS.SctPost.Base> {
  const raw =
    typeof props.modelValue.reply.struct_content === "string"
      ? props.modelValue.reply.struct_content.trim()
      : "";
  const fallback =
    typeof props.modelValue.reply.content === "string" ? props.modelValue.reply.content : "";
  if (raw === "") return [{ insert: fallback }];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const rows = parsed.filter(isSctPostBase);
      if (rows.length > 0) return rows;
    } else if (isSctPostBase(parsed)) {
      return [parsed];
    } else if (typeof parsed === "string") {
      return [{ insert: parsed }];
    }
  } catch {
    // Plain-text replies may not include structured content.
  }
  return [{ insert: fallback || raw }];
}

function getReadCookie(): Record<string, string> | undefined {
  if (
    incognito.value ||
    !uid.value ||
    !cookie.value?.ltoken.trim() ||
    cookie.value.ltuid !== uid.value
  )
    return undefined;
  return { ltoken: cookie.value.ltoken, ltuid: cookie.value.ltuid };
}

function getWriteSnapshot(): WriteSnapshot | undefined {
  if (incognito.value) {
    showSnackbar.error("无法在无痕浏览模式下操作");
    return undefined;
  }
  if (
    !uid.value ||
    !cookie.value ||
    cookie.value.ltuid !== uid.value ||
    !cookie.value.ltoken.trim()
  ) {
    showSnackbar.error("请先登录");
    return undefined;
  }
  return {
    uid: uid.value,
    cookie: { ltoken: cookie.value.ltoken, ltuid: cookie.value.ltuid },
    postId: props.modelValue.reply.post_id,
    replyId: props.modelValue.reply.reply_id,
    gid: props.modelValue.reply.game_id,
    contextVersion: actionContextVersion,
  };
}

function isWriteSnapshotCurrent(snapshot: WriteSnapshot): boolean {
  return (
    mounted &&
    actionContextVersion === snapshot.contextVersion &&
    !incognito.value &&
    uid.value === snapshot.uid &&
    cookie.value?.ltuid === snapshot.cookie.ltuid &&
    cookie.value?.ltoken === snapshot.cookie.ltoken &&
    props.modelValue.reply.post_id === snapshot.postId &&
    props.modelValue.reply.reply_id === snapshot.replyId &&
    props.modelValue.reply.game_id === snapshot.gid
  );
}

function resetSubState(): void {
  subLoadGeneration += 1;
  existingIds.clear();
  lastId.value = undefined;
  isLast.value = false;
  loading.value = false;
  subReplies.value = [];
}

onMounted(async () => {
  mounted = true;
  if (props.mode === "main") {
    const [nextSubListener, nextCloseSubListener] = await Promise.all([
      listenSub(),
      listenCloseSub(),
    ]);
    if (!mounted) {
      nextSubListener();
      nextCloseSubListener();
      return;
    }
    subListener = nextSubListener;
    closeSubListener = nextCloseSubListener;
  }
});
onUnmounted(() => {
  mounted = false;
  actionContextVersion += 1;
  subLoadGeneration += 1;
  if (subListener !== null) {
    subListener();
    subListener = null;
  }
  if (closeSubListener !== null) {
    closeSubListener();
    closeSubListener = null;
  }
});

watch(
  [
    () => props.modelValue,
    () => props.mode,
    () => props.postOwnerId,
    () => (props.mode === "main" ? props.pinId : undefined),
  ],
  () => {
    actionContextVersion += 1;
    isLiked.value = isReplyLiked(props.modelValue);
    likeCount.value = props.modelValue.stat.like_num;
    resetSubState();
  },
  { flush: "sync" },
);

watch(
  [uid, incognito, () => cookie.value?.ltoken, () => cookie.value?.ltuid],
  () => {
    actionContextVersion += 1;
    resetSubState();
  },
  { flush: "sync" },
);

watch(
  () => showSub.value,
  async (value) => {
    if (value) await event.emit("openReplySub", props.modelValue.reply.reply_id);
  },
);

async function listenSub(): Promise<UnlistenFn> {
  return await event.listen<string>("openReplySub", async (e: Event<string>) => {
    if (e.payload !== props.modelValue.reply.reply_id) if (showSub.value) showSub.value = false;
  });
}

async function listenCloseSub(): Promise<UnlistenFn> {
  return await event.listen<void>("closeReplySub", async () => {
    if (showSub.value) showSub.value = false;
  });
}

function handleSubScroll(e: globalThis.Event): void {
  if (!(e.target instanceof HTMLElement)) return;
  // Check if scrolled to bottom for autoload
  const scrollTop = e.target.scrollTop;
  const clientHeight = e.target.clientHeight;
  const scrollHeight = e.target.scrollHeight;
  if (scrollTop + clientHeight >= scrollHeight - 1) {
    if (!loading.value && !isLast.value) {
      loadSub();
    }
  }
}

async function share(): Promise<void> {
  if (!vpReplyEl.value) {
    showSnackbar.warn("未找到分享Dom");
    return;
  }
  await generateShareImg(replyLabel, vpReplyEl.value, 3);
}

async function showReply(): Promise<void> {
  if (loading.value) return;
  if (subReplies.value.length === 0 && props.modelValue.sub_replies?.length > 0) {
    subReplies.value = [...props.modelValue.sub_replies];
    // Populate existingIds with embedded sub-replies
    props.modelValue.sub_replies.forEach((r) => existingIds.add(r.reply.reply_id));
    const lastReply = props.modelValue.sub_replies[props.modelValue.sub_replies.length - 1];
    if (lastReply?.reply?.reply_id) lastId.value = lastReply.reply.reply_id;
    if (props.modelValue.sub_replies.length >= props.modelValue.sub_reply_count) {
      isLast.value = true;
    }
    return;
  }
  if (subReplies.value.length > 0) return;
  if (isLast.value) return;
  await loadSub();
}

async function loadSub(): Promise<void> {
  if (loading.value || isLast.value) return;
  const generation = ++subLoadGeneration;
  loading.value = true;
  try {
    const resp = await postReq.reply.sub(
      props.modelValue.reply.floor_id,
      props.modelValue.reply.game_id,
      props.modelValue.reply.post_id,
      lastId.value,
      20,
      getReadCookie(),
    );
    if (generation !== subLoadGeneration) return;
    if (resp.retcode !== 0) {
      showSnackbar.error(`[${resp.retcode}] ${resp.message}`);
      return;
    }
    isLast.value = resp.data.is_last;
    lastId.value = resp.data.last_id;
    const newReplies = resp.data.list.filter((r) => !existingIds.has(r.reply.reply_id));
    newReplies.forEach((r) => existingIds.add(r.reply.reply_id));
    subReplies.value = subReplies.value.concat(newReplies);
    if (isLast.value) showSnackbar.warn("没有更多了");
  } catch (error) {
    if (generation !== subLoadGeneration) return;
    const errMsg = TGHttps.getErrMsg(error);
    showSnackbar.error(`获取子回复失败：${errMsg}`);
    await TGLogger.Error("[VpReplyItem] 获取子回复异常");
  } finally {
    if (generation === subLoadGeneration) loading.value = false;
  }
}

function handleReply(): void {
  if (interactionBusy.value || actionBusy.value !== null) return;
  emits("reply", props.modelValue);
}

function handleReplyFromChild(item: TGApp.BBS.Reply.ReplyFull): void {
  if (interactionBusy.value || actionBusy.value !== null) return;
  emits("reply", item);
}

function handleChanged(): void {
  emits("changed");
}

async function tryLike(): Promise<void> {
  if (actionBusy.value !== null || interactionBusy.value) return;
  await interaction.run(async () => {
    const snapshot = getWriteSnapshot();
    if (!snapshot) return;
    const cancel = isLiked.value;
    actionBusy.value = "like";
    try {
      if (!isWriteSnapshotCurrent(snapshot)) {
        showSnackbar.warn("账号或回复目标已变化，请重新操作");
        return;
      }
      const execution = await executeReplyForCurrentAccount(snapshot, () =>
        postReq.reply.like(
          snapshot.postId,
          snapshot.replyId,
          snapshot.cookie,
          cancel,
          snapshot.gid,
        ),
      );
      if (!execution.allowed) {
        showSnackbar.warn("账号状态已变化，请重新打开帖子窗口后再操作");
        return;
      }
      const response = execution.data;
      if (!isWriteSnapshotCurrent(snapshot)) return;
      if (response.retcode !== 0) {
        showSnackbar.error(`[${response.retcode}] ${response.message}`);
        return;
      }
      isLiked.value = !cancel;
      likeCount.value = Math.max(0, likeCount.value + (cancel ? -1 : 1));
      showSnackbar.success(cancel ? "取消点赞成功" : "点赞成功");
    } catch (error) {
      if (!isWriteSnapshotCurrent(snapshot)) return;
      const errMsg = TGHttps.getErrMsg(error);
      showSnackbar.error(`点赞失败：${errMsg}`);
      await TGLogger.Error("[VpReplyItem] 点赞请求异常");
    } finally {
      if (actionBusy.value === "like") actionBusy.value = null;
    }
  });
}

async function deleteReply(): Promise<void> {
  if (actionBusy.value !== null || interactionBusy.value || !canDeleteReply.value) return;
  await interaction.run(async () => {
    const snapshot = getWriteSnapshot();
    if (!snapshot) return;
    actionBusy.value = "delete";
    try {
      const confirmed = await showDialog.checkF({
        title: "删除回复？",
        text: "删除后将无法恢复这条回复，确认继续吗？",
        confirmLabel: "删除回复",
        cancelLabel: "保留回复",
      });
      if (confirmed !== true) {
        showSnackbar.cancel("已取消删除回复");
        return;
      }
      if (!isWriteSnapshotCurrent(snapshot)) {
        showSnackbar.warn("账号或回复目标已变化，请重新操作");
        return;
      }
      const execution = await executeReplyForCurrentAccount(snapshot, () =>
        postReq.reply.delete(snapshot.postId, snapshot.replyId, snapshot.cookie, snapshot.gid),
      );
      if (!execution.allowed) {
        showSnackbar.warn("账号状态已变化，请重新打开帖子窗口后再操作");
        return;
      }
      const response = execution.data;
      if (!isWriteSnapshotCurrent(snapshot)) return;
      if (response.retcode !== 0) {
        showSnackbar.error(`[${response.retcode}] ${response.message}`);
        return;
      }
      showSnackbar.success("删除回复成功");
      emits("changed");
    } catch (error) {
      if (!isWriteSnapshotCurrent(snapshot)) return;
      const errMsg = TGHttps.getErrMsg(error);
      showSnackbar.error(`删除回复失败：${errMsg}`);
      await TGLogger.Error("[VpReplyItem] 删除回复请求异常");
    } finally {
      if (actionBusy.value === "delete") actionBusy.value = null;
    }
  });
}

async function togglePin(): Promise<void> {
  if (actionBusy.value !== null || interactionBusy.value || !canPin.value) return;
  await interaction.run(async () => {
    const snapshot = getWriteSnapshot();
    if (!snapshot) return;
    const cancel = isPinned.value;
    const replacingPinned =
      !cancel &&
      props.mode === "main" &&
      props.pinId !== undefined &&
      props.pinId !== "" &&
      props.pinId !== "0" &&
      props.pinId !== snapshot.replyId;
    actionBusy.value = "pin";
    try {
      const confirmed = await showDialog.checkF({
        title: cancel ? "取消置顶回复？" : "置顶回复？",
        text: cancel
          ? "确认取消置顶这条回复吗？"
          : replacingPinned
            ? "当前已有置顶回复，确认将其替换为这条回复吗？"
            : "确认将这条回复置顶吗？",
        confirmLabel: cancel ? "取消置顶" : replacingPinned ? "替换置顶" : "置顶回复",
        cancelLabel: "继续查看",
      });
      if (confirmed !== true) {
        showSnackbar.cancel(cancel ? "已保留置顶状态" : "已取消置顶回复");
        return;
      }
      if (!isWriteSnapshotCurrent(snapshot)) {
        showSnackbar.warn("账号或回复目标已变化，请重新操作");
        return;
      }
      const execution = await executeReplyForCurrentAccount(snapshot, () =>
        postReq.reply.pin(snapshot.postId, snapshot.replyId, snapshot.cookie, cancel, snapshot.gid),
      );
      if (!execution.allowed) {
        showSnackbar.warn("账号状态已变化，请重新打开帖子窗口后再操作");
        return;
      }
      const response = execution.data;
      if (!isWriteSnapshotCurrent(snapshot)) return;
      if (response.retcode !== 0) {
        showSnackbar.error(`[${response.retcode}] ${response.message}`);
        return;
      }
      showSnackbar.success(cancel ? "取消置顶成功" : "置顶回复成功");
      emits("changed");
    } catch (error) {
      if (!isWriteSnapshotCurrent(snapshot)) return;
      const errMsg = TGHttps.getErrMsg(error);
      showSnackbar.error(`${cancel ? "取消置顶" : "置顶回复"}失败：${errMsg}`);
      await TGLogger.Error(`[VpReplyItem] ${cancel ? "取消置顶" : "置顶回复"}请求异常`);
    } finally {
      if (actionBusy.value === "pin") actionBusy.value = null;
    }
  });
}

async function exportData(): Promise<void> {
  await interaction.run(async () => {
    const exportCheck = await showDialog.check("导出数据", "是否导出回复数据？");
    if (!exportCheck) {
      showSnackbar.cancel("已取消导出该回复数据");
      return;
    }
    const data = JSON.stringify(toRaw(props.modelValue), null, 2);
    const savePath = await save({
      title: "导出回复数据",
      filters: [{ name: "JSON", extensions: ["json"] }],
      defaultPath: `${await path.downloadDir()}${path.sep()}${replyLabel}.json`,
    });
    if (savePath === null) {
      showSnackbar.cancel("已取消");
      return;
    }
    await writeTextFile(savePath, data);
    showSnackbar.success("导出成功");
  });
}

async function handleUser(): Promise<void> {
  const uid = props.modelValue.user.uid;
  await emit("userMention", uid);
}
</script>
<style lang="scss" scoped>
.tpr-reply-box {
  position: relative;
  display: flex;
  width: 100%;
  box-sizing: border-box;
  flex-direction: column;
  flex-shrink: 0;
  align-items: flex-start;
  justify-content: center;
  padding: 12px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--box-bg-1);
  color: var(--app-page-content);
  word-break: break-all;
}

.tpr-reply-box--nested {
  padding: 8px;
  border-radius: 4px;
  background: var(--box-bg-4);
}

.tpr-bubble {
  position: absolute;
  top: 0;
  right: 0;
  overflow: hidden;
  border-top: 1px inset var(--common-shadow-1);
  border-right: 1px inset var(--common-shadow-1);
  background-color: v-bind("props.modelValue.user.reply_bubble?.bg_color");
  border-top-right-radius: 8px;
  opacity: 0.5;
}

.tpr-bubble img {
  max-width: 100%;
  height: 40px;
  object-fit: contain;
}

.tpr-user {
  position: relative;
  display: flex;
  max-width: 100%;
  min-height: 40px;
  align-items: center;
  justify-content: flex-start;
  padding: 2px 4px;
  border: 1px solid transparent;
  border-radius: 4px;
  cursor: pointer;
  gap: 4px;
}

.tpr-user:hover {
  border-color: var(--common-shadow-1);
  background: var(--box-bg-4);
}

.tpr-user:focus-visible {
  outline: 2px solid var(--common-text-title);
  outline-offset: 2px;
}

.tpru-left {
  position: relative;
  display: flex;
  width: 40px;
  height: 40px;
  flex: 0 0 40px;
  align-items: center;
  justify-content: center;
}

.avatar {
  position: relative;
  display: flex;
  width: 30px;
  height: 30px;
  align-items: center;
  justify-content: center;

  img {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    object-fit: cover;
  }
}

.pendant {
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  width: 40px;
  height: 40px;
  align-items: center;
  justify-content: center;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.level {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 2px;
  border-radius: 2px;
  background: v-bind(levelColor); /* stylelint-disable-line value-keyword-case */
  color: var(--tgc-white-1);
  font-size: 12px;
}

.tpru-right {
  display: flex;
  overflow: hidden;
  min-width: 0;
  align-items: center;
  justify-content: center;
  column-gap: 4px;
  font-family: var(--font-title);
  font-size: 16px;
  font-weight: normal;
  text-overflow: ellipsis;
  white-space: nowrap;

  :first-child {
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

.tpru-lz {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 2px;
  border-radius: 2px;
  background: var(--tgc-od-blue);
  color: var(--tgc-white-1);
  font-size: 12px;
}

.tpr-content {
  position: relative;
  width: 100%;
  padding: 4px 0 8px;
  line-height: 20px;
}

.tpr-info {
  display: flex;
  width: 100%;
  align-items: flex-end;
  justify-content: space-between;
  padding-top: 8px;
  border-top: 1px solid var(--common-shadow-1);
  gap: 8px;
}

.tpri-left {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--box-text-4);
  font-size: 12px;
  gap: 4px;
  opacity: 0.85;
}

.tpri-right {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.tpr-action,
.tpr-like,
.tpr-reply-action {
  display: flex;
  min-height: 28px;
  align-items: center;
  justify-content: center;
  padding: 4px 6px;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  color: var(--box-text-2);
  cursor: pointer;
  font: inherit;
  gap: 4px;
}

.tpr-action:focus-visible {
  outline: 2px solid var(--common-text-title);
  outline-offset: 2px;
}

.tpr-action:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.tpr-action:hover:not(:disabled) {
  border-color: var(--common-shadow-1);
  background: var(--box-bg-4);
}

.tpr-like.active {
  color: var(--tgc-od-blue);
}

.tpr-action-busy {
  cursor: wait;
  opacity: 0.5;
}

.tpr-reply {
  display: flex;
  min-height: 28px;
  align-items: center;
  justify-content: center;
  padding: 4px 6px;
  border: 1px solid transparent;
  border-radius: 4px;
  color: var(--box-text-2);
  cursor: pointer;
  gap: 4px;
}

.tpr-reply:focus-visible {
  outline: 2px solid var(--common-text-title);
  outline-offset: 2px;
}

.tpr-reply:hover {
  border-color: var(--common-shadow-1);
  background: var(--box-bg-4);
}

.tpr-extra {
  display: flex;
  width: 100%;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  font-size: 12px;
  gap: 4px;
}

.tpr-pin {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--tgc-od-red);

  &.actionable {
    cursor: pointer;
  }
}

.tpr-delete {
  color: var(--tgc-od-red);
}

.tpr-debug {
  color: var(--box-text-4);
  opacity: 0.65;
}

.tpr-reply-user {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--box-text-4);
  gap: 4px;
  opacity: 0.8;

  :last-child {
    color: var(--tgc-od-blue);
    text-decoration: underline solid var(--tgc-od-blue);
    text-underline-position: under;
  }
}

.tpr-floor {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--box-text-4);
  opacity: 0.8;
}

.tpr-reply-sub {
  position: relative;
  display: flex;
  width: 300px;
  max-height: 400px;
  box-sizing: border-box;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: 8px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--app-page-bg);
  overflow-y: auto;
  row-gap: 8px;
  scrollbar-gutter: stable;

  &.v-list {
    box-shadow: -4px 0 8px var(--common-shadow-4);
  }
}

.tpr-share {
  opacity: 0.7;
}

.tpr-share:hover:not(:disabled) {
  opacity: 1;
}

.tpr-share-info {
  position: absolute;
  z-index: -1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--tgc-od-white);
  font-size: 12px;
  gap: 4px;
  text-shadow: 1px 1px 1px var(--tgc-dark-1);
}

.tpr-share-info.top {
  top: 0;
  right: 4px;
}

.tpr-share-info.bottom {
  bottom: 8px;
  left: 8px;
}

@media (width <= 480px) {
  .tpr-reply-box {
    padding: 8px;
  }

  .tpr-info {
    flex-direction: column;
    align-items: flex-start;
  }

  .tpri-right {
    width: 100%;
    justify-content: flex-start;
  }

  .tpr-extra {
    justify-content: flex-start;
  }
}
</style>
