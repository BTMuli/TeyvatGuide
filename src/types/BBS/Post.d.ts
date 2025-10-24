/**
 * @file types/BBS/Post.d.ts
 * @description 帖子类型定义文件
 * @since Beta v0.8.4
 */

declare namespace TGApp.BBS.Post {
  /**
   * @description 获取帖子详情返回数据
   * @since Beta v0.7.2
   * @interface FullResp
   * @extends TGApp.BBS.Response.BaseWithData
   * @property {FullRes} data 帖子数据
   */
  type FullResp = TGApp.BBS.Response.BaseWithData<FullRes>;

  /**
   * @description 帖子数据
   * @since Beta v0.7.2
   * @interface FullRes
   * @property {FullData} post 帖子数据
   */
  type FullRes = { post: FullData };

  /**
   * @description 搜索结果返回
   * @since Beta v0.7.2
   * @interface SearchResp
   * @extends TGApp.BBS.Response.BaseWithData
   * @property {SearchRes} data 返回数据
   */
  type SearchResp = TGApp.BBS.Response.BaseWithData<SearchRes>;

  /**
   * @description 搜索结果数据
   * @since Beta v0.7.2
   * @interface SearchRes
   * @property {Array<FullData>} posts 帖子列表
   * @property {string} last_id 索引
   * @property {boolean} is_last 是否最后一页
   * @property {Array<string>} token_list token 列表
   * @property {Record<string,string>} databox 数据盒
   */
  type SearchRes = {
    posts: Array<FullData>;
    last_id: string;
    is_last: boolean;
    token_list: Array<string>;
    databox: Record<string, string>;
  };

  /**
   * @description 咨讯返回
   * @since Beta v0.7.2
   * @interface NewsResp
   * @extends TGApp.BBS.Response.BaseWithData
   * @property {NewsRes} data 返回数据
   */
  type NewsResp = TGApp.BBS.Response.BaseWithData<NewsRes>;

  /**
   * @description 咨讯数据
   * @since Beta v0.7.2
   * @interface NewsRes
   * @property {Array<FullData>} list 咨讯列表
   * @property {string} last_id 最后 ID
   * @property {boolean} is_last 是否最后一页
   */
  type NewsRes = { list: Array<FullData>; last_id: string; is_last: boolean };

  /**
   * @description 用户发布帖子返回
   * @since Beta v0.7.2
   * @interface UserPostResp
   * @extends TGApp.BBS.Response.BaseWithData
   * @property {UserPostRes} data 返回数据
   */
  type UserPostResp = TGApp.BBS.Response.BaseWithData<UserPostRes>;

  /**
   * @description 用户发布帖子数据
   * @since Beta v0.7.2
   * @interface UserPostRes
   * @property {Array<FullData>} list 帖子列表
   * @property {boolean} is_last 是否最后一页
   * @property {string} next_offset 下一页偏移量
   */
  type UserPostRes = { list: Array<FullData>; is_last: boolean; next_offset: string };

  /**
   * @description 关注动态返回
   * @since Beta v0.7.2
   * @interface FollowPostResp
   * @extends TGApp.BBS.Response.BaseWithData
   * @property {FollowPostRes} data 返回数据
   */
  type FollowPostResp = TGApp.BBS.Response.BaseWithData<FollowPostRes>;

  /**
   * @description 关注动态返回数据
   * @since Beta v0.7.2
   * @interface FollowPostRes
   * @property {boolean} has_follow_users 是否有关注用户
   * @property {boolean} is_last 是否最后一页
   * @property {Array<FullData>} list 帖子列表
   * @property {number} next_offset 下一页偏移量
   */
  type FollowPostRes = {
    has_follow_users: boolean;
    is_last: boolean;
    list: Array<FullData>;
    next_offset: number;
  };

