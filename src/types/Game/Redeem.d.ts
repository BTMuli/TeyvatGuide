/**
 * 国服游戏兑换结果类型
 * @since Beta v0.13.0
 */
declare namespace TGApp.Game.Redeem {
  /** 支持兑换的游戏配置 @since Beta v0.13.0 */
  type Config = { gid: number; biz: string; name: string; host: string; regions: Array<string> };
  /** 独立模拟预览数据，不使用账号凭据 @since Beta v0.13.0 */
  type Preview = { roles: Array<TGApp.Sqlite.Account.Game>; results: Array<Result> };

  /**
   * 单个兑换码的批量处理结果
   * @since Beta v0.13.0
   */
  type Result = Pick<TGApp.BBS.Response.Base, "retcode" | "message"> & {
    /** 本次处理的兑换码 */
    code: string;
  };
}
