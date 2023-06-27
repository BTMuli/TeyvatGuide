/**
 * @file plugins Mys types post.d.ts
 * @description Mys 插件帖子类型定义文件
 * @author BTMuli <bt-muli@outlook.com>
 * @since Alpha v0.2.1
 */

/**
 * @description Mys 插件帖子类型
 * @since Alpha v0.2.1
 * @namespace Post
 * @exports TGApp.plugins.Mys.Post
 * @return Post
 */
declare namespace TGApp.Plugins.Mys.Post {
  /**
   * @description 帖子返回数据
   * @since Alpha v0.2.1
   * @interface Response
   * @extends TGApp.Plugins.Mys.Base.Response
   * @property {FullData} data.post 帖子数据
   * @return Response
   */
  export interface Response extends TGApp.Plugins.Mys.Base.Response {
    data: {
      post: FullData;
    };
  }

  /**
   * @description 帖子数据
   * @since Alpha v0.2.1
   * @interface FullData
   * @property {Post} post  帖子信息
   * @property {Forum} forum  所属版块
   * @property {Topic[]} topics 所属话题
   * @property {TGApp.Plugins.Mys.User.Post} user 发帖人
   * @property {TGApp.Plugins.Mys.User.SelfOperation} self_operation 当前用户操作
   * @property {Stat} stat 帖子统计
   * @property {HelpSys} help_sys 帮助系统，可能为 null
   * @property {Image} cover 封面图，可能为 null
   * @property {Image[]} image_list 图片列表
   * @property {boolean} is_official_master 是否为官方帖
   * @property {boolean} is_user_master 是否为用户帖
   * @property {boolean} hot_reply_exist 是否存在热门回复
   * @property {number} vot_count 投票数
   * @property {number} last_modify_time 最后修改时间
   * @property {string} recommend_type 推荐类型
   * @property {unknown} collection 合集，可能为 null // TODO: 未知
   * @property {unknown[]} vod_list 视频列表，可能为空 // TODO: 未知
   * @property {boolean} is_block_on 是否被屏蔽
   * @property {unknown} forum_rank_info 版块排行信息，可能为 null // TODO: 未知
   * @property {unknown[]} link_card_list 链接卡片列表，可能为空 // TODO: 未知
   * @property {TGApp.Plugins.Mys.News.Meta} news_meta 咨讯元数据，可能为 null
   * @return FullData
   */
  export interface FullData {
    post: Post;
    forum: Forum;
    topics: Topic[];
    user: TGApp.Plugins.Mys.User.Post;
    self_operation: TGApp.Plugins.Mys.User.SelfOperation;
    stat: Stat;
    help_sys: HelpSys | null;
    cover: Image | null;
    image_list: Image[];
    is_official_master: boolean;
    is_user_master: boolean;
    hot_reply_exist: boolean;
    vot_count: number;
    last_modify_time: number;
    recommend_type: string;
    collection: unknown | null;
    vod_list: unknown[];
    is_block_on: boolean;
    forum_rank_info: unknown | null;
    link_card_list: unknown[];
    news_meta: TGApp.Plugins.Mys.News.Meta | null;
  }

  /**
   * @description 帖子信息
   * @since Alpha v0.2.1
   * @interface Post
   * @property {number} game_id 游戏 ID // 2 为原神
   * @property {string} post_id 帖子 ID
   * @property {number} f_forum_id 所属版块 ID
   * @property {string} uid 发帖人 UID
   * @property {string} subject 帖子标题
   * @property {string} content 帖子内容，为 html 格式
   * @property {string} cover 封面图 URL，可能为 ""
   * @property {number} view_type 浏览类型 // TODO: 未知
   * @property {number} created_at 发帖时间
   * @property {string[]} images 图片列表，可能为空
   * @property post_status 帖子状态
   * @property {boolean} post_status.is_top 是否置顶
   * @property {boolean} post_status.is_good 是否加精
   * @property {boolean} post_status.is_official 是否官方
   * @property {number[]} topic_ids 所属话题 ID 列表
   * @property {number} view_status 浏览状态
   * @property {number} max_floor 最大楼层
   * @property {number} is_original 是否原创
   * @property {number} republish_authorization 是否授权转载
   * @property {string} reply_time 最后回复时间 // "2023-03-05 20:26:54"
   * @property {number} is_deleted 是否删除
   * @property {boolean} is_interactive 是否互动
   * @property {string} structured_content 结构化内容 // 反序列化后为 PostStructuredContent
   * @property {string[]} structured_content_rows 结构化内容原始数据
   * @property {number} review_id 审核ID
   * @property {boolean} is_profit 是否盈利
   * @property {boolean} is_in_profit 是否在盈利
   * @property {number} updated_at 更新时间
   * @property {number} deleted_at 删除时间
   * @property {number} pre_pub_status 预发布状态
   * @property {number} cate_id 分类ID
   * @property {number} profit_post_status 盈利帖子状态 // TODO: 未知
   * @property {number} audit_status 审核状态
   * @property {string} meta_content 元内容，可能为 "" // TODO: 未知
   * @property {boolean} is_missing 是否缺失 // TODO: 未知
   * @property {number} block_reply_img 是否屏蔽回复图片 // TODO: 未知
   * @property {boolean} is_showing_missing 是否显示缺失 // TODO: 未知
   * @property {number} block_latest_reply_time 是否屏蔽最新回复时间 // TODO: 未知
   * @property {number} selected_comment 是否选择评论 // TODO: 未知
   * @return Post
   */
  export interface Post {
    game_id: number;
    post_id: string;
    f_forum_id: number;
    uid: string;
    subject: string;
    content: string;
    cover: string;
    view_type: number;
    created_at: number;
    images: string[];
    post_status: {
      is_top: boolean;
      is_good: boolean;
      is_official: boolean;
    };
    topic_ids: number[];
    view_status: number;
    max_floor: number;
    is_original: number;
    republish_authorization: number;
    reply_time: string;
    is_deleted: number;
    is_interactive: boolean;
    structured_content: string;
    structured_content_rows: string[];
    review_id: number;
    is_profit: boolean;
    is_in_profit: boolean;
    updated_at: number;
    deleted_at: number;
    pre_pub_status: number;
    cate_id: number;
    profit_post_status: number;
    audit_status: number;
    meta_content: string;
    is_missing: boolean;
    block_reply_img: number;
    is_showing_missing: boolean;
    block_latest_reply_time: number;
    selected_comment: number;
  }

