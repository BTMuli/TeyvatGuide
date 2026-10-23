/**
 * 米社帖子投票相关类型
 * @since Beta v0.12.6
 */

declare namespace TGApp.BBS.Vote {
  /**
   * APK createVote 请求体。
   * @since Beta v0.12.6
   */
  type CreateRequest = {
    /** 秒级结束时间 */
    end_time: number;
    /** 投票标题 */
    title: string;
    /** 每个用户可选的选项数量 */
    vote_limit: number;
    /** 投票选项 */
    vote_options: Array<string>;
  };

  /** createVote 响应数据。 @since Beta v0.12.6 */
  type CreateData = { vote_id: string };

  /** createVote 响应。 @since Beta v0.12.6 */
  type CreateResp = TGApp.BBS.Response.BaseWithData<CreateData>;

  /**
   * 投票信息返回响应
   * @since Beta v0.3.9
   */
  type InfoResp = TGApp.BBS.Response.BaseWithData<InfoRes>;

  /**
   * 投票结果返回响应
   * @since Beta v0.3.9
   */
  type ResultResp = TGApp.BBS.Response.BaseWithData<ResultRes>;

  /**
   * 投票信息返回数据
   * @since Beta v0.9.1
   */
  type InfoRes = {
    /** 投票信息 */
    data: Array<Info>;
  };

  /**
   * 投票结果返回数据
   * @since Beta v0.9.1
   */
  type ResultRes = {
    /** 投票结果 */
    data: Array<Result>;
  };

  /**
   * 投票信息
   * @since Beta v0.3.9
   */
  type Info = {
    /**
     * 创建时间
     * @remarks 秒级时间戳
     */
    created_at: string;
    /**
     * 结束时间
     * @remarks 秒级时间戳
     */
    end_time: number;
    /** 投票标题 */
    title: string;
    /** 用户 ID */
    uid: string;
    /** 投票 ID */
    vote_id: string;
    /** 投票限制 */
    vote_limit: number;
    /** 投票选项索引 */
    vote_option_indexes: Array<string>;
  };

  /**
   * 投票结果
   * @since Beta v0.3.9
   */
  type Result = {
    /** 投票ID */
    vote_id: string;
    /** 是否结束 */
    is_over: boolean;
    /** 投票选项统计 */
    option_stats: Record<string, number>;
    /** 投票人数 */
    user_cnt: number;
    /** 投票选项索引 */
    vote_option_indexes: Array<unknown>;
  };
}
