/**
 * @file plugins Sqlite index.ts
 * @description Sqlite 数据库操作类
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.2.3
 */

// tauri
import Database from "tauri-plugin-sql-api";
// utils
import initDataSql from "./sql/initData";
import initTableSql from "./sql/initTable";
import { importUIAFData, importUIGFData } from "./sql/updateData";
import { getUiafStatus } from "../../utils/UIAF";
import {
  insertAbyssData,
  importAbyssData,
  insertAppData,
  insertGameAccountData,
  insertRecordData,
  insertRoleData,
} from "./sql/insertData";

class Sqlite {
  /**
   * @description 数据库地址
   * @since Alpha v0.2.0
   * @private
   */
  private readonly dbPath: string = "sqlite:tauri-genshin.db";
  /**
   * @description 数据库包含的表
   * @since Alpha v0.2.3
   * @private
   */
  private readonly tables: string[] = [
    "Achievements",
    "AchievementSeries",
    "AppCharacters",
    "AppData",
    "GameAccount",
    "NameCard",
    "SpiralAbyss",
    "UserCharacters",
    "UserRecord",
    "GachaRecords",
  ];

  /**
   * @description 初始化数据库
   * @since Alpha v0.2.0
   * @returns {Promise<void>}
   */
  public async initDB(): Promise<void> {
    const db = await Database.load(this.dbPath);
    const sql = [...initTableSql(), ...(await initDataSql())];
    for (const item of sql) {
      await db.execute(item);
    }
    await db.close();
  }

  /**
   * @description 获取数据库信息
   * @since Alpha v0.2.0
   * @returns {Promise<TGApp.Sqlite.AppData.Item[]>}
   */
  public async getAppData(): Promise<TGApp.Sqlite.AppData.Item[]> {
    const db = await Database.load(this.dbPath);
    const sql = "SELECT * FROM AppData;";
    const res: TGApp.Sqlite.AppData.Item[] = await db.select(sql);
    await db.close();
    return res;
  }

  /**
   * @description 获取 cookie
   * @since Alpha v0.2.0
   * @returns {Promise<Record<string, string>>}
   */
  public async getCookie(): Promise<Record<string, string>> {
    const db = await Database.load(this.dbPath);
    const sql = "SELECT value FROM AppData WHERE key='cookie';";
    const res: Array<{ value: string }> = await db.select(sql);
    await db.close();
    return JSON.parse(res[0].value);
  }

  /**
   * @description 插入 Account 数据
   * @since Alpha v0.2.0
   * @param {TGApp.User.Account.Game[]} accounts
   * @returns {Promise<void>}
   */
  public async saveAccount(accounts: TGApp.User.Account.Game[]): Promise<void> {
    const db = await Database.load(this.dbPath);
    for (const a of accounts) {
      const sql = insertGameAccountData(a);
      await db.execute(sql);
    }
    await db.close();
  }

  /**
   * @description 获取当前选择的游戏账号
   * @since Alpha v0.2.0
   * @returns {Promise<TGApp.Sqlite.Account.Game|false>}
   */
  public async getCurAccount(): Promise<TGApp.Sqlite.Account.Game | false> {
    const db = await Database.load(this.dbPath);
    const sql = "SELECT * FROM GameAccount WHERE isChosen=1;";
    const res: TGApp.Sqlite.Account.Game[] = await db.select(sql);
    await db.close();
    return res.length === 0 ? false : res[0];
  }

  /**
   * @description 保存 appData
   * @since Alpha v0.2.0
   * @param {string} key
   * @param {string} value
   * @returns {Promise<void>}
   */
  public async saveAppData(key: string, value: string): Promise<void> {
    const db = await Database.load(this.dbPath);
    const sql = insertAppData(key, value);
    await db.execute(sql);
    await db.close();
  }

  /**
   * @description 已有数据表跟触发器不变的情况下，更新数据库数据
   * @since Alpha v0.2.0
   * @returns {Promise<void>}
   */
  public async update(): Promise<void> {
    const db = await Database.load(this.dbPath);
    const sqlD = await initDataSql();
    for (const item of sqlD) {
      await db.execute(item);
    }
    await db.close();
  }

