<!-- 角色筛选 -->
<template>
  <TOverlay v-model="visible">
    <div class="two-sc-container">
      <div class="two-sc-item">
        <div class="two-sc-title">星级</div>
        <v-item-group v-model="selectedStar" class="two-sc-select" multiple>
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
      <div class="two-sc-item">
        <div class="two-sc-title">武器</div>
        <v-item-group v-model="selectedWeapon" class="two-sc-select" multiple>
          <div v-for="(item, index) in selectWeaponList" :key="index">
            <v-item v-slot="{ isSelected, toggle }" :value="item">
              <v-btn :color="isSelected ? 'primary' : ''" @click="toggle">
                <img :alt="`${item}`" :src="`/icon/weapon/${item}.webp`" class="two-sci-icon" />
                <span>{{ item }}</span>
              </v-btn>
            </v-item>
          </div>
        </v-item-group>
      </div>
      <div class="two-sc-item">
        <div class="two-sc-title">元素</div>
        <v-item-group v-model="selectedElements" class="two-sc-select" multiple>
          <div v-for="(item, index) in selectElementList" :key="index">
            <v-item v-slot="{ isSelected, toggle }" :value="item">
              <v-btn :color="isSelected ? 'primary' : ''" class="element-btn" @click="toggle">
                <img
                  :alt="`${item}元素`"
                  :src="`/icon/element/${item}元素.webp`"
                  class="two-sci-icon"
                />
                <span>{{ item }}元素</span>
              </v-btn>
            </v-item>
          </div>
        </v-item-group>
      </div>
      <div class="two-sc-item">
        <div class="two-sc-title">阵营</div>
        <v-item-group v-model="selectedArea" class="two-sc-select" multiple>
          <div v-for="(item, index) in selectAreaList" :key="index">
            <v-item v-slot="{ isSelected, toggle }" :value="item">
              <v-btn :color="isSelected ? 'primary' : ''" @click="toggle">
                <v-icon>{{ isSelected ? "mdi-check" : "mdi-checkbox-blank-outline" }}</v-icon>
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

export type SelectedCValue = {
  star: Array<number>;
  weapon: Array<string>;
  elements: Array<string>;
  area: Array<string>;
};
type TwoSelectCEmits = (e: "select-c", v: SelectedCValue) => void;

const emits = defineEmits<TwoSelectCEmits>();
const selectStarList = [4, 5];
const selectWeaponList = ["单手剑", "双手剑", "弓", "法器", "长柄武器"];
const selectElementList = ["冰", "岩", "水", "火", "草", "雷", "风"];
const selectAreaList = [
  "未知",
  "蒙德",
  "璃月",
  "主角",
  "愚人众",
  "稻妻",
  "游侠",
  "须弥",
  "枫丹",
  "纳塔",
  "至冬",
  "寰宇劫灭",
  "挪德卡莱",
];

const selectedStar = ref<Array<number>>([]);
const selectedWeapon = ref<Array<string>>([]);
const selectedElements = ref<Array<string>>([]);
const selectedArea = ref<Array<string>>([]);
const oldVal = shallowRef<SelectedCValue>({
  star: selectedStar.value,
  weapon: selectedWeapon.value,
  elements: selectedElements.value,
  area: selectedArea.value,
});
const visible = defineModel<boolean>();
const resetModel = defineModel<boolean>("reset");

watch(
  () => resetModel.value,
  () => {
    if (resetModel.value) {
      if (
        isNotFilter(selectedStar.value, selectStarList) &&
        isNotFilter(selectedWeapon.value, selectWeaponList) &&
        isNotFilter(selectedElements.value, selectElementList) &&
        isNotFilter(selectedArea.value, selectAreaList)
      ) {
        showSnackbar.warn("无需重置");
        resetModel.value = false;
        return;
      }
      selectedStar.value = [];
      selectedWeapon.value = [];
      selectedElements.value = [];
      selectedArea.value = [];
      oldVal.value = {
        star: selectedStar.value,
        weapon: selectedWeapon.value,
        elements: selectedElements.value,
        area: selectedArea.value,
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
      selectedArea.value = oldVal.value.area;
      selectedElements.value = oldVal.value.elements;
    }
  },
);

function isNotFilter<T>(list: Array<T>, data: Array<T>): boolean {
  return list.length === 0 || list.length === data.length;
}

function confirmSelect() {
  const value: SelectedCValue = {
    star: selectedStar.value,
    weapon: selectedWeapon.value,
    elements: selectedElements.value,
    area: selectedArea.value,
  };
  emits("select-c", value);
  oldVal.value = value;
  visible.value = false;
}
</script>
<style lang="css" scoped>
.two-sc-container {
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

.two-sc-item {
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
  column-gap: 10px;
}

.two-sc-title {
  font-size: 20px;
  font-weight: bold;
  word-break: keep-all;
}

.two-sc-select {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.two-sci-icon {
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