  /**
   * @description 版块信息
   * @since Alpha v0.2.1
   * @interface Forum
   * @property {number} id 版块 ID
   * @property {string} name 版块名称
   * @property {string} icon 版块图标 URL
   * @property {number} game_id 游戏 ID // 2 为原神
   * @property {unknown} forum_cate 版块分类，可能为 null
   * @return Forum
   */
  export interface Forum {
    id: number;
    name: string;
    icon: string;
    game_id: number;
    forum_cate: unknown | null;
  }

  /**
   * @description 话题信息
   * @since Alpha v0.2.1
   * @interface Topic
   * @property {number} id 话题 ID
   * @property {string} name 话题名称
   * @property {string} cover 话题封面图 URL
   * @property {boolean} is_top 是否置顶
   * @property {boolean} is_good 是否加精
   * @property {boolean} is_interactive 是否互动
   * @property {number} game_id 游戏 ID
   * @property {number} content_type 内容类型
   * @return Topic
   */
  export interface Topic {
    id: number;
    name: string;
    cover: string;
    is_top: boolean;
    is_good: boolean;
    is_interactive: boolean;
    game_id: number;
    content_type: number;
  }

  /**
   * @description 帖子状态
   * @since Alpha v0.2.1
   * @interface Stat
   * @property {number} view_num 浏览数
   * @property {number} reply_num 回复数
   * @property {number} like_num 点赞数
   * @property {number} bookmark_num 收藏数
   * @property {number} forward_num 转发数
   * @return Stat
   */
  export interface Stat {
    view_num: number;
    reply_num: number;
    like_num: number;
    bookmark_num: number;
    forward_num: number;
  }

  /**
   * @description 图片数据
   * @since Alpha v0.2.1
   * @interface Image
   * @property {string} url 图片 URL
   * @property {number} height 图片高度
   * @property {string} width 图片宽度
   * @property {string} format 图片格式 // jpg
   * @property {string} size 图片大小 // 281428
   * @property crop 图片裁剪信息，可能为 null
   * @property {number} crop.x 裁剪 X 轴
   * @property {number} crop.y 裁剪 Y 轴
   * @property {number} crop.w 裁剪宽度
   * @property {number} crop.h 裁剪高度
   * @property {string} crop.url 裁剪图片 URL
   * @property {boolean} is_user_set_cover 是否为封面
   * @property {string} image_id 图片 ID
   * @property {string} entity_type 图片类型 // IMG_ENTITY_POST, IMG_ENTITY_UNKOWN
   * @property {string} entity_id 图片 ID
   * @property {boolean} is_deleted 是否已删除
   * @return Image
   */
  export interface Image {
    url: string;
    height: number;
    width: number;
    format: string;
    size: string;
    crop: {
      x: number;
      y: number;
      w: number;
      h: number;
      url: string;
    } | null;
    is_user_set_cover: boolean;
    image_id: string;
    entity_type: string;
    entity_id: string;
    is_deleted: boolean;
  }

