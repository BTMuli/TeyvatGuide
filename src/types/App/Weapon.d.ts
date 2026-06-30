/**
 * 武器类型定义文件
 * @since Beta v0.11.0
 */

declare namespace TGApp.App.Weapon {
  /**
   * Wiki页的武器简略信息
   * @since Beta v0.6.7
   */
  type WikiBriefInfo = {
    /** 武器 ID */
    id: number;
    /** 观测枢 id */
    contentId: number;
    /** 名称 */
    name: string;
    /** 星级 */
    star: number;
    /**
     * 武器类型
     * @example 弓，法器，长柄武器，双手剑，单手剑
     */
    weapon: string;
  };

  /**
   * 转换后的武器数据
   * @since Beta v0.11.0
   */
  type WikiItem = {
    /** 武器 ID */
    id: number;
    /** 名称 */
    name: string;
    /** 简介 */
    description: string;
    /** 星级 */
    star: number;
    /**
     * 武器类型
     * @example 弓，法器，长柄武器，双手剑，单手剑
     */
    weapon: string;
    /** 养成材料 */
    materials: Array<TGApp.App.Calendar.Material>;
    /** 精炼描述 */
    affix?: TGApp.Plugins.Hutao.Weapon.RhiAffix;
    /** 初始词条(1精1级) */
    curves: Array<InitCurve>;
    /** 武器故事 */
    story: Array<string>;
  };

  /**
   * 初始词条
   * @since Beta v0.11.0
   */
  type InitCurve = {
    /** 词条类型 */
    curve: number;
    /** 属性类型 */
    prop: number;
    /** 初始值 */
    val: number;
  };

  /**
   * Prop项
   * @since Beta v0.11.0
   */
  type PropItem = {
    /** 添加的属性值 */
    addVal: number;
    /** 属性类型 */
    type: number;
  };

  /**
   * 转换后的武器突破文件
   * @since Beta v0.11.0
   */
  type WeaponPromote = Record<number, PromoteItem>;

  /**
   * 单个武器突破
   * @since Beta v0.11.0
   */
  type PromoteItem = Record<number, Array<PropItem>>;

  /**
   * 转换后的武器升级文件
   * @since Beta v0.11.0
   */
  type WeaponCurve = Record<number, Array<PropItem>>;

  /**
   * 属性值
   * @since Beta v0.11.0
   */
  type WeaponProp = {
    /** 属性类型 */
    type: number;
    /** 属性值 */
    val: number;
    /** 属性信息 */
    info: TGApp.Game.Avatar.PropMapItem;
  };
}
