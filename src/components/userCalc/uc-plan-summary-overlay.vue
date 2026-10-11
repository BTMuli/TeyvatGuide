<!-- 养成计划-计划汇总浮窗 -->
<template>
  <TopOverlay
    ref="overlayPanel"
    v-model="visible"
    :shareCaption="shareCaption"
    titleId="cultivation-summary-title"
    topOffset="132px"
  >
    <template #header>
      <div class="ucps-heading-icon">
        <v-icon size="36">mdi-clipboard-text-outline</v-icon>
      </div>
      <div class="ucps-identity">
        <h2 id="cultivation-summary-title">{{ project.name }}</h2>
        <div class="ucps-meta">
          <span class="ucps-meta-tag">养成计划汇总</span>
          <span class="ucps-meta-tag ucps-meta-tag--muted">{{ inventoryUpdatedLabel }}</span>
        </div>
      </div>
    </template>

    <template #actions>
      <v-btn
        :loading="shareLoading"
        aria-label="保存养成计划汇总分享图"
        density="comfortable"
        icon="mdi-share-variant"
        title="保存养成计划汇总分享图"
        variant="text"
        @click="shareSummary"
      />
      <v-btn
        aria-label="关闭计划汇总"
        density="comfortable"
        icon="mdi-close"
        title="关闭"
        variant="text"
        @click="visible = false"
      />
    </template>

    <section class="ucps-overview">
      <div class="ucps-progress-copy">
        <div>
          <span class="ucps-overview-label">计划进度</span>
          <strong>{{ planStateLabel }}</strong>
        </div>
        <span>
          {{ readyMaterialCount }} / {{ materials.length }} 种材料就绪 ·
          {{ materialProgress.toFixed(0) }}%
        </span>
      </div>
      <v-progress-linear
        :color="missingKinds > 0 ? 'var(--tgc-od-orange)' : 'var(--tgc-od-green)'"
        :model-value="materialProgress"
        height="6"
        rounded
      />
      <div aria-label="计划统计" class="ucps-stats">
        <div class="ucps-stat active">
          <span>进行中</span>
          <strong>{{ targetCounts.active }}</strong>
        </div>
        <div class="ucps-stat fulfilled">
          <span>材料已满足</span>
          <strong>{{ targetCounts.fulfilled }}</strong>
        </div>
        <div class="ucps-stat completed">
          <span>已完成</span>
          <strong>{{ targetCounts.completed }}</strong>
        </div>
        <div class="ucps-stat materials">
          <span>材料种类</span>
          <strong>{{ materials.length }}</strong>
        </div>
      </div>
    </section>

    <section class="ucps-materials">
      <div class="ucps-section-header">
        <div>
          <v-icon size="18">mdi-package-variant-closed</v-icon>
          <h3>材料汇总</h3>
          <span class="ucps-section-hint">按目标优先级分配当前背包库存</span>
        </div>
        <v-chip
          :color="missingKinds > 0 ? 'var(--tgc-od-red)' : 'var(--tgc-od-green)'"
          size="small"
          variant="tonal"
        >
          {{ missingKinds > 0 ? `${missingKinds} 种材料不足` : "材料已满足" }}
        </v-chip>
      </div>

      <div v-if="materialGroups.length > 0" class="ucps-material-groups">
        <section
          v-for="(group, groupIndex) in materialGroups"
          :key="group.key"
          class="ucps-material-group"
        >
          <button
            :id="getMaterialGroupTriggerId(groupIndex)"
            :aria-controls="getMaterialGroupContentId(groupIndex)"
            :aria-expanded="expandedGroupKeys.has(group.key)"
            class="ucps-material-group-toggle"
            type="button"
            @click="toggleMaterialGroup(group.key)"
          >
            <span class="ucps-material-group-title">
              <v-icon
                :icon="expandedGroupKeys.has(group.key) ? 'mdi-chevron-down' : 'mdi-chevron-right'"
                size="18"
              />
              <strong>{{ group.label }}</strong>
            </span>
            <span class="ucps-material-group-meta">
              {{ group.materials.length }} 种 · {{ group.missingCount }} 种不足
            </span>
          </button>
          <div
            v-show="expandedGroupKeys.has(group.key)"
            :id="getMaterialGroupContentId(groupIndex)"
            :aria-labelledby="getMaterialGroupTriggerId(groupIndex)"
            class="ucps-material-group-content"
            role="region"
          >
            <div class="ucps-material-list">
              <UcMaterialReq
                v-for="material in group.materials"
                :key="material.id"
                :material
                @select="openMaterialInfo(material)"
              />
            </div>
          </div>
        </section>
      </div>
      <div v-else class="ucps-empty">
        <v-icon size="48">mdi-package-variant-closed-check</v-icon>
        <span>{{ emptyText }}</span>
      </div>
    </section>
    <UcCraftingSummary :materials />
  </TopOverlay>

  <UcMaterialDetail
    v-if="currentMaterial && currentWiki"
    v-model="materialOverlayVisible"
    :bag="bagMaterials.get(currentMaterial.id)"
    footerContext="养成计划汇总"
    :idx="currentMaterialIndex + 1"
    :material="currentMaterial"
    :total="materials.length"
    topOffset="132px"
    :uid
    :wiki="currentWiki"
  >
    <template #left>
      <v-btn
        :disabled="currentMaterialIndex === 0"
        aria-label="上一个养成材料"
        class="ucps-card-arrow"
        icon="mdi-chevron-left"
        title="上一个养成材料"
        variant="flat"
        @click="switchMaterial(false)"
      />
    </template>
    <template #right>
      <v-btn
        :disabled="currentMaterialIndex >= materials.length - 1"
        aria-label="下一个养成材料"
        class="ucps-card-arrow"
        icon="mdi-chevron-right"
        title="下一个养成材料"
        variant="flat"
        @click="switchMaterial(true)"
      />
    </template>
  </UcMaterialDetail>
