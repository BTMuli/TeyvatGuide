<template>
  <div class="tpr-main-box" title="查看回复">
    <v-menu
      location="end"
      :close-on-content-click="false"
      v-model="showOverlay"
      :persistent="true"
      :no-click-animation="true"
      z-index="60"
      :offset="[4, 400]"
    >
      <template #activator="{ props }">
        <v-btn
          :loading="loading"
          class="tpr-btn"
          variant="outlined"
          @click="showReply()"
          v-bind="props"
          size="36"
        >
          <template #default>
            <v-icon size="20">mdi-message-text-outline</v-icon>
          </template>
        </v-btn>
      </template>
      <div class="tpr-main-reply">
        <div class="tpr-main-filter">
          <div class="tpr-title">
            <span title="刷新" @click="handleDebug">回复列表</span>
            <v-btn @click="showOverlay = false" icon="mdi-close" class="tpr-btn-close" size="32" />
          </div>
          <div class="tpr-subtitle">
            <div class="tpr-switch" @click="switchOnlyLz()">
              <v-icon v-if="onlyLz" color="var(--tgc-od-green)">
                mdi-checkbox-marked-circle-outline
              </v-icon>
              <v-icon v-else color="var(--tgc-od-white)">mdi-circle</v-icon>
              <span>只看楼主</span>
            </div>
            <div class="tpr-select">
              <v-select
                :hide-details="true"
                variant="outlined"
                density="compact"
                v-model="orderType"
                :items="orderList"
                item-title="label"
                item-value="value"
                label="排序方式"
              />
            </div>
          </div>
        </div>
        <v-list class="tpr-reply-list" ref="replyListRef">
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
import { useBoxReachBottom } from "@hooks/reachBottom.js";
import postReq from "@req/postReq.js";
import useAppStore from "@store/app.js";
import { storeToRefs } from "pinia";
import { computed, ref, shallowRef, useTemplateRef, watch } from "vue";

import VpReplyDebug from "./vp-reply-debug.vue";
import VpReplyItem from "./vp-reply-item.vue";

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
const reply = shallowRef<Array<TGApp.BBS.Reply.ReplyFull>>([]);
const isHot = computed<boolean>(() => orderType.value === "hot");
const replyOrder = computed<1 | 2 | undefined>(() => {
  if (orderType.value === "hot") return undefined;
  if (orderType.value === "latest") return 2;
  if (orderType.value === "oldest") return 1;
  return undefined;
});

const replyListRef = useTemplateRef<HTMLElement>("replyListRef");
const { isReachBottom } = useBoxReachBottom(replyListRef);

watch(
  () => isReachBottom.value,
  async () => {
    if (!isReachBottom.value || loading.value || isLast.value) return;
    await loadReply();
  },
);

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

async function switchOnlyLz(): Promise<void> {
  onlyLz.value = !onlyLz.value;
  await reloadReply();
}

async function reloadReply(): Promise<void> {
  lastId.value = undefined;
  reply.value = [];
  await loadReply();
}

async function loadReply(): Promise<void> {
  loading.value = true;
  const resp = await postReq.reply.main(
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
<style lang="scss" scoped>
.tpr-main-box {
  position: fixed;
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
  width: 300px;
  height: 400px;
  box-sizing: border-box;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: 8px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--app-page-bg);
  box-shadow: 2px 2px 8px var(--common-shadow-4);
  overflow-y: auto;
  row-gap: 8px;
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

  span {
    padding: 2px 4px;
    border-radius: 4px;
    background: var(--tgc-od-blue);
    color: var(--tgc-white-1);
    cursor: pointer;
    font-family: var(--font-title);
    white-space: nowrap;
  }
}

.tpr-btn-close {
  border: 1px solid var(--common-shadow-2);
  margin-left: auto;
  background: var(--tgc-btn-1);
  color: var(--btn-text);
}

.tpr-subtitle {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
}

.tpr-select {
  position: relative;
  width: 120px;
}

.tpr-switch {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-family: var(--font-title);
  font-size: 18px;
}

.tpr-reply-list {
  position: relative;
  display: flex;
  overflow: hidden auto;
  width: 100%;
  height: 360px;
  box-sizing: border-box;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding-top: 0;
  padding-right: 4px;
  background: var(--app-page-bg);
  row-gap: 8px;
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
