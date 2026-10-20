<template>
  <button
    :aria-label="`查看 ${relation.user.nickname || '用户'} 的米游社主页`"
    class="cp-user"
    type="button"
    @click="handleOpenProfile"
  >
    <CpAvatar :size="48" :user="relation.user" />
    <span class="cp-user-content">
      <span class="cp-user-heading">
        <span :title="relation.user.nickname" class="cp-user-name">
          {{ relation.user.nickname }}
        </span>
        <span v-if="relationLabel" class="cp-user-relation">{{ relationLabel }}</span>
        <span v-if="relation.is_new" class="cp-user-new">新</span>
      </span>
      <span :title="introduction" class="cp-user-introduction">{{ introduction }}</span>
      <span class="cp-user-id">ID: {{ relation.user.uid }}</span>
    </span>
    <v-icon aria-hidden="true" class="cp-user-arrow" size="20">mdi-chevron-right</v-icon>
  </button>
</template>

<script lang="ts" setup>
import CpAvatar from "@comp/communityProfile/cp-avatar.vue";
import { computed } from "vue";

type CpUserProps = {
  relation: TGApp.BBS.Community.UserRelation;
};

const props = defineProps<CpUserProps>();
const emit = defineEmits<{ openProfile: [uid: string] }>();
const relationLabel = computed<string | undefined>(() => {
  if (props.relation.is_follow && props.relation.is_followed) return "互相关注";
  if (props.relation.is_follow || props.relation.is_following) return "已关注";
  if (props.relation.is_followed) return "关注你";
  return undefined;
});
const introduction = computed<string>(() => {
  const value = props.relation.user.introduce.trim();
  return value || "这个人还没有填写简介";
});

function handleOpenProfile(): void {
  emit("openProfile", props.relation.user.uid);
}
</script>

<style lang="scss" scoped>
.cp-user {
  display: flex;
  width: 100%;
  min-width: 0;
  align-items: center;
  padding: 12px 16px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--box-bg-1);
  color: var(--app-page-content);
  cursor: pointer;
  gap: 12px;
  text-align: left;
  transition:
    background-color 120ms ease,
    border-color 120ms ease;

  &:hover {
    border-color: var(--common-shadow-2);
    background: var(--box-bg-4);
  }

  &:focus-visible {
    outline: 2px solid var(--common-text-title);
    outline-offset: 2px;
  }
}

.cp-user-content {
  display: flex;
  min-width: 0;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 4px;
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
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 16px;
  font-weight: normal;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cp-user-relation,
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

.cp-user-relation {
  background: var(--box-bg-2);
}

.cp-user-new {
  background: var(--box-bg-3);
}

.cp-user-introduction {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  color: var(--box-text-4);
  font-size: 14px;
  -webkit-line-clamp: 2;
  line-height: 20px;
  overflow-wrap: anywhere;
}

.cp-user-id {
  overflow: hidden;
  color: var(--box-text-4);
  font-size: 12px;
  line-height: 16px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cp-user-arrow {
  flex: 0 0 auto;
  color: var(--box-text-4);
}

@media (width <= 640px) {
  .cp-user {
    padding: 12px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .cp-user {
    transition: none;
  }
}
</style>
