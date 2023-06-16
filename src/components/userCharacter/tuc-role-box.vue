<template>
  <div class="tuc-rb-box">
    <div class="tuc-rb-top">
      <TItemBox v-model="avatarBox" @click="showAvatarData" />
      <TItemBox v-model="weaponBox" @click="showWeaponData" />
    </div>
  </div>
</template>
<script lang="ts" setup>
import { computed } from "vue";
import TItemBox from "../main/t-itembox.vue";

interface TucRoleBoxProps {
  modelValue: TGApp.Sqlite.Character.UserRole;
}

const props = defineProps<TucRoleBoxProps>();
const avatarBox = computed(() => {
  return {
    size: "80px",
    height: "80px",
    ltSize: "30px",
    bg: `/icon/bg/${props.modelValue.star}-Star.webp`,
    icon: `/WIKI/character/icon/${props.modelValue.cid}.webp`,
    lt: `/icon/element/${props.modelValue.element}.webp`,
    rt: props.modelValue.activeConstellation.toString() || "0",
    rtSize: "20px",
    innerText: `${getAvatarName()}`,
    innerHeight: 20,
    display: "inner",
  };
});
const weaponBox = computed(() => {
  const weapon = JSON.parse(props.modelValue.weapon) as TGApp.Sqlite.Character.RoleWeapon;
  return {
    size: "80px",
    height: "80px",
    ltSize: "30px",
    bg: `/icon/bg/${weapon.star}-Star.webp`,
    icon: `/WIKI/weapon/icon/${weapon.id}.webp`,
    lt: `/icon/weapon/${weapon.type}.webp`,
    rt: weapon.affix.toString() || "0",
    rtSize: "20px",
    innerText: `${weapon.name}`,
    innerHeight: 20,
    display: "inner",
  };
});

function getAvatarName () {
  return (
    props.modelValue.cid === 10000005
      ? "旅行者-空"
      : props.modelValue.cid === 10000007
        ? "旅行者-荧"
        : props.modelValue.name
  );
}

function showAvatarData () {
  console.log(avatarBox.value);
}

function showWeaponData () {
  const weapon = JSON.parse(props.modelValue.weapon) as TGApp.Sqlite.Character.RoleWeapon;
  console.log(weapon);
}
</script>
<style lang="css" scoped>
.tuc-rb-box {
  padding: 5px;
  box-shadow: 0 0 10px var(--common-bg-4);
  border: 1px inset var(--common-bg-4);
  border-radius: 5px;
  position: relative;
}

.tuc-rb-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}
</style>