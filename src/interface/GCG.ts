/**
 * @file interface GCG.ts
 * @description interface GCG.ts
 * @description 分类参考：米游社卡牌图鉴
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha
 */

/**
 * @description Gcg 基本卡牌类型
 * @interface  BaseCardType
 * @since Alpha
 * @property {string} characterCard 角色卡
 * @property {string} actionCard 行动卡
 * @property {string} monsterCard 魔物卡
 * @returns {BaseCardType}
 */
export enum BaseCardType {
  characterCard = "角色牌",
  actionCard = "行动牌",
  monsterCard = "魔物牌",
}

/**
 * @description Gcg 基本卡牌
 * @interface  BaseCard
 * @since Alpha
 * @see BaseCardType
 * @see CharacterCard
 * @see ActionCard
 * @see MonsterCard
 * @property {string} name 卡牌名称
 * @property {int} id 卡牌 ID // TODO: 用于短期外链跳转
 * @property {string} type 卡牌类型
 * @property icon 卡牌图标
 * @property {string} icon.normal 正常图标
 * @property {string} icon.special 特殊图标
 * @property {unknown} info 卡牌信息
 * @property {unknown} skills 卡牌技能，仅角色卡与魔物卡有
 * @property {unknown} affect 卡牌效果，仅行动卡有
 * @returns {BaseCard}
 */
export interface BaseCard {
  name: string
  id: number
  type: BaseCardType
  icon: { normal: string, special?: string }
  info: unknown
  skills?: unknown
  affect?: unknown
}

/**
 * @description Gcg 角色卡牌
 * @interface  CharacterCard
 * @since Alpha
 * @see BaseCard
 * @see CharacterCardType
 * @property {EnumElement} info.element 元素
 * @property {EnumWeapon} info.weapon 武器
 * @property {EnumCamp} info.camp 阵营
 * @property {string} info.source 卡牌来源
 * @property {string} info.title 卡牌标题
 * @property {string} info.description 卡牌描述
 * @property {string} skills[].name 技能名称
 * @property {string} skills[].type 技能类型
 * @property {string} skills[].description 技能描述
 * @property {string} skills[].cost 技能花费
 * @property {string} skills[].cost.type 花费类型
 * @property {string} skills[].cost.value 花费值
 * @description 当技能类型为 “召唤物” 时，会有以下属性
 * @property {number} skills[].count 可用次数
 * @returns {CharacterCard}
 */
export interface CharacterCard extends BaseCard {
  type: BaseCardType.characterCard
  info: {
    element: EnumElement
    weapon: EnumWeapon
    camp: EnumCamp
    source: string
    title: string
    description: string
  }
  skills: Array<{
    name: string
    type: string
    description: string
    cost: {
      type: string
      value: string
    }
    count?: number
  }>
}

/**
 * @description Gcg 行动卡牌
 * @interface  ActionCard
 * @since Alpha
 * @see BaseCard
 * @see ActionCardType
 * @property {EnumActionType} info.actionType 类型
 * @property {EnumActionTag} info.actionTag 标签
 * @property {EnumActionCost} info.actionCost 花费
 * @property {string} info.source 卡牌来源
 * @property {string} info.title 卡牌标题
 * @property {string} info.description 卡牌描述
 * @description 当类型为“天赋”时，可能会有以下属性
 * @property {string} info.charge 充能
 * @property {string} affect 卡牌效果
 * @returns {ActionCard}
 */
export interface ActionCard extends BaseCard {
  type: BaseCardType.actionCard
  info: {
    actionType: EnumActionType
    actionTag: EnumActionTag
    actionCost: EnumActionCost
    source: string
    title: string
    description: string
    charge?: string
  }
  affect: string
}

/**
 * @description Gcg 魔物卡牌
 * @description 与角色卡牌类似
 * @interface  MonsterCard
 * @since Alpha
 * @see BaseCard
 * @see CharacterCardType
 * @property {EnumElement} info.element 元素
 * @property {EnumWeapon} info.weapon 武器
 * @property {EnumCamp} info.camp 阵营
 * @property {string} info.source 卡牌来源
 * @description 无标题跟描述
 * @property {string} skills[].name 技能名称
 * @property {string} skills[].type 技能类型
 * @property {string} skills[].description 技能描述
 * @property {string} skills[].cost 技能花费
 * @property {string} skills[].cost.type 花费类型
 * @property {string} skills[].cost.value 花费值
 * @description 当技能类型为 “召唤物” 时，会有以下属性
 * @returns {MonsterCard}
 */
