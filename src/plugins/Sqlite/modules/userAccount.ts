/**
 * 用户账户模块
 * @since Beta v0.9.0
 */

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
 * 获取插入账号数据的 sql
 * @since Beta v0.6.1
 * @param user - 账号
 * @returns 插入Sql
 */
function getInsertAccountSql(user: TGApp.App.Account.User): string {
  const table = transUser(user);
  return `
      INSERT INTO UserAccount(uid, cookie, brief, updated)
      VALUES ('${table.uid}', '${table.cookie}', '${table.brief}', '${table.updated}')
      ON CONFLICT(uid) DO UPDATE
          SET cookie  = '${table.cookie}',
              brief   = '${table.brief}',
              updated = '${table.updated}';
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
 * @since Beta v0.6.1
 * @param data - 用户cookie
 * @returns 无返回值
 */
async function saveAccount(data: TGApp.App.Account.User): Promise<void> {
  const db = await TGSqlite.getDB();
  const sql = getInsertAccountSql(data);
  await db.execute(sql);
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
    copy: copyCookie,
    deleteAccount,
    backup: backUpAccount,
    restore: restoreAccount,
  },
  game: {
    getAccount: getGameAccount,
    switchAccount: switchGameAccount,
    getCurAccount: getCurGameAccount,
    saveAccounts: saveGameAccount,
    deleteAccount: deleteGameAccount,
  },
};

export default TSUserAccount;
