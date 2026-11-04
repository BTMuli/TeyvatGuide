/**
 * 国服原神兑换结果类型
 * @since Beta v0.13.0
 */
declare namespace TGApp.Game.Redeem {
  /**
   * 单次兑换响应，消息经过本地转换
   * @since Beta v0.13.0
   */
  type Response = {
    /** 官方业务码；-1 表示结果未知，-2 表示未发送 */
    retcode: number;
    /** 可直接展示的安全消息 */
    message: string;
  };

  /**
   * 单个兑换码的批量处理结果
   * @since Beta v0.13.0
   */
  type Result = Response & {
    /** 本次处理的兑换码 */
    code: string;
  };
}
