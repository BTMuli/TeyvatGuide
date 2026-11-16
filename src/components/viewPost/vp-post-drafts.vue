<!-- 米游社云草稿列表 -->
<template>
  <TopOverlay
    v-model="visible"
    :showShare="false"
    :titleId="titleId"
    blurVal="10px"
    closeAriaLabel="关闭草稿箱"
    :closeDisabled="deletingId !== undefined"
    contentMaxHeight="none"
    panelMaxHeight="calc(100dvh - 48px)"
    panelWidth="560px"
  >
    <template #header>
      <div class="post-drafts-heading">
        <h2 :id="titleId">草稿箱</h2>
      </div>
    </template>

    <div class="post-drafts-body">
      <div aria-label="草稿类型" class="post-drafts-types" role="group">
        <v-btn
          :aria-pressed="viewType === 1"
          :disabled="deletingId !== undefined"
          :variant="viewType === 1 ? 'tonal' : 'text'"
          type="button"
          @click="viewType = 1"
          >长文</v-btn
        >
        <v-btn
          :aria-pressed="viewType === 2"
          :disabled="deletingId !== undefined"
          :variant="viewType === 2 ? 'tonal' : 'text'"
          type="button"
          @click="viewType = 2"
          >图文</v-btn
        >
      </div>
      <TStatePanel
        v-if="opening || (loading && drafts.length === 0)"
        fill
        :message="opening ? '正在载入草稿…' : '正在加载草稿…'"
        variant="loading"
      />
      <TStatePanel
        v-else-if="error && drafts.length === 0"
        :message="error"
        variant="error"
        @retry="loadFirstPage"
      />
      <TStatePanel
        v-else-if="drafts.length === 0"
        fill
        icon="mdi-note-outline"
        message="暂无草稿"
        variant="empty"
      />
      <div v-else class="post-drafts-list" role="list" aria-label="米游社草稿列表">
        <article
          v-for="draft in drafts"
          :key="draft.id"
          class="post-drafts-item"
          role="listitem"
          @click="openDraft(draft)"
        >
          <div
            :aria-label="getDraftLabel(draft)"
            :aria-disabled="!isSupportedDraft(draft) || opening || deletingId !== undefined"
            :tabindex="isSupportedDraft(draft) && deletingId === undefined ? 0 : -1"
            class="post-drafts-item-action"
            role="button"
            @keydown.enter.stop.prevent="openDraft(draft)"
            @keydown.space.stop.prevent="openDraft(draft)"
          >
            <v-icon aria-hidden="true" size="20">
              {{ draft.viewType === 2 ? "mdi-image-edit-outline" : "mdi-text-box-edit-outline" }}
            </v-icon>
            <span class="post-drafts-item-copy">
              <span class="post-drafts-item-title">{{ draft.subject || "无标题草稿" }}</span>
              <span class="post-drafts-item-meta">
                {{ getDraftTypeLabel(draft) }}
                <template v-if="draft.updatedAt > 0">
                  · {{ formatDraftTime(draft.updatedAt) }}</template
                >
              </span>
            </span>
            <span v-if="!isSupportedDraft(draft)" class="post-drafts-item-unsupported">
              暂不支持
            </span>
          </div>
          <button
            :aria-label="`删除草稿：${draft.subject || '无标题草稿'}`"
            class="post-drafts-delete"
            :disabled="deletingId !== undefined || opening"
            type="button"
            @click.stop="deleteDraft(draft)"
          >
            <v-progress-circular
              v-if="deletingId === draft.id"
              aria-hidden="true"
              indeterminate
              size="18"
              tag="span"
              width="2"
            />
            <v-icon v-else aria-hidden="true" size="18">mdi-delete-outline</v-icon>
          </button>
          <button
            v-if="isSupportedDraft(draft)"
            :aria-label="`打开草稿：${draft.subject || '无标题草稿'}`"
            class="post-drafts-open"
            :disabled="deletingId !== undefined || opening"
            title="打开草稿"
            type="button"
            @click.stop="openDraft(draft)"
          >
            <v-icon aria-hidden="true" size="18">mdi-chevron-right</v-icon>
          </button>
        </article>
        <div v-if="error" aria-live="assertive" class="post-drafts-inline-error" role="alert">
          <span>{{ error }}</span>
          <button type="button" @click="loadNextPage">重试</button>
        </div>
        <div v-if="loading" aria-live="polite" class="post-drafts-loading" role="status">
          <v-progress-circular indeterminate size="18" tag="span" width="2" />
          <span>正在加载更多…</span>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="post-drafts-footer">
        <v-btn
          v-if="!isLast && !loading && !error"
          :disabled="deletingId !== undefined"
          type="button"
          variant="tonal"
          @click="loadNextPage"
        >
          加载更多
        </v-btn>
      </div>
    </template>
  </TopOverlay>
