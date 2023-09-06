/**
 * @file plugins Mys types news.d.ts
 * @description Mys 插件咨讯类型定义文件
 * @author BTMuli <bt-muli@outlook.com>
 * @since Alpha v0.2.1
 */

/**
 * @description Mys 插件咨讯类型
 * @since Alpha v0.2.1
 * @namespace News
 * @return News
 */
declare namespace TGApp.Plugins.Mys.News {
  /**
   * @description 咨讯返回数据
   * @since Alpha v0.2.1
   * @interface Response
   * @extends TGApp.Plugins.Mys.Base.Response
   * @property {FullData} data 咨讯数据
   * @return Response
   */
  export interface Response extends TGApp.Plugins.Mys.Base.Response {
    data: FullData;
  }

  /**
   * @description 咨讯数据
   * @since Alpha v0.2.1
   * @interface FullData
   * @property {number} last_id 最后一条咨讯 ID
   * @property {boolean} is_last 是否最后一页
   * @property {Item[]} list 咨讯列表
   * @return FullData
   */
  export interface FullData {
    last_id: number;
    is_last: boolean;
    list: Item[];
  }

  /**
   * @description 咨讯列表项
   * @since Alpha v0.2.1
   * @interface Item
   * @property {TGApp.Plugins.Mys.Post.Post} post 帖子
   * @property {TGApp.Plugins.Mys.Post.Forum} forum 版块
   * @property {TGApp.Plugins.Mys.Post.Topic[]} topics 话题
   * @property {TGApp.Plugins.Mys.User.Post} user 发帖用户
   * @property {TGApp.Plugins.Mys.User.SelfOperation} self_operation 用户操作
   * @property {TGApp.Plugins.Mys.Post.Stat} stat 帖子统计
   * @property {TGApp.Plugins.Mys.Post.HelpSys} help_sys 帮助系统，可能为 null
   * @property {TGApp.Plugins.Mys.Post.Image} cover 封面图片 URL
   * @property {TGApp.Plugins.Mys.Post.Image[]} image_list 图片列表
   * @property {boolean} is_official_master 是否为官方
   * @property {boolean} is_user_master 是否用户
   * @property {boolean} hot_reply_exist 是否热门回复
   * @property {number} vote_count 投票数
   * @property {number} last_modify_time 最后修改时间
   * @property {string} recommend_type 推荐类型
   * @property {unknown} collection 合集, 可能为 null
   * @property {unknown[]} vod_list 视频列表
   * @property {boolean} is_block_on 是否屏蔽
   * @property {unknown} forum_rank_info 版块排名信息，可能为 null
   * @property {unknown[]} link_card_list 链接卡片列表，可能为 null
   * @property {Meta} news_meta 元数据
   * @returns Item
   */
  export interface Item {
    post: TGApp.Plugins.Mys.Post.Post;
    forum: TGApp.Plugins.Mys.Post.Forum;
    topics: TGApp.Plugins.Mys.Post.Topic[];
    user: TGApp.Plugins.Mys.User.Post;
    self_operation: TGApp.Plugins.Mys.User.SelfOperation;
    stat: TGApp.Plugins.Mys.Post.Stat;
    help_sys: TGApp.Plugins.Mys.Post.HelpSys;
    cover: TGApp.Plugins.Mys.Post.Image;
    image_list: TGApp.Plugins.Mys.Post.Image[];
    is_official_master: boolean;
    is_user_master: boolean;
    hot_reply_exist: boolean;
    vote_count: number;
    last_modify_time: number;
    recommend_type: string;
    collection: unknown;
    vod_list: unknown[];
    is_block_on: boolean;
    forum_rank_info: unknown;
    link_card_list: unknown[];
    news_meta: Meta;
  }

  /**
   * @description 咨讯元数据，只有活动咨讯才有
   * @since Alpha v0.2.1
   * @interface Meta
   * @property {number} activity_status 活动状态 // ActivityStatus
   * @property {string} start_at_sec 活动开始时间戳，单位秒
   * @property {string} end_at_sec 活动结束时间戳，单位秒
   * @return Meta
   */
  export interface Meta {
    activity_status: number;
    start_at_sec: string;
    end_at_sec: string;
  }

  /**
   * @description 用于渲染的咨讯卡片
   * @since Alpha v0.2.1
   * @interface RenderCard
   * @property {string} title 标题
   * @property {string} cover 封面图片 URL
   * @property {number} postId 帖子 ID
   * @property {string} subtitle 副标题
   * @property user 发帖用户
   * @property {string} user.nickname 用户昵称
   * @property {string} user.pendant 用户头像挂件
   * @property {string} user.icon 用户头像
   * @property {string} user.label 用户标签
   * @property forum 版块
   * @property {string} forum.name 版块名称
   * @property {string} forum.icon 版块图标
   * @property {RenderStatus} status 活动状态，仅活动咨讯有
   * @property data 帖子统计
   * @property {number} data.mark 帖子收藏数
   * @property {number} data.forward 帖子转发数
   * @property {number} data.like 帖子点赞数
   * @property {number} data.reply 帖子回复数
   * @property {number} data.view 帖子浏览数
   * @return RenderCard
   */
  export interface RenderCard {
    title: string;
    cover: string;
    postId: number;
    subtitle: string;
    user: {
      nickname: string;
      pendant: string;
      icon: string;
      label: string;
    };
    forum: {
      name: string;
      icon: string;
    };
    data: {
      mark: number;
      forward: number;
      like: number;
      reply: number;
      view: number;
    };
    status?: RenderStatus;
  }

  /**
   * @description 活动状态
   * @since Alpha v0.2.1
   * @property {string} status 活动状态
   * @property {string} colorCss 活动状态按钮背景色
   * @returns RenderStatus
   */
  export interface RenderStatus {
    status: string;
    colorCss: string;
  }
}