  /**
   * @description 帖子数据
   * @since Beta v0.7.2
   * @interface FullData
   * @property {Post} post  帖子信息
   * @property {Forum|null} forum  所属版块，可能为 null
   * @property {Array<Topic>} topics 所属话题
   * @property {User|null} user 发帖人，可能为 null
   * @property {TGApp.BBS.User.SelfOperation} self_operation 当前用户操作
   * @property {Stat|null} stat 帖子统计，可能为 null
   * @property {HelpSys} help_sys 帮助系统，可能为 null
   * @property {Image} cover 封面图，可能为 null
   * @property {Array<Image>} image_list 图片列表
   * @property {boolean} is_official_master 是否为官方帖
   * @property {boolean} is_user_master 是否为用户帖
   * @property {boolean} hot_reply_exist 是否存在热门回复
   * @property {number} vote_count 投票数
   * @property {number} last_modify_time 最后修改时间
   * @property {string} recommend_type 推荐类型
   * @property {Collection} collection 合集，可能为 null
   * @property {Array<Vod>} vod_list 视频列表，可能为空
   * @property {boolean} is_block_on 是否被屏蔽
   * @property {unknown} forum_rank_info 版块排行信息，可能为 null
   * @property {LinkCard[]} link_card_list 链接卡片列表，可能为空
   * @property {NewsMeta} news_meta 咨讯元数据，可能为 null'
   * @property {RecommendReason|null} recommend_reason 推荐理由，可能为 null
   * @property {unknown} villa_card 未知数据，可能为 null
   * @property {boolean} is_mentor 是否为导师
   * @property {unknown} villa_room_card 未知数据，可能为 null
   * @property {unknown} reply_avatar_action_info 未知数据，可能为 null
   * @property {unknown} challenge 挑战，可能为 null
   * @property {Array<unknown>} hot_reply_list 热门回复列表
   * @property {Array<unknown>} villa_msg_image_list 未知数据列表
   * @property {ContributionAct|null} contribution_act 投稿活动，可能为 null
   * @property {boolean} is_has_vote 是否有投票
   * @property {boolean} is_has_lottery 是否有抽奖
   * @property {string} release_time_type 发布时间类型
   * @property {number} future_release_time 未来发布时间
   * @property {ExternalLink} external_link 外部链接信息
   * @property {unknown} post_full_extra_info 帖子完整额外信息，可能为 null
   * @property {unknown} post_attachment_info 帖子附件信息，可能为 null
   * @property {unknown} feed_attachment_info 动态附件信息，可能为 null
   */
  type FullData = {
    post: Post;
    forum: Forum | null;
    topics: Array<Topic>;
    user: User | null;
    self_operation: TGApp.BBS.User.SelfOperation;
    stat: Stat | null;
    help_sys: HelpSys | null;
    cover: Image | null;
    image_list: Array<Image>;
    is_official_master: boolean;
    is_user_master: boolean;
    hot_reply_exist: boolean;
    vote_count: number;
    last_modify_time: number;
    recommend_type: string;
    collection: Collection | null;
    vod_list: Array<Vod>;
    is_block_on: boolean;
    forum_rank_info: unknown | null;
    link_card_list: Array<LinkCard>;
    news_meta?: NewsMeta | null;
    recommend_reason: RecommendReason | null;
    villa_card: unknown | null;
    is_mentor: boolean;
    villa_room_card: unknown | null;
    reply_avatar_action_info: unknown | null;
    challenge: unknown | null;
    hot_reply_list: Array<unknown>;
    villa_msg_image_list: Array<unknown>;
    contribution_act: ContributionAct | null;
    is_has_vote: boolean;
    is_has_lottery: boolean;
    release_time_type: string;
    future_release_time: number;
    external_link: ExternalLink;
    post_full_extra_info: unknown | null;
    post_attachment_info: unknown | null;
    feed_attachment_info: unknown | null;
  };

  /**
   * @description 用户信息
   * @since Beta v0.7.2
   * @interface User
   * @property {string} uid 用户 ID
   * @property {string} nickname 用户昵称
   * @property {string} introduce 用户简介
   * @property {string} avatar 用户头像
   * @property {number} gender 用户性别
   * @property {TGApp.BBS.User.Certification} certification 用户认证信息
   * @property {TGApp.BBS.User.LevelExp|null} level_exp 用户经验
   * @property {boolean} is_following 是否关注
   * @property {boolean} is_followed 是否被关注
   * @property {string} avatar_url 用户头像链接
   * @property {string} pendant 用户挂件 URL，可能为 ""
   * @property {Array<TGApp.BBS.User.Certification>} certifications 用户认证信息列表
   * @property {boolean} is_creator 是否是创作者
   * @property {TGApp.BBS.User.AvatarExt} avatar_ext 用户头像扩展信息
   */
  type User = {
    uid: string;
    nickname: string;
    introduce: string;
    avatar: string;
    gender: number;
    certification: TGApp.BBS.User.Certification;
    level_exp: TGApp.BBS.User.LevelExp | null;
    is_following: boolean;
    is_followed: boolean;
    avatar_url: string;
    pendant: string;
    certifications: Array<TGApp.BBS.User.Certification>;
    is_creator: boolean;
    avatar_ext: TGApp.BBS.User.AvatarExt;
  };

