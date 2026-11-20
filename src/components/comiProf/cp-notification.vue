<template>
  <article
    ref="cardEl"
    :class="{ 'is-clickable': clickable, 'is-unread': !notification.is_read }"
    class="cp-notification"
    @click="handleCardClick"
  >
    <header class="cp-notification-header">
      <div class="cp-notification-sender-row">
        <button
          v-if="badge"
          :aria-label="`分享通知：${badge.label}`"
          :disabled="sharing"
          class="cp-notification-tag"
          title="分享通知"
          type="button"
          @click.stop="shareCard"
        >
          <CpTypeBadge :icon="badge.icon" :label="badge.label" />
        </button>
        <component
          :is="senderLabel ? 'button' : 'span'"
          :aria-label="senderLabel"
          :type="senderLabel ? 'button' : undefined"
          class="cp-notification-author"
          @click="openSender"
        >
          <span class="cp-notification-avatar">
            <img v-if="isGifAvatar" :src="avatarUrl" alt="" />
            <TMiImg v-else-if="avatarUrl" :ori="true" :size="16" :src="avatarUrl" alt="" />
            <v-icon v-else aria-hidden="true" icon="mdi-bell-outline" size="20" />
          </span>
          <span :title="senderName" class="cp-notification-name">{{ senderName }}</span>
        </component>
      </div>
      <component
        :is="clickable ? 'button' : 'span'"
        v-if="headerText"
        :aria-label="clickable ? openLabel : undefined"
        :class="[
          category === 'system' ? 'cp-notification-title' : 'cp-notification-action',
          { 'cp-notification-open': clickable },
        ]"
        :type="clickable ? 'button' : undefined"
        @click.stop="openTarget"
      >
        {{ headerText }}
      </component>
      <time v-if="createdAtLabel" :datetime="createdAtIso" class="cp-notification-time">
        {{ createdAtLabel }}
      </time>
      <span
        v-if="!notification.is_read"
        aria-label="打开列表时未读"
        class="cp-notification-dot"
        role="img"
        title="打开列表时未读"
      />
    </header>

    <div v-if="hasBody" :class="{ 'cp-notification-framed-content': category === 'comment' }">
      <p v-if="notification.is_content_deleted" class="cp-notification-content is-deleted">
        该内容已被删除
      </p>
      <div v-else-if="contentNodes.length" class="cp-notification-content">
        <TpParser :data="contentNodes" :imageComponent="CpContentImage" />
      </div>
    </div>
    <CpImageThumbnail
      v-if="coverImage"
      :key="coverImage"
      :source="coverImage"
      alt="通知配图"
      class="cp-notification-thumbnail"
    />
    <blockquote v-if="showOrigin" class="cp-notification-framed-content">
      <CpImageThumbnail
        v-if="originImage"
        :key="originImage.image_url"
        :attributes="originImage"
        :source="originImage.image_url"
        alt="原内容图片"
        class="cp-notification-thumbnail"
      />
      <span class="cp-notification-origin-text">
        <template v-if="originDeleted">原内容已删除</template>
        <TpParser
          v-else-if="originNodes.length"
          :data="originNodes"
          :imageComponent="CpContentImage"
        />
      </span>
    </blockquote>
  </article>
</template>

<script lang="ts" setup>
import TMiImg from "@comp/app/t-mi-img.vue";
import TpParser from "@comp/viewPost/tp-parser.vue";
import useAppStore from "@store/app.js";
import { getStructuredContent } from "@utils/community/comment.js";
import { shouldRenderNotificationOrigin } from "@utils/community/notification.js";
import { parseCommunityProfileGid } from "@utils/community/profile.js";
import { str2Color } from "@utils/display/colorFunc.js";
import fmtUtil from "@utils/display/fmtUtil.js";
import TGShare from "@utils/share/TGShare.js";
import { computed, ref, useTemplateRef } from "vue";

import CpContentImage from "./cp-content-image.vue";
import CpImageThumbnail from "./cp-image-thumbnail.vue";
import CpTypeBadge from "./cp-type-badge.vue";

type CpNotificationProps = {
  notification: TGApp.BBS.Notification.Item;
  category: TGApp.BBS.Notification.Category;
  target: TGApp.BBS.Notification.Target;
};

type NotificationBadge = { label: string; icon: string };

const systemBadges: Record<TGApp.BBS.Notification.TargetKind, NotificationBadge> = {
  post: { label: "帖子", icon: "mdi-post-outline" },
  web: { label: "网页", icon: "mdi-web" },
  internal: { label: "站内", icon: "mdi-link-variant" },
  notice: { label: "通知", icon: "mdi-bell-outline" },
};

