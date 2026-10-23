<template>
  <div :class="['cp-user', { 'cp-user--action': action }]">
    <button
      :aria-label="`查看 ${relation.user.nickname || '用户'} 的米游社主页`"
      class="cp-user-main"
      type="button"
      @click="handleOpenProfile"
    >
      <CpAvatar :size="48" :user="relation.user" />
      <span class="cp-user-content">
        <span class="cp-user-heading">
          <span :title="relation.user.nickname" class="cp-user-name">
            {{ relation.user.nickname }}
          </span>
          <span class="cp-user-id">ID: {{ relation.user.uid }}</span>
          <span
            v-if="relationState"
            :aria-label="relationState.label"
            :title="relationState.label"
            class="cp-user-relation"
            role="img"
          >
            <v-icon aria-hidden="true" size="14">{{ relationState.icon }}</v-icon>
          </span>
          <span v-if="relation.is_new" class="cp-user-new">新</span>
        </span>
        <span :title="introduction" class="cp-user-introduction">{{ introduction }}</span>
      </span>
      <v-icon aria-hidden="true" class="cp-user-arrow" size="20">mdi-chevron-right</v-icon>
    </button>
    <v-btn
      v-if="action"
      :aria-label="actionLabel"
      :class="['cp-user-action', { 'cp-user-action--danger': action === 'unfollow' }]"
      :disabled="actionDisabled"
      :icon="actionIcon"
      :loading="actionLoading"
      :title="actionLabel"
      size="small"
      variant="text"
      @click="handleAction"
    />
  </div>
</template>

<script lang="ts" setup>
import CpAvatar from "@comp/communityProfile/cp-avatar.vue";
import { computed } from "vue";

type CpUserProps = {
  relation: TGApp.BBS.Community.UserRelation;
  action?: TGApp.BBS.Community.UserRelationAction;
  actionLoading?: boolean;
  actionDisabled?: boolean;
};
type CpUserEmits = {
  openProfile: [uid: string];
  followBack: [relation: TGApp.BBS.Community.UserRelation];
  unfollow: [relation: TGApp.BBS.Community.UserRelation];
};
type RelationState = { icon: string; label: string };

const {
  relation,
  action,
  actionLoading = false,
  actionDisabled = false,
} = defineProps<CpUserProps>();
const emit = defineEmits<CpUserEmits>();
const relationState = computed<RelationState | undefined>(() => {
  if (relation.is_follow && relation.is_followed)
    return { icon: "mdi-account-multiple-check-outline", label: "互相关注" };
  if (relation.is_follow || relation.is_following)
    return { icon: "mdi-account-check-outline", label: "已关注" };
  if (relation.is_followed) return { icon: "mdi-account-heart-outline", label: "关注你" };
  return undefined;
});
const introduction = computed<string>(() => {
  const value = relation.user.introduce.trim();
  return value || "这个人还没有填写简介";
});
const actionLabel = computed<string>(() => (action === "follow-back" ? "回关" : "取消关注"));
const actionIcon = computed<string>(() =>
  action === "follow-back" ? "mdi-account-plus-outline" : "mdi-account-minus-outline",
);

function handleOpenProfile(): void {
  emit("openProfile", relation.user.uid);
}

function handleAction(): void {
  if (action === "follow-back") emit("followBack", relation);
  else if (action === "unfollow") emit("unfollow", relation);
}
</script>

<style lang="scss" scoped>
.cp-user {
  --cp-user-padding-inline: 16px;

  position: relative;
  display: flex;
  width: 100%;
  min-width: 0;
  align-items: center;
  padding: 12px var(--cp-user-padding-inline);
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--box-bg-1);
  color: var(--app-page-content);
  gap: 8px;
  text-align: left;
  transition:
    background-color 120ms ease,
    border-color 120ms ease;

  &:hover {
    border-color: var(--common-shadow-2);
    background: var(--box-bg-4);
  }
}

.cp-user-main {
  display: flex;
  min-width: 0;
  flex: 1 1 auto;
  align-items: center;
  padding: 0;
  border: none;
  background: none;
  color: inherit;
  cursor: pointer;
  gap: 8px;
  text-align: left;

  &:focus-visible {
    border-radius: 4px;
    outline: 2px solid var(--common-text-title);
    outline-offset: 2px;
  }
}

.cp-user-action {
  position: absolute;
  top: 50%;
  right: calc(var(--cp-user-padding-inline) + 28px);
  width: 32px;
  height: 32px;
  border: 1px solid var(--common-shadow-1);
  background: var(--box-bg-2);
  color: var(--common-text-title);
  transform: translateY(-50%);
  transition:
    background-color 120ms ease,
    border-color 120ms ease;

  &:hover {
    border-color: var(--common-shadow-2);
    background: var(--box-bg-3);
  }
}

.cp-user-action--danger {
  color: var(--tgc-od-red);
}

.cp-user-content {
  display: flex;
  min-width: 0;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 4px;
}

.cp-user--action .cp-user-content {
  padding-right: 40px;
}

.cp-user-heading {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
}

.cp-user-name {
  overflow: hidden;
  min-width: 0;
  flex: 0 1 auto;
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 16px;
  font-weight: normal;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cp-user-id {
  flex: 0 0 auto;
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--box-bg-2);
  color: var(--box-text-4);
  font-size: 12px;
  line-height: 16px;
  white-space: nowrap;
}

.cp-user-relation {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  color: var(--box-text-4);
}

.cp-user-new {
  flex: 0 0 auto;
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--box-bg-3);
  color: var(--common-text-title);
  font-size: 12px;
  line-height: 16px;
  white-space: nowrap;
}

.cp-user-introduction {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  color: var(--box-text-4);
  font-size: 12px;
  -webkit-line-clamp: 2;
  line-height: 18px;
  overflow-wrap: anywhere;
}

.cp-user-arrow {
  flex: 0 0 auto;
  color: var(--box-text-4);
}

@media (width <= 640px) {
  .cp-user {
    --cp-user-padding-inline: 12px;

    padding: 12px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .cp-user,
  .cp-user-action {
    transition: none;
  }
}
</style>
