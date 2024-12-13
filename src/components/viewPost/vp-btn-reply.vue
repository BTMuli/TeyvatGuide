<template>
  <div class="tpr-main-box" title="查看回复">
    <v-menu
      location="end"
      :close-on-content-click="false"
      v-model="showOverlay"
      :persistent="true"
      :no-click-animation="true"
      z-index="60"
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
        <div class="tpr-main-filter">
          <v-chip color="primary" label @click="handleDebug">回复列表</v-chip>
          <v-switch
            v-model="onlyLz"
            color="primary"
            :hide-details="true"
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
          <v-btn @click="showOverlay = false" icon="mdi-close" class="tpr-btn-close" size="small" />
        </div>
        <v-list class="tpr-reply-list">
          <VpReplyItem
            v-for="(item, index) in reply"
            :key="index"
            :modelValue="item"
            mode="main"
            :pinId="pinId"
          />
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
  <VpReplyDebug v-if="devMode" v-model="showDebug" />
</template>
<script lang="ts" setup>
import showSnackbar from "@comp/func/snackbar.js";
import Mys from "@Mys/index.js";
import { storeToRefs } from "pinia";
import { computed, ref, shallowRef, watch } from "vue";

import VpReplyDebug from "./vp-reply-debug.vue";
import VpReplyItem from "./vp-reply-item.vue";

import { useAppStore } from "@/store/modules/app.js";

type TprMainProps = { gid: number; postId: string };
type SelectItem = { label: string; value: string };
const props = defineProps<TprMainProps>();
const { devMode } = storeToRefs(useAppStore());

const orderList: Array<SelectItem> = [
  { label: "热门", value: "hot" },
  { label: "最新", value: "latest" },
  { label: "最早", value: "oldest" },
];

const pinId = ref<string>("0");
const lastId = ref<string>();
const isLast = ref<boolean>(false);
const loading = ref<boolean>(false);
const showOverlay = ref<boolean>(false);
const showDebug = ref<boolean>(false);
const onlyLz = ref<boolean>(false);
const orderType = ref<"hot" | "latest" | "oldest">("hot");
const reply = shallowRef<Array<TGApp.Plugins.Mys.Reply.ReplyFull>>([]);
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
  const resp = await Mys.Post.getPostReplies(
    props.postId,
    props.gid,
    isHot.value,
    lastId.value,
    onlyLz.value,
    replyOrder.value,
  );
  if ("retcode" in resp) {
    showSnackbar.error(`[${resp.retcode}] ${resp.message}`);
    return;
  }
  isLast.value = resp.is_last;
  lastId.value = resp.last_id;
  pinId.value = resp.pin_reply_id;
  reply.value = reply.value.concat(resp.list);
  loading.value = false;
  if (isLast.value) {
    showSnackbar.warn("没有更多了");
    return;
  }
  showSnackbar.success(`成功加载${resp.list.length}条回复`);
}

async function handleDebug(): Promise<void> {
  if (devMode.value) {
    showDebug.value = true;
    return;
  }
  if (showDebug.value) showDebug.value = false;
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
