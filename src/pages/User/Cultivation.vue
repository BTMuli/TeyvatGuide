<!-- 养成计算 -->
<template>
  <v-app-bar>
    <template #prepend>
      <div class="cultivation-title">
        <v-icon color="var(--tgc-od-orange)">mdi-calculator-variant-outline</v-icon>
        <span>养成计算</span>
      </div>
    </template>
    <template #append>
      <v-select
        v-model="currentUid"
        :hide-details="true"
        :items="uidList"
        density="compact"
        label="数据 UID"
        variant="outlined"
        width="190"
      />
      <v-btn
        :loading="loading || apiLoading"
        icon="mdi-refresh"
        title="重新加载"
        variant="text"
        @click="reload"
      />
    </template>
  </v-app-bar>

  <div class="cultivation-page">
    <div v-if="uidList.length === 0" class="cultivation-empty">
      <v-icon size="64">mdi-database-off-outline</v-icon>
      <span>没有可用于计算的角色或背包存档</span>
    </div>

    <template v-else>
      <v-card class="cultivation-mode" variant="outlined">
        <div class="cultivation-mode-main">
          <div class="cultivation-mode-title">
            <v-icon color="var(--tgc-od-orange)" size="20">mdi-calculator-variant-outline</v-icon>
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
            <v-btn :disabled="isTraveler" value="local">本地计算</v-btn>
            <v-btn value="api">接口计算</v-btn>
          </v-btn-toggle>
          <v-chip v-else color="var(--tgc-od-orange)" variant="tonal">接口计算</v-chip>
          <span class="cultivation-mode-hint">{{ calculationHint }}</span>
        </div>
        <v-btn
          v-if="useApiCalculation"
          :disabled="!canApiCalculate"
          :loading="apiLoading"
          color="var(--tgc-od-orange)"
          prepend-icon="mdi-check-circle-outline"
          variant="flat"
          @click="calculateWithApi"
        >
          确认计算
        </v-btn>
      </v-card>

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
          :selected-character="selectedCharacter"
          :skills="mainSkills"
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
          :selected-weapon="selectedWeapon"
          :target-at-ascension-level="weaponTargetAtAscensionLevel"
        />
      </div>

      <UcMaterialResult
        v-model:allow-crafting="allowCrafting"
        v-model:use-dust="useDust"
        :bag-materials="resultBagMaterialDetails"
        :empty-text="resultEmptyText"
        :loading="apiLoading"
        :materials="displayResultMaterials"
        :missing-kinds="missingKinds"
        :show-crafting-options="!useApiCalculation"
        :uid="currentUid ?? 0"
      />
    </template>
  </div>
</template>

<script lang="ts" setup>
import showSnackbar from "@comp/func/snackbar.js";
import TSUserAvatar from "@Sqlm/userAvatar.js";
import TSUserBagMaterial from "@Sqlm/userBagMaterial.js";
import TSUserBagWeapon from "@Sqlm/userBagWeapon.js";
import gameEnum from "@enum/game.js";
import takumiReq from "@req/takumiReq.js";
import useUserStore from "@store/user.js";
import UcCharacterPanel from "@comp/userCalc/uc-character-panel.vue";
import UcMaterialResult from "@comp/userCalc/uc-material-result.vue";
import UcWeaponPanel from "@comp/userCalc/uc-weapon-panel.vue";
import { platform } from "@tauri-apps/plugin-os";
import TGHttps from "@utils/TGHttps.js";
import { getRcStar, getZhElement } from "@utils/toolFunc.js";
import userCalc, { type CraftableMaterial, type CultivationMaterial } from "@utils/userCalc.js";
import { storeToRefs } from "pinia";
import { computed, onMounted, ref, shallowRef, watch } from "vue";

import { getWikiCharacterById, WikiMaterialData, wwWeapon } from "@/data/index.js";

const EXCLUDED_CHARACTER_IDS = new Set([10000117, 10000118]);
const TRAVELER_IDS = new Set([10000005, 10000007]);
const EMPTY_BAG_MATERIAL_DETAILS: ReadonlyMap<number, TGApp.Sqlite.UserBag.MaterialTable> =
  new Map();

type CalculationMode = "local" | "api";

const { account, cookie } = storeToRefs(useUserStore());

const isWindows = platform() === "windows";
const loading = ref<boolean>(false);
const apiLoading = ref<boolean>(false);
const apiCalculated = ref<boolean>(false);
const calculationMode = ref<CalculationMode>(isWindows ? "local" : "api");
const currentUid = ref<number>();
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

