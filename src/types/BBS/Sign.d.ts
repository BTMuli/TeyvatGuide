/**
 * 游戏签到类型声明
 * @since Beta v0.7.2
 */

declare namespace TGApp.BBS.Sign {
  /**
   * 获取签到奖励信息返回响应
   * @since Beta v0.7.2
   */
  type HomeResp = TGApp.BBS.Response.BaseWithData<HomeRes>;

  /**
   * 签到奖励信息
   * @since Beta v0.7.2
   */
  type HomeRes = {
    /** 月份 */
    month: number;
    /** 奖励列表 */
    awards: Array<HomeAward>;
    /** 业务标识 */
    biz: string;
    /** 是否补签 */
    resign: boolean;
    /** 活动额外奖励 */
    short_extra_award: HomeAwardExtra;
  };

  /**
   * 签到奖励
   * @since Beta v0.7.2
   */
  type HomeAward = {
    /** 图标 */
    icon: string;
    /** 名称 */
    name: string;
    /** 数量 */
    cnt: number;
  };

  /**
   * 签到额外奖励
   * @since Beta v0.7.2
   */
  type HomeAwardExtra = {
    /** 是否有活动 */
    has_extra_award: boolean;
    /** 开始时间 */
    start_time: string;
    /** 结束时间 */
    end_time: string;
    /** 奖励列表 */
    list: Array<HomeAward>;
    /** 开始时间戳（秒） */
    start_timestamp: string;
    /** 结束时间戳（秒） */
    end_timestamp: string;
  };

  /**
   * 获取签到信息返回响应
   * @interface InfoResp
   * @since Beta v0.7.2
   */
  type InfoResp = TGApp.BBS.Response.BaseWithData<InfoRes>;

  /**
   * 签到信息返回
   * @since Beta v0.7.2
   */
  type InfoRes = {
    /** 总签到天数 */
    total_sign_day: number;
    /** 今日日期 */
    today: string;
    /** 是否签到 */
    is_sign: boolean;
    /** 是否补签 */
    is_sub: boolean;
    /**
     * 服务器
     * @remarks cn_gf01,cn_qd01等
     */
    region: string;
    /** 漏签天数 */
    sign_cnt_missed: number;
    /** 额外活动签到天数 */
    short_sign_day: number;
    /** TODO: 未知字段 */
    send_first: boolean;
  };

  /**
   * 签到返回响应
   * @since Beta v0.7.2
   */
  type SignResp = TGApp.BBS.Response.BaseWithData<SignRes>;

  /**
   * 签到返回
   * @since Beta v0.7.2
   */
  type SignRes = {
    /** 极验Challenge */
    challenge: string;
    /** 签到状态码 */
    code: string;
    /** 极验Gt */
    gt: string;
    /** 是否高风险 */
    is_risk: boolean;
    /** 风险码 */
    risk_code: number;
    /** 是否成功 */
    success: number;
  };

  /**
   * 获取补签信息返回响应
   * @since Beta v0.9.0
   */
  type ResignInfoResp = TGApp.BBS.Response.BaseWithData<ResignInfoRes>;

  /**
   * 补签信息返回
   * @since Beta v0.9.0
   */
  type ResignInfoRes = {
    /** 日 */
    resign_info_daily: number;
    /** 月 */
    resign_info_monthly: number;
    /** 日限制 */
    resign_limit_daily: number;
    /** 月限制 */
    resign_limit_monthly: number;
    /** 漏签天数 */
    sign_cnt_missed: number;
    /** 米游币 */
    coin_cnt: number;
    /** 补签花费  */
    coin_cost: number;
    /** 补签规则 */
    rule: string;
    /** 是否签到 */
    signed: boolean;
    /** 签到天数 */
    sign_days: number;
    /** 花费 */
    cost: number;
    /** 月补签次数 */
    month_quality_cnt: number;
    /** 剩余补签次数*/
    quality_cnt: number;
  };

  /**
   * 执行补签返回响应
   * @since Beta v0.9.0
   */
  type ResignResp = TGApp.BBS.Response.BaseWithData<ResignRes>;

  /**
   * 执行补签返回信息
   * @since Beta v0.9.0
   */
  type ResignRes = {
    /** 信息 */
    message: string;
  };
}
