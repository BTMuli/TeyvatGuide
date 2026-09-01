/**
 * 应用成就相关类型定义文件
 * @since Beta v0.12.1
 */

declare namespace TGApp.App.Achievement {
  /**
   * 成就目录
   * @since Beta v0.12.1
   */
  type Catalog = {
    /** 数据结构版本。 */
    schemaVersion: 2;
    /** 数据对应的游戏版本。 */
    gameVersion: string;
    /** 成就分类列表。 */
    categories: Array<Category>;
  };

  /**
   * 成就分类
   * @since Beta v0.12.1
   */
  type Category = {
    /** 分类 ID。 */
    id: number;
    /** 分类唯一键。 */
    key: string;
    /** 分类排序值。 */
    order: number;
    /** 分类名称。 */
    name: string;
    /** 分类加入的游戏版本。 */
    version: string;
    /** 分类全部成就的原石奖励总数。 */
    totalReward: number;
    /** 分类名片 ID。 */
    namecardId: number | null;
    /** 分类图标。 */
    icon: string;
    /** 分类下的成就定义。 */
    achievements: Array<Definition>;
  };

  /**
   * 成就静态定义
   * @since Beta v0.12.1
   */
  type Definition = {
    /** 成就 ID。 */
    id: number;
    /** 所属分类 ID。 */
    categoryId: number;
    /** 成就在分类内的排序值。 */
    order: number;
    /** 成就名称。 */
    name: string;
    /** 成就描述。 */
    description: string;
    /** 原石奖励数量。 */
    reward: number;
    /** 成就加入的游戏版本。 */
    version: string;
    /** 是否为隐藏成就。 */
    hidden: boolean;
    /** 成就目标进度。 */
    target: number;
    /** 前置阶段成就 ID。 */
    preStageId?: number;
    /** 后置阶段成就 ID。 */
    postStageId?: number;
    /** 成就触发信息。 */
    trigger: Trigger;
    /** 成就分步项定义。 */
    partials: Array<Partial>;
  };

  /**
   * 成就触发信息
   * @since Beta v0.12.1
   */
  type Trigger = {
    /** 触发器类型。 */
    type: string;
    /** 关联的触发任务。 */
    tasks: Array<TriggerTask>;
  };

  /**
   * 成就触发任务
   * @since Beta v0.12.1
   */
  type TriggerTask = {
    /** 任务 ID。 */
    taskId: number;
    /** 所属任务链 ID。 */
    questId: number;
    /** 任务类型。 */
    type: string;
    /** 任务名称。 */
    name: string;
  };

  /**
   * 成就分步项类型
   * @since Beta v0.12.1
   */
  const PartialType = <const>{
    /** 成就 */
    Achievement: "achievement",
    /** 任务 */
    Quest: "quest",
    /** 子任务 */
    SubQuest: "subquest",
    /** 任务目标 */
    Task: "task",
    /** 子目标 */
    SubTask: "subtask",
  };

  /**
   * 成就分步项类型枚举
   * @since Beta v0.12.1
   */
  type PartialTypeEnum = (typeof PartialType)[keyof typeof PartialType];

  /**
   * 成就分步项定义
   * @since Beta v0.12.1
   */
  type Partial = {
    /** 分步项 ID。 */
    id: number;
    /** 分步项类型。 */
    type: PartialTypeEnum;
    /** 分步项名称。 */
    name: string;
  };

  /**
   * 供成就组件使用的静态定义与用户状态合并数据
   * @since Beta v0.12.1
   */
  type RenderItem = Definition & {
    /** 用户成就记录 ID。 */
    uid: number;
    /** UIAF 成就状态。 */
    status: TGApp.Plugins.UIAF.AchiItemStatEnum;
    /** 是否已完成。 */
    isCompleted: boolean;
    /** 完成时间。 */
    completedTime: string;
    /** 当前进度。 */
    progress: number;
    /** 用户记录更新时间。 */
    updated: string;
  };

  /**
   * 成就完成情况概览
   * @since Beta v0.9.1
   */
  type Overview = {
    /** 成就总数。 */
    total: number;
    /** 已完成成就数。 */
    fin: number;
  };
}
