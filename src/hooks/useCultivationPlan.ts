/**
 * 养成计算页的计划管理与目标刷新。
 * @since Beta v0.13.0
 */

import showDialog from "@comp/func/dialog.js";
import showLoading from "@comp/func/loading.js";
import showSnackbar from "@comp/func/snackbar.js";
import type { ApiRefreshTarget } from "@hooks/useCultivationApiCalc.js";
import { createEntryState } from "@hooks/useCultivationCalculator.js";
import { buildWeaponOptions } from "@hooks/useCultivationOptions.js";
import recordReq from "@req/recordReq.js";
import TSCultivationPlan from "@Sqlm/cultivationPlan.js";
import TSUserAvatar from "@Sqlm/userAvatar.js";
import TSUserBagMaterial from "@Sqlm/userBagMaterial.js";
import TSUserBagWeapon from "@Sqlm/userBagWeapon.js";
import useCultivationConversionStore from "@store/cultivationConversion.js";
import { maskUid } from "@utils/display/TGUid.js";
import { getCultivationEntryKey } from "@utils/game/cultivationPlan.js";
import userCalc from "@utils/game/userCalc.js";
import TGHttps from "@utils/network/TGHttps.js";
import { computed, watch } from "vue";
import type { ComputedRef, Ref } from "vue";

import { getWikiCharacterById } from "@/data/index.js";

type CalculationMode = TGApp.Sqlite.Cultivation.CalculationMode;
type CultivationViewTab = "calculator" | "targets";

type LocalAvatarRefreshResult = {
  roles: Array<TGApp.Sqlite.Character.TableTrans>;
  refreshedIds: ReadonlySet<number>;
};

/** 计划域依赖的共享状态与跨域输出。 */
type CultivationPlanDeps = {
  /** 当前选中的数据 UID */
  currentUid: Ref<number | undefined>;
  /** 当前选中的计划 ID */
  currentProjectId: Ref<string | null>;
  /** 当前视图页签 */
  viewTab: Ref<CultivationViewTab>;
  /** 养成计算模式 */
  calculationMode: Ref<CalculationMode>;
  /** 是否使用接口计算 */
  useApiCalculation: ComputedRef<boolean>;
  /** 当前 UID 的服务器时区 */
  currentTimezone: ComputedRef<number>;
  /** 正在编辑的计划条目 */
  editingEntry: Ref<TGApp.Sqlite.Cultivation.EntryWithItems | undefined>;
  /** 计划加载中标记 */
  planLoading: Ref<boolean>;
  /** 计划上下文就绪标记 */
  planContextReady: Ref<boolean>;
  /** 养成计划列表 */
  projects: Ref<Array<TGApp.Sqlite.Cultivation.Project>>;
  /** 当前计划的养成目标 */
  planEntries: Ref<Array<TGApp.Sqlite.Cultivation.EntryWithItems>>;
  /** 本地战绩角色列表 */
  roles: Ref<Array<TGApp.Sqlite.Character.TableTrans>>;
  /** 背包材料计数 */
  bagMaterials: Ref<Map<number, number>>;
  /** 背包材料详情 */
  bagMaterialDetails: Ref<Map<number, TGApp.Sqlite.UserBag.MaterialTable>>;
  /** 最近一次接口计算原始结果 */
  apiCalculationResult: Ref<TGApp.Game.Calculate.Result | undefined>;
  /** 是否允许合成消耗 */
  allowCrafting: Ref<boolean>;
  /** 是否使用尘辉兑换 */
  useDust: Ref<boolean>;
  /** 是否使用嬗变之尘 */
  useSolvent: Ref<boolean>;
  /** 查找条目在计划中的成对条目 */
  getPairedPlanEntry: (
    entry: TGApp.Sqlite.Cultivation.EntryWithItems,
  ) => TGApp.Sqlite.Cultivation.EntryWithItems | undefined;
  /** 构建角色目标的保存输入 */
  createAvatarPlanInput: () => TGApp.Sqlite.Cultivation.SaveEntryInput | undefined;
  /** 构建武器目标的保存输入 */
  createWeaponPlanInput: () => TGApp.Sqlite.Cultivation.SaveEntryInput | undefined;
  /** 是否可保存到计划 */
  canSaveToPlan: ComputedRef<boolean>;
  /** 解析 UID 对应的可用账号与刷新用 Cookie */
  resolveApiAccount: (uid: number, logPrefix: string) => Promise<TGApp.App.Account.RfAc | null>;
  /** 拉取接口同步角色列表 */
  requestSyncAvatars: (
    refreshAccount: TGApp.App.Account.RfAc,
  ) => Promise<Array<TGApp.Game.Calculate.SyncAvatar>>;
  /** 保存接口计算结果中的背包材料 */
  saveCalculateInventory: (uid: number, result: TGApp.Game.Calculate.Result) => Promise<number>;
  /** 载入背包材料计数 */
  loadInventoryData: (uid: number, requestVersion: number) => Promise<void>;
  /** 数据载入代次 */
  dataLoadVersion: Ref<number>;
  /** 计算单个接口刷新目标的材料结果 */
  calculateApiRefreshTarget: (
    refreshAccount: TGApp.App.Account.RfAc,
    target: ApiRefreshTarget,
  ) => Promise<TGApp.Game.Calculate.Result>;
  /** 由计划条目与同步角色构建接口刷新目标 */
  createApiRefreshTargets: (
    entries: ReadonlyArray<TGApp.Sqlite.Cultivation.EntryWithItems>,
    avatars: ReadonlyArray<TGApp.Game.Calculate.SyncAvatar>,
  ) => Array<ApiRefreshTarget>;
  /** 由接口计算结果构建刷新输入 */
  createApiRefreshInputsFromResult: (
    target: ApiRefreshTarget,
    result: TGApp.Game.Calculate.ItemResult,
  ) => Array<TGApp.Sqlite.Cultivation.RefreshEntryInput>;
};

