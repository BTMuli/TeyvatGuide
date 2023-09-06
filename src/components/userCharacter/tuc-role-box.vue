<template>
  <div class="tuc-rb-box">
    <div class="tuc-rb-top">
      <TItemBox v-model="avatarBox" />
      <TItemBox v-model="weaponBox" />
    </div>
    <div class="tuc-rb-middle">
      <div class="tuc-rbm-fetter">
        <img src="/icon/material/105.webp" alt="fetter" />
        <span>{{ props.modelValue.fetter }}</span>
      </div>
      <div class="tuc-rbm-other">
        <span v-if="props.modelValue.fetter !== 10">
          <v-icon>mdi-lock-outline</v-icon>
        </span>
        <span v-if="props.modelValue.costume !== '[]'">
          <v-icon>mdi-tshirt-crew-outline</v-icon>
        </span>
      </div>
    </div>
    <div class="tuc-rb-bottom">
      <div class="tuc-rbb-bg">
        <img
          v-if="nameCard !== false && props.modelValue.fetter === 10"
          :src="nameCard"
          alt="nameCard"
        />
      </div>
      <div v-show="talents.length > 0" class="tuc-rbb-content">
        <div v-for="talent in talents" :key="talent.pos" class="tuc-rbb-talent">
          <img :src="talent.icon" alt="talent" />
          <span>Lv.{{ talent.level }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
// vue
import { computed, onMounted, onUnmounted, ref } from "vue";
import TItemBox from "../main/t-itembox.vue";
// utils
import TGSqlite from "../../plugins/Sqlite";
import { saveImgLocal } from "../../utils/TGShare";

interface TucRoleBoxProps {
  modelValue: TGApp.Sqlite.Character.UserRole;
}

const props = defineProps<TucRoleBoxProps>();
const talents = ref<TGApp.Sqlite.Character.RoleTalent[]>([]);

const avatarBox = computed(() => {
  return {
    size: "80px",
    height: "100px",
    ltSize: "30px",
    bg: `/icon/bg/${props.modelValue.star}-Star.webp`,
    icon: `/WIKI/character/icon/${props.modelValue.cid}.webp`,
    lt: `/icon/element/${props.modelValue.element}.webp`,
    rt: props.modelValue.activeConstellation.toString() || "0",
    rtSize: "20px",
    innerText: `Lv.${props.modelValue.level}`,
    innerHeight: 20,
    outerText: getAvatarName(),
    outerHeight: 20,
    display: <"outer">"outer",
    clickable: true,
  };
});
const weaponBox = computed(() => {
  const weapon = <TGApp.Sqlite.Character.RoleWeapon>JSON.parse(props.modelValue.weapon);
  return {
    size: "80px",
    height: "100px",
    ltSize: "30px",
    bg: `/icon/bg/${weapon.star}-Star.webp`,
    icon: `/WIKI/weapon/icon/${weapon.id}.webp`,
    lt: `/icon/weapon/${weapon.type}.webp`,
    rt: weapon.affix.toString() || "0",
    rtSize: "20px",
    innerText: `Lv.${weapon.level}`,
    innerHeight: 20,
    outerText: weapon.name,
    outerHeight: 20,
    display: <"outer">"outer",
    clickable: true,
  };
});
const nameCard = ref<string | false>(false);

onMounted(async () => {
  if (props.modelValue.cid !== 10000005 && props.modelValue.cid !== 10000007) {
    const role = await TGSqlite.getAppCharacter(props.modelValue.cid);
    nameCard.value = `/source/nameCard/profile/${role.nameCard}.webp`;
  }
  if (props.modelValue.talent !== "" && props.modelValue.talent !== "[]") {
    const talentsLocal: TGApp.Sqlite.Character.RoleTalent[] = JSON.parse(props.modelValue.talent);
    talents.value = talentsLocal
      .filter((talent) => talent.max === 10)
      .sort((a, b) => a.pos - b.pos);
    talents.value.map(async (talent) => {
      talent.icon = await saveImgLocal(talent.icon);
    });
  } else {
    console.error(props.modelValue.cid, props.modelValue.name, "天赋为空");
  }
});

function getAvatarName(): string {
  return props.modelValue.cid === 10000005
    ? "旅行者-空"
    : props.modelValue.cid === 10000007
    ? "旅行者-荧"
    : props.modelValue.name;
}

// 销毁
onUnmounted(() => {
  talents.value.forEach((talent) => {
    URL.revokeObjectURL(talent.icon);
  });
});
</script>
<style lang="css" scoped>
.tuc-rb-box {
  position: relative;
  display: flex;
  flex-direction: column;
  padding: 5px;
  border: 1px inset var(--common-shadow-2);
  border-radius: 5px;
  background: var(--box-bg-2);
  cursor: pointer;
  row-gap: 5px;
  transition: all 0.3s;
}

.tuc-rb-top {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
}

.tuc-rb-middle {
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

.tuc-rbm-fetter {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  column-gap: 5px;
}

.tuc-rbm-fetter img {
  width: 20px;
  height: 20px;
  object-fit: contain;
}

.tuc-rbm-other {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  color: var(--box-text-4);
  column-gap: 5px;
}

.tuc-rb-bottom {
  position: relative;
  width: 100%;
  height: 80px;
  align-items: center;
  border-radius: 5px;
}

.tuc-rbb-bg {
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
  border-radius: 5px;
  backdrop-filter: blur(5px);
  background: var(--tgc-btn-1);
}

.tuc-rbb-bg img {
  width: 100%;
  height: 100%;
  border-radius: 5px;
  object-fit: fill;
}

.tuc-rbb-content {
  position: relative;
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: space-between;
  padding: 5px;
  border-radius: 5px;
}

.tuc-rbb-talent {
  display: flex;
  width: 50px;
  height: 80px;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
}

.tuc-rbb-talent :nth-child(1) {
  display: flex;
  width: 40px;
  height: 40px;
  align-items: center;
  justify-content: center;
  padding: 5px;
  border: 1px solid var(--tgc-white-4);
  border-radius: 50%;
  background: var(--tgc-dark-7);
  opacity: 0.8;
}

.tuc-rbb-talent :nth-child(2) {
  display: flex;
  width: 100%;
  height: 30px;
  align-items: center;
  justify-content: center;
  color: var(--tgc-white-4);
  font-family: var(--font-title);
  font-size: 12px;
  text-shadow: 0 0 10px var(--tgc-dark-7);
}
</style>
