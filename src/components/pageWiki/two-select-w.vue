<!-- 武器筛选 -->
<template>
  <TOverlay v-model="visible">
    <div class="two-sw-container">
      <div class="two-sw-item">
        <div class="two-sw-title">星级</div>
        <v-item-group v-model="selectedStar" class="two-sw-select" mandatory multiple>
          <div v-for="(item, index) in selectStarList" :key="index">
            <v-item v-slot="{ isSelected, toggle }" :value="item">
              <v-btn :color="isSelected ? 'primary' : ''" @click="toggle">
                <v-icon>{{ isSelected ? "mdi-star" : "mdi-star-outline" }}</v-icon>
                <span>{{ item }}星</span>
              </v-btn>
            </v-item>
          </div>
        </v-item-group>
      </div>
      <div class="two-sw-item">
        <div class="two-sw-title">武器</div>
        <v-item-group v-model="selectedWeapon" class="two-sw-select" mandatory multiple>
          <div v-for="(item, index) in selectWeaponList" :key="index">
            <v-item v-slot="{ isSelected, toggle }" :value="item">
              <v-btn :color="isSelected ? 'primary' : ''" @click="toggle">
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
<script lang="ts" setup>
import TOverlay from "@comp/app/t-overlay.vue";
import showSnackbar from "@comp/func/snackbar.js";
import { ref, shallowRef, watch } from "vue";

export type SelectedWValue = { star: Array<number>; weapon: Array<string> };
type TwoSelectWEmits = (e: "select-w", value: SelectedWValue) => void;

const emits = defineEmits<TwoSelectWEmits>();

const selectStarList = [4, 5];
const selectWeaponList = ["单手剑", "双手剑", "弓", "法器", "长柄武器"];

const selectedStar = ref<Array<number>>([]);
const selectedWeapon = ref<Array<string>>([]);
const oldVal = shallowRef<SelectedWValue>({
  star: selectedStar.value,
  weapon: selectedWeapon.value,
});
const visible = defineModel<boolean>();
const resetModel = defineModel<boolean>("reset");

watch(
  () => resetModel.value,
  () => {
    if (resetModel.value) {
      if (
        isNotFilter(selectedStar.value, selectStarList) &&
        isNotFilter(selectedWeapon.value, selectWeaponList)
      ) {
        showSnackbar.warn("无需重置");
        resetModel.value = false;
        return;
      }
      selectedStar.value = [];
      selectedWeapon.value = [];
      oldVal.value = {
        star: selectedStar.value,
        weapon: selectedWeapon.value,
      };
      resetModel.value = false;
      showSnackbar.success("已重置");
    }
  },
);

watch(
  () => visible.value,
  () => {
    if (visible.value) {
      selectedStar.value = oldVal.value.star;
      selectedWeapon.value = oldVal.value.weapon;
    }
  },
);

function isNotFilter<T>(list: Array<T>, data: Array<T>): boolean {
  return list.length === 0 || list.length === data.length;
}

function confirmSelect(): void {
  const value: SelectedWValue = { star: selectedStar.value, weapon: selectedWeapon.value };
  emits("select-w", value);
  oldVal.value = value;
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
