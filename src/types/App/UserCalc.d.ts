/**
 * 用户养成计算相关类型定义文件
 * @since Beta v0.12.6
 */

declare namespace TGApp.App.UserCalc {
  /**
   * 角色选择项
   * @since Beta v0.11.2
   */
  type CharacterOption = {
    /**
     * 选择器中显示的角色标题
     * @since Beta v0.11.2
     */
    title: string;
    /** 角色 ID */
    value: number;
    /** 角色名称 */
    name: string;
    /** 角色图标 */
    icon: string;
    /** 角色元素名称 */
    element: string;
    /** 角色星级 */
    star: number;
    /** 当前等级 */
    level: number;
    /** 是否已拥有该角色 */
    owned: boolean;
    /** 已激活命座数 */
    constellation: number;
    /** 好感等级 */
    fetter: number;
    /** 角色使用的武器类型 */
    weaponType: string;
  };

  /**
   * 可培养技能选项
   * @since Beta v0.11.2
   */
  type SkillOption = {
    /** 技能 ID */
    id: number;
    /** 技能名称 */
    name: string;
    /** 技能图标 */
    icon: string;
    /** 当前等级 */
    level: number;
    /** 最高等级 */
    maxLevel: number;
  };

  /**
   * 武器选择项
   * @since Beta v0.12.0
   */
  type WeaponOption = {
    /** 用于区分背包武器和默认武器的唯一键 */
    key: string;
    /** 选择器中显示的武器标题 */
    title: string;
    /** 武器显示图标 */
    icon: string;
    /** 武器 Wiki 数据 */
    wiki: TGApp.App.Weapon.WikiItem;
    /** 当前等级 */
    level: number;
    /** 已完成的突破次数 */
    promoteLevel: number;
    /** 精炼等级 */
    affixLevel: number;
    /** 是否来自用户背包 */
    fromBag: boolean;
    /** 是否已锁定 */
    locked: boolean;
    /** 武器数据来源 */
    source: "bag" | "catalog" | "equipped";
    /** 接口武器目录信息 */
    api?: TGApp.Game.Calculate.WeaponListItem;
    /** 背包武器 GUID */
    guid?: string;
    /** 装备该武器的角色 ID（Yae 本地角色数据） */
    equippedBy?: number;
  };

  /**
   * 合成方案实际消耗的背包材料
   * @since Beta v0.11.2
   */
  type CraftingCost = {
    /** 材料 ID */
    id: number;
    /** 材料名称 */
    name: string;
    /** 材料类型 */
    type: string;
    /** 材料星级 */
    star: number;
    /** 合成消耗数量 */
    count: number;
    /** 背包持有数量 */
    owned: number;
  };

  /**
   * 材料需求计算结果
   * @since Beta v0.11.2
   */
  type ResultMaterial = {
    /** 材料 ID */
    id: number;
    /** 材料名称 */
    name: string;
    /** 材料类型 */
    type: string;
    /** 材料星级 */
    star: number;
    /** 所需数量 */
    required: number;
    /** 已持有数量 */
    owned: number;
    /** 可通过合成补足的数量 */
    craftable: number;
    /** 合成补足方案实际消耗的背包材料 */
    craftingCosts: Array<CraftingCost>;
    /** 缺少数量 */
    missing: number;
    /** 持有与可合成数量的合计进度，取值范围为 0 到 100 */
    progress: number;
  };

  /**
   * 材料转换只读推荐。
   * @since Beta v0.12.6
   */
  type ConversionRecommendation = {
    /** 待补足的目标材料及其当前完成情况 */
    material: ResultMaterial;
    /** 可通过该转换方案补足的数量 */
    count: number;
    /** 实际转换消耗的来源材料及本轮推荐前可用余量 */
    costs: Array<CraftingCost>;
  };

  /**
   * 材料转换手动意图。
   * @since Beta v0.12.6
   */
  type ConversionIntent = {
    /** 转换目标材料 ID */
    materialId: number;
    /** 请求转换数量，0 表示显式关闭该项转换 */
    count: number;
    /** 各来源材料本轮最多使用数量 */
    sourceLimits: Array<{ id: number; count: number }>;
  };

  /**
   * 已应用的材料转换结果。
   * @since Beta v0.12.6
   */
  type AppliedConversion = {
    /** 应用的手动转换意图 */
    intent: ConversionIntent;
    /** 根据当前库存计算出的转换推荐 */
    recommendation: ConversionRecommendation;
    /** 方案全部执行所需的材料，包含当前库存不足的部分 */
    plannedCosts: Array<CraftingCost>;
    /** 计算该转换时使用的库存快照 */
    inventory: ReadonlyMap<number, number>;
  };

