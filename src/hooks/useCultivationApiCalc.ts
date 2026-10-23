/**
 * 养成计算页的接口计算与计划刷新输入构建。
 * @since Beta v0.13.0
 */

import showSnackbar from "@comp/func/snackbar.js";
import gameEnum from "@enum/game.js";
import { createEntryState } from "@hooks/useCultivationCalculator.js";
import { getElementNameByAttrId } from "@hooks/useCultivationOptions.js";
import takumiReq from "@req/takumiReq.js";
import { sortCultivationResults } from "@utils/game/cultivationPlan.js";
import userCalc from "@utils/game/userCalc.js";
import type { CultivationMaterial } from "@utils/game/userCalc.js";
import TGHttps from "@utils/network/TGHttps.js";
import { watch } from "vue";
import type { ComputedRef, Ref } from "vue";

import { WikiMaterialData } from "@/data/index.js";

type CalculationMode = TGApp.Sqlite.Cultivation.CalculationMode;

/** 接口刷新的计算目标。 */
export type ApiRefreshTarget = {
  avatar: TGApp.Game.Calculate.SyncAvatar;
  avatarEntry?: TGApp.Sqlite.Cultivation.EntryWithItems;
  weaponEntry?: TGApp.Sqlite.Cultivation.EntryWithItems;
};

/** 接口计算域依赖的共享状态与跨域回调。 */
type CultivationApiCalcDeps = {
  /** 当前选中的数据 UID */
  currentUid: Ref<number | undefined>;
  /** 养成计算模式 */
  calculationMode: Ref<CalculationMode>;
  /** 当前选中的角色 ID */
  selectedCharacterId: Ref<number | null>;
  /** 当前选中的武器选项键 */
  selectedWeaponKey: Ref<string | null>;
  /** 角色当前等级 */
  avatarCurrentLevel: Ref<number>;
  /** 角色目标等级 */
  avatarTargetLevel: Ref<number>;
  /** 武器当前等级 */
  weaponCurrentLevel: Ref<number>;
  /** 武器目标等级 */
  weaponTargetLevel: Ref<number>;
  /** 角色目标是否已突破 */
  avatarTargetAscended: Ref<boolean>;
  /** 武器目标是否已突破 */
  weaponTargetAscended: Ref<boolean>;
  /** 天赋当前等级列表 */
  talentCurrentLevels: Ref<Array<number>>;
  /** 天赋目标等级列表 */
  talentTargetLevels: Ref<Array<number>>;
  /** 接口计算加载中标记 */
  apiLoading: Ref<boolean>;
  /** 接口计算已完成标记 */
  apiCalculated: Ref<boolean>;
  /** 接口计算的材料展示列表 */
  apiResultMaterials: Ref<Array<TGApp.App.UserCalc.ResultMaterial>>;
  /** 接口计算的角色材料需求 */
  apiAvatarRequirements: Ref<Array<CultivationMaterial>>;
  /** 接口计算的武器材料需求 */
  apiWeaponRequirements: Ref<Array<CultivationMaterial>>;
  /** 最近一次接口计算原始结果 */
  apiCalculationResult: Ref<TGApp.Game.Calculate.Result | undefined>;
  /** 当前选中的角色选项 */
  selectedCharacter: ComputedRef<TGApp.App.UserCalc.CharacterOption | undefined>;
  /** 当前选中的接口目录角色 */
  selectedApiAvatar: ComputedRef<TGApp.Game.Calculate.AvatarListItem | undefined>;
  /** 当前选中的接口同步角色 */
  selectedSyncAvatar: ComputedRef<TGApp.Game.Calculate.SyncAvatar | undefined>;
  /** 当前选中的武器选项 */
  selectedWeapon: ComputedRef<TGApp.App.UserCalc.WeaponOption | undefined>;
  /** 主天赋选项列表 */
  mainSkills: ComputedRef<Array<TGApp.App.UserCalc.SkillOption>>;
  /** 当前天赋等级列表 */
  currentTalentLevels: ComputedRef<Array<number>>;
  /** 解析 UID 对应的可用账号与刷新用 Cookie */
  resolveApiAccount: (uid: number, logPrefix: string) => Promise<TGApp.App.Account.RfAc | null>;
  /** 保存接口计算结果中的背包材料 */
  saveCalculateInventory: (uid: number, result: TGApp.Game.Calculate.Result) => Promise<number>;
  /** 载入背包材料计数 */
  loadInventoryData: (uid: number, requestVersion: number) => Promise<void>;
  /** 数据载入代次 */
  dataLoadVersion: Ref<number>;
};

