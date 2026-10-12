<!-- 养成计算-转换方案调整 -->
<template>
  <Teleport to="body">
    <TopOverlay
      v-model="visible"
      contentMaxHeight="none"
      :panelMaxHeight
      panelWidth="680px"
      closeAriaLabel="关闭转换方案编辑"
      :showShare="false"
      :titleId
      :topOffset="props.topOffset"
      :zIndex="120"
    >
      <template #header>
        <div class="ucce-heading">
          <h2 :id="titleId">
            <span v-if="props.entryName">{{ props.entryName }} · </span>调整转换方案
          </h2>
          <p>保存计划用量与缺口；当前可执行部分计入养成进度</p>
        </div>
      </template>

      <div class="ucce-content">
        <section :aria-labelledby="targetTitleId" class="ucce-section">
          <div class="ucce-section-heading">
            <h3 :id="targetTitleId">转换目标</h3>
            <span>缺口 {{ fmtUtil.num(missingCount) }} 个</span>
          </div>
          <div class="ucce-target">
            <div class="ucce-target-material">
              <UcItemIcon
                :alt="targetMaterial.name"
                :icon="'/icon/material/' + targetMaterial.id + '.webp'"
                :size="36"
                :star="targetMaterial.star"
              />
              <span class="ucce-material-name" :title="targetMaterial.name">{{
                targetMaterial.name
              }}</span>
            </div>
            <div class="ucce-field">
              <div class="ucce-field-heading">
                <label :for="targetCountInputId">转换数量</label>
                <v-btn
                  :aria-label="'将转换数量设为全部缺口 ' + fmtUtil.num(missingCount) + ' 个'"
                  color="var(--tgc-od-blue)"
                  density="compact"
                  size="x-small"
                  variant="text"
                  @click="updateCount(missingCount)"
                >
                  填满缺口
                </v-btn>
              </div>
              <v-number-input
                :id="targetCountInputId"
                :aria-describedby="targetCountHintId"
                class="ucce-number-input"
                color="var(--tgc-od-blue)"
                controlVariant="split"
                density="compact"
                :errorMessages="targetCountError"
                hideDetails="auto"
                inputmode="numeric"
                :max="missingCount"
                :min="0"
                :modelValue="parseInteger(countText) ?? null"
                :precision="0"
                :step="1"
                variant="outlined"
                @update:modelValue="updateCount"
              />
              <span class="ucce-field-hint">可设 0–{{ fmtUtil.num(missingCount) }} 个</span>
            </div>
          </div>
          <p :id="targetCountHintId" class="ucce-note">
            设为 0 可关闭转换；材料不足也可保存方案，缺失数量会列入需求。
          </p>
        </section>

        <section :aria-labelledby="sourceTitleId" class="ucce-section">
          <div class="ucce-section-heading">
            <h3 :id="sourceTitleId">转换来源</h3>
            <span>数量上限按目标需求计算</span>
          </div>
          <p class="ucce-note">勾选来源并设置计划用量；可用量已预留其他养成需求。</p>
          <div v-if="sourceMaterials.length > 0" class="ucce-source-list">
            <div
              v-for="source in sourceMaterials"
              :key="source.id"
              :class="{ 'is-selected': isSourceSelected(source.id) }"
              class="ucce-source-row"
            >
              <div class="ucce-source-check">
                <v-checkbox-btn
                  :aria-label="'选择' + source.name + '作为转换来源'"
                  color="var(--tgc-od-blue)"
                  density="compact"
                  :modelValue="isSourceSelected(source.id)"
                  @update:modelValue="updateSourceSelected(source.id, $event)"
                />
              </div>
              <div class="ucce-source-identity">
                <UcItemIcon
                  :alt="source.name"
                  :icon="'/icon/material/' + source.id + '.webp'"
                  :size="32"
                  :star="source.star"
                />
                <span class="ucce-material-name" :title="source.name">{{ source.name }}</span>
              </div>
              <div class="ucce-source-limit">
                <v-number-input
                  :id="titleId + '-source-' + source.id"
                  :aria-label="source.name + '计划最多使用数量'"
                  class="ucce-number-input"
                  color="var(--tgc-od-blue)"
                  controlVariant="split"
                  density="compact"
                  :disabled="!isSourceSelected(source.id)"
                  :errorMessages="getSourceLimitError(source.id)"
                  hideDetails="auto"
                  inputmode="numeric"
                  :max="getSourceMax(source.id)"
                  :min="0"
                  :modelValue="parseInteger(getSourceLimitText(source.id)) ?? null"
                  :precision="0"
                  :step="1"
                  variant="outlined"
                  @update:modelValue="updateSourceLimit(source.id, $event)"
                />
                <div class="ucce-source-hint">
                  <span
                    >可用 {{ fmtUtil.num(getAvailableCount(source.id))
                    }}<span v-if="getSourceShortage(source.id) > 0" class="ucce-shortage">
                      · 缺 {{ fmtUtil.num(getSourceShortage(source.id)) }}</span
                    ></span
                  >
                  <v-btn
                    :aria-label="'将' + source.name + '设为需求上限'"
                    color="var(--tgc-od-blue)"
                    density="compact"
                    :disabled="!isSourceSelected(source.id)"
                    size="x-small"
                    variant="text"
                    @click="updateSourceLimit(source.id, getSourceMax(source.id))"
                    >填满</v-btn
                  >
                </div>
              </div>
            </div>
          </div>
          <p v-else class="ucce-empty">该目标没有可用的转换配方。</p>
        </section>

        <section :aria-labelledby="previewTitleId" class="ucce-section ucce-preview">
          <div class="ucce-section-heading">
            <h3 :id="previewTitleId">实时预览</h3>
            <span>来源和媒介均显示完整计划需求</span>
          </div>
          <div class="ucce-preview-summary">
            <strong class="ucce-preview-count">
              当前可转换 {{ fmtUtil.num(previewCount) }} / {{ fmtUtil.num(requestedCount) }} 个
            </strong>
            <span v-if="previewShortage > 0" class="ucce-shortage">
              仍有 {{ fmtUtil.num(previewShortage) }} 个待备齐材料
            </span>
            <span v-else-if="requestedCountValid && requestedCount === 0" class="ucce-muted">
              本轮不转换
            </span>
          </div>
          <p v-if="!requestedCountValid" class="ucce-error">请输入有效的整数数量。</p>
          <p v-else-if="!previewWithinInventory" class="ucce-error">
            预览消耗超过当前计划余量，请重新选择来源或等待库存刷新。
          </p>
          <div v-if="plannedCosts.length > 0" class="ucce-cost-list">
            <div v-for="cost in plannedCosts" :key="cost.id" class="ucce-cost">
              <UcItemIcon
                :alt="cost.name"
                :icon="'/icon/material/' + cost.id + '.webp'"
                :size="32"
                :star="cost.star"
              />
              <div class="ucce-cost-info">
                <span class="ucce-material-name" :title="cost.name">{{ cost.name }}</span>
                <span class="ucce-cost-detail">
                  需求 {{ fmtUtil.num(cost.count) }} · 可用
                  {{ fmtUtil.num(getAvailableCount(cost.id)) }}
                  <span v-if="cost.count > getAvailableCount(cost.id)" class="ucce-shortage">
                    · 缺 {{ fmtUtil.num(cost.count - getAvailableCount(cost.id)) }}
                  </span>
                  <v-chip v-if="isMediaCost(cost.id)" color="var(--tgc-od-orange)" size="x-small">
                    自动
                  </v-chip>
                </span>
              </div>
            </div>
          </div>
          <p v-else class="ucce-empty">请选择来源并填写计划用量。</p>
        </section>
      </div>

      <template #footer>
        <div class="ucce-footer">
          <v-btn variant="text" @click="cancelEdit">取消</v-btn>
          <div class="ucce-footer-actions">
            <v-btn
              data-html2canvas-ignore="true"
              prepend-icon="mdi-restore"
              variant="tonal"
              @click="restoreDraft"
            >
              重置修改
            </v-btn>
            <v-btn
              color="var(--tgc-btn-1)"
              data-html2canvas-ignore="true"
              :disabled="saveDisabled"
              prepend-icon="mdi-content-save-outline"
              variant="flat"
              @click="applyScheme"
            >
              采用方案
            </v-btn>
          </div>
        </div>
      </template>
    </TopOverlay>
  </Teleport>
