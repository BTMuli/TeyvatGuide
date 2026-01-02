<!-- 幽境危战赋光之人 -->
<template>
  <div class="tuc-bling-item-comp" :title="props.bling.name">
    <div class="bg">
      <img :src="bg" alt="Avatar" />
    </div>
    <div class="icon">
      <TMiImg :src="icon" :alt="props.bling.name" :ori="true" />
    </div>
    <div class="plus">
      <img
        src="/icon/challenge/bling.webp"
        alt="Plus"
        v-if="props.bling.is_plus"
        title="恒昼辉光"
      />
      <img src="/icon/challenge/buff.webp" alt="Buff" v-else title="辉光" />
    </div>
  </div>
</template>
<script lang="ts" setup>
import TMiImg from "@comp/app/t-mi-img.vue";
import { computed } from "vue";

import { AppCharacterData } from "@/data/index.js";

type TucblingItemProps = { bling: TGApp.Game.Challenge.ChallengeBling };

const props = defineProps<TucblingItemProps>();
const avatarR = computed<TGApp.App.Character.WikiBriefInfo | undefined>(() => {
  const find = AppCharacterData.find((i) => i.id === props.bling.avatar_id);
  if (find) return find;
  return undefined;
});
const bg = computed<string>(() => {
  if (avatarR.value) return `/icon/bg/${avatarR.value.star}-BGC.webp`;
  return `/icon/bg/${props.bling.rarity}-BGC.webp`;
});
const icon = computed<string>(() => {
  if (avatarR.value) return `/WIKI/character/${avatarR.value.id}.webp`;
  return props.bling.image;
});
</script>
<style lang="scss" scoped>
.tuc-bling-item-comp {
  position: relative;
  display: flex;
  width: 40px;
  height: 40px;
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
  width: 36px;
  height: 36px;
  border-radius: 50%;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.plus {
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
