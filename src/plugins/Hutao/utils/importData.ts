/**
 * 胡桃本地数据导入服务。
 * @since Beta v0.12.4
 */

import TSUserAbyss from "@Sqlm/userAbyss.js";
import TSUserChallenge from "@Sqlm/userChallenge.js";
import TSUserCombat from "@Sqlm/userCombat.js";
import { readTextFile } from "@tauri-apps/plugin-fs";
import TGLogger from "@utils/TGLogger.js";

import HutaoValid from "./RawValidator.js";

/**
 * 准备阶段的结构化错误。
 * @since Beta v0.12.4
 */
class HutaoImportPreparationError extends Error {
  readonly kind: TGApp.Plugins.Hutao.Import.PreparationErrorKind;

  readonly issues: Array<TGApp.Plugins.Hutao.Import.ValidationIssue>;

  /**
   * 创建保留错误类别与校验问题的准备阶段异常。
   * @since Beta v0.12.4
   * @param kind - 错误类别
   * @param message - 面向用户的错误摘要
   * @param issues - 校验问题列表
   */
  constructor(
    kind: TGApp.Plugins.Hutao.Import.PreparationErrorKind,
    message: string,
    issues: Array<TGApp.Plugins.Hutao.Import.ValidationIssue> = [],
  ) {
    super(message);
    this.name = "HutaoImportPreparationError";
    this.kind = kind;
    this.issues = issues;
  }
}

/**
 * 获取未知异常的可读错误摘要。
 * @since Beta v0.12.4
 * @param error - 捕获的异常
 * @returns 可读错误摘要
 */
function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * 获取导入类型的展示名称。
 * @since Beta v0.12.4
 * @param type - 导入类型
 * @returns 对应类型的中文名称
 */
function typeLabel(type: TGApp.Plugins.Hutao.Import.Type): string {
  switch (type) {
    case "abyss":
      return "深渊";
    case "combat":
      return "剧诗";
    case "challenge":
      return "危战";
  }
}

/**
 * 生成首个校验问题的用户提示。
 * @since Beta v0.12.4
 * @param type - 导入类型
 * @param issues - 结构化校验问题
 * @returns 包含记录位置及字段路径的错误摘要
 */
function validationMessage(
  type: TGApp.Plugins.Hutao.Import.Type,
  issues: Array<TGApp.Plugins.Hutao.Import.ValidationIssue>,
): string {
  const issue = issues[0];
  if (!issue) return `${typeLabel(type)}数据验证失败，请检查文件格式`;
  const position = issue.index === undefined ? "" : `第 ${issue.index + 1} 条记录 `;
  return `${typeLabel(type)}数据验证失败：${position}${issue.path} ${issue.message}`;
}

/**
 * 读取文件并解析 JSON，分别保留读取与解析错误类别。
 * @since Beta v0.12.4
 * @param path - JSON 文件路径
 * @returns 尚未校验的 JSON 数据
 */
async function readImportData(path: string): Promise<unknown> {
  try {
    const text = await readTextFile(path);
    try {
      const data: unknown = JSON.parse(text);
      return data;
    } catch (error) {
      throw new HutaoImportPreparationError("parse", `JSON 解析失败：${errorMessage(error)}`);
    }
  } catch (error) {
    if (error instanceof HutaoImportPreparationError) throw error;
    throw new HutaoImportPreparationError("read", `读取文件失败：${errorMessage(error)}`);
  }
}

/**
 * 提取校验成功的非空记录数组，失败时抛出结构化错误。
 * @since Beta v0.12.4
 * @typeParam T - 校验通过的数据类型
 * @param type - 导入类型
 * @param result - 数组校验结果
 * @returns 校验通过的非空记录数组
 */
function assertNonEmpty<T extends Array<unknown>>(
  type: TGApp.Plugins.Hutao.Import.Type,
  result: TGApp.Plugins.Hutao.Import.ValidationResult<T>,
): T {
  if (!result.valid) {
    throw new HutaoImportPreparationError(
      "validation",
      validationMessage(type, result.issues),
      result.issues,
    );
  }
  if (result.data.length === 0) {
    throw new HutaoImportPreparationError("empty", `${typeLabel(type)}文件中没有可导入记录`);
  }
  return result.data;
}

/**
 * 读取并校验指定类型的胡桃 JSON 文件。
 * @since Beta v0.12.4
 * @param type - 数据类型
 * @param path - JSON 文件路径
 * @returns 已校验、可交给执行阶段的文件数据
 * @remarks 文件读取、解析或校验失败时抛出 HutaoImportPreparationError。
 */
