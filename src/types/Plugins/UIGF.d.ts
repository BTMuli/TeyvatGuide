/**
 * UIGF 标准类型定义文件
 * @since Beta v0.8.4
 * @version UIGF v3.0 | UIGF v4.1
 */

declare namespace TGApp.Plugins.UIGF {
  /**
   * UIGF 数据
   * @since Beta v0.5.0
   * @version UIGF v3.0
   */
  type Schema = {
    /** 头部信息 */
    info: Info;
    /** 祈愿列表 */
    list: Array<GachaItem>;
  };

  /**
   * UIGF 数据， v4.0
   * @since Beta v0.8.4
   */
  type Schema4 = {
    /** 头部信息 */
    info: Info4;
    /** 祈愿列表，原神数据 */
    hk4e: Array<GachaHk4e>;
    /** 祈愿列表，千星奇域数据 */
    hk4e_ugc?: Array<GachaUgc>;
  };

  /**
   * UIGF 头部信息
   * @since Beta v0.5.0
   * @version UIGF v3.0
   */
  type Info = {
    /** UID */
    uid: string;
    /** 语言 */
    lang: string;
    /** UIGF 版本，应用使用的是 3.0 */
    uigf_version: string;
    /** 导出时间戳(秒) */
    export_timestamp?: number;
    /** 导出时间 yyyy-MM-dd HH:mm:ss */
    export_time?: string;
    /** 导出应用 */
    export_app?: string;
    /** 导出应用版本 */
    export_app_version?: string;
    /** 时区 */
    region_time_zone?: number;
  };

  /**
   * UIGF 头部信息
   * @since Beta v0.5.1
   * @version v4.0+
   */
  type Info4 = {
    /** 导出时间戳(秒) */
    export_timestamp: string;
    /** 导出应用 */
    export_app: string;
    /** 导出应用版本 */
    export_app_version: string;
    /** UIGF 版本 */
    version: string;
    /** 语言 */
    lang?: string;
  };

  /**
   * UIGF4 祈愿项，原神
   * @since Beta v0.5.0
   */
  type GachaHk4e = {
    /** UID */
    uid: string | number;
    /** 时区 */
    timezone: number;
    /** 语言 */
    lang?: string;
    list: Array<GachaItem>;
  };

  /**
   * UIGF4 祈愿项，千星奇域
   * @since Beta v0.8.4
   * @remarks 该标准尚未最终确定
   */
  type GachaUgc = {
    /** UID */
    uid: string | number;
    /** 时区 */
    timezone: number;
    /** 语言 */
    lang?: string;
    /** 服务器区域 */
    region: string;
    /** 祈愿列表 */
    list: Array<GachaItemB>;
  };

  /**
   * UIGF 祈愿项-原神
   * @since Beta v0.5.1
   * @version UIGF v3.0
   */
  type GachaItem = {
    /** UIGF 祈愿类型 */
    uigf_gacha_type: string;
    /** 祈愿类型 */
    gacha_type: string;
    /** 物品ID */
    item_id: string;
    /** 数量 */
    count?: string;
    /** 时间 yyyy-MM-dd HH:mm:ss */
    time: string;
    /** 名称 */
    name: string;
    /** 物品类型 */
    item_type?: string;
    /** 稀有度 */
    rank_type?: string;
    /** ID */
    id: string;
  };

  /**
   * UIGF 祈愿项-千星奇域
   * @since Beta v0.8.4
   * @remarks 该标准尚未最终确定
   */
  type GachaItemB = {
    /** id */
    id: string;
    /** 排期id */
    schedule_id: string;
    /** 物品类型 */
    item_type: string;
    /** 物品id */
    item_id: string;
    /** 名称 */
    item_name: string;
    /** 稀有度 */
    rank_type: string;
    /** 是否限定 */
    is_up: string;
    /** 时间 yyyy-MM-dd HH:mm:ss */
    time: string;
    /**
     * 祈愿类型
     * @remarks
     * 1000-常驻池
     * 2000-活动池
     */
    gacha_type: string;
    /** 祈愿类型，用于接口请求 */
    op_gacha_type: string;
  };
}
