<!-- 在发帖表单中选择、替换或移除所属合集 -->
<template>
  <div class="post-collection-picker">
    <button
      ref="trigger"
      :aria-expanded="visible"
      :disabled
      :title="selectedTitle || undefined"
      aria-haspopup="dialog"
      class="post-collection-trigger"
      type="button"
      @click="visible = true"
    >
      <v-icon aria-hidden="true" size="18">mdi-bookshelf</v-icon>
      <span>{{ selectedTitle || "选择合集" }}</span>
      <v-icon aria-hidden="true" size="18">mdi-chevron-down</v-icon>
    </button>
    <TopOverlay
      v-model="visible"
      :showShare="false"
      :titleId="titleId"
      closeAriaLabel="关闭合集选择"
      contentMaxHeight="none"
      panelMaxHeight="calc(100dvh - 48px)"
      panelWidth="600px"
      @after-enter="focusSelection"
      @after-leave="trigger?.focus()"
    >
      <template #header>
        <div class="post-collection-heading">
          <h2 :id="titleId">选择合集</h2>
        </div>
      </template>
      <div ref="optionsPanel" class="post-collection-options" @keydown.esc.stop="visible = false">
        <button
          v-for="item in items"
          :key="item.value ?? 'none'"
          :aria-pressed="selectedId === item.value"
          :disabled
          class="post-collection-option"
          type="button"
          @click="selectCollection(item.value)"
        >
          <span v-if="item.cover" class="post-collection-option-cover">
            <img :src="item.cover" alt="" decoding="async" loading="lazy" />
          </span>
          <span v-else aria-hidden="true" class="post-collection-option-cover is-empty">
            <v-icon size="20">{{
              item.value === null ? "mdi-bookmark-remove-outline" : "mdi-bookshelf"
            }}</v-icon>
          </span>
          <span class="post-collection-option-body">
            <span class="post-collection-option-title">{{ item.title }}</span>
            <span v-if="item.desc" class="post-collection-option-desc">{{ item.desc }}</span>
            <span
              v-if="item.postNum !== undefined || item.viewNum !== undefined"
              aria-label="合集统计"
              class="post-collection-option-meta"
            >
              <span
                v-if="item.postNum !== undefined"
                :title="`${fmtUtil.num(item.postNum)} 篇帖子`"
              >
                <v-icon aria-hidden="true" size="14">mdi-text-box-outline</v-icon>
                {{ fmtUtil.num(item.postNum) }}
              </span>
              <span
                v-if="item.viewNum !== undefined"
                :title="`${fmtUtil.num(item.viewNum)} 次浏览`"
              >
                <v-icon aria-hidden="true" size="14">mdi-eye-outline</v-icon>
                {{ fmtUtil.num(item.viewNum) }}
              </span>
            </span>
          </span>
          <v-icon
            v-if="selectedId === item.value"
            aria-hidden="true"
            class="post-collection-option-check"
            size="18"
            >mdi-check</v-icon
          >
        </button>
        <p v-if="loading" class="post-collection-status" role="status">正在加载合集…</p>
        <div v-else-if="error" class="post-collection-status" role="alert">
          <p>{{ error }}</p>
          <v-btn size="small" type="button" variant="text" @click="loadCollections">重新载入</v-btn>
        </div>
        <p v-else-if="choices.length === 0" class="post-collection-status">暂无可选合集</p>
      </div>
    </TopOverlay>
  </div>
</template>

<script lang="ts" setup>
import TopOverlay from "@comp/app/top-overlay.vue";
import communityReq from "@req/communityReq.js";
import fmtUtil from "@utils/display/fmtUtil.js";
import TGHttps from "@utils/network/TGHttps.js";
import { computed, onBeforeUnmount, ref, shallowRef, useId, useTemplateRef, watch } from "vue";

type CollectionPickerProps = {
  accountCookie?: TGApp.App.Account.Cookie;
  disabled: boolean;
  sourceId?: string | null;
  sourceTitle?: string;
};
type CollectionOption = {
  title: string;
  value: string | null;
  cover?: string;
  desc?: string;
  postNum?: number;
  viewNum?: number;
};

const { accountCookie, disabled, sourceId, sourceTitle } = defineProps<CollectionPickerProps>();
const collectionId = defineModel<string | null | undefined>({ required: true });
const titleId = useId();
const trigger = useTemplateRef<HTMLButtonElement>("trigger");
const optionsPanel = useTemplateRef<HTMLDivElement>("optionsPanel");
const visible = ref<boolean>(false);
const choices = shallowRef<Array<CollectionOption>>([]);
const loading = ref<boolean>(false);
const error = ref<string>("");
let requestVersion = 0;

const selectedId = computed<string | null>(() =>
  collectionId.value === undefined ? (sourceId ?? null) : collectionId.value,
);
const items = computed<Array<CollectionOption>>(() => {
  const options: Array<CollectionOption> = [{ title: "不加入合集", value: null }];
  const selected = selectedId.value;
  if (selected !== null && !choices.value.some((item) => item.value === selected)) {
    options.push({
      title: (selected === sourceId && sourceTitle) || `合集 ${selected}`,
      value: selected,
    });
  }
  return [...options, ...choices.value];
});
const selectedTitle = computed<string>(() =>
  selectedId.value === null
    ? ""
    : (items.value.find((item) => item.value === selectedId.value)?.title ?? ""),
);

