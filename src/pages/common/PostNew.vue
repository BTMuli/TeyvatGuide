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
          :aria-label="backLabel"
          :disabled="editorBusy"
          class="post-new-back"
          prepend-icon="mdi-arrow-left"
          variant="text"
          @click="goBack"
        >
          <span class="post-new-action-label">{{ backLabel }}</span>
        </v-btn>
        <v-btn
          v-if="!contextError && canWrite"
          :disabled="editorSaveDisabled"
          :form="formId"
          aria-label="发布帖子"
          class="post-new-save"
          color="var(--tgc-btn-1)"
          prepend-icon="mdi-send-outline"
          :loading="editorPending"
          type="submit"
          variant="flat"
          >发布</v-btn
        >
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
      @saved="handleSaved"
    />
  </main>
</template>
<script lang="ts" setup>
import VpPostComposer from "@comp/viewPost/vp-post-composer.vue";
import useBBSStore from "@store/bbs.js";
import useUserStore from "@store/user.js";
import { canPublishForumPost } from "@utils/bbs/postPublish.js";
import { storeToRefs } from "pinia";
import { computed, useId, useTemplateRef } from "vue";
import { onBeforeRouteLeave, onBeforeRouteUpdate, useRoute, useRouter } from "vue-router";

const route = useRoute();
const router = useRouter();
const { uid, cookie, briefInfo } = storeToRefs(useUserStore());
const { forumList } = storeToRefs(useBBSStore());
const formId = useId();
const composer = useTemplateRef<InstanceType<typeof VpPostComposer>>("composer");

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
  if (!Number.isSafeInteger(gid.value) || gid.value <= 0) {
    return "社区 ID 无效，请从版块或话题页面进入发帖";
  }
  if (rawViewType.value !== "1" && rawViewType.value !== "2") {
    return "帖子类型无效，请从版块或话题页面进入发帖";
  }
  return "";
});
const canWrite = computed<boolean>(
  () => !!uid.value && cookie.value?.ltuid === uid.value && !!cookie.value?.ltoken.trim(),
);
const accountName = computed<string>(() => briefInfo.value.nickname || uid.value || "");
const fromTopic = computed<boolean>(
  () => route.query.from === "topic" || (route.query.from !== "forum" && !!initialTopic.value),
);
const backLabel = computed<string>(() => (fromTopic.value ? "返回话题" : "返回版块"));
const pageTitle = computed<string>(() => (viewType.value === 2 ? "发布图片帖" : "发布长文"));
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
  [gid.value, viewType.value, initialForumId.value ?? "", initialTopic.value?.id ?? ""].join(":"),
);
const editorPending = computed<boolean>(() => composer.value?.pending ?? false);
const editorBusy = computed<boolean>(() => composer.value?.busy ?? false);
const editorSaveDisabled = computed<boolean>(() => !(composer.value?.canSubmit ?? false));

onBeforeRouteLeave(() => !editorBusy.value);
onBeforeRouteUpdate(() => !editorBusy.value);

async function goBack(): Promise<void> {
  if (editorBusy.value) return;
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
    await router.replace({ name: "帖子详情", params: { post_id: postId } });
    return;
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
  border: 1px solid var(--common-shadow-1);
  font-family: var(--font-title);
  font-weight: normal;
}

.post-new-back {
  margin-right: 8px;
  color: var(--common-text-title);
}

.post-new-save {
  min-width: 112px;
  color: var(--btn-text);
}

.post-new-page {
  width: 100%;
  max-width: 1200px;
  box-sizing: border-box;
  padding: 24px 24px 48px;
  margin: 0 auto;
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

  .post-new-page {
    padding: 16px 16px 24px;
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

  .post-new-back {
    margin-right: 0;
  }

  .post-new-back .post-new-action-label {
    display: none;
  }

  .post-new-back,
  .post-new-save {
    min-width: 40px;
    padding-inline: 8px;
  }

  .post-new-back :deep(.v-btn__prepend),
  .post-new-save :deep(.v-btn__prepend) {
    margin-inline-end: 0;
  }

  .post-new-save :deep(.v-btn__content) {
    display: none;
  }
}

@media (width <= 420px) {
  .post-new-meta {
    max-width: 34vw;
  }
}
</style>
