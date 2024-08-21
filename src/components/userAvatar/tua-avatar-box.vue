<template>
  <div class="tua-ab-box">
    <div class="tua-ab-top">
      <TItembox v-model="avatarBox" />
      <div class="tua-abt-right">
        <div class="tua-abt-rt">
          <TItembox v-model="weaponBox" :title="getWeaponTitle()" />
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
        <img v-if="nameCard !== false && isFetterMax" :src="nameCard" alt="nameCard" />
      </div>
      <div class="tua-abl-skills">
        <div v-for="skill in skills" :key="skill.skill_id" class="tua-abl-skill">
          <img :src="skill.icon" alt="skill" />
          <span>Lv.{{ skill.level }}</span>
        </div>
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
</template>
<script lang="ts" setup>
import { computed, onMounted, ref } from "vue";

import TGSqlite from "../../plugins/Sqlite/index.js";
import { useUserStore } from "../../store/modules/user.js";
import { getZhElement } from "../../utils/toolFunc.js";
import TItembox, { TItemBoxData } from "../main/t-itembox.vue";

import TuaRelicBox from "./tua-relic-box.vue";

interface TuaAvatarBoxProps {
  modelValue: TGApp.Sqlite.Character.UserRole;
}

const props = defineProps<TuaAvatarBoxProps>();
const userStore = useUserStore();

type FixedLenArr<T, N extends number> = [T, ...T[]] & { length: N };
type AvatarRelics = FixedLenArr<TGApp.Game.Avatar.Relic | false, 5>;

const avatarBox = computed<TItemBoxData>(() => {
  const avatar = props.modelValue.avatar;
  return {
    size: "100px",
    height: "100px",
    bg: `/icon/bg/${avatar.rarity}-Star.webp`,
    icon: `/WIKI/character/${avatar.id}.webp`,
    lt: `/icon/element/${getZhElement(avatar.element)}元素.webp`,
    ltSize: "20px",
    rt: avatar.actived_constellation_num.toString() || "0",
    rtSize: "20px",
    innerText: avatar.name,
    innerHeight: 30,
    display: "inner",
    clickable: false,
  };
});
const weaponBox = computed<TItemBoxData>(() => {
  const weapon = props.modelValue.weapon;
  return {
    size: "65px",
    height: "65px",
    bg: `/icon/bg/${weapon.rarity}-Star.webp`,
    icon: `/WIKI/weapon/${weapon.id}.webp`,
    lt: `/icon/weapon/${weapon.type_name}.webp`,
    ltSize: "20px",
    rt: weapon.affix_level.toString(),
    rtSize: "20px",
    innerText: weapon.name,
    innerHeight: 20,
    display: "inner",
    clickable: false,
  };
});
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
const skills = computed<TGApp.Game.Avatar.Skill[]>(() => {
  return props.modelValue.skills.filter((skill) => skill.skill_type === 1);
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

function getWeaponTitle(): string {
  const weapon = props.modelValue.weapon;
  const title: string[] = [];
  title.push(`${weapon.type_name} - ${weapon.name}`);
  title.push(`${weapon.rarity}星 精炼${weapon.affix_level} Lv.${weapon.level}`);
  const propMain = userStore.getProp(weapon.main_property.property_type);
  title.push(`${propMain !== false ? propMain.name : "未知属性"} - ${weapon.main_property.final}`);
  const propSub = userStore.getProp(weapon.sub_property.property_type);
  title.push(`${propSub !== false ? propSub.name : "未知属性"} - ${weapon.sub_property.final}`);
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
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  padding: 5px;
  border-radius: 5px;
  background: var(--box-bg-3);
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
