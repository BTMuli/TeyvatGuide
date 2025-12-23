/**
 * 米社版块类型
 * @since Beta v0.8.4
 */

declare namespace TGApp.BBS.Forum {
  /**
   * 获取所有版块信息返回
   * @since Beta v0.6.8
   */
  type GameForumResp = TGApp.BBS.Response.BaseWithData & {
    /** 所有版块信息 */
    data: {
      list: Array<GameForum>;
    };
  };

  /**
   * 获取版块帖子列表返回
   * @since Beta v0.7.1
   */
  type PostForumResp = TGApp.BBS.Response.BaseWithData<PostForumRes>;

  /**
   * 分区版块信息
   * @since Beta v0.6.8
   */
  type GameForum = {
    /** 游戏 ID */
    game_id: number;
    /** 版块信息 */
    forums: Array<GameForumItem>;
  };

  /**
   * 版块信息
   * @since Beta v0.6.8
   */
  type GameForumItem = {
    /** 版块 ID */
    id: number;
    /** 游戏 ID */
    game_id: number;
    /** 版块名称 */
    name: string;
    /** 排序 */
    order: number;
    /** 父版块 ID */
    f_id: number;
    /** 是否可见（1 可见，0 不可见） */
    visible: number;
    /** 创建类型 */
    create_type: number;
    /** 发帖限制 */
    post_limit: number;
    /** 最大置顶数 */
    max_top: number;
    /** 发帖排序（如 reply 表示按最新回复） */
    post_order: string;
    /** 来源类型 */
    src_type: number;
    /** 图标 */
    icon: string;
    /** 头图 */
    header_image: string;
    /** 热度 */
    hot_score: number;
    /** 纯图标 */
    icon_pure: string;
    /** 描述 */
    des: string;
    /** 帖子数 */
    post_num: number;
    /** 今日帖子数 */
    today_post: number;
    /** 回复类型 */
    reply_type: number;
    /** 编辑帖子权限 */
    edit_post: number;
    /** 创建时间（格式：yyyy-MM-dd HH:mm:ss） */
    created_at: string;
    /** 更新时间（格式：yyyy-MM-dd HH:mm:ss） */
    updated_at: string;
    /** 显示类型 */
    show_type: number;
    /** 默认标签 */
    default_tab: number;
    /** 说明 */
    read_me: string;
    /** 分类列表 */
    forum_cate_list: Array<ForumCate>;
    /** 视频分类列表 */
    video_cat_list: Array<ForumCate>;
  };

  /**
   * 视频分类
   * @since Beta v0.8.4
   */
  type ForumCate = {
    /** 分类 ID */
    id: number;
    /** 分类名称 */
    name: string;
    /** 版块 ID */
    forum_id: number;
    /** 描述 */
    desc?: string;
    /** 备注 */
    remark?: string;
  };

  /**
   * 版块帖子列表
   * @since Beta v0.7.2
   */
  type PostForumRes = {
    /** 最后一条帖子 ID */
    last_id: string;
    /** 是否最后一页 */
    is_last: boolean;
    /** 是否原创 */
    is_origin: boolean;
    /** 当前页码 */
    page: number;
    /** 数据盒子 */
    databox: unknown;
    /** 帖子列表 */
    list: Array<TGApp.BBS.Post.FullData>;
  };
}