  /**
   * @description 帖子信息
   * @since Beta v0.7.2
   * @interface Post
   * @property {number} game_id 游戏 ID // 2 为原神
   * @property {string} post_id 帖子 ID
   * @property {number} f_forum_id 所属版块 ID
   * @property {string} uid 发帖人 UID
   * @property {string} subject 帖子标题
   * @property {string} content 帖子内容，为 html 格式
   * @property {string} cover 封面图 URL，可能为 ""
   * @property {number} view_type 浏览类型
   * @property {number} created_at 发帖时间
   * @property {Array<string>} images 图片列表，可能为空
   * @property {PostStat} post_status 帖子状态
   * @property {Array<number>} topic_ids 所属话题 ID 列表
   * @property {number} view_status 浏览状态
   * @property {number} max_floor 最大楼层
   * @property {number} is_original 是否原创
   * @property {number} republish_authorization 是否授权转载
   * @property {string} reply_time 最后回复时间 // "2023-03-05 20:26:54"
   * @property {number} is_deleted 是否删除
   * @property {boolean} is_interactive 是否互动
   * @property {string} structured_content 结构化内容 // 反序列化后为 TGApp.BBS.SctPost.Common[]
   * @property {Array<string>} structured_content_rows 结构化内容原始数据
   * @property {number} review_id 审核ID
   * @property {boolean} is_profit 是否盈利
   * @property {boolean} is_in_profit 是否在盈利
   * @property {number} updated_at 更新时间
   * @property {number} deleted_at 删除时间
   * @property {number} pre_pub_status 预发布状态
   * @property {number} cate_id 分类ID
   * @property {number} profit_post_status 盈利帖子状态
   * @property {number} audit_status 审核状态
   * @property {string} meta_content 元内容，可能为 ""
   * @property {boolean} is_missing 是否缺失
   * @property {number} block_reply_img 是否屏蔽回复图片
   * @property {boolean} is_showing_missing 是否显示缺失
   * @property {number} block_latest_reply_time 是否屏蔽最新回复时间
   * @property {number} selected_comment 是否选择评论
   * @property {boolean} is_mentor 是否为导师
   * @property {PostExtra|null} post_extra 帖子额外信息，可能为 null
   * @property {string} ai_content_type AI 内容类型
   * @property {string} user_ai_content_choice 用户 AI 内容选择
   * @property {PostAigcMeta|null} aigc_meta AI 生成内容元数据，可能为 null
   */
  type Post = {
    game_id: number;
    post_id: string;
    f_forum_id: number;
    uid: string;
    subject: string;
    content: string;
    cover: string;
    view_type: number;
    created_at: number;
    images: Array<string>;
    post_status: PostStat;
    topic_ids: Array<number>;
    view_status: number;
    max_floor: number;
    is_original: number;
    republish_authorization: number;
    reply_time: string;
    is_deleted: number;
    is_interactive: boolean;
    structured_content: string;
    structured_content_rows: Array<string>;
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
    is_mentor: boolean;
    post_extra: PostExtra | null;
    ai_content_type: string;
    user_ai_content_choice: string;
    aigc_meta: PostAigcMeta | null;
  };

  /**
   * @description 帖子状态
   * @since Beta v0.7.2
   * @interface PostStat
   * @property {boolean} is_top 是否置顶
   * @property {boolean} is_good 是否加精
   * @property {boolean} is_official 是否官方
   * @property {number} post_status 帖子状态
   */
  type PostStat = { is_top: boolean; is_good: boolean; is_official: boolean; post_status: number };

  /**
   * @description 帖子额外信息
   * @since Beta v0.8.4
   * @interface PostExtra
   * @property {PostExtraUgc} ugc_master_post_extra UGCMaster 额外信息
   */
  type PostExtra = { ugc_master_post_extra: PostExtraUgc };

  /**
   * @description UGC所有者额外信息
   * @since Beta v0.8.4
   * @interface PostExtraUgc
   * @property {string} game_uid 游戏 UID
   * @property {string} game_region 游戏区服
   */
  type PostExtraUgc = { game_uid: string; game_region: string };

  /**
   * @description AI 生成内容元数据
   * @since Beta v0.8.4
   * @interface PostAigcMeta
   * @property {string} ContentPropagator 内容生成器
   * @property {string} PropagateID 内容生成 ID
   */
  type PostAigcMeta = { ContentPropagator: string; PropagateID: string };

  /**
   * @description 版块信息
   * @since Beta v0.7.2
   * @interface Forum
   * @property {number} id 版块 ID
   * @property {string} name 版块名称
   * @property {string} icon 版块图标 URL
   * @property {number} game_id 游戏 ID // 2 为原神
   * @property {TGApp.BBS.Forum.ForumCate|null} forum_cate 版块分类，可能为 null
   */
  type Forum = {
    id: number;
    name: string;
    icon: string;
    game_id: number;
    forum_cate: TGApp.BBS.Forum.ForumCate | null;
  };