</template>

<script lang="ts" setup>
import TopOverlay from "@comp/app/top-overlay.vue";
import UcItemIcon from "@comp/userCalc/uc-item-icon.vue";
import {
  calculateConversionPlan,
  calculateConversionPreview,
  getConversionSourceLimits,
  getConversionSourceMaterials,
} from "@utils/cultivationPlan.js";
import fmtUtil from "@utils/fmtUtil.js";
import { computed, ref, useId, watch } from "vue";

import { WikiMaterialData } from "@/data/index.js";

const DUST_OF_AZOTH_ID = 104201;
const DREAM_SOLVENT_ID = 113021;
const CONVERSION_MEDIA_IDS = new Set([DUST_OF_AZOTH_ID, DREAM_SOLVENT_ID]);

type UcConversionEditorProps = {
  recommendation: TGApp.App.UserCalc.ConversionRecommendation;
  inventory: ReadonlyMap<number, number>;
  intent?: TGApp.App.UserCalc.ConversionIntent;
  entryName?: string;
  topOffset?: string;
};

const props = withDefaults(defineProps<UcConversionEditorProps>(), {
  entryName: "",
  topOffset: "0px",
});
const visible = defineModel<boolean>({ required: true });
const emits = defineEmits<{
  save: [intent: TGApp.App.UserCalc.ConversionIntent];
}>();
const titleId = useId();
const targetCountHintId = useId();
const targetCountInputId = titleId + "-count";
const targetTitleId = titleId + "-target";
const sourceTitleId = titleId + "-source";
const previewTitleId = titleId + "-preview";
const countText = ref<string>("");
const selectedSourceIds = ref<Array<number>>([]);
const sourceLimitText = ref<Record<string, string>>({});

