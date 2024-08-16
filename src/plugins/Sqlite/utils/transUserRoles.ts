/**
 * @file plugins/Sqlite/utils/transUserRoles.ts
 * @description 转换用户角色数据格式，用于数据库存储
 * @since Beta v0.5.3
 */

/**
 * @description 将通过 api 获取到的用户角色数据转换为数据库中的数据
 * @since Beta v0.5.3
 * @param {TGApp.Game.Character.ListItem} data 用户角色数据
 * @returns {TGApp.Sqlite.Character.UserRole} 转换后的用户角色数据
 */
export function transUserRoles(
  data: TGApp.Game.Avatar.DetailList,
): TGApp.Sqlite.Character.UserRoleDB {
  return {
    uid: -1,
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
    updated: "",
  };
}
