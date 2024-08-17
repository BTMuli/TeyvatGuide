<template>
  <div class="tua-ab-box">
    <!-- 左侧角色、武器、天赋、好感、衣装、名片 -->
    <div class="tua-ab-top">
      <TuaItemBox v-model="avatarBox" />
      <div class="tua-abt-right">
        <TuaItemBox v-model="weaponBox" />
        <div v-for="(relic, index) in relicsBox" :key="index" class="tua-relic-box">
          <div class="tua-relic-bg">
            <img :src="`/icon/bg/${relic.rarity}-Star.webp`" alt="bg" v-if="relic !== false" />
          </div>
          <div class="tua-relic-icon">
            <img
              :src="`/icon/relic/${index + 1}.webp`"
              :alt="`relic${index + 1}`"
              v-if="relic === false"
              class="empty"
            />
            <img :src="relic.icon" :alt="relic.name" v-else />
          </div>
        </div>
      </div>
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
</template>
<script lang="ts" setup>
import { computed, onMounted, ref } from "vue";

import TGSqlite from "../../plugins/Sqlite/index.js";
import { getZhElement } from "../../utils/toolFunc.js";

import TuaItemBox, { TuaItemBoxType } from "./tua-item-box.vue";

interface TuaAvatarBoxProps {
  modelValue: TGApp.Sqlite.Character.UserRole;
}

const props = defineProps<TuaAvatarBoxProps>();

type FixedLenArr<T, N extends number> = [T, ...T[]] & { length: N };
type AvatarRelics = FixedLenArr<TGApp.Game.Avatar.Relic | false, 5>;

const avatarBox = computed<TuaItemBoxType>(() => {
  const avatar = props.modelValue.avatar;
  return {
    star: avatar.rarity,
    type: "character",
    id: avatar.id,
    size: "130px",
    lt: `/icon/element/${getZhElement(avatar.element)}元素.webp`,
    ltSize: "30px",
    rt: avatar.actived_constellation_num.toString() || "0",
    rtSize: "20px",
    clickable: true,
  };
});
const weaponBox = computed<TuaItemBoxType>(() => {
  const weapon = props.modelValue.weapon;
  return {
    star: weapon.rarity,
    type: "weapon",
    id: weapon.id,
    size: "40px",
    lt: `/icon/weapon/${weapon.type_name}.webp`,
    ltSize: "15px",
    rt: weapon.affix_level.toString() || "0",
    rtSize: "15px",
    clickable: true,
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
  justify-content: space-between;
}

.tua-abt-right {
  display: flex;
  width: 85px;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 5px;
}

.tua-relic-box {
  position: relative;
  width: 40px;
  height: 40px;
  border-radius: 5px;
}

.tua-relic-icon {
  position: relative;
  width: 40px;
  height: 40px;
  border-radius: 5px;

  img {
    width: 100%;
    height: 100%;
    border-radius: 5px;
    object-fit: cover;
  }

  .empty {
    padding: 5px;
  }
}

.tua-relic-bg {
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
  border-radius: 5px;
  background: var(--box-bg-3);

  img {
    width: 100%;
    height: 100%;
    border-radius: 5px;
    object-fit: cover;
  }
}

.tua-abl-mid {
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
</style>
