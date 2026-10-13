<!-- 养成材料合成消耗与需求进度 -->
<template>
  <UcCraftingCostList v-if="canCraft" :costs="material.craftingCosts">
    <template #heading>
      <div class="ucmc-progress">
        <div
          class="ucmc-track"
          role="progressbar"
          aria-label="材料准备进度"
          :aria-valuenow="ownedPercent + craftedPercent"
          :aria-valuemin="0"
          :aria-valuemax="100"
          :aria-valuetext="progressText"
          :title="progressText"
        >
          <span class="ucmc-owned-segment" :style="{ width: ownedPercent + '%' }" />
          <span class="ucmc-crafted-segment" :style="{ width: craftedPercent + '%' }" />
        </div>
        <UcMaterialCount
          :complete="material.owned + material.craftable >= material.required"
          :craftable="material.craftable"
          :current="material.owned"
          :required="material.required"
        />
      </div>
    </template>
  </UcCraftingCostList>
</template>

<script lang="ts" setup>
import UcCraftingCostList from "@comp/userCalc/uc-crafting-cost-list.vue";
import UcMaterialCount from "@comp/userCalc/uc-material-count.vue";
import fmtUtil from "@utils/fmtUtil.js";
import { computed } from "vue";

type UcMaterialCraftingProps = {
  material: TGApp.App.UserCalc.ResultMaterial;
  canCraft: boolean;
};

const { material, canCraft } = defineProps<UcMaterialCraftingProps>();
const ownedPercent = computed<number>(() =>
  material.required > 0 ? Math.min(Math.max(material.owned, 0) / material.required, 1) * 100 : 100,
);
const craftedPercent = computed<number>(() =>
  material.required > 0
    ? Math.min(
        (Math.max(material.craftable, 0) / material.required) * 100,
        100 - ownedPercent.value,
      )
    : 0,
);
const progressText = computed<string>(() =>
  [
    "已有 " + fmtUtil.num(material.owned),
    "可合成 " + fmtUtil.num(material.craftable),
    "需求 " + fmtUtil.num(material.required),
  ].join("，"),
);
</script>

<style lang="scss" scoped>
.ucmc-progress {
  display: flex;
  align-items: center;
  margin-left: auto;
  font-size: 12px;
  gap: 4px;
  line-height: 16px;
}

.ucmc-track {
  position: relative;
  display: flex;
  overflow: hidden;
  width: 240px;
  height: 4px;
  flex-shrink: 0;
  border-radius: 4px;

  &::before {
    position: absolute;
    background: var(--tgc-od-white);
    content: "";
    inset: 0;
    opacity: 0.2;
  }

  > span {
    position: relative;
  }
}

.ucmc-owned-segment {
  background: var(--tgc-od-green);
}

.ucmc-crafted-segment {
  background: var(--tgc-od-blue);
}
</style>
