<!-- 幽境危战赋光之人 -->
<template>
  <div class="tuc-pop-item-comp" :title="props.avatar.name">
    <div class="bg">
      <img :src="bg" alt="Avatar" />
    </div>
    <div class="icon">
      <TMiImg :src="icon" :alt="props.avatar.name" :ori="true" />
    </div>
  </div>
</template>
<script lang="ts" setup>
import TMiImg from "@comp/app/t-mi-img.vue";
import { computed } from "vue";

import { AppCharacterData } from "@/data/index.js";

type TucPopItemProps = { avatar: TGApp.Game.Challenge.PopularityItem };

const props = defineProps<TucPopItemProps>();
const avatarR = computed<TGApp.App.Character.WikiBriefInfo | undefined>(() => {
  const find = AppCharacterData.find((i) => i.id === props.avatar.avatar_id);
  if (find) return find;
  return undefined;
});
const bg = computed<string>(() => {
  if (avatarR.value) return `/icon/bg/${avatarR.value.star}-BGC.webp`;
  return `/icon/bg/${props.avatar.rarity > 5 ? 5 : props.avatar.rarity}-BGC.webp`;
});
const icon = computed<string>(() => {
  if (avatarR.value) return `/WIKI/character/${avatarR.value.id}.webp`;
  return props.avatar.image;
});
</script>
<style lang="scss" scoped>
.tuc-pop-item-comp {
  position: relative;
  display: flex;
  overflow: hidden;
  width: 40px;
  height: 40px;
  align-items: flex-end;
  justify-content: center;
  border-radius: 50%;

  &:hover {
    filter: brightness(0.9);
  }
}

.bg {
  position: absolute;
  z-index: 0;
  overflow: hidden;
  width: 100%;
  height: 100%;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.icon {
  position: relative;
  z-index: 1;
  width: 36px;
  height: 36px;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}
</style>