  /**
   * @description 检测数据库完整性
   * @since Alpha v0.2.0
   * @returns {Promise<boolean>}
   */
  public async check(): Promise<boolean> {
    const db = await Database.load(this.dbPath);
    let isVerified = false;
    // 检测数据表是否都存在
    const sqlT = "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;";
    const res: Array<{ name: string }> = await db.select(sqlT);
    await db.close();
    if (res.length === this.tables.length) {
      if (this.tables.every((item) => res.map((i) => i.name).includes(item))) {
        isVerified = true;
      }
    }
    return isVerified;
  }

  /**
   * @description 重置数据库
   * @since Alpha v0.2.0
   * @returns {Promise<void>}
   */
  public async reset(): Promise<void> {
    const db = await Database.load(this.dbPath);
    this.tables.map(async (item) => {
      const sql = `DROP TABLE IF EXISTS ${item};`;
      await db.execute(sql);
    });
    await db.close();
    await this.initDB();
  }

  /**
   * @description 获取成就系列列表
   * @since Alpha v0.2.0
   * @returns {Promise<TGApp.Sqlite.Achievement.SeriesTable[]>}
   */
  public async getAchievementSeries(): Promise<TGApp.Sqlite.Achievement.SeriesTable[]> {
    const db = await Database.load(this.dbPath);
    const sql = "SELECT * FROM AchievementSeries ORDER BY `order`;";
    const res: TGApp.Sqlite.Achievement.SeriesTable[] = await db.select(sql);
    await db.close();
    return res;
  }

  /**
   * @description 获取成就系列对应的名片
   * @since Alpha v0.2.0
   * @param {number} seriesId 系列 ID
   * @returns {Promise<TGApp.Sqlite.NameCard.Item>}
   */
  public async getNameCard(seriesId: number): Promise<TGApp.Sqlite.NameCard.SingleTable> {
    const db = await Database.load(this.dbPath);
    const sql = `SELECT *
                 FROM NameCard
                 WHERE name = (SELECT nameCard FROM AchievementSeries WHERE id = ${seriesId});`;
    const res: TGApp.Sqlite.NameCard.SingleTable[] = await db.select(sql);
    await db.close();
    return res[0];
  }

  /**
   * @description 获取成就列表
   * @since Alpha v0.2.0
   * @param {number} [seriesId] 系列 ID
   * @returns {Promise<TGApp.Sqlite.Achievement.SingleTable[]>}
   */
  public async getAchievements(seriesId?: number): Promise<TGApp.Sqlite.Achievement.SingleTable[]> {
    const db = await Database.load(this.dbPath);
    let sql;
    if (seriesId) {
      sql = `SELECT *
             FROM Achievements
             WHERE series = ${seriesId}
             ORDER BY isCompleted, \`order\`;`;
    } else {
      sql = "SELECT * FROM Achievements ORDER BY isCompleted, `order`;";
    }
    const res: TGApp.Sqlite.Achievement.SingleTable[] = await db.select(sql);
    await db.close();
    return res;
  }

  /**
   * @description 获取成就概况
   * @since Alpha v0.2.0
   * @returns {Promise<{total:number,fin:number}>}
   */
  public async getAchievementsOverview(): Promise<{
    total: number;
    fin: number;
  }> {
    const db = await Database.load(this.dbPath);
    const sql = "SELECT SUM(totalCount) AS total, SUM(finCount) AS fin FROM AchievementSeries;";
    const res: Array<{ total: number; fin: number }> = await db.select(sql);
    await db.close();
    return res[0];
  }

  /**
   * @description 获取最新成就版本
   * @since Alpha v0.2.2
   * @returns {Promise<string>}
   */
  public async getLatestAchievementVersion(): Promise<string> {
    const db = await Database.load(this.dbPath);
    const sql = "SELECT version FROM Achievements ORDER BY version DESC LIMIT 1;";
    const res: Array<{ version: string }> = await db.select(sql);
    await db.close();
    return res[0].version;
  }

