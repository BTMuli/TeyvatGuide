<!-- 养成计算-材料需求 -->
<template>
  <v-card class="ucm-result" variant="outlined">
    <v-card-title class="ucm-header">
      <div class="ucm-heading">
        <v-icon color="var(--tgc-od-orange)" size="18">mdi-clipboard-list-outline</v-icon>
        <span>材料需求</span>
      </div>
      <v-chip size="small" variant="tonal">{{ materials.length }} 种材料</v-chip>
      <v-chip
        :color="missingKinds > 0 ? 'var(--tgc-od-red)' : 'var(--tgc-od-green)'"
        size="small"
        variant="tonal"
      >
        {{ missingKinds > 0 ? `${missingKinds} 种不足` : "材料充足" }}
      </v-chip>
      <div v-if="showCraftingOptions" class="ucm-crafting-options" data-html2canvas-ignore="true">
        <div class="ucm-crafting-control">
          <v-checkbox-btn
            v-model="allowCrafting"
            color="var(--tgc-od-green)"
            density="compact"
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
          <span>使用溶媒</span>
        </div>
      </div>
    </v-card-title>

    <section v-if="loading" class="ucm-empty ucm-section">
      <v-progress-circular color="var(--tgc-od-orange)" indeterminate size="48" />
      <span>正在通过接口计算养成材料</span>
    </section>

    <template v-else-if="materials.length > 0">
      <section class="ucm-section">
        <div class="ucm-list">
          <UcMaterialReq
            v-for="(material, index) in materials"
            :key="material.id"
            :material
            :weakenReady
            @select="openMaterialInfo(material, index)"
          />
        </div>
      </section>

      <UcConversionRecommendations
        :showEntryName="false"
        :options="conversionOptions"
        :topOffset
        @apply="(entryKey, intent) => emits('applyConversion', entryKey, intent)"
        @reset="emits('resetConversions', $event)"
      />
      <UcCraftingSummary :conversionOptions :materials />
    </template>

    <section v-else class="ucm-empty ucm-section">
      <v-icon size="48">mdi-package-variant-closed-check</v-icon>
      <span>{{ emptyText }}</span>
    </section>
  </v-card>
  <UcMaterialDetail
    v-if="currentMaterial && currentWiki"
    v-model="materialOverlayVisible"
    :bag="bagMaterials.get(currentMaterial.id)"
    footerContext="养成计划"
    :idx="currentMaterialIndex + 1"
    :material="currentMaterial"
    :conversionOptions
    :total="materials.length"
    :topOffset
    :uid
    :wiki="currentWiki"
    @apply-conversion="(entryKey, intent) => emits('applyConversion', entryKey, intent)"
  >
    <template #left>
      <v-btn
        aria-label="上一个养成材料"
        class="ucm-card-arrow"
        icon="mdi-chevron-left"
        title="上一个养成材料"
        variant="flat"
        @click="switchMaterial(false)"
      />
    </template>
    <template #right>
      <v-btn
        aria-label="下一个养成材料"
        class="ucm-card-arrow"
        icon="mdi-chevron-right"
        title="下一个养成材料"
        variant="flat"
        @click="switchMaterial(true)"
      />
    </template>
  </UcMaterialDetail>
</template>
<script lang="ts" setup>
import showSnackbar from "@comp/func/snackbar.js";
import UcConversionRecommendations from "@comp/userCalc/uc-conversion-recommendations.vue";
import UcCraftingSummary from "@comp/userCalc/uc-crafting-summary.vue";
import UcMaterialDetail from "@comp/userCalc/uc-material-detail.vue";
import UcMaterialReq from "@comp/userCalc/uc-material-req.vue";
import { nextTick, ref, shallowRef, watch } from "vue";

import { WikiMaterialData } from "@/data/index.js";

/**
 * 养成材料计算结果列表属性。
 * @since Beta v0.13.0
 */
