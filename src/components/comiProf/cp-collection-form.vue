<!-- 米游社合集创建与编辑对话框 -->
<template>
  <TopOverlay
    v-model="visible"
    :closeAriaLabel="isEditing ? '关闭编辑合集' : '关闭创建合集'"
    :closeDisabled="saving || coverUploading"
    :showShare="false"
    :titleId="titleId"
    blurVal="8px"
    contentMaxHeight="none"
    panelHeight="480px"
    panelMaxHeight="calc(100dvh - 48px)"
    panelWidth="560px"
  >
    <template #header>
      <div class="cpcf-heading">
        <h2 :id="titleId">{{ isEditing ? "编辑合集" : "创建合集" }}</h2>
        <p>
          {{
            isEditing
              ? "修改合集标题、描述和封面，保存后立即生效。"
              : "创建合集后可整理自己的作品，标题最多 15 字，描述最多 80 字。"
          }}
        </p>
      </div>
    </template>

    <form :id="formId" class="cpcf-form" @submit.prevent="handleSubmit">
      <div class="cpcf-body">
        <CpCollectionCover
          v-model="draft.cover"
          :cookie="coverCookie"
          :disabled="saving"
          @busy="coverUploading = $event"
        />

        <v-text-field
          v-model="draft.title"
          :disabled="saving"
          :error-messages="titleError ? [titleError] : []"
          :maxlength="15"
          autocomplete="off"
          density="comfortable"
          hide-details="auto"
          placeholder="给合集起一个标题"
          variant="outlined"
        >
          <template #label>
            <span class="cpcf-label">
              合集标题
              <span class="cpcf-label-count">{{ draft.title.length }} / 15</span>
            </span>
          </template>
        </v-text-field>
        <v-textarea
          v-model="draft.desc"
          :disabled="saving"
          :maxlength="80"
          class="cpcf-desc"
          density="comfortable"
          hide-details="auto"
          no-resize
          placeholder="简要介绍这个合集"
          :rows="3"
          variant="outlined"
        >
          <template #label>
            <span class="cpcf-label">
              合集描述（可选）
              <span class="cpcf-label-count">{{ draft.desc.length }} / 80</span>
            </span>
          </template>
        </v-textarea>

        <div v-if="error" aria-live="assertive" class="cpcf-error" role="alert">
          <v-icon size="18">mdi-alert-circle-outline</v-icon>
          <span>{{ error }}</span>
        </div>
      </div>
    </form>

    <template #footer>
      <div class="cpcf-footer-actions">
        <v-btn
          :disabled="saving || coverUploading"
          type="button"
          variant="text"
          @click="visible = false"
        >
          取消
        </v-btn>
        <v-btn
          :disabled="saving || coverUploading"
          :form="formId"
          :loading="saving"
          class="cpcf-confirm"
          type="submit"
          variant="flat"
        >
          {{ isEditing ? "保存" : "创建" }}
        </v-btn>
      </div>
    </template>
  </TopOverlay>
</template>

<script lang="ts" setup>
import TopOverlay from "@comp/app/top-overlay.vue";
import CpCollectionCover from "@comp/comiProf/cp-collection-cover.vue";
import communityReq from "@req/communityReq.js";
import useAppStore from "@store/app.js";
import useUserStore from "@store/user.js";
import { matchesCurrentAccount } from "@utils/bbs/replyAccount.js";
import TGHttps from "@utils/network/TGHttps.js";
import { storeToRefs } from "pinia";
import { computed, onBeforeUnmount, reactive, ref, useId, watch } from "vue";

/**
 * 合集信息对话框参数。
 * @since Beta v0.13.0
 */
type CollectionFormProps = {
  /** 待编辑的合集；未提供时为创建合集 */
  collection?: TGApp.BBS.Collection.Collection;
};

/**
 * 合集信息草稿。
 * @since Beta v0.13.0
 */
type CollectionDraft = {
  /** 合集标题 */
  title: string;
  /** 合集描述 */
  desc: string;
  /** 合集封面 */
  cover: string;
};

/**
 * 合集管理的登录账户快照。
 * @since Beta v0.13.0
 */
type AccountSnapshot = {
  /** 当前登录 UID */
  uid: string;
  /** 当前账户 Cookie */
  cookie: TGApp.App.Account.Cookie;
};

/**
 * 封面上传凭据。
 * @since Beta v0.13.1
 */
type CoverCookie = {
  /** 米游社登录令牌 */
  ltoken: string;
  /** 米游社账号 ID */
  ltuid: string;
};

const props = withDefaults(defineProps<CollectionFormProps>(), { collection: undefined });
const visible = defineModel<boolean>({ required: true });
const emits = defineEmits<{ saved: [] }>();
const { isLogin } = storeToRefs(useAppStore());
const { uid, cookie } = storeToRefs(useUserStore());
const titleId = useId();
const formId = useId();
const draft = reactive<CollectionDraft>({ title: "", desc: "", cover: "" });
const submitted = ref<boolean>(false);
const saving = ref<boolean>(false);
const coverUploading = ref<boolean>(false);
const error = ref<string>("");
const isEditing = computed<boolean>(() => props.collection !== undefined);
const coverCookie = computed<CoverCookie | undefined>(() => {
  const current = cookie.value;
  if (!current) return undefined;
  const ltoken = current.ltoken.trim();
  const ltuid = current.ltuid.trim();
  if (!ltoken || !ltuid) return undefined;
  return { ltoken, ltuid };
});
const titleError = computed<string>(() => {
  if (!submitted.value) return "";
  return draft.title.trim() === "" ? "请填写合集标题。" : "";
});
let active = true;
let requestVersion = 0;

