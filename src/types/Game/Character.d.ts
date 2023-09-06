/**
 * @file types Game Character.d.ts
 * @description 游戏角色相关类型定义文件
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.2.0
 */

declare namespace TGApp.Game.Character {
  /**
   * @description 角色列表数据返回类型
   * @interface ListResponse
   * @since Alpha v0.2.0
   * @extends TGApp.BBS.Response.Base
   * @property {ListItem[]} data.avatars - 角色列表
   * @property {ListRole} data.role - 角色信息
   * @return ListResponse
   */
  export interface ListResponse extends TGApp.BBS.Response.Base {
    data: {
      avatars: ListItem[];
      role: ListRole;
    };
  }

  /**
   * @description 角色列表数据类型
   * @interface ListItem
   * @since Alpha v0.2.0
   * @property {number} id - 角色 ID
   * @property {string} image - 角色全身像
   * @property {string} icon - 角色头像
   * @property {string} name - 角色名称
   * @property {TGApp.Game.Constant.EnumElementEn} element - 角色元素
   * @property {number} fetter - 角色好感等级
   * @property {number} level - 角色等级
   * @property {number} rarity - 角色稀有度
   * @property {LIWeapon} weapon - 角色武器
   * @property {LIRelic[]} reliquaries - 角色圣遗物
   * @property {LIConstellation[]} constellations - 角色命座
   * @property {number} actived_constellation_num - 角色已激活命座数量
   * @property {LICostume[]} costumes - 角色时装
   * @property {number} constellation_level - 角色命座等级
   * @property {unknown} external
   * @return ListItem
   */
  export interface ListItem {
    id: number;
    image: string;
    icon: string;
    name: string;
    element: TGApp.Game.Constant.EnumElementEn;
    fetter: number;
    level: number;
    rarity: number;
    weapon: LIWeapon;
    reliquaries: LIRelic[];
    constellations: LIConstellation[];
    actived_constellation_num: number;
    costumes: LICostume[];
    constellation_level: number;
    external: unknown;
  }

  /**
   * @description 角色信息
   * @interface ListRole
   * @since Alpha v0.2.0
   * @property {string} AvatarUrl - 角色头像 // 大部分情况下是空的
   * @property {string} nickname - 角色昵称
   * @property {string} region - 角色所在地区
   * @property {number} level - 角色等级
   * @return ListRole
   */
  export interface ListRole {
    AvatarUrl: string;
    nickname: string;
    region: string;
    level: number;
  }

  /**
   * @description 角色武器数据类型
   * @interface LIWeapon
   * @since Alpha v0.2.0
   * @property {number} id - 武器 ID
   * @property {string} name - 武器名称
   * @property {string} icon - 武器图标
   * @property {number} type - 武器类型
   * @property {number} rarity - 武器稀有度
   * @property {number} level - 武器等级
   * @property {number} promote_level - 武器等级对应的突破等级
   * @property {string} type_name - 武器类型名称
   * @property {string} desc - 武器描述
   * @property {number} affix_level - 武器精炼等级
   * @return LIWeapon
   */
  export interface LIWeapon {
    id: number;
    name: string;
    icon: string;
    type: number;
    rarity: number;
    level: number;
    promote_level: number;
    type_name: string;
    desc: string;
    affix_level: number;
  }

  /**
   * @description 角色圣遗物数据类型
   * @interface LIRelic
   * @since Alpha v0.2.0
   * @property {number} id - 圣遗物 ID
   * @property {string} name - 圣遗物名称
   * @property {string} icon - 圣遗物图标
   * @property {number} pos - 圣遗物位置
   * @property {number} rarity - 圣遗物稀有度
   * @property {number} level - 圣遗物等级
   * @property {RelicSet} set - 圣遗物套装
   * @property {TGApp.Game.Constant.EnumRelic} pos_name - 圣遗物位置名称
   * @return LIRelic
   */
  export interface LIRelic {
    id: number;
    name: string;
    icon: string;
    pos: number;
    rarity: number;
    level: number;
    set: RelicSet;
    pos_name: TGApp.Game.Constant.EnumRelic;
  }

  /**
   * @description 圣遗物套装数据类型
   * @interface RelicSet
   * @since Alpha v0.2.0
   * @property {number} id - 圣遗物套装 ID
   * @property {string} name - 圣遗物套装名称
   * @property {number} affixes[].activation_number - 圣遗物套装激活数量
   * @property {string} affixes[].effect - 圣遗物套装效果
   * @return RelicSet
   */
  export interface RelicSet {
    id: number;
    name: string;
    affixes: Array<{
      activation_number: number;
      effect: string;
    }>;
  }

  /**
   * @description 角色命座数据类型
   * @interface LIConstellation
   * @since Alpha v0.2.0
   * @property {number} id - 命座 ID
   * @property {string} name - 命座名称
   * @property {string} icon - 命座图标
   * @property {string} effect - 命座效果
   * @property {boolean} is_actived - 命座是否激活
   * @property {number} pos - 命座位置
   * @return LIConstellation
   */
  export interface LIConstellation {
    id: number;
    name: string;
    icon: string;
    effect: string;
    is_actived: boolean;
    pos: number;
  }

  /**
   * @description 角色时装数据类型
   * @interface LICostume
   * @since Alpha v0.2.0
   * @property {number} id - 时装 ID
   * @property {string} name - 时装名称
   * @property {string} icon - 时装图标
   * @return LICostume
   */
  export interface LICostume {
    id: number;
    name: string;
    icon: string;
  }
}
