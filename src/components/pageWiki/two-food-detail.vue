<!-- 料理详情 -->
<template>
  <section v-if="props.food.effect.length > 0 || foodKindLabel" class="twfd-panel">
    <header class="twfd-panel-title">
      <v-icon size="18">mdi-creation</v-icon>
      <h3>料理效果</h3>
      <span v-if="foodKindLabel" class="twfd-kind" :data-kind="props.food.kind">
        <v-icon size="14">mdi-silverware-fork-knife</v-icon>
        {{ foodKindLabel }}
      </span>
    </header>
    <div v-if="props.food.effect.length > 0" class="twfd-effect" v-html="effectHtml" />
  </section>
  <section v-if="variantItems.length > 1" class="twfd-panel">
    <header class="twfd-panel-title">
      <v-icon size="18">mdi-format-list-bulleted-square</v-icon>
      <h3>料理品质</h3>
      <span>{{ variantItems.length }} 种</span>
    </header>
    <div class="twfd-variants" aria-label="料理品质变体">
      <button
        v-for="item in variantItems"
        :key="item.foodId"
        :aria-pressed="item.foodId === props.food.id"
        class="twfd-variant"
        :class="{ active: item.foodId === props.food.id }"
        :data-kind="item.kind"
        type="button"
        @click="emit('selectFood', item.foodId)"
      >
        <img
          :src="`/icon/material/${item.foodId}.webp`"
          :alt="item.name"
          class="twfd-variant-icon"
        />
        <span class="twfd-variant-label">{{ item.label }}</span>
        <span class="twfd-variant-name">{{ item.name }}</span>
        <img
          v-if="item.characterId !== undefined"
          :src="`/WIKI/character/${item.characterId}.webp`"
          :alt="`特色料理角色 ${item.characterId}`"
          class="twfd-variant-character"
        />
        <span class="twfd-variant-id">ID {{ item.foodId }}</span>
      </button>
    </div>
  </section>
  <section v-if="props.recipe && props.recipe.input.length > 0" class="twfd-panel">
    <header class="twfd-panel-title">
      <v-icon size="18">mdi-food-outline</v-icon>
      <h3>所需食材</h3>
      <span>{{ props.recipe.input.length }} 项</span>
    </header>
    <div :class="{ 'twfd-inputs-three': props.recipe.input.length === 3 }" class="twfd-inputs">
      <div v-for="item in props.recipe.input" :key="item.id" class="twfd-input">
        <img :src="`/icon/material/${item.id}.webp`" :alt="item.name" />
        <span>{{ item.name }}</span>
        <strong>×{{ item.count }}</strong>
      </div>
    </div>
  </section>
</template>
<script lang="ts" setup>
import { parseHtmlText } from "@utils/toolFunc.js";
import { computed } from "vue";

import { getWikiFoodById, getWikiMaterialById } from "@/data/index.js";

type TwoFoodDetailProps = {
  food: TGApp.App.Material.WikiFood;
  recipe?: TGApp.App.Material.WikiFoodRecipe;
};
type FoodVariant = {
  characterId?: number;
  foodId: number;
  kind: TGApp.App.Material.WikiFoodKind;
  label: string;
  name: string;
};

const props = defineProps<TwoFoodDetailProps>();
const emit = defineEmits<{ selectFood: [foodId: number] }>();
const effectHtml = computed<string>(() => parseHtmlText(props.food.effect.join("\n")));
const foodKindLabel = computed<string | undefined>(() => {
  const labels: Partial<Record<TGApp.App.Material.WikiFoodKind, string>> = {
    delicious: "美味",
    normal: "普通",
    special: "特色",
    strange: "奇怪",
  };
  return props.food.kind === undefined ? undefined : labels[props.food.kind];
});
const variantItems = computed<Array<FoodVariant>>(() => {
  const recipe = props.recipe;
  if (recipe === undefined) return [];
  const variants: Array<FoodVariant> = [];
  const basicVariants: Array<{
    foodId: number | undefined;
    kind: TGApp.App.Material.WikiFoodKind;
    label: string;
  }> = [
    { foodId: recipe.variants.strange, kind: "strange", label: "奇怪" },
    { foodId: recipe.variants.normal, kind: "normal", label: "普通" },
    { foodId: recipe.variants.delicious, kind: "delicious", label: "美味" },
  ];
  for (const item of basicVariants) {
    appendVariant(variants, item.foodId, item.label, undefined, item.kind);
  }
  for (const item of recipe.variants.special) {
    appendVariant(variants, item.foodId, "特色", item.characterId, "special");
  }
  return variants;
});

