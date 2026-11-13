<!-- 米游社挂件选择对话框 -->
<template>
  <TopOverlay
    v-model="visible"
    :showShare="false"
    :titleId="titleId"
    blurVal="10px"
    closeAriaLabel="关闭挂件选择"
    contentMaxHeight="none"
    panelMaxHeight="calc(100dvh - 48px)"
    panelWidth="720px"
  >
    <template #header>
      <div class="cppp-heading">
        <h2 :id="titleId">选择挂件</h2>
        <p>选择头像框或评论装扮，保存资料后生效。</p>
      </div>
    </template>

    <v-tabs
      v-model="activeTab"
      aria-label="挂件类型"
      class="cppp-tabs"
      color="var(--common-text-title)"
      density="compact"
      show-arrows
    >
      <v-tab value="pendant">头像框</v-tab>
      <v-tab value="comment">评论装扮</v-tab>
    </v-tabs>

    <div class="cppp-body">
      <CpAvatarFramePanel
        v-if="activeTab === 'pendant'"
        v-model:selectedId="selectedId"
        :avatarExt="props.user.avatar_ext"
        :avatarUrl="avatarUrl"
        :currentUrl="props.currentUrl"
        :error="props.error"
        :loading="props.loading"
        :nickname="props.user.nickname"
        :pendants="props.pendants"
        :serverUrl="props.serverUrl"
        :unavailableId="unavailablePendantId"
        @retry="emits('retry')"
      />
      <CpCommentDecorationPanel
        v-else
        v-model:selectedId="selectedCommentId"
        :currentId="props.currentCommentId"
        :decorations="props.commentDecorations"
        :error="props.commentError"
        :loading="props.commentLoading"
        :serverId="props.serverCommentId"
        @retry="emits('retryComment')"
      />
    </div>

    <template #footer>
      <div class="cppp-footer-actions">
        <v-btn type="button" variant="text" @click="visible = false">取消</v-btn>
        <v-btn
          :disabled="!canConfirm"
          class="cppp-confirm"
          type="button"
          variant="flat"
          @click="handleConfirm"
        >
          {{ confirmLabel }}
        </v-btn>
      </div>
    </template>
  </TopOverlay>
</template>

<script lang="ts" setup>
import TopOverlay from "@comp/app/top-overlay.vue";
import CpAvatarFramePanel from "@comp/comiProf/cp-avatar-frame-panel.vue";
import CpCommentDecorationPanel from "@comp/comiProf/cp-comment-decoration-panel.vue";
import { getUserAvatar } from "@utils/common/toolFunc.js";
import { computed, ref, useId, watch } from "vue";

/**
 * 头像框选择对话框用户信息。
 * @since Beta v0.13.0
 */
type PendantPickerUser = Pick<TGApp.BBS.User.Info, "nickname" | "avatar_url"> & {
  avatar_ext?: TGApp.BBS.User.AvatarExt | null;
};

/**
 * 挂件选择对话框参数。
 * @since Beta v0.13.0
 */
type PendantPickerProps = {
  /** 可选头像框列表 */
  pendants: Array<TGApp.BBS.CommunitySettings.Pendant>;
  /** 预览用户 */
  user: PendantPickerUser;
  /** 当前头像框链接，空串表示未使用 */
  currentUrl: string;
  /** 已保存的头像框链接 */
  serverUrl: string;
  /** 是否正在加载 */
  loading: boolean;
  /** 加载错误 */
  error: string;
  /** 可选评论装扮列表 */
  commentDecorations: Array<TGApp.BBS.CommunitySettings.CommentDecoration>;
  /** 当前评论装扮 ID，null 表示尚未加载，空串表示未使用 */
  currentCommentId: string | null;
  /** 已保存的评论装扮 ID，null 表示尚未加载，空串表示未使用 */
  serverCommentId: string | null;
  /** 是否正在加载评论装扮 */
  commentLoading: boolean;
  /** 评论装扮加载错误 */
  commentError: string;
};

type PendantPickerEmits = {
  /** 确认头像框 */
  confirm: [pendant: TGApp.BBS.CommunitySettings.Pendant | null];
  /** 重新加载头像框 */
  retry: [];
  /** 确认评论装扮 */
  confirmComment: [decoration: TGApp.BBS.CommunitySettings.CommentDecoration | null];
  /** 重新加载评论装扮 */
  retryComment: [];
};

type PendantPickerTab = "pendant" | "comment";

