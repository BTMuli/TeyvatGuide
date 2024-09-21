/**
 * @file plugins/Sqlite/sql/insertData.ts
 * @description Sqlite 插入数据 sql 语句
 * @since Beta v0.6.0
 */

import { transUserRecord } from "../utils/transUserRecord.js";
import { transUserRoles } from "../utils/transUserRoles.js";

/**
 * @description 插入应用数据
 * @since Alpha v0.2.0
 * @param {string} key 键
 * @param {string} value 值
 * @returns {string} sql
 */
export function insertAppData(key: string, value: string): string {
  return `
      INSERT INTO AppData (key, value, updated)
      VALUES ('${key}', '${value}', datetime('now', 'localtime'))
      ON CONFLICT(key) DO UPDATE SET value   = '${value}',
                                     updated = datetime('now', 'localtime');
  `;
}

/**
 * @description 插入游戏账号数据
 * @since Alpha v0.2.0
 * @param {TGApp.User.Account.Game} data 游戏账号数据
 * @returns {string} sql
 */
export function insertGameAccountData(data: TGApp.User.Account.Game): string {
  const isChosen = data.is_chosen ? 1 : 0;
  const isOfficial = data.is_official ? 1 : 0;
  return `
      INSERT INTO GameAccount (gameBiz, gameUid, isChosen, isOfficial, level, nickname, region, regionName, updated)
      VALUES ('${data.game_biz}', '${data.game_uid}', ${isChosen}, ${isOfficial}, ${data.level}, '${data.nickname}',
              '${data.region}', '${data.region_name}', datetime('now', 'localtime'))
      ON CONFLICT(gameBiz, gameUid) DO UPDATE
          SET isChosen   = ${isChosen},
              isOfficial = ${isOfficial},
              level      = ${data.level},
              nickname   = '${data.nickname}',
              region     = '${data.region}',
              regionName = '${data.region_name}',
              updated    = datetime('now', 'localtime');
  `;
}

/**
 * @description 插入名片数据
 * @since Alpha v0.2.0
 * @param {TGApp.App.NameCard.Item} data 名片数据
 * @returns {string} sql
 */
export function insertNameCardData(data: TGApp.App.NameCard.Item): string {
  return `
      INSERT INTO NameCard (name, "desc", type, source, updated)
      VALUES ('${data.name}', '${data.desc}', '${data.type}', '${data.source}', datetime('now', 'localtime'))
      ON CONFLICT(name, type) DO UPDATE
          SET "desc"  = '${data.desc}',
              source  = '${data.source}',
              updated = datetime('now', 'localtime');
  `;
}

/**
 * @description 插入角色数据
 * @since Beta v0.3.3
 * @param {TGApp.User.Character.Item} data 角色数据
 * @returns {string} sql
 */
export function insertCharacterData(data: TGApp.App.Character.WikiBriefInfo): string {
  return `
      INSERT INTO AppCharacters (id, name, title, birthday, star, element, weapon, nameCard, updated)
      VALUES (${data.id}, '${data.name}', '${data.title}', '${data.birthday.toString()}',
              ${data.star}, '${data.element}', '${data.weapon}', '${data.nameCard}',
              datetime('now', 'localtime'))
      ON CONFLICT(id) DO UPDATE
          SET name     = '${data.name}',
              title    = '${data.title}',
              star     = ${data.star},
              element  = '${data.element}',
              weapon   = '${data.weapon}',
              nameCard = '${data.nameCard}',
              birthday = '${data.birthday.toString()}';
  `;
}

/**
 * @description 插入原神战绩数据
 * @since Alpha v0.2.0
 * @param {TGApp.Game.Record.FullData} data 原神战绩数据
 * @param {string} uid 用户 UID
 * @returns {string} sql
 */
export function insertRecordData(data: TGApp.Game.Record.FullData, uid: string): string {
  const transData = transUserRecord(data);
  transData.uid = uid;
  return `
      INSERT INTO UserRecord(uid, role, avatars, stats, worldExplore, homes, updated)
      VALUES ('${transData.uid}', '${transData.role}', '${transData.avatars}', '${transData.stats}',
              '${transData.worldExplore}', '${transData.homes}', datetime('now', 'localtime'))
      ON CONFLICT(uid) DO UPDATE
          SET role         = '${transData.role}',
              avatars      = '${transData.avatars}',
              stats        = '${transData.stats}',
              worldExplore = '${transData.worldExplore}',
              homes        = '${transData.homes}',
              updated      = datetime('now', 'localtime');
  `;
}

/**
 * @description 插入用户角色数据
 * @since Beta v0.5.3
 * @param {string} uid 用户 UID
 * @param {TGApp.Game.Avatar.DetailList[]} data 角色数据
 * @returns {string} sql
 */
export function insertRoleData(uid: string, data: TGApp.Game.Avatar.DetailList[]): string {
  const sql = data.map((item) => {
    const role = transUserRoles(item);
    return `
        INSERT INTO UserCharacters (uid, cid, avatar, weapon, relics, constellations, costumes, skills,
                                    propSelected, propBase, propExtra, propRecommend, updated)
        VALUES (${uid}, ${role.cid}, '${role.avatar}', '${role.weapon}', '${role.relics}', '${role.constellations}',
                '${role.costumes}', '${role.skills}', '${role.propSelected}', '${role.propBase}', '${role.propExtra}',
                '${role.propRecommend}', datetime('now', 'localtime'))
        ON CONFLICT(uid, cid) DO UPDATE
            SET avatar         = '${role.avatar}',
                weapon         = '${role.weapon}',
                relics         = '${role.relics}',
                constellations = '${role.constellations}',
                costumes       = '${role.costumes}',
                skills         = '${role.skills}',
                propSelected   = '${role.propSelected}',
                propBase       = '${role.propBase}',
                propExtra      = '${role.propExtra}',
                propRecommend  = '${role.propRecommend}',
                updated        = datetime('now', 'localtime');
    `;
  });
  return sql.join("");
}
