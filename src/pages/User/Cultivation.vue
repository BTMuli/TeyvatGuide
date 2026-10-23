<!-- 养成计划 -->
<template>
  <v-app-bar :extension-height="uidList.length > 0 ? 68 : 0">
    <template #prepend>
      <div class="cultivation-title">
        <v-icon color="var(--tgc-od-orange)">mdi-calculator-variant-outline</v-icon>
        <span>养成计划</span>
        <v-btn
          :disabled="isTargetEditor"
          prepend-icon="mdi-plus"
          size="small"
          variant="tonal"
          @click="createPlan"
        >
          新建计划
        </v-btn>
      </div>
    </template>
    <template #append>
      <div class="cultivation-nav-actions">
        <v-select
          v-model="currentUid"
          :disabled="isTargetEditor"
          :hide-details="true"
          :item-title="uidItemTitle"
          :item-value="uidItemValue"
          :items="uidList"
          class="cultivation-nav-select uid-select"
          density="compact"
          label="数据 UID"
          variant="outlined"
        >
          <template #selection="{ item }">
            <span>{{ maskUidTail(item) }}</span>
          </template>
        </v-select>
        <v-select
          v-if="currentUid !== undefined"
          v-model="currentProjectId"
          :disabled="isTargetEditor"
          :hide-details="true"
          :items="projectOptions"
          class="cultivation-nav-select project-select"
          density="compact"
          item-title="title"
          item-value="value"
          label="当前计划"
          variant="outlined"
        />
      </div>
    </template>
    <template #extension>
      <div v-if="uidList.length > 0 && isTargetEditor" class="cultivation-editor-toolbar">
        <div class="cultivation-editor-main">
          <div class="cultivation-editor-heading">
            <v-icon
              :icon="editingEntry ? 'mdi-pencil-outline' : 'mdi-plus-circle-outline'"
              color="var(--tgc-od-orange)"
              size="20"
            />
            <span>{{ editorTargetName }}</span>
          </div>
          <v-btn-toggle
            v-model="calculationMode"
            color="var(--tgc-od-orange)"
            density="compact"
            mandatory
            variant="outlined"
          >
            <v-btn
              :disabled="!isWindows || isTraveler || !hasBagDataSource"
              :title="bagCalculationTitle"
              value="bag"
            >
              背包计算
            </v-btn>
            <v-btn :title="apiCalculationTitle" value="api">接口计算</v-btn>
          </v-btn-toggle>
        </div>
        <div class="cultivation-mode-actions">
          <v-btn
            v-if="useApiCalculation"
            :disabled="!canApiCalculate"
            :loading="apiLoading"
            color="var(--tgc-od-orange)"
            prepend-icon="mdi-check-circle-outline"
            size="small"
            variant="tonal"
            @click="calculateWithApi"
          >
            确认计算
          </v-btn>
          <v-btn prepend-icon="mdi-close" size="small" variant="tonal" @click="cancelEditing">
            取消编辑
          </v-btn>
          <v-btn
            :disabled="!canSaveToPlan"
            :loading="planLoading"
            color="var(--tgc-od-orange)"
            prepend-icon="mdi-content-save-outline"
            size="small"
            variant="flat"
            @click="saveToPlan"
          >
            {{ editingEntry ? "更新计划目标" : "保存到计划" }}
          </v-btn>
        </div>
      </div>
      <div v-else-if="uidList.length > 0" class="cultivation-plan-toolbar">
        <div class="cultivation-plan-summary">
          <div class="cultivation-plan-heading">
            <v-icon color="var(--tgc-od-orange)">mdi-clipboard-text-outline</v-icon>
            <span>{{ currentProject?.name ?? "尚未创建计划" }}</span>
          </div>
          <v-chip size="small" variant="tonal">
            {{ inventoryUpdatedLabel }}
          </v-chip>
          <v-chip
            :color="planMissingKinds > 0 ? 'var(--tgc-od-red)' : 'var(--tgc-od-green)'"
            size="small"
            variant="tonal"
          >
            {{ planMissingKinds > 0 ? `${planMissingKinds} 种材料不足` : "材料已满足" }}
          </v-chip>
          <div aria-label="养成目标状态计数" class="cultivation-plan-statuses">
            <span class="active">进行中 {{ planEntryCounts.active }}</span>
            <span class="fulfilled">已满足 {{ planEntryCounts.fulfilled }}</span>
            <span class="completed">已完成 {{ planEntryCounts.completed }}</span>
          </div>
        </div>
        <div class="cultivation-plan-actions">
          <v-btn
            :disabled="!currentProject"
            prepend-icon="mdi-chart-box-outline"
            size="small"
            variant="tonal"
            @click="summaryVisible = true"
          >
            查看汇总
          </v-btn>
          <v-btn
            v-if="isWindows"
            prepend-icon="mdi-bag-personal-outline"
            size="small"
            variant="tonal"
            @click="importInventory"
          >
            导入背包
          </v-btn>
          <v-btn
            :disabled="!currentProject || planEntries.length === 0"
            prepend-icon="mdi-account-sync-outline"
            size="small"
            variant="tonal"
            @click="refreshPlanEntries"
          >
            刷新目标
          </v-btn>
          <v-btn
            color="var(--tgc-od-red)"
            prepend-icon="mdi-plus"
            size="small"
            variant="tonal"
            @click="startAddingTarget"
          >
            添加目标
          </v-btn>
          <v-btn
            :disabled="!currentProject"
            prepend-icon="mdi-pencil-outline"
            size="small"
            variant="tonal"
            @click="renamePlan"
          >
            重命名
          </v-btn>
          <v-btn
            :disabled="!currentProject"
            color="var(--tgc-od-red)"
            prepend-icon="mdi-delete-outline"
            size="small"
            variant="tonal"
            @click="removePlan"
          >
            删除
          </v-btn>
        </div>
      </div>
    </template>
  </v-app-bar>

  <div class="cultivation-page">
    <div v-if="uidList.length === 0" class="cultivation-empty">
      <v-icon size="64">mdi-database-off-outline</v-icon>
      <span>没有可用于计算的角色或背包存档</span>
    </div>

    <template v-else>
      <v-window
        v-model="viewTab"
        :show-arrows="false"
        :touch="false"
        class="cultivation-tab-window"
      >
        <v-window-item class="cultivation-tab-content" value="targets">
          <UcPlanTargetList
            :bag-materials="bagMaterialDetails"
            :entry-materials="planEntryMaterials"
            :conversionOptions="planConversionOptions"
            :entries="planEntries"
            :inventory="planInventory"
            :timezone="currentProject?.timezone ?? currentTimezone"
            :uid="currentUid ?? 0"
            @add="startAddingTarget"
            @apply-conversion="applyConversion"
            @reset-conversions="resetConversions"
            @edit="editPlanEntry"
            @remove="removePlanEntry"
            @reorder="updatePlanEntryOrder"
            @status="updatePlanEntryStatus"
          />
        </v-window-item>

        <v-window-item class="cultivation-tab-content" value="calculator">
          <div class="cultivation-config">
            <UcCharacterPanel
              v-model:ascended="avatarAscended"
              v-model:currentLevel="avatarCurrentLevel"
              v-model:selectedId="selectedCharacterId"
              v-model:talentCurrentLevels="talentCurrentLevels"
              v-model:talentTargetLevels="talentTargetLevels"
              v-model:targetAscended="avatarTargetAscended"
              v-model:targetLevel="avatarTargetLevel"
              :at-ascension-level="avatarAtAscensionLevel"
              :current-ascension-readonly="useApiCalculation && !avatarCurrentStateEditable"
              :current-state-editable="avatarCurrentStateEditable"
              :level-options="avatarLevelOptions"
              :options="characterOptions"
              :selectedCharacter
              :selection-readonly="characterSelectionReadonly"
              :skills="displaySkills"
              :talent-level-max="avatarTalentLevelMax"
              :target-at-ascension-level="avatarTargetAtAscensionLevel"
              :weapon-type="selectedRoleWeaponType"
            />
            <UcWeaponPanel
              v-model:ascended="weaponAscended"
              v-model:currentLevel="weaponCurrentLevel"
              v-model:selectedKey="selectedWeaponKey"
              v-model:targetAscended="weaponTargetAscended"
              v-model:targetLevel="weaponTargetLevel"
              v-model:useBagSource="useBagWeaponSource"
              :at-ascension-level="weaponAtAscensionLevel"
              :current-ascension-readonly="useApiCalculation && !weaponCurrentStateEditable"
              :current-promote-level="weaponCurrentPromoteLevel"
              :current-state-editable="weaponCurrentStateEditable"
              :has-bag-data="hasBagWeaponData"
              :level-options="weaponLevelOptions"
              :options="weaponOptions"
              :selectedWeapon
              :selection-readonly="weaponSelectionReadonly"
              :target-at-ascension-level="weaponTargetAtAscensionLevel"
            />
          </div>

          <UcMaterialResult
            v-model:allowCrafting="allowCrafting"
            v-model:useDust="useDust"
            v-model:useSolvent="useSolvent"
            :bag-materials="resultBagMaterialDetails"
            :empty-text="resultEmptyText"
            :loading="apiLoading"
            :materials="displayResultMaterials"
            :missingKinds
            :conversionOptions
            :show-crafting-options="!useApiCalculation && planContextReady"
            :uid="currentUid ?? 0"
            @apply-conversion="applyConversion"
            @reset-conversions="resetConversions"
          />
        </v-window-item>
      </v-window>
    </template>
  </div>

  <UcPlanSummaryOverlay
    v-if="currentProject"
    v-model="summaryVisible"
    :bag-materials="bagMaterialDetails"
    :entries="planEntries"
    :inventory-updated-label="inventoryUpdatedLabel"
    :materials="planResultMaterials"
    :project="currentProject"
    :conversionOptions="planConversionOptions"
    :target-counts="planEntryCounts"
    :uid="currentUid ?? 0"
    @apply-conversion="applyConversion"
    @reset-conversions="resetConversions"
  />