type UcMaterialResultProps = {
  bagMaterials: ReadonlyMap<number, TGApp.Sqlite.UserBag.MaterialTable>;
  materials: Array<TGApp.App.UserCalc.ResultMaterial>;
  conversionOptions?: ReadonlyArray<TGApp.App.UserCalc.ConversionOption>;
  missingKinds: number;
  uid: number;
  loading?: boolean;
  showCraftingOptions?: boolean;
  emptyText?: string;
  topOffset?: string;
  weakenReady?: boolean;
};

const props = withDefaults(defineProps<UcMaterialResultProps>(), {
  conversionOptions: () => [],
  loading: false,
  showCraftingOptions: true,
  emptyText: "请选择角色或武器，并设置培养目标",
  topOffset: "132px",
  weakenReady: false,
});
const emits = defineEmits<{
  applyConversion: [entryKey: string, intent: TGApp.App.UserCalc.ConversionIntent];
  resetConversions: [options: ReadonlyArray<TGApp.App.UserCalc.ConversionOption>];
}>();
const allowCrafting = defineModel<boolean>("allowCrafting", { required: true });
const useDust = defineModel<boolean>("useDust", { required: true });
const useSolvent = defineModel<boolean>("useSolvent", { required: true });
const materialOverlayVisible = ref<boolean>(false);
const currentMaterialIndex = ref<number>(0);
const currentMaterial = shallowRef<TGApp.App.UserCalc.ResultMaterial>();
const currentWiki = shallowRef<TGApp.App.Material.WikiItem>();

watch(
  () => props.materials,
  (materials) => {
    const currentId = currentMaterial.value?.id;
    if (currentId === undefined) return;
    const nextIndex = materials.findIndex((material) => material.id === currentId);
    const nextMaterial = materials[nextIndex];
    if (nextMaterial && nextIndex >= 0) {
      currentMaterialIndex.value = nextIndex;
      currentMaterial.value = nextMaterial;
      return;
    }
    materialOverlayVisible.value = false;
    currentMaterial.value = undefined;
    currentWiki.value = undefined;
  },
  { flush: "sync" },
);

async function openMaterialInfo(
  material: TGApp.App.UserCalc.ResultMaterial,
  index: number,
): Promise<void> {
  const wiki = WikiMaterialData.find((item) => item.id === material.id);
  if (!wiki) return;
  materialOverlayVisible.value = false;
  currentMaterialIndex.value = index;
  currentMaterial.value = material;
  currentWiki.value = wiki;
  await nextTick();
  materialOverlayVisible.value = true;
}

function switchMaterial(isNext: boolean): void {
  const nextIndex = currentMaterialIndex.value + (isNext ? 1 : -1);
  if (nextIndex < 0) {
    showSnackbar.warn("已经是第一个养成材料了");
    return;
  }
  if (nextIndex >= props.materials.length) {
    showSnackbar.warn("已经是最后一个养成材料了");
    return;
  }
  const material = props.materials[nextIndex];
  const wiki = WikiMaterialData.find((item) => item.id === material?.id);
  if (!material || !wiki) return;
  currentMaterialIndex.value = nextIndex;
  currentMaterial.value = material;
  currentWiki.value = wiki;
}
</script>
<style lang="scss" scoped>
.ucm-result {
  display: flex;
  width: 100%;
  flex-direction: column;
  flex-shrink: 0;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  margin-bottom: 8px;
  box-shadow: 0 0 8px var(--common-shadow-1);
}

.ucm-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  padding: 10px;
  border-bottom: 1px solid var(--common-shadow-1);
  gap: 8px;
}

.ucm-heading {
  display: flex;
  align-items: center;
  color: var(--box-text-4);
  font-family: var(--font-title);
  font-size: 16px;
  font-weight: normal;
  gap: 4px;
}

.ucm-section {
  padding: 8px;
  background: var(--box-bg-1);
  color: var(--box-text-1);
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
  color: var(--box-text-4);
  font-size: 13px;
  gap: 4px;
  white-space: nowrap;
}

.ucm-list {
  display: grid;
  align-content: start;
  gap: 8px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.ucm-card-arrow {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border: 1px solid var(--common-shadow-2);
  border-radius: 8px;
  background: var(--box-bg-1);
  color: var(--box-text-2);
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
  .ucm-list {
    grid-template-columns: 1fr;
  }
}
</style>
