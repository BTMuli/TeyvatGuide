/**
 * @file plugins/Sqlite/modules/userAvatar.ts
 * @description 用户角色模块
 * @since Beta v0.6.0
 */

import { AppCharacterData } from "../../../data/index.js";
import { timestampToDate } from "../../../utils/toolFunc.js";
import TGSqlite from "../index.js";

/**
 * @description 获取角色插入Sql
 * @since Beta v0.6.0
 * @param {string} uid - 用户UID
 * @param {TGApp.Game.Avatar.DetailList} data - 角色数据
 * @return {string}
 */
function getInsertSql(uid: string, data: TGApp.Game.Avatar.DetailList): string {
  const role: TGApp.Sqlite.Character.UserRoleDB = {
    uid: Number(uid),
    cid: data.base.id,
    avatar: JSON.stringify(data.base),
    weapon: JSON.stringify(data.weapon),
    relics: JSON.stringify(data.relics),
    constellations: JSON.stringify(data.constellations),
    costumes: JSON.stringify(data.costumes),
    skills: JSON.stringify(data.skills),
    propSelected: JSON.stringify(data.selected_properties),
    propBase: JSON.stringify(data.base_properties),
    propExtra: JSON.stringify(data.extra_properties),
    propRecommend: JSON.stringify(data.recommend_relic_property),
    updated: timestampToDate(new Date().getTime()),
  };
  return `
      INSERT INTO UserCharacters (uid, cid, avatar, weapon, relics, constellations, costumes, skills,
                                  propSelected, propBase, propExtra, propRecommend, updated)
      VALUES (${uid}, ${role.cid}, '${role.avatar}', '${role.weapon}', '${role.relics}', '${role.constellations}',
              '${role.costumes}', '${role.skills}', '${role.propSelected}', '${role.propBase}', '${role.propExtra}',
              '${role.propRecommend}', '${role.updated}')
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
              updated        = '${role.updated}';
  `;
}

/**
 * @description 获取用户UID列表
 * @since Beta v0.6.0
 * @returns {Promise<string[]>} 角色id列表
 */
async function getAllUid(): Promise<string[]> {
  const db = await TGSqlite.getDB();
  type resType = Array<{ uid: string }>;
  const res = await db.select<resType>("SELECT DISTINCT uid FROM UserCharacters;");
  return res.map((i) => i.uid);
}

/**
 * @description 获取用户角色数据
 * @since Beta v0.5.3
 * @param {string} uid 用户 uid
 * @returns {Promise<TGApp.Sqlite.Character.UserRole[]>}
 */
async function getAvatars(uid: string): Promise<TGApp.Sqlite.Character.UserRole[]> {
  const db = await TGSqlite.getDB();
  type resType = Array<TGApp.Sqlite.Character.UserRoleDB>;
  const res = await db.select<resType>("SELECT * FROM UserCharacters WHERE uid = ?;", [uid]);
  return res.map((i) => {
    return {
      uid: i.uid,
      cid: i.cid,
      avatar: JSON.parse(i.avatar),
      weapon: JSON.parse(i.weapon),
      relics: JSON.parse(i.relics),
      constellations: JSON.parse(i.constellations),
      costumes: JSON.parse(i.costumes),
      skills: JSON.parse(i.skills),
      propSelected: JSON.parse(i.propSelected),
      propBase: JSON.parse(i.propBase),
      propExtra: JSON.parse(i.propExtra),
      propRecommend: JSON.parse(i.propRecommend),
      updated: i.updated,
    };
  });
}

/**
 * @description 保存用户角色数据
 * @since Beta v0.6.0
 * @param {string} uid 用户 uid
 * @param {TGApp.Game.Avatar.DetailList[]} data 角色数据
 * @returns {Promise<void>}
 */
async function saveAvatars(uid: string, data: TGApp.Game.Avatar.DetailList[]): Promise<void> {
  const db = await TGSqlite.getDB();
  for (const role of data) {
    await db.execute(getInsertSql(uid, role));
  }
}

/**
 * @description 获取角色名片
 * @since Beta v0.6.0
 * @param {number} id 角色 id
 * @returns {string|false}
 */
function getAvatarCard(id: number): string {
  const find = AppCharacterData.find((c) => c.id === id);
  if (find === undefined || find.nameCard === "") return "原神·印象";
  return find.nameCard;
}

/**
 * @description 删除指定UID的数据
 * @since Beta v0.6.0
 * @param {string} uid - 游戏UID
 * @return {Promise<void>}
 */
async function deleteUid(uid: string): Promise<void> {
  const db = await TGSqlite.getDB();
  await db.execute("DELETE FROM UserCharacters WHERE uid = ?;", [uid]);
}

const TSUserAvatar = {
  getAllUid,
  getAvatars,
  saveAvatars,
  getAvatarCard,
  deleteUid,
};

export default TSUserAvatar;