</template>

<script lang="ts" setup>
import showSnackbar from "@comp/func/snackbar.js";
import UcCharacterPanel from "@comp/userCalc/uc-character-panel.vue";
import UcMaterialResult from "@comp/userCalc/uc-material-result.vue";
import UcPlanSummaryOverlay from "@comp/userCalc/uc-plan-summary-overlay.vue";
import UcPlanTargetList from "@comp/userCalc/uc-plan-target-list.vue";
import UcWeaponPanel from "@comp/userCalc/uc-weapon-panel.vue";
import { useCultivationApiCalc } from "@hooks/useCultivationApiCalc.js";
import { useCultivationCalculator } from "@hooks/useCultivationCalculator.js";
import { useCultivationData } from "@hooks/useCultivationData.js";
import { useCultivationOptions } from "@hooks/useCultivationOptions.js";
import { useCultivationPlan } from "@hooks/useCultivationPlan.js";
import { useCultivationSummary } from "@hooks/useCultivationSummary.js";
import useCultivationConversionStore from "@store/cultivationConversion.js";
import { platform } from "@tauri-apps/plugin-os";
import { maskUidTail, uidItemTitle, uidItemValue } from "@utils/display/TGUid.js";
import { getUidServerTimezone } from "@utils/game/cultivationPlan.js";
import type { CultivationMaterial } from "@utils/game/userCalc.js";
import { computed, nextTick, onMounted, ref, shallowRef } from "vue";
import { useRoute, useRouter } from "vue-router";

