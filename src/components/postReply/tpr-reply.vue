<template>
  <div class="tpr-reply-box">
    <div
      class="tpr-bubble"
      v-if="props.modelValue.user.reply_bubble !== null"
      :title="props.modelValue.user.reply_bubble.name"
      :style="{
        backgroundColor: props.modelValue.user.reply_bubble.bg_color,
      }"
    >
      <img :src="props.modelValue.user.reply_bubble.url" alt="bubble" />
    </div>
    <div class="tpr-user">
      <div class="tpru-left">
        <img :src="props.modelValue.user.avatar_url" alt="avatar" class="avatar" />
        <img
          :src="props.modelValue.user.pendant"
          v-if="props.modelValue.user.pendant !== ''"
          alt="pendant"
          class="pendant"
        />
      </div>
      <div class="tpru-right" :title="props.modelValue.user.nickname">
        <span>{{ props.modelValue.user.nickname }}</span>
        <span v-if="props.modelValue.is_lz" class="tpru-lz">楼主</span>
      </div>
    </div>
    <div class="tpr-content">
      <TpParser :data="JSON.parse(props.modelValue.reply.struct_content)" />
    </div>
    <div class="tpr-info">
      <div class="tpri-left">
        <span>{{ getTime() }}</span>
        <span>{{ props.modelValue.user.ip_region }}</span>
      </div>
      <div class="tpri-right">
        <span title="点赞数" class="tpr-like">
          <v-icon size="small">mdi-thumb-up</v-icon>
          {{ props.modelValue.stat.like_num }}
        </span>
        <span
          v-if="props.modelValue.sub_replies.length > 0"
          class="tpr-reply"
          title="查看子回复"
          @click="showReply()"
        >
          <v-icon size="small">mdi-message-text</v-icon>
          <v-menu
            submenu
            activator="parent"
            location="end"
            :close-on-content-click="false"
            v-model="showSub"
            :persistent="true"
          >
            <v-list class="tpr-reply-sub" width="300px" max-height="400px">
              <TprReply
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
      <span class="tpr-debug" @click="exportData" title="导出数据">
        <v-icon size="small">mdi-file-export</v-icon>
      </span>
      <span v-if="props.modelValue.r_user" class="tpr-reply-user">
        <span>回复</span>
        <span>{{ props.modelValue.r_user.nickname }}</span>
      </span>
      <span v-if="props.mode === 'main'">{{ props.modelValue.reply.floor_id }}F</span>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { event, path } from "@tauri-apps/api";
import { UnlistenFn, Event } from "@tauri-apps/api/event";
import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import { toRaw, ref, watch, onMounted, onUnmounted } from "vue";

import Mys from "../../plugins/Mys/index.js";
import showConfirm from "../func/confirm.js";
import showSnackbar from "../func/snackbar.js";
import TpParser from "../post/tp-parser.vue";

interface TprReplyProps {
  mode: "main" | "sub";
  modelValue: TGApp.Plugins.Mys.Reply.ReplyFull;
}

const props = defineProps<TprReplyProps>();
const showSub = ref<boolean>(false);
const subReplies = ref<Array<TGApp.Plugins.Mys.Reply.ReplyFull>>([]);
const lastId = ref<string | undefined>(undefined);
const isLast = ref<boolean>(false);
const loading = ref<boolean>(false);
let subListener: UnlistenFn | null = null;

console.log("TprReply", toRaw(props.modelValue));

onMounted(async () => {
  if (props.mode === "main") {
    subListener = await listenSub();
  }
});

onUnmounted(() => {
  if (subListener !== null) {
    subListener();
    subListener = null;
  }
});

watch(
  () => showSub.value,
  async (value) => {
    if (value) {
      await event.emit("openReplySub", props.modelValue.reply.reply_id);
      console.error("emit openReplySub");
    }
  },
);

async function listenSub(): Promise<UnlistenFn> {
  return await event.listen("openReplySub", async (e: Event<string>) => {
    if (e.payload !== props.modelValue.reply.reply_id) {
      if (showSub.value) {
        showSub.value = false;
      }
    }
  });
}

