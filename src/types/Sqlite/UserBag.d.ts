/**
 * 用户背包物品相关类型定义文件
 * @since Beta v0.10.5
 */

declare namespace TGApp.Sqlite.UserBag {
  /**
   * 用户背包材料表-存储数据
   * @since Beta v0.9.0
   */
  type MaterialRaw = {
    /** 存档/用户UID */
    uid: number;
    /** 材料ID */
    id: number;
    /** 材料数量 */
    count: number;
    /** 材料更新记录 */
    records: string;
    /** 更新时间 */
    updated: string;
  };

  /**
   * 用户背包材料表-解析数据
   * @since Beta v0.9.0
   */
  type MaterialTable = {
    /** 存档/用户UID */
    uid: number;
    /** 材料ID */
    id: number;
    /** 材料数量 */
    count: number;
    /** 材料更新记录 */
    records: Array<MaterialRecord>;
    /** 更新时间 */
    updated: string;
  };

  /**
   * 材料更新记录
   * @since Beta v0.9.0
   */
  type MaterialRecord = {
    /** 数量 */
    count: number;
    /** 时间戳（秒） */
    time: number;
    /**
     * 是否是手动更新
     * @remarks 该字段默认不存在，手动更新时添加该字段
     */
    manual?: boolean;
  };

  /**
   * 用户背包武器表-存储数据
   * @since Beta v0.9.0
   */
  type WeaponRaw = {
    /** 存档/用户UID */
    uid: number;
    /** 武器GUID */
    guid: string;
    /** 武器ID */
    id: number;
    /** 武器信息JSON */
    info: string;
    /** 更新时间 */
    updated: string;
  };

  /**
   * 用户背包武器表-解析数据
   * @since Beta v0.9.0
   */
  type WeaponTable = {
    /** 存档/用户UID */
    uid: number;
    /** 武器GUID */
    guid: string;
    /** 武器ID */
    id: number;
    /** 武器信息 */
    info: TGApp.Plugins.Yae.WeaponInfo;
    /** 更新时间 */
    updated: string;
  };

  /**
   * 用户背包圣遗物表-存储数据
   * @since Beta v0.9.0
   */
  type RelicRaw = {
    /** 存档/用户UID */
    uid: number;
    /** 圣遗物GUID */
    guid: string;
    /** 圣遗物ID */
    id: number;
    /** 圣遗物信息JSON */
    info: string;
    /** 更新时间 */
    updated: string;
  };

  /**
   * 用户背包圣遗物表-解析数据
   * @since Beta v0.9.0
   */
  type RelicTable = {
    /** 存档/用户UID */
    uid: number;
    /** 圣遗物GUID */
    guid: string;
    /** 圣遗物ID */
    id: number;
    /** 圣遗物信息 */
    info: TGApp.Plugins.Yae.ReliquaryInfo;
    /** 更新时间 */
    updated: string;
  };
}
