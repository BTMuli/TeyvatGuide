/**
 * @file types/App/Material.d.ts
 * @description 应用素材日历相关类型定义文件
 * @since Beta v0.4.2
 */

declare namespace TGApp.App.Material {
  /**
   * @description wiki 页的信息
   * @since Beta v0.4.2
   * @interface WikiItem
   * @property {number} id - 材料id
   * @property {string} name - 材料名称
   * @property {string} description - 材料简介
   * @property {string} type - 材料类型
   * @property {number} star - 材料星级
   * @property {Source[]} source - 材料来源
   * @property {Convert[]} convert - 材料转换
   * @return WikiItem
   */
  interface WikiItem {
    id: number;
    name: string;
    description: string;
    type: string;
    star: number;
    source: Source[];
    convert: Convert[];
  }

  /**
   * @description 材料来源
   * @since Beta v0.4.2
   * @interface Source
   * @property {string} name - 来源名称
   * @property {string} type - 来源类型
   * @property {string[]} days - 来源日
   * @return Source
   */
  interface Source {
    name: string;
    type: string;
    days?: string[];
  }

  /**
   * @description 材料转换
   * @since Beta v0.4.2
   * @interface Convert
   * @property {string} id 转换ID
   * @property {string} souce[].id 转换前材料ID
   * @property {string} souce[].name 转换前材料名称
   * @property {string} source[].type 转换前材料类型
   * @property {number} source[].star 转换前材料星级
   * @property {number} souce[].count 转换前材料数量
   * @return Convert
   */
  interface Convert {
    id: string;
    source: Array<{
      id: string;
      name: string;
      type: string;
      star: number;
      count: number;
    }>;
  }
}