const props = defineProps<PendantPickerProps>();
const visible = defineModel<boolean>({ required: true });
const emits = defineEmits<PendantPickerEmits>();

const titleId = useId();
const unavailablePendantId = -1;

const activeTab = ref<PendantPickerTab>("pendant");
const selectedId = ref<number>(0);
const selectedCommentId = ref<string | null>("");
const avatarUrl = computed<string>(() => getUserAvatar(props.user) || "/UI/nav/lumine.webp");
const selectedPendant = computed<TGApp.BBS.CommunitySettings.Pendant | null>(() => {
  return props.pendants.find((pendant) => pendant.id === selectedId.value) ?? null;
});
const selectedCommentDecoration = computed<TGApp.BBS.CommunitySettings.CommentDecoration | null>(
  () => {
    return (
      props.commentDecorations.find((decoration) => decoration.id === selectedCommentId.value) ??
      null
    );
  },
);
const canConfirmPendant = computed<boolean>(() => {
  if (props.loading || props.error) return false;
  if (selectedId.value === unavailablePendantId) return false;
  if (selectedId.value === 0) return props.currentUrl !== "";
  if (!selectedPendant.value) return false;
  return selectedPendant.value.owned && selectedPendant.value.url !== props.currentUrl;
});
const canConfirmComment = computed<boolean>(() => {
  if (props.commentLoading || props.commentError || props.currentCommentId === null) return false;
  if (selectedCommentId.value === null) return false;
  if (selectedCommentId.value === "") return props.currentCommentId !== "";
  if (!selectedCommentDecoration.value) return false;
  return (
    selectedCommentDecoration.value.owned &&
    selectedCommentDecoration.value.id !== props.currentCommentId
  );
});
const canConfirm = computed<boolean>(() => {
  return activeTab.value === "pendant" ? canConfirmPendant.value : canConfirmComment.value;
});
const confirmLabel = computed<string>(() => {
  if (activeTab.value === "pendant") {
    return selectedId.value === 0 ? "不使用头像框" : "使用该头像框";
  }
  return selectedCommentId.value === "" ? "不使用评论装扮" : "使用该评论装扮";
});

watch(
  visible,
  (isOpen) => {
    if (isOpen) {
      activeTab.value = "pendant";
      initializePendantSelection();
      initializeCommentSelection();
    }
  },
  { immediate: true },
);

watch(
  () => props.pendants,
  () => {
    if (visible.value) initializePendantSelection();
  },
);

watch(
  () => props.commentDecorations,
  () => {
    if (visible.value) initializeCommentSelection();
  },
);

watch(
  () => props.currentCommentId,
  () => {
    if (visible.value) initializeCommentSelection();
  },
);

function initializePendantSelection(): void {
  const currentPendant = props.currentUrl
    ? props.pendants.find((pendant) => pendant.url === props.currentUrl)
    : undefined;
  if (props.currentUrl !== props.serverUrl) {
    selectedId.value = currentPendant?.id ?? (props.currentUrl ? unavailablePendantId : 0);
    return;
  }
  const used = props.pendants.find((pendant) => pendant.is_used);
  selectedId.value =
    used?.id ?? currentPendant?.id ?? (props.currentUrl ? unavailablePendantId : 0);
}

function initializeCommentSelection(): void {
  if (props.currentCommentId === null) {
    selectedCommentId.value = null;
    return;
  }
  const currentDecoration = props.commentDecorations.find(
    (decoration) => decoration.id === props.currentCommentId,
  );
  selectedCommentId.value = currentDecoration?.id ?? (props.currentCommentId !== "" ? null : "");
}

function handleConfirm(): void {
  if (!canConfirm.value) return;
  if (activeTab.value === "pendant") {
    emits("confirm", selectedPendant.value);
    return;
  }
  emits("confirmComment", selectedCommentDecoration.value);
}
</script>

<style lang="scss" scoped>
@use "@styles/utils.scss" as utils;

.cppp-heading {
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
  }
}

.cppp-tabs {
  flex: none;
  padding: 0;
  border-bottom: 1px solid var(--common-shadow-1);
}

.cppp-body {
  display: flex;
  overflow: hidden;
  min-height: 0;
  max-height: min(56dvh, 520px);
  box-sizing: border-box;
  flex: 1 1 auto;
  flex-direction: column;
  padding: 0;
  gap: 16px;
}

.cppp-footer-actions {
  @include utils.overlay-footer-actions;
}

.cppp-confirm {
  @include utils.overlay-confirm-button;
}
</style>
