<!-- 养成计划-单个目标汇总浮窗 -->
<template>
  <TOverlay v-model="visible" topOffset="132px">
    <div class="ucpts-container">
      <v-btn
        :disabled="!canSelectPrevious"
        aria-label="上一个养成目标"
        class="ucpts-card-arrow"
        icon="mdi-chevron-left"
        title="上一个养成目标"
        variant="flat"
        @click="selectEntry(false)"
      />
      <article
        ref="shareTarget"
        aria-labelledby="cultivation-target-summary-title"
        aria-modal="true"
        class="ucpts-panel"
        role="dialog"
      >
        <header class="ucpts-header">
          <div class="ucpts-heading">
            <UcItemIcon :alt="entry.name" :icon="entry.icon" :size="64" :star="entry.star" />
            <div class="ucpts-identity">
              <div class="ucpts-name-row">
                <h2 id="cultivation-target-summary-title">{{ entry.name }}</h2>
                <v-chip :color="statusColor" size="small" variant="tonal">{{ statusLabel }}</v-chip>
              </div>
              <div class="ucpts-meta">
                <span>{{ entry.type === "avatar" ? "角色" : "武器" }}养成目标</span>
                <span>UID {{ uid }}</span>
                <span>{{ entry.calculationMode === "api" ? "接口计算" : "背包计算" }}</span>
              </div>
            </div>
          </div>
          <div class="ucpts-actions" data-html2canvas-ignore="true">
            <v-btn
              :loading="shareLoading"
              aria-label="保存养成目标汇总分享图"
              density="comfortable"
              icon="mdi-share-variant"
              title="保存养成目标汇总分享图"
              variant="text"
              @click="shareSummary"
            />
            <v-btn
              aria-label="关闭养成目标汇总"
              density="comfortable"
              icon="mdi-close"
              title="关闭"
              variant="text"
              @click="visible = false"
            />
          </div>
        </header>

        <main ref="contentTarget" class="ucpts-content">
          <section class="ucpts-overview">
            <div class="ucpts-overview-heading">
              <div>
                <span class="ucpts-section-label">目标进度</span>
                <strong>{{ progressLabel }}</strong>
              </div>
              <span>{{ progress.toFixed(0) }}%</span>
            </div>
            <v-progress-linear :color="progressColor" :model-value="progress" height="6" rounded />
            <div class="ucpts-target-states">
              <div>
                <span>等级</span>
                <strong>
                  Lv.{{ entry.currentState.level }} → Lv.{{ entry.targetState.level }}
                </strong>
              </div>
              <div v-if="talentLevels.length > 0">
                <span>天赋</span>
                <strong>
                  <span v-for="talent in talentLevels" :key="talent.id" :title="talent.name">
                    {{ talent.label }} {{ talent.currentLevel }}→{{ talent.targetLevel }}
                  </span>
                </strong>
              </div>
              <div>
                <span>材料</span>
                <strong>{{ materials.length }} 种 · {{ missingKinds }} 种不足</strong>
              </div>
            </div>
          </section>

          <section class="ucpts-materials">
            <div class="ucpts-section-heading">
              <div>
                <v-icon size="18">mdi-package-variant-closed</v-icon>
                <h3>材料需求</h3>
                <span class="ucpts-section-label">已按当前目标优先级分配背包库存</span>
              </div>
              <v-chip :color="progressColor" size="small" variant="tonal">
                {{ materialStateLabel }}
              </v-chip>
            </div>

            <div v-if="displayMaterials.length > 0" class="ucpts-material-list">
              <article
                v-for="material in displayMaterials"
                :key="material.id"
                :class="{ missing: material.missing > 0 }"
                class="ucpts-material"
                role="button"
                tabindex="0"
                title="查看材料详情"
                @click="openMaterialInfo(material)"
                @keydown.enter="openMaterialInfo(material)"
                @keydown.space.prevent="openMaterialInfo(material)"
              >
                <div class="ucpts-material-icon">
                  <img :src="`/icon/bg/${material.star}-Star.webp`" alt="" />
                  <img :src="`/icon/material/${material.id}.webp`" :alt="material.name" />
                </div>
                <div class="ucpts-material-info">
                  <div class="ucpts-material-heading">
                    <strong>{{ material.name }}</strong>
                    <span
                      :class="{ complete: material.missing === 0 }"
                      class="ucpts-material-missing"
                    >
                      缺 {{ formatCount(material.missing) }}
                    </span>
                  </div>
                  <div class="ucpts-material-counts">
                    <span>需求 {{ formatCount(material.required) }}</span>
                    <span>已有 {{ formatCount(material.owned) }}</span>
                    <span v-if="material.craftable > 0">
                      可合成 {{ formatCount(material.craftable) }}
                    </span>
                  </div>
                  <v-progress-linear
                    :color="material.missing > 0 ? 'var(--tgc-od-red)' : 'var(--tgc-od-green)'"
                    :model-value="material.progress"
                    height="3"
                    rounded
                  />
                </div>
              </article>
            </div>
            <div v-else class="ucpts-empty">
              <v-icon size="48">mdi-package-variant-closed-check</v-icon>
              <span>{{ emptyText }}</span>
            </div>
          </section>
        </main>

        <footer class="ucpts-footer">
          <span>养成目标汇总</span>
          <span> · {{ entry.name }} · 第 {{ currentPosition }} / {{ entries.length }} 项</span>
          <span> · UID {{ uid }}</span>
          <span> · Rendered by TeyvatGuide v{{ version }}</span>
        </footer>
      </article>
      <v-btn
        :disabled="!canSelectNext"
        aria-label="下一个养成目标"
        class="ucpts-card-arrow"
        icon="mdi-chevron-right"
        title="下一个养成目标"
        variant="flat"
        @click="selectEntry(true)"
      />
    </div>
  </TOverlay>

  <UcMaterialDetail
    v-if="currentMaterial && currentWiki"
    v-model="materialOverlayVisible"
    :bag="bagMaterials.get(currentMaterial.id)"
    :footerContext="`${entry.name}养成目标`"
    :material="currentMaterial"
    topOffset="132px"
    :uid
    :wiki="currentWiki"
  />