</template>

<script lang="ts" setup>
import TopOverlay from "@comp/app/top-overlay.vue";
import showLoading from "@comp/func/loading.js";
import showSnackbar from "@comp/func/snackbar.js";
import UcCraftingSummary from "@comp/userCalc/uc-crafting-summary.vue";
import UcMaterialDetail from "@comp/userCalc/uc-material-detail.vue";
import UcMaterialReq from "@comp/userCalc/uc-material-req.vue";
import TGLogger from "@utils/TGLogger.js";
import { generateShareImg } from "@utils/TGShare.js";
import { computed, nextTick, ref, shallowRef, useId, useTemplateRef, watch } from "vue";

import { WikiMaterialData } from "@/data/index.js";

type PlanTargetCounts = {
  active: number;
  completed: number;
  fulfilled: number;
};

type UcPlanSummaryOverlayProps = {
  bagMaterials: ReadonlyMap<number, TGApp.Sqlite.UserBag.MaterialTable>;
  inventoryUpdatedLabel: string;
  materials: Array<TGApp.App.UserCalc.ResultMaterial>;
  project: TGApp.Sqlite.Cultivation.Project;
  targetCounts: PlanTargetCounts;
  uid: number;
};

type MaterialGroup = {
  key: string;
  label: string;
  materials: Array<TGApp.App.UserCalc.ResultMaterial>;
  missingCount: number;
};

const props = defineProps<UcPlanSummaryOverlayProps>();
const visible = defineModel<boolean>({ required: true });
const shareLoading = ref<boolean>(false);
const expandedGroupKeys = ref<Set<string>>(new Set());
const materialOverlayVisible = ref<boolean>(false);
const currentMaterialIndex = ref<number>(0);
const currentMaterial = shallowRef<TGApp.App.UserCalc.ResultMaterial>();
const currentWiki = shallowRef<TGApp.App.Material.WikiItem>();
const overlayPanel = useTemplateRef<InstanceType<typeof TopOverlay>>("overlayPanel");
const materialGroupId = useId();