const { notification, category, target } = defineProps<CpNotificationProps>();
const emit = defineEmits<{ open: []; openProfile: [uid: string, gid?: number] }>();
const appStore = useAppStore();
const clickable = computed<boolean>(() => "href" in target || "postId" in target);
const cardEl = useTemplateRef<HTMLElement>("cardEl");
const sharing = ref<boolean>(false);

const userId = computed<string>(() => {
  const uid = notification.op_user?.uid?.trim() ?? "";
  if (/^[1-9]\d*$/.test(uid)) return uid;
  const fallback = notification.op_uid?.trim() ?? "";
  return /^[1-9]\d*$/.test(fallback) ? fallback : "";
});
const user = computed(() => {
  const opUser = notification.op_user;
  if (category === "system" && (!opUser || !userId.value)) return undefined;
  if (!opUser && !userId.value) return undefined;
  return {
    nickname: opUser?.nickname?.trim() || (userId.value ? `用户 ${userId.value}` : "用户"),
    avatarUrl: opUser?.avatar_url?.trim() || "/UI/nav/lumine.webp",
  };
});
const profileGid = computed<number | undefined>(() =>
  parseCommunityProfileGid(notification.game_id),
);
const actionTarget = computed<"post" | "reply" | undefined>(() => {
  const { type } = notification;
  if ((category === "reply" && type === 1) || (category === "comment" && type === 21)) {
    return "post";
  }
  if ((category === "reply" && type === 2) || (category === "comment" && type === 22)) {
    return "reply";
  }
  return undefined;
});
const actionText = computed<string>(() => {
  const targetText =
    actionTarget.value === "post" ? "我的帖子" : actionTarget.value === "reply" ? "我的评论" : "我";
  switch (category) {
    case "reply":
      return `回复了${targetText}`;
    case "active_mention":
      return "@了我";
    case "comment": {
      const upvote = notification.ext?.upvote_content;
      if (typeof upvote === "string" && upvote.trim() !== "") return upvote;
      return `赞了${targetText}`;
    }
    default:
      return "";
  }
});
const systemTitle = computed<string>(
  () => notification.site_title.trim() || notification.subject.trim() || "系统通知",
);
const senderName = computed<string>(() => user.value?.nickname ?? systemTitle.value);
const avatarUrl = computed<string>(
  () => user.value?.avatarUrl ?? notification.site_icon?.trim() ?? "",
);
const isGifAvatar = computed<boolean>(() => /\.gif(?:$|[?#])/i.test(avatarUrl.value));
const headerText = computed<string>(() => {
  if (!user.value) return "";
  if (category === "system") return systemTitle.value;
  return category === "active_mention" ? actionText.value : "";
});
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
const originImage = computed<TGApp.BBS.Notification.OriginImage | undefined>(() => {
  const image = notification.origin?.image;
  if (!image || originDeleted.value) return undefined;
  const url = image.image_url.trim();
  return url ? { ...image, image_url: url } : undefined;
});
const originNodes = computed<Array<TGApp.BBS.SctPost.Base>>(() => {
  if (!notification.origin || originDeleted.value) return [];
  return getStructuredContent("", notification.origin.text.trim());
});
/** 正文是否已有可显示内容，内容已删除的提示同样算作内容。 @since Beta v0.13.1 */
const hasBody = computed<boolean>(
  () => notification.is_content_deleted || contentNodes.value.length > 0,
);
/** 是否需要单独渲染原内容引用块。 @since Beta v0.13.1 */
const showOrigin = computed<boolean>(() =>
  shouldRenderNotificationOrigin(category, notification.origin, hasBody.value),
);
const badge = computed<NotificationBadge | undefined>(() => {
  if (category === "system") return systemBadges[target.kind];
  if (category === "reply") return { label: actionText.value, icon: "mdi-reply-outline" };
  if (category === "comment") return { label: actionText.value, icon: "mdi-thumb-up-outline" };
  return undefined;
});
const isDarkMode = computed<boolean>(() => appStore.theme === "dark");
const badgeLabel = computed<string>(() => badge.value?.label ?? "");
const badgeColor = computed<string>(() => str2Color(badgeLabel.value, isDarkMode.value ? 80 : -40));
const badgeTextColor = computed<string>(() =>
  str2Color(badgeLabel.value, isDarkMode.value ? 180 : -150),
);
const openLabel = computed<string>(() =>
  actionText.value
    ? `${user.value?.nickname ?? ""}${actionText.value}`
    : `打开通知：${systemTitle.value}`,
);
const senderLabel = computed<string | undefined>(() => {
  if (user.value) return userId.value ? `查看 ${user.value.nickname} 的米游社主页` : undefined;
  return clickable.value ? openLabel.value : undefined;
});
const createdAt = computed<number>(() => Number(notification.created_at));
const createdAtLabel = computed<string>(() =>
  Number.isFinite(createdAt.value) && createdAt.value > 0
    ? fmtUtil.dateTime(createdAt.value * 1000)
    : "",
);
const createdAtIso = computed<string>(() =>
  createdAtLabel.value ? new Date(createdAt.value * 1000).toISOString() : "",
);

async function shareCard(): Promise<void> {
  const card = cardEl.value;
  if (!card || sharing.value) return;
  sharing.value = true;
  try {
    await TGShare.modern(`Notification_${notification.notification_id}`, card, 2.5, false, {
      backdropBlurScale: 0.7,
    });
  } finally {
    sharing.value = false;
  }
}

function openSender(event: MouseEvent): void {
  if (!senderLabel.value) return;
  event.stopPropagation();
  if (user.value) emit("openProfile", userId.value, profileGid.value);
  else openTarget();
}

function openTarget(): void {
  if (clickable.value) emit("open");
}

function handleCardClick(event: MouseEvent): void {
  if (!clickable.value || !(event.target instanceof Element)) return;
  if (
    event.target.closest(
      ".cp-notification-content a, .cp-notification-content button, .cp-notification-content summary, .cp-notification-content [role='button'], .cp-notification-content [role='link'], .cp-notification-content .tp-text-link, .cp-notification-content .tp-mention-box, .cp-notification-content .cp-content-image, .cp-notification-content .tp-emo-box, .cp-notification-content .tp-lc-box",
    ) !== null
  )
    return;
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
  gap: 8px;
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

.cp-notification-sender-row {
  --cp-notification-avatar-size: 32px;
  --cp-notification-sender-gap: 8px;

  display: flex;
  min-width: 0;
  align-items: center;
  gap: var(--cp-notification-sender-gap);
}

.cp-notification-author {
  display: flex;
  min-width: 0;
  flex: 0 1 auto;
  align-items: center;
  padding: 0;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: var(--common-text-title);
  cursor: default;
  font: inherit;
  font-size: 14px;
  gap: 8px;
  text-align: left;

  &[type="button"] {
    cursor: pointer;
  }

  &:focus-visible {
    outline: 2px solid var(--common-text-title);
    outline-offset: 2px;
  }
}

.cp-notification-avatar {
  display: grid;
  overflow: hidden;
  width: var(--cp-notification-avatar-size);
  height: var(--cp-notification-avatar-size);
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--box-bg-2);
  place-items: center;

  :deep(img) {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.cp-notification-name {
  overflow: hidden;
  min-width: 0;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cp-notification-open {
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font: inherit;
  text-align: left;

  &:focus-visible {
    outline: 2px solid var(--common-text-title);
    outline-offset: 2px;
  }
}

.cp-notification-action {
  flex-shrink: 0;
  white-space: nowrap;
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

.cp-notification-tag {
  --cp-badge-tone: v-bind(badgeColor); /* stylelint-disable-line value-keyword-case */

  display: inline-flex;
  min-width: 0;
  max-width: calc(100% - var(--cp-notification-avatar-size) - var(--cp-notification-sender-gap));
  flex-shrink: 0;
  padding: 0;
  border: 0;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  font: inherit;

  &:disabled {
    cursor: progress;
  }

  &:focus-visible {
    outline: 2px solid var(--common-text-title);
    outline-offset: 2px;
  }

  :deep(.cp-type-badge) {
    max-width: 100%;
    height: var(--cp-notification-avatar-size);
    box-sizing: border-box;
    padding: 4px 8px;
    background: color-mix(in srgb, var(--cp-badge-tone) 18%, transparent);
    color: v-bind(badgeTextColor); /* stylelint-disable-line value-keyword-case */
    font-size: 14px;

    > span {
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }
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

  :deep(.tp-image-load),
  :deep(.tp-emo-box) {
    width: fit-content;
    max-width: min(100%, 320px);
    justify-content: flex-start;
    margin: 8px 0;
  }

  :deep(.tp-emo-box img) {
    width: auto;
    max-width: min(100%, 320px);
    max-height: 240px;
    margin: 0;
    object-fit: contain;
  }
}

.cp-notification-thumbnail {
  max-width: 100%;
  align-self: flex-start;
}

.cp-notification-framed-content {
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: flex-start;
  padding: 8px 12px;
  border-radius: 4px;
  border-left: 3px solid var(--common-shadow-2);
  margin: 0;
  background: var(--box-bg-2);
  color: var(--box-text-4);
  font-size: 12px;
  gap: 8px;
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
}
</style>
