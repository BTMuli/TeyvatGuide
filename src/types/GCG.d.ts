/**
 * @file types GCG.d.ts
 * @description 本应用的 GCG 通用类型定义
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.3
 */

declare namespace BTMuli.Genshin.Wiki.GCG {
  /**
   * @description 简略信息
   * @since Alpha v0.1.3
   * @interface BriefInfo
   * @property {number} id - 卡牌 ID
   * @property {number} content_id - 观测枢 ID
   * @property {string} name - 卡牌名称
   * @property {string} type - 卡牌类型
   * @property {string} icon - 卡牌图标
   * @return BriefInfo
   */
  export interface BriefInfo {
    id: number | null
    content_id: number
    name: string
    type: string
    icon: string
  }

  /**
   * @description 卡牌完整信息
   * @since Alpha v0.1.3
   * @interface FullInfo
   * @property {number} id - 卡牌 ID
   * @property {string} name - 卡牌名称
   * @property {string} type - 卡牌类型
   * @property {BaseInfo} baseInfo - 基础信息
   * @property {skillInfo[]} skillInfo - 技能信息
   * @property {addInfo[]} addInfo - 附加信息
   * @return FullInfo
   */
  export interface FullInfo {
    id: number
    name: string
    type: string
    baseInfo: BaseInfo
    skillInfo: SkillInfo[]
    addInfo: AddInfo[]
  }

  /**
   * @description 卡牌点数消耗类型枚举
   * @enum PointType
   * @since Alpha v0.1.3
   * @see Point
   * @property {string} NONE - 无消耗
   * @property {string} SAME - 任意相同骰子
   * @property {string} ALL - 任意骰子
   * @property {string} ELEMENT_PYRO - 元素骰子-火
   * @property {string} ELEMENT_HYDRO - 元素骰子-水
   * @property {string} ELEMENT_CRYO - 元素骰子-冰
   * @property {string} ELEMENT_ELECTRO - 元素骰子-雷
   * @property {string} ELEMENT_ANEMO - 元素骰子-风
   * @property {string} ELEMENT_GEO - 元素骰子-岩
   * @property {string} ELEMENT_DENDRO - 元素骰子-草
   * @property {string} HP - 血量
   * @property {string} CHARGE - 充能
   * @return PointType
   */
  export enum PointType {
    NONE = "NONE",
    SAME = "SAME",
    ALL = "ALL",
    ELEMENT_PYRO = "ELEMENT_PYRO",
    ELEMENT_HYDRO = "ELEMENT_HYDRO",
    ELEMENT_CRYO = "ELEMENT_CRYO",
    ELEMENT_ELECTRO = "ELEMENT_ELECTRO",
    ELEMENT_ANEMO = "ELEMENT_ANEMO",
    ELEMENT_GEO = "ELEMENT_GEO",
    ELEMENT_DENDRO = "ELEMENT_DENDRO",
    HP = "HP",
    CHARGE = "CHARGE",
  }

  /**
   * @description 卡牌点数消耗
   * @since Alpha v0.1.3
   * @interface Point
   * @property {number} point - 点数
   * @property {PointType} type - 点数类型
   * @return Point
   */
  export interface Point {
    point: number
    type: PointType
  }

  /**
   * @description 基础信息
   * @since Alpha v0.1.3
   * @interface BaseInfo
   * @property {string} title - 卡牌称号
   * @property {string} icon - 卡牌图标
   * @property {BTMuli.Genshin.Wiki.BaseAttri[]} tags - 卡牌标签
   * @property {Point[]} cost - 卡牌点数消耗
   * @property {string} source - 卡牌获取途径
   * @property {string} description - 卡牌描述
   * @return BaseInfo
   */
  export interface BaseInfo {
    title: string
    icon: string
    tags: BTMuli.Genshin.Wiki.BaseAttri[]
    cost: Point[]
    source: string
    description: string
  }

  /**
   * @description 技能信息
   * @since Alpha v0.1.3
   * @interface SkillInfo
   * @property {string} type - 技能类型
   * @property {string} name - 技能名称
   * @property {string} description - 技能描述
   * @property {Point[]} cost - 技能点数消耗
   * @property {string} icon - 技能图标
   * @return SkillInfo
   */
  export interface SkillInfo {
    type: string
    name: string
    description: string
    cost: Point[]
    icon: string
  }

  /**
   * @description 附加信息
   * @since Alpha v0.1.3
   * @interface AddInfo
   * @property {string} type - 附加信息类型
   * @property {string} name - 附加信息名称
   * @property {string} description - 附加信息描述
   * @property {string} icon - 附加信息图标
   * @return AddInfo
   */
  export interface AddInfo {
    type: string
    name: string
    description: string
    icon: string
  }
}
