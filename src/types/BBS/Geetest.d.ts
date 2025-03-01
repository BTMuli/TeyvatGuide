/**
 * @file types/BBS/Geetest.d.ts
 * @description 米游社Geetest 类型定义文件
 * @since Beta v0.7.1
 */

declare namespace TGApp.BBS.Geetest {
  /**
   * @description 创建验证的响应
   * @since Beta v0.7.1
   * @interface CreateResp
   * @extends TGApp.BBS.Response.BaseWithData
   * @property {CreateRes} data - 极验验证数据
   * @return CreateResp
   */
  type CreateResp = TGApp.BBS.Response.BaseWithData<CreateRes>;

  /**
   * @description 极验验证的响应数据
   * @since Beta v0.7.1
   * @interface CreateRes
   * @property {string} gt - 极验验证 gt
   * @property {string} challenge - 极验验证 challenge
   * @property {number} new_captcha - 极验验证 new_captcha
   * @property {number} success - 极验验证 success
   * @return CreateRes
   */
  type CreateRes = { gt: string; challenge: string; new_captcha: number; success: number };

  /**
   * @description 验证极验验证的响应
   * @since Beta v0.7.1
   * @interface VerifyResp
   * @extends TGApp.BBS.Response.Base
   * @property {VerifyRes} data - 极验验证数据
   * @return VerifyResp
   */
  type VerifyResp = TGApp.BBS.Response.BaseWithData<VerifyRes>;

  /**
   * @description 极验验证的请求数据
   * @since Beta v0.7.1
   * @interface VerifyRes
   * @property {string} challenge - 极验验证 challenge
   * @property {string} validate - 极验验证 validate
   * @return VerifyRes
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
   * @return InitGeetestParams
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

  /**
   * @description Geetest 插件 captchaObj
   * @since Beta v0.7.1
   * @interface GeetestCaptcha
   * @property {Function} appendTo
   * @property {Function} getValidate
   * @property {Function} onSuccess
   * @property {Function} onClose
   * @property {Function} onReady
   * @return GeetestCaptcha
   */
  type GeetestCaptcha = {
    appendTo: (selector: string) => void;
    getValidate: () => validateResp;
    onSuccess: (callback: () => void) => void;
    onClose: (callback: () => void) => void;
    onReady: (callback: () => void) => void;
  };

  /**
   * @description Geetest 插件 validate
   * @since Beta v0.7.1
   * @interface GeetestVerifyRes
   * @property {string} geetest_challenge
   * @property {string} geetest_validate
   * @property {string} geetest_seccode
   * @return GeetestVerifyRes
   */
  type GeetestVerifyRes = {
    geetest_challenge: string;
    geetest_validate: string;
    geetest_seccode: string;
  };
}
