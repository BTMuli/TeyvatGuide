/**
 * 帖子类型定义文件
 * @since Beta v0.8.6
 */

declare namespace TGApp.BBS.Post {
  /**
   * 获取帖子详情返回响应
   * @since Beta v0.7.2
   */
  type FullResp = TGApp.BBS.Response.BaseWithData<FullRes>;

  /**
   * 帖子详情返回数据
   * @since Beta v0.7.2
   */
  type FullRes = {
    /** 帖子数据 */
    post: FullData;
  };

  /**
   * 搜索结果返回响应
   * @since Beta v0.7.2
   */
  type SearchResp = TGApp.BBS.Response.BaseWithData<SearchRes>;

  /**
   * 搜索结果返回数据
   * @since Beta v0.7.2
   * @remarks token_list 和 databox 目前用途不明
   */
  type SearchRes = {
    /** 帖子列表 */
    posts: Array<FullData>;
    /** 最后一个帖子ID，用于索引 */
    last_id: string;
    /** 是否最后一页 */
    is_last: boolean;
    /** token 列表 */
    token_list: Array<string>;
    /** 数据盒 */
    databox: Record<string, string>;
  };

  /**
   * 咨讯类型
   * @since Beta v0.9.1
   * @remarks 用于相关接口参数请求
   */
  const NewsType = <const>{
    /** 公告 */
    NOTICE: 1,
    /** 活动 */
    ACTIVITY: 2,
    /** 咨讯 */
    NEWS: 3,
  };

  /**
   * 咨讯类型枚举
   * @since Beta v0.9.1
   */
  type NewsTypeEnum = (typeof NewsType)[keyof typeof NewsType];

  /**
   * 资讯返回响应
   * @since Beta v0.7.2
   */
  type NewsResp = TGApp.BBS.Response.BaseWithData<NewsRes>;

  /**
   * 资讯数据
   * @since Beta v0.7.2
   */
  type NewsRes = {
    /** 资讯列表 */
    list: Array<FullData>;
    /** 列表内最后一个 ID，用于索引 */
    last_id: string;
    /** 是否最后一页 */
    is_last: boolean;
  };

  /**
   * 用户发布帖子返回响应
   * @since Beta v0.7.2
   */
  type UserPostResp = TGApp.BBS.Response.BaseWithData<UserPostRes>;

  /**
   * 用户发布帖子返回数据
   * @since Beta v0.7.2
   */
  type UserPostRes = {
    /** 帖子列表 */
    list: Array<FullData>;
    /** 是否最后一页 */
    is_last: boolean;
    /** 下一页偏移量 */
    next_offset: string;
  };

  /**
   * 关注动态返回响应
   * @since Beta v0.7.2
   */
  type FollowPostResp = TGApp.BBS.Response.BaseWithData<FollowPostRes>;

  /**
   * 关注动态返回数据
   * @since Beta v0.7.2
   */
  type FollowPostRes = {
    /** 是否有关注用户 */
    has_follow_users: boolean;
    /** 是否最后一页 */
    is_last: boolean;
    /** 帖子列表 */
    list: Array<FullData>;
    /** 下一页偏移量 */
    next_offset: number;
  };

