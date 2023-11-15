/**
 * @file plugins/Mys/types/Obc.d.ts
 * @description Mys obc 类型定义文件
 * @since Alpha v0.2.1
 */

/**
 * @description Mys obc 类型
 * @since Alpha v0.2.1
 * @namespace TGApp.Plugins.Mys.Obc
 * @memberof TGApp.Plugins.Mys
 */
declare namespace TGApp.Plugins.Mys.Obc {
  /**
   * @description Mys obc 返回数据
   * @since Beta v0.3.6
   * @interface Response
   * @extends TGApp.BBS.Response.BaseWithData
   * @property {Data[]} data.list obc 列表
   * @return Response
   */
  interface Response extends TGApp.BBS.Response.BaseWithData {
    data: {
      list: Data[];
    };
  }

  /**
   * @description Mys obc 层级结构
   * @since Alpha v0.2.1
   * @interface Data
   * @property {number} id ID
   * @property {string} name 名称
   * @property {number} parent_id 父ID
   * @property {number} depth 深度
   * @property {string} ch_ext 结构化扩展信息
   * @property {Obc[]} children 子节点，可以递归
   * @property {unknown[]} list 列表
   * @return Data
   */
  interface Data {
    id: number;
    name: string;
    parent_id: number;
    depth: number;
    ch_ext: string;
    children: Data[];
    list: unknown[];
  }
}