const uidList = shallowRef<Array<number>>([]);
const roles = shallowRef<Array<TGApp.Sqlite.Character.TableTrans>>([]);
const weapons = shallowRef<Array<TGApp.App.UserCalc.WeaponOption>>([]);
const bagMaterials = shallowRef<Map<number, number>>(new Map());
const bagMaterialDetails = shallowRef<Map<number, TGApp.Sqlite.UserBag.MaterialTable>>(new Map());
const avatarWiki = shallowRef<TGApp.App.Character.WikiItem | false>(false);
const syncAvatars = shallowRef<Array<TGApp.Game.Calculate.SyncAvatar>>([]);
const apiResultMaterials = shallowRef<Array<TGApp.App.UserCalc.ResultMaterial>>([]);
let apiResultVersion = 0;
let dataLoadVersion = 0;
let settingUid = false;

const useApiCalculation = computed<boolean>(() => !isWindows || calculationMode.value === "api");
const localCharacterOptions = computed<Array<TGApp.App.UserCalc.CharacterOption>>(() =>
  roles.value.map((role) => {
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
  }),
);
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
  () =>
    !apiLoading.value &&
    selectedSyncAvatar.value !== undefined &&
    cookie.value !== undefined &&
    currentUid.value === Number(account.value.gameUid),
);
const calculationHint = computed<string>(() => {
  if (isTraveler.value) return "已为旅行者强制使用接口计算";
  if (!isWindows) return "当前平台不支持读取游戏背包，材料将由米游社接口计算";
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
    level: Math.min(skill.level, 10),
    maxLevel: 10,
  }));
});
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
  if (!selectedRole.value) return 0;
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

const requiredMaterials = computed<Array<CultivationMaterial>>(() => {
  const groups: Array<Array<CultivationMaterial>> = [];
  if (selectedRole.value && avatarWiki.value) {
    groups.push(
      userCalc.avatar(
        selectedRole.value,
        avatarWiki.value,
        avatarTargetLevel.value,
        talentTargetLevels.value,
        avatarCurrentPromoteLevel.value,
        avatarTargetAscended.value,
      ),
    );
  }
  if (selectedWeapon.value) {
    groups.push(
      userCalc.weapon(
        selectedWeapon.value.wiki,
        selectedWeapon.value.level,
        weaponCurrentPromoteLevel.value,
        weaponTargetLevel.value,
        weaponTargetAscended.value,
      ),
    );
  }
  return userCalc.merge(...groups);
});
const craftableMaterials = computed<Map<number, CraftableMaterial>>(() => {
  if (!allowCrafting.value) return new Map();
  return userCalc.craft(
    requiredMaterials.value,
    bagMaterials.value,
    WikiMaterialData,
    useDust.value,
  );
});
const localResultMaterials = computed<Array<TGApp.App.UserCalc.ResultMaterial>>(() =>
  requiredMaterials.value
    .map((required) => {
      const info = WikiMaterialData.find((material) => material.id === required.id);
      const owned = bagMaterials.value.get(required.id) ?? 0;
      const crafting = craftableMaterials.value.get(required.id);
      const craftable = crafting?.count ?? 0;
      const available = owned + craftable;
      const craftingCosts: Array<TGApp.App.UserCalc.CraftingCost> = (crafting?.consumed ?? [])
        .map((cost) => {
          const costInfo = WikiMaterialData.find((material) => material.id === cost.id);
          return {
            id: cost.id,
            name: costInfo?.name ?? `材料 ${cost.id}`,
            type: costInfo?.type ?? "未知类型",
            star: costInfo?.star ?? 1,
            count: cost.count,
            owned: bagMaterials.value.get(cost.id) ?? 0,
          };
        })
        .sort((a, b) => b.star - a.star || a.id - b.id);
      return {
        id: required.id,
        name: info?.name ?? `材料 ${required.id}`,
        type: info?.type ?? "未知类型",
        star: info?.star ?? 1,
        required: required.count,
        owned,
        craftable,
        craftingCosts,
        missing: Math.max(required.count - available, 0),
        progress: required.count === 0 ? 100 : Math.min((available / required.count) * 100, 100),
      };
    })
    .sort((a, b) => b.missing - a.missing || b.star - a.star || a.id - b.id),
);
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
    : "接口计算仅支持当前登录的游戏 UID，请先选择角色并确认账号";
});

watch(
  currentUid,
  async (uid) => {
    if (!settingUid && uid !== undefined) await loadUidData(uid);
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
  }
});

watch(isTraveler, (traveler) => {
  if (traveler) calculationMode.value = "api";
});

