/**
 * 用户背包物品相关类型定义文件
 * @since Beta v0.9.0
 */

declare namespace TGApp.Sqlite.UserBag {
  /**
   * 用户背包材料表-存储数据
   * @since Beta v0.9.0
   */
  type TableMaterialRaw = {
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
  type TableMaterial = {
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
  };
}
