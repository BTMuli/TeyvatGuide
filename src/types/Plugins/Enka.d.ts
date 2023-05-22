/**
 * @file types Plugins Enka.d.ts
 * @description Enka 获取到的数据类型定义文件
 * @todo 待使用
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.2.0
 */

declare namespace TGApp.Plugins.Enka {

}

// /**
//  * @description ENKA 数据
//  * @since Alpha v0.1.3
//  * @interface Data
//  * @property {PlayerInfo} playerInfo 玩家信息
//  * @property {AvatarInfo[]} avatarInfoList 角色信息列表
//  * @property {number} ttl 缓存时间
//  * @property {string} uid 用户 UID
//  * @return Data
//  */
// export interface Data {
//   playerInfo: PlayerInfo
//   avatarInfoList: AvatarInfo[]
//   ttl: number
//   uid: string
// }
//
// /**
//  * @description 玩家信息
//  * @since Alpha v0.1.3
//  * @interface PlayerInfo
//  * @property {string} nickname 昵称
//  * @property {number} level 等级
//  * @property {string} signature 个性签名
//  * @property {number} worldLevel 世界等级
//  * @property {number} nameCardId 名片 ID
//  * @property {number} finishAchievementNum 完成成就数量
//  * @property {number} towerFloorIndex 深渊层数
//  * @property {number} towerLevelIndex 深渊间数
//  * @property {BriefAvatarInfo[]} showAvatarInfoList 显示角色信息列表
//  * @property {number[]} showNameCardIdList 显示名片 ID 列表
//  * @property {BriefAvatarInfo} profilePicture 角色头像
//  * @return PlayerInfo
//  */
// export interface PlayerInfo {
//   nickname: string
//   level: number
//   signature: string
//   worldLevel: number
//   nameCardId: number
//   finishAchievementNum: number
//   towerFloorIndex: number
//   towerLevelIndex: number
//   showAvatarInfoList: BriefAvatarInfo[]
//   showNameCardIdList: number[]
//   profilePicture: BriefAvatarInfo
// }
//
// /**
//  * @description 简要角色信息
//  * @since Alpha v0.1.3
//  * @interface BriefAvatarInfo
//  * @property {number} avatarId 角色 ID
//  * @property {number} level 角色等级
//  * @property {number} costumeId 角色服装 ID
//  * @return BriefAvatarInfo
//  */
// export interface BriefAvatarInfo {
//   avatarId: number
//   level?: number
//   costumeId?: number
// }
//
// /**
//  * @description 角色信息
//  * @since Alpha v0.1.3
//  * @interface AvatarInfo
//  * @property {number} avatarId 角色 ID
//  * @property {Record<number, AvatarProp>} propMap 角色属性
//  * @property {number[]} talentIdList 角色天赋 ID 列表
//  * @property {Record<number, number>} fightPropMap 角色战斗属性
//  * @property {number} skillDepotId 角色技能库 ID
//  * @property {number[]} inherentProudSkillList 角色固有技能列表
//  * @property {Record<number, number>} skillLevelMap 角色技能等级
//  * @property {Equip[]} equipList 角色装备列表
//  * @property {number} fetterInfo.expLevel 角色羁绊等级
//  * @return AvatarInfo
//  */
// export interface AvatarInfo {
//   avatarId: number
//   propMap: Record<number, AvatarProp>
//   talentIdList: number[]
//   fightPropMap: Record<number, number>
//   skillDepotId: number
//   inherentProudSkillList: number[]
//   skillLevelMap: Record<number, number>
//   equipList: Equip[]
//   fetterInfo: {
//     expLevel: number
//   }
// }
//
// /**
//  * @description 角色属性
//  * @since Alpha v0.1.3
//  * @interface AvatarProp
//  * @property {number} type 角色属性类型
//  * @property {string} ival 角色属性值
//  * @property {string} val 角色属性值
//  * @return AvatarProp
//  */
// export interface AvatarProp {
//   type: number
//   ival: string
//   val?: string
// }
//
// /**
//  * @description 角色装备
//  * @since Alpha v0.1.3
//  * @interface Equip
//  * @property {number} itemId 装备 ID
//  * @property {Reliquary} reliquary 装备圣遗物
//  * @property {EquipFlat} flat 装备属性
//
//  * @return Equip
//  */
// export interface Equip {
//   itemId: number
//   reliquary: Reliquary
//   flat: EquipFlat
// }
//
// /**
//  * @description 圣遗物
//  * @since Alpha v0.1.3
//  * @interface Reliquary
//  * @property {number} level 圣遗物等级
//  * @property {number} mainPropId 圣遗物主属性 ID
//  * @property {number[]} appendPropIdList 圣遗物附加属性 ID 列表
//  * @return Reliquary
//  */
// export interface Reliquary {
//   level: number
//   mainPropId: number
//   appendPropIdList: number[]
// }
//
// /**
//  * @description 装备属性
//  * @since Alpha v0.1.3
//  * @interface EquipFlat
//  * @property {string} nameTextMapHash 装备名称
//  * @property {string} setNameTextMapHash 装备套装名称
//  * @property {number} rankLevel 装备等级
//  * @property {ReliquaryMainStat} reliquaryMainStat 圣遗物主属性
//  * @property {ReliquaryAppendStat[]} reliquarySubStats 圣遗物附加属性
//  * @property {string} itemType 装备类型
//  * @property {string} icon 装备图标
//  * @property {string} equipType 装备类型
//  * @return EquipFlat
//  */
// export interface EquipFlat {
//   nameTextMapHash: string
//   setNameTextMapHash: string
//   rankLevel: number
//   reliquaryMainStat: ReliquaryMainStat
//   reliquarySubStats: ReliquaryAppendStat[]
//   itemType: string
//   icon: string
//   equipType: string
// }
//
// /**
//  * @description 圣遗物主属性
//  * @since Alpha v0.1.3
//  * @interface ReliquaryMainStat
//  * @property {string} mainPropId 圣遗物主属性 ID
//  * @property {number} statValue 圣遗物主属性值
//  * @return ReliquaryMainStat
//  */
// export interface ReliquaryMainStat {
//   mainPropId: string
//   statValue: number
// }
//
// /**
//  * @description 圣遗物附加属性
//  * @since Alpha v0.1.3
//  * @interface ReliquaryAppendStat
//  * @property {string} appendPropId 圣遗物附加属性 ID
//  * @property {number} statValue 圣遗物附加属性值
//  * @return ReliquaryAppendStat
//  */
// export interface ReliquaryAppendStat {
//   appendPropId: string
//   statValue: number
// }
