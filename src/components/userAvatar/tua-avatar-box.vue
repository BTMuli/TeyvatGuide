<template>
  <div class="tua-ab-box">
    <!-- 左侧角色、武器、天赋、好感、衣装、名片 -->
    <div class="tua-ab-left">
      <div class="tua-abl-top">
        <TItembox v-model="avatarBox" />
        <TItembox v-model="weaponBox" />
      </div>
      <div class="tua-abl-mid">
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
      <div class="tua-abl-bottom">
        <div class="tua-abl-bg">
          <img v-if="nameCard !== false && isFetterMax" :src="nameCard" alt="nameCard" />
        </div>
        <div class="tua-abl-skills">
          <div v-for="skill in skills" :key="skill.skill_id" class="tua-abl-skill">
            <img :src="skill.icon" alt="skill" />
            <span>Lv.{{ skill.level }}</span>
          </div>
        </div>
      </div>
    </div>
    <!-- 右侧圣遗物及套装 -->
    <div class="tua-ab-right">
      <div v-for="(relic, index) in relicsBox" :key="index" class="tua-abr-relic">
        <!-- 左侧icon 及等级 -->
        <div class="tua-relic-left">
          <div class="tua-rl-icon">
            <img :src="`/icon/relic/${index + 1}.webp`" alt="relic" v-if="relic === false" />
            <img :src="relic.icon" alt="relic" v-if="relic !== false" />
          </div>
          <div class="tua-rl-bg">
            <img :src="`/icon/bg/${relic.rarity}-Star.webp`" alt="bg" v-if="relic !== false" />
          </div>
          <div :class="`tua-rl-relic rarity${relic.rarity}`" v-if="relic !== false">
            {{ relic.level }}
          </div>
        </div>
        <!-- 右侧数值及加成 -->
        <div class="tua-relic-right">
          <div class="tua-relic-name">
            {{ relic === false ? getRelicName(index) : relic.main_property.value }}
          </div>
          <div class="tua-relic-prop" v-if="relic !== false">
            <div v-if="getPropName(relic) !== false">
              <img
                v-if="getPropName(relic).icon !== ''"
                :src="getPropName(relic).icon"
                alt="prop"
                :title="getPropName(relic).name"
              />
              <span v-else>{{ getPropName(relic)?.name }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { computed, onMounted, ref } from "vue";

import TGSqlite from "../../plugins/Sqlite/index.js";
import { useUserStore } from "../../store/modules/user.js";
import { getZhElement } from "../../utils/toolFunc.js";
import TItembox, { TItemBoxData } from "../main/t-itembox.vue";

interface TuaAvatarBoxProps {
  modelValue: TGApp.Sqlite.Character.UserRole;
}

type FixedLenArr<T, N extends number> = [T, ...T[]] & { length: N };
type AvatarRelics = FixedLenArr<TGApp.Game.Avatar.Relic | false, 5>;

const props = defineProps<TuaAvatarBoxProps>();
const userStore = useUserStore();

const avatarBox = computed<TItemBoxData>(() => {
  const avatar = props.modelValue.avatar;
  return {
    size: "100px",
    height: "120px",
    ltSize: "30px",
    bg: `/icon/bg/${avatar.rarity}-Star.webp`,
    icon: `/WIKI/character/${avatar.id}.webp`,
    lt: `/icon/element/${getZhElement(avatar.element)}元素.webp`,
    rt: avatar.actived_constellation_num.toString() || "0",
    rtSize: "20px",
    innerText: `Lv.${avatar.level}`,
    innerHeight: 20,
    outerText: avatar.name,
    outerHeight: 20,
    display: "outer",
    clickable: true,
  };
});
const weaponBox = computed<TItemBoxData>(() => {
  const weapon = props.modelValue.weapon;
  return {
    size: "100px",
    height: "120px",
    ltSize: "30px",
    bg: `/icon/bg/${weapon.rarity}-Star.webp`,
    icon: `/WIKI/weapon/${weapon.id}.webp`,
    lt: `/icon/weapon/${weapon.type_name}.webp`,
    rt: weapon.affix_level.toString() || "0",
    rtSize: "20px",
    innerText: `Lv.${weapon.level}`,
    innerHeight: 20,
    outerText: weapon.name,
    outerHeight: 20,
    display: "outer",
    clickable: true,
  };
});
const isFetterMax = computed<boolean>(() => {
  if (props.modelValue.avatar.id === 10000005 || props.modelValue.avatar.id === 10000007) {
    return true;
  }
  return props.modelValue.avatar.fetter === 10;
});
const skills = computed<TGApp.Game.Avatar.Skill[]>(() => {
  return props.modelValue.skills.filter((skill) => skill.skill_type === 1);
});
const relicsBox = computed<AvatarRelics>(() => {
  const relics = props.modelValue.relics;
  return [
    relics.find((relic) => relic.pos === 1) || false,
    relics.find((relic) => relic.pos === 2) || false,
    relics.find((relic) => relic.pos === 3) || false,
    relics.find((relic) => relic.pos === 4) || false,
    relics.find((relic) => relic.pos === 5) || false,
  ];
});

const nameCard = ref<string | false>(false);

onMounted(async () => {
  if (!props.modelValue) return;
  if (props.modelValue.avatar.id !== 10000005 && props.modelValue.avatar.id !== 10000007) {
    const role = await TGSqlite.getAppCharacter(props.modelValue.avatar.id);
    nameCard.value = `/source/nameCard/profile/${role.nameCard}.webp`;
  } else {
    nameCard.value = "/source/nameCard/profile/原神·印象.webp";
  }
});

function getRelicName(pos: number): string {
  const nameList = ["生之花", "死之羽", "时之沙", "空之杯", "理之冠"];
  return nameList[pos];
}

function getPropName(relic: TGApp.Game.Avatar.Relic): TGApp.Game.Avatar.PropMapItem | false {
  return userStore.getProp(relic.main_property.property_type);
}
</script>
<style lang="css" scoped>
.tua-ab-box {
  position: relative;
  display: flex;
  width: fit-content;
  padding: 5px;
  border: 1px inset var(--common-shadow-2);
  border-radius: 5px;
  background: var(--box-bg-2);
  column-gap: 5px;
  transition: all 0.3s;
}

.tua-ab-left {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  row-gap: 5px;
}

.tua-abl-top {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
}

.tua-abl-mid {
  display: flex;
  width: 100%;
  height: 30px;
  align-items: center;
  justify-content: space-between;
  padding: 5px;
  border-radius: 5px;
  background: var(--box-bg-3);
  font-family: var(--font-title);
  font-size: 12px;
}

.tua-abl-fetter {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  column-gap: 5px;

  img {
    width: 20px;
    height: 20px;
    object-fit: contain;
  }
}

.tua-abl-other {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  color: var(--box-text-4);
  column-gap: 5px;
}

.tua-abl-bottom {
  position: relative;
  width: 100%;
  height: 80px;
  align-items: center;
  border-radius: 5px;
}

.tua-abl-bg {
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
  border-radius: 5px;
  -webkit-backdrop-filter: blur(5px);
  backdrop-filter: blur(5px);
  background: var(--box-bg-3);

  img {
    width: 100%;
    height: 100%;
    border-radius: 5px;
    object-fit: fill;
  }
}

.tua-abl-skills {
  position: relative;
  display: flex;
  width: 210px;
  height: 100%;
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

.tua-ab-right {
  display: grid;
  column-gap: 5px;
  grid-template-columns: repeat(2, 1fr);
}

.tua-abr-relic {
  display: flex;
  width: 120px;
  align-items: center;
  justify-content: space-between;
  column-gap: 5px;
}

.tua-relic-left {
  position: relative;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: rgb(50 56 68/50%);
}

.tua-rl-icon {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;

  :nth-child(1) {
    padding: 5px;
  }

  img {
    width: 100%;
    height: 100%;
    border-radius: 50%;
  }
}

.tua-rl-bg {
  overflow: hidden;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: var(--box-bg-3);

  img {
    width: 100%;
    height: 100%;
  }
}

.tua-rl-relic {
  position: absolute;
  right: -4px;
  bottom: -4px;
  display: flex;
  width: 24px;
  height: 24px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  box-shadow: 0 0 5px var(--tgc-dark-1);
  color: var(--tgc-white-1);
  font-family: var(--font-title);
  font-size: 12px;
  line-height: 1;
  text-shadow: 0 0 5px var(--tgc-dark-1);
}

.tua-rl-relic.rarity0 {
  background: var(--tgc-od-white);
}

.tua-rl-relic.rarity1 {
  background: var(--tgc-od-white);
}

.tua-rl-relic.rarity2 {
  background: var(--tgc-od-green);
}

.tua-rl-relic.rarity3 {
  background: var(--tgc-od-blue);
}

.tua-rl-relic.rarity4 {
  background: var(--tgc-od-purple);
}

.tua-rl-relic.rarity5 {
  background: var(--tgc-od-orange);
}

.tua-relic-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: center;
}

.tua-relic-name {
  color: var(--box-text-4);
  font-family: var(--font-title);
  font-size: 16px;
}

.tua-relic-prop {
  display: inline-flex;
  color: var(--box-text-4);
  font-size: 12px;

  img {
    width: 20px;
    height: 20px;
    filter: invert(0.5) contrast(1) drop-shadow(0 0 5px var(--common-shadow-4));
    object-fit: contain;
  }
}
</style>
