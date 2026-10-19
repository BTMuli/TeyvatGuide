<!-- 帖子作者操作 -->
<template>
  <div
    v-if="canManage"
    :aria-busy="busy"
    class="vppa"
    role="group"
    aria-label="帖子操作"
    data-html2canvas-ignore
  >
    <v-btn
      :disabled="busy || !canEdit"
      :title="canEdit ? '编辑帖子' : '仅支持编辑长文和图片帖'"
      aria-label="编辑帖子"
      class="vppa-action"
      icon="mdi-pencil-outline"
      size="36"
      type="button"
      variant="flat"
      @click="openEditor"
    />
    <v-btn
      :disabled="busy"
      :loading="busy"
      aria-label="删除帖子"
      class="vppa-action vppa-delete"
      icon="mdi-delete-outline"
      size="36"
      title="删除帖子"
      type="button"
      variant="flat"
      @click="deletePost"
    />
  </div>
</template>
<script lang="ts" setup>
import showDialog from "@comp/func/dialog.js";
import showSnackbar from "@comp/func/snackbar.js";
import bbsEnum from "@enum/bbs.js";
import postEditReq from "@req/postEditReq.js";
import postReq from "@req/postReq.js";
import useAppStore from "@store/app.js";
import useUserStore from "@store/user.js";
import { executeReplyForCurrentAccount, matchesCurrentAccount } from "@utils/bbsReplyAccount.js";
import { storeToRefs } from "pinia";
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { useRouter } from "vue-router";

/**
 * 帖子作者操作参数。
 * @since Beta v0.12.6
 */
type PostActionsProps = {
  source: TGApp.BBS.Post.FullData;
};

const props = defineProps<PostActionsProps>();
const emits = defineEmits<{ deleted: [] }>();
const router = useRouter();

const { incognito } = storeToRefs(useAppStore());
const { briefInfo, cookie, uid } = storeToRefs(useUserStore());
const busy = ref<boolean>(false);
let contextVersion = 0;
let active = true;

const hasCurrentAccount = computed<boolean>(
  () =>
    !incognito.value &&
    !!uid.value &&
    !!cookie.value?.ltoken.trim() &&
    cookie.value?.ltuid === uid.value,
);
const canManage = computed<boolean>(
  () => hasCurrentAccount.value && props.source.post.uid === uid.value,
);
const canEdit = computed<boolean>(
  () =>
    canManage.value &&
    (props.source.post.view_type === bbsEnum.post.viewType.NORMAL ||
      props.source.post.view_type === bbsEnum.post.viewType.PIC),
);

watch(
  [
    () => props.source,
    () => props.source.post.post_id,
    () => props.source.post.uid,
    () => props.source.post.subject,
    () => props.source.post.structured_content,
    () => uid.value,
    () => cookie.value?.ltuid,
    () => cookie.value?.ltoken,
    () => incognito.value,
  ],
  () => {
    contextVersion += 1;
  },
  { flush: "sync" },
);

onBeforeUnmount(() => {
  active = false;
  contextVersion += 1;
});

async function openEditor(): Promise<void> {
  if (!canEdit.value || busy.value) return;
  await router.push({
    name: "编辑帖子",
    params: { postId: props.source.post.post_id },
    query: { from: "detail" },
  });
}

async function deletePost(): Promise<void> {
  if (!canManage.value || busy.value) return;
  const currentCookie = cookie.value;
  const currentUid = uid.value;
  if (!currentCookie || !currentUid) {
    showSnackbar.warn("请先登录");
    return;
  }
  const snapshot: TGApp.BBS.Reply.AccountSnapshot = {
    uid: currentUid,
    cookie: { ltoken: currentCookie.ltoken, ltuid: currentCookie.ltuid },
  };
  const postId = props.source.post.post_id;
  const originalSubject = props.source.post.subject;
  const requestCookie = { ...snapshot.cookie };
  const version = contextVersion;
  const accountName = briefInfo.value.nickname.trim() || currentUid;
  const subject = props.source.post.subject.trim() || `帖子 ${props.source.post.post_id}`;

  busy.value = true;
  try {
    const confirmed = await showDialog.checkF({
      cancelLabel: "取消",
      confirmLabel: "删除",
      text: `将以账号 ${accountName} 删除“${subject}”（ID：${props.source.post.post_id}）。此操作不可撤销。`,
      title: "删除帖子",
    });
    if (!confirmed) return;
    if (!active || version !== contextVersion || !canManage.value) {
      showSnackbar.warn("帖子或登录账号已变化，请重新操作");
      return;
    }
    if (!matchesCurrentAccount(snapshot)) {
      showSnackbar.warn("登录账号已变化，请重新操作");
      return;
    }
    const latest = await postReq.post(postId, requestCookie);
    if (
      !active ||
      version !== contextVersion ||
      !canManage.value ||
      !matchesCurrentAccount(snapshot)
    )
      return;
    if (latest.retcode !== 0) throw new Error(`[${latest.retcode}] ${latest.message}`);
    if (
      latest.data.post.post.post_id !== postId ||
      latest.data.post.post.uid !== snapshot.uid ||
      latest.data.post.post.subject !== originalSubject
    ) {
      throw new Error("帖子内容或作者已变化，请刷新帖子后重新确认删除");
    }
    const result = await executeReplyForCurrentAccount(snapshot, () =>
      postEditReq.delete(latest.data.post, requestCookie),
    );
    if (!active || version !== contextVersion || !matchesCurrentAccount(snapshot)) return;
    if (!result.allowed) {
      showSnackbar.warn("登录账号已变化，请重新操作");
      return;
    }
    if (result.data.retcode !== 0) {
      showSnackbar.error(`[${result.data.retcode}] ${result.data.message}`);
      return;
    }
    emits("deleted");
  } catch (error) {
    if (!active || version !== contextVersion || !matchesCurrentAccount(snapshot)) return;
    showSnackbar.error(`删除帖子失败：${error instanceof Error ? error.message : String(error)}`);
  } finally {
    busy.value = false;
  }
}
</script>
<style lang="scss" scoped>
@use "@styles/github.styles.scss" as github-styles;

.vppa {
  position: fixed;
  z-index: 1;
  top: 112px;
  right: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.vppa-action {
  @include github-styles.github-card;

  border-radius: 50%;
  color: var(--app-page-content);
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  :deep(.v-icon) {
    font-size: 20px;
  }

  &:focus-visible {
    outline: 2px solid var(--common-text-title);
    outline-offset: 2px;
  }

  &:hover:not(:disabled) {
    transform: scale(1.15);
  }

  &:active:not(:disabled) {
    transform: scale(0.95);
  }
}

.dark .vppa-action {
  @include github-styles.github-card("dark");
}

.vppa-delete {
  color: var(--tgc-od-red);
}

@media (prefers-reduced-motion: reduce) {
  .vppa-action {
    transition: none;

    &:hover:not(:disabled),
    &:active:not(:disabled) {
      transform: none;
    }
  }
}
</style>
