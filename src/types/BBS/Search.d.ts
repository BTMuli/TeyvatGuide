/**
 * @file types/BBS/Search.d.ts
 * @description 米游社搜索类型声明
 * @since Beta v0.7.1
 */

declare namespace TGApp.BBS.Search {
  /**
   * @description 搜索帖子返回
   * @since Beta v0.7.1
   * @interface PostsResp
   * @extends TGApp.BBS.Response.BaseWithData
   * @property {PostsRes} data 返回数据
   * @return PostsResp
   */
  type PostsResp = TGApp.BBS.Response.BaseWithData<PostsRes>;

  /**
   * @description 搜索帖子返回数据
   * @since Beta v0.7.1
   * @interface PostsRes
   * @property {TGApp.Plugins.Mys.Post.FullData[]} posts 帖子列表
   * @property {string} last_id 索引
   * @property {boolean} is_last 是否最后一页
   * @property {string[]} token_list token 列表
   * @property {Record<string,string>} databox 数据盒
   * @return PostsRes
   */
  type PostsRes = {
    posts: Array<TGApp.Plugins.Mys.Post.FullData>;
    last_id: string;
    is_last: boolean;
    token_list: string[];
    databox: Record<string, string>;
  };
}