function appendVariant(
  variants: Array<FoodVariant>,
  foodId: number | undefined,
  label: string,
  characterId?: number,
  kind: TGApp.App.Material.WikiFoodKind = "special",
): void {
  if (foodId === undefined || getWikiFoodById(foodId) === undefined) return;
  const material = getWikiMaterialById(foodId);
  if (material === undefined) return;
  variants.push({ characterId, foodId, kind, label, name: material.name });
}
</script>
<style lang="scss" scoped>
.twfd-kind {
  display: inline-flex;
  width: fit-content;
  align-items: center;
  padding: 2px 6px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
  background: var(--box-bg-2);
  color: var(--box-text-2);
  column-gap: 4px;
  font-size: 11px;
  line-height: 14px;

  &[data-kind="strange"] {
    border-color: var(--common-shadow-2);
  }

  &[data-kind="normal"] {
    color: var(--tgc-od-blue);
  }

  &[data-kind="delicious"] {
    color: var(--tgc-yellow-1);
  }

  &[data-kind="special"] {
    color: var(--tgc-od-purple);
  }
}

.twfd-panel {
  display: flex;
  flex-direction: column;
  padding: 12px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--box-bg-1);
  gap: 8px;
}

.twfd-panel-title {
  display: flex;
  align-items: center;
  color: var(--common-text-title);
  gap: 8px;

  h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    line-height: 22px;
  }

  > span {
    margin-left: auto;
    color: var(--box-text-4);
    font-size: 12px;
    line-height: 16px;
  }

  .twfd-kind {
    margin-left: 0;
    color: var(--box-text-2);
    font-size: 11px;
    font-weight: normal;
  }
}

.twfd-effect {
  color: var(--box-text-2);
  font-size: 14px;
  line-height: 20px;
  white-space: pre-wrap;
  word-break: break-all;
}

.twfd-variants {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.twfd-variant {
  position: relative;
  z-index: 0;
  display: flex;
  overflow: hidden;
  min-width: 0;
  align-items: center;
  padding: 8px 44px 8px 8px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--box-bg-2);
  color: var(--box-text-2);
  column-gap: 8px;
  cursor: pointer;
  text-align: left;

  &:hover,
  &.active {
    border-color: var(--tgc-yellow-1);
    background: var(--box-bg-3);
  }

  &:focus-visible {
    outline: 2px solid var(--tgc-yellow-1);
    outline-offset: 2px;
  }

  .twfd-variant-icon {
    width: 36px;
    height: 36px;
    flex-shrink: 0;
    object-fit: contain;
  }
}

.twfd-variant-label,
.twfd-variant-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.twfd-variant-label {
  position: absolute;
  top: 0;
  right: 0;
  max-width: calc(100% - 8px);
  padding: 1px 5px;
  border: 1px solid var(--common-shadow-1);
  border-top: 0;
  border-right: 0;
  background: var(--box-bg-3);
  border-bottom-left-radius: 8px;
  border-top-right-radius: 8px;
  color: var(--box-text-4);
  font-size: 10px;
  font-weight: 600;
  line-height: 14px;
}

.twfd-variant[data-kind="strange"] .twfd-variant-label {
  border-color: var(--common-shadow-2);
  color: var(--box-text-2);
}

.twfd-variant[data-kind="normal"] .twfd-variant-label {
  border-color: var(--tgc-od-blue);
  color: var(--tgc-od-blue);
}

.twfd-variant[data-kind="delicious"] .twfd-variant-label {
  border-color: var(--tgc-yellow-1);
  color: var(--tgc-yellow-1);
}

.twfd-variant[data-kind="special"] .twfd-variant-label {
  border-color: var(--tgc-od-purple);
  color: var(--tgc-od-purple);
}

.twfd-variant-name {
  min-width: 0;
  color: var(--common-text-title);
  font-size: 13px;
  line-height: 18px;
}

.twfd-variant-character {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  border: 1px solid var(--common-shadow-1);
  border-radius: 6px;
  background: var(--box-bg-3);
  object-fit: cover;
}

.twfd-variant-id {
  position: absolute;
  z-index: 0;
  right: 4px;
  bottom: -1px;
  color: var(--tgc-od-white);
  font-size: 9px;
  line-height: 12px;
}

.twfd-inputs {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.twfd-inputs-three {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.twfd-input {
  display: flex;
  min-width: 0;
  align-items: center;
  padding: 8px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--box-bg-2);
  color: var(--box-text-2);
  column-gap: 8px;

  img {
    width: 40px;
    height: 40px;
    flex-shrink: 0;
    object-fit: contain;
  }

  span {
    overflow: hidden;
    flex: 1;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  strong {
    color: var(--common-text-title);
    font-size: 14px;
    line-height: 20px;
  }
}
</style>
