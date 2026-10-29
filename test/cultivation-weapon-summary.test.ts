/**
 * 不完整武器材料对养成汇总和保存可用性的回归测试。
 * @since Beta v0.13.0
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { computed, effectScope, ref, shallowRef } from "vue";
import type { EffectScope } from "vue";

import { useCultivationSummary } from "../src/hooks/useCultivationSummary.js";
import type { CultivationMaterial } from "../src/utils/game/userCalc.js";

import { wwWeapon } from "@/data/index.js";

vi.mock("@hooks/useCultivationPlan.js", () => ({ inputMatchesEntry: () => false }));
vi.mock("@tauri-apps/plugin-os", () => ({ platform: () => "windows" }));

/**
 * 汇总 composable 的真实依赖契约。
 * @since Beta v0.13.0
 */
type SummaryDeps = Parameters<typeof useCultivationSummary>[0];

const scopes: Array<EffectScope> = [];
const avatarInput: TGApp.Sqlite.Cultivation.SaveEntryInput = {
  allowCrafting: false,
  useDust: false,
  useSolvent: false,
  calculationMode: "bag",
  type: "avatar",
  itemId: 10000016,
  instanceKey: "",
  name: "角色养成",
  icon: "/WIKI/character/10000016.webp",
  star: 5,
  currentState: { level: 1, promoteLevel: 0, ascended: false, talents: [] },
  targetState: { level: 20, promoteLevel: 0, ascended: false, talents: [] },
  items: [{ materialId: 202, required: 5 }],
};
const apiMaterial: TGApp.App.UserCalc.ResultMaterial = {
  id: 202,
  name: "摩拉",
  type: "money",
  star: 3,
  required: 5,
  owned: 0,
  craftable: 0,
  craftingCosts: [],
  missing: 5,
  progress: 0,
};

/**
 * 从实际 Wiki 创建武器选择项。
 * @since Beta v0.13.0
 * @param id - 武器 ID
 * @returns 武器选择项
 */
function makeWeaponOption(id: number): TGApp.App.UserCalc.WeaponOption {
  const wiki = wwWeapon.find((weapon) => weapon.id === id);
  if (wiki === undefined) throw new Error(`缺少武器 Wiki：${id}`);
  return {
    key: `wiki-${id}`,
    title: wiki.name,
    icon: `/WIKI/weapon/${id}.webp`,
    wiki,
    level: 1,
    promoteLevel: 0,
    affixLevel: 1,
    fromBag: false,
    locked: false,
    source: "catalog",
  };
}

/**
 * 创建同时包含角色需求和不完整武器选择的汇总测试环境。
 * @since Beta v0.13.0
 * @returns 汇总结果与可切换的选择、计算模式
 */
function createSummaryHarness() {
  const selectedWeapon = shallowRef<TGApp.App.UserCalc.WeaponOption | undefined>(
    makeWeaponOption(11521),
  );
  const apiMode = ref<boolean>(false);
  const deps: SummaryDeps = {
    hasBagDataSource: computed<boolean>(() => true),
    useApiCalculation: computed<boolean>(() => apiMode.value),
    conversionIntents: computed<Map<string, Array<TGApp.App.UserCalc.ConversionIntent>>>(
      () => new Map(),
    ),
    currentProjectId: ref<string | null>(null),
    loading: ref<boolean>(false),
    apiLoading: ref<boolean>(false),
    planLoading: ref<boolean>(false),
    planContextReady: ref<boolean>(false),
    apiCalculated: ref<boolean>(true),
    editingEntry: shallowRef<TGApp.Sqlite.Cultivation.EntryWithItems | undefined>(undefined),
    planEntries: ref<Array<TGApp.Sqlite.Cultivation.EntryWithItems>>([]),
    bagMaterials: ref<Map<number, number>>(new Map()),
    bagMaterialDetails: ref<Map<number, TGApp.Sqlite.UserBag.MaterialTable>>(new Map()),
    apiResultMaterials: ref<Array<TGApp.App.UserCalc.ResultMaterial>>([apiMaterial]),
    apiAvatarRequirements: ref<Array<CultivationMaterial>>([{ id: 202, count: 5 }]),
    apiWeaponRequirements: ref<Array<CultivationMaterial>>([]),
    apiCalculationResult: shallowRef<TGApp.Game.Calculate.Result | undefined>(undefined),
    avatarRequiredMaterials: computed<Array<CultivationMaterial>>(() => [{ id: 202, count: 5 }]),
    weaponRequiredMaterials: computed<Array<CultivationMaterial>>(() => []),
    createAvatarPlanInput: () => avatarInput,
    createWeaponPlanInput: () => undefined,
    selectedApiAvatar: computed<TGApp.Game.Calculate.AvatarListItem | undefined>(() => undefined),
    selectedWeapon: computed<TGApp.App.UserCalc.WeaponOption | undefined>(
      () => selectedWeapon.value,
    ),
  };
  const scope = effectScope();
  scopes.push(scope);
  const summary = scope.run(() => useCultivationSummary(deps));
  if (summary === undefined) throw new Error("养成汇总未初始化");
  return { summary, selectedWeapon, apiMode };
}

afterEach(() => {
  for (const scope of scopes.splice(0)) scope.stop();
});

describe("不完整武器的养成汇总", () => {
  it("同时存在角色需求时仍禁止保存，并提示无法本地计算", () => {
    const { summary, apiMode } = createSummaryHarness();

    expect(summary.canSaveToPlan.value).toBe(false);
    expect(summary.displayResultMaterials.value).toEqual([]);
    expect(summary.conversionOptions.value).toEqual([]);
    expect(summary.resultEmptyText.value).toBe("本地材料数据不完整，可手动尝试接口计算");
    expect(apiMode.value).toBe(false);
  });

  it("用户手动选择接口模式后继续使用接口结果与保存规则", () => {
    const { summary, apiMode } = createSummaryHarness();
    apiMode.value = true;

    expect(summary.canSaveToPlan.value).toBe(true);
    expect(summary.displayResultMaterials.value).toEqual([apiMaterial]);
    expect(summary.resultEmptyText.value).not.toContain("数据不完整");
  });

  it("切换完整武器或清空武器选择后恢复角色材料汇总与保存", () => {
    const { summary, selectedWeapon } = createSummaryHarness();
    selectedWeapon.value = makeWeaponOption(11101);

    expect(summary.canSaveToPlan.value).toBe(true);
    expect(summary.displayResultMaterials.value).toEqual([
      expect.objectContaining({ id: 202, required: 5 }),
    ]);

    selectedWeapon.value = makeWeaponOption(11521);
    expect(summary.canSaveToPlan.value).toBe(false);

    selectedWeapon.value = undefined;
    expect(summary.canSaveToPlan.value).toBe(true);
    expect(summary.displayResultMaterials.value).toEqual([
      expect.objectContaining({ id: 202, required: 5 }),
    ]);
  });
});
