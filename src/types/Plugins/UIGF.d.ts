/**
 * @file types/Plugins/UIGF.d.ts
 * @description UIGF 插件类型定义文件
 * @since Beta v0.5.0
 * @version UIGF v3.0 | UIGF v4.0
 */

declare namespace TGApp.Plugins.UIGF {
  /**
   * @description UIGF 数据
   * @since Beta v0.5.0
   * @interface Schema
   * @property {Info} info - UIGF 头部信息
   * @property {GachaItem[]} list - UIGF 祈愿列表
   * @return Schema
   */
  interface Schema {
    info: Info;
    list: GachaItem[];
  }

  /**
   * @description UIGF 数据， v4.0
   * @since Beta v0.5.0
   * @interface Schema4
   * @property {Info4} info - UIGF 头部信息
   * @property {GachaItem4[]} hk4e - UIGF 祈愿列表，原神数据
   * @return Schema4
   */
  interface Schema4 {
    info: Info4;
    hk4e: GachaHk4e[];
  }

  /**
   * @description UIGF 头部信息
   * @since Beta v0.5.0
   * @interface Info
   * @see docs\UIGF.md
   * @property {string} uid - UID
   * @property {string} lang - 语言
   * @property {string} uigf_version - UIGF 版本，应用使用的是 2.3.0
   * @property {number} export_timestamp - 导出时间戳(秒)
   * @property {string} export_time - 导出时间 yyyy-MM-dd HH:mm:ss
   * @property {string} export_app - 导出应用
   * @property {string} export_app_version - 导出应用版本
   * @property {number} region_time_zone - 时区
   * @return Info
   */
  interface Info {
    uid: string;
    lang: string;
    uigf_version: string;
    export_timestamp?: number;
    export_time?: string;
    export_app?: string;
    export_app_version?: string;
    region_time_zone?: number;
  }

  /**
   * @description UIGF 头部信息， v4.0
   * @since Beta v0.5.0
   * @interface Info4
   * @see docs\UIGF4.md
   * @property {string} export_timestamp - 导出时间戳(秒)
   * @property {string} export_app - 导出应用
   * @property {string} export_app_version - 导出应用版本
   * @property {string} version - UIGF 版本
   * @return Info4
   */
  interface Info4 {
    export_timestamp: string;
    export_app: string;
    export_app_version: string;
    version: string;
  }

  /**
   * @description 祈愿类型
   * @since Alpha v0.2.3
   * @enum EnumGachaType
   * @property {string} CharacterUp - 角色活动祈愿
   * @property {string} CharacterUp2 - 角色活动祈愿2
   * @property {string} WeaponUp - 武器活动祈愿
   * @property {string} Normal - 普通祈愿
   * @property {string} Newbie - 新手祈愿
   * @return EnumGachaType
   */
  enum EnumGachaType {
    CharacterUp = "301",
    CharacterUp2 = "400",
    WeaponUp = "302",
    Normal = "200",
    Newbie = "100",
  }

  /**
   * @description UIGF 祈愿类型
   * @since Alpha v0.2.3
   * @enum EnumUigfGachaType
   * @property {string} CharacterUp - 角色活动祈愿&角色活动祈愿2
   * @property {string} WeaponUp - 武器活动祈愿
   * @property {string} Normal - 普通祈愿
   * @property {string} Newbie - 新手祈愿
   * @return EnumUigfGachaType
   */
  enum EnumUigfGachaType {
    CharacterUp = "301",
    WeaponUp = "302",
    Normal = "200",
    Newbie = "100",
  }

  /**
   * @description UIGF 祈愿列表
   * @since Alpha v0.2.3
   * @interface GachaItem
   * @property {EnumGachaType} gacha_type - 祈愿类型
   * @property {string} item_id - 物品ID
   * @property {string} count - 数量
   * @property {string} time - 时间 yyyy-MM-dd HH:mm:ss
   * @property {string} name - 名称
   * @property {string} item_type - 物品类型
   * @property {string} rank_type - 稀有度
   * @property {string} id - ID
   * @property {EnumUigfGachaType} uigf_gacha_type - UIGF 祈愿类型
   * @return GachaItem
   */
  interface GachaItem {
    uigf_gacha_type: string;
    gacha_type: string;
    item_id?: string;
    count?: string;
    time: string;
    name: string;
    item_type?: string;
    rank_type?: string;
    id: string;
  }

  /**
   * @description UIGF 祈愿列表， v4.0，原神数据
   * @since Beta v0.5.0
   * @interface GachaHk4e
   * @property {string|number} uid - UID
   * @property {number} timezone - 时区
   * @property {string} lang - 语言
   * @property {GachaItem[]} list - 祈愿列表
   * @return GachaHk4e
   */
  interface GachaHk4e {
    uid: string | number;
    timezone: number;
    lang?: string;
    list: GachaItem[];
  }
}
