/**
 * @file types/BBS/Topic.d.ts
 * @description 米游社话题类型声明
 * @since Beta v0.7.1
 */

declare namespace TGApp.BBS.Topic {
  /**
   * @description 特定话题返回数据-话题信息
   * @since Beta v0.7.1
   * @interface InfoResp
   * @extends TGApp.BBS.Response.BaseWithData
   * @property {InfoRes} data 特定话题数据
   * @return InfoResp
   */
  type InfoResp = TGApp.BBS.Response.BaseWithData<InfoRes>;

  /**
   * @description 特定话题返回数据-帖子列表
   * @since Beta v0.7.1
   * @interface PostResp
   * @extends TGApp.BBS.Response.BaseWithData
   * @property {PostRes} data 特定话题帖子列表数据
   * @return PostResp
   */
  type PostResp = TGApp.BBS.Response.BaseWithData<PostRes>;

  /**
   * @description 特定话题数据
   * @since Beta v0.7.1
   * @interface InfoRes
   * @property {Array<GameInfo>} game_info_list 游戏信息列表
   * @property {boolean} good_exist 是否有精华帖
   * @property {number} good_post_cnt 精华帖数量
   * @property {boolean} good_post_exist 是否有精华帖
   * @property {number} hot_post_cnt 热帖数量
   * @property {Array<unknown>} related_forums 相关版块
   * @property {Array<unknown>} related_topics 相关话题
   * @property {Array<unknown>} top_posts 置顶帖
   * @property {Info} topic 话题信息
   * @return InfoRes
   */
  type InfoRes = {
    game_info_list: Array<GameInfo>;
    good_exist: boolean;
    good_post_cnt: number;
    good_post_exist: boolean;
    hot_post_cnt: number;
    related_forums: Array<unknown>;
    related_topics: Array<unknown>;
    top_posts: Array<unknown>;
    topic: Info;
  };

  /**
   * @description 特定话题帖子列表数据
   * @since Beta v0.7.1
   * @interface PostRes
   * @property {boolean} is_last 是否最后一页
   * @property {boolean} is_origin 是否原创
   * @property {string} last_id 最后一条帖子 ID
   * @property {Array<TGApp.Plugins.Mys.Post.FullData>} posts 帖子列表
   * @return PostRes
   */
  type PostRes = {
    is_last: boolean;
    is_origin: boolean;
    last_id: string;
    posts: Array<TGApp.Plugins.Mys.Post.FullData>;
  };

  /**
   * @description 游戏信息
   * @since Beta v0.7.1
   * @interface GameInfo
   * @property {number} id 游戏 ID
   * @property {string} name 游戏名称
   * @property {boolean} has_good 是否有精华帖
   * @property {boolean} has_hot 是否有热帖
   * @return GameInfo
   */
  type GameInfo = { id: number; name: string; has_good: boolean; has_hot: boolean };

  /**
   * @description 话题信息
   * @since Beta v0.7.1
   * @interface Info
   * @property {Array<string>} alias 话题别名
   * @property {number} content_type 内容类型
   * @property {string} cover 封面图片 URL
   * @property {number} created_at 创建时间(秒级时间戳)
   * @property {string} creator 创建者
   * @property {number} creator_type 创建者类型
   * @property {number} default_game_id 默认游戏 ID
   * @property {string} desc 话题描述
   * @property {number} game_id 游戏 ID
   * @property {number} good_cnt 精华帖数量
   * @property {string} id 话题 ID
   * @property {number} is_deleted 是否已删除，0-未删除，1-已删除
   * @property {boolean} is_focus 是否关注
   * @property {boolean} is_interactive 是否互动
   * @property {string} name 话题名称
   * @property {number} order 排序
   * @property {unknown} related_forum_ids 相关版块 ID
   * @property {unknown} stat 话题统计-可能为null
   * @property {Array<SortConfig>} topic_sort_config 话题排序配置
   * @property {number} topic_type 话题类型
   * @property {string} updated_at 更新时间(秒级时间戳)
   * @property {Array<number>} view_type 查看类型
   * @return Info
   */
  type Info = {
    alias: Array<string>;
    content_type: number;
    cover: string;
    created_at: number;
    creator: string;
    creator_type: number;
    default_game_id: number;
    desc: string;
    game_id: number;
    good_cnt: number;
    id: string;
    is_deleted: number;
    is_focus: boolean;
    is_interactive: boolean;
    name: string;
    order: number;
    related_forum_ids: unknown;
    stat: unknown;
    topic_sort_config: Array<SortConfig>;
    topic_type: number;
    updated_at: string;
    view_type: Array<number>;
  };

  /**
   * @description 话题排序配置
   * @since Beta v0.7.1
   * @interface SortConfig
   * @property {string} name 排序名称
   * @property {number} type 排序类型
   * @property {string} url 排序 URL
   * @property {number} show_sort 展示顺序
   * @property {string} data_report_name 数据报告名称
   * @return SortConfig
   */
  type SortConfig = {
    name: string;
    type: number;
    url: string;
    show_sort: number;
    data_report_name: string;
  };
}
