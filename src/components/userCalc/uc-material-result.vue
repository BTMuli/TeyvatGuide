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
    </div>

    <div v-if="materials.length > 0" class="ucm-list">
      <UcMaterialItem v-for="material in materials" :key="material.id" :material="material" />
    </div>

    <div v-else class="ucm-empty">
      <v-icon size="48">mdi-package-variant-closed-check</v-icon>
      <span>请选择角色或武器，并设置培养目标</span>
    </div>
  </div>
</template>

<script lang="ts" setup>
import UcMaterialItem from "@comp/userCalc/uc-material-item.vue";
import type { UserCalcResultMaterial } from "@comp/userCalc/uc-types.js";

type UcMaterialResultProps = {
  materials: Array<UserCalcResultMaterial>;
  missingKinds: number;
};

defineProps<UcMaterialResultProps>();
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

.ucm-list {
  display: grid;
  align-items: stretch;
  gap: 8px;
  grid-template-columns: repeat(auto-fill, minmax(252px, 1fr));
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
