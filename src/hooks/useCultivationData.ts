/**
 * 养成计算页的数据加载与 UID/计算模式编排。
 * @since Beta v0.13.0
 */

import showSnackbar from "@comp/func/snackbar.js";
import gameEnum from "@enum/game.js";
import { buildWeaponOptions, EXCLUDED_CHARACTER_IDS } from "@hooks/useCultivationOptions.js";
import takumiReq from "@req/takumiReq.js";
import TSCultivationPlan from "@Sqlm/cultivationPlan.js";
import TSUserAccount from "@Sqlm/userAccount.js";
import TSUserAvatar from "@Sqlm/userAvatar.js";
import TSUserBagAvatar from "@Sqlm/userBagAvatar.js";
import TSUserBagMaterial from "@Sqlm/userBagMaterial.js";
import TSUserBagWeapon from "@Sqlm/userBagWeapon.js";
import TSUserRecord from "@Sqlm/userRecord.js";
import useUserStore from "@store/user.js";
import { getRfAc } from "@utils/account/acUtils.js";
import { maskUid } from "@utils/display/TGUid.js";
import { tryCallYae } from "@utils/game/TGGame.js";
import TGHttps from "@utils/network/TGHttps.js";
import { storeToRefs } from "pinia";
import { nextTick, ref, watch } from "vue";
import type { ComputedRef, Ref } from "vue";

type CalculationMode = TGApp.Sqlite.Cultivation.CalculationMode;

/** 数据域依赖的共享状态与跨域回调。 */
type CultivationDataDeps = {
  /** 是否为 Windows 平台（可读取本地背包） */
  isWindows: boolean;
  /** 当前选中的数据 UID */
  currentUid: Ref<number | undefined>;
  /** 养成计算模式 */
  calculationMode: Ref<CalculationMode>;
  /** 是否使用接口计算 */
  useApiCalculation: ComputedRef<boolean>;
  /** 汇总浮层开关（UID 切换时收起） */
  summaryVisible: Ref<boolean>;
  /** 全局加载中标记 */
  loading: Ref<boolean>;
  /** 计划加载中标记 */
  planLoading: Ref<boolean>;
  /** 当前选中的角色 ID */
  selectedCharacterId: Ref<number | null>;
  /** 当前选中的武器选项键 */
  selectedWeaponKey: Ref<string | null>;
  /** 是否使用背包武器来源 */
  useBagWeaponSource: Ref<boolean>;
  /** 可选 UID 列表 */
  uidList: Ref<Array<number>>;
  /** 存在背包存档的 UID 集合 */
  bagSourceUids: Ref<Set<number>>;
  /** 本地战绩角色列表 */
  roles: Ref<Array<TGApp.Sqlite.Character.TableTrans>>;
  /** 本地武器选项列表 */
  weapons: Ref<Array<TGApp.App.UserCalc.WeaponOption>>;
  /** 接口角色目录 */
  apiAvatars: Ref<Array<TGApp.Game.Calculate.AvatarListItem>>;
  /** 接口武器目录 */
  apiWeapons: Ref<Array<TGApp.Game.Calculate.WeaponListItem>>;
  /** 战绩缓存角色列表 */
  recordAvatars: Ref<Array<TGApp.Game.Record.Avatar>>;
  /** 接口同步角色列表 */
  syncAvatars: Ref<Array<TGApp.Game.Calculate.SyncAvatar>>;
  /** 背包材料计数 */
  bagMaterials: Ref<Map<number, number>>;
  /** 背包材料详情 */
  bagMaterialDetails: Ref<Map<number, TGApp.Sqlite.UserBag.MaterialTable>>;
  /** 养成计划列表 */
  projects: Ref<Array<TGApp.Sqlite.Cultivation.Project>>;
  /** 当前计划的养成目标 */
  planEntries: Ref<Array<TGApp.Sqlite.Cultivation.EntryWithItems>>;
  /** 当前选中的计划 ID */
  currentProjectId: Ref<string | null>;
  /** 接口模式角色选项 */
  apiCharacterOptions: ComputedRef<Array<TGApp.App.UserCalc.CharacterOption>>;
  /** 本地模式角色选项 */
  localCharacterOptions: ComputedRef<Array<TGApp.App.UserCalc.CharacterOption>>;
  /** 数据重载后恢复角色选择 */
  restoreCharacterSelection: (
    previousCharacterId: number | null,
    options: ReadonlyArray<TGApp.App.UserCalc.CharacterOption>,
  ) => number | null;
  /** 选择当前角色最合适的武器 */
  selectPreferredWeapon: (force?: boolean) => void;
  /** 载入指定 UID 的养成计划（惰性接线） */
  loadProjects: (uid: number, preferredProjectId?: string) => Promise<void>;
  /** 同步背包武器到计划目标（惰性接线） */
  syncBagWeaponPlanEntries: (uid: number, requestVersion?: number) => Promise<void>;
};

