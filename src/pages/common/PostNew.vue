<!-- 帖子发布页面 -->
<template>
  <v-app-bar class="post-new-app-bar">
    <template #prepend>
      <div class="post-new-top">
        <img alt="" src="/UI/nav/posts.webp" />
        <div class="post-new-heading">
          <h1 id="postNewTitle">{{ pageTitle }}</h1>
          <span class="post-new-meta">{{ metaText }}</span>
        </div>
      </div>
    </template>
    <template #append>
      <div class="post-new-actions">
        <v-btn
          :disabled="editorBusy || !canWrite"
          aria-label="打开草稿箱"
          class="post-new-back"
          icon="mdi-file-document-edit-outline"
          title="打开草稿箱"
          variant="text"
          @click="draftsVisible = true"
        />
        <v-btn
          v-if="!contextError && canWrite"
          :disabled="editorSaveDisabled"
          aria-label="发布帖子"
          class="post-new-save"
          color="var(--tgc-btn-1)"
          icon="mdi-send-outline"
          :loading="editorPending"
          title="发布帖子"
          type="button"
          variant="flat"
          @click="composer?.savePost()"
        />
        <v-btn
          v-if="!contextError && canWrite"
          :disabled="editorSaveDisabled"
          :loading="composer?.draftPending ?? false"
          aria-label="保存草稿到米游社"
          class="post-new-back"
          icon="mdi-content-save-outline"
          title="保存草稿到米游社"
          variant="text"
          @click="composer?.saveDraft()"
        />
        <v-btn
          v-if="!contextError && canWrite && composer?.currentDraftId"
          :disabled="!composer?.canDeleteDraft"
          :loading="composer?.draftDeletePending ?? false"
          aria-label="删除当前草稿"
          class="post-new-back"
          color="var(--tgc-od-red)"
          icon="mdi-delete-outline"
          title="删除当前草稿"
          variant="text"
          @click="composer?.deleteDraft()"
        />
        <v-btn
          :aria-label="backLabel"
          :disabled="editorBusy"
          class="post-new-back"
          icon="mdi-arrow-left"
          :title="backLabel"
          variant="text"
          @click="goBack"
        />
      </div>
    </template>
  </v-app-bar>
  <main class="post-new-page" aria-labelledby="postNewTitle">
    <div v-if="contextError" class="post-new-state" role="alert">
      <v-icon size="32">mdi-alert-circle-outline</v-icon>
      <p>{{ contextError }}</p>
      <v-btn variant="tonal" @click="goBack">返回</v-btn>
    </div>
    <div v-else-if="!canWrite" class="post-new-state" role="status">
      <v-icon size="32">mdi-account-lock-outline</v-icon>
      <p>请先登录米游社账号，再发布帖子</p>
    </div>
    <VpPostComposer
      v-else
      :key="composerKey"
      ref="composer"
      :form-id="formId"
      :gid="gid"
      :view-type="viewType === 2 ? 2 : 1"
      :forum-id="initialForumId"
      :initial-topic="initialTopic"
      :draftId
      @saved="handleSaved"
    />
  </main>
  <VpPostDrafts v-model="draftsVisible" :gid @deleted="composer?.forgetDraft($event)" />
</template>
<script lang="ts" setup>
import showDialog from "@comp/func/dialog.js";
import showSnackbar from "@comp/func/snackbar.js";
import VpPostComposer from "@comp/viewPost/vp-post-composer.vue";
import VpPostDrafts from "@comp/viewPost/vp-post-drafts.vue";
import useBBSStore from "@store/bbs.js";
import useUserStore from "@store/user.js";
import { createPost } from "@utils/app/TGWindow.js";
import { canPublishForumPost } from "@utils/bbs/postPublish.js";
import TGHttps from "@utils/network/TGHttps.js";
import { storeToRefs } from "pinia";
import { computed, ref, useId, useTemplateRef, watch } from "vue";
import { onBeforeRouteLeave, onBeforeRouteUpdate, useRoute, useRouter } from "vue-router";

