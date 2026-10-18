<!-- 养成材料列表-转换来源及媒介需求 -->
<template>
  <UcMaterialCostList
    :collapsible
    icon="mdi-swap-horizontal"
    iconColor="var(--tgc-od-blue)"
    :items
    title="转换材料需求"
  />
</template>

<script lang="ts" setup>
import UcMaterialCostList from "@comp/userCalc/uc-material-cost-list.vue";
import { buildConversionDemandMaterials } from "@utils/cultivationPlan.js";
import { computed } from "vue";

/**
 * 转换材料需求列表属性。
 * @since Beta v0.12.6
 */
type UcConversionMaterialsProps = {
  options?: ReadonlyArray<TGApp.App.UserCalc.ConversionOption>;
  collapsible?: boolean;
};

/**
 * 标注转换来源或媒介及缺口的材料消耗。
 * @since Beta v0.12.6
 */
type ConversionDemandCost = TGApp.App.UserCalc.CraftingCost & {
  role: string;
  missing: number;
};

const { options = [], collapsible = false } = defineProps<UcConversionMaterialsProps>();
const items = computed<Array<ConversionDemandCost>>(() =>
  buildConversionDemandMaterials(options).map((material) => ({
    id: material.id,
    name: material.name,
    type: material.type,
    star: material.star,
    count: material.required,
    owned: material.owned,
    missing: material.missing,
    role: material.id === 104201 || material.id === 113021 ? "转换媒介" : "转换来源",
  })),
);
</script>