</template>

<script lang="ts" setup>
import TStatePanel from "@comp/app/t-state-panel.vue";
import TopOverlay from "@comp/app/top-overlay.vue";
import showDialog from "@comp/func/dialog.js";
import showSnackbar from "@comp/func/snackbar.js";
import postDraftReq from "@req/postDraftReq.js";
import useUserStore from "@store/user.js";
import { executeReplyForCurrentAccount, matchesCurrentAccount } from "@utils/bbs/replyAccount.js";
import TGHttps from "@utils/network/TGHttps.js";
import { storeToRefs } from "pinia";
import { computed, onBeforeUnmount, ref, useId, watch } from "vue";
import { useRouter } from "vue-router";

const props = defineProps<{ gid: number }>();
const visible = defineModel<boolean>({ required: true });
const titleId = useId();
const router = useRouter();
const { uid, cookie } = storeToRefs(useUserStore());
const drafts = ref<Array<TGApp.BBS.PostDraft.Item>>([]);
const loading = ref<boolean>(false);
const opening = ref<boolean>(false);
const deletingId = ref<string | undefined>(undefined);
const error = ref<string>("");
const isLast = ref<boolean>(true);
const nextOffset = ref<string>("0");
const viewType = ref<TGApp.BBS.PostDraft.ViewType>(1);
const accountReady = computed<boolean>(
  () => !!uid.value && cookie.value?.ltuid === uid.value && !!cookie.value?.ltoken.trim(),
);
let active = true;
let requestVersion = 0;
const emits = defineEmits<{ deleted: [draftId: string] }>();

watch(viewType, () => {
  resetList();
  if (visible.value) void loadNextPage();
});

watch(
  visible,
  (isVisible) => {
    requestVersion += 1;
    if (isVisible) {
      resetList();
      void loadNextPage();
    }
  },
  { immediate: true },
);

watch(
  [
    uid,
    () => cookie.value?.account_id,
    () => cookie.value?.cookie_token,
    () => cookie.value?.ltuid,
    () => cookie.value?.ltoken,
  ],
  () => {
    if (!visible.value) return;
    resetList();
    void loadNextPage();
  },
);

onBeforeUnmount(() => {
  active = false;
  requestVersion += 1;
});

function resetList(): void {
  requestVersion += 1;
  opening.value = false;
  deletingId.value = undefined;
  loading.value = false;
  drafts.value = [];
  error.value = "";
  isLast.value = false;
  nextOffset.value = "0";
}

function getAccountSnapshot(): TGApp.BBS.Reply.AccountSnapshot | undefined {
  if (!accountReady.value || !uid.value || !cookie.value) return undefined;
  return {
    uid: uid.value,
    cookie: { ltoken: cookie.value.ltoken, ltuid: cookie.value.ltuid },
  };
}

async function loadFirstPage(): Promise<void> {
  if (!visible.value) return;
  resetList();
  await loadNextPage();
}

async function loadNextPage(): Promise<void> {
  if (
    !visible.value ||
    loading.value ||
    deletingId.value !== undefined ||
    (isLast.value && drafts.value.length > 0)
  )
    return;
  const snapshot = getAccountSnapshot();
  if (!snapshot) {
    error.value = "请先登录米游社账号";
    return;
  }
  if (!matchesCurrentAccount(snapshot)) {
    error.value = "当前米游社账号已变化，请重新打开草稿箱";
    return;
  }
  const version = ++requestVersion;
  const offset = nextOffset.value;
  loading.value = true;
  error.value = "";
  try {
    const response = await postDraftReq.list(snapshot.cookie, offset, 20, viewType.value);
    if (!active || version !== requestVersion || !matchesCurrentAccount(snapshot)) return;
    if (response.retcode !== 0 || !response.data)
      throw new Error(`[${response.retcode}] ${response.message}`);
    const page = response.data;
    const incoming = new Map(page.list.map((draft) => [draft.id, draft]));
    drafts.value =
      offset === "0"
        ? page.list
        : [...drafts.value.filter((draft) => !incoming.has(draft.id)), ...page.list];
    isLast.value = page.is_last;
    nextOffset.value = page.next_offset;
  } catch (cause) {
    if (active && version === requestVersion) error.value = TGHttps.getErrMsg(cause);
  } finally {
    if (active && version === requestVersion) loading.value = false;
  }
}

