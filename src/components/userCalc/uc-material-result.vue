<!-- 养成计算-材料需求 -->
<template>
  <div class="ucm-result">
    <div class="ucm-header">
      <span class="ucm-heading">材料需求</span>
      <v-chip size="small" variant="tonal">{{ materials.length }} 种材料</v-chip>
      <v-chip
        :color="missingKinds > 0 ? 'var(--tgc-od-red)' : 'var(--tgc-od-green)'"
        size="small"
        variant="tonal"
      >
        {{ missingKinds > 0 ? `${missingKinds} 种不足` : "材料充足" }}
      </v-chip>
      <div v-if="showCraftingOptions" class="ucm-crafting-options">
        <div class="ucm-crafting-control">
          <v-switch
            v-model="allowCrafting"
            class="ucm-crafting-switch"
            color="var(--tgc-od-green)"
            density="compact"
            hide-details
            title="允许使用背包材料按 Wiki 配方合成"
          />
          <span>允许合成</span>
        </div>
        <div class="ucm-crafting-control">
          <v-checkbox-btn
            v-model="useDust"
            :disabled="!allowCrafting"
            color="var(--tgc-od-green)"
            density="compact"
            title="允许使用含嬗变之尘的转换配方"
          />
          <span>使用嬗变之尘</span>
        </div>
        <div class="ucm-crafting-control">
          <v-checkbox-btn
            v-model="useSolvent"
            :disabled="!allowCrafting"
            color="var(--tgc-od-green)"
            density="compact"
            title="允许使用含异梦溶媒的转换配方"
          />
          <span>使用异梦溶媒</span>
        </div>
      </div>
    </div>

    <div v-if="loading" class="ucm-empty">
      <v-progress-circular color="var(--tgc-od-orange)" indeterminate size="48" />
      <span>正在通过接口计算养成材料</span>
    </div>

    <template v-else-if="materials.length > 0">
      <div class="ucm-list">
        <UcMaterialItem
          v-for="material in materials"
          :key="material.id"
          :material="material"
          :weaken-ready
          @select="openMaterialInfo(material)"
        />
      </div>

      <div v-if="allowCrafting && craftingCosts.length > 0" class="ucm-cost-summary">
        <div class="ucm-cost-header">
          <v-icon color="var(--tgc-od-green)" size="18">mdi-all-inclusive</v-icon>
          <span>合成消耗</span>
          <v-chip size="small" variant="tonal">{{ craftingCosts.length }} 种材料</v-chip>
        </div>
        <div class="ucm-cost-list">
          <PboConvertMaterial v-for="cost in craftingCosts" :key="cost.id" :material="cost" />
        </div>
      </div>
    </template>

    <div v-else class="ucm-empty">
      <v-icon size="48">mdi-package-variant-closed-check</v-icon>
      <span>{{ emptyText }}</span>
    </div>
  </div>
  <UcMaterialDetail
    v-if="currentMaterial && currentWiki"
    v-model="materialOverlayVisible"
    :bag="bagMaterials.get(currentMaterial.id)"
    :material="currentMaterial"
    :uid
    :wiki="currentWiki"
  />
</template>

<script lang="ts" setup>
import PboConvertMaterial from "@comp/pageBag/pbo-convert-material.vue";
import type { PboConvertSource } from "@comp/pageBag/pbo-convert.vue";
import UcMaterialDetail from "@comp/userCalc/uc-material-detail.vue";
import UcMaterialItem from "@comp/userCalc/uc-material-item.vue";
import { computed, nextTick, ref, shallowRef } from "vue";

import { WikiMaterialData } from "@/data/index.js";

type UcMaterialResultProps = {
  bagMaterials: ReadonlyMap<number, TGApp.Sqlite.UserBag.MaterialTable>;
  materials: Array<TGApp.App.UserCalc.ResultMaterial>;
  missingKinds: number;
  uid: number;
  loading?: boolean;
  showCraftingOptions?: boolean;
  emptyText?: string;
  weakenReady?: boolean;
};

const props = withDefaults(defineProps<UcMaterialResultProps>(), {
  loading: false,
  showCraftingOptions: true,
  emptyText: "请选择角色或武器，并设置培养目标",
  weakenReady: false,
});
const allowCrafting = defineModel<boolean>("allowCrafting", { required: true });
const useDust = defineModel<boolean>("useDust", { required: true });
const useSolvent = defineModel<boolean>("useSolvent", { required: true });
const materialOverlayVisible = ref<boolean>(false);
const currentMaterial = shallowRef<TGApp.App.UserCalc.ResultMaterial>();
const currentWiki = shallowRef<TGApp.App.Material.WikiItem>();
const craftingCosts = computed<Array<PboConvertSource>>(() => {
  const costs = new Map<number, TGApp.App.UserCalc.CraftingCost>();
  for (const material of props.materials) {
    for (const cost of material.craftingCosts) {
      const current = costs.get(cost.id);
      if (current) current.count += cost.count;
      else costs.set(cost.id, { ...cost });
    }
  }
  return Array.from(costs.values())
    .sort((a, b) => b.star - a.star || a.id - b.id)
    .map((cost) => ({
      id: String(cost.id),
      name: cost.name,
      type: cost.type,
      star: cost.star,
      count: cost.count,
      local: cost.owned,
    }));
});

async function openMaterialInfo(material: TGApp.App.UserCalc.ResultMaterial): Promise<void> {
  const wiki = WikiMaterialData.find((item) => item.id === material.id);
  if (!wiki) return;
  materialOverlayVisible.value = false;
  currentMaterial.value = material;
  currentWiki.value = wiki;
  await nextTick();
  materialOverlayVisible.value = true;
}
</script>

<style lang="scss" scoped>
.ucm-result {
  width: 100%;
  padding: 12px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--box-bg-1);
  box-shadow: 0 4px 8px var(--common-shadow-1);
}

.ucm-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  margin-bottom: 8px;
  gap: 8px;
}

.ucm-heading {
  font-family: var(--font-title);
  font-size: 16px;
  font-weight: 400;
}

.ucm-crafting-options {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  margin-left: auto;
  gap: 4px 12px;
}

.ucm-crafting-control {
  display: flex;
  align-items: center;
  color: var(--common-text-sub);
  font-size: 13px;
  gap: 4px;
  white-space: nowrap;
}

.ucm-crafting-switch {
  width: 36px;
  flex: 0 0 36px;
  margin: 0;
  transform: scale(0.75);
  transform-origin: center;
}

.ucm-list {
  display: grid;
  align-items: stretch;
  gap: 8px;
  grid-template-columns: repeat(auto-fill, minmax(252px, 1fr));
}

.ucm-cost-summary {
  display: flex;
  flex-direction: column;
  padding-top: 12px;
  border-top: 1px solid var(--common-shadow-1);
  margin-top: 12px;
  gap: 8px;
}

.ucm-cost-header {
  display: flex;
  align-items: center;
  font-family: var(--font-title);
  gap: 6px;
}

.ucm-cost-list {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
}

.ucm-empty {
  display: flex;
  min-height: 144px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--common-text-sub);
  gap: 8px;
}

@media (width <= 600px) {
  .ucm-result {
    padding: 8px;
  }

  .ucm-list {
    grid-template-columns: 1fr;
  }
}
</style>
