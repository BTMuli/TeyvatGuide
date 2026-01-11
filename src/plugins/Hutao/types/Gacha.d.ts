/**
 * 祈愿相关
 * @since Beta v0.9.1
 */

declare namespace TGApp.Plugins.Hutao.Gacha {
  /**
   * EntriesResp
   * @since Beta v0.9.1
   */
  type EntryResp = TGApp.Plugins.Hutao.Base.Resp<EntryRes>;

  /**
   * EntriesRes
   * @since Beta v0.9.1
   */
  type EntryRes = Array<EntryItem>;

  /**
   * EntryItem
   * @since Beta v0.9.1
   */
  type EntryItem = {
    /** UID */
    Uid: string;
    /** cnt */
    ItemCount: number;
    /**
     * excluded
     * @remarks 未知用途
     */
    Excluded: boolean;
  };

  /**
   * 获取EndId列表响应
   * @since Beta v0.9.1
   */
  type EndIdResp = TGApp.Plugins.Hutao.Base.Resp<EndIdRes>;

  /**
   * EndId返回
   * @since Beta v0.9.1
   */
  type EndIdRes = {
    /** 新手 */
    "100": number;
    /** 常驻 */
    "200": number;
    /** 角色活动 */
    "301": number;
    /** 武器活动 */
    "302": number;
    /** 集录 */
    "500": number;
  };

  /**
   * 祈愿记录返回响应
   * @since Beta v0.9.1
   */
  type GachaLogResp = TGApp.Plugins.Hutao.Base.Resp<GachaLogRes>;

  /**
   * 祈愿记录返回
   * @since Beta v0.9.1
   */
  type GachaLogRes = Array<GachaLog>;
  /**
   * 祈愿记录
   * @since Beta v0.9.1
   */
  type GachaLog = {
    /** 卡池类型 */
    GachaType: number;
    /** 卡池类型(UIGF) */
    QueryType: number;
    /** 物品ID */
    ItemId: number;
    /**
     * 时间
     * @example 2023-05-24T02:33:23+00:00
     */
    Time: string;
    /** Id */
    Id: number | bigint;
  };

  /**
   * 上传响应
   * @since Beta v0.9.1
   */
  type UploadResp = TGApp.Plugins.Hutao.Base.Resp<string>;

  /**
   * 上传数据
   * @since Beta v0.9.1
   */
  type UploadData = {
    /** UID */
    Uid: string;
    /** 数据 */
    Items: Array<GachaLog>;
  };
}
