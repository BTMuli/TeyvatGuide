/**
 * 胡桃原始数据验证器
 * @since Beta v0.12.4
 */

import showSnackbar from "@comp/func/snackbar.js";
import Ajv from "ajv";
import type { ErrorObject, ValidateFunction } from "ajv";

import AbyssJson from "../schema/abyss.json" with { type: "json" };
import ChallengeJson from "../schema/challenge.json" with { type: "json" };
import CombatJson from "../schema/combat.json" with { type: "json" };

const ajv = new Ajv.Ajv({ allErrors: true, strictTypes: false });

const AbyssValidate = ajv.compile<TGApp.Plugins.Hutao.Abyss.ImportData>(AbyssJson);
const ChallengeValidate = ajv.compile<TGApp.Plugins.Hutao.Challenge.ImportData>(ChallengeJson);
const CombatValidate = ajv.compile<TGApp.Plugins.Hutao.Combat.ImportData>(CombatJson);

/**
 * 生成包含数组记录索引的校验路径。
 * @since Beta v0.12.4
 * @param error - Ajv 校验错误
 * @param index - 可选的零基记录索引
 * @returns JSON 实例路径或 schema 路径
 */
function issuePath(error: ErrorObject, index?: number): string {
  const path = error.instancePath || error.schemaPath || "/";
  if (index === undefined) return path;
  return path.startsWith("/") ? `/${index}${path}` : `/${index} (${path})`;
}

/**
 * 将 Ajv 校验错误转换为结构化问题。
 * @since Beta v0.12.4
 * @param errors - Ajv 校验错误列表
 * @param index - 可选的零基记录索引
 * @returns 包含记录索引与字段路径的问题列表
 */
function toIssues(
  errors: Array<ErrorObject> | null | undefined,
  index?: number,
): Array<TGApp.Plugins.Hutao.Import.ValidationIssue> {
  if (!errors || errors.length === 0) {
    return [
      {
        index,
        path: index === undefined ? "/" : `/${index}`,
        message: "数据格式错误",
      },
    ];
  }
  return errors.map((error) => ({
    index,
    keyword: error.keyword,
    message: error.message || "数据格式错误",
    path: issuePath(error, index),
  }));
}

/**
 * 完整校验数组中的每条记录，汇总错误后统一返回。
 * @since Beta v0.12.4
 * @typeParam T - 校验通过的数据类型
 * @param data - 待校验的文件数据
 * @param validator - 单条记录的类型校验器
 * @returns 校验通过的记录数组或全部校验问题
 */
function validateArray<T>(
  data: unknown,
  validator: ValidateFunction<T>,
): TGApp.Plugins.Hutao.Import.ValidationResult<Array<T>> {
  if (!Array.isArray(data)) {
    return {
      valid: false,
      issues: [
        {
          path: "/",
          message: "文件数据必须是数组",
        },
      ],
    };
  }

  const values: Array<unknown> = data;
  const records: Array<T> = [];
  const issues: Array<TGApp.Plugins.Hutao.Import.ValidationIssue> = [];
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (validator(value)) {
      records.push(value);
    } else {
      issues.push(...toIssues(validator.errors, index));
    }
  }
  if (issues.length > 0) return { valid: false, issues };
  return { valid: true, data: records, issues: [] };
}

/**
 * 验证深渊导入数据，不产生全局提示。
 * @since Beta v0.12.4
 * @param data - 待验证的数据
 * @returns 结构化校验结果
 */
function validateAbyssImport(
  data: unknown,
): TGApp.Plugins.Hutao.Import.ValidationResult<Array<TGApp.Plugins.Hutao.Abyss.ImportData>> {
  return validateArray(data, AbyssValidate);
}

/**
 * 验证危战导入数据，不产生全局提示。
 * @since Beta v0.12.4
 * @param data - 待验证的数据
 * @returns 结构化校验结果
 */
function validateChallengeImport(
  data: unknown,
): TGApp.Plugins.Hutao.Import.ValidationResult<Array<TGApp.Plugins.Hutao.Challenge.ImportData>> {
  return validateArray(data, ChallengeValidate);
}

/**
 * 验证剧诗导入数据，不产生全局提示。
 * @since Beta v0.12.4
 * @param data - 待验证的数据
 * @returns 结构化校验结果
 */
