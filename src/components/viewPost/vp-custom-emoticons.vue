<!-- 帖子与回复共用的收藏表情选择面板 -->
<template>
  <div class="custom-emoticons">
    <div class="custom-emoticons-heading">
      <div class="custom-emoticons-label">
        <span class="custom-emoticons-title">收藏表情</span>
        <span v-if="!loading && !error && items.length" class="custom-emoticons-count">
          {{ items.length }} 个
        </span>
      </div>
      <button
        :disabled="disabled || loading"
        aria-label="刷新收藏表情"
        class="custom-emoticons-action custom-emoticons-refresh"
        title="刷新收藏表情"
        type="button"
        @click="load"
      >
        <v-icon size="18">mdi-refresh</v-icon>
      </button>
    </div>
    <div v-if="loading" aria-live="polite" class="custom-emoticons-status" role="status">
      <v-progress-circular aria-hidden="true" indeterminate :size="24" :width="2" />
      <span>正在加载收藏表情…</span>
    </div>
    <div v-else-if="error" class="custom-emoticons-status" role="alert">
      <v-icon aria-hidden="true" size="28">mdi-alert-circle-outline</v-icon>
      <span>{{ error }}</span>
      <button :disabled="disabled" class="custom-emoticons-action" type="button" @click="load">
        重新加载
      </button>
    </div>
    <div v-else-if="items.length === 0" class="custom-emoticons-status" role="status">
      <v-icon aria-hidden="true" size="32">mdi-emoticon-outline</v-icon>
      <span>暂无可用的收藏表情</span>
    </div>
    <div v-else aria-label="收藏表情列表" class="custom-emoticons-grid">
      <button
        v-for="(item, index) in items"
        :key="item.id"
        :aria-label="`插入收藏表情 ${index + 1}`"
        :disabled="disabled"
        :title="`收藏表情 ${index + 1}`"
        class="custom-emoticons-item"
        type="button"
        @click="select(item)"
      >
        <img :src="item.url" alt="" draggable="false" loading="lazy" />
      </button>
    </div>
    <p v-if="!loading && !error && items.length" class="custom-emoticons-hint">
      点击插入，每条内容最多 1 个
    </p>
  </div>
</template>
<script lang="ts" setup>
import customEmoticonReq from "@req/customEmoticonReq.js";
import { parseCustomEmoticon } from "@utils/bbsCustomEmoticon.js";
import { matchesCurrentAccount } from "@utils/bbsReplyAccount.js";
import { onBeforeUnmount, ref, watch } from "vue";

const props = defineProps<{
  cookie?: Record<string, string>;
  contextId: number;
  disabled: boolean;
}>();
const emits = defineEmits<{
  select: [value: TGApp.BBS.CustomEmoticon.Value];
}>();
const items = ref<Array<TGApp.BBS.CustomEmoticon.Item>>([]);
const loading = ref<boolean>(false);
const error = ref<string>("");
let controller: AbortController | undefined;
let version = 0;
let mounted = true;

watch(
  () => [
    props.contextId,
    props.cookie?.ltuid,
    props.cookie?.ltoken,
    props.cookie?.stuid,
    props.cookie?.stoken,
    props.cookie?.mid,
    props.disabled,
  ],
  () => void load(),
  { immediate: true, flush: "sync" },
);

onBeforeUnmount(() => {
  mounted = false;
  version += 1;
  controller?.abort();
});

function getCookie(): Record<string, string> {
  const cookie = props.cookie;
  if (!cookie?.ltoken || !cookie.ltuid) throw new Error("请先登录米游社账号");
  const snapshot = {
    ltoken: cookie.ltoken,
    ltuid: cookie.ltuid,
    stoken: cookie.stoken,
    stuid: cookie.stuid,
    mid: cookie.mid,
  };
  if (!matchesCurrentAccount({ uid: snapshot.ltuid, cookie: snapshot })) {
    throw new Error("账号状态已变化，请重新打开编辑器");
  }
  return snapshot;
}

async function load(): Promise<void> {
  const current = ++version;
  controller?.abort();
  controller = undefined;
  items.value = [];
  error.value = "";
  loading.value = false;
  if (props.disabled) return;
  const request = new AbortController();
  controller = request;
  loading.value = true;
  try {
    const cookie = getCookie();
    const response = await customEmoticonReq.list(cookie, request.signal);
    if (!mounted || current !== version || request.signal.aborted) return;
    getCookie();
    items.value = response;
  } catch (cause) {
    if (mounted && current === version && !request.signal.aborted) {
      error.value = cause instanceof Error ? cause.message : "收藏表情加载失败，请重试";
    }
  } finally {
    if (controller === request) {
      controller = undefined;
      loading.value = false;
    }
  }
}

function select(item: TGApp.BBS.CustomEmoticon.Item): void {
  if (props.disabled || loading.value || !item.is_available) return;
  try {
    getCookie();
    emits("select", parseCustomEmoticon(item));
  } catch (cause) {
    items.value = [];
    error.value = cause instanceof Error ? cause.message : "无法插入收藏表情";
  }
}
</script>
<style lang="scss" scoped>
.custom-emoticons {
  display: flex;
  overflow: hidden;
  min-width: 0;
  min-height: 0;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 8px;
}

.custom-emoticons-heading {
  display: flex;
  min-height: 32px;
  flex: none;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.custom-emoticons-label {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
}

.custom-emoticons-title {
  color: var(--app-page-content);
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;
}

.custom-emoticons-count,
.custom-emoticons-hint {
  color: var(--box-text-2);
  font-size: 12px;
  line-height: 16px;
}

.custom-emoticons-action,
.custom-emoticons-item {
  box-sizing: border-box;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  color: var(--app-page-content);
  cursor: pointer;
  font: inherit;

  &:hover:not(:disabled) {
    border-color: var(--common-shadow-2);
    background: var(--box-bg-4);
  }

  &:focus-visible {
    outline: 2px solid var(--common-text-title);
    outline-offset: 2px;
  }

  &:active:not(:disabled) {
    background: var(--box-bg-3);
  }

  &:disabled {
    cursor: default;
    opacity: 0.5;
  }
}

.custom-emoticons-action {
  min-width: 32px;
  min-height: 32px;
  flex: none;
  padding: 4px 8px;
}

.custom-emoticons-refresh {
  width: 32px;
  padding: 4px;
}

.custom-emoticons-status {
  display: flex;
  min-height: 96px;
  flex: 1 1 auto;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 12px 8px;
  color: var(--box-text-2);
  font-size: 14px;
  gap: 12px;
  line-height: 20px;
  overflow-wrap: anywhere;
  text-align: center;
}

.custom-emoticons-grid {
  display: grid;
  overflow: hidden auto;
  min-height: 0;
  max-height: 260px;
  flex: 1 1 auto;
  align-content: start;
  padding: 4px;
  gap: 8px;
  grid-auto-rows: max-content;
  grid-template-columns: repeat(auto-fill, minmax(min(72px, 100%), 1fr));
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
  scrollbar-width: thin;
}

.custom-emoticons-item {
  position: relative;
  display: block;
  overflow: hidden;
  width: 100%;
  min-width: 0;
  padding: 0;
  border-color: var(--common-shadow-1);
  border-radius: 8px;
  aspect-ratio: 1;
  background: var(--box-bg-4);
}

.custom-emoticons-item img {
  position: absolute;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  padding: 8px;
  inset: 0;
  object-fit: contain;
  pointer-events: none;
  user-select: none;
}

.custom-emoticons-hint {
  flex: none;
  padding: 0 4px;
  margin: 0;
}
</style>
