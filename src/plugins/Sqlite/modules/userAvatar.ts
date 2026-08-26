/**
 * 用户角色模块
 * @since Beta v0.11.5
 */

import fmtUtil from "@utils/fmtUtil.js";

import TGSqlite from "../index.js";

import { AppCharacterData } from "@/data/index.js";

const avatarNameCardMap = new Map<number, string>(
  AppCharacterData.map((character) => [character.id, character.nameCard]),
);

/**
 * 将角色详情转换为本地角色数据
 * @since Beta v0.11.5
 * @param uid - 用户 UID
 * @param data - 角色详情
 * @param tps - 用户TPS数据
 * @param updated - 更新时间
 * @returns 本地角色数据
 */
function transAvatar(
  uid: number,
  data: TGApp.Game.Avatar.AvatarDetail,
  tps: TGApp.Game.Avatar.TpsRes | null,
  updated: string,
): TGApp.Sqlite.Character.TableTrans {
  const tAvatar: TGApp.Sqlite.Character.TableAvatar = {
    ...data.base,
    tps: data.unlock_tps ? tps : null,
  };
  const tWeapon: TGApp.Sqlite.Character.TableWeapon = { ...data.weapon, skin: data.weapon_skin };
  return {
    uid,
    cid: data.base.id,
    avatar: tAvatar,
    weapon: tWeapon,
    relics: data.relics,
    constellations: data.constellations,
    costumes: data.costumes,
    skills: data.skills,
    propSelected: data.selected_properties,
    propBase: <string>(<unknown>data.base_properties),
    propExtra: data.extra_properties,
    propRecommend: data.recommend_relic_property,
    updated,
  };
}

/**
 * 解析数据库角色行
 * @since Beta v0.11.5
 * @param data - 数据库原始行
 * @returns 本地角色数据
 */
function parseAvatar(data: TGApp.Sqlite.Character.TableRaw): TGApp.Sqlite.Character.TableTrans {
  return {
    uid: data.uid,
    cid: data.cid,
    avatar: JSON.parse(data.avatar),
    weapon: JSON.parse(data.weapon),
    relics: JSON.parse(data.relics),
    constellations: JSON.parse(data.constellations),
    costumes: JSON.parse(data.costumes),
    skills: JSON.parse(data.skills),
    propSelected: JSON.parse(data.propSelected),
    propBase: JSON.parse(data.propBase),
    propExtra: JSON.parse(data.propExtra),
    propRecommend: JSON.parse(data.propRecommend),
    updated: data.updated,
  };
}

/**
 * 获取角色插入语句
 * @since Beta v0.11.5
 * @param uid - 用户UID
 * @param data - 角色数据
 * @param tps - 用户TPS
 * @param updated - 更新时间
 * @returns sql
 */
function getInsertSql(
  uid: string,
  data: TGApp.Game.Avatar.AvatarDetail,
  tps: TGApp.Game.Avatar.TpsRes | null,
  updated: string,
): TGApp.App.Sqlite.SqlStatement {
  const tAvatar: TGApp.Sqlite.Character.TableAvatar = {
    ...data.base,
    tps: data.unlock_tps ? tps : null,
  };
  const tWeapon: TGApp.Sqlite.Character.TableWeapon = { ...data.weapon, skin: data.weapon_skin };
  return {
    query: `INSERT INTO UserCharacters (uid, cid, avatar, weapon, relics, constellations, costumes, skills,
                                        propSelected, propBase, propExtra, propRecommend, updated)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            ON CONFLICT(uid, cid) DO UPDATE SET avatar         = $3,
                                                weapon         = $4,
                                                relics         = $5,
                                                constellations = $6,
                                                costumes       = $7,
                                                skills         = $8,
                                                propSelected   = $9,
                                                propBase       = $10,
                                                propExtra      = $11,
                                                propRecommend  = $12,
                                                updated        = $13;`,
    values: [
      Number(uid),
      data.base.id,
      JSON.stringify(tAvatar),
      JSON.stringify(tWeapon),
      JSON.stringify(data.relics),
      JSON.stringify(data.constellations),
      JSON.stringify(data.costumes),
      JSON.stringify(data.skills),
      JSON.stringify(data.selected_properties),
      JSON.stringify(data.base_properties),
      JSON.stringify(data.extra_properties),
      JSON.stringify(data.recommend_relic_property),
      updated,
    ],
  };
}

/**
 * 获取用户UID列表
 * @since Beta v0.6.0
 * @returns 角色id列表
 */
async function getAllUid(): Promise<Array<string>> {
  const db = await TGSqlite.getDB();
  type resType = Array<{ uid: number }>;
  const res = await db.select<resType>("SELECT DISTINCT uid FROM UserCharacters;");
  return res.map((i) => i.uid.toString());
}

/**
 * 获取用户角色数据
 * @since Beta v0.11.5
 * @param uid - 用户 uid
 * @returns 用户角色数据
 */
async function getAvatars(uid: number): Promise<Array<TGApp.Sqlite.Character.TableTrans>> {
  const db = await TGSqlite.getDB();
  type resType = Array<TGApp.Sqlite.Character.TableRaw>;
  const res = await db.select<resType>("SELECT * FROM UserCharacters WHERE uid = $1;", [uid]);
  return res.map(parseAvatar);
}

/**
 * 保存用户角色数据
 * @since Beta v0.11.5
 * @param uid - 用户 uid
 * @param data - 角色数据
 * @param tps - 用户TPS数据
 * @returns 保存后的本地角色数据
 */
async function saveAvatars(
  uid: string,
  data: Array<TGApp.Game.Avatar.AvatarDetail>,
  tps: TGApp.Game.Avatar.TpsRes | null,
): Promise<Array<TGApp.Sqlite.Character.TableTrans>> {
  const updated = fmtUtil.dateTime(new Date().getTime());
  const uidNum = Number(uid);
  if (data.length > 0) {
    await TGSqlite.executeTransaction(data.map((role) => getInsertSql(uid, role, tps, updated)));
  }
  return data.map((role) => transAvatar(uidNum, role, tps, updated));
}

/**
 * 获取角色名片
 * @since Beta v0.11.5
 * @param id - 角色 id
 * @returns 名片
 */
function getAvatarCard(id: number): string {
  const nameCard = avatarNameCardMap.get(id);
  if (nameCard === undefined || nameCard === "") return "原神·印象";
  return nameCard;
}

/**
 * 删除指定UID的数据
 * @since Beta v0.11.5
 * @param uid - 游戏UID
 * @returns 无返回值
 */
async function deleteUid(uid: string): Promise<void> {
  const db = await TGSqlite.getDB();
  await db.execute("DELETE FROM UserCharacters WHERE uid = $1;", [uid]);
}

const TSUserAvatar = {
  getAllUid,
  getAvatars,
  saveAvatars,
  getAvatarCard,
  deleteUid,
};

export default TSUserAvatar;