const shareCaption = computed<string>(
  () => `养成计划汇总 · ${props.project.name} · UID ${props.uid}`,
);
const totalTargetCount = computed<number>(
  () => props.targetCounts.active + props.targetCounts.fulfilled + props.targetCounts.completed,
);
const materialGroups = computed<Array<MaterialGroup>>(() => {
  const groupMap = new Map<string, Array<TGApp.App.UserCalc.ResultMaterial>>();
  for (const material of props.materials) {
    const groupMaterials = groupMap.get(material.type);
    if (groupMaterials) {
      groupMaterials.push(material);
    } else {
      groupMap.set(material.type, [material]);
    }
  }
  return Array.from(groupMap, ([key, materials]) => ({
    key,
    label: key || "其他材料",
    materials,
    missingCount: materials.filter((material) => material.missing > 0).length,
  }));
});
const displayMaterials = computed<Array<TGApp.App.UserCalc.ResultMaterial>>(() =>
  materialGroups.value.flatMap((group) => group.materials),
);
const readyMaterialCount = computed<number>(
  () => props.materials.filter((material) => material.missing === 0).length,
);
const materialProgress = computed<number>(() => {
  if (props.materials.length === 0) {
    return totalTargetCount.value > 0 && props.targetCounts.active === 0 ? 100 : 0;
  }
  const total = props.materials.reduce((sum, material) => sum + material.progress, 0);
  return Math.min(total / props.materials.length, 100);
});
const missingKinds = computed<number>(
  () => props.materials.filter((material) => material.missing > 0).length,
);
const planStateLabel = computed<string>(() => {
  if (totalTargetCount.value === 0) return "等待添加目标";
  if (props.targetCounts.active === 0) return "全部目标已就绪";
  if (missingKinds.value > 0) return `仍需收集 ${missingKinds.value} 种材料`;
  return "当前材料已备齐";
});
const emptyText = computed<string>(() =>
  totalTargetCount.value === 0 ? "添加养成目标后即可查看材料汇总" : "当前计划没有待收集材料",
);

function getMaterialGroupTriggerId(groupIndex: number): string {
  return `${materialGroupId}-trigger-${groupIndex}`;
}

function getMaterialGroupContentId(groupIndex: number): string {
  return `${materialGroupId}-content-${groupIndex}`;
}

function toggleMaterialGroup(groupKey: string): void {
  const nextExpandedGroupKeys = new Set(expandedGroupKeys.value);
  if (nextExpandedGroupKeys.has(groupKey)) {
    nextExpandedGroupKeys.delete(groupKey);
  } else {
    nextExpandedGroupKeys.add(groupKey);
  }
  expandedGroupKeys.value = nextExpandedGroupKeys;
}

watch([visible, () => props.project.id], ([isVisible]) => {
  if (isVisible) expandedGroupKeys.value = new Set();
});

async function openMaterialInfo(material: TGApp.App.UserCalc.ResultMaterial): Promise<void> {
  const wiki = WikiMaterialData.find((item) => item.id === material.id);
  if (!wiki) return;
  const index = displayMaterials.value.findIndex((item) => item.id === material.id);
  materialOverlayVisible.value = false;
  currentMaterialIndex.value = index >= 0 ? index : 0;
  currentMaterial.value = material;
  currentWiki.value = wiki;
  await nextTick();
  materialOverlayVisible.value = true;
}

function switchMaterial(isNext: boolean): void {
  const nextIndex = currentMaterialIndex.value + (isNext ? 1 : -1);
  if (nextIndex < 0 || nextIndex >= displayMaterials.value.length) return;
  const material = displayMaterials.value[nextIndex];
  const wiki = WikiMaterialData.find((item) => item.id === material?.id);
  if (!material || !wiki) return;
  currentMaterialIndex.value = nextIndex;
  currentMaterial.value = material;
  currentWiki.value = wiki;
}

async function shareSummary(): Promise<void> {
  const panel = overlayPanel.value?.panel ?? null;
  const content = overlayPanel.value?.content ?? null;
  if (panel === null || content === null) {
    showSnackbar.error("未获取到计划汇总内容");
    return;
  }

  const contentMaxHeight = content.style.maxHeight;
  const contentOverflowY = content.style.overflowY;
  const previousExpandedGroupKeys = new Set(expandedGroupKeys.value);
  shareLoading.value = true;
  try {
    await showLoading.start("正在生成分享图片", props.project.name);
    await TGLogger.Info(`[CultivationSummary][share][${props.uid}] 开始生成计划汇总图片`);
    expandedGroupKeys.value = new Set(materialGroups.value.map((group) => group.key));
    await nextTick();
    content.style.maxHeight = "none";
    content.style.overflowY = "visible";
    await generateShareImg(`养成计划汇总_${props.project.name}_${props.uid}`, panel, 1.5, true);
  } finally {
    shareLoading.value = false;
    try {
      content.style.maxHeight = contentMaxHeight;
      content.style.overflowY = contentOverflowY;
      expandedGroupKeys.value = previousExpandedGroupKeys;
      await nextTick();
    } finally {
      await showLoading.end();
    }
  }
}
</script>

