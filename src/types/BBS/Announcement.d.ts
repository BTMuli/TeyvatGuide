/**
 * @file types/BBS/Announcement.d.ts
 * @description 从 BBS 获取到的游戏内公告类型定义文件
 * @since Beta v0.8.0
 */

declare namespace TGApp.BBS.Announcement {
  /**
   * @description 公告语言类型
   * @since Beta v0.7.7
   * @const AnnoLang
   * @property {string} "zh-cn" - 简体中文
   * @property {string} "zh-tw" - 繁体中文
   * @property {string} "en" - 英语
   * @property {string} "ja" - 日语
   */
  const AnnoLang = <const>{
    CHS: "zh-cn",
    CHT: "zh-tw",
    EN: "en",
    JP: "ja",
  };

  /**
   * @description 公告语言类型枚举
   * @since Beta v0.7.7
   * @enum AnnoLangEnum
   */
  type AnnoLangEnum = (typeof AnnoLang)[keyof typeof AnnoLang];

  /**
   * @description 公告类型
   * @since Beta v0.7.7
   * @const AnnoType
   * @property {string} "activity" - 活动公告
   * @property {string} "game" - 游戏公告
   */
  const AnnoType = <const>{
    ACTIVITY: "activity",
    GAME: "game",
  };

  /**
   * @description 公告类型枚举
   * @since Beta v0.7.7
   * @enum AnnoTypeEnum
   */
  type AnnoTypeEnum = (typeof AnnoType)[keyof typeof AnnoType];

  /**
   * @description 需要的参数
   * @interface Params
   * @since Beta v0.8.0
   * @property {string} game - 游戏名称
   * @property {string} game_biz - 游戏业务名称
   * @property {string} lang - 语言
   * @property {string} bundle_id - 包 ID
   * @property {string} platform - 平台
   * @property {TGApp.Game.Base.ServerTypeEnum} region - 区域
   * @property {string} level - 等级
   * @property {string} uid - 用户 ID
   */
  type Params = {
    game: string;
    game_biz: string;
    lang: AnnoLangEnum;
    bundle_id: string;
    platform: string;
    region: TGApp.Game.Base.ServerTypeEnum;
    level: string;
    uid: string;
  };

  /**
   * @description 公告列表返回响应类型
   * @interface ListResp
   * @since Alpha v0.1.5
   * @extends TGApp.BBS.Response.BaseWithData<ListRes>
   * @return ListResp
   */
  type ListResp = TGApp.BBS.Response.BaseWithData<ListRes>;

  /**
   * @description 公告列表数据
   * @interface ListRes
   * @since Beta v0.7.7
   * @property {Array<ListItem>} list - 公告列表
   * @property {number} total - 公告总数
   * @property {Array<ListType>} type_list - 公告类型列表
   * @property {boolean} alert - 是否有紧急公告
   * @property {number} time_zone - 时区
   * @property {string} t - 时间戳，单位为秒
   * @property {Array<unknown>} pic_list - 图片列表
   * @property {number} pic_total - 图片总数
   * @property {Array<unknown>} pic_type_list - 图片类型列表
   * @property {boolean} pic_alert - 是否有紧急图片
   * @property {number} pic_alert_id - 紧急图片 ID
   * @property {unknown} static_sign - 静态签名
   * @return ListRes
   */
  type ListRes = {
    list: Array<ListItem>;
    total: number;
    type_list: Array<ListType>;
    alert: boolean;
    time_zone: number;
    t: string;
    pic_list: Array<unknown>;
    pic_total: number;
    pic_type_list: Array<unknown>;
    pic_alert: boolean;
    pic_alert_id: number;
    static_sign: unknown;
    banner: string;
    calendar_type: ListCalendar;
  };

  /**
   * @description 公告列表项
   * @interface ListItem
   * @since Alpha v0.1.5
   * @property {Array<AnnoSingle>} list - 公告列表
   * @property {number} type_id - 公告类型 ID
   * @property {string} type_label - 公告类型标签
   * @return ListItem
   */
  type ListItem = { list: Array<AnnoSingle>; type_id: number; type_label: string };