/**
 * 创建养成计算的接口计算与刷新输入构建。
 * @since Beta v0.13.0
 * @param deps - 共享状态依赖与跨域回调
 * @returns 接口计算入口与刷新输入构建函数
 */
export function useCultivationApiCalc(deps: CultivationApiCalcDeps) {
  const {
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
  } = deps;

  let apiResultVersion = 0;

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

  /**
   * 清空接口计算结果。
   * @since Beta v0.13.0
   */
  function clearApiResult(): void {
    apiResultVersion += 1;
    apiCalculated.value = false;
    apiResultMaterials.value = [];
    apiAvatarRequirements.value = [];
    apiWeaponRequirements.value = [];
    apiCalculationResult.value = undefined;
  }

  /**
   * 将接口材料消耗转为材料需求列表。
   * @since Beta v0.13.0
   * @param materials - 接口材料消耗
   * @returns 材料需求列表
   */
  function toCultivationMaterials(
    materials: ReadonlyArray<TGApp.Game.Calculate.Material>,
  ): Array<CultivationMaterial> {
    return materials
      .filter((material) => material.num > 0)
      .map((material) => ({ id: material.id, count: material.num }));
  }

  /**
   * 构建接口计算请求参数。
   * @since Beta v0.13.0
   * @param refreshAccount - 可用的游戏账号
   * @returns 请求参数；未选择有效目标时为 undefined
   */
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
              currentTalentLevelMap.get(skill.id) ??
                syncedSkillMap.get(skill.id)?.level_current ??
                1,
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

  /**
   * 构建接口计算请求中的武器目标。
   * @since Beta v0.13.0
   * @param weapon - 武器选项
   * @param levelTarget - 目标等级
   * @param includeDetails - 是否附带武器详情
   * @returns 武器目标
   */
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

  /**
   * 将中文武器类型转为接口武器类别 ID。
   * @since Beta v0.13.0
   * @param weaponType - 中文武器类型
   * @returns 接口武器类别 ID
   */
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

  /**
   * 将接口计算结果转为材料展示列表。
   * @since Beta v0.13.0
   * @param result - 接口计算结果
   * @returns 材料展示列表
   */
  function convertApiResult(
    result: TGApp.Game.Calculate.Result,
  ): Array<TGApp.App.UserCalc.ResultMaterial> {
    return sortCultivationResults(
      result.overall_consume.map((material) => {
        const wiki = WikiMaterialData.find((item) => item.id === material.id);
        // 接口缺口已经计算了接口侧的合成，`num - lack_num` 只用于展示有效进度，不能作为
        // 背包库存写回或参与后续本地合成。
        const owned = Math.max(material.num - material.lack_num, 0);
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

  /**
   * 通过米游社接口计算当前养成目标的材料需求。
   * @since Beta v0.13.0
   */
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
      if (changedMaterials > 0) await loadInventoryData(uid, dataLoadVersion.value);
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

  /**
   * 计算单个接口刷新目标的材料结果。
   * @since Beta v0.13.0
   * @param refreshAccount - 可用的账号与 Cookie
   * @param target - 接口刷新目标
   * @returns 接口计算结果
   */
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

  /**
   * 由计划条目与同步角色构建接口刷新目标。
   * @since Beta v0.13.0
   * @param entries - 计划目标条目
   * @param avatars - 接口同步角色列表
   * @returns 接口刷新目标列表
   */
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
              (item) =>
                item.type === "avatar" && item.itemId === getSyncAvatarId(entry.instanceKey),
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

  /**
   * 从同步实例键解析角色 ID。
   * @since Beta v0.13.0
   * @param instanceKey - 同步实例键
   * @returns 角色 ID；无法解析时为 undefined
   */
  function getSyncAvatarId(instanceKey: string): number | undefined {
    const avatarId = Number(/^sync-(\d+)-/.exec(instanceKey)?.[1]);
    return Number.isInteger(avatarId) ? avatarId : undefined;
  }

  /**
   * 构建接口刷新目标的请求条目。
   * @since Beta v0.13.0
   * @param target - 接口刷新目标
   * @returns 请求条目
   */
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

  /**
   * 由接口计算结果构建刷新输入。
   * @since Beta v0.13.0
   * @param target - 接口刷新目标
   * @param result - 单条接口计算结果
   * @returns 刷新输入列表
   */
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
          getElementNameByAttrId(target.avatar.element_attr_id),
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

  return {
    calculateWithApi,
    calculateApiRefreshTarget,
    createApiRefreshTargets,
    createApiRefreshInputsFromResult,
  };
}
