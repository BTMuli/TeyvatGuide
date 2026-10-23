/**
 * 养成计算页的编辑器状态与目标应用。
 * @since Beta v0.13.0
 */

import showSnackbar from "@comp/func/snackbar.js";
import { TRAVELER_IDS } from "@hooks/useCultivationOptions.js";
import userCalc from "@utils/game/userCalc.js";
import type { CultivationMaterial } from "@utils/game/userCalc.js";
import { computed, nextTick, shallowRef, watch } from "vue";
import type { ComputedRef, Ref } from "vue";

import { getWikiCharacterById } from "@/data/index.js";

type CalculationMode = TGApp.Sqlite.Cultivation.CalculationMode;
type CultivationViewTab = "calculator" | "targets";

/** 编辑器域依赖的共享状态与跨域回调。 */
type CultivationCalculatorDeps = {
  /** 是否为 Windows 平台（可读取本地背包） */
  isWindows: boolean;
  /** 当前 UID 是否存在背包存档 */
  hasBagDataSource: ComputedRef<boolean>;
  /** 是否使用接口计算 */
  useApiCalculation: ComputedRef<boolean>;
  /** 当前视图页签 */
  viewTab: Ref<CultivationViewTab>;
  /** 养成计算模式 */
  calculationMode: Ref<CalculationMode>;
  /** 正在编辑的计划条目 */
  editingEntry: Ref<TGApp.Sqlite.Cultivation.EntryWithItems | undefined>;
  /** 查找条目在计划中的成对条目 */
  getPairedPlanEntry: (
    entry: TGApp.Sqlite.Cultivation.EntryWithItems,
  ) => TGApp.Sqlite.Cultivation.EntryWithItems | undefined;
  /** 编辑目标时切换计算模式并重载数据 */
  switchEditingCalculationMode: (mode: CalculationMode) => Promise<void>;
  /** 当前选中的角色选项 */
  selectedCharacter: ComputedRef<TGApp.App.UserCalc.CharacterOption | undefined>;
  /** 当前选中的本地战绩角色 */
  selectedRole: ComputedRef<TGApp.Sqlite.Character.TableTrans | undefined>;
  /** 当前选中的接口目录角色 */
  selectedApiAvatar: ComputedRef<TGApp.Game.Calculate.AvatarListItem | undefined>;
  /** 当前选中的接口同步角色 */
  selectedSyncAvatar: ComputedRef<TGApp.Game.Calculate.SyncAvatar | undefined>;
  /** 当前选中的武器选项 */
  selectedWeapon: ComputedRef<TGApp.App.UserCalc.WeaponOption | undefined>;
  /** 武器选项列表 */
  weaponOptions: ComputedRef<Array<TGApp.App.UserCalc.WeaponOption>>;
  /** 选择当前角色最合适的武器 */
  selectPreferredWeapon: (force?: boolean) => void;
  /** 当前选中的角色 ID */
  selectedCharacterId: Ref<number | null>;
  /** 当前选中的武器选项键 */
  selectedWeaponKey: Ref<string | null>;
  /** 角色当前等级 */
  avatarCurrentLevel: Ref<number>;
  /** 角色目标等级 */
  avatarTargetLevel: Ref<number>;
  /** 天赋当前等级列表 */
  talentCurrentLevels: Ref<Array<number>>;
  /** 天赋目标等级列表 */
  talentTargetLevels: Ref<Array<number>>;
  /** 武器当前等级 */
  weaponCurrentLevel: Ref<number>;
  /** 武器目标等级 */
  weaponTargetLevel: Ref<number>;
  /** 角色当前是否已突破 */
  avatarAscended: Ref<boolean>;
  /** 武器当前是否已突破 */
  weaponAscended: Ref<boolean>;
  /** 角色目标是否已突破 */
  avatarTargetAscended: Ref<boolean>;
  /** 武器目标是否已突破 */
  weaponTargetAscended: Ref<boolean>;
  /** 是否允许合成消耗 */
  allowCrafting: Ref<boolean>;
  /** 是否使用尘辉兑换 */
  useDust: Ref<boolean>;
  /** 是否使用嬗变之尘 */
  useSolvent: Ref<boolean>;
  /** 接口计算的角色材料需求 */
  apiAvatarRequirements: Ref<Array<CultivationMaterial>>;
  /** 接口计算的武器材料需求 */
  apiWeaponRequirements: Ref<Array<CultivationMaterial>>;
};

