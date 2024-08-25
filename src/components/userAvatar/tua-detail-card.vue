<template>
  <div class="tua-dc-container">
    <!-- 右上分享 -->
    <v-btn
      class="tua-dc-share"
      icon="mdi-share-variant"
      @click="share"
      variant="outlined"
      :loading="loading"
      data-html2canvas-ignore
    />
    <!-- 左侧角色剪影 -->
    <img :src="props.modelValue.avatar.image" class="tua-dc-avatar" alt="avatar" />
    <!-- 右侧武器跟圣遗物具体属性 -->
    <div class="tua-dc-detail">
      <TuaDcWeapon :model-value="props.modelValue.weapon" />
      <TuaDcRelic :model-value="relicList[0]" pos="1" />
      <TuaDcRelic :model-value="relicList[1]" pos="2" />
      <TuaDcRelic :model-value="relicList[2]" pos="3" />
      <TuaDcRelic :model-value="relicList[3]" pos="4" />
      <TuaDcRelic :model-value="relicList[4]" pos="5" />
    </div>
  </div>
</template>
<script lang="ts" setup>
import { computed, onMounted, ref, watch } from "vue";

import TSUserAvatar from "../../plugins/Sqlite/modules/userAvatar.js";
import { generateShareImg } from "../../utils/TGShare.js";

import TuaDcRelic from "./tua-dc-relic.vue";
import TuaDcWeapon from "./tua-dc-weapon.vue";

interface TuaDetailCardProps {
  modelValue: TGApp.Sqlite.Character.UserRole;
}

const props = defineProps<TuaDetailCardProps>();

type fixedLenArr<T, N extends number> = [T, ...T[]] & { length: N };
type RelicList = fixedLenArr<TGApp.Game.Avatar.Relic | false, 5>;

const relicList = computed<RelicList>(() => {
  return [
    props.modelValue.relics.find((item) => item.pos === 1) || false,
    props.modelValue.relics.find((item) => item.pos === 2) || false,
    props.modelValue.relics.find((item) => item.pos === 3) || false,
    props.modelValue.relics.find((item) => item.pos === 4) || false,
    props.modelValue.relics.find((item) => item.pos === 5) || false,
  ];
});

const bg = ref<string>("/source/nameCard/profile/原神·印象.webp");
const loading = ref<boolean>(false);

onMounted(async () => {
  await loadData();
});

watch(
  () => props.modelValue,
  async () => {
    await loadData();
  },
);

async function loadData(): Promise<void> {
  if (props.modelValue.cid === 10000005 || props.modelValue.cid === 10000007) {
    bg.value = "url('/source/nameCard/profile/原神·印象.webp')";
  } else {
    const card = await TSUserAvatar.getAvatarCard(props.modelValue.cid);
    if (card !== false) {
      bg.value = `url("/source/nameCard/profile/${card}.webp")`;
    } else {
      bg.value = "url('/source/nameCard/profile/原神·印象.webp')";
    }
  }
}

async function share(): Promise<void> {
  const shareBox = <HTMLElement>document.querySelector(".tua-dc-container");
  const fileName = `【角色详情】${props.modelValue.avatar.name}`;
  loading.value = true;
  await generateShareImg(fileName, shareBox);
  loading.value = false;
}
</script>
<style lang="css" scoped>
.tua-dc-container {
  position: relative;
  overflow: hidden;
  width: 800px;
  border-radius: 5px;
  aspect-ratio: 21 / 10;
  background: v-bind(bg);
  background-size: cover;
}

.tua-dc-share {
  position: absolute;
  top: 10px;
  right: 10px;
  color: var(--tgc-white-1);
}

.tua-dc-avatar {
  position: absolute;
  top: 0;
  left: -80px;
  height: 100%;
  object-fit: contain;
}

.tua-dc-detail {
  position: absolute;
  right: 0;
  bottom: 0;
  display: grid;
  padding: 5px;
  gap: 5px;
  grid-template-columns: repeat(3, 170px);
  grid-template-rows: repeat(2, 140px);
}
</style>
