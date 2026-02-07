/**
 * UIGF 标准类型定义文件
 * @since Beta v0.9.5
 * @remarks UIGF v3.0 | UIGF v4.2
 */

declare namespace TGApp.Plugins.UIGF {
  /**
   * UIGF 数据
   * @since Beta v0.5.0
   * @remarks UIGF v3.0
   */
  type Schema = {
    /** 头部信息 */
    info: Info;
    /** 祈愿列表 */
    list: Array<GachaItem>;
  };

  /**
   * Root键
   * @since Beta v0.9.5
   * @remarks hk4e - 祈愿数据
   * @remarks hk4e_ugc - 颂愿数据
   */
  type Schema4RootKey = "hk4e" | "hk4e_ugc";

  /**
   * Root键对应类型
   * @since Beta v0.9.5
   */
  type Schema4RootType<T extends Schema4RootKey> = T extends "hk4e"
    ? Array<GachaHk4e>
    : T extends "hk4e_ugc"
      ? Array<GachaUgc>
      : never;

  /**
   * UIGF 数据， v4.2
   * @since Beta v0.9.5
   */
  type Schema4<K extends Schema4RootKey = never> = {
    /** 头部信息 */
    info: Info4;
  } & {
    [P in K]: Schema4RootType<P>;
  } & {
    [P in Exclude<Schema4RootKey, K>]?: Schema4RootType<P>;
  };

  /**
   * UIGF 头部信息
   * @since Beta v0.5.0
   * @remarks UIGF v3.0
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
   * @remarks UIGF v4.0+
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
    /** 祈愿数据 */
    list: Array<GachaItem>;
  };

  /**
   * UIGF4 祈愿项，千星奇域
   * @since Beta v0.9.5
   */
  type GachaUgc = {
    /** UID */
    uid: string | number;
    /** 时区 */
    timezone: number;
    /** 语言 */
    lang?: string;
    /** 颂愿数据 */
    list: Array<GachaItemB>;
  };

  /**
   * UIGF 祈愿项-原神
   * @since Beta v0.5.1
   * @remarks UIGF v3.0
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
   * @since Beta v0.9.5
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
    /** 时间 yyyy-MM-dd HH:mm:ss */
    time: string;
    /** 祈愿类型，用于接口请求 */
    op_gacha_type: string;
  };
}
