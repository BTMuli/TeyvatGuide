<template>
  <TOverlay v-model="visible" blur-val="5px">
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
            @click="emits('toAvatar', avatar)"
            :title="avatar.avatar.name"
          >
            <div
              class="tdo-avatar"
              :class="{ selected: props.avatar.avatar.id === avatar.avatar.id }"
            >
              <img :src="avatar.avatar.side_icon" :alt="avatar.avatar.name" />
            </div>
          </v-tab>
        </v-tabs>
      </div>
      <div class="tdo-card-container">
        <div class="tdo-box-arrow" @click="handleClick('left')">
          <img alt="left" src="@/assets/icons/arrow-right.svg" />
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
        <div class="tdo-box-arrow" @click="handleClick('right')">
          <img alt="right" src="@/assets/icons/arrow-right.svg" />
        </div>
      </div>
    </div>
  </TOverlay>
</template>
<script lang="ts" setup>
import TOverlay from "@comp/app/t-overlay.vue";
import TucDetailCard from "@comp/userAvatarCard/tuc-detail-card.vue";
import TucDetailOld from "@comp/userAvatarOld/tuc-detail-old.vue";
import { computed, ref, watch } from "vue";

import TuaDetailCard from "./tua-detail-card.vue";

type TuaDetailOverlayProps = {
  avatar: TGApp.Sqlite.Character.UserRole;
  avatars: Array<TGApp.Sqlite.Character.UserRole>;
};
type TuaDetailOverlayEmits = {
  (e: "toNext", val: boolean): void;
  (e: "toAvatar", val: TGApp.Sqlite.Character.UserRole): void;
};

const props = defineProps<TuaDetailOverlayProps>();
const emits = defineEmits<TuaDetailOverlayEmits>();
const visible = defineModel<boolean>();
const modeTab = defineModel<"classic" | "card" | "dev">("mode");
const avatarTab = ref<number>();

const avatarsWidth = computed<string>(() => {
  switch (modeTab.value) {
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

function handleClick(pos: "left" | "right"): void {
  if (pos === "left") emits("toNext", false);
  else emits("toNext", true);
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
  width: v-bind(avatarsWidth); /* stylelint-disable-line value-keyword-case */
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
  background-color: transparent;
  cursor: pointer;

  &.selected {
    background-color: var(--tgc-od-white);
  }

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

  img {
    width: 100%;
    height: 100%;
  }

  &:first-child {
    transform: rotate(180deg);
  }
}

.dark .tdo-box-arrow {
  filter: invert(11%) sepia(73%) saturate(11%) hue-rotate(139deg) brightness(97%) contrast(81%);
}

.tdo-box-container {
  position: relative;
  transition: all 1s ease-in-out;
}
</style>
