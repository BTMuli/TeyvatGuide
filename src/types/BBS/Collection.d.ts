/**
 * @file types/BBS/Collection.d.ts
 * @description BBS 收藏相关类型定义文件
 * @since Beta v0.7.1
 */

declare namespace TGApp.BBS.Collection {
  /**
   * @description 用户收藏帖子数据返回
   * @since Beta v0.7.1
   * @interface UserPostResp
   * @extends TGApp.BBS.Response.BaseWithData
   * @property {UserPostRes} data - 响应数据
   * @return UserPostResp
   */
  type UserPostResp = TGApp.BBS.Response.BaseWithData<UserPostRes>;

  /**
   * @description 合集帖子返回
   * @since Beta v0.7.1
   * @interface PostsResp
   * @extends TGApp.BBS.Response.BaseWithData
   * @property {PostsRes} data - 返回数据
   * @return PostsResp
   */
  type PostsResp = TGApp.BBS.Response.BaseWithData & {
    data: { posts: Array<TGApp.Plugins.Mys.Post.FullData> };
  };

  /**
   * @description 用户收藏帖子响应数据
   * @since Beta v0.7.1
   * @interface UserPostRes
   * @property {boolean} is_last - 是否最后一页
   * @property {string} next_offset - 下一页偏移量
   * @property {Array<TGApp.Plugins.Mys.Post.FullData>} list - 帖子列表
   * @return UserPostRes
   */
  type UserPostRes = {
    is_last: boolean;
    next_offset: string;
    list: Array<TGApp.Plugins.Mys.Post.FullData>;
  };
}
