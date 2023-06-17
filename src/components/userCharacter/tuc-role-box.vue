<template>
  <div class="tuc-rb-box" @click="showOverlay">
    <div class="tuc-rb-top">
      <TItemBox v-model="avatarBox" />
      <TItemBox v-model="weaponBox" />
    </div>
    <div class="tuc-rb-bottom">
      <!-- bg 好感名片 -->
      <div v-if="nameCard!==false" class="tuc-rbb-bg">
        <img :src="nameCard" alt="nameCard">
      </div>
      <!-- 表面 lock -->
      <div v-if="props.modelValue.fetter!==10" class="tuc-rbb-lock">
        <v-icon size="20" color="var(--page-bg)">
          mdi-lock
        </v-icon>
      </div>
      <!-- 左上角好感等级 -->
      <div class="tuc-rbb-fetter">
        <img src="/icon/material/105.webp" alt="fetter">
        <span>{{ props.modelValue.fetter }}</span>
      </div>
    </div>
  </div>
  <ToUcDetail v-model="visible" :data-val="props.modelValue" />
</template>
<script lang="ts" setup>
// vue
import { computed, onMounted, ref } from "vue";
import TItemBox from "../main/t-itembox.vue";
import ToUcDetail from "./tuc-detail-overlay.vue";
// utils
import TGSqlite from "../../plugins/Sqlite";

interface TucRoleBoxProps {
  modelValue: TGApp.Sqlite.Character.UserRole;
}

const visible = ref(false);
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
const nameCard = ref(false as string | false);

onMounted(async () => {
  if (props.modelValue.cid === 10000005 || props.modelValue.cid === 10000007) return;
  const role = await TGSqlite.getAppCharacter(props.modelValue.cid);
  nameCard.value = `/source/nameCard/profile/${role.nameCard}.webp`;
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

function showOverlay () {
  visible.value = true;
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

.tuc-rb-bottom {
  position: relative;
  align-items: center;
  width: 100%;
  margin-top: 5px;
  height: 80px;
  border-radius: 5px;
}

.tuc-rbb-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
}

.tuc-rbb-bg img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: 5px;
}

.tuc-rbb-lock {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: var(--common-bg-4);
  backdrop-filter: blur(5px);
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 5px;
}

.tuc-rbb-fetter {
  position: absolute;
  top: 5px;
  left: 5px;
  width: calc(100% - 10px);
  height: 20px;
  display: flex;
  justify-content: start;
  align-items: center;
  border-radius: 5px;
  color: var(--common-color-yellow);
  background: rgb(0 0 0 / 50%);
}

.tuc-rbb-fetter :nth-child(1) {
  margin: 0 5px;
}

.tuc-rbb-fetter img {
  width: 20px;
  height: 20px;
  object-fit: contain;
}
</style>
