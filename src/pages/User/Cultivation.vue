<!-- 养成计划 -->
<template>
  <v-app-bar :extension-height="uidList.length > 0 ? 68 : 0">
    <template #prepend>
      <div class="cultivation-title">
        <v-icon color="var(--tgc-od-orange)">mdi-calculator-variant-outline</v-icon>
        <span>养成计划</span>
        <v-btn
          v-if="uidList.length > 0"
          color="var(--tgc-od-orange)"
          prepend-icon="mdi-plus"
          size="small"
          variant="tonal"
          @click="startAddingTarget"
        >
          添加目标
        </v-btn>
      </div>
    </template>
    <template #append>
      <div class="cultivation-nav-actions">
        <v-select
          v-model="currentUid"
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
          :hide-details="true"
          :items="projectOptions"
          class="cultivation-nav-select project-select"
          density="compact"
          item-title="title"
          item-value="value"
          label="当前计划"
          variant="outlined"
        />
        <v-btn
          :loading="loading || apiLoading || planLoading"
          icon="mdi-refresh"
          title="重新加载"
          variant="tonal"
          @click="reload()"
        />
      </div>
    </template>
    <template #extension>
      <div v-if="uidList.length > 0" class="cultivation-plan-toolbar">
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
        </div>
        <div class="cultivation-plan-actions">
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
          <v-btn prepend-icon="mdi-plus" size="small" variant="tonal" @click="createPlan">
            新建
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
            :entries="planEntries"
            :inventory="planInventory"
            :project-name="currentProject?.name ?? ''"
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
          <v-card class="cultivation-mode" variant="outlined">
            <div class="cultivation-mode-main">
              <div class="cultivation-mode-title">
                <v-icon color="var(--tgc-od-orange)" size="20"
                  >mdi-calculator-variant-outline</v-icon
                >
                <span>计算方式</span>
              </div>
              <v-btn-toggle
                v-if="isWindows"
                v-model="calculationMode"
                color="var(--tgc-od-orange)"
                density="compact"
                mandatory
                variant="outlined"
              >
                <v-btn :disabled="isTraveler || !hasBagDataSource" value="bag">背包计算</v-btn>
                <v-btn value="api">接口计算</v-btn>
              </v-btn-toggle>
              <v-chip v-else color="var(--tgc-od-orange)" variant="tonal">接口计算</v-chip>
              <span class="cultivation-mode-hint">{{ calculationHint }}</span>
            </div>
            <div class="cultivation-mode-actions">
              <v-btn
                v-if="useApiCalculation"
                :disabled="!canApiCalculate"
                :loading="apiLoading"
                color="var(--tgc-od-orange)"
                prepend-icon="mdi-check-circle-outline"
                variant="tonal"
                @click="calculateWithApi"
              >
                确认计算
              </v-btn>
              <v-btn prepend-icon="mdi-close" variant="tonal" @click="cancelEditing">
                取消编辑
              </v-btn>
              <v-btn
                :disabled="!canSaveToPlan"
                :loading="planLoading"
                color="var(--tgc-od-orange)"
                prepend-icon="mdi-content-save-outline"
                variant="flat"
                @click="saveToPlan"
              >
                {{ editingEntry ? "更新计划目标" : "保存到计划" }}
              </v-btn>
            </div>
          </v-card>

          <v-alert
            v-if="editingEntry"
            closable
            color="var(--tgc-od-blue)"
            density="compact"
            type="info"
            variant="tonal"
            @click:close="cancelEditing"
          >
            正在编辑“{{ editingEntry.name }}”，保存后将更新计划中的同一目标。
          </v-alert>

          <div class="cultivation-config">
            <UcCharacterPanel
              v-model:ascended="avatarAscended"
              v-model:selected-id="selectedCharacterId"
              v-model:talent-target-levels="talentTargetLevels"
              v-model:target-ascended="avatarTargetAscended"
              v-model:target-level="avatarTargetLevel"
              :at-ascension-level="avatarAtAscensionLevel"
              :current-ascension-readonly="useApiCalculation"
              :level-options="avatarLevelOptions"
              :options="characterOptions"
              :selection-readonly="editingEntry?.type === 'avatar'"
              :selected-character="selectedCharacter"
              :skills="displaySkills"
              :target-at-ascension-level="avatarTargetAtAscensionLevel"
              :weapon-type="selectedRoleWeaponType"
            />
            <UcWeaponPanel
              v-model:ascended="weaponAscended"
              v-model:selected-key="selectedWeaponKey"
              v-model:target-ascended="weaponTargetAscended"
              v-model:target-level="weaponTargetLevel"
              v-model:use-bag-source="useBagWeaponSource"
              :at-ascension-level="weaponAtAscensionLevel"
              :current-ascension-readonly="useApiCalculation"
              :has-bag-data="hasBagWeaponData"
              :level-options="weaponLevelOptions"
              :options="weaponOptions"
              :selection-readonly="editingEntry?.type === 'weapon'"
              :selected-weapon="selectedWeapon"
              :target-at-ascension-level="weaponTargetAtAscensionLevel"
            />
          </div>

          <UcMaterialResult
            v-model:allow-crafting="allowCrafting"
            v-model:use-dust="useDust"
            v-model:use-solvent="useSolvent"
            :bag-materials="resultBagMaterialDetails"
            :empty-text="resultEmptyText"
            :loading="apiLoading"
            :materials="displayResultMaterials"
            :missing-kinds="missingKinds"
            :show-crafting-options="!useApiCalculation"
            :uid="currentUid ?? 0"
          />
        </v-window-item>
      </v-window>
    </template>
  </div>