type CalculationMode = TGApp.Sqlite.Cultivation.CalculationMode;
type CultivationViewTab = "calculator" | "targets";

const conversionStore = useCultivationConversionStore();
const route = useRoute();
const router = useRouter();

const isWindows = platform() === "windows";
const loading = ref<boolean>(false);
const apiLoading = ref<boolean>(false);
const planLoading = ref<boolean>(false);
const planContextReady = ref<boolean>(false);
const summaryVisible = ref<boolean>(false);
const apiCalculated = ref<boolean>(false);
const calculationMode = ref<CalculationMode>(isWindows ? "bag" : "api");
const viewTab = ref<CultivationViewTab>("targets");
const currentUid = ref<number>();
const currentProjectId = ref<string | null>(null);
const selectedCharacterId = ref<number | null>(null);
const selectedWeaponKey = ref<string | null>(null);
const avatarCurrentLevel = ref<number>(1);
const avatarTargetLevel = ref<number>(90);
const talentCurrentLevels = ref<Array<number>>([]);
const talentTargetLevels = ref<Array<number>>([10, 10, 10]);
const weaponCurrentLevel = ref<number>(1);
const weaponTargetLevel = ref<number>(90);
const avatarAscended = ref<boolean>(false);
const weaponAscended = ref<boolean>(false);
const avatarTargetAscended = ref<boolean>(false);
const weaponTargetAscended = ref<boolean>(false);
const useBagWeaponSource = ref<boolean>(true);
const allowCrafting = ref<boolean>(true);
const useDust = ref<boolean>(false);
const useSolvent = ref<boolean>(false);
const uidList = shallowRef<Array<number>>([]);
const projects = shallowRef<Array<TGApp.Sqlite.Cultivation.Project>>([]);
const planEntries = shallowRef<Array<TGApp.Sqlite.Cultivation.EntryWithItems>>([]);
const roles = shallowRef<Array<TGApp.Sqlite.Character.TableTrans>>([]);
const weapons = shallowRef<Array<TGApp.App.UserCalc.WeaponOption>>([]);
const apiAvatars = shallowRef<Array<TGApp.Game.Calculate.AvatarListItem>>([]);
const apiWeapons = shallowRef<Array<TGApp.Game.Calculate.WeaponListItem>>([]);
const recordAvatars = shallowRef<Array<TGApp.Game.Record.Avatar>>([]);
const bagMaterials = shallowRef<Map<number, number>>(new Map());
const bagMaterialDetails = shallowRef<Map<number, TGApp.Sqlite.UserBag.MaterialTable>>(new Map());
const bagSourceUids = shallowRef<Set<number>>(new Set());
const syncAvatars = shallowRef<Array<TGApp.Game.Calculate.SyncAvatar>>([]);
const apiResultMaterials = shallowRef<Array<TGApp.App.UserCalc.ResultMaterial>>([]);
const apiAvatarRequirements = shallowRef<Array<CultivationMaterial>>([]);
const apiWeaponRequirements = shallowRef<Array<CultivationMaterial>>([]);
const apiCalculationResult = shallowRef<TGApp.Game.Calculate.Result>();
const editingEntry = shallowRef<TGApp.Sqlite.Cultivation.EntryWithItems>();