const route = useRoute();
const router = useRouter();
const { uid, cookie, briefInfo } = storeToRefs(useUserStore());
const { forumList } = storeToRefs(useBBSStore());
const formId = useId();
const composer = useTemplateRef<InstanceType<typeof VpPostComposer>>("composer");
const draftsVisible = ref<boolean>(false);
const draftId = computed<string | undefined>(() =>
  typeof route.query.draft === "string" ? route.query.draft : undefined,
);

const gid = computed<number>(() => Number(route.params.gid));
const rawViewType = computed<string>(() => String(route.params.viewType ?? ""));
const viewType = computed<1 | 2>(() => (rawViewType.value === "2" ? 2 : 1));
const topicId = computed<number | undefined>(() => {
  const value = route.query.topic;
  if (typeof value !== "string" || !/^[1-9]\d*$/u.test(value)) return undefined;
  const id = Number(value);
  return Number.isSafeInteger(id) ? id : undefined;
});
const topicName = computed<string>(() =>
  typeof route.query.topicName === "string" ? route.query.topicName.trim() : "",
);
const initialTopic = computed<{ id: number; name: string } | undefined>(() => {
  if (topicId.value === undefined) return undefined;
  return { id: topicId.value, name: topicName.value || `话题 ${topicId.value}` };
});
const initialForumId = computed<number | undefined>(() => {
  const value = route.query.forum;
  if (typeof value !== "string" || !/^(?:0|[1-9]\d*)$/u.test(value)) return undefined;
  const id = Number(value);
  return Number.isSafeInteger(id) ? id : undefined;
});
const contextError = computed<string>(() => {
  if (route.query.draft !== undefined && (!draftId.value || !/^[1-9]\d*$/u.test(draftId.value))) {
    return "草稿 ID 无效，请从草稿箱重新打开";
  }
  if (!Number.isSafeInteger(gid.value) || gid.value <= 0) {
    return "社区 ID 无效，请从版块或话题页面进入发帖";
  }
  if (rawViewType.value !== "1" && rawViewType.value !== "2") {
    return "帖子类型无效，请从版块或话题页面进入发帖";
  }
  return "";
});
const canWrite = computed<boolean>(
  () => !!uid.value && cookie.value?.ltuid_v2 === uid.value && !!cookie.value?.ltoken_v2.trim(),
);
const accountName = computed<string>(() => briefInfo.value.nickname || uid.value || "");
const fromTopic = computed<boolean>(
  () => route.query.from === "topic" || (route.query.from !== "forum" && !!initialTopic.value),
);
const fromProfile = computed<boolean>(() => route.query.from === "profile");
const backLabel = computed<string>(() =>
  fromProfile.value ? "返回我的主页" : fromTopic.value ? "返回话题" : "返回版块",
);
const pageTitle = computed<string>(() =>
  draftId.value ? "编辑草稿" : viewType.value === 2 ? "发布图片帖" : "发布长文",
);
const currentForum = computed<TGApp.BBS.Forum.GameForumItem | undefined>(() => {
  if (initialForumId.value === undefined || initialForumId.value === 0) return undefined;
  return forumList.value
    .find((item) => item.game_id === gid.value)
    ?.forums.find((item) => item.id === initialForumId.value);
});
const forumName = computed<string>(() => {
  if (initialForumId.value === 0) return "不发布到版块";
  const forum = currentForum.value;
  if (!forum || !canPublishForumPost(forum, viewType.value)) return "";
  return forum.name;
});
const metaText = computed<string>(() => {
  const items = [initialTopic.value?.name, forumName.value, accountName.value].filter(
    (item): item is string => !!item,
  );
  return items.join(" · ") || "米游社";
});
const composerKey = computed<string>(() =>
  [
    uid.value,
    gid.value,
    viewType.value,
    initialForumId.value ?? "",
    initialTopic.value?.id ?? "",
    draftId.value ?? "",
  ].join(":"),
);
const editorPending = computed<boolean>(
  () =>
    (composer.value?.pending ?? false) &&
    !(composer.value?.draftPending ?? false) &&
    !(composer.value?.draftDeletePending ?? false),
);
const editorBusy = computed<boolean>(() => composer.value?.busy ?? false);
const editorSaveDisabled = computed<boolean>(() => !(composer.value?.canSubmit ?? false));

