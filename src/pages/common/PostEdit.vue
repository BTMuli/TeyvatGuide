<!-- 个人信息下的帖子编辑页面 -->
<template>
  <v-app-bar class="post-edit-app-bar">
    <template #prepend>
      <div class="post-edit-top">
        <img alt="" src="/UI/nav/posts.webp" />
        <div class="post-edit-heading">
          <h1 id="postEditTitle">
            {{ source?.post.view_type === 2 ? "编辑图片帖" : "编辑帖子" }}
          </h1>
          <span v-if="source" class="post-edit-meta">
            {{ source.forum?.name || "米游社" }} · {{ accountName }}
          </span>
        </div>
      </div>
    </template>
    <template #append>
      <div class="post-edit-actions">
        <v-btn
          :aria-label="fromDetail ? '返回帖子' : '返回我的发帖'"
          :disabled="editorBusy"
          class="post-edit-back"
          prepend-icon="mdi-arrow-left"
          variant="text"
          @click="goBack"
        >
          <span class="post-edit-action-label">{{ fromDetail ? "返回帖子" : "返回我的发帖" }}</span>
        </v-btn>
        <v-btn
          :disabled="editorSaveDisabled"
          :form="formId"
          aria-label="保存修改"
          class="post-edit-save"
          color="var(--tgc-btn-1)"
          prepend-icon="mdi-content-save-outline"
          :loading="editorPending"
          type="submit"
          variant="flat"
          >保存修改</v-btn
        >
      </div>
    </template>
  </v-app-bar>
  <main class="post-edit-page" aria-labelledby="postEditTitle">
    <div v-if="!canEdit" class="post-edit-state" role="status">
      <v-icon size="32">mdi-account-lock-outline</v-icon>
      <p>请先登录米游社账号，再编辑自己的帖子</p>
    </div>
    <div v-else-if="loading" class="post-edit-state" role="status">
      <v-progress-circular indeterminate size="28" />
      <p>正在载入帖子…</p>
    </div>
    <div v-else-if="loadError" class="post-edit-state" role="alert">
      <p>{{ loadError }}</p>
      <v-btn variant="tonal" @click="loadPost">重新载入</v-btn>
    </div>
    <VpPostComposer
      v-else-if="source"
      :key="`${uid}:${source.post.post_id}`"
      ref="composer"
      :form-id="formId"
      :gid="source.post.game_id"
      :source
      @saved="handleSaved"
    />
  </main>
</template>
<script lang="ts" setup>
import VpPostComposer from "@comp/viewPost/vp-post-composer.vue";
import postReq from "@req/postReq.js";
import useUserStore from "@store/user.js";
import { matchesCurrentAccount } from "@utils/bbs/replyAccount.js";
import TGHttps from "@utils/network/TGHttps.js";
import { storeToRefs } from "pinia";
import { computed, onBeforeUnmount, ref, shallowRef, useId, useTemplateRef, watch } from "vue";
import { onBeforeRouteLeave, onBeforeRouteUpdate, useRoute, useRouter } from "vue-router";

const route = useRoute();
const router = useRouter();
const { uid, cookie, briefInfo } = storeToRefs(useUserStore());
const formId = useId();
const composer = useTemplateRef<InstanceType<typeof VpPostComposer>>("composer");
const source = shallowRef<TGApp.BBS.Post.FullData>();
const loading = ref<boolean>(false);
const loadError = ref<string>("");
let version = 0;
let active = true;
const postId = computed<string>(() => String(route.params.postId ?? ""));
const fromDetail = computed<boolean>(() => route.query.from === "detail");
const accountName = computed<string>(() => briefInfo.value.nickname || uid.value || "");
const editorPending = computed<boolean>(() => composer.value?.pending ?? false);
const canEdit = computed<boolean>(
  () => !!uid.value && cookie.value?.ltuid === uid.value && !!cookie.value?.ltoken,
);
const editorBusy = computed<boolean>(() => composer.value?.busy ?? false);
const editorSaveDisabled = computed<boolean>(() => !(composer.value?.canSubmit ?? false));

