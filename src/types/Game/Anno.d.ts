/**
 * 游戏公告相关类型
 * @since Beta v0.9.1
 */

declare namespace TGApp.Game.Anno {
  /**
   * 公告语言类型
   * @since Beta v0.9.1
   */
  const AnnoLang = <const>{
    /** 简体中文 */
    CHS: "zh-cn",
    /** 繁体中文 */
    CHT: "zh-tw",
    /** 英语 */
    EN: "en",
    /** 日语 */
    JP: "ja",
  };

  /**
   * 公告语言类型枚举
   * @since Beta v0.9.1
   */
  type AnnoLangEnum = (typeof AnnoLang)[keyof typeof AnnoLang];

  /**
   * 公告请求参数
   * @since Beta v0.9.1
   */
  type Params = {
    /** 游戏名称 */
    game: string;
    /** 游戏 Biz */
    game_biz: string;
    /** 语言 */
    lang: AnnoLangEnum;
    /** 包 ID */
    bundle_id: string;
    /** 平台 */
    platform: string;
    /** 服务器 */
    region: TGApp.Game.Base.ServerTypeEnum;
    /** 等级 */
    level: string;
    /** UID */
    uid: string;
  };

  /**
   * 公告列表返回响应
   * @since Beta v0.9.1
   */
  type ListResp = TGApp.BBS.Response.BaseWithData<ListRes>;

  /**
   * 公告列表返回
   * @since Beta v0.9.1
   */
  type ListRes = {
    /** 公告列表 */
    list: Array<ListItem>;
    /** 公告总数 */
    total: number;
    /** 类型列表 */
    type_list: Array<ListType>;
    /** 是否有提醒 */
    alert: boolean;
    /** 时区  */
    time_zone: number;
    /**
     * 验证key，与公告详情对应
     * @remarks 原神的 t 可以舍弃
     */
    t: string;
    /** 图片列表 */
    pic_list: Array<unknown>;
    /** 图片总数 */
    pic_total: number;
    /** 图片类型列表 */
    pic_type_list: Array<unknown>;
    /** 图片提示 */
    pic_alert: boolean;
    /** 图片提示 ID */
    pic_alert_id: number;
    /** 静态签名 */
    static_sign: unknown;
    /** BANNER */
    banner: string;
    /** 活动日历 */
    calendar_type: AnnoCalendar;
    /**
     * 是否使用 WEBP
     * @example
     * "1" - 使用
     */
    use_webp: string;
  };

  /**
   * 公告列表项
   * @since Beta v0.9.1
   */
  type ListItem = {
    /** 公告列表 */
    list: Array<ListAnno>;
    /** 公告类型 ID */
    type_id: number;
    /** 公告类型标签 */
    type_label: string;
  };

  /**
   * 公告列表项单公告
   * @since Beta v0.9.1
   */
  type ListAnno = {
    /** 公告 ID */
    ann_id: number;
    /** 公告标题 */
    title: string;
    /** 公告副标题 */
    subtitle: string;
    /** 公告图片 */
    banner: string;
    /** 公告内容 */
    content: unknown;
    /** 公告类型标签 */
    type_label: string;
    /** 公告标签 */
    tag_label: string;
    /** 公告标签图标 */
    tag_icon: string;
    /** 是否登录提示 */
    login_alert: number;
    /** 公告语言 */
    lang: string;
    /** 公告开始时间，例如 `"2023-03-01 07:00:00"` */
    start_time: string;
    /** 公告结束时间，例如 `"2023-04-12 06:00:00"` */
    end_time: string;
    /** 公告类型 */
    type: number;
    /** 公告提醒 */
    remind: number;
    /** 公告紧急 */
    alert: number;
    /** 公告标签开始时间，例如 `"2000-01-02 15:04:05"` */
    tag_start_time: string;
    /** 公告标签结束时间，例如 `"2030-01-02 15:04:05"` */
    tag_end_time: string;
    /** 公告提醒版本 */
    remind_ver: number;
    /** 是否有内容 */
    has_content: boolean;
    /** 是否有额外提醒 */
    extra_remind: boolean;
    /** 公告标签悬停图标 */
    tag_icon_hover: string;
    /** 是否登出提醒 */
    logout_remind: number;
    /** 登出提醒版本 */
    logout_remind_ver: number;
    /** 公告国家 */
    country: string;
    /** 是否需要提醒文本 */
    need_remind_text: number;
    /** 提醒文本 */
    remind_text: string;
    /** 弱提醒 */
    weak_remind: number;
    /** 提醒消费类型 */
    remind_consumption_type: number;
  };

  /**
   * 公告类型列表项。
   * @since Beta v0.9.1
   */
  type ListType = {
    /** 公告类型 ID */
    id: number;
    /** 公告类型名称 */
    name: string;
    /** 公告类型国际化名称 */
    mi18n_name: string;
  };

  /**
   * 公告日历类型。
   * @since Beta v0.9.1
   */
  type AnnoCalendar = {
    /** 公告日历国际化名称 */
    mi18n_name: string;
    /** 是否启用 */
    enabled: boolean;
    /** 是否提醒 */
    remind: boolean;
  };

  /**
   * 公告详情返回响应
   * @since Beta v0.9.1
   */
  type DetailResp = TGApp.BBS.Response.BaseWithData<DetailRes>;

  /**
   * 公告详情返回数据
   * @since Beta v0.9.1
   */
  type DetailRes = {
    /** 公告列表 */
    list: Array<AnnoDetail>;
    /** 总数 */
    total: number;
    /** 图片列表 */
    pic_list: Array<unknown>;
    /** 图片总数 */
    pic_total: number;
  };

  /**
   * 公告详情
   * @since Beta v0.9.1
   */
  type AnnoDetail = {
    /** 公告ID */
    ann_id: number;
    /** 公告标题 */
    title: string;
    /** 公告副标题 */
    subtitle: string;
    /** 公告图片 */
    banner: string;
    /**
     * 公告内容
     * @remarks htmlText
     */
    content: string;
    /** 语言 */
    lang: AnnoLangEnum;
  };
}
