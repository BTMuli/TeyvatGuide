/**
 * 养成计算页的材料汇总与结果推导。
 * @since Beta v0.13.0
 */

import { inputMatchesEntry } from "@hooks/useCultivationPlan.js";
import { platform } from "@tauri-apps/plugin-os";
import fmtUtil from "@utils/display/fmtUtil.js";
import {
  allocatePlanMaterials,
  getConversionOptions,
  getConversionResultMaterials,
  getCultivationEntryKey,
  getCalculateInventory,
  mergeCultivationResults,
  mergePlanInventory,
} from "@utils/game/cultivationPlan.js";
import type { CultivationMaterial } from "@utils/game/userCalc.js";
import { computed } from "vue";
import type { ComputedRef, Ref } from "vue";

import { WikiMaterialData } from "@/data/index.js";

const EMPTY_BAG_MATERIAL_DETAILS: ReadonlyMap<number, TGApp.Sqlite.UserBag.MaterialTable> =
  new Map();

/** 汇总域依赖的共享状态与跨域输出。 */
type CultivationSummaryDeps = {
  /** 当前 UID 是否存在背包存档 */
  hasBagDataSource: ComputedRef<boolean>;
  /** 是否使用接口计算 */
  useApiCalculation: ComputedRef<boolean>;
  /** 当前生效的转换意图 */
  conversionIntents: ComputedRef<Map<string, Array<TGApp.App.UserCalc.ConversionIntent>>>;
  /** 当前选中的计划 ID */
  currentProjectId: Ref<string | null>;
  /** 全局加载中标记 */
  loading: Ref<boolean>;
  /** 接口计算加载中标记 */
  apiLoading: Ref<boolean>;
  /** 计划加载中标记 */
  planLoading: Ref<boolean>;
  /** 计划上下文就绪标记 */
  planContextReady: Ref<boolean>;
  /** 接口计算已完成标记 */
  apiCalculated: Ref<boolean>;
  /** 正在编辑的计划条目 */
  editingEntry: Ref<TGApp.Sqlite.Cultivation.EntryWithItems | undefined>;
  /** 当前计划的养成目标 */
  planEntries: Ref<Array<TGApp.Sqlite.Cultivation.EntryWithItems>>;
  /** 背包材料计数 */
  bagMaterials: Ref<Map<number, number>>;
  /** 背包材料详情 */
  bagMaterialDetails: Ref<Map<number, TGApp.Sqlite.UserBag.MaterialTable>>;
  /** 接口计算的材料展示列表 */
  apiResultMaterials: Ref<Array<TGApp.App.UserCalc.ResultMaterial>>;
  /** 接口计算的角色材料需求 */
  apiAvatarRequirements: Ref<Array<CultivationMaterial>>;
  /** 接口计算的武器材料需求 */
  apiWeaponRequirements: Ref<Array<CultivationMaterial>>;
  /** 最近一次接口计算原始结果 */
  apiCalculationResult: Ref<TGApp.Game.Calculate.Result | undefined>;
  /** 本地计算的角色材料需求 */
  avatarRequiredMaterials: ComputedRef<Array<CultivationMaterial>>;
  /** 本地计算的武器材料需求 */
  weaponRequiredMaterials: ComputedRef<Array<CultivationMaterial>>;
  /** 构建角色目标的保存输入 */
  createAvatarPlanInput: () => TGApp.Sqlite.Cultivation.SaveEntryInput | undefined;
  /** 构建武器目标的保存输入 */
  createWeaponPlanInput: () => TGApp.Sqlite.Cultivation.SaveEntryInput | undefined;
  /** 当前选中的接口目录角色 */
  selectedApiAvatar: ComputedRef<TGApp.Game.Calculate.AvatarListItem | undefined>;
  /** 当前选中的武器选项 */
  selectedWeapon: ComputedRef<TGApp.App.UserCalc.WeaponOption | undefined>;
};

/**
 * 创建养成计算的材料汇总与结果推导。
 * @since Beta v0.13.0
 * @param deps - 共享状态依赖与跨域输出
 * @returns 汇总 computed 与保存/计算可用性
 */
