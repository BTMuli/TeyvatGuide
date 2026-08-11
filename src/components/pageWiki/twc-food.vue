<!-- 角色料理 -->
<template>
  <div v-if="foodItems.length > 0" class="twcf-box">
    <button
      v-for="(item, index) in foodItems"
      :key="`${item.type}-${item.material.id}`"
      :aria-label="`查看${item.label}${item.material.name}详情`"
      class="twcf-item"
      :title="`查看${item.label}${item.material.name}详情`"
      type="button"
      @click="showFoodDetail(item.material, index)"
    >
      <div class="twcf-icon">
        <img :src="`/icon/bg/${item.material.star}-Star.webp`" alt="" aria-hidden="true" />
        <img :src="`/icon/material/${item.material.id}.webp`" :alt="item.material.name" />
      </div>
      <div class="twcf-info">
        <span>{{ item.label }}</span>
        <strong>{{ item.material.name }}</strong>
      </div>
      <v-icon aria-hidden="true" size="18">mdi-chevron-right</v-icon>
    </button>
  </div>
  <TwoMaterial v-if="selectedFood" v-model="showDetail" :data="selectedFood" eyebrow="角色料理">
    <template #left>
      <v-btn
        aria-label="上一道料理"
        class="card-arrow"
        icon="mdi-chevron-left"
        title="上一道料理"
        variant="flat"
        @click="switchFood(false)"
      />
    </template>
    <template #right>
      <v-btn
        aria-label="下一道料理"
        class="card-arrow"
        icon="mdi-chevron-right"
        title="下一道料理"
        variant="flat"
        @click="switchFood(true)"
      />
    </template>
  </TwoMaterial>
</template>
<script lang="ts" setup>
import showSnackbar from "@comp/func/snackbar.js";
import { computed, nextTick, ref, shallowRef, watch } from "vue";

import TwoMaterial from "./two-material.vue";

import { getWikiFoodById, getWikiFoodRecipeById, getWikiMaterialById } from "@/data/index.js";

type TwcFoodProps = { food: TGApp.App.Character.WikiFood };
type FoodItem = {
  label: string;
  material: TGApp.App.Material.WikiItem;
  type: "origin" | "special";
};

const props = defineProps<TwcFoodProps>();
const showDetail = ref<boolean>(false);
const selectedIndex = ref<number>(0);
const selectedFood = shallowRef<TGApp.App.Material.WikiItem>();
const foodItems = computed<Array<FoodItem>>(() => {
  const recipe = getWikiFoodRecipeById(props.food.recipeId);
  if (recipe === undefined) {
    console.warn(`角色料理配方组 ${props.food.recipeId} 未找到`);
    return [];
  }
  const origin = resolveFoodItem(recipe.variants.normal, "原料理", "origin");
  const special = recipe.variants.special.find((item) => item.foodId === props.food.special.id);
  if (
    origin === undefined ||
    origin.material.id !== props.food.origin.id ||
    special === undefined
  ) {
    console.warn(`角色料理配方组 ${props.food.recipeId} 与原料理或特色料理不匹配`);
    return [];
  }
  const specialItem = resolveFoodItem(special.foodId, "特色料理", "special");
  if (specialItem === undefined || specialItem.material.id !== props.food.special.id) {
    console.warn(`角色特色料理 ${props.food.special.id} 未找到有效材料或料理数据`);
    return [];
  }
  return [origin, specialItem];
});

watch(
  () => props.food,
  () => {
    showDetail.value = false;
    selectedIndex.value = 0;
    selectedFood.value = undefined;
  },
);

function showFoodDetail(material: TGApp.App.Material.WikiItem, index: number): void {
  const shouldOpen = !showDetail.value;
  selectedIndex.value = index;
  selectedFood.value = material;
  if (shouldOpen) {
    void nextTick(() => {
      if (selectedFood.value?.id === material.id) showDetail.value = true;
    });
  }
}

function switchFood(isNext: boolean): void {
  const nextIndex = selectedIndex.value + (isNext ? 1 : -1);
  if (nextIndex < 0 || nextIndex >= foodItems.value.length) {
    showSnackbar.warn(isNext ? "已经是最后一道料理了" : "已经是第一道料理了");
    return;
  }
  const nextFood = foodItems.value[nextIndex];
  if (nextFood === undefined) return;
  showFoodDetail(nextFood.material, nextIndex);
}

function resolveFoodItem(
  foodId: number | undefined,
  label: string,
  type: FoodItem["type"],
): FoodItem | undefined {
  if (foodId === undefined || getWikiFoodById(foodId) === undefined) return undefined;
  const material = getWikiMaterialById(foodId);
  return material === undefined ? undefined : { label, material, type };
}
</script>
<style lang="scss" scoped>
.twcf-box {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
}

.card-arrow {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border: 1px solid var(--common-shadow-2);
  border-radius: 8px;
  background: var(--box-bg-1);
  color: var(--box-text-2);
}

.twcf-item {
  display: flex;
  min-width: 0;
  align-items: center;
  padding: 8px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--box-bg-2);
  color: var(--box-text-2);
  column-gap: 8px;
  cursor: pointer;
  text-align: left;

  &:hover {
    background: var(--box-bg-3);
  }

  &:focus-visible {
    outline: 2px solid var(--tgc-yellow-1);
    outline-offset: 2px;
  }
}

.twcf-icon {
  position: relative;
  display: flex;
  width: 48px;
  height: 48px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;

  img:first-child {
    position: absolute;
    width: 48px;
    height: 48px;
    border-radius: 4px;
  }

  img:last-child {
    position: relative;
    width: 40px;
    height: 40px;
    object-fit: contain;
  }
}

.twcf-info {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 2px;

  span {
    color: var(--box-text-4);
    font-size: 12px;
    line-height: 16px;
  }

  strong {
    overflow: hidden;
    color: var(--common-text-title);
    font-size: 14px;
    line-height: 20px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
</style>
