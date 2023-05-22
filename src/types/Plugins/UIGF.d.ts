/**
 * @file types Plugins UIGF.d.ts
 * @description UIGF 插件类型定义文件
 * @todo 待使用
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.2.0
 */

declare namespace TGApp.Plugins.UIGF {

}

// /**
//  * @description UIGF 数据
//  * @since Alpha v1.3.0
//  * @interface BaseData
//  * @property {UigfInfo} info - UIGF 头部信息
//  * @property {UigfGacha[]} list - UIGF 祈愿列表
//  * @return BaseData
//  */
// export interface BaseData {
//   info: UigfInfo
//   list: UigfInfo[]
// }
//
// /**
//  * @description UIGF 头部信息
//  * @since Alpha v1.3.0
//  * @interface UigfInfo
//  * @property {string} uid - UID
//  * @property {string} lang - 语言
//  * @property {string} uigf_version - UIGF 版本
//  * @property {number} export_timestamp - 导出时间戳(秒)
//  * @property {string} export_time - 导出时间 yyyy-MM-dd HH:mm:ss
//  * @property {string} export_app - 导出应用
//  * @property {string} export_app_version - 导出应用版本
//  * @return UIGF_Info
//  */
// export interface UigfInfo {
//   uid: string
//   lang: string
//   uigf_version: string
//   export_timestamp?: number
//   export_time?: string
//   export_app?: string
//   export_app_version?: string
// }
//
// /**
//  * @description 祈愿类型
//  * @since Alpha v1.3.0
//  * @enum EnumGachaType
//  * @property {string} CharacterUp - 角色活动祈愿
//  * @property {string} CharacterUp2 - 角色活动祈愿2
//  * @property {string} WeaponUp - 武器活动祈愿
//  * @property {string} Normal - 普通祈愿
//  * @property {string} Newbie - 新手祈愿
//  * @return EnumGachaType
//  */
// export enum EnumGachaType {
//   CharacterUp = "301",
//   CharacterUp2 = "400",
//   WeaponUp = "302",
//   Normal = "200",
//   Newbie = "100",
// }
//
// /**
//  * @description UIGF 祈愿类型
//  * @since Alpha v1.3.0
//  * @enum EnumUigfGachaType
//  * @property {string} CharacterUp - 角色活动祈愿&角色活动祈愿2
//  * @property {string} WeaponUp - 武器活动祈愿
//  * @property {string} Normal - 普通祈愿
//  * @property {string} Newbie - 新手祈愿
//  * @return EnumUigfGachaType
//  */
// export enum EnumUigfGachaType {
//   CharacterUp = "301",
//   WeaponUp = "302",
//   Normal = "200",
//   Newbie = "100",
// }
//
// /**
//  * @description UIGF 祈愿列表
//  * @since Alpha v1.3.0
//  * @interface UigfGacha
//  * @property {EnumGachaType} gacha_type - 祈愿类型
//  * @property {string} item_id - 物品ID
//  * @property {string} count - 数量
//  * @property {string} time - 时间 yyyy-MM-dd HH:mm:ss
//  * @property {string} name - 名称
//  * @property {string} item_type - 物品类型
//  * @property {string} rank_type - 稀有度
//  * @property {string} id - ID
//  * @property {EnumUigfGachaType} uigf_gacha_type - UIGF 祈愿类型
//  * @return UIGF_Gacha
//  */
// export interface UigfGacha {
//   gacha_type: string
//   item_id?: string
//   count?: string
//   time: string
//   name: string
//   item_type?: string
//   rank_type?: string
//   id: string
//   uigf_gacha_type: string
// }