export function useCultivationSummary(deps: CultivationSummaryDeps) {
  const {
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
  } = deps;

  const canApiCalculate = computed<boolean>(
    () =>
      !apiLoading.value &&
      (selectedApiAvatar.value !== undefined || selectedWeapon.value !== undefined),
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
  const calculatorInventory = computed<Map<number, number>>(() => {
    const inventory = new Map(planInventory.value);
    if (useApiCalculation.value && apiCalculationResult.value) {
      for (const [id, count] of getCalculateInventory(apiCalculationResult.value)) {
        inventory.set(id, platform() === "macos" ? count : Math.max(inventory.get(id) ?? 0, count));
      }
    }
    return inventory;
  });
  // 以当前编辑需求替换已保存目标，一起预留全计划的直接材料和合成消耗。
  const calculatorEntries = computed<Array<TGApp.Sqlite.Cultivation.EntryWithItems>>(() =>
    [createAvatarPlanInput(), createWeaponPlanInput()]
      .filter((input) => input !== undefined)
      .map((input, index) => {
        const saved = planEntries.value.find((entry) => inputMatchesEntry(input, entry));
        const id = saved?.id ?? "preview-" + input.type + "-" + index;
        return {
          ...input,
          id,
          projectId: currentProjectId.value ?? "",
          status: "active",
          sortOrder: saved?.sortOrder ?? Number.MAX_SAFE_INTEGER,
          created: saved?.created ?? "",
          updated: saved?.updated ?? "",
          allowCrafting: planContextReady.value && (useApiCalculation.value || input.allowCrafting),
          useDust: !useApiCalculation.value && input.useDust,
          useSolvent: !useApiCalculation.value && input.useSolvent,
          items: input.items.map((item) => ({ ...item, entryId: id })),
        };
      }),
  );
  const calculatorOtherEntries = computed<Array<TGApp.Sqlite.Cultivation.EntryWithItems>>(() => {
    const previewIds = new Set(calculatorEntries.value.map((entry) => entry.id));
    return planEntries.value.filter(
      (entry) => entry.id !== editingEntry.value?.id && !previewIds.has(entry.id),
    );
  });
  const calculatorAllocation = computed<TGApp.App.UserCalc.PlanMaterialAllocation>(() => {
    return allocatePlanMaterials(
      [...calculatorOtherEntries.value, ...calculatorEntries.value],
      calculatorInventory.value,
      WikiMaterialData,
      conversionIntents.value,
    );
  });
  const localResultMaterials = computed<Array<TGApp.App.UserCalc.ResultMaterial>>(() =>
    mergeCultivationResults(
      calculatorEntries.value.flatMap(
        (entry) => calculatorAllocation.value.entries.get(entry.id) ?? [],
      ),
    ),
  );
  const conversionOptions = computed<Array<TGApp.App.UserCalc.ConversionOption>>(() => {
    if (!planContextReady.value || planLoading.value || loading.value || apiLoading.value)
      return [];
    if (useApiCalculation.value && !apiCalculated.value) return [];
    return getConversionOptions(
      [...calculatorOtherEntries.value, ...calculatorEntries.value],
      calculatorAllocation.value,
      WikiMaterialData,
      new Set(calculatorEntries.value.map((entry) => entry.id)),
    );
  });
  const planInventory = computed<Map<number, number>>(() =>
    mergePlanInventory(bagMaterials.value, bagMaterialDetails.value, planEntries.value),
  );
  const planAllocation = computed<TGApp.App.UserCalc.PlanMaterialAllocation>(() =>
    allocatePlanMaterials(
      planEntries.value,
      planInventory.value,
      WikiMaterialData,
      conversionIntents.value,
    ),
  );
  const planConversionOptions = computed<Array<TGApp.App.UserCalc.ConversionOption>>(() =>
    planContextReady.value
      ? getConversionOptions(planEntries.value, planAllocation.value, WikiMaterialData)
      : [],
  );
  const planConversionOptionsByEntryKey = computed<
    ReadonlyMap<string, Array<TGApp.App.UserCalc.ConversionOption>>
  >(() => {
    const optionsByEntryKey = new Map<string, Array<TGApp.App.UserCalc.ConversionOption>>();
    for (const option of planConversionOptions.value) {
      const options = optionsByEntryKey.get(option.entryKey);
      if (options === undefined) {
        optionsByEntryKey.set(option.entryKey, [option]);
      } else {
        options.push(option);
      }
    }
    return optionsByEntryKey;
  });
  const planEntryMaterials = computed<
    ReadonlyMap<string, Array<TGApp.App.UserCalc.ResultMaterial>>
  >(
    () =>
      new Map(
        planEntries.value.map((entry) => [
          entry.id,
          getConversionResultMaterials(
            planAllocation.value.entries.get(entry.id) ?? [],
            planConversionOptionsByEntryKey.value.get(getCultivationEntryKey(entry)) ?? [],
          ),
        ]),
      ),
  );
  const planResultMaterials = computed<Array<TGApp.App.UserCalc.ResultMaterial>>(() =>
    mergeCultivationResults(
      planEntries.value
        .filter((entry) => entry.status === "active")
        .flatMap((entry) => planEntryMaterials.value.get(entry.id) ?? []),
    ),
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
      (planEntryMaterials.value.get(entry.id) ?? []).every((material) => material.missing <= 0);
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
  const rawDisplayResultMaterials = computed<Array<TGApp.App.UserCalc.ResultMaterial>>(() => {
    const hasExplicitConversion = calculatorEntries.value.some(
      (entry) => (calculatorAllocation.value.appliedConversions.get(entry.id)?.length ?? 0) > 0,
    );
    return useApiCalculation.value && !hasExplicitConversion
      ? apiResultMaterials.value
      : localResultMaterials.value;
  });
  const displayResultMaterials = computed<Array<TGApp.App.UserCalc.ResultMaterial>>(() =>
    getConversionResultMaterials(rawDisplayResultMaterials.value, conversionOptions.value),
  );
  const missingKinds = computed<number>(
    () => displayResultMaterials.value.filter((material) => material.missing > 0).length,
  );
  const resultBagMaterialDetails = computed<
    ReadonlyMap<number, TGApp.Sqlite.UserBag.MaterialTable>
  >(() => (useApiCalculation.value ? EMPTY_BAG_MATERIAL_DETAILS : bagMaterialDetails.value));
  const resultEmptyText = computed<string>(() => {
    if (!useApiCalculation.value) return "请选择角色或武器，并设置培养目标";
    if (apiCalculated.value) return "当前养成目标无需额外材料";
    return canApiCalculate.value
      ? "设置养成目标后，点击确认计算"
      : "请选择角色或武器，并确认该 UID 已保存可用的账号与 CK";
  });

  return {
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
  };
}

/**
 * 格式化数据更新时间。
 * @since Beta v0.13.0
 * @param value - 原始时间字符串
 * @returns 格式化后的时间
 */
function formatUpdated(value: string): string {
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? value : fmtUtil.dateTime(timestamp);
}