watch(useApiCalculation, reload);

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
});

onMounted(reload);

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

function createApiParams(): TGApp.Game.Calculate.Params | undefined {
  const avatar = selectedSyncAvatar.value;
  const uid = currentUid.value;
  const region = gameEnum.serverList.find((server) => server === account.value.region);
  if (!avatar || uid === undefined || !region) return undefined;

  const talentTargets = new Map(
    mainSkills.value.map((skill, index) => [
      skill.id,
      talentTargetLevels.value[index] ?? skill.level,
    ]),
  );
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
          const levelCurrent = Math.max(skill.level_current, 1);
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
    uid: String(uid),
  };
}

function convertApiResult(
  result: TGApp.Game.Calculate.Result,
): Array<TGApp.App.UserCalc.ResultMaterial> {
  const available = new Map(
    result.available_material.map((material) => [material.id, material.num]),
  );
  return result.overall_consume
    .map((material) => {
      const wiki = WikiMaterialData.find((item) => item.id === material.id);
      const owned = available.get(material.id) ?? Math.max(material.num - material.lack_num, 0);
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
  if (apiLoading.value || !cookie.value) return;
  if (currentUid.value !== Number(account.value.gameUid)) {
    showSnackbar.warn("接口计算仅支持当前登录的游戏 UID");
    return;
  }
  const params = createApiParams();
  if (!params) {
    showSnackbar.warn("请先选择角色、武器并设置养成目标");
    return;
  }

  clearApiResult();
  const requestVersion = apiResultVersion;
  apiLoading.value = true;
  try {
    const response = await takumiReq.calculate.batch(cookie.value, params);
    if (requestVersion !== apiResultVersion) return;
    if (response.retcode !== 0) {
      showSnackbar.error(`[${response.retcode}] ${response.message}`);
      return;
    }
    apiResultMaterials.value = convertApiResult(response.data);
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

async function reload(): Promise<void> {
  loading.value = true;
  try {
    const loginUid = Number(account.value.gameUid);
    if (useApiCalculation.value) {
      uidList.value = cookie.value && Number.isInteger(loginUid) && loginUid > 0 ? [loginUid] : [];
    } else {
      const [avatarUids, materialUids, weaponUids] = await Promise.all([
        TSUserAvatar.getAllUid(),
        TSUserBagMaterial.getAllUid(),
        TSUserBagWeapon.getAllUid(),
      ]);
      uidList.value = Array.from(
        new Set([...avatarUids.map(Number), ...materialUids, ...weaponUids]),
      ).sort((a, b) => a - b);
    }
    const nextUid = uidList.value.includes(loginUid) ? loginUid : uidList.value[0];
    settingUid = true;
    currentUid.value = nextUid;
    settingUid = false;
    if (nextUid !== undefined) await loadUidData(nextUid);
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
    } else {
      await loadLocalData(uid, requestVersion);
    }
  } finally {
    if (requestVersion === dataLoadVersion) loading.value = false;
  }
}

async function loadSyncAvatarData(uid: number, requestVersion: number): Promise<void> {
  const currentCookie = cookie.value;
  const region = gameEnum.serverList.find((server) => server === account.value.region);
  if (!currentCookie || uid !== Number(account.value.gameUid) || !region) {
    syncAvatars.value = [];
    selectedCharacterId.value = null;
    selectedWeaponKey.value = null;
    return;
  }
  try {
    const response = await takumiReq.calculate.avatar.sync(currentCookie, {
      element_attr_ids: [],
      lang: "zh-cn",
      page: 1,
      region,
      size: 200,
      uid: String(uid),
      weapon_cat_ids: [],
    });
    if (requestVersion !== dataLoadVersion || !useApiCalculation.value) return;
    if (response.retcode !== 0) {
      syncAvatars.value = [];
      selectedCharacterId.value = null;
      selectedWeaponKey.value = null;
      showSnackbar.error(`[${response.retcode}] ${response.message}`);
      return;
    }
    const previousCharacterId = selectedCharacterId.value;
    syncAvatars.value = response.data.list.filter(
      (avatar) => !EXCLUDED_CHARACTER_IDS.has(avatar.id),
    );
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

async function loadLocalData(uid: number, requestVersion: number): Promise<void> {
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
  selectedCharacterId.value = roles.value[0]?.cid ?? null;
  if (selectedCharacterId.value === null) selectPreferredWeapon();
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
      promoteLevel: userCalc.resolveBagWeaponPromoteLevel(
        bagWeapon.info.level,
        bagWeapon.info.promote_level,
      ),
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
}
</style>
