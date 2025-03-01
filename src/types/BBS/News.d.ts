/**
 * @file types/BBS/News.d.ts
 * @description BBS 咨讯类型定义
 * @since Beta v0.7.1
 */

declare namespace TGApp.BBS.News {
  /**
   * @description 咨讯返回数据
   * @since Beta v0.7.1
   * @interface Resp
   * @extends TGApp.BBS.Response.BaseWithData
   * @property {Res} data 咨讯数据
   * @return Resp
   */
  type Resp = TGApp.BBS.Response.BaseWithData<Res>;

  /**
   * @description 咨讯数据
   * @since Beta v0.7.1
   * @interface Res
   * @property {number} last_id 最后一条咨讯 ID
   * @property {boolean} is_last 是否最后一页
   * @property {Array<TGApp.Plugins.Mys.Post.FullData>} list 咨讯列表
   * @return Res
   */
  type Res = {
    last_id: number;
    is_last: boolean;
    list: Array<TGApp.Plugins.Mys.Post.FullData>;
  };
}
