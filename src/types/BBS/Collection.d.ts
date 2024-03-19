/**
 * @file types/BBS/Collection.d.ts
 * @description BBS 收藏相关类型定义文件
 * @since Beta v0.4.5
 */

/**
 * @description BBS 收藏命名空间
 * @since Beta v0.4.5
 * @namespace TGApp.BBS.Collection
 * @memberof TGApp.BBS
 */
declare namespace TGApp.BBS.Collection {
  /**
   * @description 用户收藏帖子数据返回
   * @since Beta v0.4.5
   * @interface PostResponse
   * @extends TGApp.BBS.Response.BaseWithData
   * @property {PostRespData} data - 响应数据
   * @return PostResponse
   */
  interface PostResponse extends TGApp.BBS.Response.BaseWithData {
    data: PostRespData;
  }

  /**
   * @description 用户收藏帖子响应数据
   * @since Beta v0.4.5
   * @interface PostRespData
   * @property {boolean} is_last - 是否最后一页
   * @property {string} next_offset - 下一页偏移量
   * @property {Array<TGApp.Plugins.Mys.Post.FullData>} list - 帖子列表
   * @return PostRespData
   */
  interface PostRespData {
    is_last: boolean;
    next_offset: string;
    list: TGApp.Plugins.Mys.Post.FullData[];
  }
}
