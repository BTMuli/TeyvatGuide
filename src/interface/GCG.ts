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
 * @return  BaseCardType
 */
export enum BaseCardType {
	characterCard = "角色牌",
	actionCard = "行动牌",
	monsterCard = "魔物牌",
}

/**
 * @description Gcg 角色牌分类依据
 * @interface  CharacterCardType
 * @since Alpha
 * @see BaseCardType
 * @property {EnumElement} element 元素
 * @property {EnumWeapon} weapon 武器
 * @property {EnumCamp} camp 阵营
 * @return	CharacterCardType
 */
export interface CharacterCardType {
	element: EnumElement;
	weapon: EnumWeapon;
	camp: EnumCamp;
}

/**
 * @description Gcg 行动牌分类依据
 * @interface  ActionCardType
 * @since Alpha
 * @see BaseCardType
 * @property {EnumActionType} actionType 类型
 * @property {EnumActionTag} actionTag 标签
 * @property {EnumActionCost} actionCost 花费
 * @return	ActionCardType
 */
export interface ActionCardType {
	actionType: EnumActionType;
	actionTag: EnumActionTag;
	actionCost: EnumActionCost;
}

/**
 * @description 角色牌元素
 * @enum EnumElement
 * @since Alpha
 * @see CharacterCardType
 * @property {string} pyro 火
 * @property {string} hydro 水
 * @property {string} cryo 冰
 * @property {string} electro 雷
 * @property {string} anemo 风
 * @property {string} geo 岩
 * @property {string} dendro 草
 * @return EnumElement
 */
export enum EnumElement {
	pyro = "火",
	hydro = "水",
	cryo = "冰",
	electro = "雷",
	anemo = "风",
	geo = "岩",
	dendro = "草",
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
 * @return EnumWeapon
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
 * @enum EnumCamp
 * @since Alpha
 * @see CharacterCardType
 * @property {string} mondstadt 蒙德
 * @property {string} liyue 璃月
 * @property {string} inazuma 稻妻
 * @property {string} sumeru 须弥
 * @property {string} fatui 愚人众
 * @property {string} monster 魔物
 * @return EnumCamp
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
 * @return EnumActionType
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
 * @return EnumActionTag
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
 * @return EnumActionCost
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
