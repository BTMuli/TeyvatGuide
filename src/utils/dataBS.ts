/**
 * @file utils/dataBS.ts
 * @description 用户数据的备份、恢复、迁移
 * @since Beta v0.6.3
 */
import { exists, mkdir } from "@tauri-apps/plugin-fs";

import showSnackbar from "../components/func/snackbar.js";
import TSUserAbyss from "../plugins/Sqlite/modules/userAbyss.js";
import TSUserAccount from "../plugins/Sqlite/modules/userAccount.js";
import TSUserAchi from "../plugins/Sqlite/modules/userAchi.js";
import TSUserCombat from "../plugins/Sqlite/modules/userCombat.js";
import TSUserGacha from "../plugins/Sqlite/modules/userGacha.js";

import TGLogger from "./TGLogger.js";

/**
 * @description 备份用户数据
 * @since Beta v0.6.3
 * @param {string} dir 备份目录路径
 * @returns {Promise<void>}
 */
export async function backUpUserData(dir: string): Promise<void> {
  if (!(await exists(dir))) {
    await TGLogger.Warn("备份数据不存在，即将创建");
    await mkdir(dir, { recursive: true });
  }
  await TSUserAchi.backupUiaf(dir);
  await TSUserAccount.account.backup(dir);
  await TSUserAbyss.backupAbyss(dir);
  await TSUserCombat.backupCombat(dir);
  await TSUserGacha.backUpUigf(dir);
}

/**
 * @description 恢复用户数据
 * @since Beta v0.6.3
 * @param {string} dir 备份目录路径
 * @returns {Promise<void>}
 */
export async function restoreUserData(dir: string): Promise<void> {
  let errNum = 0;
  if (!(await exists(dir))) {
    showSnackbar({ text: "备份目录不存在", color: "error" });
    return;
  }
  const restoreAchi = await TSUserAchi.restoreUiaf(dir);
  if (!restoreAchi) {
    showSnackbar({ text: `成就数据恢复失败`, color: "error" });
    errNum++;
  }
  const restoreAccount = await TSUserAccount.account.restore(dir);
  if (!restoreAccount) {
    showSnackbar({ text: "Cookie 数据恢复失败", color: "error" });
    errNum++;
  }
  const restoreAbyss = await TSUserAbyss.restoreAbyss(dir);
  if (!restoreAbyss) {
    showSnackbar({ text: "深渊数据恢复失败", color: "error" });
    errNum++;
  }
  const restoreCombat = await TSUserCombat.restoreCombat(dir);
  if (!restoreCombat) {
    showSnackbar({ text: "真境剧诗数据恢复失败", color: "error" });
    errNum++;
  }
  const restoreGacha = await TSUserGacha.restoreUigf(dir);
  if (!restoreGacha) {
    showSnackbar({ text: "祈愿数据恢复失败", color: "error" });
    errNum++;
  }
  if (errNum === 0) {
    showSnackbar({ text: "数据恢复成功", color: "success" });
  } else {
    showSnackbar({ text: `数据恢复失败，失败数量：${errNum}`, color: "error" });
  }
}