</template>

<script lang="ts" setup>
import TOverlay from "@comp/app/t-overlay.vue";
import showLoading from "@comp/func/loading.js";
import showSnackbar from "@comp/func/snackbar.js";
import UcItemIcon from "@comp/userCalc/uc-item-icon.vue";
import UcMaterialDetail from "@comp/userCalc/uc-material-detail.vue";
import { getVersion } from "@tauri-apps/api/app";
import TGLogger from "@utils/TGLogger.js";
import { generateShareImg } from "@utils/TGShare.js";
import { computed, nextTick, onMounted, ref, shallowRef, useTemplateRef } from "vue";

import { WikiMaterialData } from "@/data/index.js";

type UcPlanTargetSummaryOverlayProps = {
  bagMaterials: ReadonlyMap<number, TGApp.Sqlite.UserBag.MaterialTable>;
  entry: TGApp.Sqlite.Cultivation.EntryWithItems;
  entries: Array<TGApp.Sqlite.Cultivation.EntryWithItems>;
  materials: Array<TGApp.App.UserCalc.ResultMaterial>;
  uid: number;
};

type UcPlanTargetSummaryOverlayEmits = {
  select: [entry: TGApp.Sqlite.Cultivation.EntryWithItems];
};

type TalentLevelView = {
  currentLevel: number;
  id: number;
  label: string;
  name: string;
  targetLevel: number;
};

const TALENT_LABELS = <const>["A", "E", "Q"];

const props = defineProps<UcPlanTargetSummaryOverlayProps>();
const emits = defineEmits<UcPlanTargetSummaryOverlayEmits>();
const visible = defineModel<boolean>({ required: true });
const version = ref<string>();
const shareLoading = ref<boolean>(false);
const materialOverlayVisible = ref<boolean>(false);
const currentMaterial = shallowRef<TGApp.App.UserCalc.ResultMaterial>();
const currentWiki = shallowRef<TGApp.App.Material.WikiItem>();
const shareTarget = useTemplateRef<HTMLElement>("shareTarget");
const contentTarget = useTemplateRef<HTMLElement>("contentTarget");