function isSupportedDraft(draft: TGApp.BBS.PostDraft.Item): boolean {
  return draft.viewType === 1 || draft.viewType === 2;
}

function getDraftTypeLabel(draft: TGApp.BBS.PostDraft.Item): string {
  if (draft.viewType === 1) return "长文";
  if (draft.viewType === 2) return "图文";
  return "其他类型";
}

function getDraftLabel(draft: TGApp.BBS.PostDraft.Item): string {
  const title = draft.subject || "无标题草稿";
  return isSupportedDraft(draft) ? `编辑草稿：${title}` : `${title}，暂不支持编辑`;
}

function formatDraftTime(timestamp: number): string {
  if (timestamp <= 0) return "更新时间未知";
  const milliseconds = timestamp < 1_000_000_000_000 ? timestamp * 1000 : timestamp;
  const date = new Date(milliseconds);
  if (Number.isNaN(date.getTime())) return "更新时间未知";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

async function openDraft(draft: TGApp.BBS.PostDraft.Item): Promise<void> {
  if (!isSupportedDraft(draft) || opening.value || deletingId.value !== undefined) return;
  const snapshot = getAccountSnapshot();
  if (!snapshot || !matchesCurrentAccount(snapshot)) {
    showSnackbar.error("当前米游社账号已变化，请重新打开草稿箱");
    return;
  }
  const version = requestVersion;
  const fallbackGid = props.gid;
  let gid = draft.gid;
  let selectedViewType = draft.viewType;
  opening.value = true;
  try {
    if (!Number.isSafeInteger(gid) || gid <= 0) {
      const response = await postDraftReq.detail(draft.id, snapshot.cookie);
      if (
        !active ||
        !visible.value ||
        version !== requestVersion ||
        !matchesCurrentAccount(snapshot)
      )
        return;
      if (response.retcode !== 0 || !response.data)
        throw new Error(`[${response.retcode}] ${response.message}`);
      gid = response.data.settings.gid || fallbackGid;
      selectedViewType = response.data.settings.viewType ?? draft.viewType;
    }
    if (!Number.isSafeInteger(gid) || gid <= 0)
      throw new Error("草稿未指定社区，请选择分区后重新打开草稿箱");
    opening.value = false;
    visible.value = false;
    await router.push({
      name: "新建帖子",
      params: { gid: String(gid), viewType: String(selectedViewType) },
      query: { draft: draft.id, from: "profile" },
    });
  } catch (cause) {
    if (active && version === requestVersion && matchesCurrentAccount(snapshot))
      showSnackbar.error(TGHttps.getErrMsg(cause));
  } finally {
    if (version === requestVersion) opening.value = false;
  }
}

async function deleteDraft(draft: TGApp.BBS.PostDraft.Item): Promise<void> {
  if (deletingId.value !== undefined || opening.value) return;
  const snapshot = getAccountSnapshot();
  if (!snapshot || !matchesCurrentAccount(snapshot)) {
    showSnackbar.warn("当前米游社账号已变化，请重新打开草稿箱");
    return;
  }
  const version = requestVersion;
  const title = draft.subject || "无标题草稿";
  deletingId.value = draft.id;
  try {
    const confirmed = await showDialog.checkF({
      cancelLabel: "保留",
      confirmLabel: "删除",
      text: "删除米游社云端草稿后不可撤销，确认继续吗？",
      title: `删除草稿「${title}」？`,
    });
    if (confirmed !== true) return;
    if (!active || !visible.value || version !== requestVersion || !matchesCurrentAccount(snapshot))
      return;

    const execution = await executeReplyForCurrentAccount(snapshot, () =>
      postDraftReq.delete(draft.id, snapshot.cookie),
    );
    if (!active || !visible.value || version !== requestVersion || !matchesCurrentAccount(snapshot))
      return;
    if (!execution.allowed) {
      showSnackbar.warn("当前米游社账号已变化，请重新打开草稿箱");
      return;
    }
    const response = execution.data;
    if (response.retcode !== 0) {
      showSnackbar.error(`[${response.retcode}] ${response.message}`);
      return;
    }
    drafts.value = drafts.value.filter((item) => item.id !== draft.id);
    showSnackbar.success("草稿已删除");
    emits("deleted", draft.id);
    if (!isLast.value) await loadFirstPage();
  } catch (cause) {
    if (active && visible.value && version === requestVersion && matchesCurrentAccount(snapshot))
      showSnackbar.error(`删除草稿失败：${TGHttps.getErrMsg(cause)}`);
  } finally {
    if (version === requestVersion) deletingId.value = undefined;
  }
}
</script>

<style lang="scss" scoped>
.post-drafts-heading {
  h2 {
    margin: 0;
    color: var(--common-text-title);
    font-size: 18px;
    font-weight: 600;
    line-height: 24px;
  }
}

.post-drafts-body {
  display: flex;
  min-height: 240px;
  flex-direction: column;
}

.post-drafts-types {
  display: flex;
  margin-bottom: 12px;
  gap: 8px;
}

.post-drafts-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.post-drafts-item {
  position: relative;
  z-index: 0;
  display: flex;
  width: 100%;
  min-width: 0;
  flex-shrink: 0;
  align-items: center;
  padding: 0 8px 0 0;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--box-bg-1);
  gap: 0;

  &:hover {
    background: var(--box-bg-2);
  }
}

