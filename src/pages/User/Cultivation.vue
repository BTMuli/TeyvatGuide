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
          :items="uidList"
          class="cultivation-nav-select uid-select"
          density="compact"
          label="数据 UID"
          variant="outlined"
        />
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
            :entry-materials="planAllocation.entries"
            :entries="planEntries"
            :inventory="planInventory"
            :timezone="currentProject?.timezone ?? currentTimezone"
            :uid="currentUid ?? 0"
            @add="startAddingTarget"
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
            :show-crafting-options="!useApiCalculation"
            :uid="currentUid ?? 0"
          />
        </v-window-item>
      </v-window>
    </template>
  </div>

  <UcPlanSummaryOverlay
    v-if="currentProject"
    v-model="summaryVisible"
    :bag-materials="bagMaterialDetails"
    :inventory-updated-label="inventoryUpdatedLabel"
    :materials="planResultMaterials"
    :project="currentProject"
    :target-counts="planEntryCounts"
    :uid="currentUid ?? 0"
  />
</template>

<script lang="ts" setup>
import showDialog from "@comp/func/dialog.js";
import showLoading from "@comp/func/loading.js";
import showSnackbar from "@comp/func/snackbar.js";
import UcCharacterPanel from "@comp/userCalc/uc-character-panel.vue";
import UcMaterialResult from "@comp/userCalc/uc-material-result.vue";
import UcPlanSummaryOverlay from "@comp/userCalc/uc-plan-summary-overlay.vue";
import UcPlanTargetList from "@comp/userCalc/uc-plan-target-list.vue";
import UcWeaponPanel from "@comp/userCalc/uc-weapon-panel.vue";
import gameEnum from "@enum/game.js";
import recordReq from "@req/recordReq.js";
import takumiReq from "@req/takumiReq.js";
import TSCultivationPlan from "@Sqlm/cultivationPlan.js";
import TSUserAccount from "@Sqlm/userAccount.js";
import TSUserAvatar from "@Sqlm/userAvatar.js";
import TSUserBagMaterial from "@Sqlm/userBagMaterial.js";
import TSUserBagWeapon from "@Sqlm/userBagWeapon.js";
import TSUserRecord from "@Sqlm/userRecord.js";
import useAppStore from "@store/app.js";
import useUserStore from "@store/user.js";
import { platform } from "@tauri-apps/plugin-os";
import { getRfAc } from "@utils/acUtils.js";
import {
  allocatePlanMaterials,
  buildCultivationResults,
  getCalculateInventory,
  getUidServerTimezone,
  mergePlanInventory,
  sortCultivationResults,
} from "@utils/cultivationPlan.js";
import { tryCallYae } from "@utils/TGGame.js";
import TGHttps from "@utils/TGHttps.js";
import { getRcStar, getZhElement, timestampToDate } from "@utils/toolFunc.js";
import userCalc, { type CultivationMaterial } from "@utils/userCalc.js";
import { storeToRefs } from "pinia";
import { computed, nextTick, onMounted, ref, shallowRef, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import {
  AppCharacterData,
  AppWeaponData,
  getWikiCharacterById,
  WikiMaterialData,
  wwWeapon,
} from "@/data/index.js";

const EXCLUDED_CHARACTER_IDS = new Set([10000117, 10000118]);
const TRAVELER_IDS = new Set([10000005, 10000007]);
const CHARACTER_WIKI_ORDER = new Map(
  [...AppCharacterData]
    .sort(
      (a, b) =>
        (b.star % 100) - (a.star % 100) ||
        new Date(b.release).getTime() - new Date(a.release).getTime() ||
        b.id - a.id,
    )
    .map((character, index) => [character.id, index]),
);
const WEAPON_WIKI_ORDER = new Map(
  [...AppWeaponData]
    .sort((a, b) => b.star - a.star || a.weapon.localeCompare(b.weapon) || b.id - a.id)
    .map((weapon, index) => [weapon.id, index]),
);
const EMPTY_BAG_MATERIAL_DETAILS: ReadonlyMap<number, TGApp.Sqlite.UserBag.MaterialTable> =
  new Map();

type CalculationMode = TGApp.Sqlite.Cultivation.CalculationMode;
type CultivationViewTab = "calculator" | "targets";
type ApiRefreshTarget = {
  avatar: TGApp.Game.Calculate.SyncAvatar;
  avatarEntry?: TGApp.Sqlite.Cultivation.EntryWithItems;
  weaponEntry?: TGApp.Sqlite.Cultivation.EntryWithItems;
};
type LocalAvatarRefreshResult = {
  roles: Array<TGApp.Sqlite.Character.TableTrans>;
  refreshedIds: ReadonlySet<number>;
};

const { account, cookie } = storeToRefs(useUserStore());
const { gameDir } = storeToRefs(useAppStore());
const route = useRoute();
const router = useRouter();

const isWindows = platform() === "windows";
const loading = ref<boolean>(false);
const apiLoading = ref<boolean>(false);
const planLoading = ref<boolean>(false);
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
const recordAvatars = shallowRef<Array<TGApp.Sqlite.Record.Avatar>>([]);
const bagMaterials = shallowRef<Map<number, number>>(new Map());
const bagMaterialDetails = shallowRef<Map<number, TGApp.Sqlite.UserBag.MaterialTable>>(new Map());
const bagSourceUids = shallowRef<Set<number>>(new Set());
const avatarWiki = shallowRef<TGApp.App.Character.WikiItem | false>(false);
const syncAvatars = shallowRef<Array<TGApp.Game.Calculate.SyncAvatar>>([]);
const apiResultMaterials = shallowRef<Array<TGApp.App.UserCalc.ResultMaterial>>([]);
const apiAvatarRequirements = shallowRef<Array<CultivationMaterial>>([]);
const apiWeaponRequirements = shallowRef<Array<CultivationMaterial>>([]);
const apiCalculationResult = shallowRef<TGApp.Game.Calculate.Result>();
const editingEntry = shallowRef<TGApp.Sqlite.Cultivation.EntryWithItems>();
let apiResultVersion = 0;
let dataLoadVersion = 0;
let settingCalculationMode = false;
let settingUid = false;
let settingProject = false;

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
const editorTargetName = computed<string>(() => {
  if (editingEntry.value) return editingEntry.value.name;
  const targetNames: Array<string> = [];
  if (selectedCharacter.value) targetNames.push(selectedCharacter.value.name);
  if (selectedWeapon.value) targetNames.push(selectedWeapon.value.wiki.name);
  return targetNames.length > 0 ? targetNames.join("、") : "请选择养成目标";
});
const currentTimezone = computed<number>(() => getUidServerTimezone(currentUid.value ?? 0));
const currentProject = computed<TGApp.Sqlite.Cultivation.Project | undefined>(() =>
  projects.value.find((project) => project.id === currentProjectId.value),
);
const projectOptions = computed<Array<{ title: string; value: string }>>(() =>
  projects.value.map((project) => ({ title: project.name, value: project.id })),
);
const inventoryUpdatedLabel = computed<string>(() => {
  const apiUpdated = planEntries.value
    .filter((entry) => entry.calculationMode === "api")
    .map((entry) => entry.apiResult?.updated ?? "");
  const updated = [
    ...Array.from(bagMaterialDetails.value.values()).map((material) => material.updated),
    ...apiUpdated,
  ]
    .filter((value) => value.length > 0)
    .sort((a, b) => b.localeCompare(a))[0];
  if (!updated) return hasBagDataSource.value ? "暂无背包更新时间" : "暂无接口数据更新时间";
  const source = apiUpdated.some((value) => value.length > 0)
    ? hasBagDataSource.value
      ? "数据"
      : "接口数据"
    : "背包";
  return `${source}更新于 ${formatUpdated(updated)}`;
});

function formatUpdated(value: string): string {
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? value : timestampToDate(timestamp);
}

const localCharacterOptions = computed<Array<TGApp.App.UserCalc.CharacterOption>>(() => {
  const roleMap = new Map(roles.value.map((role) => [role.cid, role]));
  const characterCatalog = Array.from(
    new Map(
      AppCharacterData.filter((character) => !EXCLUDED_CHARACTER_IDS.has(character.id)).map(
        (character) => [character.id, character],
      ),
    ).values(),
  );
  const options = characterCatalog.map((character) => {
    const role = roleMap.get(character.id);
    return role
      ? createLocalCharacterOption(role)
      : {
          title: `${character.name} · 未拥有`,
          value: character.id,
          name: character.name,
          icon: `/WIKI/character/${character.id}.webp`,
          element: character.element,
          star: character.star % 100,
          level: 1,
          owned: false,
          constellation: 0,
          fetter: 0,
          weaponType: character.weapon,
        };
  });
  for (const role of roles.value) {
    if (!options.some((option) => option.value === role.cid)) {
      options.push(createLocalCharacterOption(role));
    }
  }
  return options.sort(compareCharacterOptions);
});
const apiAvatarCatalog = computed<Array<TGApp.Game.Calculate.AvatarListItem>>(() => {
  const catalogMap = new Map<number, TGApp.Game.Calculate.AvatarListItem>();
  for (const avatar of apiAvatars.value) {
    if (TRAVELER_IDS.has(avatar.id) || catalogMap.has(avatar.id)) continue;
    catalogMap.set(avatar.id, avatar);
  }
  const traveler = findCurrentTraveler(apiAvatars.value, recordAvatars.value, syncAvatars.value);
  if (traveler) catalogMap.set(traveler.id, traveler);
  return Array.from(catalogMap.values());
});
const apiCharacterOptions = computed<Array<TGApp.App.UserCalc.CharacterOption>>(() => {
  const options = apiAvatarCatalog.value.map((avatar) => {
    const synced = findSyncedAvatar(avatar, syncAvatars.value);
    return {
      title: synced ? `${avatar.name} · Lv.${synced.level_current}` : `${avatar.name} · 未拥有`,
      value: avatar.id,
      name: avatar.name,
      icon: avatar.icon,
      element: getElementNameByAttrId(avatar.element_attr_id),
      star: avatar.avatar_level,
      level: synced?.level_current ?? 1,
      owned: synced !== undefined,
      constellation: synced?.constellation_num ?? 0,
      fetter: synced?.fetter_level ?? 0,
      weaponType: getWeaponTypeByCategory(avatar.weapon_cat_id),
    };
  });
  for (const avatar of syncAvatars.value) {
    if (options.some((option) => option.value === avatar.id)) continue;
    options.push(createSyncCharacterOption(avatar));
  }
  return options.sort(compareCharacterOptions);
});
const characterOptions = computed<Array<TGApp.App.UserCalc.CharacterOption>>(() =>
  useApiCalculation.value ? apiCharacterOptions.value : localCharacterOptions.value,
);
const selectedCharacter = computed<TGApp.App.UserCalc.CharacterOption | undefined>(() =>
  characterOptions.value.find((option) => option.value === selectedCharacterId.value),
);
const selectedRole = computed<TGApp.Sqlite.Character.TableTrans | undefined>(() =>
  useApiCalculation.value
    ? undefined
    : roles.value.find((role) => role.cid === selectedCharacterId.value),
);
const selectedApiAvatar = computed<TGApp.Game.Calculate.AvatarListItem | undefined>(() =>
  useApiCalculation.value
    ? apiAvatarCatalog.value.find((avatar) => avatar.id === selectedCharacterId.value)
    : undefined,
);
const selectedSyncAvatar = computed<TGApp.Game.Calculate.SyncAvatar | undefined>(() =>
  useApiCalculation.value
    ? selectedApiAvatar.value
      ? findSyncedAvatar(selectedApiAvatar.value, syncAvatars.value)
      : syncAvatars.value.find((avatar) => avatar.id === selectedCharacterId.value)
    : undefined,
);
const avatarCurrentStateEditable = computed<boolean>(
  () =>
    selectedCharacter.value !== undefined &&
    selectedRole.value === undefined &&
    selectedSyncAvatar.value === undefined,
);
const isTraveler = computed<boolean>(() => TRAVELER_IDS.has(selectedCharacter.value?.value ?? 0));
const bagCalculationTitle = computed<string>(() => {
  if (isTraveler.value) return "旅行者仅支持接口计算";
  if (!isWindows) return "当前平台不支持读取游戏背包";
  if (!hasBagDataSource.value) return "当前 UID 没有背包存档";
  return "根据本地 Wiki 与背包存档实时计算";
});
const apiCalculationTitle = computed<string>(() => {
  if (isTraveler.value) return "旅行者将通过米游社接口计算材料";
  if (!isWindows) return "当前平台不支持读取游戏背包，材料将由米游社接口计算";
  if (!hasBagDataSource.value) return "当前 UID 没有背包存档，数据将由米游社接口同步并计算";
  return "设置目标后点击确认计算，届时才会请求接口";
});
const selectedRoleWeaponType = computed<string>(() => {
  return selectedCharacter.value?.weaponType ?? "";
});
const hasBagWeaponData = computed<boolean>(
  () => !useApiCalculation.value && weapons.value.some((weapon) => weapon.source === "bag"),
);
const weaponOptions = computed<Array<TGApp.App.UserCalc.WeaponOption>>(() => {
  if (useApiCalculation.value) {
    return buildApiWeaponOptions(apiWeapons.value, syncAvatars.value).filter(
      (weapon) =>
        !selectedRoleWeaponType.value || weapon.wiki.weapon === selectedRoleWeaponType.value,
    );
  }
  const selectedSource = hasBagWeaponData.value && useBagWeaponSource.value ? "bag" : "equipped";
  const sourceWeaponIds = new Set(
    weapons.value
      .filter((weapon) => weapon.source === selectedSource)
      .map((weapon) => weapon.wiki.id),
  );
  return weapons.value.filter(
    (weapon) =>
      (weapon.source === selectedSource ||
        (weapon.source === "catalog" && !sourceWeaponIds.has(weapon.wiki.id))) &&
      (!selectedRoleWeaponType.value || weapon.wiki.weapon === selectedRoleWeaponType.value),
  );
});
const selectedWeapon = computed<TGApp.App.UserCalc.WeaponOption | undefined>(() =>
  weaponOptions.value.find((weapon) => weapon.key === selectedWeaponKey.value),
);
const weaponCurrentStateEditable = computed<boolean>(
  () => selectedWeapon.value !== undefined && selectedWeapon.value.source !== "bag",
);
const canApiCalculate = computed<boolean>(
  () =>
    !apiLoading.value &&
    (selectedApiAvatar.value !== undefined || selectedWeapon.value !== undefined),
);
const mainSkills = computed<Array<TGApp.App.UserCalc.SkillOption>>(() => {
  if (selectedSyncAvatar.value) {
    return selectedSyncAvatar.value.skill_list
      .filter((skill) => skill.max_level > 1)
      .map((skill) => ({
        id: skill.id,
        name: skill.name,
        icon: skill.icon,
        level: skill.level_current,
        maxLevel: skill.max_level,
      }));
  }
  if (selectedApiAvatar.value) {
    return selectedApiAvatar.value.skill_list
      .filter((skill) => skill.max_level > 1)
      .map((skill) => ({
        id: skill.id,
        name: skill.name,
        icon: skill.icon,
        level: 1,
        maxLevel: skill.max_level,
      }));
  }
  const roleSkills = selectedRole.value?.skills ?? [];
  if (!selectedRole.value && avatarWiki.value) {
    return avatarWiki.value.skills
      .filter((skill) => skill.maxLv > 1)
      .map((skill) => ({
        id: skill.id,
        name: skill.name,
        icon: `/icon/talents/${skill.icon}.webp`,
        level: 1,
        maxLevel: skill.maxLv,
      }));
  }
  if (!avatarWiki.value) {
    return roleSkills
      .filter((skill) => skill.skill_type === 1 && skill.is_unlock)
      .slice(0, 3)
      .map((skill) => ({
        id: skill.skill_id,
        name: skill.name,
        icon: skill.icon,
        level: skill.level,
        maxLevel: 10,
      }));
  }
  return userCalc
    .recordTalentSkills(selectedRole.value, avatarWiki.value)
    .map(({ recordSkill, wikiSkill }) => ({
      id: wikiSkill.id,
      name: recordSkill.name,
      icon: recordSkill.icon,
      level: recordSkill.level,
      maxLevel: wikiSkill.maxLv,
    }));
});
const currentTalentLevels = computed<Array<number>>(() => {
  if (avatarCurrentStateEditable.value) {
    return mainSkills.value.map((skill, index) => talentCurrentLevels.value[index] ?? skill.level);
  }
  const levels = mainSkills.value.map((skill) => skill.level);
  if (useApiCalculation.value) return levels;
  if (!avatarWiki.value) return levels;
  if (selectedRole.value) return userCalc.recordTalentLevels(selectedRole.value, avatarWiki.value);
  return userCalc.correctedNamedTalentLevels(
    selectedCharacter.value?.constellation ?? 0,
    mainSkills.value,
    avatarWiki.value,
  );
});
const displaySkills = computed<Array<TGApp.App.UserCalc.SkillOption>>(() =>
  mainSkills.value.map((skill, index) => ({
    ...skill,
    level: currentTalentLevels.value[index] ?? skill.level,
  })),
);
const avatarLevelOptions = computed<Array<number>>(() => {
  if (!selectedCharacter.value) return [];
  return userCalc.avatarLevelOptions(
    useApiCalculation.value
      ? (selectedSyncAvatar.value?.max_level ?? selectedApiAvatar.value?.max_level ?? 90)
      : 100,
  );
});
const avatarTalentLevelMax = computed<number>(() =>
  userCalc.avatarTalentMaxLevel(avatarTargetLevel.value, avatarTargetAscended.value),
);
const weaponLevelOptions = computed<Array<number>>(() => {
  if (!selectedWeapon.value) return [];
  return createLevelOptions(
    selectedWeapon.value.api?.max_level ?? userCalc.weaponMaxLevel(selectedWeapon.value.wiki.star),
  );
});
const avatarAtAscensionLevel = computed<boolean>(() =>
  userCalc.isAscensionLevel(avatarCurrentLevel.value),
);
const weaponAtAscensionLevel = computed<boolean>(() =>
  userCalc.isAscensionLevel(weaponCurrentLevel.value),
);
const avatarTargetAtAscensionLevel = computed<boolean>(() =>
  userCalc.isAscensionLevel(avatarTargetLevel.value),
);
const weaponTargetAtAscensionLevel = computed<boolean>(() =>
  userCalc.isAscensionLevel(weaponTargetLevel.value),
);
const avatarCurrentPromoteLevel = computed<number>(() => {
  if (selectedSyncAvatar.value) return selectedSyncAvatar.value.promote_level;
  if (!selectedRole.value) {
    return userCalc.resolvePromoteLevel(
      avatarCurrentLevel.value,
      undefined,
      avatarAtAscensionLevel.value ? avatarAscended.value : undefined,
    );
  }
  const avatar = <TGApp.Game.Avatar.Avatar & { promote_level?: number }>selectedRole.value.avatar;
  return userCalc.resolvePromoteLevel(
    avatar.level,
    avatar.promote_level,
    avatarAtAscensionLevel.value ? avatarAscended.value : undefined,
  );
});
const weaponCurrentPromoteLevel = computed<number>(() => {
  if (!selectedWeapon.value) return 0;
  if (selectedWeapon.value.fromBag) return selectedWeapon.value.promoteLevel;
  return userCalc.resolvePromoteLevel(
    weaponCurrentLevel.value,
    undefined,
    weaponAtAscensionLevel.value ? weaponAscended.value : undefined,
  );
});

const avatarRequiredMaterials = computed<Array<CultivationMaterial>>(() => {
  if (!selectedCharacter.value || !avatarWiki.value) return [];
  return userCalc.avatarFromState(
    avatarWiki.value,
    avatarCurrentLevel.value,
    avatarCurrentPromoteLevel.value,
    currentTalentLevels.value,
    avatarTargetLevel.value,
    talentTargetLevels.value,
    avatarTargetAscended.value,
  );
});
const weaponRequiredMaterials = computed<Array<CultivationMaterial>>(() => {
  if (!selectedWeapon.value) return [];
  return userCalc.weapon(
    selectedWeapon.value.wiki,
    weaponCurrentLevel.value,
    weaponCurrentPromoteLevel.value,
    weaponTargetLevel.value,
    weaponTargetAscended.value,
  );
});
const requiredMaterials = computed<Array<CultivationMaterial>>(() =>
  userCalc.merge(avatarRequiredMaterials.value, weaponRequiredMaterials.value),
);
const localResultMaterials = computed<Array<TGApp.App.UserCalc.ResultMaterial>>(() =>
  buildCultivationResults(
    requiredMaterials.value,
    bagMaterials.value,
    WikiMaterialData,
    allowCrafting.value,
    useDust.value,
    useSolvent.value,
  ),
);
const planInventory = computed<Map<number, number>>(() =>
  mergePlanInventory(bagMaterials.value, bagMaterialDetails.value, planEntries.value),
);
const planAllocation = computed(() =>
  allocatePlanMaterials(planEntries.value, planInventory.value, WikiMaterialData),
);
const planResultMaterials = computed<Array<TGApp.App.UserCalc.ResultMaterial>>(
  () => planAllocation.value.materials,
);
const planMissingKinds = computed<number>(
  () => planResultMaterials.value.filter((material) => material.missing > 0).length,
);
const planEntryCounts = computed<{
  active: number;
  completed: number;
  fulfilled: number;
}>(() => {
  const fulfilled = (entry: TGApp.Sqlite.Cultivation.EntryWithItems): boolean =>
    (planAllocation.value.entries.get(entry.id) ?? []).every((material) => material.missing <= 0);
  return {
    active: planEntries.value.filter((entry) => entry.status === "active" && !fulfilled(entry))
      .length,
    completed: planEntries.value.filter((entry) => entry.status === "completed").length,
    fulfilled: planEntries.value.filter((entry) => entry.status === "active" && fulfilled(entry))
      .length,
  };
});
const canSaveToPlan = computed<boolean>(() => {
  if (planLoading.value) return false;
  if (useApiCalculation.value) {
    return (
      apiCalculated.value &&
      (apiAvatarRequirements.value.length > 0 || apiWeaponRequirements.value.length > 0)
    );
  }
  return avatarRequiredMaterials.value.length > 0 || weaponRequiredMaterials.value.length > 0;
});
const displayResultMaterials = computed<Array<TGApp.App.UserCalc.ResultMaterial>>(() =>
  useApiCalculation.value ? apiResultMaterials.value : localResultMaterials.value,
);
const missingKinds = computed<number>(
  () => displayResultMaterials.value.filter((material) => material.missing > 0).length,
);
const resultBagMaterialDetails = computed<ReadonlyMap<number, TGApp.Sqlite.UserBag.MaterialTable>>(
  () => (useApiCalculation.value ? EMPTY_BAG_MATERIAL_DETAILS : bagMaterialDetails.value),
);
const resultEmptyText = computed<string>(() => {
  if (!useApiCalculation.value) return "请选择角色或武器，并设置培养目标";
  if (apiCalculated.value) return "当前养成目标无需额外材料";
  return canApiCalculate.value
    ? "设置养成目标后，点击确认计算"
    : "请选择角色或武器，并确认该 UID 已保存可用的账号与 CK";
});

watch(
  currentUid,
  async (uid) => {
    if (settingUid || uid === undefined) return;
    summaryVisible.value = false;
    ensureCalculationMode(uid);
    await loadUidData(uid);
  },
  { flush: "sync" },
);

watch(
  () => account.value.gameUid,
  async (gameUid) => {
    const uid = Number(gameUid);
    if (!Number.isInteger(uid) || uid <= 0 || currentUid.value === uid) return;
    await reload(uid);
  },
  { flush: "sync" },
);

watch(
  calculationMode,
  async () => {
    if (settingCalculationMode || currentUid.value === undefined) return;
    await loadUidData(currentUid.value);
  },
  { flush: "sync" },
);

watch(
  currentProjectId,
  async (projectId) => {
    if (settingProject || projectId === null || currentUid.value === undefined) return;
    await TSCultivationPlan.chooseProject(currentUid.value, projectId);
    await loadProjects(currentUid.value, projectId);
  },
  { flush: "sync" },
);

watch(selectedCharacter, async (character) => {
  avatarWiki.value = false;
  if (!character) return;
  const characterId = character.value;
  avatarCurrentLevel.value = character.level;
  avatarTargetLevel.value = avatarLevelOptions.value.at(-1) ?? 90;
  avatarTargetAscended.value = false;
  talentCurrentLevels.value = mainSkills.value.map((skill) => skill.level);
  talentTargetLevels.value = mainSkills.value.map((skill) => skill.maxLevel);
  if (selectedSyncAvatar.value) {
    weaponTargetLevel.value = selectedSyncAvatar.value.weapon.max_level;
    avatarAscended.value = userCalc.isAscendedAtThreshold(
      selectedSyncAvatar.value.level_current,
      selectedSyncAvatar.value.promote_level,
    );
    selectPreferredWeapon();
  } else {
    const role = selectedRole.value;
    if (role) {
      const avatar = <TGApp.Game.Avatar.Avatar & { promote_level?: number }>role.avatar;
      avatarAscended.value = userCalc.isAscendedAtThreshold(avatar.level, avatar.promote_level);
    } else {
      avatarAscended.value = false;
    }
    selectPreferredWeapon();
  }
  const wiki = await getWikiCharacterById(characterId);
  if (selectedCharacterId.value === characterId) {
    avatarWiki.value = wiki;
    talentCurrentLevels.value = currentTalentLevels.value;
    talentTargetLevels.value = mainSkills.value.map((skill) => skill.maxLevel);
    applyAvatarEditingState();
  }
});

watch(isTraveler, (traveler) => {
  if (traveler) calculationMode.value = "api";
});

watch(
  [
    currentUid,
    selectedCharacterId,
    selectedWeaponKey,
    avatarCurrentLevel,
    avatarTargetLevel,
    weaponCurrentLevel,
    weaponTargetLevel,
    avatarTargetAscended,
    weaponTargetAscended,
    calculationMode,
    () => talentCurrentLevels.value.join(","),
    () => talentTargetLevels.value.join(","),
  ],
  clearApiResult,
);

watch(weaponOptions, () => selectPreferredWeapon());

watch(avatarTargetAtAscensionLevel, (atAscensionLevel) => {
  if (!atAscensionLevel) avatarTargetAscended.value = false;
});

watch(mainSkills, () => {
  talentTargetLevels.value = mainSkills.value.map((skill, index) => {
    const currentLevel = currentTalentLevels.value[index] ?? skill.level;
    const targetLevel = talentTargetLevels.value[index] ?? currentLevel;
    return Math.max(
      currentLevel,
      Math.min(targetLevel, skill.maxLevel, avatarTalentLevelMax.value),
    );
  });
});

watch(
  avatarCurrentLevel,
  (level) => {
    if (!avatarCurrentStateEditable.value) return;
    avatarTargetLevel.value = Math.max(avatarTargetLevel.value, level);
    avatarAscended.value = false;
  },
  { flush: "sync" },
);

watch(weaponTargetLevel, () => {
  weaponTargetAscended.value = false;
});

watch(
  weaponCurrentLevel,
  (level) => {
    if (!weaponCurrentStateEditable.value) return;
    weaponTargetLevel.value = Math.max(weaponTargetLevel.value, level);
    weaponAscended.value = false;
  },
  { flush: "sync" },
);

watch(selectedWeapon, (weapon) => {
  if (!weapon) return;
  weaponCurrentLevel.value = weapon.level;
  weaponTargetLevel.value = userCalc.weaponMaxLevel(weapon.wiki.star);
  weaponTargetAscended.value = false;
  weaponAscended.value = userCalc.isAscendedAtThreshold(weapon.level, weapon.promoteLevel);
  applyWeaponEditingState();
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

function createLevelOptions(max: number): Array<number> {
  return Array.from({ length: max }, (_, index) => index + 1);
}

function restoreCharacterSelection(
  previousCharacterId: number | null,
  options: ReadonlyArray<TGApp.App.UserCalc.CharacterOption>,
): number | null {
  if (options.some((option) => option.value === previousCharacterId)) return previousCharacterId;
  if (editingEntry.value !== undefined) return previousCharacterId;
  return options[0]?.value ?? null;
}

function selectPreferredWeapon(): void {
  const options = weaponOptions.value;
  if (options.length === 0) {
    selectedWeaponKey.value = null;
    return;
  }
  if (options.some((weapon) => weapon.key === selectedWeaponKey.value)) return;
  const roleWeaponId = selectedSyncAvatar.value?.weapon.id ?? selectedRole.value?.weapon.id;
  selectedWeaponKey.value =
    roleWeaponId === undefined
      ? null
      : (options.find((weapon) => weapon.wiki.id === roleWeaponId)?.key ?? null);
}

function clearApiResult(): void {
  apiResultVersion += 1;
  apiCalculated.value = false;
  apiResultMaterials.value = [];
  apiAvatarRequirements.value = [];
  apiWeaponRequirements.value = [];
  apiCalculationResult.value = undefined;
}

function ensureCalculationMode(uid: number): void {
  if (!isWindows || bagSourceUids.value.has(uid) || calculationMode.value === "api") return;
  settingCalculationMode = true;
  calculationMode.value = "api";
  settingCalculationMode = false;
}

function getElementNameByAttrId(elementAttrId: number): string {
  switch (elementAttrId) {
    case 1:
      return "火";
    case 2:
      return "风";
    case 3:
      return "岩";
    case 4:
      return "草";
    case 5:
      return "雷";
    case 6:
      return "水";
    case 7:
      return "冰";
    default:
      return "未知";
  }
}

function findCurrentTraveler(
  catalog: ReadonlyArray<TGApp.Game.Calculate.AvatarListItem>,
  records: ReadonlyArray<TGApp.Sqlite.Record.Avatar>,
  syncedAvatars: ReadonlyArray<TGApp.Game.Calculate.SyncAvatar>,
): TGApp.Game.Calculate.AvatarListItem | undefined {
  const record = records.find((avatar) => TRAVELER_IDS.has(avatar.id));
  if (record) {
    const recordElement = getZhElement(record.element);
    const normalizedElement = recordElement === "未知" ? record.element : recordElement;
    const matched = catalog.find(
      (avatar) =>
        avatar.id === record.id &&
        getElementNameByAttrId(avatar.element_attr_id) === normalizedElement,
    );
    if (matched) return matched;
  }
  const synced = syncedAvatars.find((avatar) => TRAVELER_IDS.has(avatar.id));
  if (!synced) return undefined;
  return catalog.find(
    (avatar) => avatar.id === synced.id && avatar.element_attr_id === synced.element_attr_id,
  );
}

function findSyncedAvatar(
  catalogAvatar: TGApp.Game.Calculate.AvatarListItem,
  syncedAvatars: ReadonlyArray<TGApp.Game.Calculate.SyncAvatar>,
): TGApp.Game.Calculate.SyncAvatar | undefined {
  return syncedAvatars.find(
    (avatar) =>
      avatar.id === catalogAvatar.id &&
      (!TRAVELER_IDS.has(avatar.id) || avatar.element_attr_id === catalogAvatar.element_attr_id),
  );
}

function getWeaponTypeByCategory(weaponCategoryId: number): string {
  switch (weaponCategoryId) {
    case 1:
      return "单手剑";
    case 10:
      return "法器";
    case 11:
      return "双手剑";
    case 12:
      return "弓";
    case 13:
      return "长柄武器";
    default:
      return "未知武器";
  }
}

function getWeaponCategoryByType(weaponType: string): number {
  switch (weaponType) {
    case "单手剑":
      return 1;
    case "法器":
      return 10;
    case "双手剑":
      return 11;
    case "弓":
      return 12;
    case "长柄武器":
      return 13;
    default:
      return 0;
  }
}

function createApiParams(
  refreshAccount: TGApp.Sqlite.Account.Game,
): TGApp.Game.Calculate.Params | undefined {
  const region = gameEnum.serverList.find((server) => server === refreshAccount.region);
  if (!region) return undefined;

  const avatar = selectedApiAvatar.value ?? selectedSyncAvatar.value;
  const weaponOption = selectedWeapon.value;
  if (!avatar && !weaponOption) return undefined;

  if (!avatar && weaponOption) {
    return {
      items: [
        {
          weapon: createApiWeaponTarget(weaponOption, weaponTargetLevel.value, false),
        },
      ],
      lang: "zh-cn",
      region,
      uid: refreshAccount.gameUid,
    };
  }
  if (!avatar || !selectedCharacter.value) return undefined;

  const talentTargets = new Map(
    mainSkills.value.map((skill, index) => [
      skill.id,
      talentTargetLevels.value[index] ?? skill.level,
    ]),
  );
  const currentTalentLevelMap = new Map(
    mainSkills.value.map((skill, index) => [
      skill.id,
      currentTalentLevels.value[index] ?? skill.level,
    ]),
  );
  const weapon: TGApp.Game.Calculate.WeaponTarget | null = weaponOption
    ? createApiWeaponTarget(weaponOption, weaponTargetLevel.value, true)
    : null;
  const syncedSkillMap = new Map(
    selectedSyncAvatar.value?.skill_list.map((skill) => [skill.id, skill]) ?? [],
  );

  return {
    items: [
      {
        avatar_id: avatar.id,
        avatar_level_current: avatarCurrentLevel.value,
        avatar_level_target: avatarTargetLevel.value,
        element_attr_id: avatar.element_attr_id,
        skill_list: avatar.skill_list.map((skill) => {
          const levelCurrent = Math.max(
            currentTalentLevelMap.get(skill.id) ?? syncedSkillMap.get(skill.id)?.level_current ?? 1,
            1,
          );
          return {
            id: skill.group_id,
            level_current: levelCurrent,
            level_target: Math.max(talentTargets.get(skill.id) ?? levelCurrent, 1),
          };
        }),
        weapon,
        from_user_sync: selectedSyncAvatar.value !== undefined,
        ...(selectedSyncAvatar.value
          ? { avatar_promote_level: selectedSyncAvatar.value.promote_level }
          : {}),
      },
    ],
    lang: "zh-cn",
    region,
    uid: refreshAccount.gameUid,
  };
}

function createApiWeaponTarget(
  weapon: TGApp.App.UserCalc.WeaponOption,
  levelTarget: number,
  includeDetails: boolean,
): TGApp.Game.Calculate.WeaponTarget {
  const target: TGApp.Game.Calculate.WeaponTarget = {
    id: weapon.wiki.id,
    level_current: weaponCurrentLevel.value,
    level_target: levelTarget,
    name: weapon.wiki.name,
  };
  if (!includeDetails) return target;
  return {
    ...target,
    icon: weapon.icon,
    max_level: weapon.api?.max_level ?? userCalc.weaponMaxLevel(weapon.wiki.star),
    weapon_cat_id: weapon.api?.weapon_cat_id ?? getWeaponCategoryByType(weapon.wiki.weapon),
    weapon_level: weapon.api?.weapon_level ?? weapon.wiki.star,
  };
}

function convertApiResult(
  result: TGApp.Game.Calculate.Result,
): Array<TGApp.App.UserCalc.ResultMaterial> {
  const available = getCalculateInventory(result);
  return sortCultivationResults(
    result.overall_consume.map((material) => {
      const wiki = WikiMaterialData.find((item) => item.id === material.id);
      const owned = available.get(material.id) ?? 0;
      return {
        id: material.id,
        name: wiki?.name ?? material.name,
        type: wiki?.type ?? "未知类型",
        star: wiki?.star ?? Math.max(material.level, 1),
        required: material.num,
        owned,
        craftable: 0,
        craftingCosts: [],
        missing: material.lack_num,
        progress:
          material.num === 0
            ? 100
            : Math.min(((material.num - material.lack_num) / material.num) * 100, 100),
      };
    }),
  );
}

async function calculateWithApi(): Promise<void> {
  const uid = currentUid.value;
  if (apiLoading.value || uid === undefined) return;
  const refreshAccount = await resolveApiAccount(uid, "Cultivation.calculateWithApi");
  if (!refreshAccount) return;
  const params = createApiParams(refreshAccount.account);
  if (!params) {
    showSnackbar.warn("请先选择角色、武器并设置养成目标");
    return;
  }

  clearApiResult();
  const requestVersion = apiResultVersion;
  apiLoading.value = true;
  try {
    const response = await takumiReq.calculate.batch(refreshAccount.cookie, params);
    if (requestVersion !== apiResultVersion) return;
    if (response.retcode !== 0) {
      showSnackbar.error(`[${response.retcode}] ${response.message}`);
      return;
    }
    const itemResult = response.data.items[0];
    apiAvatarRequirements.value = itemResult
      ? userCalc.merge(
          toCultivationMaterials(itemResult.avatar_consume),
          toCultivationMaterials(itemResult.avatar_skill_consume),
        )
      : [];
    apiWeaponRequirements.value = itemResult
      ? toCultivationMaterials(itemResult.weapon_consume)
      : [];
    const changedMaterials = await saveCalculateInventory(uid, response.data);
    if (requestVersion !== apiResultVersion) return;
    if (changedMaterials > 0) await loadInventoryData(uid, dataLoadVersion);
    apiResultMaterials.value = convertApiResult(response.data);
    apiCalculationResult.value = response.data;
    if (requestVersion !== apiResultVersion) return;
    apiCalculated.value = true;
    showSnackbar.success("养成材料计算完成");
  } catch (error) {
    if (requestVersion === apiResultVersion) {
      showSnackbar.error(`养成材料计算失败：${TGHttps.getErrMsg(error)}`);
    }
  } finally {
    apiLoading.value = false;
  }
}

async function reload(preferredUid?: number): Promise<void> {
  loading.value = true;
  try {
    const loginUid = Number(account.value.gameUid);
    const [planUids, avatarUids, materialUids, weaponUids, savedAccounts] = await Promise.all([
      TSCultivationPlan.getAllUid(),
      TSUserAvatar.getAllUid(),
      TSUserBagMaterial.getAllUid(),
      TSUserBagWeapon.getAllUid(),
      TSUserAccount.account.getAllAccount(),
    ]);
    const savedGameAccounts = (
      await Promise.all(
        savedAccounts.map((savedAccount) => TSUserAccount.game.getAccount(savedAccount.uid)),
      )
    ).flat();
    const savedGameUids = savedGameAccounts
      .filter((gameAccount) => gameAccount.gameBiz === "hk4e_cn")
      .map((gameAccount) => Number(gameAccount.gameUid))
      .filter((uid) => Number.isInteger(uid) && uid > 0);
    const loginUids = Number.isInteger(loginUid) && loginUid > 0 ? [loginUid] : [];
    bagSourceUids.value = new Set([...materialUids, ...weaponUids]);
    uidList.value = Array.from(
      new Set([
        ...loginUids,
        ...savedGameUids,
        ...avatarUids.map(Number),
        ...materialUids,
        ...weaponUids,
        ...planUids,
      ]),
    ).sort((a, b) => a - b);
    const nextUid =
      preferredUid !== undefined && uidList.value.includes(preferredUid)
        ? preferredUid
        : uidList.value.includes(loginUid)
          ? loginUid
          : uidList.value[0];
    settingUid = true;
    currentUid.value = nextUid;
    settingUid = false;
    if (nextUid !== undefined) {
      ensureCalculationMode(nextUid);
      await loadUidData(nextUid);
    } else {
      projects.value = [];
      planEntries.value = [];
      currentProjectId.value = null;
    }
  } finally {
    loading.value = false;
  }
}

async function loadUidData(uid: number): Promise<void> {
  const requestVersion = ++dataLoadVersion;
  loading.value = true;
  try {
    if (useApiCalculation.value) {
      await loadApiData(uid, requestVersion);
      await loadInventoryData(uid, requestVersion);
    } else {
      await loadLocalData(uid, requestVersion);
    }
    if (requestVersion === dataLoadVersion) {
      await loadProjects(uid);
      await syncBagWeaponPlanEntries(uid, requestVersion);
    }
  } finally {
    if (requestVersion === dataLoadVersion) loading.value = false;
  }
}

async function loadApiData(uid: number, requestVersion: number): Promise<void> {
  const previousCharacterId = selectedCharacterId.value;
  try {
    const refreshAccount = await resolveApiAccount(uid, "Cultivation.loadSyncAvatarData");
    if (!refreshAccount) {
      clearApiData(requestVersion);
      return;
    }
    const [avatars, avatarCatalog, weaponCatalog, record] = await Promise.all([
      requestSyncAvatars(refreshAccount),
      requestAllAvatars(refreshAccount),
      requestAllWeapons(refreshAccount),
      TSUserRecord.getRecord(uid),
    ]);
    if (requestVersion !== dataLoadVersion || !useApiCalculation.value) return;
    recordAvatars.value = record ? record.avatars : [];
    syncAvatars.value = avatars;
    apiAvatars.value = avatarCatalog;
    apiWeapons.value = weaponCatalog;
    selectedWeaponKey.value = null;
    selectedCharacterId.value = restoreCharacterSelection(
      previousCharacterId,
      apiCharacterOptions.value,
    );
    if (selectedCharacterId.value === null) selectPreferredWeapon();
  } catch (error) {
    if (requestVersion !== dataLoadVersion) return;
    recordAvatars.value = [];
    apiAvatars.value = [];
    apiWeapons.value = [];
    syncAvatars.value = [];
    selectedCharacterId.value = null;
    selectedWeaponKey.value = null;
    showSnackbar.error(`加载接口养成数据失败：${TGHttps.getErrMsg(error)}`);
  }
}

function clearApiData(requestVersion: number): void {
  if (requestVersion !== dataLoadVersion) return;
  recordAvatars.value = [];
  apiAvatars.value = [];
  apiWeapons.value = [];
  syncAvatars.value = [];
  selectedCharacterId.value = null;
  selectedWeaponKey.value = null;
}

async function resolveApiAccount(
  uid: number,
  logPrefix: string,
): Promise<TGApp.App.Account.RfAc | null> {
  const refreshAccount = await getRfAc(String(uid), account.value, cookie.value, logPrefix);
  if (!refreshAccount) return null;
  if (Number(refreshAccount.account.gameUid) !== uid) {
    showSnackbar.warn(`未找到 UID ${uid} 对应的账号与 CK，已取消接口计算`);
    return null;
  }
  return refreshAccount;
}

async function requestSyncAvatars(
  refreshAccount: TGApp.App.Account.RfAc,
): Promise<Array<TGApp.Game.Calculate.SyncAvatar>> {
  const region = gameEnum.serverList.find((server) => server === refreshAccount.account.region);
  if (!region) throw new Error(`不支持的游戏服务器：${refreshAccount.account.region}`);
  const response = await takumiReq.calculate.avatar.sync(refreshAccount.cookie, {
    element_attr_ids: [],
    lang: "zh-cn",
    page: 1,
    region,
    size: 200,
    uid: refreshAccount.account.gameUid,
    weapon_cat_ids: [],
  });
  if (response.retcode !== 0) throw new Error(`[${response.retcode}] ${response.message}`);
  return response.data.list.filter((avatar) => !EXCLUDED_CHARACTER_IDS.has(avatar.id));
}

async function requestAllAvatars(
  refreshAccount: TGApp.App.Account.RfAc,
): Promise<Array<TGApp.Game.Calculate.AvatarListItem>> {
  const response = await takumiReq.calculate.avatar.list(refreshAccount.cookie, {
    element_attr_ids: [],
    is_all: true,
    lang: "zh-cn",
    page: 1,
    size: 200,
    weapon_cat_ids: [],
  });
  if (response.retcode !== 0) throw new Error(`[${response.retcode}] ${response.message}`);
  return response.data.list.filter((avatar) => !EXCLUDED_CHARACTER_IDS.has(avatar.id));
}

async function requestAllWeapons(
  refreshAccount: TGApp.App.Account.RfAc,
): Promise<Array<TGApp.Game.Calculate.WeaponListItem>> {
  const response = await takumiReq.calculate.weapon.list(refreshAccount.cookie, {
    lang: "zh-cn",
    page: 1,
    size: 1000,
    weapon_cat_ids: [],
    weapon_levels: [],
  });
  if (response.retcode !== 0) throw new Error(`[${response.retcode}] ${response.message}`);
  return response.data.list;
}

async function loadLocalData(uid: number, requestVersion: number): Promise<void> {
  const previousCharacterId = selectedCharacterId.value;
  const [roleData, materialData, weaponData] = await Promise.all([
    TSUserAvatar.getAvatars(uid),
    TSUserBagMaterial.getMaterial(uid),
    TSUserBagWeapon.getWeapon(uid),
  ]);
  if (requestVersion !== dataLoadVersion || useApiCalculation.value) return;
  roles.value = roleData
    .filter((role) => !EXCLUDED_CHARACTER_IDS.has(role.cid))
    .sort(
      (a, b) =>
        a.avatar.level - b.avatar.level || b.avatar.rarity - a.avatar.rarity || a.cid - b.cid,
    );
  bagMaterials.value = new Map(materialData.map((material) => [material.id, material.count]));
  bagMaterialDetails.value = new Map(materialData.map((material) => [material.id, material]));
  weapons.value = buildWeaponOptions(weaponData, roles.value);
  useBagWeaponSource.value = weapons.value.some((weapon) => weapon.fromBag);
  selectedWeaponKey.value = null;
  selectedCharacterId.value = restoreCharacterSelection(
    previousCharacterId,
    localCharacterOptions.value,
  );
  if (selectedCharacterId.value === null) selectPreferredWeapon();
}

async function loadInventoryData(uid: number, requestVersion: number): Promise<void> {
  const materialData = await TSUserBagMaterial.getMaterial(uid);
  if (requestVersion !== dataLoadVersion) return;
  bagMaterials.value = new Map(materialData.map((material) => [material.id, material.count]));
  bagMaterialDetails.value = new Map(materialData.map((material) => [material.id, material]));
}

async function saveCalculateInventory(
  uid: number,
  result: TGApp.Game.Calculate.Result,
): Promise<number> {
  return await TSUserBagMaterial.saveCalculateData(uid, result);
}

async function loadProjects(uid: number, preferredProjectId?: string): Promise<void> {
  planLoading.value = true;
  try {
    const nextProjects = await TSCultivationPlan.getProjects(uid);
    const nextProject =
      nextProjects.find((project) => project.id === preferredProjectId) ??
      nextProjects.find((project) => project.isChosen) ??
      nextProjects[0];
    settingProject = true;
    projects.value = nextProjects;
    currentProjectId.value = nextProject?.id ?? null;
    settingProject = false;
    planEntries.value = nextProject ? await TSCultivationPlan.getEntries(nextProject.id) : [];
  } catch (error) {
    showSnackbar.error(`加载养成计划失败：${TGHttps.getErrMsg(error)}`);
  } finally {
    planLoading.value = false;
  }
}

async function importInventory(): Promise<void> {
  const uid = currentUid.value;
  if (uid === undefined) return;
  planLoading.value = true;
  try {
    await tryCallYae(gameDir.value, String(uid));
    if (useApiCalculation.value) await loadInventoryData(uid, dataLoadVersion);
    else await loadLocalData(uid, dataLoadVersion);
    await syncBagWeaponPlanEntries(uid);
  } finally {
    planLoading.value = false;
  }
}

async function createPlan(): Promise<void> {
  const uid = currentUid.value;
  if (uid === undefined) return;
  const name = await showDialog.input("新建养成计划", "请输入计划名称", "当前养成");
  if (typeof name !== "string" || name.trim().length === 0) return;
  planLoading.value = true;
  try {
    const project = await TSCultivationPlan.createProject(uid, name, currentTimezone.value);
    await loadProjects(uid, project.id);
    showSnackbar.success(`已创建养成计划“${project.name}”`);
  } catch (error) {
    const message = TGHttps.getErrMsg(error);
    showSnackbar.error(message.includes("UNIQUE") ? "当前 UID 已存在同名计划" : message);
  } finally {
    planLoading.value = false;
  }
}

async function renamePlan(): Promise<void> {
  const project = currentProject.value;
  if (!project) return;
  const name = await showDialog.input("重命名养成计划", "请输入新的计划名称", project.name);
  if (typeof name !== "string" || name.trim().length === 0 || name.trim() === project.name) return;
  planLoading.value = true;
  try {
    await TSCultivationPlan.renameProject(project.id, name);
    await loadProjects(project.uid, project.id);
    showSnackbar.success("养成计划已重命名");
  } catch (error) {
    const message = TGHttps.getErrMsg(error);
    showSnackbar.error(message.includes("UNIQUE") ? "当前 UID 已存在同名计划" : message);
  } finally {
    planLoading.value = false;
  }
}

async function removePlan(): Promise<void> {
  const project = currentProject.value;
  if (!project) return;
  const confirmed = await showDialog.check(
    `删除养成计划“${project.name}”？`,
    "计划中的全部目标会被删除，背包数据不会受影响。",
  );
  if (!confirmed) return;
  planLoading.value = true;
  try {
    await TSCultivationPlan.removeProject(project);
    await loadProjects(project.uid);
    showSnackbar.success("养成计划已删除");
  } catch (error) {
    showSnackbar.error(`删除养成计划失败：${TGHttps.getErrMsg(error)}`);
  } finally {
    planLoading.value = false;
  }
}

function toCultivationMaterials(
  materials: ReadonlyArray<TGApp.Game.Calculate.Material>,
): Array<CultivationMaterial> {
  return materials
    .filter((material) => material.num > 0)
    .map((material) => ({ id: material.id, count: material.num }));
}

function createEntryState(
  level: number,
  promoteLevel: number,
  ascended: boolean,
  talents: Array<TGApp.Sqlite.Cultivation.TalentState> = [],
): TGApp.Sqlite.Cultivation.EntryState {
  return { level, promoteLevel, ascended, talents };
}

function createAvatarPlanInput(): TGApp.Sqlite.Cultivation.SaveEntryInput | undefined {
  const character = selectedCharacter.value;
  if (!character) return undefined;
  const requirements = useApiCalculation.value
    ? apiAvatarRequirements.value
    : avatarRequiredMaterials.value;
  if (requirements.length === 0) return undefined;
  const currentTalents = mainSkills.value.map((skill, index) => ({
    id: skill.id,
    name: skill.name,
    level: currentTalentLevels.value[index] ?? skill.level,
  }));
  const targetTalents = mainSkills.value.map((skill, index) => ({
    id: skill.id,
    name: skill.name,
    level: talentTargetLevels.value[index] ?? skill.level,
  }));
  return {
    allowCrafting: allowCrafting.value,
    calculationMode: calculationMode.value,
    type: "avatar",
    itemId: character.value,
    instanceKey: "",
    name: character.name,
    icon: character.icon,
    star: character.star,
    currentState: createEntryState(
      avatarCurrentLevel.value,
      avatarCurrentPromoteLevel.value,
      avatarAscended.value,
      currentTalents,
    ),
    targetState: createEntryState(
      avatarTargetLevel.value,
      userCalc.resolvePromoteLevel(
        avatarTargetLevel.value,
        undefined,
        avatarTargetAtAscensionLevel.value ? avatarTargetAscended.value : undefined,
      ),
      avatarTargetAscended.value,
      targetTalents,
    ),
    items: requirements.map((material) => ({
      materialId: material.id,
      required: material.count,
    })),
    useDust: useDust.value,
    useSolvent: useSolvent.value,
  };
}

function createWeaponPlanInput(): TGApp.Sqlite.Cultivation.SaveEntryInput | undefined {
  const weapon = selectedWeapon.value;
  if (!weapon) return undefined;
  const requirements = useApiCalculation.value
    ? apiWeaponRequirements.value
    : weaponRequiredMaterials.value;
  if (requirements.length === 0) return undefined;
  return {
    allowCrafting: allowCrafting.value,
    calculationMode: calculationMode.value,
    type: "weapon",
    itemId: weapon.wiki.id,
    instanceKey: resolveWeaponInstanceKey(weapon),
    name: weapon.wiki.name,
    icon: weapon.icon,
    star: weapon.wiki.star,
    currentState: createEntryState(
      weaponCurrentLevel.value,
      weaponCurrentPromoteLevel.value,
      weaponAscended.value,
    ),
    targetState: createEntryState(
      weaponTargetLevel.value,
      userCalc.resolvePromoteLevel(
        weaponTargetLevel.value,
        undefined,
        weaponTargetAtAscensionLevel.value ? weaponTargetAscended.value : undefined,
      ),
      weaponTargetAscended.value,
    ),
    items: requirements.map((material) => ({
      materialId: material.id,
      required: material.count,
    })),
    useDust: useDust.value,
    useSolvent: useSolvent.value,
  };
}

function resolveWeaponInstanceKey(weapon: TGApp.App.UserCalc.WeaponOption): string {
  if (editingEntry.value?.type === "weapon") return editingEntry.value.instanceKey;
  const paired =
    editingEntry.value?.type === "avatar" ? getPairedPlanEntry(editingEntry.value) : undefined;
  if (paired?.type === "weapon" && paired.itemId === weapon.wiki.id) return paired.instanceKey;
  return weapon.guid ?? (weapon.source === "catalog" ? "" : weapon.key);
}

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

function isSameWeaponEntry(
  input: TGApp.Sqlite.Cultivation.SaveEntryInput,
  entry: TGApp.Sqlite.Cultivation.EntryWithItems,
): boolean {
  if (input.type !== "weapon" || entry.type !== "weapon" || input.itemId !== entry.itemId) {
    return false;
  }
  if (entry.instanceKey.length === 0 || input.instanceKey === entry.instanceKey) return true;
  return (
    input.instanceKey === entry.instanceKey.replace(/^sync-/, "role-") ||
    entry.instanceKey === input.instanceKey.replace(/^sync-/, "role-")
  );
}

function createPairedEntrySyncInput(
  entry: TGApp.Sqlite.Cultivation.EntryWithItems,
): TGApp.Sqlite.Cultivation.SaveEntryInput | undefined {
  if (!entry.items.some((item) => item.required > 0)) return undefined;
  return {
    allowCrafting: allowCrafting.value,
    calculationMode: calculationMode.value,
    type: entry.type,
    itemId: entry.itemId,
    instanceKey: entry.instanceKey,
    name: entry.name,
    icon: entry.icon,
    star: entry.star,
    currentState: entry.currentState,
    targetState: entry.targetState,
    items: entry.items.map((item) => ({
      materialId: item.materialId,
      required: item.required,
    })),
    useDust: useDust.value,
    useSolvent: useSolvent.value,
  };
}

function collectPlanSaveInputs(
  avatarInput: TGApp.Sqlite.Cultivation.SaveEntryInput | undefined,
  weaponInput: TGApp.Sqlite.Cultivation.SaveEntryInput | undefined,
): Array<TGApp.Sqlite.Cultivation.SaveEntryInput> {
  const inputs: Array<TGApp.Sqlite.Cultivation.SaveEntryInput> = [];
  const editing = editingEntry.value;
  const paired = editing ? getPairedPlanEntry(editing) : undefined;
  if (!editing) {
    if (avatarInput) inputs.push(avatarInput);
    if (weaponInput) inputs.push(weaponInput);
    return inputs;
  }
  if (editing.type === "avatar") {
    if (avatarInput) inputs.push(avatarInput);
    else {
      const syncedSelf = createPairedEntrySyncInput(editing);
      if (syncedSelf) inputs.push(syncedSelf);
    }
    if (weaponInput && findExistingWeaponEntry(weaponInput)) {
      inputs.push(weaponInput);
      return inputs;
    }
    if (paired?.type !== "weapon") return inputs;
    const synced = createPairedEntrySyncInput(paired);
    if (synced) inputs.push(synced);
    return inputs;
  }
  if (weaponInput) inputs.push(weaponInput);
  else {
    const syncedSelf = createPairedEntrySyncInput(editing);
    if (syncedSelf) inputs.push(syncedSelf);
  }
  if (avatarInput && findExistingAvatarEntry(avatarInput.itemId)) {
    inputs.push(avatarInput);
    return inputs;
  }
  if (paired?.type !== "avatar") return inputs;
  const synced = createPairedEntrySyncInput(paired);
  if (synced) inputs.push(synced);
  return inputs;
}

function findExistingAvatarEntry(
  itemId: number,
): TGApp.Sqlite.Cultivation.EntryWithItems | undefined {
  return planEntries.value.find((item) => item.type === "avatar" && item.itemId === itemId);
}

function findExistingWeaponEntry(
  input: TGApp.Sqlite.Cultivation.SaveEntryInput,
): TGApp.Sqlite.Cultivation.EntryWithItems | undefined {
  return planEntries.value.find((item) => isSameWeaponEntry(input, item));
}

function inputMatchesEntry(
  input: TGApp.Sqlite.Cultivation.SaveEntryInput,
  entry: TGApp.Sqlite.Cultivation.EntryWithItems,
): boolean {
  if (input.type !== entry.type || input.itemId !== entry.itemId) return false;
  if (entry.type === "avatar") return true;
  return isSameWeaponEntry(input, entry);
}

function collectUnsavedPairEntryIds(
  inputs: ReadonlyArray<TGApp.Sqlite.Cultivation.SaveEntryInput>,
): Array<string> {
  const editing = editingEntry.value;
  if (!editing) return [];
  const paired = getPairedPlanEntry(editing);
  const unsaved: Array<string> = [];
  if (!inputs.some((input) => inputMatchesEntry(input, editing))) unsaved.push(editing.id);
  if (paired && !inputs.some((input) => inputMatchesEntry(input, paired))) {
    unsaved.push(paired.id);
  }
  return unsaved;
}

async function saveToPlan(): Promise<void> {
  const uid = currentUid.value;
  if (uid === undefined || !canSaveToPlan.value) return;
  const inputs = collectPlanSaveInputs(createAvatarPlanInput(), createWeaponPlanInput());
  const unsavedPairIds = collectUnsavedPairEntryIds(inputs);
  if (inputs.length === 0 && unsavedPairIds.length === 0) {
    showSnackbar.warn("当前选择没有可保存的养成材料");
    return;
  }

  planLoading.value = true;
  try {
    const project =
      currentProject.value ??
      (await TSCultivationPlan.ensureCurrentProject(uid, currentTimezone.value));
    if (inputs.length > 0) {
      await TSCultivationPlan.saveEntries(
        project.id,
        inputs,
        useApiCalculation.value ? apiCalculationResult.value : undefined,
      );
    }
    if (unsavedPairIds.length > 0) {
      await TSCultivationPlan.updateEntriesCalculationConfig(project.id, unsavedPairIds, {
        allowCrafting: allowCrafting.value,
        calculationMode: calculationMode.value,
        useDust: useDust.value,
        useSolvent: useSolvent.value,
      });
    }
    editingEntry.value = undefined;
    await loadProjects(uid, project.id);
    viewTab.value = "targets";
    showSnackbar.success(`已保存到养成计划“${project.name}”`);
  } catch (error) {
    showSnackbar.error(`保存养成目标失败：${TGHttps.getErrMsg(error)}`);
  } finally {
    planLoading.value = false;
  }
}

function startAddingTarget(): void {
  editingEntry.value = undefined;
  viewTab.value = "calculator";
}

function cancelEditing(): void {
  editingEntry.value = undefined;
  viewTab.value = "targets";
}

async function editPlanEntry(entry: TGApp.Sqlite.Cultivation.EntryWithItems): Promise<void> {
  editingEntry.value = entry;
  allowCrafting.value = entry.allowCrafting;
  useDust.value = entry.useDust;
  useSolvent.value = entry.useSolvent;
  viewTab.value = "calculator";
  await nextTick();
  const paired = getPairedPlanEntry(entry);
  if (entry.type === "avatar") {
    selectedCharacterId.value = entry.itemId;
  } else if (paired?.type === "avatar") {
    selectedCharacterId.value = paired.itemId;
  } else {
    selectedCharacterId.value = null;
  }
  const editingCalculationMode: CalculationMode = entry.calculationMode === "api" ? "api" : "bag";
  await switchEditingCalculationMode(editingCalculationMode);
  if (editingEntry.value?.id !== entry.id) return;
  if (entry.type === "weapon" && paired === undefined) {
    selectedCharacterId.value = null;
  }
  await nextTick();
  if (entry.type === "avatar") {
    selectedCharacterId.value = entry.itemId;
    applyAvatarEditingState();
    const pairedWeapon = paired?.type === "weapon" ? paired : undefined;
    if (!pairedWeapon) return;
    const weapon = findWeaponOption(pairedWeapon);
    if (weapon) {
      selectedWeaponKey.value = weapon.key;
      applyWeaponEntryState(pairedWeapon);
    }
    return;
  }
  const weapon = findWeaponOption(entry);
  if (weapon) {
    selectedWeaponKey.value = weapon.key;
    applyWeaponEditingState();
  } else {
    showSnackbar.warn("当前数据源中未找到该武器，请重新选择后更新目标");
  }
  if (paired?.type === "avatar") applyAvatarEntryState(paired);
}

async function switchEditingCalculationMode(mode: CalculationMode): Promise<void> {
  if (calculationMode.value !== mode) {
    settingCalculationMode = true;
    calculationMode.value = mode;
    settingCalculationMode = false;
    const uid = currentUid.value;
    if (uid !== undefined) await loadUidData(uid);
  }
  await nextTick();
  settingCalculationMode = true;
  calculationMode.value = mode;
  settingCalculationMode = false;
}

function findWeaponOption(
  entry: TGApp.Sqlite.Cultivation.EntryWithItems,
): TGApp.App.UserCalc.WeaponOption | undefined {
  return weaponOptions.value.find(
    (option) =>
      option.wiki.id === entry.itemId &&
      (entry.instanceKey.length === 0 ||
        option.guid === entry.instanceKey ||
        option.key === entry.instanceKey ||
        option.key === entry.instanceKey.replace(/^sync-/, "role-")),
  );
}

function applyAvatarEntryState(entry: TGApp.Sqlite.Cultivation.EntryWithItems): void {
  if (entry.type !== "avatar" || entry.itemId !== selectedCharacterId.value) return;
  if (avatarCurrentStateEditable.value) {
    avatarCurrentLevel.value = entry.currentState.level;
    avatarAscended.value = entry.currentState.ascended;
    talentCurrentLevels.value = mainSkills.value.map(
      (skill) => getSavedTalentLevel(entry.currentState.talents, skill) ?? skill.level,
    );
  }
  avatarTargetLevel.value = entry.targetState.level;
  avatarTargetAscended.value = entry.targetState.ascended;
  talentTargetLevels.value = mainSkills.value.map(
    (skill, index) =>
      getSavedTalentLevel(entry.targetState.talents, skill) ??
      Math.max(currentTalentLevels.value[index] ?? skill.level, 1),
  );
}

function applyAvatarEditingState(): void {
  const entry = editingEntry.value;
  if (!entry) return;
  if (entry.type === "avatar") {
    applyAvatarEntryState(entry);
    return;
  }
  const paired = getPairedPlanEntry(entry);
  if (paired?.type === "avatar") applyAvatarEntryState(paired);
}

function getSavedTalentLevel(
  talents: ReadonlyArray<TGApp.Sqlite.Cultivation.TalentState>,
  skill: TGApp.App.UserCalc.SkillOption,
): number | undefined {
  return (
    talents.find((talent) => talent.id === skill.id)?.level ??
    talents.find((talent) => talent.name === skill.name)?.level
  );
}

function applyWeaponEntryState(entry: TGApp.Sqlite.Cultivation.EntryWithItems): void {
  if (entry.type !== "weapon" || entry.itemId !== selectedWeapon.value?.wiki.id) return;
  if (weaponCurrentStateEditable.value) {
    weaponCurrentLevel.value = entry.currentState.level;
    weaponAscended.value = entry.currentState.ascended;
  }
  weaponTargetLevel.value = entry.targetState.level;
  weaponTargetAscended.value = entry.targetState.ascended;
}

function applyWeaponEditingState(): void {
  const entry = editingEntry.value;
  if (!entry) return;
  if (entry.type === "weapon") {
    applyWeaponEntryState(entry);
    return;
  }
  const paired = getPairedPlanEntry(entry);
  if (paired?.type === "weapon") applyWeaponEntryState(paired);
}

async function updatePlanEntryStatus(
  entry: TGApp.Sqlite.Cultivation.EntryWithItems,
  status: TGApp.Sqlite.Cultivation.EntryStatus,
): Promise<void> {
  planLoading.value = true;
  try {
    await TSCultivationPlan.updateEntryStatus(entry.id, status);
    if (currentProject.value) {
      planEntries.value = await TSCultivationPlan.getEntries(currentProject.value.id);
    }
    showSnackbar.success(status === "completed" ? "目标已标记完成" : "目标已恢复");
  } catch (error) {
    showSnackbar.error(`更新目标状态失败：${TGHttps.getErrMsg(error)}`);
  } finally {
    planLoading.value = false;
  }
}

async function removePlanEntry(entry: TGApp.Sqlite.Cultivation.EntryWithItems): Promise<void> {
  const confirmed = await showDialog.check(`删除目标“${entry.name}”？`, "删除后无法恢复。");
  if (!confirmed) return;
  planLoading.value = true;
  try {
    await TSCultivationPlan.removeEntry(entry.id);
    if (currentProject.value) {
      planEntries.value = await TSCultivationPlan.getEntries(currentProject.value.id);
    }
    showSnackbar.success("养成目标已删除");
  } catch (error) {
    showSnackbar.error(`删除养成目标失败：${TGHttps.getErrMsg(error)}`);
  } finally {
    planLoading.value = false;
  }
}

async function updatePlanEntryOrder(entryIds: Array<string>): Promise<void> {
  const project = currentProject.value;
  if (!project) return;
  planLoading.value = true;
  try {
    await TSCultivationPlan.updateEntryOrder(project.id, entryIds);
    planEntries.value = await TSCultivationPlan.getEntries(project.id);
  } catch (error) {
    showSnackbar.error(`更新目标优先级失败：${TGHttps.getErrMsg(error)}`);
  } finally {
    planLoading.value = false;
  }
}

async function createAvatarRefreshInput(
  entry: TGApp.Sqlite.Cultivation.EntryWithItems,
  role: TGApp.Sqlite.Character.TableTrans,
): Promise<TGApp.Sqlite.Cultivation.RefreshEntryInput | undefined> {
  const wiki = await getWikiCharacterById(entry.itemId);
  if (!wiki) return undefined;
  const talentSkills = userCalc.recordTalentSkills(role, wiki);
  const currentTalentLevels = userCalc.recordTalentLevels(role, wiki);
  const avatar = <TGApp.Game.Avatar.Avatar & { promote_level?: number }>role.avatar;
  const currentPromoteLevel = userCalc.resolvePromoteLevel(avatar.level, avatar.promote_level);
  const targetTalentMap = new Map(
    entry.targetState.talents.map((talent) => [talent.id, talent.level]),
  );
  const targetTalentNameMap = new Map(
    entry.targetState.talents.map((talent) => [talent.name, talent.level]),
  );
  const targetTalentLevels = talentSkills.map(
    ({ recordSkill, wikiSkill }, index) =>
      targetTalentMap.get(wikiSkill.id) ??
      targetTalentNameMap.get(recordSkill.name) ??
      Math.min(currentTalentLevels[index] ?? recordSkill.level, 10),
  );
  const requirements = userCalc.avatarFromState(
    wiki,
    avatar.level,
    currentPromoteLevel,
    currentTalentLevels,
    entry.targetState.level,
    targetTalentLevels,
    entry.targetState.ascended,
  );
  return {
    entryId: entry.id,
    currentState: createEntryState(
      avatar.level,
      currentPromoteLevel,
      userCalc.isAscendedAtThreshold(avatar.level, currentPromoteLevel),
      talentSkills.map(({ recordSkill, wikiSkill }, index) => ({
        id: wikiSkill.id,
        name: recordSkill.name,
        level: Math.min(currentTalentLevels[index] ?? recordSkill.level, 10),
      })),
    ),
    status: entry.status === "completed" || requirements.length === 0 ? "completed" : "active",
    items: requirements.map((material) => ({
      materialId: material.id,
      required: material.count,
    })),
  };
}

function findBagWeaponForEntry(
  entry: TGApp.Sqlite.Cultivation.EntryWithItems,
  bagWeapons: ReadonlyArray<TGApp.Sqlite.UserBag.WeaponTable>,
): TGApp.Sqlite.UserBag.WeaponTable | undefined {
  const matches = bagWeapons.filter((weapon) => weapon.id === entry.itemId);
  if (matches.length === 0) return undefined;
  if (entry.instanceKey.length === 0) return matches[0];
  return matches.find(
    (weapon) => weapon.guid === entry.instanceKey || `bag-${weapon.guid}` === entry.instanceKey,
  );
}

function isBagWeaponNewerThanEntry(
  bagWeapon: TGApp.Sqlite.UserBag.WeaponTable,
  entry: TGApp.Sqlite.Cultivation.EntryWithItems,
): boolean {
  const bagTime = Date.parse(bagWeapon.updated);
  const entryTime = Date.parse(entry.updated);
  if (Number.isNaN(bagTime) || Number.isNaN(entryTime)) return true;
  return bagTime > entryTime;
}

async function syncBagWeaponPlanEntries(uid: number, requestVersion?: number): Promise<void> {
  const project = currentProject.value;
  if (!project || project.uid !== uid) return;
  const weaponEntries = planEntries.value.filter(
    (entry) => entry.type === "weapon" && entry.calculationMode === "bag",
  );
  if (weaponEntries.length === 0) return;
  const [weaponData, roleData] = await Promise.all([
    TSUserBagWeapon.getWeapon(uid),
    roles.value.length > 0 ? Promise.resolve([...roles.value]) : TSUserAvatar.getAvatars(uid),
  ]);
  if (requestVersion !== undefined && requestVersion !== dataLoadVersion) return;
  const options = buildWeaponOptions(weaponData, roleData);
  const inputs: Array<TGApp.Sqlite.Cultivation.RefreshEntryInput> = [];
  for (const entry of weaponEntries) {
    const bagWeapon = findBagWeaponForEntry(entry, weaponData);
    if (bagWeapon === undefined || !isBagWeaponNewerThanEntry(bagWeapon, entry)) continue;
    if (
      entry.currentState.level === bagWeapon.info.level &&
      entry.currentState.promoteLevel === bagWeapon.info.promote_level
    ) {
      continue;
    }
    const input = createWeaponRefreshInput(entry, options);
    if (input) inputs.push(input);
  }
  if (inputs.length === 0) return;
  await TSCultivationPlan.refreshEntries(project.id, inputs);
  if (requestVersion !== undefined && requestVersion !== dataLoadVersion) return;
  if (currentProject.value?.id !== project.id) return;
  planEntries.value = await TSCultivationPlan.getEntries(project.id);
}

function createWeaponRefreshInput(
  entry: TGApp.Sqlite.Cultivation.EntryWithItems,
  options: ReadonlyArray<TGApp.App.UserCalc.WeaponOption>,
): TGApp.Sqlite.Cultivation.RefreshEntryInput | undefined {
  const weapon = options.find(
    (option) =>
      !option.key.startsWith("wiki-") &&
      option.wiki.id === entry.itemId &&
      (entry.instanceKey.length === 0 ||
        option.guid === entry.instanceKey ||
        option.key === entry.instanceKey),
  );
  if (!weapon) return undefined;
  const requirements = userCalc.weapon(
    weapon.wiki,
    weapon.level,
    weapon.promoteLevel,
    entry.targetState.level,
    entry.targetState.ascended,
  );
  return {
    entryId: entry.id,
    currentState: createEntryState(
      weapon.level,
      weapon.promoteLevel,
      userCalc.isAscendedAtThreshold(weapon.level, weapon.promoteLevel),
    ),
    status: entry.status === "completed" || requirements.length === 0 ? "completed" : "active",
    items: requirements.map((material) => ({
      materialId: material.id,
      required: material.count,
    })),
  };
}

async function refreshLocalAvatarData(
  uid: number,
  avatarEntries: ReadonlyArray<TGApp.Sqlite.Cultivation.EntryWithItems>,
  refreshAccount: TGApp.App.Account.RfAc | null,
): Promise<LocalAvatarRefreshResult> {
  const targetIds = new Set(avatarEntries.map((entry) => entry.itemId));
  if (!refreshAccount) {
    await showLoading.update("未找到可用 CK，读取本地角色数据");
    const cachedRoles = await TSUserAvatar.getAvatars(uid);
    return {
      roles: cachedRoles,
      refreshedIds: new Set(cachedRoles.map((role) => role.cid).filter((id) => targetIds.has(id))),
    };
  }

  const { account: gameAccount, cookie: gameCookie } = refreshAccount;
  await showLoading.update("正在刷新首页数据");
  const indexResponse = await recordReq.index(gameCookie, gameAccount, 1);
  if (indexResponse.retcode !== 0) {
    throw new Error(`[${indexResponse.retcode}] ${indexResponse.message}`);
  }

  await showLoading.update("正在获取角色列表");
  const listResponse = await recordReq.character.list(gameCookie, gameAccount);
  if (listResponse.retcode !== 0) {
    throw new Error(`[${listResponse.retcode}] ${listResponse.message}`);
  }
  const visibleAvatarIds = [
    ...indexResponse.data.avatars.map((avatar) => avatar.id),
    ...listResponse.data.list.map((avatar) => avatar.id),
  ];
  const requestedIds = new Set(visibleAvatarIds.filter((avatarId) => targetIds.has(avatarId)));
  if (requestedIds.size === 0) {
    await showLoading.update("计划中的角色均未在首页或角色列表中找到");
    return { roles: await TSUserAvatar.getAvatars(uid), refreshedIds: requestedIds };
  }

  await showLoading.update(`正在获取 ${requestedIds.size} 个计划角色详情`);
  const detailResponse = await recordReq.character.detail(
    gameCookie,
    gameAccount,
    Array.from(requestedIds, (avatarId) => avatarId.toString()),
  );
  if (detailResponse.retcode !== 0) {
    throw new Error(`[${detailResponse.retcode}] ${detailResponse.message}`);
  }
  await showLoading.update("正在保存计划角色详情");
  await TSUserAvatar.saveAvatars(String(uid), detailResponse.data.list);
  const refreshedIds = new Set(
    detailResponse.data.list.map((avatar) => avatar.base.id).filter((id) => targetIds.has(id)),
  );
  return { roles: await TSUserAvatar.getAvatars(uid), refreshedIds };
}

async function refreshPlanEntries(): Promise<void> {
  const project = currentProject.value;
  if (!project) return;
  planLoading.value = true;
  let refreshedCount = 0;
  let changedMaterials = 0;
  try {
    await showLoading.start(`正在刷新养成计划“${project.name}”`, `UID：${project.uid}`);
    const localEntries = planEntries.value.filter((entry) => entry.calculationMode === "bag");
    const localAvatarEntries = localEntries.filter((entry) => entry.type === "avatar");
    const apiEntries = planEntries.value.filter((entry) => entry.calculationMode === "api");
    const refreshAccount =
      localAvatarEntries.length > 0 || apiEntries.length > 0
        ? await resolveApiAccount(project.uid, "Cultivation.refreshPlanEntries")
        : null;
    const localAvatarData =
      localAvatarEntries.length > 0
        ? await refreshLocalAvatarData(project.uid, localAvatarEntries, refreshAccount)
        : undefined;
    const roleData =
      localAvatarData?.roles ??
      (localEntries.some((entry) => entry.type === "weapon")
        ? await TSUserAvatar.getAvatars(project.uid)
        : []);
    let materialData: Array<TGApp.Sqlite.UserBag.MaterialTable> = [];
    let weaponData: Array<TGApp.Sqlite.UserBag.WeaponTable> = [];
    if (localEntries.length > 0) {
      await showLoading.update("正在读取本地背包材料");
      [materialData, weaponData] = await Promise.all([
        TSUserBagMaterial.getMaterial(project.uid),
        TSUserBagWeapon.getWeapon(project.uid),
      ]);
    }
    if (currentUid.value === project.uid && localEntries.length > 0) {
      bagMaterials.value = new Map(materialData.map((material) => [material.id, material.count]));
      bagMaterialDetails.value = new Map(materialData.map((material) => [material.id, material]));
    }
    const roleMap = new Map(roleData.map((role) => [role.cid, role]));
    const weaponOptionsForRefresh = buildWeaponOptions(weaponData, roleData);
    await showLoading.update("正在准备养成目标刷新数据");
    const syncAvatarData = refreshAccount ? await requestSyncAvatars(refreshAccount) : [];
    const apiTargets = createApiRefreshTargets(apiEntries, syncAvatarData);
    const apiTargetMap = new Map<string, ApiRefreshTarget>();
    for (const target of apiTargets) {
      if (target.avatarEntry) apiTargetMap.set(target.avatarEntry.id, target);
      if (target.weaponEntry) apiTargetMap.set(target.weaponEntry.id, target);
    }

    const processedEntryIds = new Set<string>();
    const localRefreshInputs: Array<TGApp.Sqlite.Cultivation.RefreshEntryInput> = [];
    for (const entry of planEntries.value) {
      if (processedEntryIds.has(entry.id)) continue;
      if (entry.calculationMode === "bag") {
        const input =
          entry.type === "avatar"
            ? await (async () => {
                const role = localAvatarData?.refreshedIds.has(entry.itemId)
                  ? roleMap.get(entry.itemId)
                  : undefined;
                return role ? await createAvatarRefreshInput(entry, role) : undefined;
              })()
            : createWeaponRefreshInput(entry, weaponOptionsForRefresh);
        processedEntryIds.add(entry.id);
        if (input) localRefreshInputs.push(input);
        continue;
      }

      if (localRefreshInputs.length > 0) {
        await showLoading.update(`正在保存 ${localRefreshInputs.length} 个本地目标`);
        await TSCultivationPlan.refreshEntries(project.id, localRefreshInputs);
        refreshedCount += localRefreshInputs.length;
        localRefreshInputs.length = 0;
      }

      const target = apiTargetMap.get(entry.id);
      processedEntryIds.add(entry.id);
      if (!target) continue;
      if (target.avatarEntry) processedEntryIds.add(target.avatarEntry.id);
      if (target.weaponEntry) processedEntryIds.add(target.weaponEntry.id);
      if (!refreshAccount) continue;
      await showLoading.update(`正在计算接口目标：${entry.name}`);
      const response = await calculateApiRefreshTarget(refreshAccount, target);
      changedMaterials += await saveCalculateInventory(project.uid, response);
      const itemResult = response.items[0];
      if (!itemResult) continue;
      const inputs = createApiRefreshInputsFromResult(target, itemResult);
      await TSCultivationPlan.refreshEntries(project.id, inputs, {
        avatarEntryId: target.avatarEntry?.id ?? "",
        weaponEntryId: target.weaponEntry?.id ?? "",
        result: response,
      });
      refreshedCount += inputs.length;
    }
    if (localRefreshInputs.length > 0) {
      await showLoading.update(`正在保存 ${localRefreshInputs.length} 个本地目标`);
      await TSCultivationPlan.refreshEntries(project.id, localRefreshInputs);
      refreshedCount += localRefreshInputs.length;
    }

    if (changedMaterials > 0 && currentUid.value === project.uid) {
      await showLoading.update(`正在更新 ${changedMaterials} 条背包材料`);
      await loadInventoryData(project.uid, dataLoadVersion);
    }

    if (refreshedCount === 0) {
      showSnackbar.warn("最新存档中未找到可刷新的计划目标");
      return;
    }
    await showLoading.update("正在重新加载养成计划数据");
    planEntries.value = await TSCultivationPlan.getEntries(project.id);
    showSnackbar.success(
      `已刷新 ${refreshedCount} 个目标${refreshedCount < planEntries.value.length ? "，其余目标缺少最新数据或对应 CK" : ""}`,
    );
  } catch (error) {
    planEntries.value = await TSCultivationPlan.getEntries(project.id);
    showSnackbar.error(`刷新计划目标失败：${TGHttps.getErrMsg(error)}`);
  } finally {
    await showLoading.end();
    planLoading.value = false;
  }
}

async function calculateApiRefreshTarget(
  refreshAccount: TGApp.App.Account.RfAc,
  target: ApiRefreshTarget,
): Promise<TGApp.Game.Calculate.Result> {
  const region = gameEnum.serverList.find((server) => server === refreshAccount.account.region);
  if (!region) throw new Error(`不支持的游戏服务器：${refreshAccount.account.region}`);
  const response = await takumiReq.calculate.batch(refreshAccount.cookie, {
    items: [createApiRefreshParams(target)],
    lang: "zh-cn",
    region,
    uid: refreshAccount.account.gameUid,
  });
  if (response.retcode !== 0) throw new Error(`[${response.retcode}] ${response.message}`);
  return response.data;
}

function createApiRefreshTargets(
  entries: ReadonlyArray<TGApp.Sqlite.Cultivation.EntryWithItems>,
  avatars: ReadonlyArray<TGApp.Game.Calculate.SyncAvatar>,
): Array<ApiRefreshTarget> {
  const targets: Array<ApiRefreshTarget> = [];
  const processedEntryIds = new Set<string>();
  for (const entry of entries) {
    if (processedEntryIds.has(entry.id)) continue;
    const storedResult = entry.apiResult;
    const avatarEntry = storedResult?.avatarEntryId
      ? entries.find((item) => item.id === storedResult.avatarEntryId)
      : entry.type === "avatar"
        ? entry
        : entries.find(
            (item) => item.type === "avatar" && item.itemId === getSyncAvatarId(entry.instanceKey),
          );
    const weaponEntry = storedResult?.weaponEntryId
      ? entries.find((item) => item.id === storedResult.weaponEntryId)
      : entry.type === "weapon"
        ? entry
        : entries.find(
            (item) =>
              item.type === "weapon" && getSyncAvatarId(item.instanceKey) === avatarEntry?.itemId,
          );
    const avatarId = avatarEntry?.itemId ?? getSyncAvatarId(weaponEntry?.instanceKey ?? "");
    const avatar =
      avatars.find((item) => item.id === avatarId) ??
      (weaponEntry ? avatars.find((item) => item.weapon.id === weaponEntry.itemId) : undefined);
    if (!avatar) continue;
    const matchedWeaponEntry = weaponEntry?.itemId === avatar.weapon.id ? weaponEntry : undefined;
    if (!avatarEntry && !matchedWeaponEntry) continue;
    if (avatarEntry) processedEntryIds.add(avatarEntry.id);
    if (matchedWeaponEntry) processedEntryIds.add(matchedWeaponEntry.id);
    targets.push({ avatar, avatarEntry, weaponEntry: matchedWeaponEntry });
  }
  return targets;
}

function getSyncAvatarId(instanceKey: string): number | undefined {
  const avatarId = Number(/^sync-(\d+)-/.exec(instanceKey)?.[1]);
  return Number.isInteger(avatarId) ? avatarId : undefined;
}

function createApiRefreshParams(target: ApiRefreshTarget): TGApp.Game.Calculate.ParamsItem {
  const { avatar, avatarEntry, weaponEntry } = target;
  const talentTargets = new Map(
    avatarEntry?.targetState.talents.map((talent) => [talent.id, talent.level]) ?? [],
  );
  const skillList = avatar.skill_list.map((skill) => ({
    id: skill.group_id,
    level_current: Math.max(skill.level_current, 1),
    level_target: Math.max(
      talentTargets.get(skill.id) ?? skill.level_current,
      skill.level_current,
      1,
    ),
  }));
  return {
    avatar_id: avatar.id,
    avatar_level_current: avatar.level_current,
    avatar_level_target: Math.max(avatarEntry?.targetState.level ?? 0, avatar.level_current),
    element_attr_id: avatar.element_attr_id,
    skill_list: skillList,
    weapon: weaponEntry
      ? {
          ...avatar.weapon,
          level_target: Math.max(weaponEntry.targetState.level, avatar.weapon.level_current),
        }
      : null,
    from_user_sync: true,
    avatar_promote_level: avatar.promote_level,
  };
}

function createApiRefreshInputsFromResult(
  target: ApiRefreshTarget,
  result: TGApp.Game.Calculate.ItemResult,
): Array<TGApp.Sqlite.Cultivation.RefreshEntryInput> {
  const inputs: Array<TGApp.Sqlite.Cultivation.RefreshEntryInput> = [];
  if (target.avatarEntry) {
    const requirements = userCalc.merge(
      toCultivationMaterials(result.avatar_consume),
      toCultivationMaterials(result.avatar_skill_consume),
    );
    inputs.push({
      entryId: target.avatarEntry.id,
      currentState: createEntryState(
        target.avatar.level_current,
        target.avatar.promote_level,
        userCalc.isAscendedAtThreshold(target.avatar.level_current, target.avatar.promote_level),
        target.avatar.skill_list
          .filter((skill) => skill.max_level > 1)
          .map((skill) => ({ id: skill.id, name: skill.name, level: skill.level_current })),
      ),
      status:
        target.avatarEntry.status === "completed" || requirements.length === 0
          ? "completed"
          : "active",
      items: requirements.map((material) => ({
        materialId: material.id,
        required: material.count,
      })),
    });
  }
  if (target.weaponEntry) {
    const requirements = toCultivationMaterials(result.weapon_consume);
    const promoteLevel = userCalc.resolvePromoteLevel(target.avatar.weapon.level_current);
    inputs.push({
      entryId: target.weaponEntry.id,
      currentState: createEntryState(
        target.avatar.weapon.level_current,
        promoteLevel,
        userCalc.isAscendedAtThreshold(target.avatar.weapon.level_current, promoteLevel),
      ),
      status:
        target.weaponEntry.status === "completed" || requirements.length === 0
          ? "completed"
          : "active",
      items: requirements.map((material) => ({
        materialId: material.id,
        required: material.count,
      })),
    });
  }
  return inputs;
}

function createLocalCharacterOption(
  role: TGApp.Sqlite.Character.TableTrans,
): TGApp.App.UserCalc.CharacterOption {
  const weaponType = wwWeapon.find((weapon) => weapon.id === role.weapon.id)?.weapon ?? "未知武器";
  return {
    title: `${role.avatar.name} · Lv.${role.avatar.level}`,
    value: role.cid,
    name: role.avatar.name,
    icon: `/WIKI/character/${role.cid}.webp`,
    element: getZhElement(role.avatar.element),
    star: getRcStar(role.cid, role.avatar.rarity),
    level: role.avatar.level,
    owned: true,
    constellation: role.avatar.actived_constellation_num,
    fetter: role.avatar.fetter,
    weaponType,
  };
}

function createSyncCharacterOption(
  avatar: TGApp.Game.Calculate.SyncAvatar,
): TGApp.App.UserCalc.CharacterOption {
  return {
    title: `${avatar.name} · Lv.${avatar.level_current}`,
    value: avatar.id,
    name: avatar.name,
    icon: avatar.icon,
    element: getElementNameByAttrId(avatar.element_attr_id),
    star: avatar.avatar_level,
    level: avatar.level_current,
    owned: true,
    constellation: avatar.constellation_num,
    fetter: avatar.fetter_level,
    weaponType: getWeaponTypeByCategory(avatar.weapon_cat_id),
  };
}

function buildApiWeaponOptions(
  catalog: ReadonlyArray<TGApp.Game.Calculate.WeaponListItem>,
  avatars: ReadonlyArray<TGApp.Game.Calculate.SyncAvatar>,
): Array<TGApp.App.UserCalc.WeaponOption> {
  const result: Array<TGApp.App.UserCalc.WeaponOption> = [];
  const catalogMap = new Map(catalog.map((weapon) => [weapon.id, weapon]));
  const equippedWeaponIds = new Set<number>();
  for (const avatar of avatars) {
    const weapon = avatar.weapon;
    const api = catalogMap.get(weapon.id);
    const wiki = createApiWeaponWiki(api ?? weapon);
    equippedWeaponIds.add(weapon.id);
    result.push({
      key: `sync-${avatar.id}-${weapon.id}`,
      title: `${weapon.name} · Lv.${weapon.level_current}`,
      icon: weapon.icon,
      wiki,
      level: weapon.level_current,
      promoteLevel: userCalc.resolvePromoteLevel(weapon.level_current),
      affixLevel: 1,
      fromBag: false,
      locked: false,
      source: "equipped",
      api,
    });
  }
  for (const weapon of catalog) {
    if (equippedWeaponIds.has(weapon.id)) continue;
    result.push({
      key: `api-${weapon.id}`,
      title: `${weapon.name} · 未拥有`,
      icon: weapon.icon,
      wiki: createApiWeaponWiki(weapon),
      level: 1,
      promoteLevel: 0,
      affixLevel: 1,
      fromBag: false,
      locked: false,
      source: "catalog",
      api: weapon,
    });
  }
  return result.sort(compareWeaponOptions);
}

function createApiWeaponWiki(
  weapon: TGApp.Game.Calculate.WeaponListItem | TGApp.Game.Calculate.SyncAvatarWeapon,
): TGApp.App.Weapon.WikiItem {
  const local = wwWeapon.find((item) => item.id === weapon.id);
  if (local) return local;
  return {
    id: weapon.id,
    name: weapon.name,
    description: "",
    star: weapon.weapon_level,
    weapon: getWeaponTypeByCategory(weapon.weapon_cat_id),
    materials: [],
    curves: [],
    story: [],
  };
}

function buildWeaponOptions(
  bagWeapons: Array<TGApp.Sqlite.UserBag.WeaponTable>,
  roleData: Array<TGApp.Sqlite.Character.TableTrans>,
): Array<TGApp.App.UserCalc.WeaponOption> {
  const result: Array<TGApp.App.UserCalc.WeaponOption> = [];
  for (const bagWeapon of bagWeapons) {
    const wiki = wwWeapon.find((weapon) => weapon.id === bagWeapon.id);
    if (!wiki) continue;
    const affixValues = Object.values(bagWeapon.info.affix_map);
    result.push({
      key: `bag-${bagWeapon.guid}`,
      title: `${wiki.name} · Lv.${bagWeapon.info.level}`,
      icon: `/WIKI/weapon/${wiki.id}.webp`,
      wiki,
      level: bagWeapon.info.level,
      promoteLevel: bagWeapon.info.promote_level,
      affixLevel: Math.max(0, ...affixValues) + 1,
      fromBag: true,
      locked: bagWeapon.info.is_locked,
      source: "bag",
      guid: bagWeapon.guid,
    });
  }
  for (const role of roleData) {
    const roleWeapon = role.weapon;
    const wiki = wwWeapon.find((weapon) => weapon.id === roleWeapon.id);
    if (!wiki) continue;
    result.push({
      key: `role-${role.cid}-${roleWeapon.id}`,
      title: `${wiki.name} · Lv.${roleWeapon.level}`,
      icon: `/WIKI/weapon/${wiki.id}.webp`,
      wiki,
      level: roleWeapon.level,
      promoteLevel: roleWeapon.promote_level,
      affixLevel: roleWeapon.affix_level,
      fromBag: false,
      locked: false,
      source: "equipped",
    });
  }
  for (const wiki of wwWeapon) {
    result.push({
      key: `wiki-${wiki.id}`,
      title: `${wiki.name} · 未拥有`,
      icon: `/WIKI/weapon/${wiki.id}.webp`,
      wiki,
      level: 1,
      promoteLevel: 0,
      affixLevel: 1,
      fromBag: false,
      locked: false,
      source: "catalog",
    });
  }
  return result.sort(compareWeaponOptions);
}

function compareCharacterOptions(
  a: TGApp.App.UserCalc.CharacterOption,
  b: TGApp.App.UserCalc.CharacterOption,
): number {
  return (
    Number(b.owned) - Number(a.owned) ||
    (b.star % 100) - (a.star % 100) ||
    a.level - b.level ||
    b.constellation - a.constellation ||
    (CHARACTER_WIKI_ORDER.get(a.value) ?? Number.MAX_SAFE_INTEGER) -
      (CHARACTER_WIKI_ORDER.get(b.value) ?? Number.MAX_SAFE_INTEGER) ||
    a.value - b.value
  );
}

function compareWeaponOptions(
  a: TGApp.App.UserCalc.WeaponOption,
  b: TGApp.App.UserCalc.WeaponOption,
): number {
  return (
    Number(b.source !== "catalog") - Number(a.source !== "catalog") ||
    b.wiki.star - a.wiki.star ||
    a.level - b.level ||
    b.affixLevel - a.affixLevel ||
    (WEAPON_WIKI_ORDER.get(a.wiki.id) ?? Number.MAX_SAFE_INTEGER) -
      (WEAPON_WIKI_ORDER.get(b.wiki.id) ?? Number.MAX_SAFE_INTEGER) ||
    a.key.localeCompare(b.key)
  );
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
