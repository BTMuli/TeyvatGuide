/**
 * @file plugins Mys types Obc.d.ts
 * @description Mys obc 类型定义文件
 * @author BTMuli <bt-muli@outlook.com>
 * @since Alpha v0.2.1
 */

/**
 * @description Mys obc 类型
 * @since Alpha v0.2.1
 * @namespace Obc
 * @exports TGApp.plugins.Mys.Obc
 * @return Obc
 */
declare namespace TGApp.Plugins.Mys.Obc {
  /**
   * @description Mys obc 返回数据
   * @since Alpha v0.2.1
   * @interface Response
   * @extends TGApp.Plugins.Mys.Base.Response
   * @property {Obc[]} data.list obc 列表
   * @return Response
   */
  export interface Response extends TGApp.Plugins.Mys.Base.Response {
    data: {
      list: Obc[];
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
   * @property {unknown[]} list 列表 // todo: 未知类型
   * @return Data
   */
  export interface Data {
    id: number;
    name: string;
    parent_id: number;
    depth: number;
    ch_ext: string;
    children: Data[];
    list: unknown[];
  }
}
