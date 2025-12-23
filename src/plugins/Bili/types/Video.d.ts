/**
 * Bili 插件视频类型定义文件
 * @since Beta v0.4.1
 */

declare namespace TGApp.Plugins.Bili.Video {
  /**
   * Bili 视频基本信息返回
   * @since Beta v0.4.0
   */
  type ViewResponse = TGApp.Plugins.Bili.Base.Resp<ViewData>;

  /**
   * Bili 视频基本信息
   * @since Beta v0.4.0
   * @see https://api.bilibili.com/x/web-interface/view?aid=540893019
   */
  type ViewData = {
    /** 视频 BV 号 */
    bvid: string;
    /** 视频 AV 号 */
    aid: number;
    /** 视频分 P 数量 */
    videos: number;
    /** 视频分区 ID */
    tid: number;
    /** 视频分区名称 */
    tname: string;
    /** 版权信息，1 为原创 */
    copyright: number;
    /** 视频封面图片地址 */
    pic: string;
    /** 视频标题 */
    title: string;
    /** 视频发布时间，时间戳（秒） */
    pubdate: string;
    /** 视频创建时间，时间戳（秒） */
    ctime: number;
    /** 视频简介 */
    desc: string;
    /** 视频简介扩展信息 */
    desc_v2: {
      /** 视频简介（纯文本） */
      raw_text: string;
      /** 视频简介类型 */
      type: number;
      /** 视频简介 ID */
      biz_id: number;
    };
    /** 视频状态 */
    state: number;
    /** 视频时长 */
    duration: number;
    /** 视频权限 */
    rights: unknown;
    /** 视频作者信息 */
    owner: {
      /** 视频作者 UID */
      mid: number;
      /** 视频作者昵称 */
      name: string;
      /** 视频作者头像 */
      face: string;
    };
    /** 视频统计信息 */
    stat: {
      /** 视频 AV 号 */
      aid: number;
      /** 视频播放量 */
      view: number;
      /** 视频弹幕数量 */
      danmaku: number;
      /** 视频评论数量 */
      reply: number;
      /** 视频收藏数量 */
      favorite: number;
      /** 视频硬币数量 */
      coin: number;
      /** 视频分享数量 */
      share: number;
      /** 视频当前排名 */
      now_rank: number;
      /** 视频历史最高排名 */
      his_rank: number;
      /** 视频点赞数量 */
      like: number;
      /** 视频点踩数量 */
      dislike: number;
      /** 视频评分 */
      evaluation: string;
      /** 视频投稿类型 */
      vt: number;
    };
    /** 视频争议信息 */
    argue_info: unknown;
    /** 视频动态信息 */
    dynamic: string;
    /** 视频弹幕 ID */
    cid: number;
    /** 视频尺寸信息 */
    dimension: {
      /** 视频宽度 */
      width: number;
      /** 视频高度 */
      height: number;
      /** 视频旋转角度 */
      rotate: number;
    };
    /** 视频预告信息 */
    premiere: unknown;
    /** 视频青少年模式 */
    teenage_mode: number;
    /** 视频是否为付费分 P */
    is_chargeable_season: boolean;
    /** 视频是否为剧集 */
    is_story: boolean;
    /** 视频是否为大会员专享 */
    is_upower_exclusive: boolean;
    /** 视频是否为大会员免广告 */
    is_upower_play: boolean;
    /** 视频是否为大会员免前置广告 */
    is_upower_preview: boolean;
    /** 视频是否开启投稿 */
    enable_vt: number;
    /** 视频投稿类型显示 */
    vt_display: string;
    /** 视频是否不缓存 */
    no_cache: boolean;
    /** 视频分 P 信息 */
    pages: unknown;
    /** 视频字幕信息 */
    subtitle: unknown;
    /** 视频是否为剧集 */
    is_season_display: boolean;
    /** 视频用户抽奖信息 */
    user_garb: unknown;
    /** 视频荣誉信息 */
    honor_reply: unknown;
    /** 视频点赞图标信息 */
    like_icon: unknown;
    /** 视频是否需要跳转 BV 号 */
    need_jump_bv: boolean;
    /** 视频是否禁止显示 UP 主信息 */
    disable_show_up_info: boolean;
    /** 视频是否为剧集免广告 */
    is_story_play: boolean;
  };

  /**
   * Bili 视频链接返回
   * @since Beta v0.4.0
   */
  type UrlResponse = TGApp.Plugins.Bili.Base.Resp<UrlData>;