const conversionIntents = computed<Map<string, Array<TGApp.App.UserCalc.ConversionIntent>>>(() =>
  conversionStore.getIntents(currentUid.value ?? 0, currentProjectId.value ?? ""),
);
const hasBagDataSource = computed<boolean>(
  () => currentUid.value === undefined || bagSourceUids.value.has(currentUid.value),
);
const useApiCalculation = computed<boolean>(
  () => !isWindows || !hasBagDataSource.value || calculationMode.value === "api",
);
const isTargetEditor = computed<boolean>(() => viewTab.value === "calculator");
const editingPairedEntry = computed<TGApp.Sqlite.Cultivation.EntryWithItems | undefined>(() =>
  editingEntry.value ? getPairedPlanEntry(editingEntry.value) : undefined,
);
const characterSelectionReadonly = computed<boolean>(
  () => editingEntry.value?.type === "avatar" || editingPairedEntry.value?.type === "avatar",
);
const weaponSelectionReadonly = computed<boolean>(
  () => editingEntry.value?.type === "weapon" || editingPairedEntry.value?.type === "weapon",
);
const currentTimezone = computed<number>(() => getUidServerTimezone(currentUid.value ?? 0));

function getPairedPlanEntry(
  entry: TGApp.Sqlite.Cultivation.EntryWithItems,
): TGApp.Sqlite.Cultivation.EntryWithItems | undefined {
  const stored = entry.apiResult;
  if (!stored?.avatarEntryId || !stored.weaponEntryId) return undefined;
  const partnerId = entry.type === "avatar" ? stored.weaponEntryId : stored.avatarEntryId;
  const partner = planEntries.value.find((item) => item.id === partnerId);
  if (partner && partner.id !== entry.id) return partner;
  return undefined;
}

