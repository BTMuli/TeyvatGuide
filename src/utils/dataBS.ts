/**
 * @file utils/dataBS.ts
 * @description 用户数据的备份、恢复、迁移
 * @since Beta v0.6.7
 */
import showLoading from "@comp/func/loading.js";
import showSnackbar from "@comp/func/snackbar.js";
import TSUserAbyss from "@Sqlm/userAbyss.js";
import TSUserAccount from "@Sqlm/userAccount.js";
import TSUserAchi from "@Sqlm/userAchi.js";
import TSUserCombat from "@Sqlm/userCombat.js";
import TSUserGacha from "@Sqlm/userGacha.js";
import { exists, mkdir } from "@tauri-apps/plugin-fs";

import TGLogger from "./TGLogger.js";

/**
 * @description 备份用户数据
 * @since Beta v0.6.7
 * @param {string} dir 备份目录路径
 * @returns {Promise<void>}
 */
export async function backUpUserData(dir: string): Promise<void> {
  if (!(await exists(dir))) {
    await TGLogger.Warn("备份数据不存在，即将创建");
    await mkdir(dir, { recursive: true });
  }
  await showLoading.update("正在备份UIAF成就数据");
  await TSUserAchi.backupUiaf(dir);
  await showLoading.update("正在备份用户账户数据");
  await TSUserAccount.account.backup(dir);
  await showLoading.update("正在备份深渊数据");
  await TSUserAbyss.backupAbyss(dir);
  await showLoading.update("正在备份真境剧诗数据");
  await TSUserCombat.backupCombat(dir);
  await showLoading.update("正在备份UIGF祈愿数据");
  await TSUserGacha.backUpUigf(dir);
}

/**
 * @description 恢复用户数据
 * @since Beta v0.6.7
 * @param {string} dir 备份目录路径
 * @returns {Promise<void>}
 */
export async function restoreUserData(dir: string): Promise<void> {
  let errNum = 0;
  if (!(await exists(dir))) {
    showSnackbar.error("备份目录不存在");
    return;
  }
  await showLoading.update("正在恢复成就数据");
  const restoreAchi = await TSUserAchi.restoreUiaf(dir);
  if (!restoreAchi) {
    showSnackbar.error("成就数据恢复失败");
    errNum++;
  }
  await showLoading.update("正在恢复账号数据");
  const restoreAccount = await TSUserAccount.account.restore(dir);
  if (!restoreAccount) {
    showSnackbar.error("Cookie 数据恢复失败");
    errNum++;
  }
  await showLoading.update("正在恢复深渊数据");
  const restoreAbyss = await TSUserAbyss.restoreAbyss(dir);
  if (!restoreAbyss) {
    showSnackbar.error("深渊数据恢复失败");
    errNum++;
  }
  await showLoading.update("正在恢复真境剧诗数据");
  const restoreCombat = await TSUserCombat.restoreCombat(dir);
  if (!restoreCombat) {
    showSnackbar.error("真境剧诗数据恢复失败");
    errNum++;
  }
  await showLoading.update("正在恢复祈愿数据");
  const restoreGacha = await TSUserGacha.restoreUigf(dir);
  if (!restoreGacha) {
    showSnackbar.error("祈愿数据恢复失败");
    errNum++;
  }
  if (errNum !== 0) {
    showSnackbar.error(`数据恢复失败，失败数:${errNum}`);
    return;
  }
  showSnackbar.success("数据恢复成功");
}
