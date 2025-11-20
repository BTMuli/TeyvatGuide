/**
 * 极验验证相关类型定义文件
 * @since Beta v0.8.7
 */

declare namespace TGApp.BBS.Geetest {
  /**
   * @description 创建验证的响应
   * @since Beta v0.7.1
   * @interface CreateResp
   * @extends TGApp.BBS.Response.BaseWithData
   * @property {CreateRes} data - 极验验证数据
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
    /* gt */
    gt: string;
    /* challenge */
    challenge: string;
    /* 是否是新验证码 */
    new_captcha: number;
    /* 验证成功标志 */
    success: number;
    /* 是否使用 Gt4 验证 */
    use_v4: boolean;
  };

  /**
   * 新版 Gt4 验证的响应数据
   * @since Beta v0.8.7
   */
  type Gt4CreateRes = {
    /* gt */
    gt: string;
    /* 是否是新验证码 */
    new_captcha: number;
    /* 风险类型 */
    risk_type: string;
    /* 验证成功标志 */
    success: number;
    /* 是否使用 Gt4 验证 */
    use_v4: boolean;
  };

  /**
   * @description 验证极验验证的响应
   * @since Beta v0.7.1
   * @interface VerifyResp
   * @extends TGApp.BBS.Response.Base
   * @property {VerifyRes} data - 极验验证数据
   */
  type VerifyResp = TGApp.BBS.Response.BaseWithData<VerifyRes>;

  /**
   * @description 极验验证的请求数据
   * @since Beta v0.7.1
   * @interface VerifyRes
   * @property {string} challenge - 极验验证 challenge
   * @property {string} validate - 极验验证 validate
   */
  type VerifyRes = { challenge: string };

  /**
   * @description 极验验证的请求方法-请求参数
   * @since Beta v0.7.1
   * @interface InitGeetestParams
   * @property {string} gt - 极验验证 gt
   * @property {string} challenge - 极验验证 challenge
   * @property {boolean} offline - 极验验证 offline
   * @property {boolean} new_captcha - 极验验证 new_captcha
   * @property {string} product - 极验验证 product
   * @property {string} width - 极验验证 width
   * @property {string} area - 极验验证 area
   */
  type InitGeetestParams = {
    gt: string;
    challenge: string;
    offline: boolean;
    new_captcha: boolean;
    product: string;
    width: string;
    area: string;
  };

  type InitGeetest4Params = {
    /* 验证ID */
    captchaId: string;
    /* 验证形式 */
    riskType: string;
    /* 展现形式 */
    product: string;
    /* 宽度 */
    nextWidth: string;
    /* 用户信息 */
    userInfo: unknown;
    /* 语言 */
    lang: string;
  };

  /**
   * @description Geetest 插件 captchaObj
   * @since Beta v0.8.3
   * @interface GeetestCaptcha
   * @property {Function} appendTo
   * @property {Function} getValidate
   * @property {Function} onClose
   * @property {Function} onReady
   */
  type GeetestCaptcha = {
    appendTo: (selector: string) => void;
    getValidate: () => Promise<GeetestVerifyRes>;
    onClose: (callback: () => void) => boolean;
    onReady: (callback: () => void) => void;
    onSuccess: (callback: () => void) => void;
  };

  /**
   * @description Geetest 插件 validate
   * @since Beta v0.7.1
   * @interface GeetestVerifyRes
   * @property {string} geetest_challenge
   * @property {string} geetest_validate
   * @property {string} geetest_seccode
   */
  type GeetestVerifyRes = {
    geetest_challenge: string;
    geetest_validate: string;
    geetest_seccode: string;
  };
}
