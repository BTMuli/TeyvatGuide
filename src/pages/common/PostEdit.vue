<!-- 个人信息下的帖子编辑页面 -->
<template>
  <main class="post-edit-page" aria-labelledby="postEditTitle">
    <nav class="post-edit-breadcrumb" aria-label="面包屑">
      <RouterLink :to="{ name: '个人信息' }">个人信息</RouterLink>
      <v-icon aria-hidden="true" size="14">mdi-chevron-right</v-icon>
      <span>编辑帖子</span>
    </nav>
    <section class="post-edit-surface">
      <header class="post-edit-header">
        <div>
          <h1 id="postEditTitle">{{ source?.post.view_type === 2 ? "编辑图片帖" : "编辑帖子" }}</h1>
          <p v-if="source">{{ source.forum?.name || "米游社" }} · {{ accountName }}</p>
        </div>
        <v-btn :disabled="editorBusy" variant="text" prepend-icon="mdi-arrow-left" @click="goBack">
          {{ fromDetail ? "返回帖子" : "返回我的发帖" }}
        </v-btn>
      </header>
      <div v-if="!canEdit" class="post-edit-state" role="status">
        <v-icon size="32">mdi-account-lock-outline</v-icon>
        <p>{{ incognito ? "无痕模式下无法编辑帖子" : "请先登录米游社账号，再编辑自己的帖子" }}</p>
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
        :gid="source.post.game_id"
        :source
        @saved="handleSaved"
      />
    </section>
  </main>
</template>
<script lang="ts" setup>
import VpPostComposer from "@comp/viewPost/vp-post-composer.vue";
import postReq from "@req/postReq.js";
import useAppStore from "@store/app.js";
import useUserStore from "@store/user.js";
import { matchesCurrentAccount } from "@utils/bbsReplyAccount.js";
import TGHttps from "@utils/TGHttps.js";
import { storeToRefs } from "pinia";
import { computed, onBeforeUnmount, ref, shallowRef, useTemplateRef, watch } from "vue";
import {
  onBeforeRouteLeave,
  onBeforeRouteUpdate,
  RouterLink,
  useRoute,
  useRouter,
} from "vue-router";

const route = useRoute();
const router = useRouter();
const { uid, cookie, briefInfo } = storeToRefs(useUserStore());
const { incognito } = storeToRefs(useAppStore());
const composer = useTemplateRef<InstanceType<typeof VpPostComposer>>("composer");
const source = shallowRef<TGApp.BBS.Post.FullData>();
const loading = ref<boolean>(false);
const loadError = ref<string>("");
let version = 0;
let active = true;
const postId = computed<string>(() => String(route.params.postId ?? ""));
const fromDetail = computed<boolean>(() => route.query.from === "detail");
const accountName = computed<string>(() => briefInfo.value.nickname || uid.value || "");
const canEdit = computed<boolean>(
  () =>
    !incognito.value && !!uid.value && cookie.value?.ltuid === uid.value && !!cookie.value?.ltoken,
);
const editorBusy = computed<boolean>(() => composer.value?.busy ?? false);

watch(
  [postId, uid, () => cookie.value?.ltoken, () => cookie.value?.ltuid, incognito],
  () => void loadPost(),
  { immediate: true },
);
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
.post-edit-page {
  width: 100%;
  max-width: 1200px;
  box-sizing: border-box;
  padding: 16px 24px 48px;
  margin: 0 auto;
}

.post-edit-breadcrumb {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
  color: var(--box-text-4);
  font-size: 12px;
  gap: 8px;
}

.post-edit-breadcrumb a {
  color: var(--common-text-title);
  text-decoration: none;
}

.post-edit-surface {
  overflow: hidden;
  border: 1px solid var(--common-shadow-2);
  border-radius: 8px;
  background: var(--app-page-bg);
}

.post-edit-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 32px;
  border-bottom: 1px solid var(--common-shadow-2);
  gap: 16px;
}

.post-edit-header h1 {
  margin: 0;
  font-family: var(--font-title);
  font-size: 20px;
  font-weight: normal;
}

.post-edit-header p {
  margin: 8px 0 0;
  color: var(--box-text-4);
  font-size: 12px;
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
  .post-edit-page {
    padding: 8px 0 24px;
  }

  .post-edit-header {
    padding: 20px 16px;
  }
}
</style>