</template>

<script lang="ts" setup>
import showSnackbar from "@comp/func/snackbar.js";
import showDialog from "@comp/func/dialog.js";
import TSUserAvatar from "@Sqlm/userAvatar.js";
import TSUserAccount from "@Sqlm/userAccount.js";
import TSUserBagMaterial from "@Sqlm/userBagMaterial.js";
import TSUserBagWeapon from "@Sqlm/userBagWeapon.js";
import TSCultivationPlan from "@Sqlm/cultivationPlan.js";
import gameEnum from "@enum/game.js";
import takumiReq from "@req/takumiReq.js";
import useAppStore from "@store/app.js";
import useUserStore from "@store/user.js";
import UcCharacterPanel from "@comp/userCalc/uc-character-panel.vue";
import UcMaterialResult from "@comp/userCalc/uc-material-result.vue";
import UcPlanTargetList from "@comp/userCalc/uc-plan-target-list.vue";
import UcWeaponPanel from "@comp/userCalc/uc-weapon-panel.vue";
import { platform } from "@tauri-apps/plugin-os";
import TGHttps from "@utils/TGHttps.js";
import { tryCallYae } from "@utils/TGGame.js";
import { getRfAc } from "@utils/acUtils.js";
import {
  aggregateEntryMaterials,
  buildCultivationResults,
  getCalculateInventory,
  getUidServerTimezone,
} from "@utils/cultivationPlan.js";
import { getRcStar, getZhElement, timestampToDate } from "@utils/toolFunc.js";
import userCalc, { type CultivationMaterial } from "@utils/userCalc.js";
import { storeToRefs } from "pinia";
import { computed, nextTick, onMounted, ref, shallowRef, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import {
  AppCharacterData,
  getWikiCharacterById,
  WikiMaterialData,
  wwWeapon,
} from "@/data/index.js";

const EXCLUDED_CHARACTER_IDS = new Set([10000117, 10000118]);
const TRAVELER_IDS = new Set([10000005, 10000007]);
const EMPTY_BAG_MATERIAL_DETAILS: ReadonlyMap<number, TGApp.Sqlite.UserBag.MaterialTable> =
  new Map();

type CalculationMode = TGApp.Sqlite.Cultivation.CalculationMode;
type CultivationViewTab = "calculator" | "targets";
type ApiRefreshTarget = {
  avatar: TGApp.Game.Calculate.SyncAvatar;
  avatarEntry?: TGApp.Sqlite.Cultivation.EntryWithItems;
  weaponEntry?: TGApp.Sqlite.Cultivation.EntryWithItems;
};

const { account, cookie } = storeToRefs(useUserStore());
const { gameDir } = storeToRefs(useAppStore());
const route = useRoute();
const router = useRouter();

const isWindows = platform() === "windows";
const loading = ref<boolean>(false);
const apiLoading = ref<boolean>(false);
const planLoading = ref<boolean>(false);
const apiCalculated = ref<boolean>(false);
const calculationMode = ref<CalculationMode>(isWindows ? "bag" : "api");
const viewTab = ref<CultivationViewTab>("targets");
const currentUid = ref<number>();
const currentProjectId = ref<string | null>(null);
const selectedCharacterId = ref<number | null>(null);
const selectedWeaponKey = ref<string | null>(null);
const avatarTargetLevel = ref<number>(90);
const talentTargetLevels = ref<Array<number>>([10, 10, 10]);
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
const pendingWikiCharacterId = ref<number | null>(null);
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
  const options = roles.value.map((role) => {
    const weaponType =
      wwWeapon.find((weapon) => weapon.id === role.weapon.id)?.weapon ?? "未知武器";
    return {
      title: `${role.avatar.name} · Lv.${role.avatar.level}`,
      value: role.cid,
      name: role.avatar.name,
      icon: `/WIKI/character/${role.cid}.webp`,
      element: getZhElement(role.avatar.element),
      star: getRcStar(role.cid, role.avatar.rarity),
      level: role.avatar.level,
      constellation: role.avatar.actived_constellation_num,
      fetter: role.avatar.fetter,
      weaponType,
    };
  });
  const pendingId = pendingWikiCharacterId.value;
  if (pendingId !== null && !options.some((option) => option.value === pendingId)) {
    const wiki = AppCharacterData.find((character) => character.id === pendingId);
    if (wiki) {
      options.unshift({
        title: `${wiki.name} · Lv.1（规划）`,
        value: wiki.id,
        name: wiki.name,
        icon: `/WIKI/character/${wiki.id}.webp`,
        element: wiki.element,
        star: wiki.star % 100,
        level: 1,
        constellation: 0,
        fetter: 0,
        weaponType: wiki.weapon,
      });
    }
  }
  return options;
});
const syncCharacterOptions = computed<Array<TGApp.App.UserCalc.CharacterOption>>(() =>
  syncAvatars.value.map((avatar) => ({
    title: `${avatar.name} · Lv.${avatar.level_current}`,
    value: avatar.id,
    name: avatar.name,
    icon: avatar.icon,
    element: getElementNameByAttrId(avatar.element_attr_id),
    star: avatar.avatar_level,
    level: avatar.level_current,
    constellation: avatar.constellation_num,
    fetter: avatar.fetter_level,
    weaponType: getWeaponTypeByCategory(avatar.weapon_cat_id),
  })),
);
const characterOptions = computed<Array<TGApp.App.UserCalc.CharacterOption>>(() =>
  useApiCalculation.value ? syncCharacterOptions.value : localCharacterOptions.value,
);
const selectedCharacter = computed<TGApp.App.UserCalc.CharacterOption | undefined>(() =>
  characterOptions.value.find((option) => option.value === selectedCharacterId.value),
);
const selectedRole = computed<TGApp.Sqlite.Character.TableTrans | undefined>(() =>
  useApiCalculation.value
    ? undefined
    : roles.value.find((role) => role.cid === selectedCharacterId.value),
);
const selectedSyncAvatar = computed<TGApp.Game.Calculate.SyncAvatar | undefined>(() =>
  useApiCalculation.value
    ? syncAvatars.value.find((avatar) => avatar.id === selectedCharacterId.value)
    : undefined,
);
const isTraveler = computed<boolean>(() => TRAVELER_IDS.has(selectedCharacter.value?.value ?? 0));
const canApiCalculate = computed<boolean>(
  () => !apiLoading.value && selectedSyncAvatar.value !== undefined,
);
const calculationHint = computed<string>(() => {
  if (isTraveler.value) return "已为旅行者强制使用接口计算";
  if (!isWindows) return "当前平台不支持读取游戏背包，材料将由米游社接口计算";
  if (!hasBagDataSource.value) return "当前 UID 没有背包存档，数据将由米游社接口同步并计算";
  if (calculationMode.value === "api") return "设置目标后点击确认，届时才会请求接口";
  return "根据本地 Wiki 与背包存档实时计算";
});
const selectedRoleWeaponType = computed<string>(() => {
  return selectedCharacter.value?.weaponType ?? "";
});
const syncWeaponOption = computed<TGApp.App.UserCalc.WeaponOption | undefined>(() =>
  buildSyncWeaponOption(selectedSyncAvatar.value),
);
const hasBagWeaponData = computed<boolean>(
  () => !useApiCalculation.value && weapons.value.some((weapon) => weapon.fromBag),
);
const weaponOptions = computed<Array<TGApp.App.UserCalc.WeaponOption>>(() => {
  if (useApiCalculation.value) {
    return syncWeaponOption.value ? [syncWeaponOption.value] : [];
  }
  const useBag = hasBagWeaponData.value && useBagWeaponSource.value;
  return weapons.value.filter((weapon) => {
    if (weapon.fromBag !== useBag) return false;
    return !selectedRoleWeaponType.value || weapon.wiki.weapon === selectedRoleWeaponType.value;
  });
});
const selectedWeapon = computed<TGApp.App.UserCalc.WeaponOption | undefined>(() =>
  weaponOptions.value.find((weapon) => weapon.key === selectedWeaponKey.value),
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
  const roleSkills = selectedRole.value?.skills ?? [];
  if (!selectedRole.value && avatarWiki.value) {
    return avatarWiki.value.skills
      .filter((skill) => skill.maxLv > 1)
      .map((skill) => ({
        id: skill.id,
        name: skill.name,
        icon: skill.icon,
        level: 1,
        maxLevel: skill.maxLv,
      }));
  }
  let skills: Array<TGApp.Game.Avatar.Skill>;
  if (!avatarWiki.value) {
    skills = roleSkills.filter((skill) => skill.skill_type === 1 && skill.is_unlock).slice(0, 3);
  } else {
    const levelableSkillIds = new Set(
      avatarWiki.value.skills.filter((skill) => skill.maxLv !== 1).map((skill) => skill.id),
    );
    skills = roleSkills.filter((skill) => skill.is_unlock && levelableSkillIds.has(skill.skill_id));
  }
  return skills.map((skill) => ({
    id: skill.skill_id,
    name: skill.name,
    icon: skill.icon,
    level: skill.level,
    maxLevel: 10,
  }));
});
const talentLucLevels = computed<Array<number | null>>(() => {
  if (!avatarWiki.value) return mainSkills.value.map(() => null);
  const wikiSkillMap = new Map(avatarWiki.value.skills.map((skill) => [skill.id, skill]));
  return mainSkills.value.map((skill) => wikiSkillMap.get(skill.id)?.luc ?? null);
});
const currentTalentLevels = computed<Array<number>>(() => {
  const levels = mainSkills.value.map((skill) => skill.level);
  if (useApiCalculation.value) return levels;
  if (!selectedRole.value || !avatarWiki.value) {
    return userCalc.correctTalentLevels(
      levels,
      talentLucLevels.value,
      selectedCharacter.value?.constellation ?? 0,
    );
  }
  return userCalc.recordTalentLevels(selectedRole.value, avatarWiki.value);
});
const displaySkills = computed<Array<TGApp.App.UserCalc.SkillOption>>(() =>
  mainSkills.value.map((skill, index) => ({
    ...skill,
    level: currentTalentLevels.value[index] ?? skill.level,
  })),
);
const avatarLevelOptions = computed<Array<number>>(() => {
  if (!selectedCharacter.value) return [];
  return createLevelOptions(selectedSyncAvatar.value?.max_level ?? 90);
});
const weaponLevelOptions = computed<Array<number>>(() => {
  if (selectedSyncAvatar.value) {
    return createLevelOptions(selectedSyncAvatar.value.weapon.max_level);
  }
  if (!selectedWeapon.value) return [];
  return createLevelOptions(userCalc.weaponMaxLevel(selectedWeapon.value.wiki.star));
});
const avatarAtAscensionLevel = computed<boolean>(() =>
  userCalc.isAscensionLevel(selectedCharacter.value?.level ?? 0),
);
const weaponAtAscensionLevel = computed<boolean>(() =>
  userCalc.isAscensionLevel(selectedWeapon.value?.level ?? 0),
);
const avatarTargetAtAscensionLevel = computed<boolean>(() =>
  userCalc.isAscensionLevel(avatarTargetLevel.value),
);
const weaponTargetAtAscensionLevel = computed<boolean>(() =>
  userCalc.isAscensionLevel(weaponTargetLevel.value),
);
const avatarCurrentPromoteLevel = computed<number>(() => {
  if (selectedSyncAvatar.value) return selectedSyncAvatar.value.promote_level;
  if (!selectedRole.value) return userCalc.resolvePromoteLevel(selectedCharacter.value?.level ?? 1);
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
    selectedWeapon.value.level,
    selectedWeapon.value.promoteLevel,
    weaponAtAscensionLevel.value ? weaponAscended.value : undefined,
  );
});

