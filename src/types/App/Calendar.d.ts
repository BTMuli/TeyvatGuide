/**
 * 应用素材日历相关类型定义文件
 * @since Beta v0.6.7
 */

declare namespace TGApp.App.Calendar {
  /**
   * 素材日历项
   * @since Beta v0.6.7
   */
  type Item = {
    /** 物品ID */
    id: number;
    /** 观测枢的内容ID */
    contentId: number;
    /** 掉落日期 */
    dropDays: Array<number>;
    /**
     * 物品类型
     * @remarks
     * 取值来自 {@link ItemTypeEnum} 枚举
     * - "character": 角色
     * - "weapon": 武器
     */
    itemType: string;
    /** 名称 */
    name: string;
    /** 星级 */
    star: number;
    /** 武器类型 */
    weapon: string;
    /** 元素图标 */
    element?: string;
    /** 材料 */
    materials: Array<Material>;
    /** 来源 */
    source: Source;
  };

  /**
   * 物品类型
   * @since Beta v0.9.1
   */
  const ItemType = <const>{
    /** 角色 */
    role: "character",
    /** 武器 */
    weapon: "weapon",
  };

  /**
   * 物品类型枚举
   * @since Beta v0.9.1
   */
  type ItemTypeEnum = (typeof ItemType)[keyof typeof ItemType];

  /**
   * 素材日历材料类型
   * @since Beta v0.6.7
   */
  type Material = {
    /** 材料ID */
    id: number;
    /** 材料名称 */
    name: string;
    /** 材料星级 */
    star: number;
  };

  /**
   * 素材日历来源类型
   * @since Beta v0.6.7
   */
  type Source = {
    /** 来源索引*/
    index: number;
    /** 来源区域 */
    area: string;
    /** 来源名称 */
    name: string;
  };
}
