/**
 * 应用素材日历相关类型定义文件
 * @since Beta v0.11.3
 */

declare namespace TGApp.App.Material {
  /**
   * WIKI信息
   * @since Beta v0.11.3
   */
  type WikiItem = {
    /** 材料ID */
    id: number;
    /** 材料名称 */
    name: string;
    /** 材料简介 */
    description: string;
    /** 材料类型 */
    type: string;
    /** 自定义材料归并分类 */
    cType: string;
    /** 材料星级 */
    star: number;
    /** 材料来源 */
    source: Array<Source>;
    /** 材料转换 */
    convert: Array<Convert>;
  };

  /**
   * WIKI 料理食材
   * @since Beta v0.11.3
   */
  type WikiFoodInput = {
    /** 食材 ID */
    id: number;
    /** 食材名称 */
    name: string;
    /** 食材图标 */
    icon: string;
    /** 所需数量 */
    count: number;
  };

  /**
   * WIKI 料理信息
   * @since Beta v0.11.3
   */
  type WikiFood = {
    /** 料理 ID */
    id: number;
    /** 料理效果 */
    effect: Array<string>;
    /** 料理效果图标 */
    effectIcon?: string;
    /** 料理食材 */
    input: Array<WikiFoodInput>;
  };

  /**
   * 材料来源
   * @since Beta v0.4.4
   */
  type Source = {
    /** 来源名称 */
    name: string;
    /** 来源类型 */
    type: string;
    /** 掉落日期 */
    days?: Array<number>;
  };

  /**
   * 材料转换
   * @since Beta v0.9.0
   */
  type Convert = {
    /** 合成ID */
    id: string;
    /** 合成材料 */
    source: Array<ConvertSrc>;
  };

  /**
   * 转换来源
   * @since Beta v0.9.1
   */
  type ConvertSrc = {
    /** 材料ID */
    id: string;
    /** 材料名称 */
    name: string;
    /** 材料类型 */
    type: string;
    /** 材料星级 */
    star: number;
    /** 需要数量 */
    count: number;
  };
}
