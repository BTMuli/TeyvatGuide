/**
 * @file plugins/Mys/types/Geetest.d.ts
 * @description Mys 插件 Geetest 类型定义文件
 * @since Beta v0.5.1
 */

/**
 * @description Mys 插件 Geetest 类型
 * @since Beta v0.5.1
 * @namespace TGApp.Plugins.Mys.Geetest
 * @memberof TGApp.Plugins.Mys
 */
declare namespace TGApp.Plugins.Mys.Geetest {
  /**
   * @description 极验验证的响应数据
   * @since Beta v0.5.1
   * @interface reqResp
   * @property {string} gt - 极验验证 gt
   * @property {string} challenge - 极验验证 challenge
   * @property {number} new_captcha - 极验验证 new_captcha
   * @property {number} success - 极验验证 success
   * @return reqResp
   */
  interface reqResp {
    gt: string;
    challenge: string;
    new_captcha: number;
    success: number;
  }

  /**
   * @description 极验验证的请求数据
   * @since Beta v0.5.1
   * @interface postData
   * @property {string} challenge - 极验验证 challenge
   * @property {string} validate - 极验验证 validate
   * @return postData
   */
  interface postData {
    challenge: string;
    validate: string;
  }

  /**
   * @description 极验验证的请求方法-请求参数
   * @since Beta v0.5.1
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
  interface InitGeetestParams {
    gt: string;
    challenge: string;
    offline: boolean;
    new_captcha: boolean;
    product: string;
    width: string;
    area: string;
  }

  /**
   * @description Geetest 插件 captchaObj
   * @since Beta v0.5.1
   * @interface GeetestCaptcha
   * @property {Function} appendTo
   * @property {Function} getValidate
   * @property {Function} onSuccess
   * @property {Function} onClose
   * @return GeetestCaptcha
   */
  interface GeetestCaptcha {
    appendTo: (selector: string) => void;
    getValidate: () => validateResp;
    onSuccess: (callback: () => void) => void;
    onClose: (callback: () => void) => void;
  }

  /**
   * @description Geetest 插件 validate
   * @since Beta v0.5.1
   * @interface validateResp
   * @property {string} geetest_challenge
   * @property {string} geetest_validate
   * @property {string} geetest_seccode
   * @return validateResp
   */
  interface validateResp {
    geetest_challenge: string;
    geetest_validate: string;
    geetest_seccode: string;
  }
}