  /**
   * Bili 视频播放地址返回数据
   * @since Beta v0.4.1
   */
  type UrlData = {
    /** 视频来源 */
    from: string;
    /** 视频播放地址 */
    result: string;
    /** 视频播放地址 */
    message: string;
    /** 视频清晰度 */
    quality: number;
    /** 视频格式 */
    format: string;
    /** 视频时长 (ms) */
    timelength: number;
    /** 视频支持格式 */
    accept_format: string;
    /** 视频支持格式描述 */
    accept_description: Array<string>;
    /** 视频支持清晰度 */
    accept_quality: Array<number>;
    /** 视频编码 ID */
    video_codecid: number;
    /** 视频跳转参数 */
    seek_param: string;
    /** 视频跳转类型 */
    seek_type: string;
    /** dash 播放地址 */
    dash: UrlDash;
    /** mp4 播放地址 */
    durl: Array<UrlDurl>;
    /** 视频支持格式 */
    support_formats: Array<UrlFormat>;
    /** 视频高清格式 */
    high_format: unknown;
    /** 视频上次播放时间 */
    last_play_time: number;
    /** 视频上次播放分 P 号 */
    last_play_cid: number;
  };

  /**
   * Bili 视频播放地址（dash）
   * @since Beta v0.4.1
   */
  type UrlDash = {
    /** 视频播放地址时长 */
    duration: number;
    /** 视频播放地址缓冲时间 */
    minBufferTime: number;
    /** 视频播放地址缓冲时间 */
    min_buffer_time: number;
    /** 视频播放地址（视频流） */
    video: Array<UrlDashData>;
    /** 视频播放地址（音频流） */
    audio: Array<UrlDashData>;
    /** 杜比音频 */
    dolby: {
      /** 杜比音频类型 */
      type: number;
      /** 杜比音频 */
      audio: number;
    };
    /** flac 音频 */
    flac: unknown;
  };

  /**
   * Bili 视频 dash 返回视频数据
   * @since Beta v0.4.1
   */
  type UrlDashData = {
    /** 视频播放地址 ID */
    id: number;
    /** 视频播放地址 */
    baseUrl: string;
    /** 视频播放地址 */
    base_url: string;
    /** 视频备用播放地址 */
    backupUrl: Array<string>;
    /** 视频备用播放地址 */
    backup_url: Array<string>;
    /** 视频播放地址带宽 */
    bandwidth: number;
    /** 视频播放地址类型 */
    mimeType: string;
    /** 视频播放地址类型 */
    mime_type: string;
    /** 视频播放地址编码 */
    codecs: string;
    /** 视频播放地址宽度 */
    width: number;
    /** 视频播放地址高度 */
    height: number;
    /** 视频播放地址帧率 */
    frameRate: string;
    /** 视频播放地址帧率 */
    frame_rate: string;
    /** 视频播放比例 */
    sar: string;
    /** 是否从 SAP 开始 */
    startWithSap: number;
    /** 是否从 SAP 开始 */
    start_with_sap: number;
    /** 初始化段信息 */
    segmentBase: {
      /** 初始化 */
      Initialization: string;
      /** 索引范围 */
      indexRange: string;
    };
    /** 初始化段信息 */
    segment_base: {
      /** 初始化 */
      initialization: string;
      /** 索引范围 */
      index_range: string;
    };
    /** 视频播放地址编码 ID */
    codecid: number;
  };

  /**
   * Bili 视频播放地址（mp4）
   * @since Beta v0.4.1
   */
  type UrlDurl = {
    /** 视频播放地址序号 */
    order: number;
    /** 视频播放地址长度 */
    length: number;
    /** 视频播放地址大小 */
    size: number;
    /** 视频播放地址 */
    ahead: string;
    /** 视频播放地址 */
    vhead: string;
    /** 视频播放地址 */
    url: string;
    /** 视频备用播放地址 */
    backup_url: unknown;
  };

  /**
   * Bili 视频支持格式
   * @since Beta v0.4.1
   */
  type UrlFormat = {
    /** 视频清晰度 */
    quality: number;
    /** 视频格式 */
    format: string;
    /** 视频格式描述 */
    new_description: string;
    /** 视频格式描述 */
    display_desc: string;
    /** 视频格式描述 */
    superscript: string;
    /** 视频编码 */
    codecs: unknown;
  };
}
