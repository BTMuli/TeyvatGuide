<template>
  <TOverlay v-model="visible" hide :to-click="onCancel" blur-val="20px">
    <div class="tdo-box">
      <div class="tdo-tabs-container">
        <v-tabs v-model="modeTab" class="tdo-tabs" :rounded="true">
          <v-tab value="classic">经典视图</v-tab>
          <v-tab value="card">卡片视图（简略）</v-tab>
          <v-tab value="dev">卡片视图（详细）</v-tab>
        </v-tabs>
      </div>
      <div class="tdo-container">
        <div class="tdo-box-arrow left" @click="handleClick('left')">
          <img alt="left" src="../../assets/icons/arrow-right.svg" />
        </div>
        <v-window class="tdo-box-container" v-model="modeTab">
          <v-window-item value="classic">
            <TucDetailCard :data-val="avatar" />
          </v-window-item>
          <v-window-item value="card"> </v-window-item>
          <v-window-item value="dev"> </v-window-item>
        </v-window>
        <div class="tdo-box-arrow right" @click="handleClick('right')">
          <img alt="right" src="../../assets/icons/arrow-right.svg" />
        </div>
      </div>
    </div>
  </TOverlay>
</template>
<script lang="ts" setup>
import { computed } from "vue";

import TOverlay from "../main/t-overlay.vue";
import TucDetailCard from "../userAvatarOld/tuc-detail-card.vue";

interface TuaDetailOverlayProps {
  modelValue: boolean;
  avatar: TGApp.Sqlite.Character.UserRole;
  mode: "classic" | "card" | "dev";
}

interface TuaDetailOverlayEmits {
  (e: "update:modelValue", val: boolean): void;

  (e: "update:mode", val: "classic" | "card" | "dev"): void;

  (e: "toNext", val: boolean): void;
}

const props = defineProps<TuaDetailOverlayProps>();
const emits = defineEmits<TuaDetailOverlayEmits>();

const visible = computed<boolean>({
  get: () => props.modelValue,
  set: (val) => emits("update:modelValue", val),
});
const modeTab = computed<"classic" | "card" | "dev">({
  get: () => props.mode,
  set: (val) => emits("update:mode", val),
});

function onCancel(): void {
  visible.value = false;
}

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

.tdo-tabs-container {
  background: var(--box-bg-1);
  box-shadow: 0 0 10px var(--common-shadow-2);
  color: var(--box-text-1);
}

.tdo-container {
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
}
</style>
