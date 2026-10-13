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
          <div v-if="showEntryName" class="ucr-entry">
            <slot name="entry" :option>
              <span class="ucr-entry-name">{{ option.entryName }}</span>
            </slot>
          </div>
          <div class="ucr-material-info">
            <strong class="ucr-material-name" :title="option.recommendation.material.name">
              {{ option.recommendation.material.name }}
            </strong>
            <div class="ucr-material-meta">
              <span
                class="ucr-target-count"
                :title="option.intent ? '当前可转换数量 / 计划数量' : '可额外转换数量'"
              >
                可转 {{ fmtUtil.num(option.recommendation.count)
                }}<template v-if="option.intent">
                  / {{ fmtUtil.num(option.intent.count) }}</template
                >
                个
              </span>
              <v-chip
                v-if="option.intent"
                color="var(--tgc-od-blue)"
                size="x-small"
                variant="tonal"
              >
                {{ option.intent.count === 0 ? "已关闭" : "已采用" }}
              </v-chip>
              <v-btn
                :aria-label="'调整' + option.recommendation.material.name + '的转换方案'"
                class="ucr-edit-btn"
                color="var(--tgc-od-blue)"
                data-html2canvas-ignore="true"
                icon="mdi-pencil-outline"
                size="small"
                title="调整转换方案"
                variant="text"
                @click="editRecommendation(option)"
              />
            </div>
          </div>
        </div>
        <div v-if="option.intent === undefined" aria-label="转换消耗" class="ucr-cost-list">
          <span v-if="getDisplayCosts(option).length === 0" class="ucr-note">本轮不转换</span>
          <UcMaterialReq
            v-for="cost in getDisplayCosts(option)"
            :key="cost.id"
            description="转换消耗"
            :interactive="false"
            :material="getDisplayMaterial(cost)"
          />
        </div>
      </article>
    </div>
    <UcConversionMaterials class="ucr-materials" :options />
  </section>
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
import UcConversionMaterials from "@comp/userCalc/uc-conversion-materials.vue";
import UcMaterialReq from "@comp/userCalc/uc-material-req.vue";
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
defineSlots<{
  entry?: (props: { option: TGApp.App.UserCalc.ConversionOption }) => unknown;
}>();
const editorVisible = ref<boolean>(false);
const editorRevision = ref<number>(0);
const editingOption = shallowRef<TGApp.App.UserCalc.ConversionOption>();
const appliedOptions = computed<Array<TGApp.App.UserCalc.ConversionOption>>(() =>
  options.filter((option) => option.intent !== undefined),
);

// 编辑上下文变化后关闭旧草稿，已采用设置由计划统一保存和重新计算。
watch(() => options, closeEditor, { flush: "sync" });

function closeEditor(): void {
  editorVisible.value = false;
}

function resetSchemes(): void {
  closeEditor();
  emits("reset", appliedOptions.value);
}

function editRecommendation(option: TGApp.App.UserCalc.ConversionOption): void {
  editorRevision.value += 1;
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

function getDisplayMaterial(cost: ConversionCost): TGApp.App.UserCalc.ResultMaterial {
  const required = cost.count;
  const owned = cost.owned;
  const missing = getCostShortage(cost);
  return {
    id: cost.id,
    name: cost.name,
    type: cost.type,
    star: cost.star,
    required,
    owned,
    craftable: 0,
    craftingCosts: [],
    missing,
    progress: required === 0 ? 100 : Math.min(Math.max((owned / required) * 100, 0), 100),
  };
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
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--box-bg-1);
  color: var(--box-text-1);
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
  background: var(--common-shadow-t-1);
  gap: 8px 16px;
  grid-template-areas:
    "target"
    "costs";
  grid-template-columns: minmax(0, 1fr);
}

.ucr-item-adopted {
  grid-template-areas: "target";
  grid-template-columns: minmax(0, 1fr);
}

.ucr-item-title {
  display: flex;
  min-width: 0;
  min-height: 48px;
  align-items: stretch;
  gap: 8px;
  grid-area: target;
}

.ucr-entry {
  display: flex;
  min-width: 0;
  flex-shrink: 0;
  align-items: center;
}

.ucr-entry-name {
  color: var(--common-text-sub);
  font-size: 12px;
  line-height: 16px;
}

.ucr-material-info {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  justify-content: space-between;
  gap: 4px;
}

.ucr-material-name {
  overflow: hidden;
  min-width: 0;
  max-width: 100%;
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 14px;
  font-weight: normal;
  line-height: 20px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ucr-material-meta {
  display: flex;
  min-width: 0;
  min-height: 24px;
  align-items: center;
  gap: 4px;

  :deep(.v-chip) {
    flex-shrink: 0;
  }
}

.ucr-target-count {
  color: var(--tgc-od-green);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  line-height: 16px;
  white-space: nowrap;
}

.ucr-edit-btn {
  width: 24px;
  min-width: 24px;
  height: 24px;
  min-height: 24px;
  padding: 0;
  border-radius: 4px;
  margin-left: auto;
}

.ucr-cost-list {
  display: grid;
  min-width: 0;
  gap: 8px;
  grid-area: costs;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 200px), 1fr));
}
</style>
