/**
 * @file plugins/Mys/types/Forum.d.ts
 * @description Mys 插件论坛类型定义文件
 * @since Beta v0.3.7
 */

/**
 * @description Mys 插件论坛类型
 * @since Beta v0.3.7
 * @namespace TGApp.Plugins.Mys.Forum
 * @memberof TGApp.Plugins.Mys
 */
declare namespace TGApp.Plugins.Mys.Forum {
  /**
   * @description 特定论坛返回数据
   * @since Beta v0.3.7
   * @interface Response
   * @extends TGApp.BBS.Response.BaseWithData
   * @property {FullData} data 特定论坛数据
   * @return Response
   */
  interface Response extends TGApp.BBS.Response.BaseWithData {
    data: FullData;
  }

  /**
   * @description 特定论坛数据
   * @since Beta v0.3.7
   * @interface FullData
   * @property {number} last_id 最后一条帖子 ID
   * @property {boolean} is_last 是否最后一页
   * @property {boolean} is_origin 是否原创
   * @property {string} page 页码
   * @property {unknown} databox 数据盒子
   * @property {TGApp.Plugins.Mys.News.Item[]} list 帖子列表
   * @return FullData
   */
  interface FullData {
    last_id: number;
    is_last: boolean;
    is_origin: boolean;
    page: string;
    databox: unknown;
    list: TGApp.Plugins.Mys.News.Item[];
  }
}
