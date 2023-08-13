/**
 * @file types App GCG.d.ts
 * @description 本应用的卡牌相关类型定义
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.2.2
 */

declare namespace TGApp.App.GCG {
  /**
   * @description Wiki页用到的简略信息
   * @interface WikiBriefInfo
   * @since Alpha v0.2.2
   * @property {number} id - 卡牌 ID
   * @property {number} contentId - 观测枢的 content_id
   * @property {string} name - 卡牌名称
   * @property {string} type - 卡牌类型
   * @property {string} icon - 卡牌图标
   * @property {Record<string,string>} tags - 卡牌标签
   * @return WikiBriefInfo
   */
  export interface WikiBriefInfo {
    id: number;
    contentId: number;
    name: string;
    type: string;
    icon: string;
    tags: Record<string, string>;
  }
}

// /**
//  * @description Gcg 基本卡牌类型
//  * @interface  BaseCardType
//  * @since Alpha
//  * @property {string} characterCard 角色卡
//  * @property {string} actionCard 行动卡
//  * @property {string} monsterCard 魔物卡
//  * @returns {BaseCardType}
//  */
// export enum BaseCardType {
//   characterCard = "角色牌",
//   actionCard = "行动牌",
//   monsterCard = "魔物牌",
// }
//
// /**
//  * @description Gcg 基本卡牌
//  * @interface  BaseCard
//  * @since Alpha
//  * @see BaseCardType
//  * @see CharacterCard
//  * @see ActionCard
//  * @see MonsterCard
//  * @property {string} name 卡牌名称
//  * @property {int} id 卡牌 ID // TODO: 用于短期外链跳转
//  * @property {string} type 卡牌类型
//  * @property icon 卡牌图标
//  * @property {string} icon.normal 正常图标
//  * @property {string} icon.special 特殊图标
//  * @property {unknown} info 卡牌信息
//  * @property {unknown} skills 卡牌技能，仅角色卡与魔物卡有
//  * @property {unknown} affect 卡牌效果，仅行动卡有
//  * @returns {BaseCard}
//  */
// export interface BaseCard {
//   name: string
//   id: number
//   type: BaseCardType
//   icon: { normal: string, special?: string }
//   info: unknown
//   skills?: unknown
//   affect?: unknown
// }
//
// /**
//  * @description Gcg 角色卡牌
//  * @interface  CharacterCard
//  * @since Alpha v0.1.3
//  * @see BaseCard
//  * @see CharacterCardType
//  * @property {BTMuli.App.Wiki.EnumElement} info.element 元素
//  * @property {BTMuli.App.Wiki.EnumWeapon} info.weapon 武器
//  * @property {EnumCamp} info.camp 阵营
//  * @property {string} info.source 卡牌来源
//  * @property {string} info.title 卡牌标题
//  * @property {string} info.description 卡牌描述
//  * @property {string} skills[].name 技能名称
//  * @property {string} skills[].type 技能类型
//  * @property {string} skills[].description 技能描述
//  * @property {string} skills[].cost 技能花费
//  * @property {string} skills[].cost.type 花费类型
//  * @property {string} skills[].cost.value 花费值
//  * @description 当技能类型为 “召唤物” 时，会有以下属性
//  * @property {number} skills[].count 可用次数
//  * @returns {CharacterCard}
//  */
// export interface CharacterCard extends BaseCard {
//   type: BaseCardType.characterCard
//   info: {
//     element: BTMuli.App.Wiki.EnumElement
//     weapon: BTMuli.App.Wiki.EnumWeapon
//     camp: EnumCamp
//     source: string
//     title: string
//     description: string
//   }
//   skills: Array<{
//     name: string
//     type: string
//     description: string
//     cost: {
//       type: string
//       value: string
//     }
//     count?: number
//   }>
// }
//
// /**
//  * @description Gcg 行动卡牌
//  * @interface  ActionCard
//  * @since Alpha
//  * @see BaseCard
//  * @see ActionCardType
//  * @property {EnumActionType} info.actionType 类型
//  * @property {EnumActionTag} info.actionTag 标签
//  * @property {EnumActionCost} info.actionCost 花费
//  * @property {string} info.source 卡牌来源
//  * @property {string} info.title 卡牌标题
//  * @property {string} info.description 卡牌描述
//  * @description 当类型为“天赋”时，可能会有以下属性
//  * @property {string} info.charge 充能
//  * @property {string} affect 卡牌效果
//  * @returns {ActionCard}
//  */
// export interface ActionCard extends BaseCard {
//   type: BaseCardType.actionCard
//   info: {
//     actionType: EnumActionType
//     actionTag: EnumActionTag
//     actionCost: EnumActionCost
//     source: string
//     title: string
//     description: string
//     charge?: string
//   }
//   affect: string
// }
//
// /**
//  * @description Gcg 魔物卡牌
//  * @description 与角色卡牌类似
//  * @interface  MonsterCard
//  * @since Alpha v0.1.3
//  * @see BaseCard
//  * @see CharacterCardType
//  * @property {BTMuli.App.Wiki.EnumElement} info.element 元素
//  * @property {BTMuli.App.Wiki.EnumWeapon} info.weapon 武器
//  * @property {EnumCamp} info.camp 阵营
//  * @property {string} info.source 卡牌来源
//  * @description 无标题跟描述
//  * @property {string} skills[].name 技能名称
//  * @property {string} skills[].type 技能类型
//  * @property {string} skills[].description 技能描述
//  * @property {string} skills[].cost 技能花费
//  * @property {string} skills[].cost.type 花费类型
//  * @property {string} skills[].cost.value 花费值
//  * @description 当技能类型为 “召唤物” 时，会有以下属性
//  * @returns {MonsterCard}
//  */
// export interface MonsterCard extends BaseCard {
//   type: BaseCardType.monsterCard
//   info: {
//     element: BTMuli.App.Wiki.EnumElement
//     weapon: BTMuli.App.Wiki.EnumWeapon
//     camp: EnumCamp
//     source: string
//   }
//   skills: Array<{
//     name: string
//     type: string
//     description: string
//     cost: {
//       type: string
//       value: string
//     }
//   }>
// }
//
// /**
//  * @description Gcg 角色牌分类依据
//  * @interface  CharacterCardType
//  * @since Alpha v0.1.3
//  * @see BaseCardType
//  * @property {BTMuli.App.Wiki.EnumElement} element 元素
//  * @property {BTMuli.App.Wiki.EnumWeapon} weapon 武器
//  * @property {EnumCamp} camp 阵营
//  * @returns {CharacterCardType}
//  */
// export interface CharacterCardType {
//   element: BTMuli.App.Wiki.EnumElement
//   weapon: BTMuli.App.Wiki.EnumWeapon
//   camp: EnumCamp
// }
//
// /**
//  * @description Gcg 行动牌分类依据
//  * @interface  ActionCardType
//  * @since Alpha
//  * @see BaseCardType
//  * @property {EnumActionType} actionType 类型
//  * @property {EnumActionTag} actionTag 标签
//  * @property {EnumActionCost} actionCost 花费
//  * @returns {ActionCardType}
//  */
// export interface ActionCardType {
//   actionType: EnumActionType
//   actionTag: EnumActionTag
//   actionCost: EnumActionCost
// }
//
// /**
//  * @description 角色牌阵营
//  * @enum {EnumCamp}
//  * @since Alpha
//  * @see CharacterCardType
//  * @property {string} mondstadt 蒙德
//  * @property {string} liyue 璃月
//  * @property {string} inazuma 稻妻
//  * @property {string} sumeru 须弥
//  * @property {string} fatui 愚人众
//  * @property {string} monster 魔物
//  * @returns {EnumCamp}
//  */
// export enum EnumCamp {
//   mondstadt = "蒙德",
//   liyue = "璃月",
//   inazuma = "稻妻",
//   sumeru = "须弥",
//   fatui = "愚人众",
//   monster = "魔物",
// }
//
// /**
//  * @description 行动牌类型
//  * @enum EnumActionType
//  * @since Alpha
//  * @see ActionCardType
//  * @property {string} equipment 装备牌
//  * @property {string} event 事件牌
//  * @property {string} support 支援牌
//  * @returns {EnumActionType}
//  */
// export enum EnumActionType {
//   equipment = "装备牌",
//   event = "事件牌",
//   support = "支援牌",
// }
//
// /**
//  * @description 行动牌标签
//  * @enum EnumActionTag
//  * @since Alpha
//  * @see ActionCardType
//  * @property {string} weapon 武器
//  * @property {string} artifact 圣遗物
//  * @property {string} talent 天赋
//  * @property {string} food 料理
//  * @property {string} item 道具
//  * @property {string} partner 伙伴
//  * @property {string} filed 场地
//  * @property {string} elementResonance 元素共鸣
//  * @property {string} other 其他标签
//  * @returns {EnumActionTag}
//  */
// export enum EnumActionTag {
//   weapon = "武器",
//   artifact = "圣遗物",
//   talent = "天赋",
//   food = "料理",
//   item = "道具",
//   partner = "伙伴",
//   filed = "场地",
//   elementResonance = "元素共鸣",
//   other = "其他标签",
// }
//
// /**
//  * @description 行动牌花费
//  * @enum EnumActionCost
//  * @since Alpha
//  * @see ActionCardType
//  * @property {string} cost0 花费0
//  * @property {string} cost1 花费1
//  * @property {string} cost2 花费2
//  * @property {string} cost3 花费3
//  * @property {string} cost4 花费4
//  * @property {string} cost5 花费5
//  * @property {string} cost6 花费6
//  * @property {string} other 其他花费
//  * @returns {EnumActionCost}
//  */
// export enum EnumActionCost {
//   cost0 = "花费0",
//   cost1 = "花费1",
//   cost2 = "花费2",
//   cost3 = "花费3",
//   cost4 = "花费4",
//   cost5 = "花费5",
//   cost6 = "花费6",
//   other = "其他花费",
// }