  /**
   * @description 查询成就
   * @since Alpha v0.2.0
   * @param {string} keyword 关键词
   * @returns {Promise<TGApp.Sqlite.Achievement.SingleTable[]>}
   */
  public async searchAchievements(
    keyword: string,
  ): Promise<TGApp.Sqlite.Achievement.SingleTable[]> {
    const db = await Database.load(this.dbPath);
    let sql;
    if (keyword.startsWith("v")) {
      const version = keyword.replace("v", "");
      sql = `SELECT *
             FROM Achievements
             WHERE version LIKE '%${version}%'
             ORDER BY isCompleted, \`order\`;`;
    } else {
      sql = `SELECT *
             FROM Achievements
             WHERE name LIKE '%${keyword}%'
                OR description LIKE '%${keyword}%'
             ORDER BY isCompleted, \`order\`;`;
    }
    const res: TGApp.Sqlite.Achievement.SingleTable[] = await db.select(sql);
    await db.close();
    return res;
  }

  /**
   * @description 合并 UIAF 数据
   * @since Alpha v0.2.0
   * @param {TGApp.Plugins.UIAF.Achievement[]} achievements UIAF 数据
   * @returns {Promise<void>}
   */
  public async mergeUIAF(achievements: TGApp.Plugins.UIAF.Achievement[]): Promise<void> {
    const db = await Database.load(this.dbPath);
    const sql = importUIAFData(achievements);
    for (const item of sql) {
      await db.execute(item);
    }
    await db.close();
  }

  /**
   * @description 获取 UIAF 数据
   * @since Alpha v0.2.0
   * @returns {Promise<TGApp.Plugins.UIAF.Achievement[]>}
   */
  public async getUIAF(): Promise<TGApp.Plugins.UIAF.Achievement[]> {
    const db = await Database.load(this.dbPath);
    const sql = "SELECT * FROM Achievements WHERE isCompleted = 1 OR progress > 0";
    const res: TGApp.Sqlite.Achievement.SingleTable[] = await db.select(sql);
    await db.close();
    const achievements: TGApp.Plugins.UIAF.Achievement[] = [];
    for (const item of res) {
      const completed = item.isCompleted === 1;
      const status = getUiafStatus(completed, item.progress);
      achievements.push({
        id: item.id,
        status,
        timestamp:
          completed && item.completedTime ? new Date(item.completedTime).getTime() / 1000 : 0,
        current: item.progress,
      });
    }
    return achievements;
  }

  /**
   * @description 保存深渊数据
   * @since Alpha v0.2.0
   * @param {string} uid 游戏 UID
   * @param {TGApp.Game.Abyss.FullData} data 深渊数据
   * @returns {Promise<void>}
   */
  public async saveAbyss(uid: string, data: TGApp.Game.Abyss.FullData): Promise<void> {
    const db = await Database.load(this.dbPath);
    const sql = insertAbyssData(uid, data);
    await db.execute(sql);
    await db.close();
  }

  /**
   * @description 获取深渊数据
   * @since Alpha v0.2.0
   * @param {string} uid 游戏 UID
   * @returns {Promise<TGApp.Game.Abyss.FullData>}
   */
  public async getAbyss(uid?: string): Promise<TGApp.Sqlite.Abyss.SingleTable[]> {
    const db = await Database.load(this.dbPath);
    let sql;
    if (uid) {
      sql = `SELECT * FROM SpiralAbyss WHERE uid = '${uid}' order by id desc`;
    } else {
      sql = "SELECT * FROM SpiralAbyss order by uid, id desc";
    }
    const res: TGApp.Sqlite.Abyss.SingleTable[] = await db.select(sql);
    await db.close();
    return res;
  }

  /**
   * @description 恢复深渊数据
   * @since Alpha v0.2.0
   * @param {TGApp.Sqlite.Abyss.SingleTable[]} data 深渊数据
   * @returns {Promise<void>}
   */
  public async restoreAbyss(data: TGApp.Sqlite.Abyss.SingleTable[]): Promise<void> {
    const db = await Database.load(this.dbPath);
    for (const item of data) {
      const sql = importAbyssData(item);
      await db.execute(sql);
    }
    await db.close();
  }

  /**
   * @description 保存战绩数据
   * @since Alpha v0.2.0
   * @param {TGApp.Game.Record.FullData} data 战绩数据
   * @param {string} uid 用户 uid
   * @returns {Promise<void>}
   */
  public async saveUserRecord(data: TGApp.Game.Record.FullData, uid: string): Promise<void> {
    const db = await Database.load(this.dbPath);
    const sql = insertRecordData(data, uid);
    await db.execute(sql);
    await db.close();
  }

