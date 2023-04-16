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
   * @property {umber} content_id - 观测枢 ID
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
   * @description 基础信息
   * @since Alpha v0.1.3
   * @interface BaseInfo
   * @property {string} title - 卡牌称号
   * @property {string} icon - 卡牌图标
   * @property {BTMuli.Genshin.Wiki.BaseAttri[]} tags - 卡牌标签
   * @property {string} source - 卡牌获取途径
   * @property {string} description - 卡牌描述
   * @return BaseInfo
   */
  export interface BaseInfo {
    title: string
    icon: string
    tags: BTMuli.Genshin.Wiki.BaseAttri[]
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
   * @property {string} icon - 技能图标
   * @return SkillInfo
   */
  export interface SkillInfo {
    type: string
    name: string
    description: string
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
