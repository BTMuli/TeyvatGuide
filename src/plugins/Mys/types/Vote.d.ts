/**
 * @file plugins/Mys/types/Vote.d.ts
 * @description Mys 插件投票类型定义文件
 * @since Beta v0.3.9
 */

/**
 * @description Mys 插件投票类型
 * @since Beta v0.3.9
 * @namespace TGApp.Plugins.Mys.Vote
 * @memberof TGApp.Plugins.Mys
 */
declare namespace TGApp.Plugins.Mys.Vote {
  /**
   * @description 投票信息返回
   * @since Beta v0.3.9
   * @interface InfoResponse
   * @extends TGApp.BBS.Response.BaseWithData
   * @property {Info[]} data.data 投票信息
   * @return InfoResponse
   */
  interface InfoResponse extends TGApp.BBS.Response.BaseWithData {
    data: {
      data: Info[];
    };
  }

  /**
   * @description 投票结果返回
   * @since Beta v0.3.9
   * @interface ResultResponse
   * @extends TGApp.BBS.Response.BaseWithData
   * @property {Result[]} data.data 投票结果
   * @return ResultResponse
   */
  interface ResultResponse extends TGApp.BBS.Response.BaseWithData {
    data: {
      data: Result[];
    };
  }

  /**
   * @description 投票信息
   * @since Beta v0.3.9
   * @interface Info
   * @property {string} vote_id 投票 ID
   * @property {string} uid 用户 ID
   * @property {number} vote_limit 投票限制
   * @property {number} end_time 投票结束时间（秒级时间戳）
   * @property {string} title 投票标题
   * @property {string[]} vote_option_indexes 投票选项索引
   * @property {string} created_at 投票创建时间（秒级时间戳）
   * @return Info
   */
  interface Info {
    vote_id: string;
    uid: string;
    vote_limit: number;
    end_time: number;
    title: string;
    vote_option_indexes: string[];
    created_at: string;
  }

  /**
   * @description 投票结果
   * @since Beta v0.3.9
   * @interface Result
   * @property {string} vote_id 投票 ID
   * @property {boolean} is_over 是否已结束
   * @property {Record<string, number>} option_stats 投票选项统计
   * @property {number} user_cnt 投票人数
   * @property {unknown[]} vote_option_indexes 投票选项索引
   * @return Result
   */
  interface Result {
    vote_id: string;
    is_over: boolean;
    option_stats: Record<string, number>;
    user_cnt: number;
    vote_option_indexes: unknown[];
  }
}
