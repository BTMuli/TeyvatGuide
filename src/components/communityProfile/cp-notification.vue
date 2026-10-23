<template>
  <article
    :aria-label="clickable ? openLabel : undefined"
    :class="{ 'is-clickable': clickable, 'is-unread': !notification.is_read }"
    class="cp-notification"
    :role="clickable ? 'button' : undefined"
    :tabindex="clickable ? 0 : undefined"
    :title="clickable ? openLabel : undefined"
    @click="handleCardClick"
    @keydown.enter.space="handleCardKeydown"
  >
    <header class="cp-notification-header">
      <button
        v-if="user"
        :title="`查看 ${user.nickname} 的米游社主页`"
        class="cp-notification-author"
        type="button"
        @click.stop="emit('openProfile', user.uid)"
      >
        <CpAvatar :user="avatarUser" :size="32" />
        <span>{{ user.nickname }}</span>
      </button>
      <span v-if="user" class="cp-notification-action">{{ actionText }}</span>
      <template v-else>
        <span class="cp-notification-icon">
          <TMiImg v-if="notification.site_icon" :ori="true" :src="notification.site_icon" alt="" />
          <v-icon v-else size="20" aria-hidden="true">mdi-bell-outline</v-icon>
        </span>
        <span class="cp-notification-title">{{ systemTitle }}</span>
      </template>
      <time v-if="createdAtLabel" :datetime="createdAtIso" class="cp-notification-time">
        {{ createdAtLabel }}
      </time>
      <span
        v-if="!notification.is_read"
        aria-label="未读"
        class="cp-notification-dot"
        role="img"
        title="未读"
      />
    </header>

    <p v-if="notification.is_content_deleted" class="cp-notification-content is-deleted">
      该内容已被删除
    </p>
    <div v-else-if="contentNodes.length" class="cp-notification-content">
      <TpParser :data="contentNodes" />
    </div>
    <span v-if="coverImage" class="cp-notification-cover">
      <TMiImg :src="coverImage" alt="通知配图" />
    </span>
    <blockquote
      v-if="originDeleted || originNodes.length || originImage"
      class="cp-notification-origin"
    >
      <span v-if="originImage" class="cp-notification-origin-image">
        <TMiImg :src="originImage" alt="原内容图片" />
      </span>
      <span class="cp-notification-origin-text">
        <template v-if="originDeleted">原内容已删除</template>
        <TpParser v-else-if="originNodes.length" :data="originNodes" />
      </span>
    </blockquote>
  </article>
</template>

<script lang="ts" setup>
import TMiImg from "@comp/app/t-mi-img.vue";
import TpParser from "@comp/viewPost/tp-parser.vue";
import { getStructuredContent } from "@utils/community/comment.js";
import fmtUtil from "@utils/display/fmtUtil.js";
import { computed } from "vue";

import CpAvatar from "./cp-avatar.vue";

type CpNotificationProps = {
  notification: TGApp.BBS.Notification.Item;
  category: TGApp.BBS.Notification.Category;
  clickable: boolean;
};

const { notification, category, clickable } = defineProps<CpNotificationProps>();
const emit = defineEmits<{ open: []; openProfile: [uid: string] }>();

const user = computed<TGApp.BBS.Notification.OpUser | undefined>(() => {
  if (category === "system") return undefined;
  const opUser = notification.op_user;
  return opUser && opUser.uid.trim() !== "" ? opUser : undefined;
});
const avatarUser = computed(() => ({
  nickname: user.value?.nickname ?? "",
  avatar_url: user.value?.avatar_url ?? "",
  pendant: "",
}));
const actionText = computed<string>(() => {
  switch (category) {
    case "reply":
      if (notification.type === 1) return "回复了我的帖子";
      if (notification.type === 2) return "回复了我的评论";
      return "回复了我";
    case "active_mention":
      return "@了我";
    case "comment": {
      const upvote = notification.ext?.upvote_content;
      if (typeof upvote === "string" && upvote.trim() !== "") return upvote;
      if (notification.type === 21) return "赞了我的帖子";
      if (notification.type === 22) return "赞了我的评论";
      return "赞了我";
    }
    default:
      return "";
  }
});
const systemTitle = computed<string>(
  () => notification.site_title.trim() || notification.subject.trim() || "系统通知",
);
const contentNodes = computed<Array<TGApp.BBS.SctPost.Base>>(() =>
  category === "system"
    ? getStructuredContent("", notification.site_content || notification.content)
    : getStructuredContent(notification.structured_content, notification.content),
);
const coverImage = computed<string>(() => {
  const image = notification.ext?.image;
  return category === "system" && typeof image === "string" ? image.trim() : "";
});
const originDeleted = computed<boolean>(() => {
  const origin = notification.origin;
  return origin !== null && (origin.is_deleted || origin.origin_is_missing);
});
const originImage = computed<string>(() => {
  if (!notification.origin || originDeleted.value) return "";
  return notification.origin.image?.image_url.trim() ?? "";
});
const originNodes = computed<Array<TGApp.BBS.SctPost.Base>>(() => {
  if (!notification.origin || originDeleted.value) return [];
  return getStructuredContent("", notification.origin.text.trim());
});
const openLabel = computed<string>(() =>
  user.value ? `${user.value.nickname}${actionText.value}` : `打开通知：${systemTitle.value}`,
);
const createdAt = computed<number>(() => Number(notification.created_at));
const createdAtLabel = computed<string>(() =>
  Number.isFinite(createdAt.value) && createdAt.value > 0
    ? fmtUtil.dateTime(createdAt.value * 1000)
    : "",
);
const createdAtIso = computed<string>(() =>
  createdAtLabel.value ? new Date(createdAt.value * 1000).toISOString() : "",
);

