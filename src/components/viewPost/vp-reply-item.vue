<template>
  <div class="tpr-reply-box" :id="replyId">
    <div
      class="tpr-bubble"
      v-if="props.modelValue.user.reply_bubble !== null"
      :title="props.modelValue.user.reply_bubble.name"
    >
      <TMiImg :ori="true" :src="props.modelValue.user.reply_bubble.url" alt="bubble" />
    </div>
    <div class="tpr-user" @click="handleUser()">
      <div class="tpru-left">
        <div class="avatar">
          <TMiImg :ori="true" :src="getUserAvatar(props.modelValue.user)" alt="avatar" />
        </div>
        <div class="pendant" v-if="props.modelValue.user.pendant !== ''">
          <TMiImg :ori="true" :src="props.modelValue.user.pendant" alt="pendant" />
        </div>
      </div>
      <div class="tpru-right" :title="props.modelValue.user.nickname">
        <span>{{ props.modelValue.user.nickname }}</span>
        <span class="level">Lv.{{ props.modelValue.user.level_exp.level }}</span>
        <span v-if="props.modelValue.is_lz" class="tpru-lz">楼主</span>
      </div>
    </div>
    <div class="tpr-content">
      <TpParser :data="JSON.parse(props.modelValue.reply.struct_content)" />
    </div>
    <div class="tpr-info">
      <div class="tpri-left">
        <span :title="timestampToDate(props.modelValue.reply.created_at * 1000)">
          {{ getNearTime(props.modelValue.reply.created_at) }}
        </span>
        <span>{{ props.modelValue.user.ip_region }}</span>
      </div>
      <div class="tpri-right">
        <span title="点赞数" class="tpr-like">
          <v-icon size="small">mdi-thumb-up</v-icon>
          {{ props.modelValue.stat.like_num }}
        </span>
        <span
          v-if="props.modelValue.sub_reply_count > 0"
          class="tpr-reply"
          title="查看子回复"
          @click="showReply()"
        >
          <v-icon size="small">mdi-message-text</v-icon>
          <span>{{ props.modelValue.sub_reply_count }}</span>
          <v-menu
            submenu
            activator="parent"
            location="end"
            :close-on-content-click="false"
            v-model="showSub"
            scroll-strategy="close"
          >
            <v-list class="tpr-reply-sub" width="300px" max-height="400px" ref="subReplyListRef">
              <VpReplyItem
                v-for="(reply, index) in subReplies"
                :key="index"
                :modelValue="reply"
                mode="sub"
              />
              <div v-if="isLast" class="tpr-list-item">
                <v-chip color="info" label>没有更多了</v-chip>
              </div>
              <div v-else class="tpr-list-item">
                <v-btn @click="loadSub()" color="primary" :loading="loading">加载更多</v-btn>
              </div>
            </v-list>
          </v-menu>
        </span>
      </div>
    </div>
    <div class="tpr-extra" :title="`ID:${props.modelValue.reply.reply_id}`">
      <div class="tpr-share" @click="share" data-html2canvas-ignore title="分享">
        <v-icon size="small">mdi-share-variant</v-icon>
      </div>
      <span
        class="tpr-pin"
        v-if="props.mode === 'main' && props.modelValue.reply.reply_id === props.pinId"
      >
        <v-icon size="small">mdi-pin</v-icon>
        <span>置顶评论</span>
      </span>
      <span class="tpr-debug" @click="exportData" data-html2canvas-ignore title="导出数据">
        <v-icon size="small">mdi-file-export</v-icon>
      </span>
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
import { useBoxReachBottom } from "@hooks/reachBottom.js";
import postReq from "@req/postReq.js";
import { event, path } from "@tauri-apps/api";
import { emit, type Event, type UnlistenFn } from "@tauri-apps/api/event";
import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import { generateShareImg } from "@utils/TGShare.js";
import { getNearTime, getUserAvatar, timestampToDate } from "@utils/toolFunc.js";
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

type TprReplyProps =
  | { mode: "sub"; modelValue: TGApp.BBS.Reply.ReplyFull }
  | { mode: "main"; modelValue: TGApp.BBS.Reply.ReplyFull; pinId: string };

const props = defineProps<TprReplyProps>();
const replyId = `reply_${props.modelValue.reply.post_id}_${props.modelValue.reply.floor_id}_${props.modelValue.reply.reply_id}`;
let subListener: UnlistenFn | null = null;

console.log("TprReply", toRaw(props.modelValue));

