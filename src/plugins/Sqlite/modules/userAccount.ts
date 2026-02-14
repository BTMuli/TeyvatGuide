/**
 * 用户账户模块
 * @since Beta v0.9.6
 */

import showLoading from "@comp/func/loading.js";
import showSnackbar from "@comp/func/snackbar.js";
import bbsReq from "@req/bbsReq.js";
import passportReq from "@req/passportReq.js";
import { path } from "@tauri-apps/api";
import { exists, mkdir, readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import TGLogger from "@utils/TGLogger.js";
import { timestampToDate } from "@utils/toolFunc.js";

import TGSqlite from "../index.js";

/**
 * 获取插入游戏账号数据的sql
 * @since Beta v0.7.2
 * @param uid - 米社UID
 * @param data - 游戏账号数据
 * @returns 插入Sql
 */
function getInsertGameAccountSql(uid: string, data: TGApp.BBS.Game.Account): string {
  const isChosen = data.is_chosen ? 1 : 0;
  const isOfficial = data.is_official ? 1 : 0;
  const timeNow = timestampToDate(new Date().getTime());
  return `
      INSERT INTO GameAccount(uid, gameBiz, gameUid, isChosen, isOfficial, level, nickname, region, regionName, updated)
      VALUES ('${uid}', '${data.game_biz}', '${data.game_uid}', ${isChosen}, ${isOfficial}, ${data.level},
              '${data.nickname}', '${data.region}', '${data.region_name}', '${timeNow}
              ')
      ON CONFLICT(uid, gameUid, gameBiz) DO UPDATE
          SET isChosen   = ${isChosen},
              isOfficial = ${isOfficial},
              level      = ${data.level},
              nickname   = '${data.nickname}',
              region     = '${data.region}',
              regionName = '${data.region_name}',
              updated    = '${timeNow}';
  `;
}

/**
 * 数据库转成可用数据
 * @since Beta v0.6.0
 * @param data - 用户数据
 * @returns 解析后的数据
 */
function parseUser(data: TGApp.Sqlite.Account.User): TGApp.App.Account.User {
  return {
    uid: data.uid,
    brief: JSON.parse(data.brief),
    cookie: JSON.parse(data.cookie),
    updated: data.updated,
  };
}

/**
 * 转成数据库数据方便存储
 * @since Beta v0.6.0
 * @param data - 用户数据
 * @returns 数据库存储数据
 */
function transUser(data: TGApp.App.Account.User): TGApp.Sqlite.Account.User {
  return {
    uid: data.uid,
    brief: JSON.stringify(data.brief),
    cookie: JSON.stringify(data.cookie),
    updated: timestampToDate(new Date().getTime()),
  };
}

/**
 * 获取所有用户数据
 * @since Beta v0.6.0
 * @returns 用户数据列表
 */
async function getAllAccount(): Promise<Array<TGApp.App.Account.User>> {
  const db = await TGSqlite.getDB();
  const res = await db.select<Array<TGApp.Sqlite.Account.User>>("SELECT * FROM UserAccount;");
  return res.map(parseUser);
}

/**
 * 获取所有UID
 * @since Beta v0.6.0
 * @returns uid 列表
 */
async function getAllAccountId(): Promise<Array<string>> {
  const db = await TGSqlite.getDB();
  type resType = Array<{ uid: string }>;
  const res = await db.select<resType>("SELECT DISTINCT uid FROM GameAccount;");
  return res.map((account) => account.uid);
}

/**
 * 获取指定用户数据
 * @since Beta v0.6.0
 * @param uid - 用户UID
 * @returns 用户数据
 */
async function getUserAccount(uid: string): Promise<TGApp.App.Account.User | false> {
  const db = await TGSqlite.getDB();
  const res = await db.select<Array<TGApp.Sqlite.Account.User>>(
    "SELECT * FROM UserAccount WHERE uid = ?",
    [uid],
  );
  if (res.length === 0) return false;
  return parseUser(res[0]);
}

/**
 * 更新用户数据
 * @since Beta v0.9.5
 * @param data - 用户cookie
 * @returns 无返回值
 */
async function saveAccount(data: TGApp.App.Account.User): Promise<void> {
  const db = await TGSqlite.getDB();
  const user = transUser(data);
  await db.execute(
    `INSERT INTO UserAccount(uid, cookie, brief, updated)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT(uid) DO UPDATE
         SET cookie  = $2,
             brief   = $3,
             updated = $4`,
    [user.uid, user.cookie, user.brief, user.updated],
  );
}

/**
 * 检测并更新
 * @since Beta v0.9.5
 * @returns 无返回值
 */
async function updateAllAccountCk(): Promise<void> {
  const accounts = await getAllAccount();
  const checkTime = 5 * 24 * 3600 * 1000;
  let cnt = 0;
  for (const account of accounts) {
    const diffTime = Date.now() - new Date(account.updated).getTime();
    if (diffTime > checkTime) {
      await showLoading.start(`更新${account.uid}Cookie`, `上次更新:${account.updated}`);
      await TGLogger.Info(`更新${account.uid}Cookie，上次更新:${account.updated}`);
      const update = await updateAccountCk(account);
      if (update) {
        showSnackbar.success(`成功更新${account.uid}的Cookie`);
        await new Promise<void>((resolve) => setTimeout(resolve, 1000));
        cnt++;
      }
    }
  }
  if (cnt > 0) showSnackbar.success(`成功更新${cnt}位账户的Cookie`);
}

/**
 * 更新用户Cookie
 * @since Beta v0.9.5
 * @param data - 用户信息
 * @returns 是否更新成功
 */
async function updateAccountCk(data: TGApp.App.Account.User): Promise<boolean> {
  const ck = data.cookie;
  await showLoading.update("正在获取 LToken");
  const ltokenRes = await passportReq.lToken.get(ck);
  if (typeof ltokenRes !== "string") {
    await showLoading.end();
    showSnackbar.error(`[${ltokenRes.retcode}]${ltokenRes.message}`);
    await TGLogger.Error(`获取LToken失败：${ltokenRes.retcode}-${ltokenRes.message}`);
    return false;
  }
  ck.ltoken = ltokenRes;
  await showLoading.update("正在获取 CookieToken");
  const cookieTokenRes = await passportReq.cookieToken(ck);
  if (typeof cookieTokenRes !== "string") {
    await showLoading.end();
    showSnackbar.error(`[${cookieTokenRes.retcode}]${cookieTokenRes.message}`);
    await TGLogger.Error(
      `获取CookieToken失败：${cookieTokenRes.retcode}-${cookieTokenRes.message}`,
    );
    return false;
  }
  ck.cookie_token = cookieTokenRes;
  await showLoading.update("正在获取用户信息");
  const briefRes = await bbsReq.userInfo(ck);
  if ("retcode" in briefRes) {
    await showLoading.end();
    showSnackbar.error(`[${briefRes.retcode}]${briefRes.message}`);
    await TGLogger.Error(`获取用户数据失败：${briefRes.retcode}-${briefRes.message}`);
    return false;
  }
  const briefInfo: TGApp.App.Account.BriefInfo = {
    nickname: briefRes.nickname,
    uid: briefRes.uid,
    avatar: briefRes.avatar_url,
    desc: briefRes.introduce,
  };
  const updated = timestampToDate(new Date().getTime());
  await showLoading.update("正在写入数据库");
  const db = await TGSqlite.getDB();
  try {
    await db.execute("PRAGMA busy_timeout = 5000;");
    await db.execute("BEGIN IMMEDIATE;");
    await db.execute(
      "UPDATE UserAccount SET cookie = $1, brief = $2, updated = $3 WHERE uid = $4;",
      [JSON.stringify(ck), JSON.stringify(briefInfo), updated, data.uid],
    );
    await db.execute("COMMIT;");
    return true;
  } catch (innerErr) {
    console.error(innerErr);
    await db.execute("ROLLBACK;");
    return false;
  }
}

/**
 * 备份用户数据
 * @since Beta v0.6.0
 * @param dir - 备份目录
 * @returns 无返回值
 */
async function backUpAccount(dir: string): Promise<void> {
  if (!(await exists(dir))) {
    await TGLogger.Warn("不存在指定的账户备份目录，即将创建");
    await mkdir(dir, { recursive: true });
  }
  const accounts = await getAllAccount();
  await writeTextFile(`${dir}${path.sep()}accounts.json`, JSON.stringify(accounts, null, 2));
  await TGLogger.Info("账户数据备份完成");
}

/**
 * 恢复用户数据
 * @since Beta v0.6.0
 * @param dir - 恢复目录
 * @returns 是否恢复成功
 */
async function restoreAccount(dir: string): Promise<boolean> {
  if (!(await exists(dir))) {
    await TGLogger.Warn("不存在指定的账户备份目录");
    return false;
  }
  try {
    const filePath = `${dir}${path.sep()}accounts.json`;
    if (!(await exists(filePath))) {
      await TGLogger.Warn("不存在指定的账户备份文件");
      return false;
    }
    const data = await readTextFile(filePath);
    const accounts: Array<TGApp.App.Account.User> = JSON.parse(data);
    for (const account of accounts) {
      await saveAccount(account);
    }
  } catch (e) {
    await TGLogger.Error(`[UserAccount][restoreAccount] ${e}`);
    return false;
  }
  return true;
}

/**
 * 复制cookie
 * @since Beta v0.6.0
 * @param cookie - cookie
 * @returns ck
 */
function copyCookie(cookie: TGApp.App.Account.Cookie): string {
  let res = "";
  if (cookie.ltuid && cookie.ltuid !== "") {
    res += `ltuid=${cookie.ltuid};`;
  }
  if (cookie.ltoken && cookie.ltoken !== "") {
    res += `ltoken=${cookie.ltoken};`;
  }
  if (cookie.mid && cookie.mid !== "") {
    res += `mid=${cookie.mid};`;
  }
  if (cookie.cookie_token && cookie.cookie_token !== "") {
    res += `cookie_token=${cookie.cookie_token};`;
  }
  if (cookie.stoken && cookie.stoken !== "") {
    res += `stoken=${cookie.stoken};`;
  }
  if (cookie.stuid && cookie.stuid !== "") {
    res += `stuid=${cookie.stuid};`;
  }
  if (cookie.account_id && cookie.account_id !== "") {
    res += `account_id=${cookie.account_id};`;
  }
  return res;
}

/**
 * 获取指定用户账号
 * @since Beta v0.9.0
 * @param uid - 用户UID
 * @returns 用户账号
 */
async function getGameAccount(uid: string): Promise<Array<TGApp.Sqlite.Account.Game>> {
  const db = await TGSqlite.getDB();
  return await db.select<Array<TGApp.Sqlite.Account.Game>>(
    "SELECT * FROM GameAccount WHERE uid = ? ORDER BY gameBiz, gameUid;",
    [uid],
  );
}

/**
 * 获取指定 GameUid 的 uid
 * @since Beta v0.9.6
 * @param gid - 游戏 UID
 * @param biz - 游戏 BIZ
 * @returns UID或false
 */
async function getGameAccountByGid(
  gid: string,
  biz: string = "hk4e_cn",
): Promise<TGApp.Sqlite.Account.Game | false> {
  const db = await TGSqlite.getDB();
  const res = await db.select<Array<TGApp.Sqlite.Account.Game>>(
    "SELECT * FROM GameAccount WHERE gameUid = $1 AND gameBiz = $2",
    [gid, biz],
  );
  if (res.length === 0) return false;
  return res[0];
}

/**
 * 切换到指定游戏账号
 * @since Beta v0.6.0
 * @param uid - 米社UID
 * @param gameUid - 游戏UID
 * @returns 无返回值
 */
async function switchGameAccount(uid: string, gameUid: string): Promise<void> {
  const db = await TGSqlite.getDB();
  await db.execute("UPDATE GameAccount SET isChosen = 0,updated=? WHERE uid = ?;", [
    timestampToDate(new Date().getTime()),
    uid,
  ]);
  await db.execute("UPDATE GameAccount SET isChosen=1,updated=? WHERE uid = ? AND gameUid = ?;", [
    timestampToDate(new Date().getTime()),
    uid,
    gameUid,
  ]);
}

/**
 * 获取最近的游戏账户
 * @since Beta v0.7.8
 * @param uid - 米社UID
 * @returns 游戏账户
 */
async function getCurGameAccount(uid: string): Promise<TGApp.Sqlite.Account.Game | false> {
  const gameAccounts = await getGameAccount(uid);
  if (gameAccounts.length === 0) return false;
  const giAccounts = gameAccounts.filter((account) => account.gameBiz === "hk4e_cn");
  if (giAccounts.length === 0) return false;
  const curGameAccount = giAccounts.find((account) => account.isChosen === 1);
  if (!curGameAccount) return giAccounts[0];
  return curGameAccount;
}

/**
 * 保存游戏账户数据
 * @since Beta v0.7.2
 * @param uid - 米社UID
 * @param accounts - 账户数据
 * @returns 无返回值
 */
async function saveGameAccount(
  uid: string,
  accounts: Array<TGApp.BBS.Game.Account>,
): Promise<void> {
  const db = await TGSqlite.getDB();
  await Promise.all(accounts.map((account) => db.execute(getInsertGameAccountSql(uid, account))));
}

/**
 * 删除指定游戏账户
 * @since Beta v0.7.2
 * @param account - 游戏账户
 * @returns 无返回值
 */
async function deleteGameAccount(account: TGApp.Sqlite.Account.Game): Promise<void> {
  const db = await TGSqlite.getDB();
  await db.execute("DELETE FROM GameAccount WHERE uid = ? AND gameUid = ? AND gameBiz = ?;", [
    account.uid,
    account.gameUid,
    account.gameBiz,
  ]);
}

/**
 * 删除游戏账户数据
 * @since Beta v0.6.0
 * @param uid - 米社UID
 * @returns 无返回值
 */
async function deleteAccount(uid: string): Promise<void> {
  const db = await TGSqlite.getDB();
  await db.execute("DELETE FROM GameAccount WHERE uid = ?;", [uid]);
  await db.execute("DELETE FROM UserAccount WHERE uid = ?;", [uid]);
}

const TSUserAccount = {
  account: {
    getAllUid: getAllAccountId,
    getAllAccount,
    getAccount: getUserAccount,
    saveAccount,
    updateCk: updateAllAccountCk,
    copy: copyCookie,
    deleteAccount,
    backup: backUpAccount,
    restore: restoreAccount,
  },
  game: {
    getAccount: getGameAccount,
    getAccountByGid: getGameAccountByGid,
    switchAccount: switchGameAccount,
    getCurAccount: getCurGameAccount,
    saveAccounts: saveGameAccount,
    deleteAccount: deleteGameAccount,
  },
};

export default TSUserAccount;
