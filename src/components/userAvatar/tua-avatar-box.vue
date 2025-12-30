<!-- 角色卡片组件 -->
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
      <div :class="{ ori: isFetterMax }" class="tua-abl-bg">
        <img :src="nameCard" alt="nameCard" />
      </div>
      <div class="tua-abl-skills">
        <div
          v-for="skill in skills"
          :key="skill.skill_id"
          :title="`${skill.name} Lv.${skill.level}`"
          class="tua-abl-skill"
        >
          <img :src="skill.icon" alt="skill" />
          <span>Lv.{{ skill.level }}</span>
        </div>
      </div>
      <div class="tua-abl-bottom">
        <div :title="`好感度：${props.role.avatar.fetter}`" class="tua-abl-fetter">
          <img alt="fetter" src="/icon/material/105.webp" />
          <span>{{ props.role.avatar.fetter }}</span>
        </div>
        <div class="tua-abl-costume">
          <span
            v-if="props.role.costumes.length > 0"
            :title="`衣装: ${props.role.costumes.map((i) => i.name).join(', ')}`"
          >
            <v-icon size="small">mdi-tshirt-crew</v-icon>
          </span>
        </div>
        <div class="tua-abl-level">
          <span>Lv.{{ props.role.avatar.level }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import TItemBox, { type TItemBoxData } from "@comp/app/t-itemBox.vue";
import TSUserAvatar from "@Sqlm/userAvatar.js";
import useUserStore from "@store/user.js";
import { getZhElement } from "@utils/toolFunc.js";
import { computed } from "vue";

import TuaRelicBox from "./tua-relic-box.vue";

import { AppCharacterData } from "@/data/index.js";

type fixedLenArr<T, N extends number> = [T, ...Array<T>] & { length: N };
type AvatarRelics = fixedLenArr<TGApp.Game.Avatar.Relic | false, 5>;
type TuaAvatarBoxProps = { role: TGApp.Sqlite.Character.TableTrans };

const props = defineProps<TuaAvatarBoxProps>();
const userStore = useUserStore();

const avatarIcon = computed<string>(() => {
  const costume = getCostume();
  if (costume) return `/WIKI/costume/${costume.id}.webp`;
  return `/WIKI/character/${props.role.avatar.id}.webp`;
});
const avatarBox = computed<TItemBoxData>(() => ({
  size: "100px",
  height: "100px",
  bg: `/icon/bg/${props.role.avatar.rarity}-Star.webp`,
  icon: avatarIcon.value,
  lt: `/icon/element/${getZhElement(props.role.avatar.element)}元素.webp`,
  ltSize: "20px",
  rt: props.role.avatar.actived_constellation_num.toString() || "0",
  rtSize: "20px",
  innerText: props.role.avatar.name,
  innerHeight: 30,
  display: "inner",
  clickable: true,
}));
const weaponBox = computed<TItemBoxData>(() => ({
  size: "65px",
  height: "65px",
  bg: `/icon/bg/${props.role.weapon.rarity}-Star.webp`,
  icon: `/WIKI/weapon/${props.role.weapon.id}.webp`,
  lt: `/icon/weapon/${props.role.weapon.type_name}.webp`,
  ltSize: "20px",
  rt: props.role.weapon.affix_level.toString(),
  rtSize: "20px",
  innerText: props.role.weapon.name,
  innerHeight: 20,
  display: "inner",
  clickable: true,
}));
const relicsBox = computed<AvatarRelics>(() => {
  const relics = props.role.relics;
  return [
    relics.find((i) => i.pos === 1) || false,
    relics.find((i) => i.pos === 2) || false,
    relics.find((i) => i.pos === 3) || false,
    relics.find((i) => i.pos === 4) || false,
    relics.find((i) => i.pos === 5) || false,
  ];
});
const isFetterMax = computed<boolean>(() => {
  const skipList = [10000005, 10000007, 10000117, 10000118];
  if (skipList.includes(props.role.avatar.id)) return true;
  return props.role.avatar.fetter === 10;
});
const skills = computed<Array<TGApp.Game.Avatar.Skill>>(() =>
  props.role.skills.filter((skill) => skill.skill_type === 1),
);
const nameCard = computed<string>(() => {
  const cardFind = TSUserAvatar.getAvatarCard(props.role.avatar.id);
  return `/WIKI/nameCard/profile/${cardFind}.webp`;
});

function getCostume(): TGApp.App.Character.Costume | false {
  if (props.role.costumes.length === 0) return false;
  const findC = AppCharacterData.find((i) => i.id === props.role.cid);
  if (!findC) return false;
  let res: TGApp.App.Character.Costume | false = false;
  for (const costume of props.role.costumes) {
    const findCostume = findC.costumes.find((i) => i.id === costume.id);
    if (findCostume !== undefined && !findCostume.isDefault) return findCostume;
  }
  return res;
}

function getWeaponTitle(): string {
  const weapon = props.role.weapon;
  const title: Array<string> = [];
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
<style lang="scss" scoped>
@use "@styles/github.styles.scss" as github-styles;

.tua-ab-box {
  @include github-styles.github-card;

  position: relative;
  display: flex;
  flex-direction: column;
  padding: 4px;
  border-radius: 4px;
  cursor: pointer;
  row-gap: 4px;
}

.dark .tua-ab-box {
  @include github-styles.github-card("dark");
}

.tua-ab-top {
  display: flex;
  align-items: center;
  justify-content: center;
  column-gap: 4px;
}

.tua-abt-right {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  row-gap: 4px;
}

.tua-abt-rt {
  display: flex;
  align-items: center;
  justify-content: space-between;
  column-gap: 4px;
}

.tua-abt-rtr {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  row-gap: 4px;
}

.tua-abt-rb {
  display: flex;
  align-items: center;
  justify-content: space-between;
  column-gap: 4px;
}

.tua-abl-bottom {
  position: relative;
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: flex-start;
  padding: 4px;
  -webkit-backdrop-filter: blur(5px);
  backdrop-filter: blur(5px);
  background: #00000066;
  border-bottom-left-radius: 4px;
  border-bottom-right-radius: 4px;
  color: var(--tgc-white-1);
  column-gap: 4px;
  font-family: var(--font-title);
}

.tua-abl-fetter {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 4px;

  img {
    width: 20px;
    height: 20px;
    object-fit: contain;
  }
}

.tua-abl-costume {
  margin-right: auto;
  font-size: 14px;
}

.tua-abl-level {
  font-size: 12px;
}

.tua-abl-mid {
  position: relative;
  display: flex;
  overflow: hidden;
  width: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  border-radius: 4px;
  aspect-ratio: 21/10;
  row-gap: 4px;
}

.tua-abl-bg {
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  aspect-ratio: 21/10;
  -webkit-backdrop-filter: blur(5px);
  backdrop-filter: blur(5px);
  background: var(--box-bg-3);
  filter: grayscale(1);
  transition: filter 0.5s ease-in-out;

  &.ori {
    filter: unset;
  }

  img {
    width: 100%;
    height: 100%;
    border-radius: 4px;
  }
}

.tua-ab-box:hover .tua-abl-bg {
  filter: grayscale(0);
}

.tua-abl-skills {
  position: relative;
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-evenly;
  padding: 4px;
}

.tua-abl-skill {
  display: flex;
  width: 48px;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  row-gap: 4px;

  :first-child {
    position: relative;
    display: flex;
    width: 40px;
    height: 40px;
    box-sizing: border-box;
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
    width: 48px;
    align-items: center;
    justify-content: center;
    border-radius: 5px;
    background: var(--box-bg-4);
    color: var(--box-text-4);
    font-family: var(--font-title);
    font-size: 12px;
  }
}
</style>
