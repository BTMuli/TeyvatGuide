<!-- 养成汇总-额外合成消耗 -->
<template>
  <UcMaterialCostList
    icon="mdi-all-inclusive"
    iconColor="var(--tgc-od-green)"
    :items="costs"
    quantityLabel="消耗"
    :showAvailable="false"
    :title="hasConversion ? '合成与转换消耗' : '合成消耗'"
  />
</template>

<script lang="ts" setup>
import UcMaterialCostList from "@comp/userCalc/uc-material-cost-list.vue";
import { getAdditionalCraftingCosts } from "@utils/cultivationPlan.js";
import { computed } from "vue";

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
