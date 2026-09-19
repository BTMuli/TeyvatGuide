<!-- 养成汇总-合成消耗 -->
<template>
  <section v-if="costs.length > 0" class="uccs-panel">
    <header class="uccs-heading">
      <v-icon color="var(--tgc-od-green)" size="18">mdi-all-inclusive</v-icon>
      <h3>合成消耗</h3>
      <v-chip size="small" variant="tonal">{{ costs.length }} 种材料</v-chip>
    </header>
    <div class="uccs-list">
      <TMaterialStarChip
        v-for="cost in costs"
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
  </section>
</template>

<script lang="ts" setup>
import TMaterialStarChip from "@comp/app/t-material-star-chip.vue";
import { computed } from "vue";

type UcCraftingSummaryProps = {
  materials: ReadonlyArray<TGApp.App.UserCalc.ResultMaterial>;
};

const { materials } = defineProps<UcCraftingSummaryProps>();
const costs = computed<Array<TGApp.App.UserCalc.CraftingCost>>(() => {
  const merged = new Map<number, TGApp.App.UserCalc.CraftingCost>();
  for (const material of materials) {
    for (const cost of material.craftingCosts) {
      const current = merged.get(cost.id);
      if (current) {
        current.count += cost.count;
        current.owned = Math.max(current.owned, cost.owned);
      } else {
        merged.set(cost.id, { ...cost });
      }
    }
  }
  return Array.from(merged.values()).sort((a, b) => b.star - a.star || a.id - b.id);
});
</script>

<style lang="scss" scoped>
.uccs-panel {
  display: flex;
  flex-direction: column;
  padding: 12px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--box-bg-1);
  color: var(--box-text-1);
  gap: 8px;
}

.uccs-heading {
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
}

.uccs-list {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
</style>
