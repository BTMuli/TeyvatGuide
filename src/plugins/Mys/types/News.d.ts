/**
 * @file plugins/Mys/types/news.d.ts
 * @description Mys 插件咨讯类型定义文件
 * @since Beta v0.4.0
 */

/**
 * @description Mys 插件咨讯类型
 * @since Alpha v0.2.1
 * @namespace TGApp.Plugins.Mys.News
 * @memberof TGApp.Plugins.Mys
 */
declare namespace TGApp.Plugins.Mys.News {
  /**
   * @description 咨讯返回数据
   * @since Alpha v0.2.1
   * @interface Response
   * @extends TGApp.BBS.Response.BaseWithData
   * @property {FullData} data 咨讯数据
   * @return Response
   */
  interface Response extends TGApp.BBS.Response.BaseWithData {
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
  interface FullData {
    last_id: number;
    is_last: boolean;
    list: Item[];
  }

  /**
   * @description 咨讯列表项
   * @since Beta v0.3.7
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
   * @property {TGApp.Plugins.Mys.Post.Vod[]} vod_list 视频列表
   * @property {boolean} is_block_on 是否屏蔽
   * @property {unknown} forum_rank_info 版块排名信息，可能为 null
   * @property {unknown[]} link_card_list 链接卡片列表，可能为 null
   * @property {Meta} news_meta 元数据
   * @property {TGApp.Plugins.Mys.Post.RecommendReason|null} recommend_reason 推荐理由，可能为 null
   * @property {unknown} villa_card 别墅卡片，可能为 null
   * @property {boolean} is_mentor 是否为导师
   * @property {unknown} villa_room_card 别墅房间卡片，可能为 null
   * @property {unknown} reply_avatar_action_info 回复头像动作信息，可能为 null
   * @property {TGApp.Plugins.Mys.Post.Challenge} challenge 挑战信息，可能为 null
   * @property {unknown[]} hot_reply_list 热门回复列表
   * @property {unknown[]} villa_msg_image_list 别墅消息图片列表
   * @returns Item
   */
  interface Item {
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
    vod_list: TGApp.Plugins.Mys.Post.Vod[];
    is_block_on: boolean;
    forum_rank_info: unknown;
    link_card_list: unknown[];
    news_meta: Meta;
    recommend_reason: TGApp.Plugins.Mys.Post.RecommendReason | null;
    villa_card: unknown | null;
    is_mentor: boolean;
    villa_room_card: unknown | null;
    reply_avatar_action_info: unknown | null;
    challenge: TGApp.Plugins.Mys.Post.Challenge | null;
    hot_reply_list: unknown[];
    villa_msg_image_list: unknown[];
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
  interface Meta {
    activity_status: number;
    start_at_sec: string;
    end_at_sec: string;
  }

  /**
   * @description 用于渲染的咨讯卡片
   * @since Beta v0.4.0
   * @interface RenderCard
   * @property {string} title 标题
   * @property {string} cover 封面图片 URL
   * @property {number} postId 帖子 ID
   * @property {string} subtitle 副标题
   * @property {TGApp.Plugins.Mys.User.Post} user 发帖用户
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
  interface RenderCard {
    title: string;
    cover: string;
    postId: number;
    subtitle: string;
    user: TGApp.Plugins.Mys.User.Post;
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
  interface RenderStatus {
    status: string;
    colorCss: string;
  }
}
