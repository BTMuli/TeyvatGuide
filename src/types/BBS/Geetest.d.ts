/**
 * 极验验证相关类型定义文件
 * @since Beta v0.9.5
 */

declare namespace TGApp.BBS.Geetest {
  /**
   * 创建验证的响应
   * @since Beta v0.7.1
   */
  type CreateResp = TGApp.BBS.Response.BaseWithData<CreateRes>;

  /**
   * 极验验证的响应数据
   * @since Beta v0.8.7
   */
  type CreateRes = GtCreateRes | Gt4CreateRes;

  /**
   * 旧版极验验证的响应数据
   * @since Beta v0.8.7
   */
  type GtCreateRes = {
    /** gt */
    gt: string;
    /** challenge */
    challenge: string;
    /** 是否是新验证码 */
    new_captcha: number;
    /** 验证成功标志 */
    success: number;
    /** 是否使用 Gt4 验证 */
    use_v4?: boolean;
  };

  /**
   * 新版 Gt4 验证的响应数据
   * @since Beta v0.8.7
   */
  type Gt4CreateRes = {
    /** gt */
    gt: string;
    /** 是否是新验证码 */
    new_captcha: number;
    /** 风险类型 */
    risk_type: string;
    /** 验证成功标志 */
    success: number;
    /** 是否使用 Gt4 验证 */
    use_v4: boolean;
  };

  /**
   * 验证极验验证的响应
   * @since Beta v0.7.1
   */
  type VerifyResp = TGApp.BBS.Response.BaseWithData<VerifyRes>;

  /**
   * 极验验证的请求数据
   * @since Beta v0.7.1
   */
  type VerifyRes = {
    /** 极验验证 challenge */
    challenge: string;
  };

  /**
   * 极验验证的请求方法-请求参数
   * @since Beta v0.8.7
   */
  type InitGeetestParams = {
    /** gt */
    gt: string;
    /** challenge */
    challenge: string;
    /** 是否离线 */
    offline: boolean;
    /** 是否是新验证码 */
    new_captcha: boolean;
    /** 验证形式 */
    product: string;
    /** 宽度 */
    width: string;
    /** 覆盖区域 */
    area: string;
    /** 是否使用 https 协议 */
    https: boolean;
  };

  /**
   * 初始化 Gt4 验证的请求参数
   * @since Beta v0.9.5
   */
  type InitGeetest4Params = {
    /** 验证ID */
    captchaId: string;
    /** 验证形式 */
    riskType: string;
    /** 展现形式 */
    product: string;
    /** 宽度 */
    nextWidth: string;
    /** 用户信息 */
    userInfo: unknown;
    /** 语言 */
    lang: string;
    /** 协议头 */
    protocol: string;
    /**
     * 使用 https 协议
     * @remarks 改配置在部署文档中未提及但是在 js 中具有
     * - 部署文档：https://docs.geetest.com/gt4/apirefer/api/web#%E9%85%8D%E7%BD%AE%E5%8F%82%E6%95%B0
     * - JS: https://static.geetest.com/v4/gt4.js
     */
    https: boolean;
  };

  /**
   * GeetestCaptcha 对象
   * @since Beta v0.8.7
   */
  type GeetestCaptcha = {
    /** 将验证码添加到指定的选择器中 */
    appendTo: (selector: string) => void;
    /** 获取验证结果 */
    getValidate: () => Promise<GeetestVerifyRes>;
    /** 关闭回调 */
    onClose: (callback: () => void) => boolean;
    /** 准备就绪回调 */
    onReady: (callback: () => void) => void;
    /** 成功回调 */
    onSuccess: (callback: () => void) => void;
  };

  /**
   * 验证成功返回数据
   * @since Beta v0.8.7
   * @remarks 由于目前都是直接转 base64 字符串返回，故类型定义为 unknown
   */
  type GeetestVerifyRes = unknown;
}
