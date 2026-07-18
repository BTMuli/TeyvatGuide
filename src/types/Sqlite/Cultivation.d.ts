/**
 * 养成计划数据库类型定义文件
 * @since Beta v0.11.2
 */

declare namespace TGApp.Sqlite.Cultivation {
  /** 养成目标类型 */
  type EntryType = "avatar" | "weapon";

  /** 养成目标状态 */
  type EntryStatus = "active" | "completed";

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
    /** 创建时间 */
    created: string;
    /** 更新时间 */
    updated: string;
  };

  /** 养成目标记录 */
  type Entry = Omit<EntryRaw, "currentState" | "targetState"> & {
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
  };

  /** 保存养成目标的输入数据 */
  type SaveEntryInput = {
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
