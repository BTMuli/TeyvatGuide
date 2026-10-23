<!-- 养成汇总-额外合成消耗 -->
<template>
  <UcCraftingCostList
    v-if="costs.length > 0"
    :costs
    :title="hasConversion ? '合成与转换消耗' : '合成消耗'"
  />
</template>

<script lang="ts" setup>
import UcCraftingCostList from "@comp/userCalc/uc-crafting-cost-list.vue";
import { getAdditionalCraftingCosts } from "@utils/game/cultivationPlan.js";
import { computed } from "vue";

/**
 * 养成材料合成消耗汇总属性。
 * @since Beta v0.13.0
 */
type UcCraftingSummaryProps = {
  materials: ReadonlyArray<TGApp.App.UserCalc.ResultMaterial>;
  conversionOptions?: ReadonlyArray<TGApp.App.UserCalc.ConversionOption>;
};

const { materials, conversionOptions = [] } = defineProps<UcCraftingSummaryProps>();
const costs = computed<Array<TGApp.App.UserCalc.CraftingCost>>(() =>
  getAdditionalCraftingCosts(materials, conversionOptions),
);
const hasConversion = computed<boolean>(() =>
  costs.value.some((cost) => cost.id === 104201 || cost.id === 113021),
);
</script>
