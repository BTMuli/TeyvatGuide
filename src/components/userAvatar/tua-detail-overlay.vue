<template>
  <TOverlay v-model="visible" blur-val="5px">
    <div class="tdo-box">
      <div class="tdo-avatars-container">
        <v-tabs
          v-model="avatarTab"
          class="tdo-avatar-tabs"
          center-active
          density="compact"
          hide-slider
        >
          <v-tab
            v-for="avatar in avatars"
            :key="avatar.avatar.id"
            :title="avatar.avatar.name"
            :value="avatar.avatar.id"
            min-width="40"
            @click="emits('toAvatar', avatar)"
          >
            <div
              :class="{ selected: props.avatar.avatar.id === avatar.avatar.id }"
              class="tdo-avatar"
            >
              <img
                :alt="avatar.avatar.name"
                :src="
                  props.avatar.avatar.id === avatar.avatar.id && costume
                    ? `/WIKI/costume/${costume.id}_side.webp`
                    : avatar.avatar.side_icon
                "
              />
            </div>
          </v-tab>
        </v-tabs>
      </div>
      <div class="tdo-card-container">
        <v-btn
          aria-label="上一个角色"
          class="tdo-box-arrow"
          icon="mdi-chevron-left"
          title="上一个角色"
          variant="flat"
          @click="handleClick('left')"
        />
        <div class="tdo-box-container">
          <TuaDetailCard :avatar :costume />
        </div>
        <v-btn
          aria-label="下一个角色"
          class="tdo-box-arrow"
          icon="mdi-chevron-right"
          title="下一个角色"
          variant="flat"
          @click="handleClick('right')"
        />
      </div>
    </div>
  </TOverlay>
</template>
<script lang="ts" setup>
import TOverlay from "@comp/app/t-overlay.vue";
import { computed, ref, watch } from "vue";

import TuaDetailCard from "./tua-detail-card.vue";

import { AppCharacterData } from "@/data/index.js";

type TuaDetailOverlayProps = {
  avatar: TGApp.Sqlite.Character.TableTrans;
  avatars: Array<TGApp.Sqlite.Character.TableTrans>;
};
type TuaDetailOverlayEmits = {
  (e: "toNext", val: boolean): void;
  (e: "toAvatar", val: TGApp.Sqlite.Character.TableTrans): void;
};

const props = defineProps<TuaDetailOverlayProps>();
const emits = defineEmits<TuaDetailOverlayEmits>();
const visible = defineModel<boolean>();
const avatarTab = ref<number>();

const costume = computed<TGApp.App.Character.Costume | false>(() => getCostume());

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

function getCostume(): TGApp.App.Character.Costume | false {
  if (props.avatar.costumes.length === 0) return false;
  const findC = AppCharacterData.find((i) => i.id === props.avatar.cid);
  if (!findC) return false;
  let res: TGApp.App.Character.Costume | false = false;
  for (const costume of props.avatar.costumes) {
    const findCostume = findC.costumes.find((i) => i.id === costume.id);
    if (findCostume !== undefined && !findCostume.isDefault) return findCostume;
  }
  return res;
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
  width: 800px;
}

/* stylelint-disable selector-class-pattern */

.tdo-avatars-container :deep(.tdo-avatar-tabs .v-tab) {
  min-width: 40px;
  padding-inline: 4px;
}

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
  opacity: 0.45;
  transition: opacity 0.15s ease;

  &.selected {
    background-color: var(--tgc-od-white);
    opacity: 1;
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
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border: 1px solid var(--common-shadow-2);
  border-radius: 8px;
  background: var(--box-bg-1);
  color: var(--box-text-2);
}

.tdo-box-container {
  position: relative;
}
</style>