export interface MonsterCard extends BaseCard {
  type: BaseCardType.monsterCard
  info: {
    element: EnumElement
    weapon: EnumWeapon
    camp: EnumCamp
    source: string
  }
  skills: Array<{
    name: string
    type: string
    description: string
    cost: {
      type: string
      value: string
    }
  }>
}

/**
 * @description Gcg 角色牌分类依据
 * @interface  CharacterCardType
 * @since Alpha
 * @see BaseCardType
 * @property {EnumElement} element 元素
 * @property {EnumWeapon} weapon 武器
 * @property {EnumCamp} camp 阵营
 * @returns	{CharacterCardType}
 */
export interface CharacterCardType {
  element: EnumElement
  weapon: EnumWeapon
  camp: EnumCamp
}

/**
 * @description Gcg 行动牌分类依据
 * @interface  ActionCardType
 * @since Alpha
 * @see BaseCardType
 * @property {EnumActionType} actionType 类型
 * @property {EnumActionTag} actionTag 标签
 * @property {EnumActionCost} actionCost 花费
 * @returns	{ActionCardType}
 */
export interface ActionCardType {
  actionType: EnumActionType
  actionTag: EnumActionTag
  actionCost: EnumActionCost
}

/**
 * @description 角色牌元素
 * @enum EnumElement
 * @since Alpha
 * @see CharacterCardType
 * @property {string} pyro 火元素
 * @property {string} hydro 水元素
 * @property {string} cryo 冰元素
 * @property {string} electro 雷元素
 * @property {string} anemo 风元素
 * @property {string} geo 岩元素
 * @property {string} dendro 草元素
 * @returns {EnumElement}
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
 * @description 角色牌武器
 * @enum EnumWeapon
 * @since Alpha
 * @see CharacterCardType
 * @property {string} sword 单手剑
 * @property {string} claymore 双手剑
 * @property {string} pole 长柄武器
 * @property {string} bow 弓
 * @property {string} catalyst 法器
 * @property {string} other 其他武器
 * @returns {EnumWeapon}
 */
export enum EnumWeapon {
  sword = "单手剑",
  claymore = "双手剑",
  pole = "长柄武器",
  bow = "弓",
  catalyst = "法器",
  other = "其他武器",
}

/**
 * @description 角色牌阵营
 * @enum {EnumCamp}
 * @since Alpha
 * @see CharacterCardType
 * @property {string} mondstadt 蒙德
 * @property {string} liyue 璃月
 * @property {string} inazuma 稻妻
 * @property {string} sumeru 须弥
 * @property {string} fatui 愚人众
 * @property {string} monster 魔物
 * @returns {EnumCamp}
 */
export enum EnumCamp {
  mondstadt = "蒙德",
  liyue = "璃月",
  inazuma = "稻妻",
  sumeru = "须弥",
  fatui = "愚人众",
  monster = "魔物",
}

/**
 * @description 行动牌类型
 * @enum EnumActionType
 * @since Alpha
 * @see ActionCardType
 * @property {string} equipment 装备牌
 * @property {string} event 事件牌
 * @property {string} support 支援牌
 * @returns {EnumActionType}
 */
export enum EnumActionType {
  equipment = "装备牌",
  event = "事件牌",
  support = "支援牌",
}

/**
 * @description 行动牌标签
 * @enum EnumActionTag
 * @since Alpha
 * @see ActionCardType
 * @property {string} weapon 武器
 * @property {string} artifact 圣遗物
 * @property {string} talent 天赋
 * @property {string} food 料理
 * @property {string} item 道具
 * @property {string} partner 伙伴
 * @property {string} filed 场地
 * @property {string} elementResonance 元素共鸣
 * @property {string} other 其他标签
 * @returns {EnumActionTag}
 */
export enum EnumActionTag {
  weapon = "武器",
  artifact = "圣遗物",
  talent = "天赋",
  food = "料理",
  item = "道具",
  partner = "伙伴",
  filed = "场地",
  elementResonance = "元素共鸣",
  other = "其他标签",
}

/**
 * @description 行动牌花费
 * @enum EnumActionCost
 * @since Alpha
 * @see ActionCardType
 * @property {string} cost0 花费0
 * @property {string} cost1 花费1
 * @property {string} cost2 花费2
 * @property {string} cost3 花费3
 * @property {string} cost4 花费4
 * @property {string} cost5 花费5
 * @property {string} cost6 花费6
 * @property {string} other 其他花费
 * @returns {EnumActionCost}
 */
export enum EnumActionCost {
  cost0 = "花费0",
  cost1 = "花费1",
  cost2 = "花费2",
  cost3 = "花费3",
  cost4 = "花费4",
  cost5 = "花费5",
  cost6 = "花费6",
  other = "其他花费",
}
