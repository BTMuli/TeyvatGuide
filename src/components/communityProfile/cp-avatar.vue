<template>
  <span :aria-label="avatarAlt" :style="avatarStyle" class="cp-avatar">
    <span class="cp-avatar-image">
      <img v-if="isGifAvatar" :alt="avatarAlt" :src="avatarUrl" />
      <TMiImg v-else :alt="avatarAlt" :ori="true" :size="loadingSize" :src="avatarUrl" />
    </span>
    <span v-if="user.pendant" aria-hidden="true" class="cp-avatar-pendant">
      <TMiImg :ori="true" :size="size" :src="user.pendant" alt="" />
    </span>
  </span>
</template>

<script lang="ts" setup>
import TMiImg from "@comp/app/t-mi-img.vue";
import { getUserAvatar } from "@utils/common/toolFunc.js";
import { computed } from "vue";

type CpAvatarProps = {
  user: Pick<TGApp.BBS.User.Info, "nickname" | "avatar_url" | "pendant"> & {
    avatar_ext?: TGApp.BBS.User.AvatarExt | null;
  };
  size?: number;
};

const { user, size = 48 } = defineProps<CpAvatarProps>();
const innerSize = computed<number>(() => Math.max(1, Math.round(size * 0.8)));
const loadingSize = computed<number>(() => Math.max(14, Math.round(size * 0.4)));
const avatarUrl = computed<string>(() => getUserAvatar(user) || "/UI/nav/lumine.webp");
const avatarAlt = computed<string>(() => `${user.nickname || "用户"}的头像`);
const isGifAvatar = computed<boolean>(() => /\.gif(?:$|[?#])/i.test(avatarUrl.value));
const avatarStyle = computed<Record<string, string>>(() => ({
  "--cp-avatar-size": `${Math.max(1, size)}px`,
  "--cp-avatar-inner-size": `${innerSize.value}px`,
}));
</script>

<style lang="scss" scoped>
.cp-avatar {
  position: relative;
  display: inline-flex;
  overflow: visible;
  width: var(--cp-avatar-size);
  height: var(--cp-avatar-size);
  flex: 0 0 var(--cp-avatar-size);
  align-items: center;
  justify-content: center;
  vertical-align: middle;
}

.cp-avatar-image {
  position: relative;
  z-index: 0;
  display: flex;
  overflow: hidden;
  width: var(--cp-avatar-inner-size);
  height: var(--cp-avatar-inner-size);
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--box-bg-3);

  img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.cp-avatar-pendant {
  position: absolute;
  z-index: 1;
  top: 0;
  left: 0;
  display: flex;
  width: var(--cp-avatar-size);
  height: var(--cp-avatar-size);
  align-items: center;
  justify-content: center;
  pointer-events: none;

  img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  :deep(.progress) {
    width: var(--cp-avatar-size);
    height: var(--cp-avatar-size);
  }
}
</style>