const panelMaxHeight = computed<string>(() => `calc(100dvh - ${props.topOffset} - 32px)`);
const targetMaterial = computed<TGApp.App.UserCalc.ResultMaterial>(
  () => props.recommendation.material,
);
const missingCount = computed<number>(() => normalizeCount(targetMaterial.value.missing));
const sourceMaxima = computed<ReadonlyMap<number, number>>(() =>
  getConversionSourceLimits(targetMaterial.value.id, missingCount.value, WikiMaterialData),
);
const sourceMaterials = computed<Array<TGApp.App.Material.WikiItem>>(() => {
  const candidates = getConversionSourceMaterials(
    targetMaterial.value.id,
    sourceMaxima.value,
    WikiMaterialData,
  );
  const seen = new Set<number>();
  const available: Array<TGApp.App.Material.WikiItem> = [];
  for (const source of candidates) {
    if (source.id === targetMaterial.value.id || seen.has(source.id)) continue;
    seen.add(source.id);
    available.push(source);
  }
  return available.sort(
    (a, b) =>
      Number(getAvailableCount(b.id) > 0) - Number(getAvailableCount(a.id) > 0) ||
      b.star - a.star ||
      a.id - b.id,
  );
});
const requestedCount = computed<number>(() => parseInteger(countText.value) ?? 0);
const requestedCountValid = computed<boolean>(() => {
  const value = parseInteger(countText.value);
  return value !== undefined && value >= 0 && value <= missingCount.value;
});
const targetCountError = computed<string | undefined>(() => {
  if (countText.value.trim().length === 0) return "请输入整数";
  if (!requestedCountValid.value) return "请输入 0-" + fmtUtil.num(missingCount.value) + " 的整数";
  return undefined;
});
const sourceLimits = computed<ReadonlyMap<number, number>>(() => {
  const limits = new Map<number, number>();
  for (const source of sourceMaterials.value) {
    if (!selectedSourceIds.value.includes(source.id)) continue;
    const value = parseInteger(getSourceLimitText(source.id));
    if (value === undefined) continue;
    limits.set(source.id, Math.min(Math.max(value, 0), getSourceMax(source.id)));
  }
  return limits;
});
const sourceLimitsValid = computed<boolean>(() => {
  const candidateIds = new Set(sourceMaterials.value.map((source) => source.id));
  if (selectedSourceIds.value.some((id) => !candidateIds.has(id))) return false;
  return sourceMaterials.value.every((source) => getSourceLimitError(source.id) === undefined);
});
const preview = computed<TGApp.App.UserCalc.ConversionRecommendation>(() =>
  calculateConversionPreview(
    cloneResultMaterial(targetMaterial.value),
    cloneInventory(props.inventory),
    WikiMaterialData,
    sourceLimits.value,
    requestedCount.value,
  ),
);
const previewCount = computed<number>(() => {
  if (!isValidInteger(preview.value.count)) return 0;
  return Math.min(preview.value.count, requestedCount.value, missingCount.value);
});
const previewCountValid = computed<boolean>(() => {
  const count = preview.value.count;
  return (
    isValidInteger(count) &&
    count >= 0 &&
    count <= requestedCount.value &&
    count <= missingCount.value
  );
});
const plan = computed<TGApp.App.UserCalc.ConversionRecommendation>(() =>
  calculateConversionPlan(
    targetMaterial.value,
    props.inventory,
    WikiMaterialData,
    sourceLimits.value,
    requestedCount.value,
    preview.value,
  ),
);
const plannedCosts = computed<Array<TGApp.App.UserCalc.CraftingCost>>(() =>
  plan.value.costs.filter((cost) => cost.count > 0),
);
const previewShortage = computed<number>(() =>
  requestedCountValid.value && previewCount.value < requestedCount.value
    ? requestedCount.value - previewCount.value
    : 0,
);
const previewWithinInventory = computed<boolean>(() => {
  const candidateIds = new Set(sourceMaterials.value.map((source) => source.id));
  const selectedIds = new Set(selectedSourceIds.value);
  return preview.value.costs.every((cost) => {
    if (!isValidInteger(cost.count) || cost.count < 0) return false;
    if (!isMediaCost(cost.id) && (!candidateIds.has(cost.id) || !selectedIds.has(cost.id)))
      return false;
    return cost.count <= getAvailableCount(cost.id);
  });
});
const saveDisabled = computed<boolean>(
  () =>
    !requestedCountValid.value ||
    !previewCountValid.value ||
    !previewWithinInventory.value ||
    (requestedCount.value > 0 && (!sourceLimitsValid.value || plan.value.count <= 0)),
);

