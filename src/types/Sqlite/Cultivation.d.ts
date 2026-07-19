/**
 * 养成计划数据库类型定义文件
 * @since Beta v0.11.2
 */

declare namespace TGApp.Sqlite.Cultivation {
  /**
   * 养成目标计算方式
   * @since Beta v0.11.2
   */
  type CalculationMode = "bag" | "api";

  /** 养成目标类型 */
  type EntryType = "avatar" | "weapon";

  /** 养成目标状态 */
  type EntryStatus = "active" | "completed";

  /**
   * 养成计划合成配置
   * @since Beta v0.11.2
   */
  type CraftingOptions = {
    /** 是否允许合成材料 */
    allowCrafting: boolean;
    /** 是否允许使用嬗变之尘 */
    useDust: boolean;
    /** 是否允许使用异梦溶媒 */
    useSolvent: boolean;
  };

  /** 天赋等级状态 */
  type TalentState = {
    /** 天赋 ID */
    id: number;
    /** 天赋名称 */
    name: string;
    /** 天赋等级 */
    level: number;
  };

  /** 养成目标的等级状态 */
  type EntryState = {
    /** 等级 */
    level: number;
    /** 已完成突破次数 */
    promoteLevel: number;
    /** 是否包含当前临界等级突破 */
    ascended: boolean;
    /** 天赋状态，武器目标为空数组 */
    talents: Array<TalentState>;
  };

  /** 养成计划数据库原始记录 */
  type ProjectRaw = {
    /** 计划 ID */
    id: string;
    /** 游戏 UID */
    uid: number;
    /** 计划名称 */
    name: string;
    /** 是否为当前计划 */
    isChosen: 0 | 1;
    /** 服务器时区偏移 */
    timezone: number;
    /** 创建时间 */
    created: string;
    /** 更新时间 */
    updated: string;
  };

  /** 养成计划记录 */
  type Project = Omit<ProjectRaw, "isChosen"> & {
    /** 是否为当前计划 */
    isChosen: boolean;
  };

  /** 养成目标数据库原始记录 */
  type EntryRaw = {
    /** 目标 ID */
    id: string;
    /** 所属计划 ID */
    projectId: string;
    /** 目标类型 */
    type: EntryType;
    /** 角色或武器 ID */
    itemId: number;
    /** 武器实例键，角色为空字符串 */
    instanceKey: string;
    /** 显示名称 */
    name: string;
    /** 图标地址 */
    icon: string;
    /** 稀有度 */
    star: number;
    /** 当前状态 JSON */
    currentState: string;
    /** 目标状态 JSON */
    targetState: string;
    /** 目标状态 */
    status: EntryStatus;
    /** 排序值 */
    sortOrder: number;
    /** 计算方式 */
    calculationMode: CalculationMode;
    /** 是否允许合成材料 */
    allowCrafting: 0 | 1;
    /** 是否允许使用嬗变之尘 */
    useDust: 0 | 1;
    /** 是否允许使用异梦溶媒 */
    useSolvent: 0 | 1;
    /** 创建时间 */
    created: string;
    /** 更新时间 */
    updated: string;
  };

  /** 养成目标记录 */
  type Entry = Omit<
    EntryRaw,
    "allowCrafting" | "currentState" | "targetState" | "useDust" | "useSolvent"
  > &
    CraftingOptions & {
      /** 当前状态 */
      currentState: EntryState;
      /** 目标状态 */
      targetState: EntryState;
    };

  /** 目标材料记录 */
  type Item = {
    /** 目标 ID */
    entryId: string;
    /** 材料 ID */
    materialId: number;
    /** 需求数量 */
    required: number;
  };

  /** 包含材料的养成目标 */
  type EntryWithItems = Entry & {
    /** 目标材料列表 */
    items: Array<Item>;
    /** 所属接口计算组结果 */
    apiResult?: ApiResult;
  };

  /**
   * 接口计算结果数据库原始记录
   * @since Beta v0.11.2
   */
  type ApiResultRaw = {
    /** 所属计划 ID */
    projectId: string;
    /** 同组角色目标 ID，无角色时为空字符串 */
    avatarEntryId: string;
    /** 同组武器目标 ID，无武器时为空字符串 */
    weaponEntryId: string;
    /** 接口计算结果 JSON */
    result: string;
    /** 更新时间 */
    updated: string;
  };

  /**
   * 接口计算结果记录
   * @since Beta v0.11.2
   */
  type ApiResult = Omit<ApiResultRaw, "result"> & {
    /** 接口计算结果 */
    result: TGApp.Game.Calculate.Result;
  };

  /**
   * 保存接口计算结果的输入数据
   * @since Beta v0.11.2
   */
  type SaveApiResultInput = Pick<ApiResultRaw, "avatarEntryId" | "weaponEntryId"> & {
    /** 接口计算结果 */
    result: TGApp.Game.Calculate.Result;
  };

  /** 保存养成目标的输入数据 */
  type SaveEntryInput = CraftingOptions & {
    /** 计算方式 */
    calculationMode: CalculationMode;
    /** 目标类型 */
    type: EntryType;
    /** 角色或武器 ID */
    itemId: number;
    /** 武器实例键，角色为空字符串 */
    instanceKey: string;
    /** 显示名称 */
    name: string;
    /** 图标地址 */
    icon: string;
    /** 稀有度 */
    star: number;
    /** 当前状态 */
    currentState: EntryState;
    /** 目标状态 */
    targetState: EntryState;
    /** 材料需求 */
    items: Array<{ materialId: number; required: number }>;
  };

  /** 刷新养成目标的输入数据 */
  type RefreshEntryInput = {
    /** 目标 ID */
    entryId: string;
    /** 最新当前状态 */
    currentState: EntryState;
    /** 刷新后的目标状态 */
    status: EntryStatus;
    /** 重新计算的材料需求 */
    items: Array<{ materialId: number; required: number }>;
  };
}
