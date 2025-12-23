/**
 * 留影叙佳期
 * @since Beta v0.9.1
 */

declare namespace TGApp.Archive.Birth {
  /**
   * 日历数据
   * @since Beta v0.4.4
   */
  type CalendarData = Record<string, Array<CalendarItem>>;

  /**
   * 日历数据条目
   * @since Beta v0.4.4
   */
  type CalendarItem = {
    /** 角色ID */
    role_id: number;
    /** 角色名 */
    name: string;
    /** 角色生日 */
    role_birthday: string;
    /** 头像 */
    head_icon: string;
    /** 是否订阅 */
    is_subscribe: boolean;
  };

  /**
   * 卡片数据条目
   * @since Beta v0.4.4
   */
  type DrawItem = {
    /** 留言 */
    word_text: string;
    /** 年份 */
    year: number;
    /** 生日 m/d */
    birthday: string;
    /** 角色 id */
    role_id: number;
    /** 角色名 */
    role_name: string;
    /** 画片地址 [荧，空] */
    take_picture: Array<string>;
    /** 未读画片地址 [荧，空] */
    unread_picture: Array<string>;
    /** 画片 xml */
    gal_xml: string;
    /** 画片资源 */
    gal_resource: string;
    /** 操作 id */
    op_id: number;
  };

  /**
   * 角色数据条目
   * @since Beta v0.4.4
   */
  type RoleItem = {
    /** 角色 id */
    role_id: number;
    /** 角色名 */
    name: string;
    /** 所属 */
    belong: string;
    /** 神力类型 */
    divine_type: string;
    /** 是否是神 */
    is_god: boolean;
    /** 命座 */
    seat_life: string;
    /** 元素 */
    element: string;
    /** 介绍 */
    text: string;
    /** 生日 m/d */
    role_birthday: string;
    /** 头像 */
    head_icon: string;
    /** 头像 */
    head_image: string;
    /** 介绍 */
    introduce: string;
    /** 是否订阅 */
    is_subscribe: boolean;
    /** 是否完成任务 */
    is_finish_task: boolean;
    /** 当前补偿数量 */
    current_compensate_num: number;
    /** 是否补偿数量 */
    is_compensate_num: boolean;
    /** 年份补偿数量 */
    year_compensate_num: number;
  };

  /**
   * 转换后的资源数据
   * @since Beta v0.9.1
   */
  type GalSrcFull = {
    /** 资源数据 */
    resource: Array<GalSrcRes>;
    /** 角色数据 */
    roles: Array<GalSrcRole>;
  };

  /**
   * 资源数据条目
   * @since Beta v0.9.1
   */
  type GalSrcRes = {
    /** 资源类型 */
    type: string;
    /** 资源引用 */
    rel: string;
    /** 资源地址 */
    src: string;
    /** 资源ID */
    id: string;
    /** 资源Group */
    group: string;
  };

  /**
   * 角色资源数据条目
   * @since Beta v0.9.1
   */
  type GalSrcRole = {
    /** 角色ID */
    id: string;
    /** 角色名 */
    name: string;
    /** 角色Key */
    key?: string;
  };

  /**
   * 转换后的播放数据
   * @since Beta v0.9.1
   */
  type GalScenes = Array<GalScriptScene>;

  /**
   * 播放场景数据条目
   * @since Beta v0.9.1
   */
  type GalScriptScene = {
    /** 场景ID */
    id: string;
    /** 场景名称 */
    title: string;
    /** 场景背景bg名称 */
    bg: string;
    /** 前一个场景ID */
    prev?: string;
    /** 场景脚本 */
    comments: Array<GalDialog>;
  };

  /**
   * 播放脚本数据条目
   * @since Beta v0.9.1
   */
  type GalDialog = {
    /** key */
    key: string;
    /** 角色 */
    role?: string;
    /** 图片名称 */
    img?: string;
    /** 图片2 */
    img2?: string;
    /** 位置 */
    pos?: string;
    /** 对话内容 */
    text: string;
  };
}
