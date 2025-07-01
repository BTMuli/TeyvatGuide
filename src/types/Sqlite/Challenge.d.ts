/**
 * @file types/Sqlite/Challenge.d.ts
 * @description 幽境危战类型定义文件
 * @since Beta v0.8.0
 */

declare namespace TGApp.Sqlite.Challenge {
  /**
   * @description 数据库-幽境危战表（原始数据）
   * @since Beta v0.8.0
   * @interface RawTable
   * @property {string} uid - 用户 UID
   * @property {number} id - 挑战 ID
   * @property {string} startTime - 开始时间
   * @property {string} endTime - 结束时间
   * @property {string} name - 挑战名称
   * @property {string} single - 挑战单个数据（JSON 字符串）
   * @property {string} mp - 挑战多人数据（JSON 字符串）
   * @property {string} updated - 更新时间
   */
  type RawTable = {
    uid: string;
    id: number;
    startTime: string;
    endTime: string;
    name: string;
    single: string; // JSON 字符串
    mp: string; // JSON 字符串
    updated: string;
  };

  /**
   * @description 数据库-幽境危战表
   * @since Beta v0.8.0
   * @interface SingleTable
   * @property {string} uid - 用户 UID
   * @property {number} id - 挑战 ID
   * @property {string} startTime - 开始时间
   * @property {string} endTime - 结束时间
   * @property {string} name - 挑战名称
   * @property {TGApp.Game.Challenge.ChallengeSingle} single - 挑战单个数据
   * @property {TGApp.Game.Challenge.ChallengeMp} mp - 挑战多人数据
   * @property {string} updated - 更新时间
   */
  type SingleTable = {
    uid: string;
    id: number;
    startTime: string;
    endTime: string;
    name: string;
    single: TGApp.Game.Challenge.ChallengeSingle;
    mp: TGApp.Game.Challenge.ChallengeMp;
    updated: string;
  };
}
