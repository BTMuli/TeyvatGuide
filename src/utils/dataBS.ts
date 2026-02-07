/**
 * 用户数据的备份、恢复、迁移
 * @since Beta v0.9.5
 */

import showLoading from "@comp/func/loading.js";
import showSnackbar from "@comp/func/snackbar.js";
import TSUserAbyss from "@Sqlm/userAbyss.js";
import TSUserAccount from "@Sqlm/userAccount.js";
import TSUserAchi from "@Sqlm/userAchi.js";
import TSUserChallenge from "@Sqlm/userChallenge.js";
import TSUserCombat from "@Sqlm/userCombat.js";
import { exists, mkdir } from "@tauri-apps/plugin-fs";
import { backUpUigf, restoreUigf } from "@utils/UIGF.js";

import TGLogger from "./TGLogger.js";

/**
 * 备份用户数据
 * @since Beta v0.9.5
 * @TODO 处理胡桃数据&应用自身数据的导入
 * @param dir - 备份目录路径
 * @returns 无返回值
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
  await showLoading.update("正在备份幽境危战数据");
  await TSUserChallenge.backupChallenge(dir);
  await showLoading.update("正在备份祈愿数据");
  await backUpUigf(dir);
}

/**
 * 恢复用户数据
 * @since Beta v0.9.5
 * @param dir - 备份目录路径
 * @returns 无返回值
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
  await showLoading.update("正在恢复幽境危战数据");
  const restoreChallenge = await TSUserChallenge.restoreChallenge(dir);
  if (!restoreChallenge) {
    showSnackbar.error("幽境危战数据恢复失败");
    errNum++;
  }
  await showLoading.update("正在恢复祈愿数据");
  const restoreGacha = await restoreUigf(dir);
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
