/**
 * @file types Sqlite Character.d.ts
 * @description 角色相关类型定义文件
 * @author BTMuli <bt-muli@outlook.com>
 * @since Alpha v0.2.0
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
  export interface AppData {
    id: number
    name: string
    title: string
    birthday: string
    star: number
    element: string
    weapon: string
    nameCard: string
    updated: string
  }

  /**
   * @description 用户角色列表的角色类型
   * @since Alpha v0.2.0
   * @interface UserRole
   * @property {number} uid- 用户 ID
   * @property {number} cid - 角色 ID
   * @property {string} img - 全身像
   * @property {string} name - 角色名称
   * @property {number} fetter - 角色好感
   * @property {number} level - 角色等级
   * @property {string} element - 角色元素类型
   * @property {number} star - 角色星级
   * @property {RoleWeapon} weapon - 角色武器类型 // 数据库中以字符串形式存储
   * @property {RoleReliquary[]} reliquary - 角色圣遗物套装 // 数据库中以字符串形式存储
   * @property {RoleConstellation[]} constellation - 角色命座 // 数据库中以字符串形式存储
   * @property {number} activeConstellation - 角色激活命座
   * @property {RoleCostume} costume - 角色时装 // 数据库中以字符串形式存储
   * @property {string} talent - 角色天赋 // TODO: 天赋数据缺失来源
   * @property {string} updated - 数据更新时间
   * @return UserRole
   */
  export interface UserRole {
    uid: number
    cid: number
    img: string
    name: string
    fetter: number
    level: number
    element: string
    star: number
    weapon: string
    reliquary: string
    constellation: string
    activeConstellation: number
    costume: string
    talent: string
    updated: string
  }

  /**
   * @description 角色列表的武器数据类型
   * @since Alpha v0.2.0
   * @interface RoleWeapon
   * @property {number} id - 武器 ID
   * @property {string} name - 武器名称
   * @property {string} type - 武器类型
   * @property {number} star - 武器星级
   * @property {number} level - 武器等级
   * @property {number} promote - 武器突破
   * @property {string} description - 武器描述
   * @property {number} affix - 武器精炼
   * @return RoleWeapon
   */
  export interface RoleWeapon {
    id: number
    name: string
    type: string
    star: number
    level: number
    promote: number
    description: string
    affix: number
  }

  /**
   * @description 角色列表的圣遗物数据类型
   * @since Alpha v0.2.0
   * @interface RoleReliquary
   * @property {number} id - 圣遗物 ID
   * @property {string} name - 圣遗物名称
   * @property {number} pos - 圣遗物部位
   * @property {string} posName - 圣遗物部位名称
   * @property {number} star - 圣遗物星级
   * @property {number} level - 圣遗物等级
   * @property {string} icon - 圣遗物图标
   * @property {number} set.id - 圣遗物套装 ID
   * @property {string} set.name - 圣遗物套装名称
   * @property {number} set.effect[].active - 圣遗物套装效果激活数量
   * @property {string} set.effect[].description - 圣遗物套装效果描述
   * @return RoleReliquary
   */
  export interface RoleReliquary {
    id: number
    name: string
    pos: number
    posName: string
    star: number
    level: number
    icon: string
    set: {
      id: number
      name: string
      effect: Array<{
        active: number
        description: string
      }>
    }
  }

  /**
   * @description 角色列表的命座数据类型
   * @since Alpha v0.2.0
   * @interface RoleConstellation
   * @property {number} id - 命座 ID
   * @property {string} name - 命座名称
   * @property {string} icon - 命座图标
   * @property {string} description - 命座描述
   * @property {boolean} active - 命座是否激活
   * @property {number} pos - 命座位置
   * @return RoleConstellation
   */
  export interface RoleConstellation {
    id: number
    name: string
    icon: string
    description: string
    active: boolean
    pos: number
  }

  /**
   * @description 角色列表的时装数据类型
   * @since Alpha v0.2.0
   * @interface RoleCostume
   * @property {number} id - 时装 ID
   * @property {string} name - 时装名称
   * @property {string} icon - 时装图标
   * @return RoleCostume
   */
  export interface RoleCostume {
    id: number
    name: string
    icon: string
  }
}