const currentIndex = computed<number>(() =>
  props.entries.findIndex((entry) => entry.id === props.entry.id),
);
const currentPosition = computed<number>(() => Math.max(currentIndex.value + 1, 0));
const canSelectPrevious = computed<boolean>(() => currentIndex.value > 0);
const canSelectNext = computed<boolean>(
  () => currentIndex.value >= 0 && currentIndex.value < props.entries.length - 1,
);
const displayMaterials = computed<Array<TGApp.App.UserCalc.ResultMaterial>>(() =>
  [...props.materials].sort(
    (a, b) => Number(b.missing > 0) - Number(a.missing > 0) || b.star - a.star || a.id - b.id,
  ),
);
const missingKinds = computed<number>(
  () => props.materials.filter((material) => material.missing > 0).length,
);
const progress = computed<number>(() => {
  if (props.entry.status === "completed" || props.entry.items.length === 0) return 100;
  if (props.materials.length === 0) return 0;
  const total = props.materials.reduce((sum, material) => sum + material.progress, 0);
  return Math.min(total / props.materials.length, 100);
});
const waitingForMaterials = computed<boolean>(
  () =>
    props.entry.status === "active" && props.entry.items.length > 0 && props.materials.length === 0,
);
const statusLabel = computed<string>(() => {
  if (props.entry.status === "completed") return "已完成";
  if (waitingForMaterials.value) return "等待数据";
  return missingKinds.value === 0 ? "材料已满足" : "进行中";
});
const statusColor = computed<string>(() => {
  if (props.entry.status === "completed") return "var(--tgc-od-blue)";
  if (waitingForMaterials.value) return "var(--tgc-od-blue)";
  return missingKinds.value === 0 ? "var(--tgc-od-green)" : "var(--tgc-od-orange)";
});
const progressColor = computed<string>(() => {
  if (waitingForMaterials.value) return "var(--tgc-od-blue)";
  return missingKinds.value === 0 ? "var(--tgc-od-green)" : "var(--tgc-od-orange)";
});
const progressLabel = computed<string>(() => {
  if (props.entry.status === "completed") return "目标已完成";
  if (props.entry.items.length === 0) return "无需材料";
  if (props.materials.length === 0) return "等待材料数据";
  return missingKinds.value === 0 ? "材料已备齐" : `仍缺 ${missingKinds.value} 种材料`;
});
const materialStateLabel = computed<string>(() => {
  if (waitingForMaterials.value) return "等待材料数据";
  return missingKinds.value > 0 ? `缺少 ${missingKinds.value} 种材料` : "材料已满足";
});
const emptyText = computed<string>(() => {
  if (props.entry.status === "completed") return "此目标已完成，无需继续收集材料";
  if (props.entry.items.length === 0) return "此目标无需额外材料";
  return "暂未加载到该目标的材料分配结果";
});
const talentLevels = computed<Array<TalentLevelView>>(() => {
  const currentLevelMap = new Map(
    props.entry.currentState.talents.map((talent) => [talent.id, talent.level]),
  );
  const currentLevelByName = new Map(
    props.entry.currentState.talents.map((talent) => [talent.name, talent.level]),
  );
  return props.entry.targetState.talents.map((talent, index) => ({
    currentLevel: currentLevelMap.get(talent.id) ?? currentLevelByName.get(talent.name) ?? 1,
    id: talent.id,
    label: TALENT_LABELS[index] ?? String(index + 1),
    name: talent.name,
    targetLevel: talent.level,
  }));
});

onMounted(async () => (version.value = await getVersion()));

function selectEntry(isNext: boolean): void {
  const nextIndex = currentIndex.value + (isNext ? 1 : -1);
  const entry = props.entries[nextIndex];
  if (!entry) return;
  emits("select", entry);
}

async function openMaterialInfo(material: TGApp.App.UserCalc.ResultMaterial): Promise<void> {
  const wiki = WikiMaterialData.find((item) => item.id === material.id);
  if (!wiki) return;
  materialOverlayVisible.value = false;
  currentMaterial.value = material;
  currentWiki.value = wiki;
  await nextTick();
  materialOverlayVisible.value = true;
}

function formatCount(count: number): string {
  return count.toLocaleString("zh-CN");
}

async function shareSummary(): Promise<void> {
  const panel = shareTarget.value;
  const content = contentTarget.value;
  if (panel === null || content === null) {
    showSnackbar.error("未获取到养成目标汇总内容");
    return;
  }

  const contentMaxHeight = content.style.maxHeight;
  const contentOverflowY = content.style.overflowY;
  shareLoading.value = true;
  await showLoading.start("正在生成分享图片", props.entry.name);
  await TGLogger.Info(`[CultivationTargetSummary][share][${props.entry.id}] 开始生成目标汇总图片`);
  content.style.maxHeight = "none";
  content.style.overflowY = "visible";
  try {
    await generateShareImg(`养成目标汇总_${props.entry.name}_${props.uid}`, panel, 1.5, true);
  } finally {
    content.style.maxHeight = contentMaxHeight;
    content.style.overflowY = contentOverflowY;
    await showLoading.end();
    shareLoading.value = false;
  }
}
</script>

