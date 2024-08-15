/**
 * @file plugins/Sqlite/modules/userAvatar.ts
 * @description 用户角色模块
 * @since Beta v0.5.3
 */

import TGSqlite from "../index.js";

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

const TSUserAvatar = {
  getAllAvatarId,
};

export default TSUserAvatar;
