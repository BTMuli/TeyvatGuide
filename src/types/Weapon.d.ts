/**
 * @file types Weapon.d.ts
 * @description 本应用的武器类型定义
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.3
 */

declare namespace BTMuli.Genshin.Wiki.Weapon {
  /**
   * @description 本应用的武器类型
   * @since Alpha v0.1.3
   * @interface FullInfo
   * @property {number} id - 武器 ID
   * @property {string} name - 武器名称
   * @property {number} star - 武器星级
   * @property {string} type - 武器类型
   * @property {BaseInfo} baseInfo - 武器基础信息
   * @property {Refine[]} refines - 武器精炼信息
   * @property {AddInfo} addInfo - 武器附加信息
   * @return FullInfo
   */
  export interface FullInfo {
    id: number
    name: string
    star: number
    type: string
    baseInfo: BaseInfo
    refines: Refine[]
    addInfo: AddInfo
  }

  /**
   * @description 武器基础信息
   * @since Alpha v0.1.3
   * @interface BaseInfo
   * @property {string} refine - 武器精炼标题
   * @property {string} description - 武器描述
   * @property {string} source - 武器获取途径
   * @todo 属性值是按 1 级然后计算还是直接按 90 级计算？
   * @property {Record<string, number>} main - 武器主属性
   * @property {Record<string, number>} sub - 武器副属性
   * @return BaseInfo
   */
  export interface BaseInfo {
    refine: string
    source: string
    description: string
    main: Record<string, number>
    sub: Record<string, number>
  }

  /**
   * @description 武器精炼信息
   * @since Alpha v0.1.3
   * @interface Refine
   * @property {number} level - 精炼等级
   * @property {string} description - 精炼描述
   * @return Refine
   */
  export interface Refine {
    level: number
    description: string
  }

  /**
   * @description 武器附加信息
   * @since Alpha v0.1.3
   * @interface AddInfo
   * @property {BTMuli.Genshin.Wiki.levelUp[]} levelUps - 武器升级信息
   * @property {Story} story - 武器故事
   * @return AddInfo
   */
  export interface AddInfo {
    levelUps: BTMuli.Genshin.Wiki.levelUp[]
    story: Story
  }

  /**
   * @description 武器突破信息
   * @since Alpha v0.1.3
   * @interface BreakInfo
   * @property {number} level - 突破等级
   * @property {Material[]} materials - 突破材料
   * @property {Record<string, number>} main - 突破后主属性
   * @property {Record<string, number>[]} up - 平均提升属性
   * @return BreakInfo
   */
  export interface BreakInfo {
    level: number
    materials: Material[]
    main: Record<string, number>
    up: Array<Record<string, number>>
  }

  /**
   * @description 武器故事
   * @since Alpha v0.1.3
   * @interface Story
   * @property {string} title - 武器故事名称
   * @property {string} content - 武器故事描述
   * @return Story
   */
  export interface Story {
    title: string
    content: string
  }

  /**
   * @description 武器材料
   * @since Alpha v0.1.3
   * @interface Material
   * @todo 材料 id 与名称的对应关系
   * @property {number} id - 材料 ID
   * @property {string} name - 材料名称
   * @property {number} star - 材料星级
   * @property {string} type - 材料类型
   * @property {number} count - 材料数量
   * @property {string} source - 材料获取途径
   * @return Material
   */
  export interface Material {
    id: number
    name: string
    star: number
    type: string
    count: number
    source: string
  }
}
