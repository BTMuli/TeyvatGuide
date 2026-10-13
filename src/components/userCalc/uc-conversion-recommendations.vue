<!-- 养成计算-余量转换推荐 -->
<template>
  <section v-if="options.length > 0" class="ucr-panel">
    <header class="ucr-header">
      <div class="ucr-heading">
        <v-icon color="var(--tgc-od-blue)" size="18">mdi-swap-horizontal</v-icon>
        <h3>{{ appliedOptions.length > 0 ? "转换方案" : "转换推荐" }}</h3>
        <span class="ucr-option-count">{{ options.length }} 项</span>
        <v-btn
          v-if="appliedOptions.length > 0"
          class="ucr-reset-btn"
          data-html2canvas-ignore="true"
          density="comfortable"
          size="small"
          variant="text"
          @click="resetSchemes"
        >
          恢复自动推荐
        </v-btn>
      </div>
      <p v-if="appliedOptions.length === 0" class="ucr-note">
        已预留计划所需材料，以下来源为可转换余量。
      </p>
    </header>

    <div class="ucr-list">
      <article
        v-for="option in options"
        :key="option.entryKey + '-' + option.recommendation.material.id"
        :class="{ 'ucr-item-adopted': option.intent !== undefined }"
        class="ucr-item"
      >
        <div class="ucr-item-title">
          <span v-if="showEntryName" class="ucr-entry-name">{{ option.entryName }}</span>
          <strong class="ucr-material-name" :title="option.recommendation.material.name">
            {{ option.recommendation.material.name }}
          </strong>
          <v-chip v-if="option.intent" color="var(--tgc-od-blue)" size="x-small" variant="tonal">
            {{ option.intent.count === 0 ? "已关闭" : "已采用" }}
          </v-chip>
          <span
            class="ucr-target-count"
            :title="option.intent ? '当前可转换数量 / 计划数量' : '可额外转换数量'"
          >
            可转 {{ fmtUtil.num(option.recommendation.count)
            }}<template v-if="option.intent"> / {{ fmtUtil.num(option.intent.count) }}</template> 个
          </span>
        </div>
        <div v-if="option.intent === undefined" aria-label="转换消耗" class="ucr-cost-list">
          <span v-if="getDisplayCosts(option).length === 0" class="ucr-note">本轮不转换</span>
          <div v-for="cost in getDisplayCosts(option)" :key="cost.id" class="ucr-cost">
            <UcItemIcon
              :alt="cost.name"
              :icon="'/icon/material/' + cost.id + '.webp'"
              :size="28"
              :star="cost.star"
            />
            <div class="ucr-cost-info">
              <span class="ucr-cost-name" :title="cost.name">{{ cost.name }}</span>
              <span class="ucr-cost-detail">
                消耗 {{ fmtUtil.num(cost.count) }} · 可用 {{ fmtUtil.num(cost.owned) }}
                <span v-if="getCostShortage(cost) > 0" class="ucr-cost-shortage">
                  · 缺 {{ fmtUtil.num(getCostShortage(cost)) }}
                </span>
              </span>
            </div>
          </div>
        </div>
        <v-btn
          :aria-label="'调整' + option.recommendation.material.name + '的转换方案'"
          class="ucr-edit-btn"
          color="var(--tgc-od-blue)"
          data-html2canvas-ignore="true"
          density="comfortable"
          prepend-icon="mdi-pencil-outline"
          size="small"
          variant="tonal"
          @click="editRecommendation(option)"
        >
          调整方案
        </v-btn>
      </article>
    </div>
    <UcConversionMaterials class="ucr-materials" :options />
  </section>
  <UcConversionEditor
    v-if="editingOption"
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
import UcConversionMaterials from "@comp/userCalc/uc-conversion-materials.vue";
import UcItemIcon from "@comp/userCalc/uc-item-icon.vue";
import fmtUtil from "@utils/fmtUtil.js";
import { computed, ref, shallowRef, watch } from "vue";

type ConversionCost = TGApp.App.UserCalc.CraftingCost;
type UcConversionRecommendationsProps = {
  options?: ReadonlyArray<TGApp.App.UserCalc.ConversionOption>;
  topOffset?: string;
  showEntryName?: boolean;
};

