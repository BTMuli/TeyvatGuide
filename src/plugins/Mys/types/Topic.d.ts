/**
 * @file plugins/Mys/types/Topic.d.ts
 * @description Mys 插件话题类型定义文件
 * @since Beta v0.6.3
 */

declare namespace TGApp.Plugins.Mys.Topic {
  /**
   * @description 特定话题返回数据-话题信息
   * @since Beta v0.6.3
   * @interface InfoResponse
   * @extends TGApp.BBS.Response.BaseWithData
   * @property {InfoData} data 特定话题数据
   * @return InfoResponse
   */
  interface InfoResponse extends TGApp.BBS.Response.BaseWithData {
    data: InfoData;
  }

  /**
   * @description 特定话题返回数据-帖子列表
   * @since Beta v0.6.3
   * @interface PostResponse
   * @extends TGApp.BBS.Response.BaseWithData
   * @property {PostData} data 特定话题帖子列表数据
   * @return PostResponse
   */
  interface PostResponse extends TGApp.BBS.Response.BaseWithData {
    data: PostData;
  }

  /**
   * @description 特定话题数据
   * @since Beta v0.6.3
   * @interface InfoData
   * @property {GameInfo[]} game_info_list 游戏信息列表
   * @property {boolean} good_exist 是否有精华帖
   * @property {number} good_post_cnt 精华帖数量
   * @property {boolean} good_post_exist 是否有精华帖
   * @property {number} hot_post_cnt 热帖数量
   * @property {unknown[]} related_forums 相关版块
   * @property {unknown[]} related_topics 相关话题
   * @property {unknown[]} top_posts 置顶帖
   * @property {Info} topic 话题信息
   * @return InfoData
   */
  interface InfoData {
    game_info_list: GameInfo[];
    good_exist: boolean;
    good_post_cnt: number;
    good_post_exist: boolean;
    hot_post_cnt: number;
    related_forums: unknown[];
    related_topics: unknown[];
    top_posts: unknown[];
    topic: Info;
  }

  /**
   * @description 特定话题帖子列表数据
   * @since Beta v0.6.3
   * @interface PostData
   * @property {boolean} is_last 是否最后一页
   * @property {boolean} is_origin 是否原创
   * @property {string} last_id 最后一条帖子 ID
   * @property {TGApp.Plugins.Mys.Post.FullData[]} posts 帖子列表
   * @return PostData
   */
  interface PostData {
    is_last: boolean;
    is_origin: boolean;
    last_id: string;
    posts: TGApp.Plugins.Mys.Post.FullData[];
  }

  /**
   * @description 游戏信息
   * @since Beta v0.6.3
   * @interface GameInfo
   * @property {number} id 游戏 ID
   * @property {string} name 游戏名称
   * @property {boolean} has_good 是否有精华帖
   * @property {boolean} has_hot 是否有热帖
   * @return GameInfo
   */
  interface GameInfo {
    id: number;
    name: string;
    has_good: boolean;
    has_hot: boolean;
  }

  /**
   * @description 话题信息
   * @since Beta v0.6.3
   * @interface Info
   * @property {string[]} alias 话题别名
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
   * @property {SortConfig[]} topic_sort_config 话题排序配置
   * @property {number} topic_type 话题类型
   * @property {string} updated_at 更新时间(秒级时间戳)
   * @property {number[]} view_type 查看类型
   * @return Info
   */
  interface Info {
    alias: string[];
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
    topic_sort_config: SortConfig[];
    topic_type: number;
    updated_at: string;
    view_type: number[];
  }

  /**
   * @description 话题排序配置
   * @since Beta v0.6.3
   * @interface SortConfig
   * @property {string} name 排序名称
   * @property {number} type 排序类型
   * @property {string} url 排序 URL
   * @property {number} show_sort 展示顺序
   * @property {string} data_report_name 数据报告名称
   * @return SortConfig
   */
  interface SortConfig {
    name: string;
    type: number;
    url: string;
    show_sort: number;
    data_report_name: string;
  }
}