/**
 * 创建养成计算的数据加载与 UID/计算模式编排。
 * @since Beta v0.13.0
 * @param deps - 共享状态依赖与跨域回调
 * @returns 数据加载入口与跨域复用的请求/存储函数
 */
export function useCultivationData(deps: CultivationDataDeps) {
  const { account, cookie } = storeToRefs(useUserStore());
  const {
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
    loadProjects,
    syncBagWeaponPlanEntries,
  } = deps;

  const dataLoadVersion = ref<number>(0);
  let settingUid = false;
  let settingCalculationMode = false;

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

  /**
   * 确保当前 UID 在无背包存档时回退到接口计算。
   * @since Beta v0.13.0
   * @param uid - 数据 UID
   */
  function ensureCalculationMode(uid: number): void {
    if (!isWindows || bagSourceUids.value.has(uid) || calculationMode.value === "api") return;
    settingCalculationMode = true;
    calculationMode.value = "api";
    settingCalculationMode = false;
  }

  /**
   * 汇总各数据源的 UID 并载入首个可用 UID 的数据。
   * @since Beta v0.13.0
   * @param preferredUid - 优先选中的 UID
   */
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

  /**
   * 载入指定 UID 的全部养成数据与计划。
   * @since Beta v0.13.0
   * @param uid - 数据 UID
   */
  async function loadUidData(uid: number): Promise<void> {
    const requestVersion = ++dataLoadVersion.value;
    loading.value = true;
    try {
      if (useApiCalculation.value) {
        await loadApiData(uid, requestVersion);
        await loadInventoryData(uid, requestVersion);
      } else {
        await loadLocalData(uid, requestVersion);
      }
      if (requestVersion === dataLoadVersion.value) {
        await loadProjects(uid);
        await syncBagWeaponPlanEntries(uid, requestVersion);
      }
    } finally {
      if (requestVersion === dataLoadVersion.value) loading.value = false;
    }
  }

  /**
   * 通过接口载入角色、武器与战绩数据。
   * @since Beta v0.13.0
   * @param uid - 数据 UID
   * @param requestVersion - 数据载入代次
   */
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
      if (requestVersion !== dataLoadVersion.value || !useApiCalculation.value) return;
      recordAvatars.value = record ? record.avatars : [];
      syncAvatars.value = avatars;
      apiAvatars.value = avatarCatalog;
      apiWeapons.value = weaponCatalog;
      selectedWeaponKey.value = null;
      selectedCharacterId.value = restoreCharacterSelection(
        previousCharacterId,
        apiCharacterOptions.value,
      );
      selectPreferredWeapon();
    } catch (error) {
      if (requestVersion !== dataLoadVersion.value) return;
      recordAvatars.value = [];
      apiAvatars.value = [];
      apiWeapons.value = [];
      syncAvatars.value = [];
      selectedCharacterId.value = null;
      selectedWeaponKey.value = null;
      showSnackbar.error(`加载接口养成数据失败：${TGHttps.getErrMsg(error)}`);
    }
  }

  /**
   * 清空接口数据并在选择上复位。
   * @since Beta v0.13.0
   * @param requestVersion - 数据载入代次
   */
  function clearApiData(requestVersion: number): void {
    if (requestVersion !== dataLoadVersion.value) return;
    recordAvatars.value = [];
    apiAvatars.value = [];
    apiWeapons.value = [];
    syncAvatars.value = [];
    selectedCharacterId.value = null;
    selectedWeaponKey.value = null;
  }

  /**
   * 解析 UID 对应的可用账号与刷新用 Cookie。
   * @since Beta v0.13.0
   * @param uid - 数据 UID
   * @param logPrefix - 日志前缀
   * @returns 可用的账号与 Cookie；未找到时为 null
   */
  async function resolveApiAccount(
    uid: number,
    logPrefix: string,
  ): Promise<TGApp.App.Account.RfAc | null> {
    const refreshAccount = await getRfAc(String(uid), account.value, cookie.value, logPrefix);
    if (!refreshAccount) return null;
    if (Number(refreshAccount.account.gameUid) !== uid) {
      showSnackbar.warn(`未找到 UID ${maskUid(uid)} 对应的账号与 CK，已取消接口计算`);
      return null;
    }
    return refreshAccount;
  }

  /**
   * 拉取接口同步角色列表。
   * @since Beta v0.13.0
   * @param refreshAccount - 可用的账号与 Cookie
   * @returns 排除特殊角色后的同步角色列表
   */
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

  /**
   * 拉取接口全量角色目录。
   * @since Beta v0.13.0
   * @param refreshAccount - 可用的账号与 Cookie
   * @returns 排除特殊角色后的角色目录
   */
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

  /**
   * 拉取接口全量武器目录。
   * @since Beta v0.13.0
   * @param refreshAccount - 可用的账号与 Cookie
   * @returns 武器目录
   */
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

  /**
   * 载入本地战绩角色与背包数据并构建选项。
   * @since Beta v0.13.0
   * @param uid - 数据 UID
   * @param requestVersion - 数据载入代次
   */
  async function loadLocalData(uid: number, requestVersion: number): Promise<void> {
    const previousCharacterId = selectedCharacterId.value;
    const [roleData, materialData, weaponData, equipMap] = await Promise.all([
      TSUserAvatar.getAvatars(uid),
      TSUserBagMaterial.getMaterial(uid),
      TSUserBagWeapon.getWeapon(uid),
      TSUserBagAvatar.getEquipMap(uid),
    ]);
    if (requestVersion !== dataLoadVersion.value || useApiCalculation.value) return;
    roles.value = roleData
      .filter((role) => !EXCLUDED_CHARACTER_IDS.has(role.cid))
      .sort(
        (a, b) =>
          a.avatar.level - b.avatar.level || b.avatar.rarity - a.avatar.rarity || a.cid - b.cid,
      );
    bagMaterials.value = new Map(materialData.map((material) => [material.id, material.count]));
    bagMaterialDetails.value = new Map(materialData.map((material) => [material.id, material]));
    weapons.value = buildWeaponOptions(weaponData, roles.value, equipMap);
    useBagWeaponSource.value = weapons.value.some((weapon) => weapon.fromBag);
    selectedWeaponKey.value = null;
    selectedCharacterId.value = restoreCharacterSelection(
      previousCharacterId,
      localCharacterOptions.value,
    );
    selectPreferredWeapon();
  }

  /**
   * 载入背包材料计数。
   * @since Beta v0.13.0
   * @param uid - 数据 UID
   * @param requestVersion - 数据载入代次
   */
  async function loadInventoryData(uid: number, requestVersion: number): Promise<void> {
    const materialData = await TSUserBagMaterial.getMaterial(uid);
    if (requestVersion !== dataLoadVersion.value) return;
    bagMaterials.value = new Map(materialData.map((material) => [material.id, material.count]));
    bagMaterialDetails.value = new Map(materialData.map((material) => [material.id, material]));
  }

  /**
   * 保存接口计算结果中的背包材料。
   * @since Beta v0.13.0
   * @param uid - 数据 UID
   * @param result - 接口计算结果
   * @returns 变更的材料条数
   */
  async function saveCalculateInventory(
    uid: number,
    result: TGApp.Game.Calculate.Result,
  ): Promise<number> {
    return await TSUserBagMaterial.saveCalculateData(uid, result);
  }

  /**
   * 通过 Yae 读取游戏截图导入背包数据。
   * @since Beta v0.13.0
   */
  async function importInventory(): Promise<void> {
    const uid = currentUid.value;
    if (uid === undefined) return;
    planLoading.value = true;
    try {
      await tryCallYae(String(uid));
      if (useApiCalculation.value) await loadInventoryData(uid, dataLoadVersion.value);
      else await loadLocalData(uid, dataLoadVersion.value);
      await syncBagWeaponPlanEntries(uid);
    } finally {
      planLoading.value = false;
    }
  }

  /**
   * 编辑已保存目标时切换计算模式并重载数据。
   * @since Beta v0.13.0
   * @param mode - 目标计算模式
   */
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

  return {
    reload,
    importInventory,
    switchEditingCalculationMode,
    resolveApiAccount,
    requestSyncAvatars,
    saveCalculateInventory,
    loadInventoryData,
    dataLoadVersion,
  };
}
