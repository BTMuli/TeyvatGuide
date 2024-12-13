<template>
  <div class="tua-ab-box" title="点击查看详情">
    <div class="tua-ab-top">
      <TItemBox v-model="avatarBox" />
      <div class="tua-abt-right">
        <div class="tua-abt-rt">
          <TItemBox v-model="weaponBox" :title="getWeaponTitle()" />
          <div class="tua-abt-rtr">
            <TuaRelicBox :model-value="relicsBox[0]" :position="1" />
            <TuaRelicBox :model-value="relicsBox[1]" :position="2" />
          </div>
        </div>
        <div class="tua-abt-rb">
          <TuaRelicBox :model-value="relicsBox[2]" :position="3" />
          <TuaRelicBox :model-value="relicsBox[3]" :position="4" />
          <TuaRelicBox :model-value="relicsBox[4]" :position="5" />
        </div>
      </div>
    </div>
    <div class="tua-abl-mid">
      <div class="tua-abl-bg">
        <img v-if="isFetterMax" :src="nameCard" alt="nameCard" />
      </div>
      <div class="tua-abl-skills">
        <div v-for="skill in skills" :key="skill.skill_id" class="tua-abl-skill">
          <img :src="skill.icon" alt="skill" />
          <span>Lv.{{ skill.level }}</span>
        </div>
      </div>
      <div class="tua-abl-bottom">
        <div class="tua-abl-fetter">
          <img src="/icon/material/105.webp" alt="fetter" />
          <span>{{ props.modelValue.avatar.fetter }}</span>
        </div>
        <div class="tua-abl-other">
          <span v-if="!isFetterMax">
            <v-icon>mdi-lock-outline</v-icon>
          </span>
          <span v-if="props.modelValue.costumes.length > 0">
            <v-icon>mdi-tshirt-crew-outline</v-icon>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import TItemBox, { type TItemBoxData } from "@comp/app/t-itemBox.vue";
import TSUserAvatar from "@Sqlite/modules/userAvatar.js";
import { computed } from "vue";

import TuaRelicBox from "./tua-relic-box.vue";

import { useUserStore } from "@/store/modules/user.js";
import { getZhElement } from "@/utils/toolFunc.js";

type fixedLenArr<T, N extends number> = [T, ...Array<T>] & { length: N };
type AvatarRelics = fixedLenArr<TGApp.Game.Avatar.Relic | false, 5>;
type TuaAvatarBoxProps = { modelValue: TGApp.Sqlite.Character.UserRole };

const props = defineProps<TuaAvatarBoxProps>();
const userStore = useUserStore();

const avatarBox = computed<TItemBoxData>(() => ({
  size: "100px",
  height: "100px",
  bg: `/icon/bg/${props.modelValue.avatar.rarity}-Star.webp`,
  icon: `/WIKI/character/${props.modelValue.avatar.id}.webp`,
  lt: `/icon/element/${getZhElement(props.modelValue.avatar.element)}元素.webp`,
  ltSize: "20px",
  rt: props.modelValue.avatar.actived_constellation_num.toString() || "0",
  rtSize: "20px",
  innerText: props.modelValue.avatar.name,
  innerHeight: 30,
  display: "inner",
  clickable: true,
}));
const weaponBox = computed<TItemBoxData>(() => ({
  size: "65px",
  height: "65px",
  bg: `/icon/bg/${props.modelValue.weapon.rarity}-Star.webp`,
  icon: `/WIKI/weapon/${props.modelValue.weapon.id}.webp`,
  lt: `/icon/weapon/${props.modelValue.weapon.type_name}.webp`,
  ltSize: "20px",
  rt: props.modelValue.weapon.affix_level.toString(),
  rtSize: "20px",
  innerText: props.modelValue.weapon.name,
  innerHeight: 20,
  display: "inner",
  clickable: true,
}));
const relicsBox = computed<AvatarRelics>(() => {
  const relics = props.modelValue.relics;
  return [
    relics.find((i) => i.pos === 1) || false,
    relics.find((i) => i.pos === 2) || false,
    relics.find((i) => i.pos === 3) || false,
    relics.find((i) => i.pos === 4) || false,
    relics.find((i) => i.pos === 5) || false,
  ];
});
const isFetterMax = computed<boolean>(() => {
  if (props.modelValue.avatar.id === 10000005 || props.modelValue.avatar.id === 10000007) {
    return true;
  }
  return props.modelValue.avatar.fetter === 10;
});
const skills = computed<Array<TGApp.Game.Avatar.Skill>>(() =>
  props.modelValue.skills.filter((skill) => skill.skill_type === 1),
);
const nameCard = computed<string>(() => {
  const cardFind = TSUserAvatar.getAvatarCard(props.modelValue.avatar.id);
  return `/source/nameCard/profile/${cardFind}.webp`;
});

