/**
 * BBS 收藏相关类型定义文件
 * @since Beta v0.13.0
 */

declare namespace TGApp.BBS.Collection {
  /**
   * 用户收藏帖子数据返回
   * @since Beta v0.7.1
   */
  type UserPostResp = TGApp.BBS.Response.BaseWithData<UserPostRes>;

  /**
   * 用户收藏帖子响应数据
   * @since Beta v0.7.1
   */
  type UserPostRes = {
    /** 是否最后一页 */
    is_last: boolean;
    /** 下一页偏移量 */
    next_offset: string;
    /** 帖子列表 */
    list: Array<TGApp.BBS.Post.FullData>;
  };

  /**
   * 合集帖子返回
   * @since Beta v0.7.1
   */
  type PostsResp = TGApp.BBS.Response.BaseWithData<PostsRes>;

  /**
   * 帖子列表数据
   * @since Beta v0.7.1
   */
  type PostsRes = {
    /** 帖子列表 */
    posts: Array<TGApp.BBS.Post.FullData>;
  };

  /**
   * 合集信息返回
   * @since Beta v0.7.2
   */
  type InfoResp = TGApp.BBS.Response.BaseWithData<InfoRes>;

  /**
   * 合集信息数据
   * @since Beta v0.7.2
   */
  type InfoRes = {
    /** 合集信息 */
    collection_info: Collection;
    /** 用户信息 */
    author_info: User;
  };

  /**
   * 合集信息
   * @since Beta v0.7.2
   */
  type Collection = {
    /** 合集 ID */
    id: number;
    /** 合集标题 */
    title: string;
    /** 合集封面 */
    cover: string;
    /** 帖子数量 */
    post_num: number;
    /** 浏览数量 */
    view_num: number;
    /** 最后更新时间（秒级时间戳） */
    post_updated_at: number;
    /** 合集描述 */
    desc: string;
    /** 是否删除 */
    is_delete: boolean;
    /** 是否关注 */
    is_following: boolean;
    /** 用户 ID */
    uid: number;
    /** 状态 */
    status: number;
  };

  /**
   * 合集创建参数
   * @since Beta v0.13.0
   */
  type CreateParams = {
    /** 合集标题 */
    title: string;
    /** 合集描述 */
    desc: string;
    /** 合集封面 */
    cover: string;
  };

  /**
   * 合集编辑参数
   * @since Beta v0.13.0
   */
  type EditParams = CreateParams & {
    /** 合集 ID */
    id: number;
  };

  /**
   * 合集删除参数
   * @since Beta v0.13.0
   */
  type DeleteParams = {
    /** 合集 ID */
    id: number;
  };

  /**
   * 合集排序参数
   * @since Beta v0.13.0
   */
  type SortParams = {
    /** 按新顺序排列的合集 ID 列表 */
    ids: Array<number>;
  };

  /**
   * 创建合集响应
   * @since Beta v0.13.0
   */
  type CreateResp = TGApp.BBS.Community.BaseResp<CreateRes>;

  /**
   * 创建合集响应数据
   * @since Beta v0.13.0
   */
  type CreateRes = {
    /** 新合集 ID */
    id: number;
  };

  /**
   * 合集管理响应
   * @since Beta v0.13.0
   */
  type ManageResp = TGApp.BBS.Community.BaseResp<unknown>;

  /**
   * 用户信息
   * @since Beta v0.7.2
   */
  type User = {
    /** 用户 ID */
    uid: string;
    /** 用户昵称 */
    nickname: string;
    /** 用户介绍 */
    introduce: string;
    /** 用户头像 */
    avatar: string;
    /** 用户性别 */
    gender: number;
    /** 用户认证信息 */
    certification: TGApp.BBS.User.Certification;
    /** 是否关注 */
    is_following: boolean;
    /** 是否被关注 */
    is_followed: boolean;
    /** 用户头像 URL */
    avatar_url: string;
    /** 用户挂件 */
    pendant: string;
  };
}