function prepareImport(
  type: "abyss",
  path: string,
): Promise<TGApp.Plugins.Hutao.Import.PreparedAbyssImport>;
function prepareImport(
  type: "combat",
  path: string,
): Promise<TGApp.Plugins.Hutao.Import.PreparedCombatImport>;
function prepareImport(
  type: "challenge",
  path: string,
): Promise<TGApp.Plugins.Hutao.Import.PreparedChallengeImport>;
function prepareImport(
  type: TGApp.Plugins.Hutao.Import.Type,
  path: string,
): Promise<TGApp.Plugins.Hutao.Import.PreparedImport>;
async function prepareImport(
  type: TGApp.Plugins.Hutao.Import.Type,
  path: string,
): Promise<TGApp.Plugins.Hutao.Import.PreparedImport> {
  if (path.trim() === "") {
    throw new HutaoImportPreparationError("read", "未选择 JSON 文件");
  }
  const data = await readImportData(path);
  switch (type) {
    case "abyss":
      return {
        type,
        path,
        records: assertNonEmpty(type, HutaoValid.validateAbyssImport(data)),
      };
    case "combat":
      return {
        type,
        path,
        records: assertNonEmpty(type, HutaoValid.validateCombatImport(data)),
      };
    case "challenge":
      return {
        type,
        path,
        records: assertNonEmpty(type, HutaoValid.validateChallengeImport(data)),
      };
  }
}

/**
 * 报告保存进度，回调异常不会中断导入。
 * @since Beta v0.12.4
 * @param onProgress - 可选进度回调
 * @param completed - 已完成的保存调用数
 * @param total - 总记录数
 */
function reportProgress(
  onProgress: TGApp.Plugins.Hutao.Import.ProgressCallback | undefined,
  completed: number,
  total: number,
): void {
  if (!onProgress) return;
  try {
    onProgress(completed, total);
  } catch (error) {
    console.warn(`[HutaoImport] 进度回调失败：${errorMessage(error)}`);
  }
}

/**
 * 记录失败记录的上下文，日志异常不会覆盖保存错误。
 * @since Beta v0.12.4
 * @param prepared - 已校验的导入文件
 * @param index - 失败记录的零基索引
 * @param record - 失败的记录
 * @param error - 保存异常
 */
async function logSaveFailure(
  prepared: TGApp.Plugins.Hutao.Import.PreparedImport,
  index: number,
  record: TGApp.Plugins.Hutao.Import.RecordMap[TGApp.Plugins.Hutao.Import.Type],
  error: unknown,
): Promise<void> {
  try {
    await TGLogger.Error(
      `[HutaoImport][${prepared.type}] 保存失败：index=${index}, uid=${record.uid}, ` +
        `scheduleId=${record.schedule_id}, path=${prepared.path}, error=${errorMessage(error)}`,
    );
  } catch (logError) {
    console.error(`[HutaoImport] 保存失败日志记录失败：${errorMessage(logError)}`);
  }
}

/**
 * 串行保存已校验的胡桃导入数据。
 * @since Beta v0.12.4
 * @param prepared - 通过 prepareImport 返回的文件数据
 * @param onProgress - 每次保存完成后触发的进度回调
 * @returns 执行结果；保存异常会停止当前文件并保留已完成数量
 */
async function executeImport(
  prepared: TGApp.Plugins.Hutao.Import.PreparedImport,
  onProgress?: TGApp.Plugins.Hutao.Import.ProgressCallback,
): Promise<TGApp.Plugins.Hutao.Import.ExecutionResult> {
  const total = prepared.records.length;
  let completed = 0;
  let attempted = 0;
  reportProgress(onProgress, completed, total);

  for (let index = 0; index < total; index += 1) {
    const record = prepared.records[index];
    attempted += 1;
    try {
      switch (prepared.type) {
        case "abyss":
          await TSUserAbyss.saveAbyss(prepared.records[index].uid, prepared.records[index].data);
          break;
        case "combat":
          await TSUserCombat.saveCombat(prepared.records[index].uid, prepared.records[index].data);
          break;
        case "challenge":
          await TSUserChallenge.saveChallenge(
            prepared.records[index].uid,
            prepared.records[index].data,
          );
          break;
      }
      completed += 1;
      reportProgress(onProgress, completed, total);
    } catch (error) {
      const message = errorMessage(error);
      await logSaveFailure(prepared, index, record, error);
      return {
        total,
        completed,
        failedIndex: index,
        failedScheduleId: record.schedule_id,
        failedUid: record.uid,
        error: `UID ${record.uid}、期次 ${record.schedule_id} 保存失败：${message}`,
        mayHaveWrites: attempted > 0,
      };
    }
  }

  return {
    total,
    completed,
    mayHaveWrites: attempted > 0,
  };
}

/**
 * 胡桃本地导入服务入口。
 * @since Beta v0.12.4
 */
const HutaoImport = {
  prepareImport,
  executeImport,
  PreparationError: HutaoImportPreparationError,
};

export default HutaoImport;