.post-drafts-item-action {
  display: flex;
  min-width: 0;
  flex: 1 1 auto;
  align-items: center;
  padding: 12px;
  border: 0;
  background: transparent;
  color: var(--box-text-1);
  cursor: pointer;
  font: inherit;
  gap: 12px;
  text-align: left;

  &:focus-visible {
    outline: 2px solid var(--tgc-od-orange);
    outline-offset: -2px;
  }

  &[aria-disabled="true"] {
    cursor: default;
    opacity: 0.6;
  }
}

.post-drafts-delete,
.post-drafts-open {
  position: relative;
  z-index: 2;
  display: inline-flex;
  min-width: 44px;
  height: 44px;
  flex: 0 0 44px;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
  background: var(--box-bg-2);
  cursor: pointer;
  transition:
    background-color 120ms ease,
    border-color 120ms ease;

  &:focus-visible {
    outline: 2px solid var(--common-text-title);
    outline-offset: 2px;
  }

  &:disabled {
    cursor: default;
    opacity: 0.6;
  }

  &:hover:not(:disabled) {
    border-color: var(--common-shadow-2);
    background: var(--box-bg-3);
  }
}

.post-drafts-delete {
  color: var(--tgc-od-red);
}

.post-drafts-open {
  color: var(--box-text-1);
}

.post-drafts-item:hover .post-drafts-delete,
.post-drafts-item:hover .post-drafts-open {
  background: var(--box-bg-1);
}

.post-drafts-item-copy {
  display: flex;
  min-width: 0;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 2px;
}

.post-drafts-item-title,
.post-drafts-item-meta {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.post-drafts-item-title {
  color: var(--common-text-title);
  font-size: 14px;
  line-height: 20px;
}

.post-drafts-item-meta {
  color: var(--app-page-content);
  font-size: 12px;
  line-height: 16px;
}

.post-drafts-item-unsupported {
  flex-shrink: 0;
  color: var(--app-page-content);
  font-size: 12px;
  white-space: nowrap;
}

.post-drafts-inline-error,
.post-drafts-loading,
.post-drafts-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.post-drafts-inline-error {
  padding: 4px 0;
  color: var(--box-text-8);
  font-size: 12px;

  button {
    color: inherit;
    cursor: pointer;
    text-decoration: underline;
    text-underline-offset: 2px;
  }
}

.post-drafts-loading {
  padding: 8px 0 0;
  color: var(--app-page-content);
  font-size: 12px;
}

.post-drafts-footer {
  min-height: 36px;
}
</style>
