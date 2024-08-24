/**
 * @file plugins/Sqlite/modules/userAvatar.ts
 * @description 用户角色模块
 * @since Beta v0.5.3
 */

import TGSqlite from "../index.js";
import { insertRoleData } from "../sql/insertData.js";

/**
 * @description 获取用户角色id列表
 * @since Beta v0.5.3
 * @returns {Promise<string[]>} 角色id列表
 */
async function getAllAvatarId(): Promise<string[]> {
  const db = await TGSqlite.getDB();
  type resType = Array<{ cid: string }>;
  const res = await db.select<resType>("SELECT DISTINCT cid FROM UserCharacters;");
  return res.map((i) => i.cid);
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
 * @since Beta v0.5.3
 * @param {string} uid 用户 uid
 * @param {TGApp.Game.Avatar.DetailList[]} data 角色数据
 * @returns {Promise<void>}
 */
async function saveAvatars(uid: string, data: TGApp.Game.Avatar.DetailList[]): Promise<void> {
  const db = await TGSqlite.getDB();
  const sql = insertRoleData(uid, data);
  await db.execute(sql);
}

/**
 * @description 获取角色名片
 * @since Beta v0.5.3
 * @param {number} id 角色 id
 * @returns {Promise<string|false>}
 */
async function getAvatarCard(id: number): Promise<string | false> {
  const db = await TGSqlite.getDB();
  type resType = Array<{ card: string }>;
  const res = await db.select<resType>("SELECT nameCard as card FROM AppCharacters WHERE id = ?;", [
    id,
  ]);
  if (res.length === 0) return false;
  return res[0].card;
}

const TSUserAvatar = {
  getAllAvatarId,
  getAvatars,
  saveAvatars,
  getAvatarCard,
};

export default TSUserAvatar;