// /**
//  * @description 卡牌完整信息
//  * @since Alpha v0.1.3
//  * @interface FullInfo
//  * @property {number} id - 卡牌 ID
//  * @property {string} name - 卡牌名称
//  * @property {string} type - 卡牌类型
//  * @property {BaseInfo} baseInfo - 基础信息
//  * @property {skillInfo[]} skillInfo - 技能信息
//  * @property {addInfo[]} addInfo - 附加信息
//  * @return FullInfo
//  */
// export interface FullInfo {
//   id: number
//   name: string
//   type: string
//   baseInfo: BaseInfo
//   skillInfo: SkillInfo[]
//   addInfo: AddInfo[]
// }
//
// /**
//  * @description 卡牌点数消耗类型枚举
//  * @enum PointType
//  * @since Alpha v0.1.3
//  * @see Point
//  * @property {string} NONE - 无消耗
//  * @property {string} SAME - 任意相同骰子
//  * @property {string} ALL - 任意骰子
//  * @property {string} ELEMENT_PYRO - 元素骰子-火
//  * @property {string} ELEMENT_HYDRO - 元素骰子-水
//  * @property {string} ELEMENT_CRYO - 元素骰子-冰
//  * @property {string} ELEMENT_ELECTRO - 元素骰子-雷
//  * @property {string} ELEMENT_ANEMO - 元素骰子-风
//  * @property {string} ELEMENT_GEO - 元素骰子-岩
//  * @property {string} ELEMENT_DENDRO - 元素骰子-草
//  * @property {string} HP - 血量
//  * @property {string} CHARGE - 充能
//  * @return PointType
//  */
// export enum PointType {
//   NONE = "NONE",
//   SAME = "SAME",
//   ALL = "ALL",
//   ELEMENT_PYRO = "ELEMENT_PYRO",
//   ELEMENT_HYDRO = "ELEMENT_HYDRO",
//   ELEMENT_CRYO = "ELEMENT_CRYO",
//   ELEMENT_ELECTRO = "ELEMENT_ELECTRO",
//   ELEMENT_ANEMO = "ELEMENT_ANEMO",
//   ELEMENT_GEO = "ELEMENT_GEO",
//   ELEMENT_DENDRO = "ELEMENT_DENDRO",
//   HP = "HP",
//   CHARGE = "CHARGE",
// }
//
// /**
//  * @description 卡牌点数消耗
//  * @since Alpha v0.1.3
//  * @interface Point
//  * @property {number} point - 点数
//  * @property {PointType} type - 点数类型
//  * @return Point
//  */
// export interface Point {
//   point: number
//   type: PointType
// }
//
// /**
//  * @description 基础信息
//  * @since Alpha v0.1.3
//  * @interface BaseInfo
//  * @property {string} title - 卡牌称号
//  * @property {string} icon - 卡牌图标
//  * @property {BTMuli.Genshin.Wiki.BaseAttri[]} tags - 卡牌标签
//  * @property {Point[]} cost - 卡牌点数消耗
//  * @property {string} source - 卡牌获取途径
//  * @property {string} description - 卡牌描述
//  * @return BaseInfo
//  */
// export interface BaseInfo {
//   title: string
//   icon: string
//   tags: BTMuli.App.Wiki.BaseAttri[]
//   cost: Point[]
//   source: string
//   description: string
// }
//
// /**
//  * @description 技能信息
//  * @since Alpha v0.1.3
//  * @interface SkillInfo
//  * @property {string} type - 技能类型
//  * @property {string} name - 技能名称
//  * @property {string} description - 技能描述
//  * @property {Point[]} cost - 技能点数消耗
//  * @property {string} icon - 技能图标
//  * @return SkillInfo
//  */
// export interface SkillInfo {
//   type: string
//   name: string
//   description: string
//   cost: Point[]
//   icon: string
// }
//
// /**
//  * @description 附加信息
//  * @since Alpha v0.1.3
//  * @interface AddInfo
//  * @property {string} type - 附加信息类型
//  * @property {string} name - 附加信息名称
//  * @property {string} description - 附加信息描述
//  * @property {string} icon - 附加信息图标
//  * @return AddInfo
//  */
// export interface AddInfo {
//   type: string
//   name: string
//   description: string
//   icon: string
// }