watch(
  [visible, () => props.recommendation.material.id],
  ([isVisible]) => {
    if (isVisible) resetDraft();
  },
  { flush: "sync" },
);
watch(
  () => Array.from(props.inventory.entries()),
  () => {
    if (visible.value) visible.value = false;
  },
  { flush: "sync" },
);

resetDraft();

function normalizeCount(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(Math.floor(value), 0);
}

function isValidInteger(value: number): boolean {
  return Number.isFinite(value) && Number.isInteger(value) && value >= 0;
}

function parseInteger(value: string): number | undefined {
  const trimmed = value.trim();
  if (trimmed.length === 0) return undefined;
  const parsed = Number(trimmed);
  return isValidInteger(parsed) ? parsed : undefined;
}

function cloneInventory(inventory: ReadonlyMap<number, number>): Map<number, number> {
  return new Map(Array.from(inventory, ([id, count]) => <const>[id, normalizeCount(count)]));
}

function cloneResultMaterial(
  material: TGApp.App.UserCalc.ResultMaterial,
): TGApp.App.UserCalc.ResultMaterial {
  return {
    ...material,
    craftingCosts: material.craftingCosts.map((cost) => ({ ...cost })),
  };
}

function getAvailableCount(id: number): number {
  return normalizeCount(props.inventory.get(id) ?? 0);
}

function getSourceMax(id: number): number {
  return sourceMaxima.value.get(id) ?? 0;
}

function getSourceShortage(id: number): number {
  return isSourceSelected(id) ? Math.max(getSourceLimitValue(id) - getAvailableCount(id), 0) : 0;
}

function getSourceLimitText(id: number): string {
  return sourceLimitText.value[String(id)] ?? "0";
}