  /**
   * @description 话题信息
   * @since Beta v0.7.2
   * @interface Topic
   * @property {number} id 话题 ID
   * @property {string} name 话题名称
   * @property {string} cover 话题封面图 URL
   * @property {boolean} is_top 是否置顶
   * @property {boolean} is_good 是否加精
   * @property {boolean} is_interactive 是否互动
   * @property {number} game_id 游戏 ID
   * @property {number} content_type 内容类型
   */
  type Topic = {
    id: number;
    name: string;
    cover: string;
    is_top: boolean;
    is_good: boolean;
    is_interactive: boolean;
    game_id: number;
    content_type: number;
  };

  /**
   * @description 帖子状态
   * @since Beta v0.3.7
   * @interface Stat
   * @property {number} view_num 浏览数
   * @property {number} reply_num 回复数
   * @property {number} like_num 点赞数
   * @property {number} bookmark_num 收藏数
   * @property {number} forward_num 转发数
   * @property {number} original_like_num 原创点赞数
   * @property {Array<StatUpvote>} post_upvote_stat 互动信息
   */
  type Stat = {
    view_num: number;
    reply_num: number;
    like_num: number;
    bookmark_num: number;
    forward_num: number;
    original_like_num: number;
    post_upvote_stat: Array<StatUpvote>;
  };

  /**
   * @description 互动信息
   * @since Beta v0.7.2
   * @interface StatUpvote
   * @property {number} upvote_type 互动类型
   * @property {number} upvote_cnt 互动数量
   */
  type StatUpvote = { upvote_type: number; upvote_cnt: number };

  /**
   * @description 图片数据
   * @since Beta v0.7.2
   * @interface Image
   * @property {string} url 图片 URL
   * @property {number} height 图片高度
   * @property {string} width 图片宽度
   * @property {string} format 图片格式 // jpg
   * @property {string} size 图片大小 // 281428
   * @property {ImageCrop|null} crop 图片裁剪信息，可能为 null
   * @property {boolean} is_user_set_cover 是否为封面
   * @property {string} image_id 图片 ID
   * @property {string} entity_type 图片类型 // IMG_ENTITY_POST, IMG_ENTITY_UNKOWN
   * @property {string} entity_id 图片 ID
   * @property {boolean} is_deleted 是否已删除
   * @property {string} aigc_label AI 生成标签
   * @property {string} aigc_meta AI 生成元数据 // 序列化后的 JSON 字符串
   */
  type Image = {
    url: string;
    height: number;
    width: number;
    format: string;
    size: string;
    crop: ImageCrop | null;
    is_user_set_cover?: boolean;
    image_id: string;
    entity_type: string;
    entity_id: string;
    is_deleted: boolean;
    aigc_label: string;
    aigc_meta: string;
  };

  /**
   * @description 图片裁剪信息
   * @since Beta v0.7.2
   * @interface ImageCrop
   * @property {number} x 裁剪 X 轴
   * @property {number} y 裁剪 Y 轴
   * @property {number} w 裁剪宽度
   * @property {number} h 裁剪高度
   * @property {string} url 裁剪图片 URL
   */
  type ImageCrop = { x: number; y: number; w: number; h: number; url: string };

  /**
   * @description help_sys 信息
   * @since Beta v0.7.2
   * @interface HelpSys
   * @property {unknown} top_up 置顶, 可能为 null
   * @property {Array<unknown>} top_n 置顶, 可能为空
   * @property {number} answer_num 回答数
   */
  type HelpSys = { top_up: unknown | null; top_n: Array<unknown>; answer_num: number };

  /**
   * @description 合集信息
   * @since Beta v0.7.2
   * @interface Collection
   * @property {string} prev_post_id 上一篇帖子 ID，为 0 说明没有上一篇
   * @property {string} next_post_id 下一篇帖子 ID，为 0 说明没有下一篇
   * @property {string} collection_id 合集 ID
   * @property {number} cur 第几篇
   * @property {number} total 总篇数
   * @property {string} collection_title 合集标题
   * @property {number} prev_post_game_id 上一篇帖子游戏 ID
   * @property {number} next_post_game_id 下一篇帖子游戏 ID
   * @property {number} prev_post_view_type 上一篇帖子浏览类型
   * @property {number} next_post_view_type 下一篇帖子浏览类型
   */
  type Collection = {
    prev_post_id: string;
    next_post_id: string;
    collection_id: string;
    cur: number;
    total: number;
    collection_title: string;
    prev_post_game_id: number;
    next_post_game_id: number;
    prev_post_view_type: number;
    next_post_view_type: number;
  };

