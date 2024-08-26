<template>
  <div class="tua-dcw-box">
    <div class="tua-dcw-main">
      <div class="tua-dcw-left">
        <img :src="`/icon/bg/${props.modelValue.rarity}-Star.webp`" alt="star" />
        <img :src="`/WIKI/weapon/${props.modelValue.id}.webp`" alt="weapon" />
      </div>
      <div class="tua-dcw-right">
        <span class="tua-dcw-title">{{ props.modelValue.name }}</span>
        <span class="tua-dcw-sub">
          <span>Lv.{{ props.modelValue.level }}</span>
          <span>精炼{{ props.modelValue.affix_level }}</span>
        </span>
      </div>
    </div>
    <div class="tua-dcw-props">
      <div class="tua-prop-main">
        <span>
          <img
            v-if="propMain !== false && propMain.icon !== ''"
            :src="propMain.icon"
            alt="propMain"
          />
          <span>{{ propMain !== false ? propMain.name : "未知属性" }}</span>
        </span>
        <span>{{ props.modelValue.main_property.final }}</span>
      </div>
      <div class="tua-prop-sub">
        <span>
          <img v-if="propSub !== false && propSub.icon !== ''" :src="propSub.icon" alt="propSub" />
          <span>{{ propSub !== false ? propSub.name : "未知属性" }}</span>
        </span>
        <span>{{ props.modelValue.sub_property.final }}</span>
      </div>
    </div>
    <div class="tua-dcw-share">
      <span class="tua-share-title">UID:{{ props.uid }}</span>
      <span class="tua-share-time">更新于{{ props.updated }}</span>
      <span class="tua-share-version">TeyvatGuide v{{ version }}</span>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { app } from "@tauri-apps/api";
import { computed } from "vue";

import { useUserStore } from "../../store/modules/user.js";

interface TuaDcWeaponProps {
  modelValue: TGApp.Game.Avatar.WeaponDetail;
  updated: string;
  uid: number;
}

const props = defineProps<TuaDcWeaponProps>();
const userStore = useUserStore();
const version = await app.getVersion();

const propMain = computed<TGApp.Game.Avatar.PropMapItem | false>(() => {
  return userStore.getProp(props.modelValue.main_property.property_type);
});
const propSub = computed<TGApp.Game.Avatar.PropMapItem | false>(() => {
  return userStore.getProp(props.modelValue.sub_property.property_type);
});
</script>
<style lang="css" scoped>
.tua-dcw-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: 5px;
  border: 1px solid rgb(255 255 255 / 20%);
  border-radius: 5px;
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
  background: rgb(0 0 0 / 20%);
  color: var(--tgc-white-1);
  font-size: 12px;
  text-shadow: 0 0 5px rgb(0 0 0 / 50%);
}

.tua-dcw-main {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: flex-start;
  column-gap: 5px;
}

.tua-dcw-right {
  display: flex;
  width: 100%;
  height: 100%;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-end;
}

.tua-dcw-title {
  font-family: var(--font-title);
}

.tua-dcw-sub {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
}

.tua-dcw-props {
  display: flex;
  width: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.tua-prop-main {
  display: flex;
  width: 100%;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}

.tua-prop-sub {
  display: flex;
  width: 100%;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;

  img {
    width: 14px;
    height: 14px;
  }

  span:first-child {
    display: flex;
    align-items: center;
    justify-content: center;
  }
}

.tua-dcw-left {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;

  img {
    width: 36px;
    height: 36px;
    border-radius: 5px;
  }

  img:last-child {
    position: absolute;
    right: 0;
    bottom: 0;
    width: 100%;
    height: 100%;
  }
}

.tua-dcw-share {
  display: flex;
  width: 100%;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  border-top: 1px solid rgb(255 255 255 / 20%);
  margin-top: auto;
}

.tua-share-title {
  font-family: var(--font-title);
  font-size: 14px;
}

.tua-share-time {
  font-size: 10px;
  opacity: 0.8;
}

.tua-share-version {
  margin-left: auto;
  text-shadow: 0 0 5px rgb(0 0 0 / 50%);
}
</style>
