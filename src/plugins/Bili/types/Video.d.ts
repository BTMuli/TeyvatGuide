/**
 * @file plugins/Bili/types/Video.d.ts
 * @description Bili 插件视频类型定义文件
 * @since Beta v0.4.1
 */

/**
 * @description Bili 插件视频类型
 * @since Beta v0.4.1
 * @namespace Video
 * @memberof TGApp.Plugins.Bili
 */
declare namespace TGApp.Plugins.Bili.Video {
  /**
   * @description Bili 视频基本信息返回
   * @since Beta v0.4.0
   * @interface ViewResponse
   * @extends {TGApp.Plugins.Bili.Base.Response}
   * @property {ViewData} data 视频基本信息
   * @return ViewResponse
   */
  interface ViewResponse extends TGApp.Plugins.Bili.Base.Response {
    data: ViewData;
  }

  /**
   * @description Bili 视频基本信息
   * @since Beta v0.4.0
   * @see https://api.bilibili.com/x/web-interface/view?aid=540893019
   * @interface ViewData
   * @property {string} bvid 视频BV号
   * @property {number} aid 视频AV号
   * @property {number} videos 视频分P数量
   * @property {number} tid 视频分区ID
   * @property {string} tname 视频分区名称
   * @property {number} copyright 版权信息 // 1为原创
   * @property {string} pic 视频封面图片地址
   * @property {string} title 视频标题
   * @property {string} pubdate 视频发布时间，时间戳（秒）
   * @property {number} ctime 视频创建时间，时间戳（秒）
   * @property {string} desc 视频简介
   * @property {string} desc_v2.raw_text 视频简介（纯文本）
   * @property {number} desc_v2.type 视频简介类型
   * @property {number} desc_v2.biz_id 视频简介ID
   * @property {number} state 视频状态
   * @property {number} duration 视频时长
   * @property {unknown} rights 视频权限
   * @property {number} owner.mid 视频作者UID
   * @property {string} owner.name 视频作者昵称
   * @property {string} owner.face 视频作者头像
   * @property {number} stat.aid 视频AV号
   * @property {number} stat.view 视频播放量
   * @property {number} stat.danmaku 视频弹幕数量
   * @property {number} stat.reply 视频评论数量
   * @property {number} stat.favorite 视频收藏数量
   * @property {number} stat.coin 视频硬币数量
   * @property {number} stat.share 视频分享数量
   * @property {number} stat.now_rank 视频当前排名
   * @property {number} stat.his_rank 视频历史最高排名
   * @property {number} stat.like 视频点赞数量
   * @property {number} stat.dislike 视频点踩数量
   * @property {string} stat.evaluation 视频评分
   * @property {number} stat.vt 视频投稿类型
   * @property {unknown} argue_info 视频争议信息
   * @property {string} dynamic 视频动态信息
   * @property {number} cid 视频弹幕ID
   * @property {number} dimension.width 视频宽度
   * @property {number} dimension.height 视频高度
   * @property {number} dimension.rotate 视频旋转角度
   * @property {unknown} premiere 视频预告信息
   * @property {number} teenage_mode 视频青少年模式
   * @property {boolean} is_chargeable_season 视频是否为付费分P
   * @property {boolean} is_story 视频是否为剧集
   * @property {boolean} is_upower_exclusive 视频是否为大会员专享
   * @property {boolean} is_upower_play 视频是否为大会员免广告
   * @property {boolean} is_upower_preview 视频是否为大会员免前置广告
   * @property {number} enable_vt 视频是否开启投稿
   * @property {string} vt_display 视频投稿类型显示
   * @property {boolean} no_cache 视频是否不缓存
   * @property {unknown} pages 视频分P信息
   * @property {unknown} subtitle 视频字幕信息
   * @property {boolean} is_season_display 视频是否为剧集
   * @property {unknown} user_garb 视频用户抽奖信息
   * @property {unknown} honor_reply 视频荣誉信息
   * @property {unknown} like_icon 视频点赞图标信息
   * @property {boolean} need_jump_bv 视频是否需要跳转BV号
   * @property {boolean} disable_show_up_info 视频是否禁止显示UP主信息
   * @property {boolean} is_story_play 视频是否为剧集免广告
   * @return ViewData
   */
  interface ViewData {
    bvid: string;
    aid: number;
    videos: number;
    tid: number;
    tname: string;
    copyright: number;
    pic: string;
    title: string;
    pubdate: string;
    ctime: number;
    desc: string;
    desc_v2: {
      raw_text: string;
      type: number;
      biz_id: number;
    };
    state: number;
    duration: number;
    rights: unknown;
    owner: {
      mid: number;
      name: string;
      face: string;
    };
    stat: {
      aid: number;
      view: number;
      danmaku: number;
      reply: number;
      favorite: number;
      coin: number;
      share: number;
      now_rank: number;
      his_rank: number;
      like: number;
      dislike: number;
      evaluation: string;
      vt: number;
    };
    argue_info: unknown;
    dynamic: string;
    cid: number;
    dimension: {
      width: number;
      height: number;
      rotate: number;
    };
    premiere: unknown;
    teenage_mode: number;
    is_chargeable_season: boolean;
    is_story: boolean;
    is_upower_exclusive: boolean;
    is_upower_play: boolean;
    is_upower_preview: boolean;
    enable_vt: number;
    vt_display: string;
    no_cache: boolean;
    pages: unknown;
    subtitle: unknown;
    is_season_display: boolean;
    user_garb: unknown;
    honor_reply: unknown;
    like_icon: unknown;
    need_jump_bv: boolean;
    disable_show_up_info: boolean;
    is_story_play: boolean;
  }

