/**
 * @file types/BBS/Mission.d.ts
 * @description BBS 任务相关类型定义文件
 * @since Beta v0.6.10/v0.7.0
 */

declare namespace TGApp.BBS.Mission {
  /**
   * @description 任务信息返回
   * @interface InfoResp
   * @extends TGApp.BBS.Response.BaseWithData
   * @since Beta v0.6.10/v0.7.0
   * @property {TGApp.BBS.Mission.InfoRes} data 任务信息
   * @return InfoResp
   */
  type InfoResp = TGApp.BBS.Response.BaseWithData<InfoRes>;

  /**
   * @description 任务信息
   * @interface InfoRes
   * @since Beta v0.6.10/v0.7.0
   * @property {Array<MissionItem>} missions 任务列表
   * @property {Array<MissionItem>} more_missions 更多任务列表
   * @return InfoRes
   */
  type InfoRes = { missions: Array<MissionItem>; more_missions: Array<MissionItem> };

  /**
   * @description 任务项
   * @interface MissionItem
   * @since Beta v0.6.10/v0.7.0
   * @property {number} id 任务 ID
   * @property {string} name 任务名称
   * @property {string} desc 任务描述
   * @property {number} threshold 任务完成阈值
   * @property {number} limit 任务限制
   * @property {number} exp 任务经验
   * @property {number} points 米游币
   * @property {number} active_time 任务激活时间，秒级时间戳
   * @property {number} end_time 任务结束时间
   * @property {boolean} is_auto_send_award 是否自动发放奖励
   * @property {number} continuous_cycle_times 连续周期次数
   * @property {number} next_points 下一次奖励米游币
   * @property {string} mission_key 任务 key
   * @return MissionItem
   */
  type MissionItem = {
    id: number;
    name: string;
    desc: string;
    threshold: number;
    limit: number;
    exp: number;
    points: number;
    active_time: number;
    end_time: number;
    is_auto_send_award: boolean;
    continuous_cycle_times: number;
    next_points: number;
    mission_key: string;
  };
}