/**
 * 创建养成计算的计划管理与目标刷新。
 * @since Beta v0.13.0
 * @param deps - 共享状态依赖与跨域输出
 * @returns 计划 computed 与计划管理、目标刷新入口
 */
export function useCultivationPlan(deps: CultivationPlanDeps) {
  const conversionStore = useCultivationConversionStore();
  const {
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
  } = deps;

  let settingProject = false;

  const currentProject = computed<TGApp.Sqlite.Cultivation.Project | undefined>(() =>
    projects.value.find((project) => project.id === currentProjectId.value),
  );
  const projectOptions = computed<Array<{ title: string; value: string }>>(() =>
    projects.value.map((project) => ({ title: project.name, value: project.id })),
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

  /**
   * 载入指定 UID 的养成计划与目标。
   * @since Beta v0.13.0
   * @param uid - 数据 UID
   * @param preferredProjectId - 优先选中的计划 ID
   */
  async function loadProjects(uid: number, preferredProjectId?: string): Promise<void> {
    planLoading.value = true;
    planContextReady.value = false;
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
      planContextReady.value = true;
    } catch (error) {
      showSnackbar.error(`加载养成计划失败：${TGHttps.getErrMsg(error)}`);
    } finally {
      planLoading.value = false;
    }
  }

  /**
   * 新建养成计划。
   * @since Beta v0.13.0
   */
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

  /**
   * 重命名当前养成计划。
   * @since Beta v0.13.0
   */
  async function renamePlan(): Promise<void> {
    const project = currentProject.value;
    if (!project) return;
    const name = await showDialog.input("重命名养成计划", "请输入新的计划名称", project.name);
    if (typeof name !== "string" || name.trim().length === 0 || name.trim() === project.name)
      return;
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

  /**
   * 删除当前养成计划。
   * @since Beta v0.13.0
   */
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
      conversionStore.clearProject(project.uid, project.id);
      await loadProjects(project.uid);
      showSnackbar.success("养成计划已删除");
    } catch (error) {
      showSnackbar.error(`删除养成计划失败：${TGHttps.getErrMsg(error)}`);
    } finally {
      planLoading.value = false;
    }
  }

  /**
   * 由已保存条目构建保持现状的同步输入。
   * @since Beta v0.13.0
   * @param entry - 计划目标条目
   * @returns 同步输入；无有效需求时为 undefined
   */
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

  /**
   * 汇总保存输入：编辑时补齐成对目标的同步输入。
   * @since Beta v0.13.0
   * @param avatarInput - 角色目标保存输入
   * @param weaponInput - 武器目标保存输入
   * @returns 待保存的输入列表
   */
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
      if (weaponInput) {
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
    if (avatarInput) {
      inputs.push(avatarInput);
      return inputs;
    }
    if (paired?.type !== "avatar") return inputs;
    const synced = createPairedEntrySyncInput(paired);
    if (synced) inputs.push(synced);
    return inputs;
  }

  /**
   * 收集编辑后不再被保存输入覆盖的成对条目 ID。
   * @since Beta v0.13.0
   * @param inputs - 待保存的输入列表
   * @returns 待同步计算配置的条目 ID
   */
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

  /**
   * 将当前编辑的养成目标保存到计划。
   * @since Beta v0.13.0
   */
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
      conversionStore.moveEntries(
        uid,
        currentProjectId.value ?? "",
        project.id,
        inputs.map(getCultivationEntryKey),
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

  /**
   * 为指定条目记录转换意图。
   * @since Beta v0.13.0
   * @param entryKey - 条目键
   * @param intent - 转换意图
   */
  function applyConversion(entryKey: string, intent: TGApp.App.UserCalc.ConversionIntent): void {
    const uid = currentUid.value;
    if (uid === undefined || !planContextReady.value) return;
    conversionStore.setIntent(uid, currentProjectId.value ?? "", entryKey, intent);
  }

  /**
   * 清除一组转换选项对应的转换意图。
   * @since Beta v0.13.0
   * @param options - 转换选项列表
   */
  function resetConversions(options: ReadonlyArray<TGApp.App.UserCalc.ConversionOption>): void {
    const uid = currentUid.value;
    if (uid === undefined) return;
    for (const option of options) {
      conversionStore.removeIntent(
        uid,
        currentProjectId.value ?? "",
        option.entryKey,
        option.recommendation.material.id,
      );
    }
  }

  /**
   * 更新计划目标状态。
   * @since Beta v0.13.0
   * @param entry - 计划目标条目
   * @param status - 目标状态
   */
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

  /**
   * 删除计划目标。
   * @since Beta v0.13.0
   * @param entry - 计划目标条目
   */
  async function removePlanEntry(entry: TGApp.Sqlite.Cultivation.EntryWithItems): Promise<void> {
    const confirmed = await showDialog.check(`确认删除？`, `将删除${entry.name}养成计划`);
    if (!confirmed) return;
    planLoading.value = true;
    try {
      await TSCultivationPlan.removeEntry(entry.id);
      conversionStore.clearEntry(
        currentUid.value ?? 0,
        entry.projectId,
        getCultivationEntryKey(entry),
      );
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

  /**
   * 更新计划目标优先级。
   * @since Beta v0.13.0
   * @param entryIds - 按新顺序排列的条目 ID
   */
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

  /**
   * 将较新的背包武器数据同步到计划目标。
   * @since Beta v0.13.0
   * @param uid - 数据 UID
   * @param requestVersion - 触发同步的数据载入代次
   */
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
    if (requestVersion !== undefined && requestVersion !== dataLoadVersion.value) return;
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
    if (requestVersion !== undefined && requestVersion !== dataLoadVersion.value) return;
    if (currentProject.value?.id !== project.id) return;
    planEntries.value = await TSCultivationPlan.getEntries(project.id);
  }

  /**
   * 刷新当前计划全部目标的数据。
   * @since Beta v0.13.0
   */
  async function refreshPlanEntries(): Promise<void> {
    const project = currentProject.value;
    if (!project) return;
    planLoading.value = true;
    let refreshedCount = 0;
    let changedMaterials = 0;
    try {
      await showLoading.start(`正在刷新养成计划“${project.name}”`, `UID：${maskUid(project.uid)}`);
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
        await loadInventoryData(project.uid, dataLoadVersion.value);
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

  return {
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
  };
}

/**
 * 判断武器保存输入与计划条目是否指向同一件武器。
 * @since Beta v0.13.0
 * @param input - 武器保存输入
 * @param entry - 计划目标条目
 * @returns 是否为同一件武器
 */
export function isSameWeaponEntry(
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

/**
 * 判断保存输入是否覆盖指定计划条目。
 * @since Beta v0.13.0
 * @param input - 保存输入
 * @param entry - 计划目标条目
 * @returns 是否覆盖该条目
 */
export function inputMatchesEntry(
  input: TGApp.Sqlite.Cultivation.SaveEntryInput,
  entry: TGApp.Sqlite.Cultivation.EntryWithItems,
): boolean {
  if (input.type !== entry.type || input.itemId !== entry.itemId) return false;
  if (entry.type === "avatar") return true;
  return isSameWeaponEntry(input, entry);
}

/**
 * 在背包武器中查找计划目标对应的武器。
 * @since Beta v0.13.0
 * @param entry - 计划目标条目
 * @param bagWeapons - 背包武器列表
 * @returns 匹配的背包武器
 */
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

/**
 * 判断背包武器数据是否比计划条目更新。
 * @since Beta v0.13.0
 * @param bagWeapon - 背包武器
 * @param entry - 计划目标条目
 * @returns 背包数据是否更新
 */
function isBagWeaponNewerThanEntry(
  bagWeapon: TGApp.Sqlite.UserBag.WeaponTable,
  entry: TGApp.Sqlite.Cultivation.EntryWithItems,
): boolean {
  const bagTime = Date.parse(bagWeapon.updated);
  const entryTime = Date.parse(entry.updated);
  if (Number.isNaN(bagTime) || Number.isNaN(entryTime)) return true;
  return bagTime > entryTime;
}

/**
 * 由本地战绩角色构建计划目标的刷新输入。
 * @since Beta v0.13.0
 * @param entry - 计划目标条目
 * @param role - 本地战绩角色
 * @returns 刷新输入；Wiki 缺失时为 undefined
 */
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

/**
 * 由武器选项构建计划目标的刷新输入。
 * @since Beta v0.13.0
 * @param entry - 计划目标条目
 * @param options - 武器选项列表
 * @returns 刷新输入；未匹配到武器时为 undefined
 */
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

/**
 * 通过战绩接口刷新本地角色数据。
 * @since Beta v0.13.0
 * @param uid - 数据 UID
 * @param avatarEntries - 计划中的角色目标
 * @param refreshAccount - 可用的账号与 Cookie；为 null 时仅读本地缓存
 * @returns 刷新后的角色数据与命中目标的角色 ID
 */
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
  let tpsResponse: TGApp.Game.Avatar.TpsResp | null = null;
  if (detailResponse.data.list.some((detail) => detail.unlock_tps)) {
    tpsResponse = await recordReq.character.tps(gameCookie, gameAccount);
    if (tpsResponse.retcode !== 0) {
      throw new Error(`[${tpsResponse.retcode}] ${tpsResponse.message}`);
    }
  }
  await showLoading.update("正在保存计划角色详情");
  await TSUserAvatar.saveAvatars(
    String(uid),
    detailResponse.data.list,
    tpsResponse === null ? null : tpsResponse.data,
  );
  const refreshedIds = new Set(
    detailResponse.data.list.map((avatar) => avatar.base.id).filter((id) => targetIds.has(id)),
  );
  return { roles: await TSUserAvatar.getAvatars(uid), refreshedIds };
}