function getWeaponTitle(): string {
  const weapon = props.modelValue.weapon;
  const title: string[] = [];
  title.push(`${weapon.type_name} - ${weapon.name}`);
  title.push(`${weapon.rarity}星 精炼${weapon.affix_level} Lv.${weapon.level}`);
  const propMain = userStore.getProp(weapon.main_property.property_type);
  title.push(`${propMain !== false ? propMain.name : "未知属性"} - ${weapon.main_property.final}`);
  if (weapon.sub_property !== null) {
    const propSub = userStore.getProp(weapon.sub_property.property_type);
    title.push(`${propSub !== false ? propSub.name : "未知属性"} - ${weapon.sub_property.final}`);
  }
  return title.join("\n");
}
</script>
<style lang="css" scoped>
.tua-ab-box {
  position: relative;
  display: flex;
  flex-direction: column;
  padding: 5px;
  border: 1px inset var(--common-shadow-2);
  border-radius: 5px;
  background: var(--box-bg-2);
  color: var(--tgc-white-1);
  cursor: pointer;
  row-gap: 5px;
}

.tua-ab-top {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: center;
  column-gap: 10px;
}

.tua-abt-right {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  row-gap: 5px;
}

.tua-abt-rt {
  display: flex;
  align-items: center;
  justify-content: space-between;
  column-gap: 5px;
}

.tua-abt-rtr {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  row-gap: 5px;
}

.tua-abt-rb {
  display: flex;
  align-items: center;
  justify-content: space-between;
  column-gap: 5px;
}

.tua-abl-bottom {
  position: relative;
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  padding: 5px;
  -webkit-backdrop-filter: blur(5px);
  backdrop-filter: blur(5px);
  background: rgb(0 0 0 / 40%);
  border-bottom-left-radius: 5px;
  border-bottom-right-radius: 5px;
  font-family: var(--font-title);
}

.tua-abl-fetter {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 5px;

  img {
    width: 20px;
    height: 20px;
    object-fit: contain;
  }
}

.tua-abl-mid {
  position: relative;
  display: flex;
  overflow: hidden;
  width: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  border-radius: 5px;
  aspect-ratio: 21/10;
}

.tua-abl-bg {
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: center;
  border-radius: 5px;
  aspect-ratio: 21/10;
  -webkit-backdrop-filter: blur(5px);
  backdrop-filter: blur(5px);
  background: var(--box-bg-3);

  img {
    width: 100%;
    height: 100%;
    border-radius: 5px;
  }
}

.tua-abl-skills {
  position: relative;
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  padding: 5px;
  border-radius: 5px;
}

.tua-abl-skill {
  display: flex;
  width: 50px;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  row-gap: 5px;

  :first-child {
    position: relative;
    display: flex;
    width: 40px;
    height: 40px;
    align-items: center;
    justify-content: center;
    padding: 5px;
    border: 1px solid var(--box-bg-4);
    border-radius: 50%;
    background: var(--tgc-dark-7);
    opacity: 0.8;
  }

  :last-child {
    display: flex;
    align-items: center;
    justify-content: center;
    padding-right: 5px;
    padding-left: 5px;
    border-radius: 5px;
    background: var(--box-bg-4);
    color: var(--box-text-4);
    font-family: var(--font-title);
    font-size: 12px;
  }
}
</style>
