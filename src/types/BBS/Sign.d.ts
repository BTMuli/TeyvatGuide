/**
 * @file types/BBS/Sign.d.ts
 * @description 米游社游戏签到模块相关类型声明
 * @since Beta v0.7.2
 */

declare namespace TGApp.BBS.Sign {
  /**
   * @description 获取签到奖励信息返回
   * @interface HomeResp
   * @since Beta v0.7.2
   * @extends TGApp.BBS.Response.BaseWithData
   * @property {HomeRes} data - 返回数据
   * @returns HomeResp
   */
  type HomeResp = TGApp.BBS.Response.BaseWithData<HomeRes>;

  /**
   * @description 获取签到奖励信返回数据
   * @interface HomeRes
   * @property {number} month - 月份
   * @property {Array<HomeAward>} awards - 签到奖励列表
   * @property {string} biz - 业务标识
   * @property {boolean} resign - 是否补签
   * @property {HomeAwardExtra} short_extra_award - 签到额外奖励
   * @returns HomeRes
   */
  type HomeRes = {
    month: number;
    awards: Array<HomeAward>;
    biz: string;
    resign: boolean;
    short_extra_award: HomeAwardExtra;
  };

  /**
   * @description 签到奖励
   * @interface HomeAward
   * @property {string} icon - 奖励图标
   * @property {string} name - 奖励名称
   * @property {number} cnt - 奖励数量
   * @returns HomeAward
   */
  type HomeAward = { icon: string; name: string; cnt: number };

  /**
   * @description 签到额外奖励
   * @interface HomeAwardExtra
   * @property {boolean} has_extra_award - 是否有额外奖励
   * @property {string} start_time - 额外奖励开始时间
   * @property {string} end_time - 额外奖励结束时间
   * @property {Array<HomeAward>} list - 额外奖励列表
   * @property {string} start_timestamp - 额外奖励开始时间戳
   * @property {string} end_timestamp - 额外奖励结束时间戳
   * @returns HomeAwardExtra
   */
  type HomeAwardExtra = {
    has_extra_award: boolean;
    start_time: string;
    end_time: string;
    list: Array<HomeAward>;
    start_timestamp: string;
    end_timestamp: string;
  };

  /**
   * @description 获取签到信息返回
   * @interface InfoResp
   * @since Beta v0.7.2
   * @extends TGApp.BBS.Response.BaseWithData
   * @property {InfoRes} data - 返回数据
   * @returns InfoResp
   */
  type InfoResp = TGApp.BBS.Response.BaseWithData<InfoRes>;

  /**
   * @description 获取签到信息返回数据
   * @interface InfoRes
   * @since Beta v0.7.2
   * @property {number} total_sign_day - 总签到天数
   * @property {string} today - 今日日期
   * @property {boolean} is_sign - 是否已签到
   * @property {boolean} is_sub - 是否已补签
   * @property {string} region - 服务器
   * @property {number} sign_cnt_missed - 未签到天数
   * @property {number} short_sign_day - 未知属性
   * @property {boolean} send_first - 是否首签
   * @return InfoRes
   */
  type InfoRes = {
    total_sign_day: number;
    today: string;
    is_sign: boolean;
    is_sub: boolean;
    region: string;
    sign_cnt_missed: number;
    short_sign_day: number;
    send_first: boolean;
  };

  /**
   * @description 签到返回
   * @interface SignResp
   * @since Beta v0.7.2
   * @extends TGApp.BBS.Response.BaseWithData
   * @property {SignRes} data - 返回数据
   * @returns SignResp
   */
  type SignResp = TGApp.BBS.Response.BaseWithData<SignRes>;

  /**
   * @description 签到返回数据
   * @interface SignRes
   * @since Beta v0.7.2
   * @property {string} challenge - gt-challenge
   * @property {string} code - 签到状态码
   * @property {string} gt - gt
   * @property {boolean} is_risk - 是否有风险
   * @property {number} risk_code - 风险码
   * @property {number} success - 是否成功
   * @return SignRes
   */
  type SignRes = {
    challenge: string;
    code: string;
    gt: string;
    is_risk: boolean;
    risk_code: number;
    success: number;
  };
}