/**
 * 创建养成计算的编辑器状态与目标应用。
 * @since Beta v0.13.0
 * @param deps - 共享状态依赖与跨域回调
 * @returns 编辑器 computed、输入构建与编辑控制入口
 */
export function useCultivationCalculator(deps: CultivationCalculatorDeps) {
  const {
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
  } = deps;

  const avatarWiki = shallowRef<TGApp.App.Character.WikiItem | false>(false);

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
    const role = selectedRole.value;
    const wiki = avatarWiki.value;
    const roleSkills = role?.skills ?? [];
    if (!wiki) {
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
    if (!role) {
      return wiki.skills
        .filter((skill) => skill.maxLv > 1)
        .map((skill) => ({
          id: skill.id,
          name: skill.name,
          icon: `/icon/talents/${skill.icon}.webp`,
          level: 1,
          maxLevel: skill.maxLv,
        }));
    }
    return userCalc.recordTalentSkills(role, wiki).map(({ recordSkill, wikiSkill }) => ({
      id: wikiSkill.id,
      name: recordSkill.name,
      icon: recordSkill.icon,
      level: recordSkill.level,
      maxLevel: wikiSkill.maxLv,
    }));
  });
  const currentTalentLevels = computed<Array<number>>(() => {
    if (avatarCurrentStateEditable.value) {
      return mainSkills.value.map(
        (skill, index) => talentCurrentLevels.value[index] ?? skill.level,
      );
    }
    const levels = mainSkills.value.map((skill) => skill.level);
    if (useApiCalculation.value) return levels;
    if (!avatarWiki.value) return levels;
    if (selectedRole.value)
      return userCalc.recordTalentLevels(selectedRole.value, avatarWiki.value);
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
      selectedWeapon.value.api?.max_level ??
        userCalc.weaponMaxLevel(selectedWeapon.value.wiki.star),
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
  const weaponCurrentStateEditable = computed<boolean>(
    () => selectedWeapon.value !== undefined && selectedWeapon.value.source !== "bag",
  );

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

  watch(selectedCharacter, async (character) => {
    avatarWiki.value = false;
    if (!character) return;
    const characterId = character.value;
    avatarCurrentLevel.value = character.level;
    avatarTargetLevel.value = Math.min(
      avatarLevelOptions.value.at(-1) ?? 90,
      Math.max(90, character.level),
    );
    avatarTargetAscended.value = false;
    talentCurrentLevels.value = mainSkills.value.map((skill) => skill.level);
    talentTargetLevels.value = mainSkills.value.map((skill) => skill.maxLevel);
    if (selectedSyncAvatar.value) {
      weaponTargetLevel.value = selectedSyncAvatar.value.weapon.max_level;
      avatarAscended.value = userCalc.isAscendedAtThreshold(
        selectedSyncAvatar.value.level_current,
        selectedSyncAvatar.value.promote_level,
      );
    } else {
      const role = selectedRole.value;
      if (role) {
        const avatar = <TGApp.Game.Avatar.Avatar & { promote_level?: number }>role.avatar;
        avatarAscended.value = userCalc.isAscendedAtThreshold(avatar.level, avatar.promote_level);
      } else {
        avatarAscended.value = false;
      }
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

  watch(selectedCharacterId, () => selectPreferredWeapon(true));
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

  /**
   * 生成 1..max 的等级选项。
   * @since Beta v0.13.0
   * @param max - 最大等级
   * @returns 等级选项列表
   */
  function createLevelOptions(max: number): Array<number> {
    return Array.from({ length: max }, (_, index) => index + 1);
  }

  /**
   * 构建角色目标的保存输入。
   * @since Beta v0.13.0
   * @returns 保存输入；无有效需求时为 undefined
   */
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
        character.element,
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

  /**
   * 构建武器目标的保存输入。
   * @since Beta v0.13.0
   * @returns 保存输入；无有效需求时为 undefined
   */
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

  /**
   * 解析武器选项对应的实例键；编辑计划目标时沿用已保存键。
   * @since Beta v0.13.0
   * @param weapon - 武器选项
   * @returns 实例键
   */
  function resolveWeaponInstanceKey(weapon: TGApp.App.UserCalc.WeaponOption): string {
    if (editingEntry.value?.type === "weapon") return editingEntry.value.instanceKey;
    const paired =
      editingEntry.value?.type === "avatar" ? getPairedPlanEntry(editingEntry.value) : undefined;
    if (paired?.type === "weapon" && paired.itemId === weapon.wiki.id) return paired.instanceKey;
    return weapon.guid ?? (weapon.source === "catalog" ? "" : weapon.key);
  }

  /**
   * 进入新增养成目标编辑态。
   * @since Beta v0.13.0
   */
  function startAddingTarget(): void {
    editingEntry.value = undefined;
    viewTab.value = "calculator";
  }

  /**
   * 取消编辑并回到目标列表。
   * @since Beta v0.13.0
   */
  function cancelEditing(): void {
    editingEntry.value = undefined;
    viewTab.value = "targets";
  }

  /**
   * 进入已保存目标的编辑态并应用其状态。
   * @since Beta v0.13.0
   * @param entry - 计划目标条目
   */
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

  /**
   * 在武器选项中查找计划目标对应的武器。
   * @since Beta v0.13.0
   * @param entry - 计划目标条目
   * @returns 匹配的武器选项
   */
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

  /**
   * 将已保存角色目标的状态应用到编辑器。
   * @since Beta v0.13.0
   * @param entry - 计划目标条目
   */
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

  /**
   * 将正在编辑条目（或其成对角色目标）的状态应用到编辑器。
   * @since Beta v0.13.0
   */
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

  /**
   * 读取已保存的天赋等级。
   * @since Beta v0.13.0
   * @param talents - 已保存天赋状态
   * @param skill - 当前天赋选项
   * @returns 匹配的等级；未匹配时为 undefined
   */
  function getSavedTalentLevel(
    talents: ReadonlyArray<TGApp.Sqlite.Cultivation.TalentState>,
    skill: TGApp.App.UserCalc.SkillOption,
  ): number | undefined {
    return (
      talents.find((talent) => talent.id === skill.id)?.level ??
      talents.find((talent) => talent.name === skill.name)?.level
    );
  }

  /**
   * 将已保存武器目标的状态应用到编辑器。
   * @since Beta v0.13.0
   * @param entry - 计划目标条目
   */
  function applyWeaponEntryState(entry: TGApp.Sqlite.Cultivation.EntryWithItems): void {
    if (entry.type !== "weapon" || entry.itemId !== selectedWeapon.value?.wiki.id) return;
    if (weaponCurrentStateEditable.value) {
      weaponCurrentLevel.value = entry.currentState.level;
      weaponAscended.value = entry.currentState.ascended;
    }
    weaponTargetLevel.value = entry.targetState.level;
    weaponTargetAscended.value = entry.targetState.ascended;
  }

  /**
   * 将正在编辑条目（或其成对武器目标）的状态应用到编辑器。
   * @since Beta v0.13.0
   */
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

  return {
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
  };
}

/**
 * 构建条目状态记录。
 * @since Beta v0.13.0
 * @param level - 等级
 * @param promoteLevel - 突破阶段
 * @param ascended - 是否已突破
 * @param talents - 天赋状态
 * @param element - 元素名
 * @returns 条目状态
 */
export function createEntryState(
  level: number,
  promoteLevel: number,
  ascended: boolean,
  talents: Array<TGApp.Sqlite.Cultivation.TalentState> = [],
  element?: string,
): TGApp.Sqlite.Cultivation.EntryState {
  return { level, promoteLevel, ascended, talents, element };
}
