/**
 * @file plugins/Sqlite/utils/transUserCombat.ts
 * @description Sqlite 数据转换-幻想真境剧诗
 * @since Beta v0.6.3
 */

import { timestampToDate } from "../../../utils/toolFunc.js";

/**
 * @description 将通过 api 获取到的数据转换为数据库中的数据
 * @since Beta v0.6.3
 * @param {TGApp.Game.Combat.Combat} data - 剧诗数据
 * @returns {TGApp.Sqlite.Combat.SingleTable} 转换后端数据
 */
export function transUserCombat(data: TGApp.Game.Combat.Combat): TGApp.Sqlite.Combat.SingleTable {
  return {
    uid: "",
    detail: data.detail,
    endTime: timestampToDate(Number(data.schedule.end_time) * 1000),
    hasData: data.has_data,
    hasDetailData: data.has_detail_data,
    id: data.schedule.schedule_id,
    startTime: timestampToDate(Number(data.schedule.start_time) * 1000),
    stat: data.stat,
    updated: timestampToDate(new Date().getTime()),
  };
}