function getSourceLimitValue(id: number): number {
  const value = parseInteger(getSourceLimitText(id));
  return value === undefined ? 0 : Math.min(value, getSourceMax(id));
}

function getSourceLimitError(id: number): string | undefined {
  if (!isSourceSelected(id) || requestedCount.value === 0) return undefined;
  const value = parseInteger(getSourceLimitText(id));
  if (value === undefined) return "请输入整数";
  const maximum = getSourceMax(id);
  if (value > maximum) return "不能超过需求上限 " + fmtUtil.num(maximum);
  return undefined;
}

function isSourceSelected(id: number): boolean {
  return selectedSourceIds.value.includes(id);
}

function isMediaCost(id: number): boolean {
  return CONVERSION_MEDIA_IDS.has(id);
}

function updateCount(value: unknown): void {
  countText.value = value === null || value === undefined ? "" : String(value);
}

function updateSourceSelected(id: number, value: unknown): void {
  const next = new Set(selectedSourceIds.value);
  if (value === true) next.add(id);
  else next.delete(id);
  selectedSourceIds.value = Array.from(next);
}

function updateSourceLimit(id: number, value: unknown): void {
  sourceLimitText.value = {
    ...sourceLimitText.value,
    [id]: value === null || value === undefined ? "" : String(value),
  };
}

function resetDraft(): void {
  const intent = props.intent;
  const requestedCount = normalizeCount(intent?.count ?? props.recommendation.count);
  countText.value = String(Math.min(requestedCount, missingCount.value));
  const recommendationCosts = new Map<number, TGApp.App.UserCalc.CraftingCost>(
    props.recommendation.costs.map((cost) => [cost.id, cost]),
  );
  const intentSourceLimits = new Map(intent?.sourceLimits.map((limit) => [limit.id, limit.count]));
  const nextSelectedSourceIds: Array<number> = [];
  const nextSourceLimitText: Record<string, string> = {};
  for (const source of sourceMaterials.value) {
    const maximum = getSourceMax(source.id);
    if (intent) {
      const limit = intentSourceLimits.get(source.id);
      if (limit !== undefined) {
        nextSelectedSourceIds.push(source.id);
        nextSourceLimitText[String(source.id)] = String(Math.min(normalizeCount(limit), maximum));
      } else {
        nextSourceLimitText[String(source.id)] = String(maximum);
      }
    } else {
      const cost = recommendationCosts.get(source.id);
      if (cost && !isMediaCost(source.id)) {
        nextSelectedSourceIds.push(source.id);
        nextSourceLimitText[String(source.id)] = String(
          Math.min(normalizeCount(cost.count), maximum),
        );
      } else {
        nextSourceLimitText[String(source.id)] = String(maximum);
      }
    }
  }
  selectedSourceIds.value = nextSelectedSourceIds;
  sourceLimitText.value = nextSourceLimitText;
}

function restoreDraft(): void {
  resetDraft();
}

function cancelEdit(): void {
  visible.value = false;
}

function applyScheme(): void {
  if (saveDisabled.value) return;
  const intent: TGApp.App.UserCalc.ConversionIntent = {
    materialId: targetMaterial.value.id,
    count: requestedCount.value,
    sourceLimits: Array.from(sourceLimits.value, ([id, count]) => ({ id, count })),
  };
  emits("save", intent);
  visible.value = false;
}
</script>

<style lang="scss" scoped>
.ucce-heading {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 4px;

  h2 {
    margin: 0;
    color: var(--common-text-title);
    font-family: var(--font-title);
    font-size: 20px;
    font-weight: normal;
    line-height: 26px;
  }

  p {
    margin: 0;
    color: var(--box-text-2);
    font-size: 12px;
    line-height: 16px;
  }
}

.ucce-content {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 12px;
}

.ucce-section {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 8px;
}

.ucce-section-heading {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;

  h3 {
    margin: 0;
    color: var(--common-text-title);
    font-size: 16px;
    font-weight: 600;
    line-height: 22px;
  }

  > span {
    color: var(--box-text-2);
    font-size: 12px;
    line-height: 16px;
  }
}

