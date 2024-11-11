/**
 * @file types/Sqlite/Combat.d.ts
 * @description 幻想真境剧诗类型定义文件
 * @since Beta v0.6.3
 */

declare namespace TGApp.Sqlite.Combat {
  /**
   * @description 数据库-幻想真境剧诗表
   * @since Beta v0.6.3
   * @interface SingleTable
   * @property {string} uid - 用户 UID
   * @property {number} id - 剧诗 ID
   * @property {string} startTime - 开始时间
   * @property {string} endTime - 结束时间
   * @property {boolean} hasData - 是否有数据
   * @property {boolean} hasDetailData - 是否有详细数据
   * @property {TGApp.Game.Combat.Stat} stat - 概况
   * @property {TGApp.Game.Combat.Detail} detail - 详情
   * @property {string} updated - 更新时间
   * @return SingleTable
   */
  interface RawTable {
    uid: string;
    id: number;
    startTime: string;
    endTime: string;
    hasData: 0 | 1;
    hasDetailData: 0 | 1;
    stat: string;
    detail: string;
    updated: string;
  }

  /**
   * @description 数据库-幻想真境剧诗表
   * @since Beta v0.6.3
   * @interface SingleTable
   * @property {string} uid - 用户 UID
   * @property {number} id - 剧诗 ID
   * @property {string} startTime - 开始时间
   * @property {string} endTime - 结束时间
   * @property {boolean} hasData - 是否有数据
   * @property {boolean} hasDetailData - 是否有详细数据
   * @property {TGApp.Game.Combat.Stat} stat - 概况
   * @property {TGApp.Game.Combat.Detail} detail - 详情
   * @property {string} updated - 更新时间
   * @return SingleTable
   */
  interface SingleTable {
    uid: string;
    id: number;
    startTime: string;
    endTime: string;
    hasData: boolean;
    hasDetailData: boolean;
    stat: TGApp.Game.Combat.Stat;
    detail: TGApp.Game.Combat.Detail;
    updated: string;
  }
}