const showSub = ref<boolean>(false);
const lastId = ref<string>();
const isLast = ref<boolean>(false);
const loading = ref<boolean>(false);
const subReplies = shallowRef<Array<TGApp.BBS.Reply.ReplyFull>>([]);
const levelColor = computed<string>(() => {
  const level = props.modelValue.user.level_exp.level;
  if (level < 5) return "var(--tgc-od-green)";
  if (level < 9) return "var(--tgc-od-blue)";
  if (level < 13) return "var(--tgc-od-purple)";
  if (level > 12) return "var(--tgc-od-orange)";
  return "var(--tgc-od-white)";
});

const subReplyListRef = useTemplateRef<HTMLElement>("subReplyListRef");
const { isReachBottom } = useBoxReachBottom(subReplyListRef);

watch(
  () => isReachBottom.value,
  async () => {
    if (!isReachBottom.value || loading.value || isLast.value || props.mode !== "main") return;
    await loadSub();
  },
);

onMounted(async () => (props.mode === "main" ? (subListener = await listenSub()) : null));
onUnmounted(() => {
  if (subListener !== null) {
    subListener();
    subListener = null;
  }
});

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

async function share(): Promise<void> {
  const replyDom = document.querySelector<HTMLElement>(`#${replyId}`);
  if (replyDom === null) return;
  await generateShareImg(replyId, replyDom, 3);
}

async function showReply(): Promise<void> {
  if (subReplies.value.length > 0) return;
  if (isLast.value) return;
  await loadSub();
}

async function loadSub(): Promise<void> {
  loading.value = true;
  const resp = await postReq.reply.sub(
    props.modelValue.reply.floor_id,
    props.modelValue.reply.game_id,
    props.modelValue.reply.post_id,
    lastId.value,
  );
  if ("retcode" in resp) {
    showSnackbar.error(`[${resp.retcode}] ${resp.message}`);
    loading.value = false;
    return;
  }
  isLast.value = resp.is_last;
  lastId.value = resp.last_id;
  subReplies.value = subReplies.value.concat(resp.list);
  loading.value = false;
  if (isLast.value) showSnackbar.warn("没有更多了");
}

async function exportData(): Promise<void> {
  const exportCheck = await showDialog.check("导出数据", "是否导出回复数据？");
  if (!exportCheck) {
    showSnackbar.cancel("已取消导出该回复数据");
    return;
  }
  const data = JSON.stringify(toRaw(props.modelValue), null, 2);
  const savePath = await save({
    title: "导出回复数据",
    filters: [{ name: "JSON", extensions: ["json"] }],
    defaultPath: `${await path.downloadDir()}${path.sep()}${replyId}.json`,
  });
  if (savePath === null) {
    showSnackbar.cancel("已取消");
    return;
  }
  await writeTextFile(savePath, data);
  showSnackbar.success("导出成功");
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
  align-items: flex-start;
  justify-content: center;
  padding: 8px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
  background: var(--box-bg-1);
  word-break: break-all;
}

.tpr-bubble {
  position: absolute;
  top: 0;
  right: 0;
  overflow: hidden;
  border-top: 1px inset var(--common-shadow-1);
  border-right: 1px inset var(--common-shadow-1);
  background-color: v-bind("props.modelValue.user.reply_bubble?.bg_color");
  border-top-right-radius: 4px;
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
  height: 40px;
  align-items: center;
  justify-content: flex-start;
  cursor: pointer;
}

.tpru-left {
  position: relative;
  display: flex;
  width: 40px;
  height: 40px;
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
  align-items: center;
  justify-content: center;
  column-gap: 4px;
  font-family: var(--font-title);
  font-size: 16px;
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
}

.tpr-info {
  display: flex;
  width: 100%;
  align-items: flex-end;
  justify-content: space-between;
  opacity: 0.5;
}

.tpri-left {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  gap: 4px;
}

.tpri-right {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.tpr-like {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.tpr-reply {
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  gap: 4px;
}

.tpr-extra {
  display: flex;
  width: 100%;
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
}

.tpr-debug {
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0.3;
}

.tpr-reply-user {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  opacity: 0.3;

  :last-child {
    color: #00c3ffff;
    text-decoration: underline solid #00c3ffff;
    text-underline-position: under;
  }
}

.tpr-floor {
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.3;
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
  border-radius: 4px;
  background: var(--app-page-bg);
  overflow-y: auto;
  row-gap: 8px;

  &.v-list {
    box-shadow: -4px 0 8px var(--common-shadow-4);
  }
}

.tpr-share {
  cursor: pointer;
  opacity: 0.3;
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
</style>
