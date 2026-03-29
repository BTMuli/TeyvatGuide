/**
 * 胡桃原始数据验证器
 * @since Beta v0.9.9
 */

import showSnackbar from "@comp/func/snackbar.js";
import Ajv from "ajv";

import AbyssJson from "../schema/abyss.json" with { type: "json" };
import ChallengeJson from "../schema/challenge.json" with { type: "json" };
import CombatJson from "../schema/combat.json" with { type: "json" };

const ajv = new Ajv.Ajv();

const AbyssValidate = ajv.compile(AbyssJson);
const ChallengeValidate = ajv.compile(ChallengeJson);
const CombatValidate = ajv.compile(CombatJson);

/**
 * 验证深渊单条数据
 * @since Beta v0.9.9
 * @param data - 待验证的数据
 * @returns 验证是否通过（类型收束）
 */
function validateAbyss(data: unknown): data is TGApp.Plugins.Hutao.Abyss.ImportData {
  if (!AbyssValidate(data)) {
    const error = AbyssValidate.errors?.[0];
    if (error) {
      showSnackbar.error(
        `深渊数据验证失败：${error.instancePath || error.schemaPath} ${error.message}`,
      );
    }
    return false;
  }
  return true;
}

/**
 * 验证危战单条数据
 * @since Beta v0.9.9
 * @param data - 待验证的数据
 * @returns 验证是否通过（类型收束）
 */
function validateChallenge(data: unknown): data is TGApp.Plugins.Hutao.Challenge.ImportData {
  if (!ChallengeValidate(data)) {
    const error = ChallengeValidate.errors?.[0];
    if (error) {
      showSnackbar.error(
        `危战数据验证失败：${error.instancePath || error.schemaPath} ${error.message}`,
      );
    }
    return false;
  }
  return true;
}

/**
 * 验证剧诗单条数据
 * @since Beta v0.9.9
 * @param data - 待验证的数据
 * @returns 验证是否通过（类型收束）
 */
function validateCombat(data: unknown): data is TGApp.Plugins.Hutao.Combat.ImportData {
  if (!CombatValidate(data)) {
    const error = CombatValidate.errors?.[0];
    if (error) {
      showSnackbar.error(
        `剧诗数据验证失败：${error.instancePath || error.schemaPath} ${error.message}`,
      );
    }
    return false;
  }
  return true;
}

/**
 * 验证深渊数据数组
 * @since Beta v0.9.9
 * @param data - 待验证的数据
 * @returns 验证是否通过（类型收束）
 */
function verifyAbyssArray(data: unknown): data is Array<TGApp.Plugins.Hutao.Abyss.ImportData> {
  if (!Array.isArray(data)) return false;
  return data.every(validateAbyss);
}

/**
 * 验证危战数据数组
 * @since Beta v0.9.9
 * @param data - 待验证的数据
 * @returns 验证是否通过（类型收束）
 */
function verifyChallengeArray(
  data: unknown,
): data is Array<TGApp.Plugins.Hutao.Challenge.ImportData> {
  if (!Array.isArray(data)) return false;
  return data.every(validateChallenge);
}

/**
 * 验证剧诗数据数组
 * @since Beta v0.9.9
 * @param data - 待验证的数据
 * @returns 验证是否通过（类型收束）
 */
function verifyCombatArray(data: unknown): data is Array<TGApp.Plugins.Hutao.Combat.ImportData> {
  if (!Array.isArray(data)) return false;
  return data.every(validateCombat);
}

/**
 * 原始数据验证器
 * @since Beta v0.9.9
 */
export const RawValidator = {
  /** 深渊数据验证 */
  abyss: verifyAbyssArray,
  /** 危战数据验证 */
  challenge: verifyChallengeArray,
  /** 剧诗数据验证 */
  combat: verifyCombatArray,
};