  /**
   * @description 获取战绩数据
   * @since Alpha v0.2.0
   * @param {string} uid 用户 uid
   * @returns {Promise<TGApp.Sqlite.Record.SingleTable|false>}
   */
  public async getUserRecord(uid: string): Promise<TGApp.Sqlite.Record.SingleTable | false> {
    const db = await Database.load(this.dbPath);
    const sql = `SELECT * FROM UserRecord WHERE uid = '${uid}'`;
    const res: TGApp.Sqlite.Record.SingleTable[] = await db.select(sql);
    await db.close();
    if (res.length === 0) return false;
    return res[0];
  }

  /**
   * @description 获取角色数据
   * @since Alpha v0.2.0
   * @param {number} id 角色 ID
   * @returns {Promise<TGApp.Sqlite.Character.AppData}> 角色数据
   */
  public async getAppCharacter(id: number): Promise<TGApp.Sqlite.Character.AppData> {
    const db = await Database.load(this.dbPath);
    const sql = `SELECT * FROM AppCharacters WHERE id = ${id}`;
    const res: TGApp.Sqlite.Character.AppData[] = await db.select(sql);
    await db.close();
    return res[0];
  }

  /**
   * @description 保存用户角色数据
   * @since Alpha v0.2.0
   * @param {string} uid 用户 uid
   * @param {TGApp.Game.Character.ListItem[]} data 角色数据
   * @returns {Promise<void>}
   */
  public async saveUserCharacter(
    uid: string,
    data: TGApp.Game.Character.ListItem[],
  ): Promise<void> {
    const db = await Database.load(this.dbPath);
    const sql = insertRoleData(uid, data);
    await db.execute(sql);
    await db.close();
  }

  /**
   * @description 保存用户角色天赋数据
   * @since Alpha v0.2.1
   * @param {string} uid 用户 uid
   * @param {number} cid 角色 ID
   * @param {TGApp.Sqlite.Character.RoleTalent[]} data 角色天赋数据
   * @returns {Promise<void>}
   */
  public async saveUserCharacterTalent(
    uid: string,
    cid: number,
    data: TGApp.Sqlite.Character.RoleTalent[],
  ): Promise<void> {
    const db = await Database.load(this.dbPath);
    const sql = `UPDATE UserCharacters 
    SET talent = '${JSON.stringify(data)}', updated = datetime('now', 'localtime')
    WHERE uid = '${uid}' AND cid = ${cid}`;
    await db.execute(sql);
    await db.close();
  }

  /**
   * @description 获取用户角色数据
   * @since Alpha v0.2.0
   * @param {string} uid 用户 uid
   * @returns {Promise<TGApp.Sqlite.Character.UserRole[]|false>}
   */
  public async getUserCharacter(uid: string): Promise<TGApp.Sqlite.Character.UserRole[] | false> {
    const db = await Database.load(this.dbPath);
    const sql = `SELECT * FROM UserCharacters WHERE uid = '${uid}'`;
    const res: TGApp.Sqlite.Character.UserRole[] = await db.select(sql);
    await db.close();
    if (res.length === 0) return false;
    return res;
  }

  /**
   * @description 获取指定 uid 的用户角色数据
   * @since Alpha v0.2。3
   * @param {string} uid 用户 uid
   * @returns {Promise<TGApp.Sqlite.GachaRecords.SingleTable[]>}
   */
  public async getGachaRecords(uid: string): Promise<TGApp.Sqlite.GachaRecords.SingleTable[]> {
    const db = await Database.load(this.dbPath);
    const sql = `SELECT * FROM GachaRecords WHERE uid = '${uid}'`;
    const res: TGApp.Sqlite.GachaRecords.SingleTable[] = await db.select(sql);
    await db.close();
    return res;
  }

  /**
   * @description 合并祈愿数据
   * @since Alpha v0.2.3
   * @param {string} uid UID
   * @param {TGApp.Plugins.UIGF.GachaItem[]} data UIGF 数据
   * @returns {Promise<void>}
   */
  public async mergeUIGF(uid: string, data: TGApp.Plugins.UIGF.GachaItem[]): Promise<void> {
    const db = await Database.load(this.dbPath);
    const sql = importUIGFData(uid, data);
    for (const item of sql) {
      await db.execute(item);
    }
    await db.close();
  }
}

const TGSqlite = new Sqlite();

export default TGSqlite;