// 选项域
const {
  localCharacterOptions,
  apiCharacterOptions,
  characterOptions,
  selectedCharacter,
  selectedRole,
  selectedApiAvatar,
  selectedSyncAvatar,
  selectedRoleWeaponType,
  hasBagWeaponData,
  weaponOptions,
  selectedWeapon,
  restoreCharacterSelection,
  selectPreferredWeapon,
} = useCultivationOptions({
  roles,
  weapons,
  apiAvatars,
  apiWeapons,
  recordAvatars,
  syncAvatars,
  selectedCharacterId,
  selectedWeaponKey,
  useBagWeaponSource,
  useApiCalculation,
  weaponSelectionReadonly,
  editingEntry,
});

// 数据域；计划域在下方才创建，这里用惰性转发接住反向依赖。
const {
  reload,
  importInventory,
  switchEditingCalculationMode,
  resolveApiAccount,
  requestSyncAvatars,
  saveCalculateInventory,
  loadInventoryData,
  dataLoadVersion,
} = useCultivationData({
  isWindows,
  currentUid,
  calculationMode,
  useApiCalculation,
  summaryVisible,
  loading,
  planLoading,
  selectedCharacterId,
  selectedWeaponKey,
  useBagWeaponSource,
  uidList,
  bagSourceUids,
  roles,
  weapons,
  apiAvatars,
  apiWeapons,
  recordAvatars,
  syncAvatars,
  bagMaterials,
  bagMaterialDetails,
  projects,
  planEntries,
  currentProjectId,
  apiCharacterOptions,
  localCharacterOptions,
  restoreCharacterSelection,
  selectPreferredWeapon,
  loadProjects: (uid, preferredProjectId) => loadProjects(uid, preferredProjectId),
  syncBagWeaponPlanEntries: (uid, requestVersion) => syncBagWeaponPlanEntries(uid, requestVersion),
});

// 编辑器域
const {
  isTraveler,
  bagCalculationTitle,
  apiCalculationTitle,
  avatarCurrentStateEditable,
  weaponCurrentStateEditable,
  avatarLevelOptions,
  avatarTalentLevelMax,
  weaponLevelOptions,
  avatarAtAscensionLevel,
  avatarTargetAtAscensionLevel,
  weaponAtAscensionLevel,
  weaponTargetAtAscensionLevel,
  weaponCurrentPromoteLevel,
  displaySkills,
  avatarRequiredMaterials,
  weaponRequiredMaterials,
  mainSkills,
  currentTalentLevels,
  createAvatarPlanInput,
  createWeaponPlanInput,
  startAddingTarget,
  cancelEditing,
  editPlanEntry,
} = useCultivationCalculator({
  isWindows,
  hasBagDataSource,
  useApiCalculation,
  viewTab,
  calculationMode,
  editingEntry,
  getPairedPlanEntry,
  switchEditingCalculationMode,
  selectedCharacter,
  selectedRole,
  selectedApiAvatar,
  selectedSyncAvatar,
  selectedWeapon,
  weaponOptions,
  selectPreferredWeapon,
  selectedCharacterId,
  selectedWeaponKey,
  avatarCurrentLevel,
  avatarTargetLevel,
  talentCurrentLevels,
  talentTargetLevels,
  weaponCurrentLevel,
  weaponTargetLevel,
  avatarAscended,
  weaponAscended,
  avatarTargetAscended,
  weaponTargetAscended,
  allowCrafting,
  useDust,
  useSolvent,
  apiAvatarRequirements,
  apiWeaponRequirements,
});