function validateCombatImport(
  data: unknown,
): TGApp.Plugins.Hutao.Import.ValidationResult<Array<TGApp.Plugins.Hutao.Combat.ImportData>> {
  return validateArray(data, CombatValidate);
}

/**
 * 根据数据类型验证胡桃导入文件，不产生全局提示。
 * @since Beta v0.12.4
 * @param type - 数据类型
 * @param data - 待验证的数据
 * @returns 结构化校验结果
 */
function validateImport(
  type: "abyss",
  data: unknown,
): TGApp.Plugins.Hutao.Import.ValidationResult<Array<TGApp.Plugins.Hutao.Abyss.ImportData>>;
function validateImport(
  type: "combat",
  data: unknown,
): TGApp.Plugins.Hutao.Import.ValidationResult<Array<TGApp.Plugins.Hutao.Combat.ImportData>>;
function validateImport(
  type: "challenge",
  data: unknown,
): TGApp.Plugins.Hutao.Import.ValidationResult<Array<TGApp.Plugins.Hutao.Challenge.ImportData>>;
function validateImport(
  type: TGApp.Plugins.Hutao.Import.Type,
  data: unknown,
): TGApp.Plugins.Hutao.Import.ValidationResult<
  | Array<TGApp.Plugins.Hutao.Abyss.ImportData>
  | Array<TGApp.Plugins.Hutao.Combat.ImportData>
  | Array<TGApp.Plugins.Hutao.Challenge.ImportData>
>;
function validateImport(
  type: TGApp.Plugins.Hutao.Import.Type,
  data: unknown,
): TGApp.Plugins.Hutao.Import.ValidationResult<
  | Array<TGApp.Plugins.Hutao.Abyss.ImportData>
  | Array<TGApp.Plugins.Hutao.Combat.ImportData>
  | Array<TGApp.Plugins.Hutao.Challenge.ImportData>
> {
  switch (type) {
    case "abyss":
      return validateAbyssImport(data);
    case "combat":
      return validateCombatImport(data);
    case "challenge":
      return validateChallengeImport(data);
  }
}

/**
 * 为旧版布尔校验入口显示首个错误提示。
 * @since Beta v0.12.4
 * @param label - 数据类型的中文名称
 * @param result - 结构化校验结果
 */
function reportLegacyFailure(
  label: string,
  result: TGApp.Plugins.Hutao.Import.ValidationResult<unknown>,
): void {
  if (result.valid) return;
  const issue = result.issues[0];
  console.error(result.issues);
  showSnackbar.error(`${label}数据验证失败：${issue.path} ${issue.message}`);
}

/**
 * 验证旧版深渊数据数组并保留布尔类型守卫兼容性。
 * @since Beta v0.12.4
 * @param data - 待验证的数据
 * @returns 验证是否通过（类型收束）
 */
function verifyAbyssArray(data: unknown): data is Array<TGApp.Plugins.Hutao.Abyss.ImportData> {
  const result = validateAbyssImport(data);
  reportLegacyFailure("深渊", result);
  return result.valid;
}

/**
 * 验证旧版危战数据数组并保留布尔类型守卫兼容性。
 * @since Beta v0.12.4
 * @param data - 待验证的数据
 * @returns 验证是否通过（类型收束）
 */
function verifyChallengeArray(
  data: unknown,
): data is Array<TGApp.Plugins.Hutao.Challenge.ImportData> {
  const result = validateChallengeImport(data);
  reportLegacyFailure("危战", result);
  return result.valid;
}

/**
 * 验证旧版剧诗数据数组并保留布尔类型守卫兼容性。
 * @since Beta v0.12.4
 * @param data - 待验证的数据
 * @returns 验证是否通过（类型收束）
 */
function verifyCombatArray(data: unknown): data is Array<TGApp.Plugins.Hutao.Combat.ImportData> {
  const result = validateCombatImport(data);
  reportLegacyFailure("剧诗", result);
  return result.valid;
}

/**
 * 胡桃原始数据校验入口。
 * @since Beta v0.12.4
 */
const HutaoValid = {
  validateAbyssImport,
  validateCombatImport,
  validateChallengeImport,
  validateImport,
  /** 深渊数据验证 */
  abyss: verifyAbyssArray,
  /** 危战数据验证 */
  challenge: verifyChallengeArray,
  /** 剧诗数据验证 */
  combat: verifyCombatArray,
};

export default HutaoValid;