  /**
   * 帖子数据
   * @since Beta v0.7.2
   */
  type FullData = {
    /** 帖子信息 */
    post: Post;
    /** 所属版块，可能为 null */
    forum: Forum | null;
    /** 所属话题 */
    topics: Array<Topic>;
    /** 发帖人，可能为 null */
    user: User | null;
    /** 当前用户操作 */
    self_operation: TGApp.BBS.User.SelfOperation;
    /** 帖子统计，可能为 null */
    stat: Stat | null;
    /** 帮助系统，可能为 null */
    help_sys: HelpSys | null;
    /** 封面图，可能为 null */
    cover: Image | null;
    /** 图片列表 */
    image_list: Array<Image>;
    /** 是否为官方帖 */
    is_official_master: boolean;
    /** 是否为用户帖 */
    is_user_master: boolean;
    /** 是否存在热门回复 */
    hot_reply_exist: boolean;
    /** 投票数 */
    vote_count: number;
    /** 最后修改时间 */
    last_modify_time: number;
    /** 推荐类型 */
    recommend_type: string;
    /** 合集，可能为 null */
    collection: Collection | null;
    /** 视频列表，可能为空 */
    vod_list: Array<Vod>;
    /** 是否被屏蔽 */
    is_block_on: boolean;
    /** 版块排行信息，可能为 null */
    forum_rank_info: unknown | null;
    /** 链接卡片列表，可能为空 */
    link_card_list: Array<LinkCard>;
    /** 资讯元数据，可能为 null */
    news_meta?: NewsMeta | null;
    /** 推荐理由，可能为 null */
    recommend_reason: RecommendReason | null;
    /** 未知数据，可能为 null */
    villa_card: unknown | null;
    /** 是否为导师 */
    is_mentor: boolean;
    /** 未知数据，可能为 null */
    villa_room_card: unknown | null;
    /** 未知数据，可能为 null */
    reply_avatar_action_info: unknown | null;
    /** 挑战，可能为 null */
    challenge: unknown | null;
    /** 热门回复列表 */
    hot_reply_list: Array<unknown>;
    /** 未知数据列表 */
    villa_msg_image_list: Array<unknown>;
    /** 投稿活动，可能为 null */
    contribution_act: ContributionAct | null;
    /** 是否有投票 */
    is_has_vote: boolean;
    /** 是否有抽奖 */
    is_has_lottery: boolean;
    /** 发布时间类型 */
    release_time_type: string;
    /** 未来发布时间 */
    future_release_time: number;
    /** 外部链接信息 */
    external_link: ExternalLink;
    /** 帖子完整额外信息，可能为 null */
    post_full_extra_info: PostExtraFull | null;
    /** 帖子附件信息，可能为 null */
    post_attachment_info: unknown | null;
    /** 动态附件信息，可能为 null */
    feed_attachment_info: unknown | null;
  };

  /**
   * 用户信息
   * @since Beta v0.7.2
   */
  type User = {
    /** 用户 ID */
    uid: string;
    /** 用户昵称 */
    nickname: string;
    /** 用户简介 */
    introduce: string;
    /** 用户头像 */
    avatar: string;
    /** 用户性别 */
    gender: number;
    /** 用户认证信息 */
    certification: TGApp.BBS.User.Certification;
    /** 用户经验 */
    level_exp: TGApp.BBS.User.LevelExp | null;
    /** 是否关注 */
    is_following: boolean;
    /** 是否被关注 */
    is_followed: boolean;
    /** 用户头像链接 */
    avatar_url: string;
    /** 用户挂件 URL，可能为 "" */
    pendant: string;
    /** 用户认证信息列表 */
    certifications: Array<TGApp.BBS.User.Certification>;
    /** 是否是创作者 */
    is_creator: boolean;
    /** 用户头像扩展信息 */
    avatar_ext: TGApp.BBS.User.AvatarExt;
  };