// 接口计算域
const {
  calculateWithApi,
  calculateApiRefreshTarget,
  createApiRefreshTargets,
  createApiRefreshInputsFromResult,
} = useCultivationApiCalc({
  currentUid,
  calculationMode,
  selectedCharacterId,
  selectedWeaponKey,
  avatarCurrentLevel,
  avatarTargetLevel,
  weaponCurrentLevel,
  weaponTargetLevel,
  avatarTargetAscended,
  weaponTargetAscended,
  talentCurrentLevels,
  talentTargetLevels,
  apiLoading,
  apiCalculated,
  apiResultMaterials,
  apiAvatarRequirements,
  apiWeaponRequirements,
  apiCalculationResult,
  selectedCharacter,
  selectedApiAvatar,
  selectedSyncAvatar,
  selectedWeapon,
  mainSkills,
  currentTalentLevels,
  resolveApiAccount,
  saveCalculateInventory,
  loadInventoryData,
  dataLoadVersion,
});

// 汇总域
const {
  inventoryUpdatedLabel,
  canApiCalculate,
  canSaveToPlan,
  planInventory,
  planConversionOptions,
  planEntryMaterials,
  planResultMaterials,
  planMissingKinds,
  planEntryCounts,
  conversionOptions,
  displayResultMaterials,
  missingKinds,
  resultBagMaterialDetails,
  resultEmptyText,
} = useCultivationSummary({
  hasBagDataSource,
  useApiCalculation,
  conversionIntents,
  currentProjectId,
  loading,
  apiLoading,
  planLoading,
  planContextReady,
  apiCalculated,
  editingEntry,
  planEntries,
  bagMaterials,
  bagMaterialDetails,
  apiResultMaterials,
  apiAvatarRequirements,
  apiWeaponRequirements,
  apiCalculationResult,
  avatarRequiredMaterials,
  weaponRequiredMaterials,
  createAvatarPlanInput,
  createWeaponPlanInput,
  selectedApiAvatar,
  selectedWeapon,
});

// 计划域
const {
  currentProject,
  projectOptions,
  loadProjects,
  createPlan,
  renamePlan,
  removePlan,
  saveToPlan,
  applyConversion,
  resetConversions,
  updatePlanEntryStatus,
  removePlanEntry,
  updatePlanEntryOrder,
  syncBagWeaponPlanEntries,
  refreshPlanEntries,
} = useCultivationPlan({
  currentUid,
  currentProjectId,
  viewTab,
  calculationMode,
  useApiCalculation,
  currentTimezone,
  editingEntry,
  planLoading,
  planContextReady,
  projects,
  planEntries,
  roles,
  bagMaterials,
  bagMaterialDetails,
  apiCalculationResult,
  allowCrafting,
  useDust,
  useSolvent,
  getPairedPlanEntry,
  createAvatarPlanInput,
  createWeaponPlanInput,
  canSaveToPlan,
  resolveApiAccount,
  requestSyncAvatars,
  saveCalculateInventory,
  loadInventoryData,
  dataLoadVersion,
  calculateApiRefreshTarget,
  createApiRefreshTargets,
  createApiRefreshInputsFromResult,
});

const editorTargetName = computed<string>(() => {
  if (editingEntry.value) return editingEntry.value.name;
  const targetNames: Array<string> = [];
  if (selectedCharacter.value) targetNames.push(selectedCharacter.value.name);
  if (selectedWeapon.value) targetNames.push(selectedWeapon.value.wiki.name);
  return targetNames.length > 0 ? targetNames.join("、") : "请选择养成目标";
});

onMounted(async () => {
  await reload();
  await applyRouteTarget();
});

async function applyRouteTarget(): Promise<void> {
  const targetType = typeof route.query.targetType === "string" ? route.query.targetType : "";
  const targetId = Number(route.query.targetId);
  if (!Number.isInteger(targetId) || targetId <= 0) return;
  editingEntry.value = undefined;
  viewTab.value = "calculator";
  if (targetType === "avatar") {
    selectedCharacterId.value = targetId;
    await nextTick();
    if (!selectedCharacter.value) {
      showSnackbar.warn("当前数据源中未找到该角色");
    }
  } else if (targetType === "weapon") {
    selectedCharacterId.value = null;
    useBagWeaponSource.value = false;
    await nextTick();
    selectedWeaponKey.value =
      weaponOptions.value.find((weapon) => weapon.wiki.id === targetId)?.key ?? null;
    if (!selectedWeaponKey.value) {
      showSnackbar.warn("当前数据源中未找到该武器");
    }
  }
  await router.replace({ path: route.path, query: {} });
}
</script>