  /**
   * @description 单个公告内容
   * @interface AnnoSingle
   * @since Alpha v0.1.5
   * @property {number} ann_id 公告 ID
   * @property {string} title 公告标题
   * @property {string} subtitle 公告副标题
   * @property {string} banner 公告图片
   * @property {unknown} content 公告内容
   * @property {string} type_label 公告类型标签
   * @property {string} tag_label 公告标签
   * @property {string} tag_icon 公告标签图标
   * @property {number} login_alert 是否登录提示
   * @property {string} lang 公告语言
   * @property {string} start_time 公告开始时间 // "2023-03-01 07:00:00"
   * @property {string} end_time 公告结束时间 // "2023-04-12 06:00:00"
   * @property {number} type 公告类型
   * @property {number} remind 公告提醒
   * @property {number} alert 公告紧急
   * @property {string} tag_start_time 公告标签开始时间 // "2000-01-02 15:04:05"
   * @property {string} tag_end_time 公告标签结束时间 // "2030-01-02 15:04:05"
   * @property {number} remind_ver 公告提醒版本
   * @property {boolean} has_content 是否有内容
   * @property {boolean} extra_remind 是否有额外提醒
   * @property {string} tag_icon_hover 公告标签悬停图标
   * @property {number} logout_remind 是否登出提醒
   * @property {number} logout_remind_ver 登出提醒版本
   * @property {string} country 公告国家
   * @property {number} need_remind_text 是否需要提醒文本
   * @property {string} remind_text 提醒文本
   * @property {number} weak_remind 弱提醒
   * @property {number} remind_consumption_type 提醒消费类型
   */
  type AnnoSingle = {
    ann_id: number;
    title: string;
    subtitle: string;
    banner: string;
    content: unknown;
    type_label: string;
    tag_label: string;
    tag_icon: string;
    login_alert: number;
    lang: string;
    start_time: string;
    end_time: string;
    type: number;
    remind: number;
    alert: number;
    tag_start_time: string;
    tag_end_time: string;
    remind_ver: number;
    has_content: boolean;
    extra_remind: boolean;
    tag_icon_hover: string;
    logout_remind: number;
    logout_remind_ver: number;
    country: string;
    need_remind_text: number;
    remind_text: string;
    weak_remind: number;
    remind_consumption_type: number;
  };

  /**
   * @description 公告类型列表项
   * @interface ListType
   * @since Alpha v0.1.5
   * @property {number} id 公告类型 ID
   * @property {string} name 公告类型名称
   * @property {string} mi18n_name 公告类型国际化名称
   */
  type ListType = { id: number; name: string; mi18n_name: string };

  /**
   * @description 公告日历类型
   * @interface ListCalendar
   * @since Beta v0.7.7
   * @property {string} mi18n_name 公告日历国际化名称
   * @property {boolean} enabled 是否启用
   * @property {boolean} remind 是否提醒
   */
  type ListCalendar = { mi18n_name: string; enabled: boolean; remind: boolean };

  /**
   * @description 公告内容返回响应类型
   * @interface DetailResp
   * @since Alpha v0.1.5
   * @extends TGApp.BBS.Response.BaseWithData<DetailRes>
   */
  type DetailResp = TGApp.BBS.Response.BaseWithData<DetailRes>;

  /**
   * @description 公告内容数据
   * @interface DetailRes
   * @since Alpha v0.1.5
   * @property {Array<AnnoDetail>} list - 公告内容列表
   * @property {number} total - 公告内容总数
   * @property {Array<unknown>} pic_list - 图片列表
   * @property {number} pic_total - 图片总数
   */
  type DetailRes = {
    list: Array<AnnoDetail>;
    total: number;
    pic_list: Array<unknown>;
    pic_total: number;
  };

  /**
   * @description 公告内容列表项
   * @interface AnnoDetail
   * @since Alpha v0.1.5
   * @property {number} ann_id 公告 ID
   * @property {string} title 公告标题
   * @property {string} subtitle 公告副标题
   * @property {string} banner 公告图片
   * @property {string} content 公告内容，为 html
   * @property {string} lang 公告语言
   */
  type AnnoDetail = {
    ann_id: number;
    title: string;
    subtitle: string;
    banner: string;
    content: string;
    lang: string;
  };
}
