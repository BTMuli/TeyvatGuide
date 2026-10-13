<!-- 养成材料合成消耗列表 -->
<template>
  <section class="ucccl-panel">
    <header class="ucccl-heading">
      <v-icon color="var(--tgc-od-green)" size="18">mdi-all-inclusive</v-icon>
      <div class="ucccl-title">
        <h3>{{ title }}</h3>
        <slot name="titleActions" />
      </div>
      <slot name="heading">
        <span>{{ costs.length }} 种</span>
      </slot>
    </header>
    <div v-if="costs.length > 0" class="ucccl-costs">
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
    <span v-else class="ucccl-empty">当前计算未使用合成材料</span>
  </section>
</template>

<script lang="ts" setup>
import TMaterialStarChip from "@comp/app/t-material-star-chip.vue";

type UcCraftingCostListProps = {
  costs: ReadonlyArray<TGApp.App.UserCalc.CraftingCost>;
  title?: string;
};

const { costs, title = "合成消耗" } = defineProps<UcCraftingCostListProps>();

defineSlots<{
  titleActions?: () => unknown;
  heading?: () => unknown;
}>();
</script>

<style lang="scss" scoped>
.ucccl-panel {
  display: flex;
  flex-direction: column;
  padding: 12px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--box-bg-1);
  color: var(--box-text-1);
  gap: 12px;
}

.ucccl-heading {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  color: var(--common-text-title);
  gap: 8px;

  .ucccl-title {
    display: inline-flex;
    min-width: 0;
    align-items: center;
    gap: 4px;
  }

  h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    line-height: 22px;
    white-space: nowrap;
  }

  > span {
    color: var(--common-text-sub);
    font-size: 12px;
    font-variant-numeric: tabular-nums;
    line-height: 16px;
  }
}

.ucccl-costs {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 200px), 1fr));
}

.ucccl-empty {
  color: var(--common-text-sub);
  font-size: 12px;
  line-height: 16px;
}
</style>