const {
  options = [],
  topOffset = "0px",
  showEntryName = true,
} = defineProps<UcConversionRecommendationsProps>();
const emits = defineEmits<{
  apply: [entryKey: string, intent: TGApp.App.UserCalc.ConversionIntent];
  reset: [options: ReadonlyArray<TGApp.App.UserCalc.ConversionOption>];
}>();
const editorVisible = ref<boolean>(false);
const editingOption = shallowRef<TGApp.App.UserCalc.ConversionOption>();
const appliedOptions = computed<Array<TGApp.App.UserCalc.ConversionOption>>(() =>
  options.filter((option) => option.intent !== undefined),
);

// 编辑上下文变化后关闭旧草稿，已采用设置由计划统一保存和重新计算。
watch(() => options, closeEditor, { flush: "sync" });

function closeEditor(): void {
  editorVisible.value = false;
  editingOption.value = undefined;
}

function resetSchemes(): void {
  closeEditor();
  emits("reset", appliedOptions.value);
}

function editRecommendation(option: TGApp.App.UserCalc.ConversionOption): void {
  editingOption.value = option;
  editorVisible.value = true;
}

function applyScheme(intent: TGApp.App.UserCalc.ConversionIntent): void {
  const option = editingOption.value;
  if (!option || intent.materialId !== option.recommendation.material.id) return;
  emits("apply", option.entryKey, intent);
  closeEditor();
}

function getDisplayCosts(
  option: TGApp.App.UserCalc.ConversionOption,
): ReadonlyArray<ConversionCost> {
  return option.plannedCosts ?? option.recommendation.costs;
}

function getCostShortage(cost: ConversionCost): number {
  return Math.max(cost.count - cost.owned, 0);
}
</script>

<style lang="scss" scoped>
.ucr-panel {
  display: flex;
  width: 100%;
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
  flex-direction: column;
  flex-shrink: 0;
  padding: 12px;
  border: 1px solid var(--common-shadow-2);
  border-radius: 8px;
  background: var(--box-bg-2);
  color: var(--box-text-1);
  container-type: inline-size;
  gap: 12px;
}

.ucr-panel > :deep(.ucr-materials) {
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
}

.ucr-panel > :deep(.ucr-materials .ucmcl-heading h3) {
  font-size: 14px;
  line-height: 20px;
}

.ucr-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 12px;
}

.ucr-heading {
  display: flex;
  flex: 1;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;

  h3 {
    margin: 0;
    color: var(--common-text-title);
    font-family: var(--font-title);
    font-size: 16px;
    font-weight: normal;
    line-height: 22px;
  }
}

.ucr-option-count {
  color: var(--common-text-sub);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  line-height: 16px;
}

.ucr-reset-btn {
  margin-left: auto;
}

.ucr-note {
  margin: 0;
  color: var(--common-text-sub);
  font-size: 12px;
  line-height: 16px;
}

.ucr-list {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 8px;
}

.ucr-item {
  display: grid;
  min-width: 0;
  align-items: center;
  padding: 8px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
  background: var(--box-bg-1);
  gap: 8px 16px;
  grid-template-areas: "target costs action";
  grid-template-columns: minmax(160px, max-content) minmax(0, 1fr) auto;
}

.ucr-item-adopted {
  grid-template-areas: "target action";
  grid-template-columns: minmax(0, 1fr) auto;
}

.ucr-item-title {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 8px;
  grid-area: target;

  :deep(.v-chip) {
    flex-shrink: 0;
  }
}

.ucr-entry-name {
  color: var(--common-text-sub);
  font-size: 12px;
  line-height: 16px;
}

.ucr-material-name {
  overflow: hidden;
  max-width: 100%;
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 14px;
  font-weight: normal;
  line-height: 20px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ucr-target-count {
  color: var(--tgc-od-green);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  line-height: 16px;
  white-space: nowrap;
}

.ucr-edit-btn {
  min-height: 32px;
  border-radius: 4px;
  grid-area: action;
}

.ucr-cost-list {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  gap: 4px;
  grid-area: costs;
}

.ucr-cost {
  display: flex;
  min-width: 0;
  align-items: center;
  padding: 4px 8px 4px 4px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
  background: var(--common-shadow-t-1);
  gap: 8px;
}

.ucr-cost-info {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.ucr-cost-name {
  overflow: hidden;
  color: var(--box-text-4);
  font-size: 12px;
  line-height: 16px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ucr-cost-detail {
  color: var(--common-text-sub);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  line-height: 16px;
}

.ucr-cost-shortage {
  color: var(--tgc-od-red);
}

@container (width <= 960px) {
  .ucr-item:not(.ucr-item-adopted) {
    grid-template-areas:
      "target action"
      "costs costs";
    grid-template-columns: minmax(0, 1fr) auto;
  }
}
</style>