<style lang="scss" scoped>
.ucpts-container {
  display: flex;
  max-height: calc(100% - 32px);
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.ucpts-panel {
  display: flex;
  overflow: hidden;
  width: 720px;
  max-width: calc(100vw - 160px);
  flex-direction: column;
  border: 1px solid var(--common-shadow-2);
  border-radius: 12px;
  background: var(--app-page-bg);
  box-shadow: 0 8px 24px var(--common-shadow-t-4);
}

.ucpts-header,
.ucpts-heading,
.ucpts-name-row,
.ucpts-meta,
.ucpts-overview-heading,
.ucpts-section-heading,
.ucpts-section-heading > div,
.ucpts-material-heading,
.ucpts-material-counts {
  display: flex;
  align-items: center;
}

.ucpts-header {
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid var(--common-shadow-1);
  background: var(--dialog-header-bg);
  gap: 12px;
}

.ucpts-heading {
  min-width: 0;
  flex: 1;
  gap: 12px;
}

.ucpts-actions {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  color: var(--box-text-2);
  gap: 4px;
}

.ucpts-identity {
  min-width: 0;
  flex: 1;
}

.ucpts-name-row {
  min-width: 0;
  gap: 8px;

  h2 {
    overflow: hidden;
    margin: 0;
    color: var(--common-text-title);
    font-family: var(--font-title);
    font-size: 24px;
    font-weight: normal;
    line-height: 32px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.ucpts-meta,
.ucpts-section-label,
.ucpts-material-counts {
  color: var(--common-text-sub);
  font-size: 12px;
  line-height: 16px;
}

.ucpts-meta {
  flex-wrap: wrap;
  gap: 8px;
}

.ucpts-content {
  display: flex;
  min-height: 0;
  max-height: 520px;
  flex-direction: column;
  padding: 16px;
  gap: 12px;
  overflow-y: auto;
}

.ucpts-overview,
.ucpts-materials {
  padding: 12px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--box-bg-1);
  color: var(--box-text-1);
}

.ucpts-overview {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ucpts-overview-heading,
.ucpts-section-heading,
.ucpts-material-heading {
  justify-content: space-between;
  gap: 12px;
}

.ucpts-overview-heading {
  > div {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  strong {
    font-size: 16px;
    font-weight: 600;
    line-height: 22px;
  }

  > span {
    color: var(--common-text-sub);
    font-size: 16px;
    font-weight: 600;
  }
}

.ucpts-material-heading strong {
  overflow: hidden;
  font-family: var(--font-title);
  font-size: 14px;
  font-weight: normal;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ucpts-target-states {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(3, minmax(0, 1fr));

  > div {
    display: flex;
    min-width: 0;
    flex-direction: column;
    padding: 8px;
    border-left: 3px solid var(--common-shadow-2);
    background: var(--common-shadow-t-1);
    gap: 2px;

    > span {
      color: var(--common-text-sub);
      font-size: 12px;
    }

    strong {
      display: flex;
      overflow: hidden;
      align-items: center;
      justify-content: flex-start;
      column-gap: 8px;
      font-size: 13px;
      font-weight: 600;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    &:nth-child(2) {
      border-left-color: var(--tgc-od-purple);
    }

    &:nth-child(3) {
      border-left-color: var(--tgc-od-orange);
    }
  }
}

.ucpts-materials {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ucpts-section-heading > div {
  min-width: 0;
  gap: 8px;

  h3 {
    margin: 0;
    color: var(--common-text-title);
    font-size: 16px;
    font-weight: 600;
    line-height: 22px;
  }
}

.ucpts-material-list {
  display: grid;
  align-content: start;
  gap: 8px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.ucpts-material {
  display: flex;
  overflow: hidden;
  min-width: 0;
  min-height: 68px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
  background: var(--common-shadow-t-1);
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--tgc-od-blue);
    outline-offset: -2px;
  }

  &.missing {
    border-color: var(--tgc-od-red);
  }
}

.ucpts-material-icon {
  position: relative;
  width: 68px;
  height: 68px;
  flex: 0 0 68px;
  background: var(--common-shadow-t-2);

  img {
    position: absolute;
    width: 100%;
    height: 100%;
    inset: 0;
  }

  img:first-child {
    object-fit: cover;
  }

  img:last-child {
    object-fit: contain;
  }
}

.ucpts-material-info {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  justify-content: center;
  padding: 6px 8px;
  gap: 4px;
}

.ucpts-material-missing {
  flex-shrink: 0;
  color: var(--tgc-od-red);
  font-size: 12px;

  &.complete {
    color: var(--tgc-od-green);
  }
}

.ucpts-material-counts {
  flex-wrap: wrap;
  gap: 6px;
}

.ucpts-empty {
  display: flex;
  min-height: 160px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--common-text-sub);
  gap: 8px;
}

.ucpts-footer {
  padding: 8px 16px;
  border-top: 1px solid var(--common-shadow-1);
  background: var(--dialog-footer-bg);
  color: var(--box-text-4);
  font-size: 10px;
  line-height: 14px;
  text-align: center;
}

.ucpts-card-arrow {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border: 1px solid var(--common-shadow-2);
  border-radius: 8px;
  background: var(--box-bg-1);
  color: var(--box-text-2);
}

@media (width <= 720px) {
  .ucpts-container {
    gap: 8px;
  }

  .ucpts-panel {
    max-width: calc(100vw - 112px);
  }

  .ucpts-target-states,
  .ucpts-material-list {
    grid-template-columns: 1fr;
  }

  .ucpts-section-heading,
  .ucpts-section-heading > div {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