  /**
   * 帖子信息
   * @since Beta v0.7.2
   */
  type Post = {
    /** 游戏 ID */
    game_id: number;
    /** 帖子 ID */
    post_id: string;
    /** 所属版块 ID */
    f_forum_id: number;
    /** 发帖人 UID */
    uid: string;
    /** 帖子标题 */
    subject: string;
    /** 帖子内容 */
    content: string;
    /** 封面图 */
    cover: string;
    /** 浏览类型 */
    view_type: ViewTypeEnum | number;
    /** 发帖时间 */
    created_at: number;
    /** 图片列表 */
    images: Array<string>;
    /** 帖子状态 */
    post_status: PostStat;
    /** 所属话题 ID 列表 */
    topic_ids: Array<number>;
    /** 浏览状态 */
    view_status: number;
    /** 最大楼层 */
    max_floor: number;
    /** 是否原创 */
    is_original: number;
    /** 是否授权转载 */
    republish_authorization: number;
    /** 最后回复时间 */
    reply_time: string;
    /** 是否删除 */
    is_deleted: number;
    /** 是否互动 */
    is_interactive: boolean;
    /** 结构化内容 */
    structured_content: string;
    /** 结构化内容原始数据 */
    structured_content_rows: Array<string>;
    /** 审核ID */
    review_id: number;
    /** 是否盈利 */
    is_profit: boolean;
    /** 是否在盈利 */
    is_in_profit: boolean;
    /** 更新时间 */
    updated_at: number;
    /** 删除时间 */
    deleted_at: number;
    /** 预发布状态 */
    pre_pub_status: number;
    /** 分类ID */
    cate_id: number;
    /** 盈利帖子状态 */
    profit_post_status: number;
    /** 审核状态 */
    audit_status: number;
    /** 元内容 */
    meta_content: string;
    /** 是否缺失 */
    is_missing: boolean;
    /** 是否屏蔽回复图片 */
    block_reply_img: number;
    /** 是否显示缺失 */
    is_showing_missing: boolean;
    /** 是否屏蔽最新回复时间 */
    block_latest_reply_time: number;
    /** 选择评论 */
    selected_comment: number;
    /** 是否为导师 */
    is_mentor: boolean;
    /** 帖子额外信息 */
    post_extra: PostExtra | null;
    /** AI 内容类型 */
    ai_content_type: string;
    /** 用户 AI 内容选择 */
    user_ai_content_choice: string;
    /** AI 生成内容元数据 */
    aigc_meta: PostAigcMeta | null;
  };

  /**
   * 浏览类型枚举
   * @since Beta v0.8.4
   * @remarks 待确定是否有其他类型
   */
  const PostViewType = <const>{
    /** 正常帖子 */
    NORMAL: 1,
    /** 图片帖子，如同人图，COS */
    PIC: 2,
    /** 含视频帖子 */
    VOD: 5,
    /** UGC 千星奇域 */
    UGC: 7,
  };

  /**
   * 浏览类型枚举类型
   * @since Beta v0.8.4
   */
  type ViewTypeEnum = (typeof PostViewType)[keyof typeof PostViewType];

  /**
   * 帖子状态
   * @since Beta v0.7.2
   */
  type PostStat = {
    /** 是否置顶 */
    is_top: boolean;
    /** 是否加精 */
    is_good: boolean;
    /** 是否官方 */
    is_official: boolean;
    /** 帖子状态 */
    post_status: number;
  };

  /**
   * 帖子额外信息
   * @since Beta v0.8.6
   */
  type PostExtra = {
    /** UGC 主帖子额外信息 */
    ugc_master_post_extra: PostExtraUgc;
    /** AIGC 额外信息 */
    minos_aigc_info: PostExtraAigc | null;
  };

  /**
   *  UGC所有者额外信息
   * @since Beta v0.8.4
   */
  type PostExtraUgc = {
    /** 游戏 UID */
    game_uid: string;
    /** 游戏区服 */
    game_region: string;
  };

  /**
   * AIGC 额外信息
   * @since Beta v0.8.6
   */
  type PostExtraAigc = {
    /** 是否包含 AI 生成内容 */
    is_aigc: boolean;
  };

  /**
   * AI 生成内容元数据
   * @since Beta v0.8.4
   */
  type PostAigcMeta = {
    /** 内容生成器 */
    ContentPropagator: string;
    /** 内容生成 ID */
    PropagateID: string;
  };

  /**
   * 版块信息
   * @since Beta v0.7.2
   */
  type Forum = {
    /** 版块 ID */
    id: number;
    /** 版块名称 */
    name: string;
    /** 版块图标 URL */
    icon: string;
    /** 游戏 ID */
    game_id: number;
    /** 版块分类，可能为 null */
    forum_cate: TGApp.BBS.Forum.ForumCate | null;
  };

