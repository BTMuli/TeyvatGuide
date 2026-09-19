<!-- 养成材料合成消耗与需求进度 -->
<template>
  <section v-if="canCraft" class="ucmc-panel">
    <header class="ucmc-heading">
      <v-icon color="var(--tgc-od-green)" size="18">mdi-all-inclusive</v-icon>
      <h3>合成消耗</h3>
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
    </header>
    <div v-if="material.craftingCosts.length > 0" class="ucmc-costs">
      <TMaterialStarChip
        v-for="cost in material.craftingCosts"
        :key="cost.id"
        :id="cost.id"
        mode="convert"
        :name="cost.name"
        :owned="cost.owned"
        :required="cost.count"
        :star="cost.star"
        :type="cost.type"
      />
    </div>
    <span v-else class="ucmc-empty">当前计算未使用合成材料</span>
  </section>
</template>

<script lang="ts" setup>
import TMaterialStarChip from "@comp/app/t-material-star-chip.vue";
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
.ucmc-panel {
  display: flex;
  flex-direction: column;
  padding: 12px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--box-bg-1);
  color: var(--box-text-1);
  gap: 12px;
}

.ucmc-heading {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  color: var(--common-text-title);
  gap: 8px;

  h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    line-height: 22px;
    white-space: nowrap;
  }
}

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

.ucmc-costs {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.ucmc-empty {
  color: var(--common-text-sub);
  font-size: 12px;
  line-height: 16px;
}
</style>
