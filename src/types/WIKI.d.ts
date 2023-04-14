/**
 * @file types WIki.d.ts
 * @description 本应用的 Wiki 通用类型定义
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.3
 */

declare namespace BTMuli.Genshin.Wiki {

  /**
 * @description 七元素枚举
 * @enum EnumElement
 * @since Alpha v0.1.3
 * @see CharacterCardType
 * @property {string} pyro 火元素
 * @property {string} hydro 水元素
 * @property {string} cryo 冰元素
 * @property {string} electro 雷元素
 * @property {string} anemo 风元素
 * @property {string} geo 岩元素
 * @property {string} dendro 草元素
 * @return EnumElement
 */
  export enum EnumElement {
    pyro = "火元素",
    hydro = "水元素",
    cryo = "冰元素",
    electro = "雷元素",
    anemo = "风元素",
    geo = "岩元素",
    dendro = "草元素",
  }

  /**
 * @description 武器类型枚举
 * @enum EnumWeapon
 * @since Alpha v0.1.3
 * @see CharacterCardType
 * @property {string} sword 单手剑
 * @property {string} claymore 双手剑
 * @property {string} pole 长柄武器
 * @property {string} bow 弓
 * @property {string} catalyst 法器
 * @return EnumWeapon
 */
  export enum EnumWeapon {
    sword = "单手剑",
    claymore = "双手剑",
    pole = "长柄武器",
    bow = "弓",
    catalyst = "法器",
  }

  /**
   * @description 突破信息，适用于角色和武器等级
   * @since Alpha v0.1.3
   * @interface levelUp
   * @property {number} level - 突破等级，指达到突破要求的等级，0 表示未突破
   * @property {Material[]} materials - 突破所需材料
   * @property {Record<string, number>[]} upAttri - 突破后的属性加成
   * @property {Record<string, number>[]} averAttri - 突破后的平均每级属性加成
   * @property {string} addInfo - 突破后的附加信息，如天赋解锁
   * @return levelUp
   */
  export interface levelUp {
    level: number
    materials: Material[]
    upAttri: Array<Record<string, number>>
    averAttri: Array<Record<string, number>>
    addInfo?: string
  }

  /**
   * @description 材料信息
   * @since Alpha v0.1.3
   * @interface Material
   * @property {number} id - 材料 ID
   * @property {string} name - 材料名称
   * @property {number} star - 材料星级
   * @property {string} type - 材料类型
   * @property {number} count - 材料数量
   * @property {string[]} source - 材料获取途径
   * @property {string} description - 材料描述
   * @return Material
   */
  export interface Material {
    id: number
    name: string
    star: number
    type: string
    count?: number
    source: string[]
    description: string
  }

  /**
   * @description 本应用的食物类型
   * @since Alpha v0.1.3
   * @interface Food
   * @property {number} id - 食物 ID
   * @property {string} name - 食物名称
   * @property {number} star - 食物星级
   * @property {string} type - 食物类型
   * @property {number} count - 食物数量
   * @property {string} description - 食物描述
   * @property {string[]} source - 食谱来源
   * @property {string} effect - 食物效果
   * @return Food
   */
  export interface Food {
    id: number
    name: string
    star: number
    type: string
    count?: number
    description: string
    source: string[]
    effect: string
  }
}
