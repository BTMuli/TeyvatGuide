/**
 * @file types App Character.d.ts
 * @description 角色相关类型定义文件
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.5
 */

declare namespace TGApp.App.Character {
  /**
   * @description Wiki 页简略信息
   * @since Alpha v0.2.0
   * @interface WikiBriefInfo
   * @property {number} id - 角色 ID
   * @property {number} contentId - 观测枢的 content_id
   * @property {string} name - 角色名称
   * @property {string} title - 角色称号
   * @property {string} birthday - 角色生日
   * @property {number} star - 角色星级
   * @property {string} element - 角色元素类型图标
   * @property {string} weapon - 角色武器类型图标
   * @property {string} nameCard - 角色名片
   * @return WikiBriefInfo
   */
  export interface WikiBriefInfo {
    id: number;
    contentId: number;
    name: string;
    title: string;
    birthday: string;
    star: number;
    element: string;
    weapon: string;
    nameCard: string;
  }
}

// /**
//  * @description 本应用的角色类型
//  * @since Alpha v0.1.3
//  * @interface FullInfo
//  * @property {number} id - 角色 ID
//  * @property {string} name - 角色名称
//  * @property {number} star - 角色星级
//  * @property {string} element - 角色元素
//  * @property {string} weapon - 角色武器类型
//  * @property {BaseInfo} baseInfo - 角色基础信息
//  * @property {Constellation[]} constellations - 命之座
//  * @property {Talent[]} talents - 角色天赋
//  * @property {AddInfo} addInfo - 角色附加信息
//  * @return FullInfo
//  */
// export interface FullInfo {
//   id: number
//   name: string
//   star: number
//   element: string
//   weapon: string
//   baseInfo: BaseInfo
//   constellations: Constellation[]
//   talents: Talent[]
//   addInfo: AddInfo
// }
//
// /**
//  * @description 角色基础信息
//  * @since Alpha v0.1.3
//  * @interface BaseInfo
//  * @property {string} birthday - 生日
//  * @property {string} camp - 所属
//  * @property {string} constellation - 命之座
//  * @property {string} cvZh - 中文配音
//  * @property {string} cvJp - 日文配音
//  * @property {string} description - 角色描述
//  * @property {string[]} source - 角色获取途径
//  * @return BaseInfo
//  */
// export interface BaseInfo {
//   birthday: string
//   camp: string
//   constellation: string
//   cvZh: string
//   cvJp: string
//   description: string
// }
//
// /**
//  * @description 角色命之座
//  * @since Alpha v0.1.3
//  * @interface Constellation
//  * @property {number} id - 命之座 ID，主要是图标 id
//  * @property {string} name - 命之座名称
//  * @description 描述可作为 v-html 使用
//  * @property {string} description - 命之座描述
//  * @return Constellation
//  */
// export interface Constellation {
//   id: number
//   name: string
//   description: string
// }
//
// /**
//  * @description 角色天赋
//  * @since Alpha v0.1.3
//  * @interface Talent
//  * @property {number} id - 天赋 ID
//  * @property {string} name - 天赋名称
//  * @property {string} type - 天赋类型
//  * @property {UpInfo[]} upInfos - 天赋升级信息
//  * @description 描述可作为 v-html 使用
//  * @property {string} description - 天赋描述
//  * @return Talent
//  */
// export interface Talent {
//   id: number
//   name: string
//   type: string
//   upInfos?: UpInfo[]
//   description: string
// }
//
// /**
//  * @description 天赋升级信息
//  * @since Alpha v0.1.3
//  * @interface UpInfo
//  * @property {number} level - 天赋升级原始等级
//  * @property {BTMuli.Genshin.Wiki.Material[]} materials - 天赋升级所需材料
//  * @property {Record<string, number>} oriAttr - 天赋升级前属性
//  * @property {Record<string, number>} upAttr - 天赋升级后属性
//  * @return UpInfo
//  */
// export interface UpInfo {
//   level: number
//   materials: BTMuli.App.Wiki.Material[]
//   oriAttr: Record<string, number>
//   upAttr: Record<string, number>
// }
//
// /**
//  * @description 角色附加信息
//  * @since Alpha v0.1.3
//  * @interface AddInfo
//  * @property {BTMuli.Genshin.Wiki.levelUp[]} levelUps - 角色升级信息
//  * @property {SpecialFood} specialFood - 特色料理
//  * @property {Uniform[]} uniforms - 角色衣装
//  * @property {Story[]} stories - 角色故事
//  * @return AddInfo
//  */
// export interface AddInfo {
//   levelUps: BTMuli.App.Wiki.levelUp[]
//   specialFood: SpecialFood
//   uniforms: Uniform[]
//   stories: Story[]
// }
//
// /**
//  * @description 角色特色料理
//  * @since Alpha v0.1.3
//  * @interface SpecialFood
//  * @extends {BTMuli.Genshin.Wiki.Food}
//  * @property {number} oriId - 原料理 ID
//  * @property {string} oriName - 原料理名称
//  * @return SpecialFood
//  */
// export interface SpecialFood extends BTMuli.App.Wiki.Food {
//   oriId: number
//   oriName: string
// }
//
// /**
//  * @description 角色衣装
//  * @since Alpha v0.1.3
//  * @interface Uniform
//  * @property {string} name - 衣装名称
//  * @property {string} description - 衣装描述
//  * @return Uniform
//  */
// export interface Uniform {
//   name: string
//   description: string
// }
//
// /**
//  * @description 角色故事
//  * @since Alpha v0.1.3
//  * @interface Story
//  * @property {string} title - 故事标题
//  * @property {string} content - 故事内容
//  * @return Story
//  */
// export interface Story {
//   title: string
//   content: string
// }