watch([postId, uid, () => cookie.value?.ltoken, () => cookie.value?.ltuid], () => void loadPost(), {
  immediate: true,
});
onBeforeRouteLeave(() => !editorBusy.value);
onBeforeRouteUpdate(() => !editorBusy.value);
onBeforeUnmount(() => {
  active = false;
  version += 1;
});

async function loadPost(): Promise<void> {
  const current = ++version;
  source.value = undefined;
  loadError.value = "";
  loading.value = false;
  if (!canEdit.value || !cookie.value || !uid.value) return;
  if (!/^[1-9]\d*$/u.test(postId.value)) {
    loadError.value = "帖子 ID 无效，请从我的发帖或帖子详情进入编辑";
    return;
  }
  const snapshot = {
    uid: uid.value,
    cookie: { ltoken: cookie.value.ltoken, ltuid: cookie.value.ltuid },
  };
  loading.value = true;
  try {
    if (!matchesCurrentAccount(snapshot)) throw new Error("登录账号已变化，请重新打开个人信息");
    const response = await postReq.post(postId.value, snapshot.cookie);
    if (!active || current !== version || !matchesCurrentAccount(snapshot)) return;
    if (response.retcode !== 0) throw new Error(`[${response.retcode}] ${response.message}`);
    if (
      response.data.post.post.post_id !== postId.value ||
      response.data.post.post.uid !== snapshot.uid
    )
      throw new Error("仅能编辑当前账号发布的帖子");
    source.value = response.data.post;
  } catch (cause) {
    if (active && current === version) loadError.value = TGHttps.getErrMsg(cause);
  } finally {
    if (current === version) loading.value = false;
  }
}

async function goBack(): Promise<void> {
  if (editorBusy.value) return;
  await router.push(
    fromDetail.value
      ? { name: "帖子详情", params: { post_id: postId.value } }
      : { name: "个人信息" },
  );
}

async function handleSaved(): Promise<void> {
  await goBack();
}
</script>
<style lang="scss" scoped>
.post-edit-app-bar {
  :deep(.v-toolbar__content) {
    min-width: 0;
    height: auto !important;
    min-height: 64px;
    justify-content: space-between;
    gap: 12px;
  }
}

.post-edit-top {
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

.post-edit-heading {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
}

.post-edit-heading h1 {
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

.post-edit-meta {
  max-width: min(52vw, 360px);
  color: var(--box-text-4);
  font-size: 12px;
  line-height: 16px;
  overflow-wrap: anywhere;
}

.post-edit-actions {
  display: flex;
  flex: none;
  align-items: center;
  gap: 4px;
}

.post-edit-back,
.post-edit-save {
  border: 1px solid var(--common-shadow-1);
  font-family: var(--font-title);
  font-weight: normal;
}

.post-edit-back {
  margin-right: 8px;
  color: var(--common-text-title);
}

.post-edit-save {
  min-width: 128px;
  color: var(--btn-text);
}

.post-edit-page {
  width: 100%;
  max-width: 1200px;
  box-sizing: border-box;
  padding: 24px 24px 48px;
  margin: 0 auto;
}

.post-edit-state {
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
  .post-edit-app-bar :deep(.v-toolbar__content) {
    min-height: 56px;
    padding-inline: 4px;
  }

  .post-edit-page {
    padding: 16px 16px 24px;
  }

  .post-edit-top {
    margin-left: 4px;
    gap: 4px;
  }

  .post-edit-top img {
    width: 28px;
    height: 28px;
  }

  .post-edit-heading h1 {
    font-size: 18px;
  }

  .post-edit-meta {
    max-width: 42vw;
    font-size: 11px;
  }

  .post-edit-back {
    margin-right: 0;
  }

  .post-edit-back .post-edit-action-label {
    display: none;
  }

  .post-edit-back,
  .post-edit-save {
    min-width: 40px;
    padding-inline: 8px;
  }

  .post-edit-back :deep(.v-btn__prepend),
  .post-edit-save :deep(.v-btn__prepend) {
    margin-inline-end: 0;
  }

  .post-edit-save :deep(.v-btn__content) {
    display: none;
  }
}

@media (width <= 420px) {
  .post-edit-meta {
    max-width: 34vw;
  }
}
</style>
