/**
 * 账号相关辅助函数
 * @since Beta v0.9.9
 */

import showDialog from "@comp/func/dialog.js";
import showSnackbar from "@comp/func/snackbar.js";
import TSUserAccount from "@Sqlm/userAccount.js";

import TGLogger from "./TGLogger.js";

/**
 * 获取刷新用的账号和Cookie
 * @since Beta v0.9.9
 * @param uid - 当前选择的UID
 * @param dAc - 默认账号
 * @param dCk - 默认Cookie
 * @param lp - 日志前缀（用于区分不同页面）
 * @returns 验证后的账号和Cookie，如果验证失败返回null
 */
export async function getRfAc(
  uid: string | undefined,
  dAc: TGApp.Sqlite.Account.Game,
  dCk: TGApp.App.Account.Cookie | undefined,
  lp: string,
): Promise<TGApp.App.Account.RfAc | null> {
  let rfAc = dAc;
  let rfCk = dCk;

  if (!uid) {
    if (!rfCk) {
      showSnackbar.warn("请先登录");
      await TGLogger.Warn(`[${lp}] 未登录`);
      return null;
    }
  } else {
    const gcFind = await TSUserAccount.game.getAccountByGid(uid.toString());
    if (!gcFind) {
      const check = await showDialog.check(
        `确定刷新？`,
        `未找到 ${uid} 对应 UID，将刷新 ${rfAc.gameUid} 数据`,
      );
      if (!check) return null;
    } else {
      const acFind = await TSUserAccount.account.getAccount(gcFind.uid);
      if (!acFind) {
        const check = await showDialog.check(
          `确定刷新？`,
          `未找到 ${uid} 对应 CK，将刷新 ${rfAc.gameUid} 数据`,
        );
        if (!check) return null;
      } else {
        rfAc = gcFind;
        rfCk = acFind.cookie;
      }
    }
  }
  if (rfAc && rfCk) return { account: rfAc, cookie: rfCk };
  return null;
}
