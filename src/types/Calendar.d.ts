/**
 * @file core types TGCalendar.d.ts
 * @description 本应用的素材日历类型定义
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.3
 */

declare namespace BTMuli.Genshin.Calendar {
  /**
     * @description 素材日历接口
     * @interface Data
     * @since Alpha v0.1.3
     * @property {Record<number, CharaacterItem>} characters - 该天的角色相关数据
     * @property {Record<number, WeaponItem>} weapons - 该天的武器相关数据
     * @returns {Data}
     */
  export interface Data {
    characters: Record<number, CharaacterItem>
    weapons: Record<number, WeaponItem>
  }

  /**
     * @description 单日单秘境的素材日历接口
     * @interface CharaacterItem
     * @since Alpha v0.1.3
     * @property {string} title - 地区 秘境名称
     * @property {Material[]} materials - 素材 url
     * @property {BTMuli.Genshin.Wiki.Character.BriefInfo[]} contents - 角色/武器的简要信息
     * @returns {CharaacterItem}
     */
  export interface CharaacterItem {
    title: string
    materials: Material[]
    contents: BTMuli.Genshin.Wiki.Character.BriefInfo[]
  }

  /**
     * @description 单日单秘境的素材日历接口
     * @interface WeaponItem
     * @since Alpha v0.1.3
     * @property {string} title - 地区 秘境名称
     * @property {Material[]} materials - 素材 url
     * @property {BTMuli.Genshin.Wiki.Weapon.BriefInfo[]} contents - 角色/武器的简要信息
     * @returns {WeaponItem}
     */
  export interface WeaponItem {
    title: string
    materials: Material[]
    contents: BTMuli.Genshin.Wiki.Weapon.BriefInfo[]
  }

  /**
     * @description 材料类型
     * @interface Material
     * @since Alpha v0.1.3
     * @property {number} id - 角色/武器的 id
     * @property {number} star - 角色/武器的星级
     * @property {number} content_id - 观测枢的 content_id
     * @property {string} name - 名称
     * @property {string} icon - 图标 url
     */
  export interface Material {
    id?: number
    star: number
    content_id: number
    name: string
    icon: string
  }
}