  /**
   * 养成目标的材料转换选项。
   * @since Beta v0.12.6
   */
  type ConversionOption = {
    /** 养成目标稳定键 */
    entryKey: string;
    /** 养成目标名称 */
    entryName: string;
    /** 该目标的转换推荐 */
    recommendation: ConversionRecommendation;
    /** 计算该转换时使用的库存快照 */
    inventory: ReadonlyMap<number, number>;
    /** 该目标对应的手动转换意图 */
    intent?: ConversionIntent;
    /** 已采用方案的完整需求，含尚未备齐的来源及媒介 */
    plannedCosts?: Array<CraftingCost>;
    /** 所有已采用方案执行后仍可用于转换的公共余量 */
    remainingInventory?: ReadonlyMap<number, number>;
    /**
     * 已计入原始材料结果的自动转换数量
     */
    allocatedCount?: number;
    /**
     * 已计入原始材料结果的自动转换实际消耗
     */
    allocatedCosts?: Array<CraftingCost>;
  };

  /**
   * 天赋等级展示项
   * @since Beta v0.12.0
   */
  type TalentLevelView = {
    /** 当前等级 */
    currentLevel: number;
    /** 天赋 ID */
    id: number;
    /** 展示标签（如 A/E/Q） */
    label: string;
    /** 天赋名称 */
    name: string;
    /** 目标等级 */
    targetLevel: number;
  };

  /**
   * 单项养成材料需求。
   * @since Beta v0.12.6
   */
  type CultivationMaterial = {
    /** 材料 ID */
    id: number;
    /** 所需数量 */
    count: number;
  };

  /**
   * 单项材料的可合成结果。
   * @since Beta v0.12.6
   */
  type CraftableMaterial = {
    /** 可用于补足需求的合成数量 */
    count: number;
    /** 合成方案实际消耗的背包材料 */
    consumed: Array<CultivationMaterial>;
  };

  /**
   * 材料合成后的分配结果。
   * @since Beta v0.12.6
   */
  type CraftingAllocation = {
    /** 各需求材料可通过合成补足的数量及实际消耗 */
    materials: Map<number, CraftableMaterial>;
    /** 预留直接需求并扣除合成消耗后的剩余背包材料 */
    remainingInventory: Map<number, number>;
  };

  /**
   * 复用同一组材料 Wiki 数据的合成计算器。
   * @since Beta v0.12.6
   */
  type CraftingCalculator = (
    requirements: ReadonlyArray<CultivationMaterial>,
    inventory: ReadonlyMap<number, number>,
    useDust?: boolean,
    useSolvent?: boolean,
  ) => CraftingAllocation;

  /**
   * 自动媒介转换的推荐及库存快照。
   * @since Beta v0.12.6
   */
  type AutomaticConversionContext = {
    recommendation: ConversionRecommendation;
    inventory: ReadonlyMap<number, number>;
  };

  /**
   * 养成计划的材料分配结果。
   * @since Beta v0.12.6
   */
  type PlanMaterialAllocation = {
    /** 按目标 ID 保存的实际材料分配结果 */
    entries: Map<string, Array<ResultMaterial>>;
    /** 按目标 ID 保存已采用的明确转换方案 */
    appliedConversions: Map<string, Array<AppliedConversion>>;
    /** 所有活动目标的汇总材料结果 */
    materials: Array<ResultMaterial>;
    /** 分配完成后尚未使用的背包材料 */
    remainingInventory: Map<number, number>;
    /** 预留活动目标普通合成来源后的转换预览库存 */
    conversionInventory: Map<number, number>;
    /** 当前分配完成后仍可额外考虑的媒介转换 */
    recommendations: Array<ConversionRecommendation>;
    /** 按目标 ID 保存已执行的自动媒介转换上下文 */
    automaticConversions: Map<string, Array<AutomaticConversionContext>>;
  };

  /**
   * 媒介转换推荐的普通合成预留结果。
   * @since Beta v0.12.6
   */
  type ConversionPreparation = {
    /** 预留普通合成来源后的库存 */
    inventory: Map<number, number>;
    /** 各目标在普通合成后仍缺少的数量 */
    missing: Map<number, number>;
  };
}
