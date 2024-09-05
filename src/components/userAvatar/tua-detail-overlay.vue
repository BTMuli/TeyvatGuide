<template>
  <TOverlay v-model="visible" hide blur-val="5px" :to-click="onCancel">
    <div class="tdo-box">
      <div class="tdo-avatars-container">
        <v-tabs
          v-model="avatarTab"
          density="compact"
          center-active
          slider-color="var(--tgc-od-white)"
        >
          <v-tab
            v-for="avatar in avatars"
            :key="avatar.avatar.id"
            :value="avatar.avatar.id"
            @click="onAvatarClick(avatar)"
            :title="avatar.avatar.name"
          >
            <div
              class="tdo-avatar"
              :style="{
                backgroundColor:
                  props.avatar.avatar.id === avatar.avatar.id
                    ? 'var(--tgc-od-white)'
                    : 'transparent',
              }"
            >
              <img :src="avatar.avatar.side_icon" :alt="avatar.avatar.name" />
            </div>
          </v-tab>
        </v-tabs>
      </div>
      <div class="tdo-card-container">
        <div class="tdo-box-arrow left" @click="handleClick('left')">
          <img alt="left" src="../../assets/icons/arrow-right.svg" />
        </div>
        <v-window class="tdo-box-container" v-model="modeTab">
          <v-window-item value="classic">
            <TucDetailOld :model-value="avatar" />
          </v-window-item>
          <v-window-item value="card">
            <TucDetailCard :model-value="avatar" />
          </v-window-item>
          <v-window-item value="dev">
            <TuaDetailCard :model-value="avatar" />
          </v-window-item>
        </v-window>
        <div class="tdo-box-arrow right" @click="handleClick('right')">
          <img alt="right" src="../../assets/icons/arrow-right.svg" />
        </div>
      </div>
    </div>
  </TOverlay>
</template>
<script lang="ts" setup>
import { computed, ref, watch } from "vue";

import TOverlay from "../main/t-overlay.vue";
import TucDetailCard from "../userAvatarCard/tuc-detail-card.vue";
import TucDetailOld from "../userAvatarOld/tuc-detail-old.vue";

import TuaDetailCard from "./tua-detail-card.vue";

interface TuaDetailOverlayProps {
  modelValue: boolean;
  avatar: TGApp.Sqlite.Character.UserRole;
  mode: "classic" | "card" | "dev";
  avatars: TGApp.Sqlite.Character.UserRole[];
}

interface TuaDetailOverlayEmits {
  (e: "update:modelValue", val: boolean): void;

  (e: "update:mode", val: "classic" | "card" | "dev"): void;

  (e: "toNext", val: boolean): void;

  (e: "toAvatar", val: TGApp.Sqlite.Character.UserRole): void;
}

const props = defineProps<TuaDetailOverlayProps>();
const emits = defineEmits<TuaDetailOverlayEmits>();
const avatarTab = ref<number>();

const visible = computed<boolean>({
  get: () => props.modelValue,
  set: (val) => emits("update:modelValue", val),
});
const modeTab = computed<"classic" | "card" | "dev">({
  get: () => props.mode,
  set: (val) => emits("update:mode", val),
});
const avatarsWidth = computed<string>(() => {
  switch (props.mode) {
    case "classic":
      return "500px";
    case "card":
      return "800px";
    case "dev":
      return "800px";
    default:
      return "100px";
  }
});

watch(
  () => props.avatar,
  () => {
    if (props.avatar) avatarTab.value = props.avatar.cid;
  },
);

function onCancel(): void {
  visible.value = false;
}

function handleClick(pos: "left" | "right"): void {
  if (pos === "left") emits("toNext", false);
  else emits("toNext", true);
}

function onAvatarClick(avatar: TGApp.Sqlite.Character.UserRole): void {
  emits("toAvatar", avatar);
}
</script>
<style lang="css" scoped>
.tdo-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin-top: 120px;
  row-gap: 10px;
}

.tdo-avatars-container {
  position: relative;
  width: v-bind(avatarsWidth);
}

/* stylelint-disable selector-class-pattern */
.tdo-avatars-container :deep(.v-slide-group__next),
.tdo-avatars-container :deep(.v-slide-group__prev) {
  color: var(--tgc-od-white);
}

.tdo-avatar {
  position: relative;
  width: 32px;
  height: 32px;
  border: 1px solid var(--tgc-white-1);
  border-radius: 50%;
  cursor: pointer;

  img {
    position: absolute;
    top: -4px;
    left: -1px;
    width: 30px;
    object-fit: contain;
  }
}

.tdo-card-container {
  display: flex;
  align-items: center;
  justify-content: center;
  column-gap: 10px;
}

.tdo-box-arrow {
  position: relative;
  display: flex;
  width: 30px;
  height: 30px;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.dark .tdo-box-arrow {
  filter: invert(11%) sepia(73%) saturate(11%) hue-rotate(139deg) brightness(97%) contrast(81%);
}

.tdo-box-arrow.left img {
  width: 100%;
  height: 100%;
  transform: rotate(180deg);
}

.tdo-box-arrow.right img {
  width: 100%;
  height: 100%;
}

.tdo-box-container {
  position: relative;
  transition: all 1s ease-in-out;
}
</style>