watch(
  () => [
    accountCookie?.ltuid_v2,
    accountCookie?.ltoken_v2,
    accountCookie?.account_id_v2,
    accountCookie?.cookie_token_v2,
  ],
  () => void loadCollections(),
  { immediate: true, flush: "sync" },
);
onBeforeUnmount(() => {
  requestVersion += 1;
});

function focusSelection(): void {
  optionsPanel.value?.querySelector<HTMLButtonElement>('button[aria-pressed="true"]')?.focus();
}

function selectCollection(value: string | null): void {
  if (disabled) return;
  if (value !== selectedId.value) collectionId.value = value;
  visible.value = false;
}

async function loadCollections(): Promise<void> {
  const version = ++requestVersion;
  choices.value = [];
  error.value = "";
  loading.value = false;
  if (!accountCookie) return;
  const cookie = { ...accountCookie };
  const options = new Map<string, CollectionOption>();
  const cursors = new Set<string>();
  let cursor: string | undefined;
  loading.value = true;
  try {
    do {
      const response = await communityReq.collections(cookie, undefined, cursor);
      if (version !== requestVersion) return;
      if (response.retcode !== 0) throw new Error(response.message || `错误 ${response.retcode}`);
      for (const item of response.data.list) {
        if (item.is_delete || (typeof item.id === "number" && !Number.isSafeInteger(item.id)))
          continue;
        const id = String(item.id);
        if (!/^[1-9]\d*$/u.test(id)) continue;
        const title = typeof item.title === "string" ? item.title.trim() : "";
        options.set(id, {
          title: title || `合集 ${id}`,
          value: id,
          ...(item.cover ? { cover: item.cover } : {}),
          ...(item.desc ? { desc: item.desc } : {}),
          ...(typeof item.post_num === "number" && Number.isFinite(item.post_num)
            ? { postNum: item.post_num }
            : {}),
          ...(typeof item.view_num === "number" && Number.isFinite(item.view_num)
            ? { viewNum: item.view_num }
            : {}),
        });
      }
      if (response.data.is_last) break;
      cursor = response.data.next_offset;
      if (!cursor.trim() || cursors.has(cursor)) throw new Error("合集列表分页中断");
      cursors.add(cursor);
    } while (cursor);
    choices.value = Array.from(options.values());
  } catch (cause) {
    if (version === requestVersion) error.value = `加载合集失败：${TGHttps.getErrMsg(cause)}`;
  } finally {
    if (version === requestVersion) loading.value = false;
  }
}

defineExpose({ selectedTitle, visible });
</script>

<style lang="scss" scoped>
.post-collection-heading {
  min-width: 0;

  h2 {
    margin: 0;
    color: var(--common-text-title);
    font-family: var(--font-title);
    font-size: 18px;
    font-weight: normal;
    line-height: 24px;
  }
}

.post-collection-picker {
  width: fit-content;
  max-width: 100%;
}

.post-collection-trigger,
.post-collection-option {
  display: flex;
  width: 100%;
  min-height: 36px;
  align-items: center;
  padding: 8px 12px;
  border: 1px solid var(--common-shadow-2);
  border-radius: 4px;
  background: var(--app-page-bg);
  color: var(--box-text-2);
  cursor: pointer;
  font: inherit;
  font-size: 14px;
  gap: 8px;
  text-align: start;

  &:disabled {
    cursor: default;
  }

  &:focus-visible {
    outline: 2px solid var(--common-text-title);
    outline-offset: -2px;
  }
}

.post-collection-trigger {
  width: fit-content;
  max-width: 100%;
}

.post-collection-trigger > span {
  overflow: hidden;
  min-width: 0;
  flex: 1;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.post-collection-options {
  display: grid;
  width: 100%;
  max-height: min(56dvh, 520px);
  gap: 4px;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.post-collection-option {
  padding: 8px 10px;
  border-color: transparent;
  background: transparent;
  gap: 10px;
}

.post-collection-option-cover {
  display: grid;
  overflow: hidden;
  width: 60px;
  height: 60px;
  flex: none;
  border-radius: 4px;
  background: var(--box-bg-2);
  color: var(--box-text-4);
  place-items: center;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.post-collection-option-body {
  display: flex;
  overflow: hidden;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 2px;
}

.post-collection-option-title {
  overflow: hidden;
  color: var(--common-text-title);
  font-size: 14px;
  line-height: 20px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.post-collection-option-desc {
  overflow: hidden;
  color: var(--box-text-4);
  font-size: 12px;
  line-height: 18px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.post-collection-option-meta {
  display: flex;
  flex-wrap: wrap;
  color: var(--box-text-4);
  font-size: 12px;
  gap: 8px;
  line-height: 18px;

  span {
    display: inline-flex;
    align-items: center;
    gap: 2px;
  }
}

.post-collection-option-check {
  flex: none;
  color: var(--tgc-od-blue);
}

.post-collection-option[aria-pressed="true"],
.post-collection-trigger:hover:not(:disabled),
.post-collection-option:hover:not(:disabled) {
  background: var(--box-bg-4);
  color: var(--common-text-title);
}

.post-collection-status {
  padding: 8px 12px;
  margin: 0;
  color: var(--box-text-4);
  font-size: 12px;

  p {
    margin: 0;
  }
}
</style>
