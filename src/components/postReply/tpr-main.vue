<template>
  <div class="tpr-main-box" title="查看回复">
    <v-menu
      location="end"
      :close-on-content-click="false"
      v-model="showOverlay"
      :persistent="true"
      :no-click-animation="true"
      z-index="40"
    >
      <template #activator="{ props }">
        <v-btn
          :loading="loading"
          class="tpr-btn"
          size="38px"
          variant="outlined"
          @click="showReply()"
          icon="mdi-message-text-outline"
          v-bind="props"
        />
      </template>
      <div class="tpr-main-reply">
        <!-- 顶部负责显示回复条件&关闭按钮&刷新按钮 -->
        <div class="tpr-main-filter">
          <v-chip color="primary" label @click="handleDebug">回复列表</v-chip>
          <v-switch
            v-model="onlyLz"
            color="primary"
            hide-details
            title="只看楼主"
            @change="reloadReply"
          />
          <v-select
            class="tpr-select"
            density="compact"
            v-model="orderType"
            :items="orderList"
            item-title="label"
            item-value="value"
            title="排序方式"
          />
          <v-btn @click="showOverlay = false" icon class="tpr-btn-close" size="small">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </div>
        <v-list class="tpr-reply-list">
          <TprReply v-for="(item, index) in reply" :key="index" :modelValue="item" mode="main" />
          <div v-if="isLast" class="tpr-list-item">
            <v-chip color="info" label>没有更多了</v-chip>
          </div>
          <div v-else class="tpr-list-item">
            <v-btn @click="loadReply()" color="primary" :loading="loading">加载更多</v-btn>
          </div>
        </v-list>
      </div>
    </v-menu>
  </div>
  <TprDebug v-if="appStore.devMode" v-model="showDebug" />
</template>
<script lang="ts" setup>
import { computed, ref, watch } from "vue";

import Mys from "../../plugins/Mys/index.js";
import { useAppStore } from "../../store/modules/app.js";
import showSnackbar from "../func/snackbar.js";

import TprDebug from "./tpr-debug.vue";
import TprReply from "./tpr-reply.vue";

interface TprMainProps {
  gid: number;
  postId: string;
}

const props = defineProps<TprMainProps>();
const appStore = useAppStore();

const orderList = [
  { label: "热门", value: "hot" },
  { label: "最新", value: "latest" },
  { label: "最早", value: "oldest" },
];

const reply = ref<Array<TGApp.Plugins.Mys.Reply.ReplyFull>>([]);
const lastId = ref<string | undefined>(undefined);
const isLast = ref<boolean>(false);
const loading = ref<boolean>(false);
const showOverlay = ref<boolean>(false);
const showDebug = ref<boolean>(false);
const onlyLz = ref<boolean>(false);
const orderType = ref<"hot" | "latest" | "oldest">("hot");

const isHot = computed<boolean>(() => orderType.value === "hot");
const replyOrder = computed<1 | 2 | undefined>(() => {
  if (orderType.value === "hot") return undefined;
  if (orderType.value === "latest") return 2;
  if (orderType.value === "oldest") return 1;
  return undefined;
});

watch(
  () => orderType.value,
  async () => {
    onlyLz.value = false;
    await reloadReply();
  },
);

async function showReply(): Promise<void> {
  if (reply.value.length > 0) return;
  if (isLast.value) return;
  await loadReply();
}

async function reloadReply(): Promise<void> {
  lastId.value = undefined;
  reply.value = [];
  await loadReply();
}

async function loadReply(): Promise<void> {
  loading.value = true;
  const resp = await Mys.Post.reply(
    props.postId,
    props.gid,
    isHot.value,
    lastId.value,
    onlyLz.value,
    replyOrder.value,
  );
  if ("retcode" in resp) {
    showSnackbar({
      text: `[${resp.retcode}] ${resp.message}`,
      color: "warn",
    });
    return;
  }
  isLast.value = resp.is_last;
  lastId.value = resp.last_id;
  reply.value = reply.value.concat(resp.list);
  loading.value = false;
  if (isLast.value) {
    showSnackbar({
      text: "没有更多了",
      color: "info",
    });
  } else {
    showSnackbar({
      text: `成功加载${resp.list.length}条回复`,
      color: "success",
    });
  }
}

async function handleDebug(): Promise<void> {
  if (appStore.devMode) {
    showDebug.value = true;
    return;
  }
  if (showDebug.value) {
    showDebug.value = false;
  }
  // 刷新回复
  await reloadReply();
}
</script>
<style lang="css" scoped>
.tpr-main-box {
  position: fixed;
  bottom: 20px;
  left: 20px;
}

.tpr-btn {
  display: flex;
  width: 24px;
  height: 24px;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--common-shadow-8);
}

.tpr-btn:hover {
  opacity: 0.8;
}

.tpr-btn-close {
  border: 1px solid var(--common-shadow-4);
  background: var(--tgc-btn-1);
  color: var(--btn-text);
}

.tpr-main-reply {
  position: relative;
  display: flex;
  width: 300px;
  height: 400px;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: 5px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 5px;
  margin-left: 5px;
  background: var(--app-page-bg);
  overflow-y: auto;
  row-gap: 10px;
}

.tpr-main-filter {
  display: flex;
  width: 100%;
  height: 40px;
  align-items: center;
  justify-content: space-between;
  color: var(--app-page-content);
  column-gap: 10px;
}

.tpr-select {
  height: 40px;
  font-size: 12px;
}

.tpr-reply-list {
  position: relative;
  display: flex;
  width: 100%;
  height: 360px;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: 0 5px;
  background: var(--app-page-bg);
  overflow-y: auto;
  row-gap: 5px;
}

.tpr-list-item {
  position: relative;
  display: flex;
  width: 100%;
  height: 40px;
  align-items: center;
  justify-content: center;
}
</style>