<style lang="scss" scoped>
.ucps-heading-icon {
  display: grid;
  width: 72px;
  height: 72px;
  flex: 0 0 72px;
  border-radius: 8px;
  background: var(--common-shadow-t-2);
  color: var(--tgc-od-orange);
  place-items: center;
}

.ucps-identity {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 4px;

  h2 {
    overflow: hidden;
    margin: 0;
    color: var(--common-text-title);
    font-family: var(--font-title);
    font-size: 28px;
    font-weight: normal;
    line-height: 36px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.ucps-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  color: var(--box-text-4);
  font-size: 12px;
  gap: 8px;
  line-height: 16px;
}

.ucps-meta-tag {
  padding: 2px 6px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
  background: var(--box-bg-2);
  color: var(--tgc-od-orange);
}

.ucps-meta-tag--muted {
  color: var(--box-text-2);
}

.ucps-overview-label,
.ucps-section-hint {
  color: var(--common-text-sub);
  font-size: 12px;
  line-height: 16px;
}

.ucps-overview {
  display: flex;
  flex-direction: column;
  padding: 12px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--box-bg-1);
  color: var(--box-text-1);
  gap: 8px;
}

.ucps-progress-copy {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;

  div {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  strong {
    font-size: 16px;
    font-weight: 600;
    line-height: 22px;
  }

  > span {
    color: var(--common-text-sub);
    font-size: 12px;
    white-space: nowrap;
  }
}

.ucps-stats {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.ucps-stat {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  padding: 8px;
  border-radius: 4px;
  border-left: 3px solid var(--common-shadow-2);
  background: var(--common-shadow-t-1);
  gap: 8px;

  span {
    color: var(--common-text-sub);
    font-size: 12px;
  }

  strong {
    font-family: var(--font-title);
    font-size: 20px;
    font-weight: normal;
  }

  &.active {
    border-left-color: var(--tgc-od-orange);
  }

  &.fulfilled {
    border-left-color: var(--tgc-od-green);
  }

  &.completed {
    border-left-color: var(--tgc-od-blue);
  }

  &.materials {
    border-left-color: var(--tgc-od-purple);
  }
}

.ucps-materials {
  display: flex;
  flex-direction: column;
  padding: 12px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--box-bg-1);
  color: var(--box-text-1);
  gap: 8px;
}

.ucps-material-groups {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ucps-material-group {
  overflow: hidden;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
}

.ucps-material-group-toggle {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border: 0;
  background: var(--common-shadow-t-1);
  color: var(--box-text-1);
  cursor: pointer;
  font: inherit;
  gap: 12px;
  text-align: left;

  &:hover {
    background: var(--common-shadow-t-2);
  }

  &:focus-visible {
    outline: 2px solid var(--tgc-od-blue);
    outline-offset: -2px;
  }
}

.ucps-material-group-title {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;

  strong {
    overflow: hidden;
    color: var(--common-text-title);
    font-size: 14px;
    font-weight: 600;
    line-height: 20px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.ucps-material-group-meta {
  flex-shrink: 0;
  color: var(--common-text-sub);
  font-size: 12px;
  line-height: 16px;
  white-space: nowrap;
}

.ucps-material-group-content {
  padding: 8px;
  border-top: 1px solid var(--common-shadow-1);
}

.ucps-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;

  > div {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  h3 {
    margin: 0;
    color: var(--common-text-title);
    font-size: 16px;
    font-weight: 600;
    line-height: 22px;
  }
}

.ucps-material-list {
  display: grid;
  align-content: start;
  gap: 8px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.ucps-empty {
  display: flex;
  min-height: 160px;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--common-text-sub);
  gap: 8px;
}

.ucps-card-arrow {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border: 1px solid var(--common-shadow-2);
  border-radius: 8px;
  background: var(--box-bg-1);
  color: var(--box-text-2);
}

@media (width <= 720px) {
  .ucps-stats,
  .ucps-material-list {
    grid-template-columns: 1fr;
  }

  .ucps-identity h2 {
    font-size: 22px;
    line-height: 32px;
  }

  .ucps-section-header,
  .ucps-section-header > div {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