  /**
   * @description Bili 视频链接返回
   * @since Beta v0.4.0
   * @interface UrlResponse
   * @extends {TGApp.Plugins.Bili.Base.Response}
   * @property {UrlData} data 视频链接
   * @return UrlResponse
   */
  interface UrlResponse extends TGApp.Plugins.Bili.Base.Response {
    data: UrlData;
  }

  /**
   * @description Bili 视频播放地址返回数据
   * @since Beta v0.4.1
   * @interface UrlData
   * @property {string} from 视频来源
   * @property {string} result 视频播放地址
   * @property {string} message 视频播放地址
   * @property {number} quality 视频清晰度
   * @property {string} format 视频格式
   * @property {number} timelength 视频时长 (ms)
   * @property {string} accept_format 视频支持格式
   * @property {string[]} accept_description 视频支持格式描述
   * @property {number[]} accept_quality 视频支持清晰度
   * @property {number} video_codecid 视频编码ID
   * @property {string} seek_param 视频跳转参数
   * @property {string} seek_type 视频跳转类型
   * @property {UrlDash} dash 视频播放地址
   * @property {UrlDurl[]} durl 视频播放地址
   * @property {UrlFormat[]} support_formats 视频支持格式
   * @property {unknown} high_format 视频高清格式
   * @property {number} last_play_time 视频上次播放时间
   * @property {number} last_play_cid 视频上次播放分P号
   * @return UrlData
   */
  interface UrlData {
    from: string;
    result: string;
    message: string;
    quality: number;
    format: string;
    timelength: number;
    accept_format: string;
    accept_description: string[];
    accept_quality: number[];
    video_codecid: number;
    seek_param: string;
    seek_type: string;
    dash: UrlDash; // dash 返回
    durl: UrlDurl[]; // mp4 返回
    support_formats: UrlFormat[];
    high_format: unknown;
    last_play_time: number;
    last_play_cid: number;
  }

  /**
   * @description Bili 视频播放地址
   * @since Beta v0.4.1
   * @interface UrlDash
   * @property {number} duration 视频播放地址时长
   * @property {number} minBufferTime 视频播放地址缓冲时间
   * @property {number} min_buffer_time 视频播放地址缓冲时间
   * @property {UrlDashData[]} video 视频播放地址
   * @property {UrlDashData[]} audio 视频播放地址
   * @property {number} dolby.type 杜比音频类型
   * @property {number} dolby.audio 杜比音频
   * @property {unknown} flac flac音频
   * @return UrlDash
   */
  interface UrlDash {
    duration: number;
    minBufferTime: number;
    min_buffer_time: number;
    video: UrlDashData[];
    audio: UrlDashData[];
    dolby: {
      type: number;
      audio: number;
    };
    flac: unknown;
  }

  /**
   * @description Bili 视频dash返回视频数据
   * @since Beta v0.4.1
   * @interface UrlDashData
   * @property {number} id 视频播放地址ID
   * @property {string} baseUrl 视频播放地址
   * @property {string} base_url 视频播放地址
   * @property {string[]} backupUrl 视频备用播放地址
   * @property {string[]} backup_url 视频备用播放地址
   * @property {number} bandwidth 视频播放地址带宽
   * @property {string} mimeType 视频播放地址类型
   * @property {string} mime_type 视频播放地址类型
   * @property {string} codecs 视频播放地址编码
   * @property {number} width 视频播放地址宽度
   * @property {number} height 视频播放地址高度
   * @property {string} frameRate 视频播放地址帧率
   * @property {string} frame_rate 视频播放地址帧率
   * @property {string} sar 视频播放地址比例
   * @property {number} startWithSap 是否从SAP开始
   * @property {number} start_with_sap  是否从SAP开始
   * @property {string} segmentBase.Initialization 初始化
   * @property {string} segmentBase.indexRange 索引范围
   * @property {string} segment_base.initialization 初始化
   * @property {string} segment_base.index_range 索引范围
   * @property {number} codecid 视频播放地址编码ID
   * @return UrlDashData
   */
  interface UrlDashData {
    id: number;
    baseUrl: string;
    base_url: string;
    backupUrl: string[];
    backup_url: string[];
    bandwidth: number;
    mimeType: string;
    mime_type: string;
    codecs: string;
    width: number;
    height: number;
    frameRate: string;
    frame_rate: string;
    sar: string;
    startWithSap: number;
    start_with_sap: number;
    segmentBase: {
      Initialization: string;
      indexRange: string;
    };
    segment_base: {
      initialization: string;
      index_range: string;
    };
    codecid: number;
  }

  /**
   * @description Bili 视频播放地址
   * @since Beta v0.4.1
   * @interface UrlDurl
   * @property {number} order 视频播放地址序号
   * @property {number} length 视频播放地址长度
   * @property {number} size 视频播放地址大小
   * @property {string} ahead 视频播放地址
   * @property {string} vhead 视频播放地址
   * @property {string} url 视频播放地址
   * @property {unknown} backup_url 视频备用播放地址
   * @return UrlDurl
   */
  interface UrlDurl {
    order: number;
    length: number;
    size: number;
    ahead: string;
    vhead: string;
    url: string;
    backup_url: unknown;
  }

  /**
   * @description Bili 视频支持格式
   * @since Beta v0.4.1
   * @interface UrlFormat
   * @property {number} quality 视频清晰度
   * @property {string} format 视频格式
   * @property {string} new_description 视频格式描述
   * @property {string} display_desc 视频格式描述
   * @property {string} superscript 视频格式描述
   * @property {unknown} codecs 视频编码
   * @return UrlFormats
   */
  interface UrlFormat {
    quality: number;
    format: string;
    new_description: string;
    display_desc: string;
    superscript: string;
    codecs: unknown;
  }
}