  /**
   * @description 链接卡片信息
   * @since Beta v0.7.2
   * @interface LinkCard
   * @property {string} button_text 按钮文本
   * @property {string} card_id 卡片 ID
   * @property {unknown} card_meta 卡片元数据
   * @property {number} card_status 卡片状态
   * @property {string} cover 封面图 URL
   * @property {string} landing_url 落地页 URL
   * @property {number} landing_url_type 落地页类型
   * @property {number} link_type 链接类型
   * @property {string} market_price 市场价
   * @property {string} origin_url 原始 URL
   * @property {string} origin_user_avatar 原始用户头像 URL
   * @property {string} origin_user_avatar_url 原始用户头像 URL
   * @property {string} origin_user_nickname 原始用户名
   * @property {string} price 价格
   * @property {string} title 标题
   */
  type LinkCard = {
    link_type: number;
    origin_url: string;
    landing_url: string;
    cover: string;
    title: string;
    origin_user_avatar: string;
    origin_user_nickname: string;
    card_id: string;
    card_status: number;
    market_price: string;
    price: string;
    button_text: string;
    landing_url_type: number;
    card_meta: unknown;
    origin_user_avatar_url: string;
  };

  /**
   * @description 视频信息
   * @since Beta v0.7.2
   * @interface Vod
   * @property {string} id 视频 ID
   * @property {number} duration 视频时长
   * @property {string} cover 视频封面图 URL
   * @property {Array<VodResolution>} resolutions 视频分辨率信息
   * @property {number} view_num 观看数
   * @property {number} transcoding_status 转码状态
   * @property {number} review_status 审核状态
   * @property {string} brief_info 视频简介
   */
  type Vod = {
    id: string;
    duration: number;
    cover: string;
    resolutions: Array<VodResolution>;
    view_num: number;
    transcoding_status: number;
    review_status: number;
    brief_info: string;
  };

  /**
   * @description 视频分辨率信息
   * @since Beta v0.7.2
   * @interface VodResolution
   * @property {string} url 视频 URL
   * @property {string} definition 视频清晰度
   * @property {number} width 视频宽度
   * @property {number} height 视频高度
   * @property {number} bitrate 视频码率
   * @property {string} size 视频大小
   * @property {string} format 视频格式
   * @property {string} label 视频标签
   */
  type VodResolution = {
    url: string;
    definition: string;
    width: number;
    height: number;
    bitrate: number;
    size: string;
    format: string;
    label: string;
  };

  /**
   * @description 咨讯元数据，只有活动咨讯才有
   * @since Beta v0.7.1
   * @interface NewsMeta
   * @property {number} activity_status 活动状态 // ActivityStatus
   * @property {string} start_at_sec 活动开始时间戳，单位秒
   * @property {string} end_at_sec 活动结束时间戳，单位秒
   */
  type NewsMeta = { activity_status: number; start_at_sec: string; end_at_sec: string };

  /**
   * @description 推荐理由
   * @since Beta v0.7.2
   * @interface RecommendReason
   * @property {boolean} is_following 是否关注
   * @property {unknown|null} lottery 抽奖信息，可能为 null
   * @property {Array<RecommendTags>} tags 标签
   * @property {boolean} is_mentor_rec_block 是否为导师推荐
   */
  type RecommendReason = {
    is_following?: boolean;
    lottery?: unknown | null;
    tags: Array<RecommendTags>;
    is_mentor_rec_block: boolean;
  };

  /**
   * @description 推荐标签
   * @since Beta v0.7.2
   * @interface RecommendTags
   * @property {string} text 标签文本
   * @property {string} type 标签类型
   * @property {string} deep_link 深度链接
   */
  type RecommendTags = { text: string; type: string; deep_link: string };

  /**
   * @description 投稿活动
   * @since Beta v0.8.4
   * @interface ContributionAct
   * @property {string} act_id 活动 ID
   * @property {string} title 活动标题
   * @property {string} game_uid 投稿游戏 UID
   * @property {string} game_region 投稿游戏区服
   * @property {string} game_nickname 投稿游戏昵称
   */
  type ContributionAct = {
    act_id: string;
    title: string;
    game_uid: string;
    game_region: string;
    game_nickname: string;
  };

  /**
   * @description 外部链接信息
   * @since Beta v0.8.4
   * @interface ExternalLink
   * @property {string} external_link 外部链接 URL
   * @property {string} external_link_title 外部链接标题
   */
  type ExternalLink = { external_link: string; external_link_title: string };
}
