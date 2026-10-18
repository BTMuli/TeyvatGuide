<!-- 养成材料合成消耗与需求进度 -->
<template>
  <UcCraftingCostList
    v-if="canCraft || costs.length > 0 || matchingOptions.length > 0"
    :costs="costs"
  >
    <template #titleActions>
      <v-menu v-if="matchingOptions.length > 1" v-model="menuVisible" location="bottom end">
        <template #activator="{ props: menuProps }">
          <v-btn
            v-bind="menuProps"
            aria-label="选择要调整的转换方案"
            class="ucmc-edit-btn"
            color="var(--tgc-od-blue)"
            data-html2canvas-ignore="true"
            density="compact"
            icon="mdi-pencil-outline"
            size="x-small"
            title="选择要调整的转换方案"
            variant="text"
          />
        </template>
        <v-list class="ucmc-option-menu" density="compact">
          <v-list-item
            v-for="option in matchingOptions"
            :key="option.entryKey + '-' + option.recommendation.material.id"
            @click="editOption(option)"
          >
            <v-list-item-title>{{ option.entryName || "当前养成目标" }}</v-list-item-title>
            <v-list-item-subtitle>{{ optionCountLabel(option) }}</v-list-item-subtitle>
          </v-list-item>
        </v-list>
      </v-menu>
      <v-btn
        v-else-if="matchingOptions.length === 1"
        aria-label="调整转换方案"
        class="ucmc-edit-btn"
        color="var(--tgc-od-blue)"
        data-html2canvas-ignore="true"
        density="compact"
        icon="mdi-pencil-outline"
        size="x-small"
        title="调整转换方案"
        variant="text"
        @click="editOption(matchingOptions[0])"
      />
    </template>
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
  <UcConversionEditor
    v-if="editingOption"
    :key="editorRevision"
    v-model="editorVisible"
    :entryName="editingOption.entryName"
    :intent="editingOption.intent"
    :inventory="editingOption.inventory"
    :recommendation="editingOption.recommendation"
    :topOffset
    @save="applyScheme"
  />
</template>

<script lang="ts" setup>
import UcConversionEditor from "@comp/userCalc/uc-conversion-editor.vue";
import UcCraftingCostList from "@comp/userCalc/uc-crafting-cost-list.vue";
import UcMaterialCount from "@comp/userCalc/uc-material-count.vue";
import { getMaterialCraftingCosts } from "@utils/cultivationPlan.js";
import fmtUtil from "@utils/fmtUtil.js";
import { computed, ref, shallowRef, watch } from "vue";

import { WikiMaterialData } from "@/data/index.js";

/**
 * 材料合成与转换详情属性。
 * @since Beta v0.12.6
 */
type UcMaterialCraftingProps = {
  active?: boolean;
  material: TGApp.App.UserCalc.ResultMaterial;
  canCraft: boolean;
  conversionOptions?: ReadonlyArray<TGApp.App.UserCalc.ConversionOption>;
  topOffset?: string;
};

const {
  active = true,
  material,
  canCraft,
  conversionOptions = [],
  topOffset = "0px",
} = defineProps<UcMaterialCraftingProps>();
const emits = defineEmits<{
  applyConversion: [entryKey: string, intent: TGApp.App.UserCalc.ConversionIntent];
}>();
const editorVisible = ref<boolean>(false);
const menuVisible = ref<boolean>(false);
const editorRevision = ref<number>(0);
const editingOption = shallowRef<TGApp.App.UserCalc.ConversionOption>();
const matchingOptions = computed<Array<TGApp.App.UserCalc.ConversionOption>>(() =>
  (WikiMaterialData.find((item) => item.id === material.id)?.convert.length ?? 0) > 1
    ? conversionOptions.filter((option) => option.recommendation.material.id === material.id)
    : [],
);
const costs = computed<Array<TGApp.App.UserCalc.CraftingCost>>(() =>
  getMaterialCraftingCosts(material, conversionOptions),
);
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

watch([() => material, matchingOptions, () => active], closeEditor, { flush: "sync" });

function closeEditor(): void {
  editorVisible.value = false;
  menuVisible.value = false;
}

function editOption(option: TGApp.App.UserCalc.ConversionOption): void {
  menuVisible.value = false;
  editorRevision.value += 1;
  editingOption.value = option;
  editorVisible.value = true;
}

function applyScheme(intent: TGApp.App.UserCalc.ConversionIntent): void {
  const option = editingOption.value;
  if (!option || intent.materialId !== option.recommendation.material.id) return;
  emits("applyConversion", option.entryKey, intent);
  closeEditor();
}

function optionCountLabel(option: TGApp.App.UserCalc.ConversionOption): string {
  const available = fmtUtil.num(option.recommendation.count);
  if (option.intent) return `计划 ${fmtUtil.num(option.intent.count)} · 可转 ${available} 个`;
  return `可转 ${available} 个`;
}
</script>

<style lang="scss" scoped>
.ucmc-progress {
  display: flex;
  min-width: 0;
  max-width: 100%;
  flex: 1 1 auto;
  align-items: center;
  justify-content: flex-end;
  font-size: 12px;
  gap: 4px;
  line-height: 16px;
}

.ucmc-edit-btn {
  width: 24px;
  min-width: 24px;
  height: 24px;
  min-height: 24px;
  padding: 0;
  border-radius: 4px;
}

.ucmc-option-menu {
  min-width: 220px;
}

.ucmc-track {
  position: relative;
  display: flex;
  overflow: hidden;
  width: 240px;
  min-width: 72px;
  max-width: 100%;
  height: 4px;
  flex: 0 1 240px;
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