  /**
   * 话题信息
   * @since Beta v0.7.2
   */
  type Topic = {
    /** 话题 ID */
    id: number;
    /** 话题名称 */
    name: string;
    /** 话题封面图 URL */
    cover: string;
    /** 是否置顶 */
    is_top: boolean;
    /** 是否加精 */
    is_good: boolean;
    /** 是否互动 */
    is_interactive: boolean;
    /** 游戏 ID */
    game_id: number;
    /** 内容类型 */
    content_type: number;
  };

  /**
   * 帖子状态
   * @since Beta v0.3.7
   */
  type Stat = {
    /** 浏览数 */
    view_num: number;
    /** 回复数 */
    reply_num: number;
    /** 点赞数 */
    like_num: number;
    /** 收藏数 */
    bookmark_num: number;
    /** 转发数 */
    forward_num: number;
    /** 原创点赞数 */
    original_like_num: number;
    /** 互动信息 */
    post_upvote_stat: Array<StatUpvote>;
  };

  /**
   * 互动信息
   * @since Beta v0.7.2
   */
  type StatUpvote = {
    /** 互动类型 */
    upvote_type: number;
    /** 互动数量 */
    upvote_cnt: number;
  };

  /**
   * 图片数据
   * @since Beta v0.7.2
   */
  type Image = {
    /** 图片 URL */
    url: string;
    /** 图片高度 */
    height: number;
    /** 图片宽度 */
    width: number;
    /** 图片格式 */
    format: string;
    /** 图片大小 */
    size: string;
    /** 图片裁剪信息，可能为 null */
    crop: ImageCrop | null;
    /** 是否为封面 */
    is_user_set_cover?: boolean;
    /** 图片 ID */
    image_id: string;
    /** 图片类型 */
    entity_type: string;
    /** 图片 ID */
    entity_id: string;
    /** 是否已删除 */
    is_deleted: boolean;
    /** AI 生成标签 */
    aigc_label: string;
    /**
     * AI 生成元数据
     * @remarks 序列化后的 JSON 字符串
     */
    aigc_meta: string;
  };

  /**
   * 图片裁剪信息
   * @since Beta v0.7.2
   */
  type ImageCrop = {
    /** 裁剪 X 轴 */
    x: number;
    /** 裁剪 Y 轴 */
    y: number;
    /** 裁剪宽度 */
    w: number;
    /** 裁剪高度 */
    h: number;
    /** 裁剪图片 URL */
    url: string;
  };

  /**
   * help_sys 信息
   * @since Beta v0.7.2
   */
  type HelpSys = {
    /** 置顶 */
    top_up: unknown | null;
    /** 置顶列表 */
    top_n: Array<unknown>;
    /** 回答数 */
    answer_num: number;
  };

  /**
   * 合集信息
   * @since Beta v0.7.2
   */
  type Collection = {
    /**
     * 上一篇帖子 ID
     * @remarks 为 0 说明没有上一篇
     */
    prev_post_id: string;
    /**
     * 下一篇帖子 ID
     * @remarks 为 0 说明没有下一篇
     */
    next_post_id: string;
    /** 合集 ID */
    collection_id: string;
    /** 第几篇 */
    cur: number;
    /** 总篇数 */
    total: number;
    /** 合集标题 */
    collection_title: string;
    /** 上一篇帖子游戏 ID */
    prev_post_game_id: number;
    /** 下一篇帖子游戏 ID */
    next_post_game_id: number;
    /** 上一篇帖子浏览类型 */
    prev_post_view_type: ViewTypeEnum;
    /** 下一篇帖子浏览类型 */
    next_post_view_type: ViewTypeEnum;
  };

