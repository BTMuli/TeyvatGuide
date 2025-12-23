/**
 * 武器类型定义文件
 * @since Beta v0.6.7
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
   * @since Beta v0.4.1
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
    /** 武器故事 */
    story: Array<string>;
  };
}
