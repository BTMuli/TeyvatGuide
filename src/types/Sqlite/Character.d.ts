/**
 * @file types/Sqlite/Character.d.ts
 * @description 角色相关类型定义文件
 * @since Beta v0.5.3
 */

/**
 * @namespace TGApp.Sqlite.Character
 * @since Beta v0.5.3
 * @description 角色相关类型定义命名空间
 * @memberof TGApp.Sqlite
 */
declare namespace TGApp.Sqlite.Character {
  /**
   * @description 应用数据库中的角色类型
   * @since Alpha v0.2.0
   * @interface AppData
   * @property {number} id - 角色 ID
   * @property {string} name - 角色名称
   * @property {string} title - 角色称号
   * @property {string} birthday - 角色生日
   * @property {number} star - 角色星级
   * @property {string} element - 角色元素类型
   * @property {string} weapon - 角色武器类型
   * @property {string} nameCard - 角色名片
   * @property {string} updated - 数据更新时间
   * @return AppData
   */
  interface AppData {
    id: number;
    name: string;
    title: string;
    birthday: string;
    star: number;
    element: string;
    weapon: string;
    nameCard: string;
    updated: string;
  }

  /**
   * @description 用户角色列表的角色类型
   * @since Beta v0.5.3
   * @interface UserRole
   * @property {number} uid - 用户 ID
   * @property {number} cid - 角色 ID
   * @property {TGApp.Game.Avatar.Avatar} avatar - 角色信息
   * @property {TGApp.Game.Avatar.WeaponDetail} weapon - 角色武器信息
   * @property {TGApp.Game.Avatar.Relic[]} relics - 角色圣遗物信息
   * @property {TGApp.Game.Avatar.Constellation[]} constellations - 角色命之座信息
   * @property {TGApp.Game.Avatar.Costume[]} costumes - 角色衣装信息
   * @property {TGApp.Game.Avatar.Skill[]} skills - 角色技能信息
   * @property {TGApp.Game.Avatar.Prop[]} propSelected - 角色属性信息
   * @property {TGApp.Game.Avatar.Prop[]} propBase - 角色基础属性信息
   * @property {TGApp.Game.Avatar.Prop[]} propExtra - 角色额外属性信息
   * @property {TGApp.Game.Avatar.RelicRecommendProp} propRecommend - 角色推荐属性信息
   * @property {string} updated - 数据更新时间
   * @return UserRole
   */
  interface UserRole {
    uid: number;
    cid: number;
    avatar: TGApp.Game.Avatar.Avatar;
    weapon: TGApp.Game.Avatar.WeaponDetail;
    relics: TGApp.Game.Avatar.Relic[];
    constellations: TGApp.Game.Avatar.Constellation[];
    costumes: TGApp.Game.Avatar.Costume[];
    skills: TGApp.Game.Avatar.Skill[];
    propSelected: TGApp.Game.Avatar.Prop[];
    propBase: TGApp.Game.Avatar.Prop[];
    propExtra: TGApp.Game.Avatar.Prop[];
    propRecommend: TGApp.Game.Avatar.RelicRecommendProp;
    updated: string;
  }

  /**
   * @description 存于数据库的角色数据
   * @since Beta v0.5.3
   * @interface UserRoleDB
   * @property {number} uid - 用户 ID
   * @property {number} cid - 角色 ID
   * @property {string} avatar - 角色信息
   * @property {string} weapon - 角色武器信息
   * @property {string} relics - 角色圣遗物信息
   * @property {string} constellations - 角色命之座信息
   * @property {string} costumes - 角色衣装信息
   * @property {string} skills - 角色技能信息
   * @property {string} propSelected - 角色属性信息
   * @property {string} propBase - 角色基础属性信息
   * @property {string} propExtra - 角色额外属性信息
   * @property {string} propRecommend - 角色推荐属性信息
   * @property {string} updated - 数据更新时间
   * @return UserRoleDB
   */
  interface UserRoleDB {
    uid: number;
    cid: number;
    avatar: string;
    weapon: string;
    relics: string;
    constellations: string;
    costumes: string;
    skills: string;
    propSelected: string;
    propBase: string;
    propExtra: string;
    propRecommend: string;
    updated: string;
  }
}