  /**
   * @description help_sys 信息
   * @since Alpha v0.2.1
   * @todo 用处未知
   * @interface HelpSys
   * @property {unknown} top_up 置顶, 可能为 null // TODO: 未知
   * @property {unknown[]} top_n 置顶, 可能为空
   * @property {number} answer_num 回答数
   * @return HelpSys
   */
  export interface HelpSys {
    top_up: unknown | null;
    top_n: unknown[];
    answer_num: number;
  }

  /**
   * @description 帖子内容-结构化
   * @description 当用户发帖时，解析内容用这个，为 post.content 的反序列化
   * @since Alpha v0.2.1
   * @interface Content
   * @property {string} describe 描述
   * @property {string[]} images 图片 URL
   * @return Content
   */
  export interface PostContent {
    describe: string;
    images?: string[];
  }

  /**
   * @description 帖子结构化内容
   * @since Alpha v0.2.1
   * @interface StructuredContent
   * @property {string|object} insert 插入内容
   * @property {string} insert.image 图片 URL
   * @property {StructuredVod} insert.vod 视频信息
   * @property {string} insert.video 外部视频 URL
   * @property {string} insert.backup_text 折叠文本
   * @property {object} insert.lottery 抽奖，当 backup_text 为 [抽奖]
   * @property {string} insert.lottery.id 抽奖 ID
   * @property {string} insert.lottery.toast 抽奖提示
   * @property {object} insert.fold 折叠内容
   * @property {string} insert.fold.title 折叠标题，反序列化后为 PostStructuredContent[]
   * @property {string} insert.fold.content 折叠文本，反序列化后为 PostStructuredContent[]
   * @property {StructuredLinkCard} insert.link_card 链接卡片
   * @property {string} insert.divider 分割线
   * @property {object} insert.mention 提及
   * @property {string} insert.mention.uid 用户 ID
   * @property {string} insert.mention.nickname 用户昵称
   * @property {object} attributes 属性
   * @property {number} attributes.height 高度
   * @property {number} attributes.width 宽度
   * @property {number} attributes.size 大小
   * @property {string} attributes.ext 扩展名
   * @property {boolean} attributes.bold 是否加粗
   * @property {string} attributes.color 颜色
   * @property {string} attributes.link 链接
   * @return StructuredContent
   */
  export interface StructuredContent {
    insert:
      | {
          image?: string;
          video?: string;
          vod?: StructuredVod;
          backup_text?: string;
          lottery?: {
            id: string;
            toast: string;
          };
          fold?: {
            title: string;
            content: string;
          };
          link_card?: StructuredLinkCard;
          divider?: string;
          mention?: {
            uid: string;
            nickname: string;
          };
        }
      | string;
    attributes?: {
      height?: number;
      width?: number;
      size?: number;
      ext?: string;
      bold?: boolean;
      color?: string;
      link?: string;
    };
  }

  /**
   * @description 帖子结构化内容-视频
   * @since Alpha v0.2.1
   * @interface StructuredVod
   * @property {number} id 视频 ID
   * @property {number} duration 时长
   * @property {string} cover 封面图 URL
   * @property {object[]} resolutions 分辨率
   * @property {string} resolutions.url URL
   * @property {string} resolutions.definition 清晰度
   * @property {number} resolutions.height 高度
   * @property {number} resolutions.width 宽度
   * @property {number} resolutions.bitrate 比特率
   * @property {number} resolutions.size 大小
   * @property {string} resolutions.format 格式
   * @property {string} resolutions.label 标签
   * @property {number} view_num 浏览数
   * @property {number} transcode_status 转码状态
   * @property {number} review_status 审核状态
   * @return StructuredVod
   */
  export interface StructuredVod {
    id: number;
    duration: number;
    cover: string;
    resolutions: Array<{
      url: string;
      definition: string;
      height: number;
      width: number;
      bitrate: number;
      size: number;
      format: string;
      label: string;
    }>;
    view_num: number;
    transcoding_status: number;
    review_status: number;
  }

  /**
   * @description 帖子结构化内容-链接卡片
   * @since Alpha v0.2.1
   * @interface StructuredLinkCard
   * @property {number} link_type 链接类型 // 1: 帖子，2：商品 TODO: 未知
   * @property {string} origin_url 原始链接
   * @property {string} landing_url 落地页链接
   * @property {string} cover 封面图 URL
   * @property {string} title 标题
   * @property {string} card_id 卡片 ID
   * @property {number} card_status 卡片状态 // TODO: 未知
   * @property {string} market_price 市场价
   * @property {string} price 价格
   * @property {string} button_text 按钮文本
   * @property {number} landing_url_type 落地链接类型 // TODO: 未知
   * @return StructuredLinkCard
   */
  export interface StructuredLinkCard {
    link_type: number;
    origin_url: string;
    landing_url: string;
    cover: string;
    title: string;
    card_id: string;
    card_status: number;
    market_price: string;
    price: string;
    button_text: string;
    landing_url_type: number;
  }
}
