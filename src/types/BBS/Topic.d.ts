/**
 * 米游社话题类型声明
 * @since Beta v0.7.1
 */
declare namespace TGApp.BBS.Topic {
  /**
   * 特定话题返回数据 - 话题信息
   * @since Beta v0.7.1
   */
  type InfoResp = TGApp.BBS.Response.BaseWithData<InfoRes>;

  /**
   * 特定话题返回数据 - 帖子列表
   * @since Beta v0.7.1
   */
  type PostResp = TGApp.BBS.Response.BaseWithData<PostRes>;

  /**
   * 特定话题数据
   * @since Beta v0.7.1
   */
  type InfoRes = {
    /** 游戏信息列表 */
    game_info_list: Array<GameInfo>;
    /** 是否有精华帖 */
    good_exist: boolean;
    /** 精华帖数量 */
    good_post_cnt: number;
    /** 是否有精华帖 */
    good_post_exist: boolean;
    /** 热帖数量 */
    hot_post_cnt: number;
    /** 相关版块 */
    related_forums: Array<unknown>;
    /** 相关话题 */
    related_topics: Array<unknown>;
    /** 置顶帖 */
    top_posts: Array<unknown>;
    /** 话题信息 */
    topic: Info;
  };

  /**
   * 特定话题帖子列表数据
   * @since Beta v0.7.1
   */
  type PostRes = {
    /** 是否最后一页 */
    is_last: boolean;
    /** 是否原创 */
    is_origin: boolean;
    /** 最后一条帖子 ID */
    last_id: string;
    /** 帖子列表 */
    posts: Array<TGApp.BBS.Post.FullData>;
  };

  /**
   * 游戏信息
   * @since Beta v0.7.1
   */
  type GameInfo = {
    /** 游戏 ID */
    id: number;
    /** 游戏名称 */
    name: string;
    /** 是否有精华帖 */
    has_good: boolean;
    /** 是否有热帖 */
    has_hot: boolean;
  };

  /**
   * 话题信息
   * @since Beta v0.7.1
   */
  type Info = {
    /** 话题别名 */
    alias: Array<string>;
    /** 内容类型 */
    content_type: number;
    /** 封面图片 URL */
    cover: string;
    /** 创建时间（秒级时间戳） */
    created_at: number;
    /** 创建者 */
    creator: string;
    /** 创建者类型 */
    creator_type: number;
    /** 默认游戏 ID */
    default_game_id: number;
    /** 话题描述 */
    desc: string;
    /** 游戏 ID */
    game_id: number;
    /** 精华帖数量 */
    good_cnt: number;
    /** 话题 ID */
    id: string;
    /** 是否已删除，0-未删除，1-已删除 */
    is_deleted: number;
    /** 是否关注 */
    is_focus: boolean;
    /** 是否互动 */
    is_interactive: boolean;
    /** 话题名称 */
    name: string;
    /** 排序 */
    order: number;
    /** 相关版块 ID */
    related_forum_ids: unknown;
    /** 话题统计，可能为 null */
    stat: unknown;
    /** 话题排序配置 */
    topic_sort_config: Array<SortConfig>;
    /** 话题类型 */
    topic_type: number;
    /** 更新时间（秒级时间戳） */
    updated_at: string;
    /** 查看类型 */
    view_type: Array<number>;
  };

  /**
   * 话题排序配置
   * @since Beta v0.7.1
   */
  type SortConfig = {
    /** 排序名称 */
    name: string;
    /** 排序类型 */
    type: number;
    /** 排序 URL */
    url: string;
    /** 展示顺序 */
    show_sort: number;
    /** 数据报告名称 */
    data_report_name: string;
  };
}
