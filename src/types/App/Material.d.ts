/**
 * 应用素材日历相关类型定义文件
 * @since Beta v0.9.0
 */

declare namespace TGApp.App.Material {
  /**
   * WIKI信息
   * @since Beta v0.4.2
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
    /** 材料星级 */
    star: number;
    /** 材料来源 */
    source: Array<Source>;
    /** 材料转换 */
    convert: Array<Convert>;
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
   * @since Beta v0.9.0
   */
  type ConvertSrc = {
    /** 材料ID */
    id: number;
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
