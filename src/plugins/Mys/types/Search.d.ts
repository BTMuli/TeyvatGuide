/**
 * @file plugins/Mys/types/Search.d.ts
 * @description Mys 插件搜索类型声明
 * @since Beta v0.4.5
 */

/**
 * @description 搜索帖子返回
 * @since Beta v0.4.5
 * @namespace TGApp.Plugins.Mys.Search
 * @memberof TGApp.Plugins.Mys
 */
declare namespace TGApp.Plugins.Mys.Search {
  /**
   * @description 搜索帖子返回
   * @since Beta v0.4.5
   * @interface PostsResponse
   * @extends TGApp.BBS.Response.BaseWithData
   * @property {PostsResponseData} data 返回数据
   * @return PostsResponse
   */
  interface PostsResponse extends TGApp.BBS.Response.BaseWithData {
    data: PostsResponseData;
  }

  /**
   * @description 搜索帖子返回数据
   * @since Beta v0.4.5
   * @interface PostsResponseData
   * @property {TGApp.Plugins.Mys.Post.FullData[]} posts 帖子列表
   * @property {string} last_id 索引
   * @property {boolean} is_last 是否最后一页
   * @property {string[]} token_list token 列表
   * @property {Record<string,string>} databox 数据盒
   * @return PostsResponseData
   */
  interface PostsResponseData {
    posts: TGApp.Plugins.Mys.Post.FullData[];
    last_id: string;
    is_last: boolean;
    token_list: string[];
    databox: Record<string, string>;
  }
}