onBeforeRouteLeave(confirmLeave);
onBeforeRouteUpdate(confirmLeave);
watch(
  () => route.fullPath,
  () => {
    draftsVisible.value = false;
  },
);

async function confirmLeave(): Promise<boolean> {
  if (editorBusy.value) return false;
  if (!composer.value?.hasChanges) return true;
  const confirmed = await showDialog.checkF({
    title: "放弃未保存的修改？",
    text: "离开后，当前未保存的内容将丢失。",
    confirmLabel: "放弃修改",
    cancelLabel: "继续编辑",
  });
  return confirmed === true;
}

async function goBack(): Promise<void> {
  if (editorBusy.value) return;
  if (fromProfile.value) {
    await router.push({
      name: "个人信息",
      query: { gid: String(gid.value) },
    });
    return;
  }
  if (!Number.isSafeInteger(gid.value) || gid.value <= 0) {
    await router.push({ name: "酒馆" });
    return;
  }
  if (fromTopic.value && topicId.value !== undefined) {
    await router.push({
      name: "话题",
      params: { gid: String(gid.value), topic: String(topicId.value) },
      query: { gid: String(gid.value), topic: String(topicId.value) },
    });
    return;
  }
  const forum =
    initialForumId.value !== undefined && initialForumId.value > 0
      ? String(initialForumId.value)
      : undefined;
  await router.push({
    name: "酒馆",
    params: forum ? { gid: String(gid.value), forum } : { gid: String(gid.value) },
    query: forum ? { gid: String(gid.value), forum } : { gid: String(gid.value) },
  });
}

async function handleSaved(postId?: string): Promise<void> {
  if (postId && /^[1-9]\d*$/u.test(postId)) {
    try {
      await createPost(postId);
    } catch (cause) {
      showSnackbar.error(`打开帖子预览失败：${TGHttps.getErrMsg(cause)}`);
    }
  }
  await goBack();
}
</script>
<style lang="scss" scoped>
.post-new-app-bar {
  :deep(.v-toolbar__content) {
    min-width: 0;
    height: auto !important;
    min-height: 64px;
    justify-content: space-between;
    gap: 12px;
  }
}

.post-new-top {
  display: flex;
  min-width: 0;
  align-items: center;
  margin-left: 12px;
  gap: 8px;

  img {
    width: 32px;
    height: 32px;
    filter: var(--icon-filter);
  }
}

.post-new-heading {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
}

.post-new-heading h1 {
  overflow: hidden;
  margin: 0;
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 20px;
  font-weight: normal;
  line-height: 26px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.post-new-meta {
  max-width: min(52vw, 360px);
  color: var(--box-text-4);
  font-size: 12px;
  line-height: 16px;
  overflow-wrap: anywhere;
}

.post-new-actions {
  display: flex;
  flex: none;
  align-items: center;
  gap: 4px;
}

.post-new-back,
.post-new-save {
  width: 40px;
  min-width: 40px;
  height: 40px;
  padding: 0;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px !important;
  font-family: var(--font-title);
  font-weight: normal;
}

.post-new-back {
  color: var(--common-text-title);
}

.post-new-save {
  color: var(--btn-text);
}

.post-new-page {
  width: 100%;
  box-sizing: border-box;
}

.post-new-state {
  display: flex;
  min-height: 320px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px;
  color: var(--box-text-4);
  gap: 16px;
  text-align: center;
}

@media (width <= 720px) {
  .post-new-app-bar :deep(.v-toolbar__content) {
    min-height: 56px;
    padding-inline: 4px;
  }

  .post-new-top {
    margin-left: 4px;
    gap: 4px;
  }

  .post-new-top img {
    width: 28px;
    height: 28px;
  }

  .post-new-heading h1 {
    font-size: 18px;
  }

  .post-new-meta {
    max-width: 42vw;
    font-size: 11px;
  }
}

@media (width <= 420px) {
  .post-new-meta {
    max-width: 34vw;
  }
}
</style>