  /**
   * 链接卡片信息
   * @since Beta v0.7.2
   */
  type LinkCard = {
    /** 链接类型 */
    link_type: number;
    /** 原始 URL */
    origin_url: string;
    /** 落地页 URL */
    landing_url: string;
    /** 封面图 */
    cover: string;
    /** 标题 */
    title: string;
    /** 原始用户头像 */
    origin_user_avatar: string;
    /** 原始用户名 */
    origin_user_nickname: string;
    /** 卡片 ID */
    card_id: string;
    /** 卡片状态 */
    card_status: number;
    /** 市场价 */
    market_price: string;
    /** 价格 */
    price: string;
    /** 按钮文本 */
    button_text: string;
    /** 落地页类型 */
    landing_url_type: number;
    /** 卡片元数据 */
    card_meta: unknown;
    /** 原始用户头像 URL */
    origin_user_avatar_url: string;
  };

  /**
   * 视频信息
   * @since Beta v0.7.2
   */
  type Vod = {
    /** 视频 ID */
    id: string;
    /** 视频时长，单位秒 */
    duration: number;
    /** 视频封面图 URL */
    cover: string;
    /** 视频分辨率信息 */
    resolutions: Array<VodResolution>;
    /** 观看数 */
    view_num: number;
    /** 转码状态 */
    transcoding_status: number;
    /** 审核状态 */
    review_status: number;
    /** 视频简介 */
    brief_info: string;
  };

  /**
   * 视频分辨率信息
   * @since Beta v0.7.2
   */
  type VodResolution = {
    /** 视频 URL */
    url: string;
    /** 视频清晰度 */
    definition: string;
    /** 视频宽度 */
    width: number;
    /** 视频高度 */
    height: number;
    /** 视频码率 */
    bitrate: number;
    /** 视频大小 */
    size: string;
    /** 视频格式 */
    format: string;
    /** 视频标签 */
    label: string;
  };

  /**
   * 资讯元数据，只有活动资讯才有
   * @since Beta v0.7.1
   */
  type NewsMeta = {
    /** 活动状态 */
    activity_status: number;
    /** 活动开始时间戳，单位秒 */
    start_at_sec: string;
    /** 活动结束时间戳，单位秒 */
    end_at_sec: string;
  };

  /**
   * 推荐理由
   * @since Beta v0.7.2
   */
  type RecommendReason = {
    /** 是否关注 */
    is_following?: boolean;
    /** 抽奖信息，可能为 null */
    lottery?: unknown | null;
    /** 标签 */
    tags: Array<RecommendTags>;
    /** 是否为导师推荐 */
    is_mentor_rec_block: boolean;
  };

  /**
   * 推荐标签
   * @since Beta v0.7.2
   */
  type RecommendTags = {
    /** 标签文本 */
    text: string;
    /** 标签类型 */
    type: string;
    /** 深度链接 */
    deep_link: string;
  };

  /**
   * 投稿活动
   * @since Beta v0.8.4
   */
  type ContributionAct = {
    /** 活动 ID */
    act_id: string;
    /** 活动标题 */
    title: string;
    /** 投稿人游戏 UID */
    game_uid: string;
    /** 投稿人游戏区服 */
    game_region: string;
    /** 投稿人游戏昵称 */
    game_nickname: string;
  };

  /**
   * 外部链接信息
   * @since Beta v0.8.4
   */
  type ExternalLink = {
    /** 外部链接 URL */
    external_link: string;
    /** 外部链接标题 */
    external_link_title: string;
  };

  /**
   * 帖子完整额外信息
   * @since Beta v0.8.4
   */
  type PostExtraFull = {
    /** UGC 主帖子完整额外信息 */
    ugc_master_post_extra: PostExtraUgcFull;
  };

  /**
   * UGC所有者完整额外信息
   * @since Beta v0.8.4
   */
  type PostExtraUgcFull = {
    /** 游戏角色信息 */
    game_character: TGApp.BBS.UGC.Character;
    /** 用户是否使用游戏信息 */
    user_is_use_game_info: boolean;
    /** UGC 主帖子类型 */
    ugc_master_post_type: string;
    /** 关卡列表 */
    level_list: Array<TGApp.BBS.UGC.Level>;
  };
}
