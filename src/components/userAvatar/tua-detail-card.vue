<template>
  <div class="tua-dc-container">
    <div class="tua-dc-avatar">
      <TMiImg :src="props.modelValue.avatar.image" :ori="true" alt="avatar" />
    </div>
    <v-btn
      class="tua-dc-share"
      prepend-icon="mdi-share-variant"
      @click="share"
      variant="outlined"
      :loading="loading"
      data-html2canvas-ignore
      size="small"
    >
      分享
    </v-btn>
    <!-- 右上整体属性&角色-->
    <div class="tua-dc-rt">
      <div class="tua-dcr-avatar">
        <span>{{ props.modelValue.avatar.name }}</span>
        <span>Lv.{{ props.modelValue.avatar.level }}</span>
        <span>好感{{ props.modelValue.avatar.fetter }}</span>
        <v-icon
          :title="`解锁衣装：${props.modelValue.costumes.map((i) => i.name).join(',')}`"
          v-if="props.modelValue.costumes.length !== 0"
          size="14"
        >
          mdi-tshirt-crew
        </v-icon>
      </div>
      <div v-for="(prop, index) in props.modelValue.propSelected" :key="index">
        <div v-if="propMain[index] !== false" class="tua-dc-prop">
          <TuaDcProp :model-value="prop" :prop="propMain[index]" />
        </div>
      </div>
    </div>
    <!-- 右侧武器跟圣遗物具体属性 -->
    <div class="tua-dc-detail">
      <TuaDcWeapon
        :model-value="props.modelValue.weapon"
        :uid="props.modelValue.uid"
        :updated="props.modelValue.updated"
      />
      <TuaDcRelic
        :model-value="relicList[0]"
        pos="1"
        :recommend="props.modelValue.propRecommend.recommend_properties"
      />
      <TuaDcRelic
        :model-value="relicList[1]"
        pos="2"
        :recommend="props.modelValue.propRecommend.recommend_properties"
      />
      <TuaDcRelic
        :model-value="relicList[2]"
        pos="3"
        :recommend="props.modelValue.propRecommend.recommend_properties"
      />
      <TuaDcRelic
        :model-value="relicList[3]"
        pos="4"
        :recommend="props.modelValue.propRecommend.recommend_properties"
      />
      <TuaDcRelic
        :model-value="relicList[4]"
        pos="5"
        :recommend="props.modelValue.propRecommend.recommend_properties"
      />
    </div>
    <!-- 左下命座跟天赋 -->
    <div class="tua-dc-lb">
      <TuaDcTalents :model-value="props.modelValue.skills" />
      <TuaDcConstellations :model-value="props.modelValue.constellations" />
    </div>
  </div>
</template>
<script lang="ts" setup>
import TMiImg from "@comp/app/t-mi-img.vue";
import showSnackbar from "@comp/func/snackbar.js";
import TSUserAvatar from "@Sqlm/userAvatar.js";
import useUserStore from "@store/user.js";
import { generateShareImg } from "@utils/TGShare.js";
import { computed, ref } from "vue";

import TuaDcConstellations from "./tua-dc-constellations.vue";
import TuaDcProp from "./tua-dc-prop.vue";
import TuaDcRelic from "./tua-dc-relic.vue";
import TuaDcTalents from "./tua-dc-talents.vue";
import TuaDcWeapon from "./tua-dc-weapon.vue";

type fixedLenArr<T, N extends number> = [T, ...Array<T>] & { length: N };
type RelicList = fixedLenArr<TGApp.Game.Avatar.Relic | false, 5>;
type TuaDetailCardProps = { modelValue: TGApp.Sqlite.Character.UserRole };

const props = defineProps<TuaDetailCardProps>();
const userStore = useUserStore();

const relicList = computed<RelicList>(() => {
  return [
    props.modelValue.relics.find((item) => item.pos === 1) || false,
    props.modelValue.relics.find((item) => item.pos === 2) || false,
    props.modelValue.relics.find((item) => item.pos === 3) || false,
    props.modelValue.relics.find((item) => item.pos === 4) || false,
    props.modelValue.relics.find((item) => item.pos === 5) || false,
  ];
});
const propMain = computed<Array<TGApp.Game.Avatar.PropMapItem | false>>(() =>
  props.modelValue.propSelected.map((item) => userStore.getProp(item.property_type)),
);

const bg = computed<string>(() => {
  const card = TSUserAvatar.getAvatarCard(props.modelValue.cid);
  return `url("/WIKI/nameCard/profile/${card}.webp")`;
});
const loading = ref<boolean>(false);

async function share(): Promise<void> {
  const shareBox = document.querySelector<HTMLElement>(".tua-dc-container");
  if (shareBox === null) {
    showSnackbar.error("分享失败，未找到分享内容");
    return;
  }
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
  top: 5px;
  left: 5px;
  border: 1px solid #ffffff33;
  border-radius: 5px;
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
  color: var(--tgc-white-1);
}

.tua-dc-avatar {
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  width: 300px;
  height: 100%;
  align-items: center;
  justify-content: center;
  object-fit: contain;

  img {
    height: 100%;
    object-fit: contain;
  }
}

.tua-dc-rt {
  position: absolute;
  top: 5px;
  right: 5px;
  display: flex;
  width: 520px;
  height: 80px;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  padding: 5px;
  border: 1px solid #ffffff33;
  border-radius: 5px;
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
  background: #00000033;
  gap: 0;
}

.tua-dcr-avatar {
  position: absolute;
  bottom: 5px;
  left: 14px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  color: var(--tgc-white-1);
  column-gap: 10px;
  font-family: var(--font-title);
  font-size: 14px;
  text-shadow: 0 0 5px #00000080;
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

.tua-dc-lb {
  position: absolute;
  bottom: 5px;
  left: 5px;
  display: flex;
  width: 260px;
  height: 90px;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  gap: 5px;
}
</style>