function handleCardClick(event: MouseEvent): void {
  if (!clickable || !(event.target instanceof Element)) return;
  if (
    event.target.closest(
      ".cp-notification-content a, .cp-notification-content button, .cp-notification-content summary, .cp-notification-content [role='button'], .cp-notification-content [role='link'], .cp-notification-content .tp-text-link, .cp-notification-content .tp-mention-box, .cp-notification-content .tp-image-box, .cp-notification-content .tp-emo-box, .cp-notification-content .tp-lc-box",
    ) !== null
  )
    return;
  emit("open");
}

function handleCardKeydown(event: KeyboardEvent): void {
  if (!clickable || event.target !== event.currentTarget) return;
  event.preventDefault();
  emit("open");
}
</script>

<style lang="scss" scoped>
.cp-notification {
  display: flex;
  min-width: 0;
  flex-direction: column;
  padding: 16px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--box-bg-1);
  gap: 12px;
  transition:
    background-color 120ms ease,
    border-color 120ms ease;

  &.is-unread {
    border-color: var(--common-shadow-2);
  }

  &.is-clickable {
    cursor: pointer;

    &:hover {
      border-color: var(--common-shadow-2);
      background: var(--box-bg-4);
    }

    &:focus-visible {
      outline: 2px solid var(--common-text-title);
      outline-offset: 2px;
    }
  }
}

.cp-notification-header {
  display: flex;
  min-width: 0;
  align-items: center;
  color: var(--box-text-4);
  font-size: 12px;
  gap: 8px;
}

.cp-notification-author {
  display: flex;
  min-width: 0;
  flex: 0 1 auto;
  align-items: center;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--common-text-title);
  cursor: pointer;
  font: inherit;
  font-size: 14px;
  gap: 8px;
  text-align: left;

  span {
    overflow: hidden;
    max-width: 200px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &:hover span {
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  &:focus-visible {
    border-radius: 4px;
    outline: 2px solid var(--common-text-title);
    outline-offset: 4px;
  }
}

.cp-notification-action {
  flex-shrink: 0;
  white-space: nowrap;
}

.cp-notification-icon {
  display: grid;
  overflow: hidden;
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--box-bg-2);
  color: var(--common-text-title);
  place-items: center;

  :deep(img) {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.cp-notification-title {
  overflow: hidden;
  min-width: 0;
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 14px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cp-notification-time {
  flex: 1 0 auto;
  text-align: right;
  white-space: nowrap;
}

.cp-notification-dot {
  width: 8px;
  height: 8px;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--tgc-od-red);
}

.cp-notification-content {
  min-width: 0;
  margin: 0;
  color: var(--app-page-content);
  font-size: 14px;
  line-height: 20px;
  overflow-wrap: anywhere;

  &.is-deleted {
    color: var(--box-text-4);
    font-style: italic;
  }

  :deep(.tp-image-box) {
    width: fit-content;
    max-width: min(100%, 320px);
    justify-content: flex-start;
    margin: 8px 0;
  }

  :deep(.tp-image-box img) {
    width: auto;
    max-width: min(100%, 320px);
    max-height: 240px;
    margin: 0;
    object-fit: contain;
  }
}

.cp-notification-cover {
  display: block;
  overflow: hidden;
  width: fit-content;
  max-width: min(100%, 360px);
  border-radius: 4px;

  :deep(img) {
    display: block;
    max-width: 100%;
    max-height: 200px;
    object-fit: contain;
  }
}

.cp-notification-origin {
  display: flex;
  min-width: 0;
  align-items: center;
  padding: 8px 12px;
  border-radius: 4px;
  border-left: 3px solid var(--common-shadow-2);
  margin: 0;
  background: var(--box-bg-2);
  color: var(--box-text-4);
  font-size: 12px;
  gap: 8px;
}

.cp-notification-origin-image {
  display: grid;
  overflow: hidden;
  width: 48px;
  height: 48px;
  flex-shrink: 0;
  border-radius: 4px;
  place-items: center;

  :deep(img) {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.cp-notification-origin-text {
  display: -webkit-box;
  overflow: hidden;
  min-width: 0;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow-wrap: anywhere;

  :deep(.tp-text-emoji) {
    margin: 0 2px;
  }

  :deep(.tp-text-emoji img) {
    height: 20px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .cp-notification {
    transition: none;
  }
}

@media (width <= 640px) {
  .cp-notification {
    padding: 12px;
  }

  .cp-notification-author span {
    max-width: 120px;
  }
}
</style>
