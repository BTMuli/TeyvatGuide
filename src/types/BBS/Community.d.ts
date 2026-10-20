/**
 * 米游社个人中心类型定义文件
 * @since Beta v0.12.6
 */

declare namespace TGApp.BBS.Community {
  /**
   * 个人中心列表响应
   * @since Beta v0.12.6
   * @typeParam T - 列表分页数据类型
   */
  type BaseResp<T> = Omit<TGApp.BBS.Response.Base, "data"> & {
    /** 响应数据 */
    data: T;
  };

  /**
   * 我的评论返回响应
   * @since Beta v0.12.6
   */
  type CommentsResp = BaseResp<CommentsRes>;

  /**
   * 我的评论返回数据
   * @since Beta v0.12.6
   */
  type CommentsRes = {
    /** 评论列表 */
    list: Array<Comment>;
    /** 是否最后一页 */
    is_last: boolean;
    /** 下一页偏移量 */
    next_offset: string;
  };

  /**
   * 收藏帖子返回响应
   * @since Beta v0.12.6
   */
  type FavoritesResp = BaseResp<FavoritesRes>;

  /**
   * 收藏帖子返回数据
   * @since Beta v0.12.6
   */
  type FavoritesRes = {
    /** 收藏帖子列表 */
    list: Array<TGApp.BBS.Post.FullData>;
    /** 是否最后一页 */
    is_last: boolean;
    /** 下一页偏移量 */
    next_offset: string;
  };

  /**
   * 个人评论条目
   * @since Beta v0.12.6
   */
  type Comment = Omit<TGApp.BBS.Reply.ReplyFull, "r_reply" | "r_post"> & {
    /** 被回复的评论 */
    r_reply: TGApp.BBS.Reply.Reply | null;
    /** 被回复的帖子 */
    r_post: TGApp.BBS.Post.Post | null;
  };

  /**
   * 我的合集返回响应
   * @since Beta v0.12.6
   */
  type CollectionsResp = BaseResp<CollectionsRes>;

  /**
   * 我的合集返回数据
   * @since Beta v0.12.6
   */
  type CollectionsRes = {
    /** 合集列表 */
    list: Array<TGApp.BBS.Collection.Collection>;
    /** 是否最后一页 */
    is_last: boolean;
    /** 下一页偏移量 */
    next_offset: string;
  };

  /**
   * 收藏合集返回响应
   * @since Beta v0.12.6
   */
  type FavoriteCollectionsResp = BaseResp<FavoriteCollectionsRes>;

  /**
   * 收藏合集返回数据
   * @since Beta v0.12.6
   */
  type FavoriteCollectionsRes = {
    /** 收藏合集列表 */
    list: Array<TGApp.BBS.Collection.Collection>;
    /** 是否最后一页 */
    is_last: boolean;
    /** 下一页偏移量 */
    next_offset: string;
  };

  /**
   * 我的关注返回响应
   * @since Beta v0.12.6
   */
  type FollowingResp = BaseResp<FollowingRes>;

  /**
   * 我的关注返回数据
   * @since Beta v0.12.6
   */
  type FollowingRes = {
    /** 用户列表 */
    result: Array<UserRelation>;
    /** 是否最后一页 */
    is_last: boolean;
    /** 下一页最后 ID */
    last_id: string;
  };

  /**
   * 我的粉丝返回响应
   * @since Beta v0.12.6
   */
  type FollowersResp = BaseResp<FollowersRes>;

  /**
   * 我的粉丝返回数据
   * @since Beta v0.12.6
   */
  type FollowersRes = {
    /** 用户列表 */
    result: Array<UserRelation>;
    /** 是否最后一页 */
    is_last: boolean;
    /** 下一页最后 ID */
    last_id: string;
  };

  /**
   * 关注关系条目
   * @since Beta v0.12.6
   */
  type UserRelation = {
    /** 用户信息 */
    user: User;
    /** 当前用户是否关注该用户 */
    is_follow: boolean;
    /** 当前用户是否被该用户关注 */
    is_followed: boolean;
    /** 是否为新用户 */
    is_new: boolean;
    /** 当前列表关系是否为关注 */
    is_following: boolean;
  };

  /**
   * 关注关系中的用户信息
   * @since Beta v0.12.6
   */
  type User = {
    /** 用户 ID */
    uid: string;
    /** 用户昵称 */
    nickname: string;
    /** 用户简介 */
    introduce: string;
    /** 用户头像编号 */
    avatar: string;
    /** 用户性别 */
    gender: number;
    /** 用户认证信息 */
    certification: TGApp.BBS.User.Certification;
    /** 用户头像链接 */
    avatar_url: string;
    /** 创建时间 */
    created_at: number;
    /** 用户挂件 URL */
    pendant: string;
    /** 是否注销 */
    is_logoff: boolean;
    /** 用户头像扩展信息，官方接口可能返回 null */
    avatar_ext: TGApp.BBS.User.AvatarExt | null;
    /** 用户认证信息列表 */
    certifications: Array<TGApp.BBS.User.Certification>;
  };
}
