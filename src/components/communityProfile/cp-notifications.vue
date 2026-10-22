<template>
  <section :aria-busy="loading" aria-labelledby="cp-notifications-title" class="cp-notifications">
    <header class="cp-notifications-header">
      <div class="cp-notifications-heading">
        <h2 id="cp-notifications-title">
          <v-icon size="20" aria-hidden="true">{{ categoryInfo.icon }}</v-icon>
          {{ categoryInfo.title }}
        </h2>
        <p>{{ categoryInfo.description }}</p>
      </div>
      <span class="cp-notifications-count">已加载 {{ notifications.length }} 条</span>
    </header>

    <div class="cp-notifications-body">
      <div v-if="error" class="cp-notifications-state" role="alert">
        <v-icon size="28">mdi-alert-circle-outline</v-icon>
        <p>{{ error }}</p>
        <v-btn :disabled="loading" variant="tonal" @click="loadMore">重新加载</v-btn>
      </div>
      <div v-if="notifications.length" class="cp-notifications-list">
        <CpNotification
          v-for="item in notifications"
          :key="item.notification_id"
          :category
          :clickable="hasTarget(item)"
          :notification="item"
          @open="openNotification(item)"
          @open-profile="openProfile"
        />
      </div>
      <div v-else-if="!loading && !error" class="cp-notifications-state" role="status">
        <v-icon size="32">{{ categoryInfo.icon }}</v-icon>
        <p>{{ categoryInfo.empty }}</p>
      </div>
      <div v-if="loading" class="cp-notifications-state" role="status" aria-live="polite">
        <v-progress-circular indeterminate size="28" />
        <p>正在加载{{ categoryInfo.title }}…</p>
      </div>
      <footer v-if="notifications.length && !loading && !error" class="cp-notifications-footer">
        <span v-if="isLast">已全部加载</span>
        <v-btn v-else variant="tonal" @click="loadMore">加载更多</v-btn>
      </footer>
    </div>
  </section>
</template>

<script lang="ts" setup>
import showSnackbar from "@comp/func/snackbar.js";
import communityReq from "@req/communityReq.js";
import useAppStore from "@store/app.js";
import useUserStore from "@store/user.js";
import { openUrl } from "@tauri-apps/plugin-opener";
import { openCommunityProfile } from "@utils/communityProfile.js";
import { parseLink, parsePost } from "@utils/linkParser.js";
import TGHttps from "@utils/TGHttps.js";
import TGLogger from "@utils/TGLogger.js";
import { createPost } from "@utils/TGWindow.js";
import { storeToRefs } from "pinia";
import { computed, onBeforeUnmount, ref, shallowRef, watch } from "vue";

import CpNotification from "./cp-notification.vue";

type CategoryInfo = { title: string; description: string; icon: string; empty: string };
/**
 * 通知列表的登录账户快照。
 * @since Beta v0.12.6
 */
type AccountSnapshot = { uid: string; cookie: TGApp.App.Account.Cookie };

const { category } = defineProps<{ category: TGApp.BBS.Notification.Category }>();
const emit = defineEmits<{
  read: [category: TGApp.BBS.Notification.Category];
  itemRead: [category: TGApp.BBS.Notification.Category];
}>();
const { isLogin } = storeToRefs(useAppStore());
const { uid, cookie } = storeToRefs(useUserStore());

const categoryInfo = computed<CategoryInfo>(
  () =>
    ({
      reply: {
        title: "回复我的",
        description: "其他用户对你的帖子和评论的回复",
        icon: "mdi-comment-processing-outline",
        empty: "暂无回复",
      },
      active_mention: {
        title: "主动@我",
        description: "在帖子或评论中@你的消息",
        icon: "mdi-at",
        empty: "暂无@我的消息",
      },
      system: {
        title: "系统通知",
        description: "米游社官方发送的系统通知",
        icon: "mdi-bell-outline",
        empty: "暂无系统通知",
      },
      comment: {
        title: "收到的赞",
        description: "你的帖子和评论收到的点赞",
        icon: "mdi-thumb-up-outline",
        empty: "暂无收到的赞",
      },
    })[category],
);
const notifications = shallowRef<Array<TGApp.BBS.Notification.Item>>([]);
const loading = ref<boolean>(false);
const error = ref<string>("");
const lastId = ref<string>("");
const isLast = ref<boolean>(false);
let generation = 0;
let cleared = false;
let active = true;

watch(
  [
    () => category,
    isLogin,
    uid,
    () => cookie.value?.account_id,
    () => cookie.value?.cookie_token,
    () => cookie.value?.ltuid,
    () => cookie.value?.ltoken,
  ],
  () => {
    generation += 1;
    cleared = false;
    notifications.value = [];
    lastId.value = "";
    isLast.value = false;
    loading.value = false;
    error.value = "";
    void loadMore();
  },
  { immediate: true },
);
onBeforeUnmount(() => {
  active = false;
  generation += 1;
});

function getSnapshot(): AccountSnapshot | undefined {
  const loginUid = uid.value?.trim() ?? "";
  if (
    !isLogin.value ||
    !loginUid ||
    !cookie.value ||
    cookie.value.ltuid !== loginUid ||
    !cookie.value.cookie_token.trim() ||
    !cookie.value.account_id.trim() ||
    !cookie.value.ltoken.trim()
  )
    return undefined;
  return { uid: loginUid, cookie: { ...cookie.value } };
}

function isCurrent(snapshot: AccountSnapshot, version: number): boolean {
  const current = getSnapshot();
  return (
    active &&
    generation === version &&
    current?.uid === snapshot.uid &&
    current.cookie.account_id === snapshot.cookie.account_id &&
    current.cookie.cookie_token === snapshot.cookie.cookie_token &&
    current.cookie.ltuid === snapshot.cookie.ltuid &&
    current.cookie.ltoken === snapshot.cookie.ltoken
  );
}

