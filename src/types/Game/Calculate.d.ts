/**
 * @file types Game Calculate.d.ts
 * @description 养成计算器相关类型定义文件
 * @author BTMuli <bt-muli@outlook.com>
 * @since Alpha v0.2.1
 */

declare namespace TGApp.Game.Calculate {
  /**
   * @description 获取同步角色列表返回
   * @since Alpha v0.2.1
   * @see TGRequest.User.calculate.getSyncAvatarListAll
   * @interface SyncAvatarListResponse
   * @extends TGApp.BBS.Response.Base
   * @property {Array<AvatarListItem>} data.list - 角色列表
   * @return SyncAvatarListResponse
   */
  export interface SyncAvatarListResponse extends TGApp.BBS.Response.Base {
    data: {
      list: AvatarListItem[];
    };
  }

  /**
   * @description 获取同步角色列表返回的角色数据
   * @since Alpha v0.2.1
   * @interface AvatarListItem
   * @property {number} id - 角色 ID
   * @property {string} name - 角色名称
   * @property {string} icon - 角色头像
   * @property {number} weapon_cat_id - 角色武器类型
   * @property {number} avatar_level - 角色等级
   * @property {number} element_attr_id - 角色元素类型
   * @property {number} max_level - 角色最大等级
   * @property {number} level_current - 角色当前等级
   * @return AvatarListItem
   */
  export interface AvatarListItem {
    id: number;
    name: string;
    icon: string;
    weapon_cat_id: number;
    avatar_level: number;
    element_attr_id: number;
    max_level: number;
    level_current: number;
  }

  /**
   * @description 获取同步角色详情返回
   * @since Alpha v0.2.1
   * @see TGRequest.User.calculate.getSyncAvatarDetail
   * @interface SyncAvatarDetailResponse
   * @extends TGApp.BBS.Response.Base
   * @property {AvatarDetail} data - 角色详情
   * @return SyncAvatarDetailResponse
   */
  export interface SyncAvatarDetailResponse extends TGApp.BBS.Response.Base {
    data: TGApp.Game.Calculate.AvatarDetail;
  }

  /**
   * @description 获取同步角色详情返回的角色详情数据
   * @since Alpha v0.2.1
   * @interface AvatarDetail
   * @property {AvatarDetailSkill[]} skill_list - 角色技能列表
   * @property {AvatarDetailWeapon} weapon - 角色武器
   * @property {AvatarDetailRelic[]} reliquary_list - 角色圣遗物列表
   * @return AvatarDetail
   */
  export interface AvatarDetail {
    skill_list: AvatarDetailSkill[];
    weapon: AvatarDetailWeapon;
    reliquary_list: AvatarDetailRelic[];
  }

  /**
   * @description 获取同步角色详情返回的角色技能数据
   * @since Alpha v0.2.1
   * @interface AvatarDetailSkill
   * @property {number} id - 技能 ID
   * @property {number} group_id - 技能组 ID
   * @property {string} name - 技能名称
   * @property {string} icon - 技能图标
   * @property {number} max_level - 技能最大等级
   * @property {number} level_current - 技能当前等级
   * @return AvatarDetailSkill
   */
  export interface AvatarDetailSkill {
    id: number;
    group_id: number;
    name: string;
    icon: string;
    max_level: number;
    level_current: number;
  }

  /**
   * @description 获取同步角色详情返回的角色武器数据
   * @since Alpha v0.2.1
   * @interface AvatarDetailWeapon
   * @property {number} id - 武器 ID
   * @property {string} name - 武器名称
   * @property {string} icon - 武器图标
   * @property {number} weapon_cat_id - 武器类型
   * @property {number} weapon_level - 武器等级
   * @property {number} max_level - 武器最大等级
   * @property {number} level_current - 武器当前等级
   * @return AvatarDetailWeapon
   */
  export interface AvatarDetailWeapon {
    id: number;
    name: string;
    icon: string;
    weapon_cat_id: number;
    weapon_level: number;
    max_level: number;
    level_current: number;
  }

  /**
   * @description 获取同步角色详情返回的角色圣遗物数据
   * @since Alpha v0.2.1
   * @interface AvatarDetailRelic
   * @property {number} id - 圣遗物 ID
   * @property {string} name - 圣遗物名称
   * @property {string} icon - 圣遗物图标
   * @property {number} reliquary_cat_id - 圣遗物类型
   * @property {number} reliquary_level - 圣遗物等级
   * @property {number} level_current - 圣遗物当前等级
   * @property {number} max_level - 圣遗物最大等级
   * @return AvatarDetailRelic
   */
  export interface AvatarDetailRelic {
    id: number;
    name: string;
    icon: string;
    reliquary_cat_id: number;
    reliquary_level: number;
    level_current: number;
    max_level: number;
  }
}
