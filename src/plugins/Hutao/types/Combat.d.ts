/**
 * 幻想真境剧诗
 * @since Beta v0.6.3
 */

declare namespace TGApp.Plugins.Hutao.Combat {
  /**
   * 上传返回
   * @since Beta v0.6.3
   */
  type UploadResp = TGApp.Plugins.Hutao.Base.Resp;

  /**
   * 上传数据
   * @since Beta v0.6.3
   */
  type UploadData = {
    /** 版本号 */
    Version: number;
    /** 用户 UID */
    Uid: string;
    /** 身份标识 */
    Identity: string;
    /** 备选角色 ID 列表 */
    BackupAvatars: Array<number>;
    /** 期数 ID */
    ScheduleId: number;
  };

  /**
   * 数据获取返回
   * @since Beta v0.6.3
   */
  type Response = TGApp.Plugins.Hutao.Base.Resp<Data>;

  /**
   * 数据
   * @since Beta v0.6.3
   */
  type Data = {
    /** 期数 */
    ScheduleId: string;
    /** 总数 */
    RecordTotal: number;
    /** 时间戳 */
    Timestamp: number;
    /** 使用率 */
    BackupAvatarRates: Array<TGApp.Plugins.Hutao.Base.Rate>;
  };
}
