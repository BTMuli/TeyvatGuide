/**
 * 胡桃本地导入与校验类型。
 * @since Beta v0.12.4
 */

declare namespace TGApp.Plugins.Hutao.Import {
  /**
   * 胡桃导入数据类型。
   * @since Beta v0.12.4
   */
  type Type = "abyss" | "combat" | "challenge";

  /**
   * 胡桃导入记录类型映射。
   * @since Beta v0.12.4
   */
  type RecordMap = {
    abyss: TGApp.Plugins.Hutao.Abyss.ImportData;
    combat: TGApp.Plugins.Hutao.Combat.ImportData;
    challenge: TGApp.Plugins.Hutao.Challenge.ImportData;
  };

  /**
   * 单条胡桃导入数据的校验问题。
   * @since Beta v0.12.4
   */
  type ValidationIssue = {
    /** 文件数组中的记录位置；文件根结构错误时为空 */
    index?: number;
    /** JSON 实例路径或 schema 路径 */
    path: string;
    /** Ajv 校验关键字 */
    keyword?: string;
    /** 面向用户的错误摘要 */
    message: string;
  };

  /**
   * 结构化校验结果。
   * @since Beta v0.12.4
   * @typeParam T - 校验成功的数据类型
   */
  type ValidationResult<T> =
    | { valid: true; data: T; issues: Array<never> }
    | { valid: false; issues: Array<ValidationIssue> };

  /**
   * 已校验的深渊导入文件。
   * @since Beta v0.12.4
   */
  type PreparedAbyssImport = {
    /** 数据类型判别值 */
    type: "abyss";
    /** 源 JSON 文件路径 */
    path: string;
    /** 已完成校验的记录 */
    records: Array<RecordMap["abyss"]>;
  };

  /**
   * 已校验的剧诗导入文件。
   * @since Beta v0.12.4
   */
  type PreparedCombatImport = {
    /** 数据类型判别值 */
    type: "combat";
    /** 源 JSON 文件路径 */
    path: string;
    /** 已完成校验的记录 */
    records: Array<RecordMap["combat"]>;
  };

  /**
   * 已校验的危战导入文件。
   * @since Beta v0.12.4
   */
  type PreparedChallengeImport = {
    /** 数据类型判别值 */
    type: "challenge";
    /** 源 JSON 文件路径 */
    path: string;
    /** 已完成校验的记录 */
    records: Array<RecordMap["challenge"]>;
  };

  /**
   * 已完成读取和校验的胡桃导入文件。
   * @since Beta v0.12.4
   */
  type PreparedImport = PreparedAbyssImport | PreparedCombatImport | PreparedChallengeImport;

  /**
   * 准备阶段失败的类别。
   * @since Beta v0.12.4
   */
  type PreparationErrorKind = "read" | "parse" | "empty" | "validation";

  /**
   * 导入执行进度回调。
   * @since Beta v0.12.4
   * @param completed - 已完成的保存调用数
   * @param total - 文件中的总记录数
   */
  type ProgressCallback = (completed: number, total: number) => void;

  /**
   * 单个导入文件的执行结果。
   * @since Beta v0.12.4
   */
  type ExecutionResult = {
    /** 文件中的记录总数 */
    total: number;
    /** 已成功完成的保存调用数 */
    completed: number;
    /** 失败的文件记录位置 */
    failedIndex?: number;
    /** 失败记录的 UID */
    failedUid?: string;
    /** 失败记录的期次 */
    failedScheduleId?: number;
    /** 保存错误摘要；成功时为空 */
    error?: string;
    /** 是否可能已经发生写入，包括首条保存调用抛错的情况 */
    mayHaveWrites: boolean;
  };
}
