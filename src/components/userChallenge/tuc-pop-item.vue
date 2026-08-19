<!-- 幽境危战赋光之人 -->
<template>
  <div :style="sizeStyle" :title="avatar.name" class="tuc-pop-item-comp">
    <div class="bg">
      <img :src="bg" alt="Avatar" />
    </div>
    <div class="icon">
      <TMiImg :alt="avatar.name" :ori="true" :src="icon" />
    </div>
    <div class="buff" title="赋光之人">
      <img alt="Buff" src="/icon/challenge/buff.webp" />
    </div>
  </div>
</template>
<script lang="ts" setup>
import TMiImg from "@comp/app/t-mi-img.vue";
import { computed } from "vue";

import { AppCharacterData } from "@/data/index.js";

type TucPopItemProps = { avatar: TGApp.Game.Challenge.PopularityItem; size?: number };

const { avatar, size = 40 } = defineProps<TucPopItemProps>();
const avatarR = computed<TGApp.App.Character.WikiBriefInfo | undefined>(() => {
  const find = AppCharacterData.find((i) => i.id === avatar.avatar_id);
  if (find) return find;
  return undefined;
});
const bg = computed<string>(() => {
  if (avatarR.value) return `/icon/bg/${avatarR.value.star}-BGC.webp`;
  return `/icon/bg/${avatar.rarity}-BGC.webp`;
});
const icon = computed<string>(() => {
  if (avatarR.value) return `/WIKI/character/${avatarR.value.id}.webp`;
  return avatar.image;
});
const sizeStyle = computed<Record<string, string>>(() => ({
  "--tuc-pop-size": `${size}px`,
  "--tuc-pop-icon": `${size - 4}px`,
}));
</script>
<style lang="scss" scoped>
.tuc-pop-item-comp {
  position: relative;
  display: flex;
  width: var(--tuc-pop-size, 40px);
  height: var(--tuc-pop-size, 40px);
  align-items: flex-end;
  justify-content: center;
  border-radius: 50%;
}

.bg {
  position: absolute;
  z-index: 0;
  overflow: hidden;
  width: 100%;
  height: 100%;
  border-radius: 50%;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.icon {
  position: relative;
  z-index: 1;
  overflow: hidden;
  width: var(--tuc-pop-icon, 36px);
  height: var(--tuc-pop-icon, 36px);
  border-radius: 50%;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.buff {
  position: absolute;
  z-index: 2;
  right: -2px;
  bottom: -2px;
  width: 16px;
  height: 16px;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}
</style>