const avatarRequiredMaterials = computed<Array<CultivationMaterial>>(() => {
  if (!selectedCharacter.value || !avatarWiki.value) return [];
  return userCalc.avatarFromState(
    avatarWiki.value,
    selectedCharacter.value.level,
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
    selectedWeapon.value.level,
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
const planRequiredMaterials = computed<Array<CultivationMaterial>>(() =>
  aggregateEntryMaterials(planEntries.value),
);
const planInventory = computed<Map<number, number>>(() => {
  const inventory = new Map(bagMaterials.value);
  for (const entry of planEntries.value) {
    if (entry.calculationMode !== "api" || !entry.apiResult) continue;
    for (const [materialId, count] of getCalculateInventory(entry.apiResult.result)) {
      inventory.set(materialId, count);
    }
  }
  return inventory;
});
const planResultMaterials = computed<Array<TGApp.App.UserCalc.ResultMaterial>>(() =>
  buildCultivationResults(
    planRequiredMaterials.value,
    planInventory.value,
    WikiMaterialData,
    true,
    false,
    false,
  ),
);
const planMissingKinds = computed<number>(
  () => planResultMaterials.value.filter((material) => material.missing > 0).length,
);
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
    : "请先选择角色，并确认该 UID 已保存可用的账号与 CK";
});

watch(
  currentUid,
  async (uid) => {
    if (settingUid || uid === undefined) return;
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
  avatarTargetLevel.value = selectedSyncAvatar.value?.max_level ?? 90;
  avatarTargetAscended.value = false;
  talentTargetLevels.value = mainSkills.value.map((skill) => skill.maxLevel);
  if (selectedSyncAvatar.value) {
    weaponTargetLevel.value = selectedSyncAvatar.value.weapon.max_level;
    avatarAscended.value = userCalc.isAscendedAtThreshold(
      selectedSyncAvatar.value.level_current,
      selectedSyncAvatar.value.promote_level,
    );
    selectPreferredWeapon();
    applyAvatarEditingState();
    return;
  }
  const role = selectedRole.value;
  if (!role) return;
  const avatar = <TGApp.Game.Avatar.Avatar & { promote_level?: number }>role.avatar;
  avatarAscended.value = userCalc.isAscendedAtThreshold(avatar.level, avatar.promote_level);
  selectPreferredWeapon();
  const wiki = await getWikiCharacterById(characterId);
  if (!useApiCalculation.value && selectedCharacterId.value === characterId) {
    avatarWiki.value = wiki;
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
    avatarTargetLevel,
    weaponTargetLevel,
    avatarTargetAscended,
    weaponTargetAscended,
    calculationMode,
    () => talentTargetLevels.value.join(","),
  ],
  clearApiResult,
);

watch(weaponOptions, () => selectPreferredWeapon());

watch(avatarTargetLevel, () => {
  avatarTargetAscended.value = false;
});

watch(weaponTargetLevel, () => {
  weaponTargetAscended.value = false;
});

watch(selectedWeapon, (weapon) => {
  if (!weapon) return;
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
    pendingWikiCharacterId.value = targetId;
    selectedCharacterId.value = targetId;
    await nextTick();
    if (!selectedCharacter.value) {
      showSnackbar.warn("接口模式仅支持存档中已有的角色，请切换到本地计算后再试");
    }
  } else if (targetType === "weapon") {
    useBagWeaponSource.value = false;
    await nextTick();
    selectedWeaponKey.value =
      weaponOptions.value.find((weapon) => weapon.wiki.id === targetId)?.key ?? null;
    if (!selectedWeaponKey.value) {
      showSnackbar.warn("接口模式仅支持当前角色装备的武器，请切换到本地计算后再试");
    }
  }
  await router.replace({ path: route.path, query: {} });
}

function createLevelOptions(max: number): Array<number> {
  return Array.from({ length: max }, (_, index) => index + 1);
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
    options.find((weapon) => weapon.wiki.id === roleWeaponId)?.key ?? options[0].key;
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

function createApiParams(
  refreshAccount: TGApp.Sqlite.Account.Game,
): TGApp.Game.Calculate.Params | undefined {
  const avatar = selectedSyncAvatar.value;
  const region = gameEnum.serverList.find((server) => server === refreshAccount.region);
  if (!avatar || !region) return undefined;

  const talentTargets = new Map(
    mainSkills.value.map((skill, index) => [
      skill.id,
      talentTargetLevels.value[index] ?? skill.level,
    ]),
  );
  const currentTalentLevelMap = new Map(mainSkills.value.map((skill) => [skill.id, skill.level]));
  const weapon: TGApp.Game.Calculate.WeaponTarget | null = selectedWeapon.value
    ? {
        ...avatar.weapon,
        level_target: weaponTargetLevel.value,
      }
    : null;

  return {
    items: [
      {
        avatar_id: avatar.id,
        avatar_level_current: avatar.level_current,
        avatar_level_target: avatarTargetLevel.value,
        element_attr_id: avatar.element_attr_id,
        skill_list: avatar.skill_list.map((skill) => {
          const levelCurrent = Math.max(
            currentTalentLevelMap.get(skill.id) ?? skill.level_current,
            1,
          );
          return {
            id: skill.group_id,
            level_current: levelCurrent,
            level_target: Math.max(talentTargets.get(skill.id) ?? levelCurrent, 1),
          };
        }),
        weapon,
        from_user_sync: true,
        avatar_promote_level: avatar.promote_level,
      },
    ],
    lang: "zh-cn",
    region,
    uid: refreshAccount.gameUid,
  };
}

function convertApiResult(
  result: TGApp.Game.Calculate.Result,
): Array<TGApp.App.UserCalc.ResultMaterial> {
  const available = getCalculateInventory(result);
  return result.overall_consume
    .map((material) => {
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
    })
    .sort((a, b) => b.missing - a.missing || b.star - a.star || a.id - b.id);
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
      await loadSyncAvatarData(uid, requestVersion);
      await loadInventoryData(uid, requestVersion);
    } else {
      await loadLocalData(uid, requestVersion);
    }
    if (requestVersion === dataLoadVersion) await loadProjects(uid);
  } finally {
    if (requestVersion === dataLoadVersion) loading.value = false;
  }
}

async function loadSyncAvatarData(uid: number, requestVersion: number): Promise<void> {
  const previousCharacterId = selectedCharacterId.value;
  try {
    const refreshAccount = await resolveApiAccount(uid, "Cultivation.loadSyncAvatarData");
    if (!refreshAccount) {
      clearSyncAvatarData(requestVersion);
      return;
    }
    const avatars = await requestSyncAvatars(refreshAccount);
    if (requestVersion !== dataLoadVersion || !useApiCalculation.value) return;
    syncAvatars.value = avatars;
    selectedWeaponKey.value = null;
    selectedCharacterId.value = syncAvatars.value.some(
      (avatar) => avatar.id === previousCharacterId,
    )
      ? previousCharacterId
      : (syncAvatars.value[0]?.id ?? null);
    if (selectedCharacterId.value === null) selectPreferredWeapon();
  } catch (error) {
    if (requestVersion !== dataLoadVersion) return;
    syncAvatars.value = [];
    selectedCharacterId.value = null;
    selectedWeaponKey.value = null;
    showSnackbar.error(`同步角色数据失败：${TGHttps.getErrMsg(error)}`);
  }
}

function clearSyncAvatarData(requestVersion: number): void {
  if (requestVersion !== dataLoadVersion) return;
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
  selectedCharacterId.value = roles.value.some((role) => role.cid === previousCharacterId)
    ? previousCharacterId
    : (roles.value[0]?.cid ?? null);
  if (selectedCharacterId.value === null) selectPreferredWeapon();
}

async function loadInventoryData(uid: number, requestVersion: number): Promise<void> {
  const materialData = await TSUserBagMaterial.getMaterial(uid);
  if (requestVersion !== dataLoadVersion) return;
  bagMaterials.value = new Map(materialData.map((material) => [material.id, material.count]));
  bagMaterialDetails.value = new Map(materialData.map((material) => [material.id, material]));
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
    await loadInventoryData(uid, dataLoadVersion);
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
      character.level,
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
    instanceKey: weapon.guid ?? (weapon.key.startsWith("wiki-") ? "" : weapon.key),
    name: weapon.wiki.name,
    icon: `/WIKI/weapon/${weapon.wiki.id}.webp`,
    star: weapon.wiki.star,
    currentState: createEntryState(
      weapon.level,
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

async function saveToPlan(): Promise<void> {
  const uid = currentUid.value;
  if (uid === undefined || !canSaveToPlan.value) return;
  const inputs: Array<TGApp.Sqlite.Cultivation.SaveEntryInput> = [];
  const avatarInput = createAvatarPlanInput();
  const weaponInput = createWeaponPlanInput();
  if ((!editingEntry.value || editingEntry.value.type === "avatar") && avatarInput) {
    inputs.push(avatarInput);
  }
  if ((!editingEntry.value || editingEntry.value.type === "weapon") && weaponInput) {
    inputs.push(weaponInput);
  }
  if (inputs.length === 0) {
    showSnackbar.warn("当前选择没有可保存的养成材料");
    return;
  }

  planLoading.value = true;
  try {
    const project =
      currentProject.value ??
      (await TSCultivationPlan.ensureCurrentProject(uid, currentTimezone.value));
    await TSCultivationPlan.saveEntries(
      project.id,
      inputs,
      useApiCalculation.value ? apiCalculationResult.value : undefined,
    );
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
  const preferredCharacterId =
    entry.type === "avatar" ? entry.itemId : getEntryWeaponAvatarId(entry.instanceKey);
  if (preferredCharacterId !== undefined) selectedCharacterId.value = preferredCharacterId;
  const editingCalculationMode: CalculationMode = entry.calculationMode === "api" ? "api" : "bag";
  await switchEditingCalculationMode(editingCalculationMode);
  if (editingEntry.value?.id !== entry.id) return;
  await nextTick();
  if (entry.type === "avatar") {
    selectedCharacterId.value = entry.itemId;
    applyAvatarEditingState();
    return;
  }
  const weapon = weaponOptions.value.find(
    (option) =>
      option.wiki.id === entry.itemId &&
      (entry.instanceKey.length === 0 ||
        option.guid === entry.instanceKey ||
        option.key === entry.instanceKey ||
        option.key === entry.instanceKey.replace(/^sync-/, "role-")),
  );
  if (weapon) {
    selectedWeaponKey.value = weapon.key;
    applyWeaponEditingState();
  } else {
    showSnackbar.warn("当前数据源中未找到该武器，请重新选择后更新目标");
  }
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

function getEntryWeaponAvatarId(instanceKey: string): number | undefined {
  const avatarId = Number(/^(?:role|sync)-(\d+)-/.exec(instanceKey)?.[1]);
  return Number.isInteger(avatarId) ? avatarId : undefined;
}

function applyAvatarEditingState(): void {
  const entry = editingEntry.value;
  if (!entry || entry.type !== "avatar" || entry.itemId !== selectedCharacterId.value) return;
  avatarTargetLevel.value = entry.targetState.level;
  avatarTargetAscended.value = entry.targetState.ascended;
  const targetMap = new Map(entry.targetState.talents.map((talent) => [talent.id, talent.level]));
  talentTargetLevels.value = mainSkills.value.map(
    (skill, index) =>
      targetMap.get(skill.id) ?? Math.max(currentTalentLevels.value[index] ?? skill.level, 1),
  );
}

function applyWeaponEditingState(): void {
  const entry = editingEntry.value;
  if (!entry || entry.type !== "weapon" || entry.itemId !== selectedWeapon.value?.wiki.id) return;
  weaponTargetLevel.value = entry.targetState.level;
  weaponTargetAscended.value = entry.targetState.ascended;
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
  const levelableSkillIds = new Set(
    wiki.skills.filter((skill) => skill.maxLv > 1).map((skill) => skill.id),
  );
  const skills = role.skills.filter(
    (skill) => skill.is_unlock && levelableSkillIds.has(skill.skill_id),
  );
  const currentTalentLevels = userCalc.recordTalentLevels(role, wiki);
  const avatar = <TGApp.Game.Avatar.Avatar & { promote_level?: number }>role.avatar;
  const currentPromoteLevel = userCalc.resolvePromoteLevel(avatar.level, avatar.promote_level);
  const targetTalentMap = new Map(
    entry.targetState.talents.map((talent) => [talent.id, talent.level]),
  );
  const targetTalentLevels = skills.map(
    (skill, index) =>
      targetTalentMap.get(skill.skill_id) ??
      Math.min(currentTalentLevels[index] ?? skill.level, 10),
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
      skills.map((skill, index) => ({
        id: skill.skill_id,
        name: skill.name,
        level: Math.min(currentTalentLevels[index] ?? skill.level, 10),
      })),
    ),
    status: entry.status === "completed" || requirements.length === 0 ? "completed" : "active",
    items: requirements.map((material) => ({
      materialId: material.id,
      required: material.count,
    })),
  };
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

async function refreshPlanEntries(): Promise<void> {
  const project = currentProject.value;
  if (!project) return;
  planLoading.value = true;
  let refreshedCount = 0;
  try {
    const localEntries = planEntries.value.filter((entry) => entry.calculationMode === "bag");
    const apiEntries = planEntries.value.filter((entry) => entry.calculationMode === "api");
    const [roleData, materialData, weaponData] =
      localEntries.length > 0
        ? await Promise.all([
            TSUserAvatar.getAvatars(project.uid),
            TSUserBagMaterial.getMaterial(project.uid),
            TSUserBagWeapon.getWeapon(project.uid),
          ])
        : [[], [], []];
    if (currentUid.value === project.uid && localEntries.length > 0) {
      bagMaterials.value = new Map(materialData.map((material) => [material.id, material.count]));
      bagMaterialDetails.value = new Map(materialData.map((material) => [material.id, material]));
    }
    const roleMap = new Map(roleData.map((role) => [role.cid, role]));
    const weaponOptionsForRefresh = buildWeaponOptions(weaponData, roleData);
    const apiAccount =
      apiEntries.length > 0
        ? await resolveApiAccount(project.uid, "Cultivation.refreshPlanEntries")
        : null;
    const syncAvatarData = apiAccount ? await requestSyncAvatars(apiAccount) : [];
    const apiTargets = createApiRefreshTargets(apiEntries, syncAvatarData);
    const apiTargetMap = new Map<string, ApiRefreshTarget>();
    for (const target of apiTargets) {
      if (target.avatarEntry) apiTargetMap.set(target.avatarEntry.id, target);
      if (target.weaponEntry) apiTargetMap.set(target.weaponEntry.id, target);
    }

    const processedEntryIds = new Set<string>();
    for (const entry of planEntries.value) {
      if (processedEntryIds.has(entry.id)) continue;
      if (entry.calculationMode === "bag") {
        const input =
          entry.type === "avatar"
            ? await (async () => {
                const role = roleMap.get(entry.itemId);
                return role ? await createAvatarRefreshInput(entry, role) : undefined;
              })()
            : createWeaponRefreshInput(entry, weaponOptionsForRefresh);
        processedEntryIds.add(entry.id);
        if (!input) continue;
        await TSCultivationPlan.refreshEntries(project.id, [input]);
        refreshedCount += 1;
        continue;
      }

      const target = apiTargetMap.get(entry.id);
      processedEntryIds.add(entry.id);
      if (!target) continue;
      if (target.avatarEntry) processedEntryIds.add(target.avatarEntry.id);
      if (target.weaponEntry) processedEntryIds.add(target.weaponEntry.id);
      if (!apiAccount) continue;
      const response = await calculateApiRefreshTarget(apiAccount, target);
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

    if (refreshedCount === 0) {
      showSnackbar.warn("最新存档中未找到可刷新的计划目标");
      return;
    }
    planEntries.value = await TSCultivationPlan.getEntries(project.id);
    showSnackbar.success(
      `已刷新 ${refreshedCount} 个目标${refreshedCount < planEntries.value.length ? "，其余目标缺少最新数据或对应 CK" : ""}`,
    );
  } catch (error) {
    planEntries.value = await TSCultivationPlan.getEntries(project.id);
    showSnackbar.error(`刷新计划目标失败：${TGHttps.getErrMsg(error)}`);
  } finally {
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
    const avatar = avatars.find((item) => item.id === avatarId);
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

function buildSyncWeaponOption(
  avatar: TGApp.Game.Calculate.SyncAvatar | undefined,
): TGApp.App.UserCalc.WeaponOption | undefined {
  if (!avatar) return undefined;
  const weapon = avatar.weapon;
  const wiki = wwWeapon.find((item) => item.id === weapon.id);
  if (!wiki) return undefined;
  return {
    key: `sync-${avatar.id}-${weapon.id}`,
    title: `${weapon.name} · Lv.${weapon.level_current}`,
    wiki,
    level: weapon.level_current,
    promoteLevel: userCalc.resolvePromoteLevel(weapon.level_current),
    affixLevel: 1,
    fromBag: false,
    locked: false,
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
      wiki,
      level: bagWeapon.info.level,
      promoteLevel: bagWeapon.info.promote_level,
      affixLevel: Math.max(0, ...affixValues) + 1,
      fromBag: true,
      locked: bagWeapon.info.is_locked,
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
      wiki,
      level: roleWeapon.level,
      promoteLevel: roleWeapon.promote_level,
      affixLevel: roleWeapon.affix_level,
      fromBag: false,
      locked: false,
    });
  }
  const existingWikiIds = new Set(
    result.filter((weapon) => !weapon.fromBag).map((weapon) => weapon.wiki.id),
  );
  for (const wiki of wwWeapon) {
    if (existingWikiIds.has(wiki.id)) continue;
    result.push({
      key: `wiki-${wiki.id}`,
      title: `${wiki.name} · Lv.1（规划）`,
      wiki,
      level: 1,
      promoteLevel: 0,
      affixLevel: 1,
      fromBag: false,
      locked: false,
    });
  }
  return result.sort(
    (a, b) =>
      b.wiki.star - a.wiki.star || b.level - a.level || a.wiki.name.localeCompare(b.wiki.name),
  );
}
</script>

<style lang="scss" scoped>
.cultivation-title {
  display: flex;
  align-items: center;
  padding-left: 12px;
  font-family: var(--font-title);
  font-size: 18px;
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
  min-height: 100%;
  flex-direction: column;
  padding: 12px;
  gap: 12px;
}

.cultivation-config {
  display: grid;
  align-items: stretch;
  gap: 12px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.cultivation-plan-toolbar,
.cultivation-plan-summary,
.cultivation-plan-heading,
.cultivation-plan-actions,
.cultivation-mode-actions {
  display: flex;
  align-items: center;
  color: var(--box-text-1);
}

.cultivation-plan-toolbar {
  width: 100%;
  height: 100%;
  flex-wrap: nowrap;
  justify-content: space-between;
  padding: 8px 16px;
  border-top: 1px solid var(--common-shadow-1);
  gap: 16px;
  overflow-x: auto;
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
}

.cultivation-plan-actions,
.cultivation-mode-actions {
  gap: 8px;
}

.cultivation-plan-actions {
  flex: none;
}

.cultivation-tab-window {
  width: 100%;
}

.cultivation-tab-content.v-window-item--active {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.cultivation-mode {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  gap: 12px;
}

.cultivation-mode-main {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.cultivation-mode-title {
  display: flex;
  align-items: center;
  font-family: var(--font-title);
  gap: 6px;
}

.cultivation-mode-hint {
  color: var(--common-text-sub);
  font-size: 13px;
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
  .cultivation-plan-summary {
    display: none;
  }

  .cultivation-config {
    grid-template-columns: 1fr;
  }
}

@media (width <= 600px) {
  .cultivation-page {
    padding: 8px;
  }

  .cultivation-mode {
    flex-direction: column;
    align-items: stretch;
  }

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