.ucce-target {
  display: flex;
  width: fit-content;
  max-width: 100%;
  box-sizing: border-box;
  flex-wrap: wrap;
  align-items: center;
  padding: 8px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--box-bg-1);
  gap: 12px;
}

.ucce-target-material,
.ucce-source-identity {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
}

.ucce-material-name {
  overflow: hidden;
  min-width: 0;
  color: var(--box-text-4);
  font-family: var(--font-title);
  font-size: 13px;
  font-weight: normal;
  line-height: 18px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ucce-field {
  display: flex;
  width: 136px;
  min-width: 0;
  max-width: 100%;
  flex-direction: column;
  gap: 4px;
}

.ucce-field-heading {
  display: flex;
  min-height: 24px;
  align-items: center;
  justify-content: space-between;
  gap: 8px;

  > label {
    color: var(--common-text-title);
    font-size: 12px;
    font-weight: 600;
    line-height: 16px;
  }
}

.ucce-field-hint {
  color: var(--common-text-sub);
  font-size: 12px;
  line-height: 16px;
}

.ucce-number-input {
  --v-input-control-height: 32px;
  --v-input-padding-top: 0px;

  width: 136px;
  min-width: 0;
  max-width: 100%;

  :deep(.v-field) {
    --v-field-padding-bottom: 0px;

    border-radius: 4px;
    background: var(--box-bg-1);
  }

  :deep(.v-number-input__control .v-btn) {
    width: 32px;
    min-width: 32px;
    padding: 0;
  }

  :deep(.v-number-input__control .v-icon) {
    font-size: 18px;
  }

  :deep(.v-field__input) {
    padding-right: 4px;
    padding-left: 4px;
    font-size: 14px;
    font-variant-numeric: tabular-nums;
    text-align: center;
  }
}

.ucce-note {
  margin: 0;
  color: var(--box-text-2);
  font-size: 12px;
  line-height: 16px;
}

.ucce-source-list {
  display: grid;
  min-width: 0;
  gap: 8px;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr));
}

.ucce-source-row {
  display: grid;
  width: 100%;
  min-width: 0;
  max-width: 320px;
  box-sizing: border-box;
  align-items: center;
  padding: 8px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
  background: var(--box-bg-1);
  gap: 8px;
  grid-template-columns: 32px minmax(0, 1fr);

  &.is-selected {
    border-color: var(--tgc-od-blue);
    background: var(--box-bg-2);
  }
}

.ucce-source-check {
  display: flex;
  align-items: center;
  justify-content: center;
}

.ucce-source-limit {
  display: grid;
  min-width: 0;
  align-items: start;
  gap: 8px;
  grid-column: 1 / -1;
  grid-template-columns: 136px minmax(0, 1fr);
}

.ucce-source-hint {
  display: flex;
  min-height: 32px;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  color: var(--box-text-2);
  font-size: 11px;
  line-height: 16px;
}

.ucce-preview {
  padding: 8px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--box-bg-1);
}

.ucce-preview-summary {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.ucce-preview-count {
  color: var(--tgc-od-green);
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;
}

.ucce-shortage,
.ucce-error {
  color: var(--tgc-od-red);
  font-size: 12px;
  line-height: 16px;
}

.ucce-error {
  margin: 0;
}

.ucce-muted,
.ucce-empty {
  color: var(--box-text-2);
  font-size: 12px;
  line-height: 16px;
}

.ucce-empty {
  margin: 0;
}

.ucce-cost-list {
  display: grid;
  min-width: 0;
  gap: 8px;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 200px), 1fr));
}

.ucce-cost {
  display: flex;
  min-width: 0;
  align-items: center;
  padding: 4px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
  background: var(--common-shadow-t-1);
  gap: 8px;
}

.ucce-cost-info {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
}

.ucce-cost-detail {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  color: var(--box-text-2);
  font-size: 11px;
  gap: 4px;
  line-height: 16px;
}

.ucce-footer {
  display: flex;
  width: 100%;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.ucce-footer-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

@media (width <= 480px) {
  .ucce-cost-list {
    grid-template-columns: 1fr;
  }

  .ucce-footer-actions {
    width: 100%;
  }
}
</style>
