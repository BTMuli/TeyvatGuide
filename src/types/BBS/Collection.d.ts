/**
 * @file types/BBS/Collection.d.ts
 * @description BBS 收藏相关类型定义文件
 * @since Beta v0.7.2
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
   * @description 用户收藏帖子响应数据
   * @since Beta v0.7.1
   * @interface UserPostRes
   * @property {boolean} is_last - 是否最后一页
   * @property {string} next_offset - 下一页偏移量
   * @property {Array<TGApp.BBS.Post.FullData>} list - 帖子列表
   * @return UserPostRes
   */
  type UserPostRes = {
    is_last: boolean;
    next_offset: string;
    list: Array<TGApp.BBS.Post.FullData>;
  };

  /**
   * @description 合集帖子返回
   * @since Beta v0.7.1
   * @interface PostsResp
   * @extends TGApp.BBS.Response.BaseWithData
   * @property {PostsRes} data - 返回数据
   * @return PostsResp
   */
  type PostsResp = TGApp.BBS.Response.BaseWithData<PostsRes>;

  /**
   * @description 帖子列表数据
   * @since Beta v0.7.1
   * @interface PostsRes
   * @property {Array<TGApp.BBS.Post.FullData>} posts - 帖子列表
   * @return PostsRes
   */
  type PostsRes = { posts: Array<TGApp.BBS.Post.FullData> };

  /**
   * @description 合集信息返回
   * @since Beta v0.7.2
   * @interface InfoResp
   * @extends TGApp.BBS.Response.BaseWithData
   * @property {InfoRes} data - 返回数据
   * @return InfoResp
   */
  type InfoResp = TGApp.BBS.Response.BaseWithData<InfoRes>;

  /**
   * @description 合集信息数据
   * @since Beta v0.7.2
   * @interface InfoRes
   * @property {Collection} collection_info - 合集信息
   * @property {User} author_info - 用户信息
   * @return InfoRes
   */
  type InfoRes = { collection_info: Collection; author_info: User };

  /**
   * @description 合集信息
   * @since Beta v0.7.2
   * @interface Collection
   * @property {number} id - 合集 ID
   * @property {string} title - 合集标题
   * @property {string} cover - 合集封面
   * @property {number} post_num - 帖子数量
   * @property {number} view_num - 浏览数量
   * @property {number} post_updated_at - 最后更新时间(秒级时间戳)
   * @property {string} desc - 合集描述
   * @property {boolean} is_delete - 是否删除
   * @property {boolean} is_following - 是否关注
   * @property {number} uid - 用户 ID
   * @property {number} status - 状态
   * @return Collection
   */
  type Collection = {
    id: number;
    title: string;
    cover: string;
    post_num: number;
    view_num: number;
    post_updated_at: number;
    desc: string;
    is_delete: boolean;
    is_following: boolean;
    uid: number;
    status: number;
  };

  /**
   * @description 用户信息
   * @since Beta v0.7.2
   * @interface User
   * @property {string} uid - 用户 ID
   * @property {string} nickname - 用户昵称
   * @property {string} introduce - 用户介绍
   * @property {string} avatar - 用户头像
   * @property {number} gender - 用户性别
   * @property {TGApp.BBS.User.Certification} certification - 用户认证信息
   * @property {boolean} is_following - 是否关注
   * @property {boolean} is_followed - 是否被关注
   * @property {string} avatar_url - 用户头像 URL
   * @property {string} pendant - 用户挂件
   * @return User
   */
  type User = {
    uid: string;
    nickname: string;
    introduce: string;
    avatar: string;
    gender: number;
    certification: TGApp.BBS.User.Certification;
    is_following: boolean;
    is_followed: boolean;
    avatar_url: string;
    pendant: string;
  };
}