async function loadMore(): Promise<void> {
  if (loading.value || isLast.value) return;
  const snapshot = getSnapshot();
  if (!snapshot) return;
  const version = generation;
  loading.value = true;
  error.value = "";
  try {
    const response = await communityReq.notifications(snapshot.cookie, category, lastId.value);
    if (!isCurrent(snapshot, version)) return;
    if (response.retcode !== 0) throw new Error(`[${response.retcode}] ${response.message}`);
    const next = response.data.last_id ?? "";
    if (!response.data.is_last && (!next.trim() || next === "0" || next === lastId.value))
      throw new Error("分页游标无效，请刷新后重试。");
    const ids = new Set(notifications.value.map((item) => item.notification_id));
    notifications.value = [
      ...notifications.value,
      ...response.data.list.filter((item) => {
        if (ids.has(item.notification_id)) return false;
        ids.add(item.notification_id);
        return true;
      }),
    ];
    lastId.value = next;
    isLast.value = response.data.is_last;
    if (!cleared) {
      cleared = true;
      void clearUnread(snapshot, version);
    }
  } catch (cause) {
    if (isCurrent(snapshot, version)) error.value = TGHttps.getErrMsg(cause);
  } finally {
    if (isCurrent(snapshot, version)) loading.value = false;
  }
}

async function clearUnread(snapshot: AccountSnapshot, version: number): Promise<void> {
  try {
    const response = await communityReq.clearNotificationUnread(snapshot.cookie, category);
    if (!isCurrent(snapshot, version)) return;
    if (response.retcode !== 0) {
      await TGLogger.Warn(
        `[CpNotifications] 清除未读失败：[${response.retcode}] ${response.message}`,
      );
      return;
    }
    emit("read", category);
  } catch (cause) {
    await TGLogger.Warn(`[CpNotifications] 清除未读失败：${TGHttps.getErrMsg(cause)}`);
  }
}

function getPostId(item: TGApp.BBS.Notification.Item): string {
  const postId = item.ext?.post_id;
  return typeof postId === "string" && /^[1-9]\d*$/.test(postId.trim()) ? postId.trim() : "";
}

function getWebLink(item: TGApp.BBS.Notification.Item): string {
  if (item.is_web_jump_disable) return "";
  const extPath = item.ext?.web_path;
  const path = item.web_path.trim() || (typeof extPath === "string" ? extPath.trim() : "");
  if (path === "") return "";
  try {
    return new URL(path, "https://www.miyoushe.com/ys/").href;
  } catch {
    return "";
  }
}

function hasTarget(item: TGApp.BBS.Notification.Item): boolean {
  return getPostId(item) !== "" || getWebLink(item) !== "";
}

async function openNotification(item: TGApp.BBS.Notification.Item): Promise<void> {
  markItemRead(item.notification_id);
  try {
    const postId = getPostId(item);
    if (postId) {
      await createPost(postId, item.subject.trim() || undefined);
      return;
    }
    const link = getWebLink(item);
    if (!link) return;
    const result = await parseLink(link);
    if (result === true) return;
    if (result === false) {
      showSnackbar.warn(`未知链接：${link}`);
      return;
    }
    if (result === "post") {
      const linkPostId = await parsePost(link);
      if (linkPostId !== false) await createPost(linkPostId);
      return;
    }
    await openUrl(result);
  } catch (cause) {
    showSnackbar.error(`打开通知失败：${TGHttps.getErrMsg(cause)}`);
  }
}

function markItemRead(notificationId: string): void {
  const target = notifications.value.find(
    (notification) => notification.notification_id === notificationId,
  );
  if (target === undefined || target.is_read) return;
  notifications.value = notifications.value.map((notification) =>
    notification.notification_id === notificationId
      ? { ...notification, is_read: true }
      : notification,
  );
  emit("itemRead", category);
}

async function openProfile(userId: string): Promise<void> {
  try {
    await openCommunityProfile(userId);
  } catch (cause) {
    showSnackbar.error(`打开个人主页失败：${TGHttps.getErrMsg(cause)}`);
  }
}
</script>

<style lang="scss" scoped>
.cp-notifications {
  display: flex;
  flex-direction: column;
  color: var(--app-page-content);
  gap: 16px;
}

.cp-notifications-header {
  display: flex;
  flex-shrink: 0;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;

  h2 {
    display: flex;
    align-items: center;
    margin: 0;
    color: var(--common-text-title);
    font-family: var(--font-title);
    font-size: 16px;
    font-weight: normal;
    gap: 8px;
  }

  p {
    margin: 0;
    color: var(--box-text-4);
    font-size: 12px;
  }
}

.cp-notifications-heading {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
}

.cp-notifications-actions {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 12px;
}

.cp-notifications-count {
  flex-shrink: 0;
  color: var(--box-text-4);
  font-size: 12px;
}

.cp-notifications-body {
  min-height: 0;
  flex: 1 1 auto;
  padding: 4px;
  overflow-y: auto;
  scrollbar-gutter: stable;
}

.cp-notifications-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.cp-notifications-state {
  display: flex;
  min-height: 160px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
  color: var(--box-text-4);
  gap: 12px;
  overflow-wrap: anywhere;
  text-align: center;

  p {
    margin: 0;
  }
}

.cp-notifications-footer {
  display: flex;
  justify-content: center;
  padding: 16px 0 4px;
  color: var(--box-text-4);
  font-size: 12px;
}

@media (width <= 640px) {
  .cp-notifications-header {
    flex-wrap: wrap;
    gap: 8px;
  }
}
</style>