watch(
  visible,
  (isOpen) => {
    if (isOpen) initializeForm();
    else cleanupForm();
  },
  { immediate: true },
);

watch(
  () => props.collection?.id,
  () => {
    if (visible.value) initializeForm();
  },
);

onBeforeUnmount(() => {
  active = false;
  requestVersion += 1;
});

function initializeForm(): void {
  requestVersion += 1;
  saving.value = false;
  coverUploading.value = false;
  submitted.value = false;
  error.value = "";
  draft.title = props.collection?.title ?? "";
  draft.desc = props.collection?.desc ?? "";
  draft.cover = props.collection?.cover ?? "";
}

function cleanupForm(): void {
  requestVersion += 1;
  saving.value = false;
  coverUploading.value = false;
  submitted.value = false;
  error.value = "";
}

function getSnapshot(): AccountSnapshot | undefined {
  const loginUid = uid.value?.trim() ?? "";
  const currentCookie = cookie.value;
  if (!isLogin.value || !loginUid || !currentCookie) return undefined;
  if (
    currentCookie.ltuid !== loginUid ||
    !currentCookie.ltoken.trim() ||
    !currentCookie.cookie_token.trim() ||
    !currentCookie.account_id.trim()
  )
    return undefined;
  return { uid: loginUid, cookie: { ...currentCookie } };
}

function isCurrent(snapshot: AccountSnapshot, version: number): boolean {
  const current = getSnapshot();
  return (
    active &&
    version === requestVersion &&
    current?.uid === snapshot.uid &&
    current.cookie.account_id === snapshot.cookie.account_id &&
    current.cookie.cookie_token === snapshot.cookie.cookie_token &&
    current.cookie.ltuid === snapshot.cookie.ltuid &&
    current.cookie.ltoken === snapshot.cookie.ltoken
  );
}

function matchesPersistedAccount(snapshot: AccountSnapshot): boolean {
  return matchesCurrentAccount({
    uid: snapshot.uid,
    cookie: { ltoken: snapshot.cookie.ltoken, ltuid: snapshot.cookie.ltuid },
  });
}

async function handleSubmit(): Promise<void> {
  if (saving.value || coverUploading.value) return;
  submitted.value = true;
  error.value = "";
  const title = draft.title.trim();
  if (title === "") return;
  const snapshot = getSnapshot();
  if (!snapshot) {
    error.value = "当前账号凭据不可用，请重新登录米游社账号。";
    return;
  }
  if (!matchesPersistedAccount(snapshot)) {
    error.value = "登录账号已变化，请重新打开合集管理。";
    return;
  }
  const version = ++requestVersion;
  saving.value = true;
  error.value = "";
  try {
    const params = { title, desc: draft.desc.trim(), cover: draft.cover };
    const response = props.collection
      ? await communityReq.editCollection(snapshot.cookie, { id: props.collection.id, ...params })
      : await communityReq.createCollection(snapshot.cookie, params);
    if (!isCurrent(snapshot, version)) return;
    if (response.retcode !== 0) throw new Error(`[${response.retcode}] ${response.message}`);
    emits("saved");
    visible.value = false;
  } catch (cause) {
    if (isCurrent(snapshot, version)) error.value = TGHttps.getErrMsg(cause);
  } finally {
    if (isCurrent(snapshot, version)) saving.value = false;
  }
}
</script>

<style lang="scss" scoped>
@use "@styles/utils.scss" as utils;

.cpcf-heading {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 4px;

  h2 {
    margin: 0;
    color: var(--common-text-title);
    font-family: var(--font-title);
    font-size: 18px;
    font-weight: normal;
  }

  p {
    margin: 0;
    color: var(--box-text-4);
    font-size: 12px;
    line-height: 18px;
  }
}

.cpcf-form {
  display: flex;
  overflow: hidden;
  height: 100%;
  min-height: 0;
  flex-direction: column;
  gap: 16px;
}

.cpcf-body {
  display: flex;
  overflow: hidden;
  min-height: 0;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 16px;
}

.cpcf-desc {
  min-height: 0;
  flex: 1 1 auto;

  :deep(.v-input__control),
  :deep(.v-field),
  :deep(.v-field__field) {
    height: 100%;
  }

  :deep(.v-field__input) {
    height: 100%;
    min-height: 0;
    overflow-y: auto;
    resize: none;
  }
}

.cpcf-label {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  white-space: nowrap;
}

.cpcf-label-count {
  color: var(--box-text-4);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.cpcf-error {
  display: flex;
  align-items: flex-start;
  color: var(--tgc-od-red);
  font-size: 12px;
  gap: 6px;
  line-height: 18px;
  overflow-wrap: anywhere;

  :deep(.v-icon) {
    flex: none;
  }
}

.cpcf-footer-actions {
  @include utils.overlay-footer-actions;
}

.cpcf-confirm {
  @include utils.overlay-confirm-button;
}
</style>
