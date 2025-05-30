<template>
  <TOverlay v-model="visible">
    <div class="two-sw-container">
      <div class="two-sw-item">
        <div class="two-sw-title">星级</div>
        <v-item-group multiple mandatory v-model="selectedStar" class="two-sw-select">
          <div v-for="(item, index) in selectStarList" :key="index">
            <v-item v-slot="{ isSelected, toggle }" :value="item">
              <v-btn @click="toggle" :color="isSelected ? 'primary' : ''">
                <v-icon>{{ isSelected ? "mdi-star" : "mdi-star-outline" }}</v-icon>
                <span>{{ item }}星</span>
              </v-btn>
            </v-item>
          </div>
        </v-item-group>
      </div>
      <div class="two-sw-item">
        <div class="two-sw-title">武器</div>
        <v-item-group multiple mandatory v-model="selectedWeapon" class="two-sw-select">
          <div v-for="(item, index) in selectWeaponList" :key="index">
            <v-item v-slot="{ isSelected, toggle }" :value="item">
              <v-btn @click="toggle" :color="isSelected ? 'primary' : ''">
                <img :alt="`${item}元素`" :src="`/icon/weapon/${item}.webp`" class="two-swi-icon" />
                <span>{{ item }}</span>
              </v-btn>
            </v-item>
          </div>
        </v-item-group>
      </div>
      <div class="tow-sc-submit">
        <v-btn variant="tonal" @click="visible = false">取消</v-btn>
        <v-btn @click="confirmSelect">确定</v-btn>
      </div>
    </div>
  </TOverlay>
</template>
<script setup lang="ts">
import TOverlay from "@comp/app/t-overlay.vue";
import showSnackbar from "@comp/func/snackbar.js";
import { ref, toRaw, watch } from "vue";

export type SelectedWValue = { star: Array<number>; weapon: Array<string>; isReset: boolean };
type TwoSelectWEmits = (e: "select-w", value: SelectedWValue) => void;

const emits = defineEmits<TwoSelectWEmits>();

const selectStarList = [4, 5];
const selectWeaponList = ["单手剑", "双手剑", "弓", "法器", "长柄武器"];

const selectedStar = ref<Array<number>>(selectStarList);
const selectedWeapon = ref<Array<string>>(selectWeaponList);
const visible = defineModel<boolean>();
const resetModel = defineModel<boolean>("reset");

watch(
  () => resetModel.value,
  () => {
    if (resetModel.value) {
      if (
        toRaw(selectedStar.value) === selectStarList &&
        toRaw(selectedWeapon.value) === selectWeaponList
      ) {
        showSnackbar.warn("无需重置");
        resetModel.value = false;
        return;
      }
      selectedStar.value = selectStarList;
      selectedWeapon.value = selectWeaponList;
      resetModel.value = false;
      emits("select-w", { star: selectedStar.value, weapon: selectedWeapon.value, isReset: true });
    }
  },
);

function confirmSelect(): void {
  emits("select-w", { star: selectedStar.value, weapon: selectedWeapon.value, isReset: false });
  visible.value = false;
}
</script>
<style lang="css" scoped>
.two-sw-container {
  display: flex;
  width: 400px;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  padding: 10px;
  border-radius: 10px;
  background-color: var(--box-bg-1);
  gap: 10px;
}

.two-sw-item {
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
  column-gap: 10px;
}

.two-sw-title {
  font-size: 20px;
  font-weight: bold;
  word-break: keep-all;
}

.two-sw-select {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.two-swi-icon {
  width: 30px;
  height: 30px;
  margin-right: 5px;
}

.tow-sc-submit {
  display: flex;
  margin-left: auto;
  gap: 10px;
}
</style>