function getTime(): string {
  const time = new Date(props.modelValue.reply.created_at * 1000);
  const now = new Date();
  // 如果是今天，只显示 hh:mm
  if (time.toDateString() === now.toDateString()) {
    return time.toLocaleTimeString();
  }
  // 如果是今年，显示 MM-dd
  if (time.getFullYear() === now.getFullYear()) {
    return time.toLocaleDateString().slice(5);
  }
  // 否则显示 yyyy-MM-dd
  return time.toLocaleDateString();
}

async function showReply(): Promise<void> {
  if (subReplies.value.length > 0) return;
  if (isLast.value) return;
  await loadSub();
}

async function loadSub(): Promise<void> {
  loading.value = true;
  const resp = await Mys.Post.replySub(
    props.modelValue.reply.floor_id,
    props.modelValue.reply.game_id,
    props.modelValue.reply.post_id,
    lastId.value,
  );
  if ("retcode" in resp) {
    showSnackbar({
      text: `[${resp.retcode}] ${resp.message}`,
      color: "error",
    });
    loading.value = false;
    return;
  }
  isLast.value = resp.is_last;
  lastId.value = resp.last_id;
  subReplies.value = subReplies.value.concat(resp.list);
  loading.value = false;
  if (isLast.value) {
    showSnackbar({
      text: "没有更多了",
      color: "info",
    });
  }
}

async function exportData(): Promise<void> {
  const confirm = await showConfirm({
    title: "导出数据?",
    text: "将回复对应的JSON数据导出到文件",
  });
  if (!confirm) {
    showSnackbar({
      text: "已取消",
      color: "cancel",
    });
    return;
  }
  const data = JSON.stringify(toRaw(props.modelValue), null, 2);
  const fileName = `reply_${props.modelValue.reply.post_id}_${props.modelValue.reply.floor_id}_${props.modelValue.reply.reply_id}`;
  const savePath = await save({
    title: "导出回复数据",
    filters: [{ name: "JSON", extensions: ["json"] }],
    defaultPath: `${await path.downloadDir()}${path.sep()}${fileName}.json`,
  });
  if (savePath === null) {
    showSnackbar({
      text: "已取消",
      color: "cancel",
    });
    return;
  }
  await writeTextFile(savePath, data);
  showSnackbar({
    text: "导出成功",
    color: "success",
  });
}
</script>
<style lang="css" scoped>
.tpr-reply-box {
  position: relative;
  display: flex;
  width: 100%;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  padding: 5px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 5px;
  background: var(--box-bg-1);
  row-gap: 5px;
  word-break: break-all;
}

.tpr-bubble {
  position: absolute;
  top: 0;
  right: 0;
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
  width: 100%;
  height: 40px;
  align-items: center;
  justify-content: flex-start;
  gap: 5px;
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
  width: 30px;
  height: 30px;
  border-radius: 50%;
  object-fit: cover;
}

.pendant {
  position: absolute;
  top: 0;
  left: 0;
  width: 40px;
  height: 40px;
  object-fit: cover;
}

.tpru-right {
  display: flex;
  overflow: hidden;
  align-items: center;
  justify-content: center;
  column-gap: 5px;
  font-family: var(--font-title);
  font-size: 16px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tpru-lz {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 2px;
  border-radius: 2px;
  background: var(--tgc-od-blue);
  font-size: 12px;
}

.tpr-content {
  width: 100%;
}

.tpr-info {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  opacity: 0.5;
}

.tpri-left {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
}

.tpri-right {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
}

.tpr-like {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
}

.tpr-reply {
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  gap: 5px;
}

.tpr-extra {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: flex-end;
  font-size: 12px;
  gap: 5px;
  opacity: 0.3;
}

.tpr-debug {
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.tpr-reply-user {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;

  :last-child {
    color: #00c3ff;
    text-decoration: underline solid #00c3ff;
    text-underline-position: under;
  }
}

.tpr-reply-sub {
  position: relative;
  display: flex;
  width: 100%;
  max-height: 360px;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: 5px;
  background: var(--app-page-bg);
  overflow-y: auto;
  row-gap: 5px;
}
</style>