<style lang="scss" scoped>
.cultivation-title {
  display: flex;
  align-items: center;
  padding-left: 12px;
  font-family: var(--font-title);
  font-size: 20px;
  gap: 8px;
}

.cultivation-nav-actions {
  display: flex;
  align-items: center;
  padding-right: 8px;
  gap: 8px;
}

.cultivation-nav-select {
  flex: none;

  &.uid-select {
    width: 180px;
  }

  &.project-select {
    width: 220px;
  }
}

.cultivation-page {
  display: flex;
  overflow: hidden;
  width: 100%;
  height: calc(100dvh - var(--v-layout-top) - var(--v-layout-bottom) - 32px);
  min-height: 0;
  box-sizing: border-box;
  flex-direction: column;
  gap: 12px;
}

.cultivation-config {
  display: grid;
  align-items: stretch;
  gap: 12px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.cultivation-plan-toolbar,
.cultivation-editor-toolbar,
.cultivation-plan-summary,
.cultivation-plan-heading,
.cultivation-editor-main,
.cultivation-editor-heading,
.cultivation-plan-actions,
.cultivation-mode-actions {
  display: flex;
  align-items: center;
  color: var(--box-text-1);
}

.cultivation-plan-toolbar,
.cultivation-editor-toolbar {
  width: 100%;
  height: 100%;
  flex-wrap: nowrap;
  justify-content: space-between;
  padding: 8px 16px;
  border-top: 1px solid var(--common-shadow-1);
  gap: 16px;
  overflow-x: auto;
}

.cultivation-editor-main {
  min-width: 0;
  flex: 1 0 auto;
  gap: 12px;
}

.cultivation-editor-heading {
  gap: 8px;
}

.cultivation-editor-heading > span {
  font-family: var(--font-title);
  font-size: 16px;
  font-weight: normal;
}

.cultivation-plan-summary {
  min-width: 0;
  flex: 1 0 auto;
  flex-wrap: wrap;
  gap: 8px;
}

.cultivation-plan-heading {
  gap: 8px;
}

.cultivation-plan-heading > span {
  font-family: var(--font-title);
  font-size: 16px;
  font-weight: normal;
}

.cultivation-plan-statuses {
  display: flex;
  align-items: center;
  color: var(--common-text-sub);
  font-size: 12px;
  gap: 8px;

  span {
    padding-left: 8px;
    border-left: 3px solid var(--common-shadow-2);
  }

  .active {
    border-left-color: var(--tgc-od-orange);
  }

  .fulfilled {
    border-left-color: var(--tgc-od-green);
  }
}

.cultivation-title :deep(.v-btn) {
  font-family: var(--font-text);
  font-size: 13px;
}

.cultivation-plan-actions,
.cultivation-mode-actions {
  gap: 8px;
}

.cultivation-plan-actions {
  flex: none;
}

.cultivation-tab-window {
  overflow: hidden;
  width: 100%;
  min-height: 0;
  flex: 1;

  :deep(.v-window__container) {
    height: 100%;
  }
}

.cultivation-tab-content.v-window-item--active {
  display: flex;
  height: 100%;
  min-height: 0;
  flex-direction: column;
  padding-right: 4px;
  gap: 12px;
  overflow-y: auto;
}

.cultivation-empty {
  display: flex;
  min-height: 320px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--common-text-sub);
  gap: 12px;
}

@media (width <= 900px) {
  .cultivation-config {
    grid-template-columns: 1fr;
  }
}

@media (width <= 600px) {
  .cultivation-plan-actions {
    width: 100%;
  }

  .cultivation-plan-actions {
    justify-content: flex-start;
  }

  .cultivation-mode-actions {
    justify-content: flex-end;
  }
}
</style>
