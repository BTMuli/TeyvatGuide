/**
 * @file plugins/Hutao/types/Combat.d.ts
 * @description 幻想真境剧诗
 * @since Beta v0.6.3
 */

declare namespace TGApp.Plugins.Hutao.Combat {
  /**
   * @description 上传返回
   * @since Beta v0.6.3
   * @interface UploadResponse
   * @extends TGApp.Plugins.Hutao.Base.Response
   * @return UploadResponse
   */
  type UploadResponse = TGApp.Plugins.Hutao.Base.Response;

  /**
   * @description 上传数据
   * @since Beta v0.6.3
   * @interface UploadData
   * @property {number} Version
   * @property {string} Uid
   * @property {string} Identity
   * @property {number[]} BackupAvatars
   * @property {number} ScheduleId
   * @return UploadData
   */
  interface UploadData {
    Version: number;
    Uid: string;
    Identity: string;
    BackupAvatars: Array<number>;
    ScheduleId: number;
  }

  /**
   * @description 数据获取返回
   * @since Beta v0.6.3
   * @interface Response
   * @extends TGApp.Plugins.Hutao.Base.Response
   * @property {Data} data
   * @return Response
   */
  interface Response extends TGApp.Plugins.Hutao.Base.Response {
    data: Data;
  }

  /**
   * @description 数据
   * @since Beta v0.6.3
   * @interface Data
   * @property {string} ScheduleId 期数
   * @property {number} RecordTotal 总数
   * @property {number} Timestamp 时间戳
   * @property {Array<TGApp.Plugins.Hutao.Base.Rate>} BackupAvatarRates 使用率
   * @return Data
   */
  interface Data {
    ScheduleId: string;
    RecordTotal: number;
    Timestamp: number;
    BackupAvatarRates: Array<TGApp.Plugins.Hutao.Base.Rate>;
  }
}
