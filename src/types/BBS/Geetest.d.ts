/**
 * @file types BBS Geetest.d.ts
 * @description BBS 极验相关类型定义文件
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.2.2
 */

declare namespace TGApp.BBS.Geetest {
  /**
   * @description 获取极验验证的响应数据
   * @since Alpha v0.2.2
   * @extends TGApp.BBS.Response.Base
   * @interface getResponse
   * @property {getData} data - 极验验证的响应数据
   * @return getGeetest
   */
  export interface getResponse extends TGApp.BBS.Response.Base {
    data: getData;
  }

  /**
   * @description 极验验证的响应数据
   * @since Alpha v0.2.2
   * @interface getData
   * @property {string} gt - 极验验证 gt
   * @property {string} challenge - 极验验证 challenge
   * @property {number} new_captcha - 极验验证 new_captcha
   * @property {number} success - 极验验证 success
   * @return getData
   */
  export interface getData {
    gt: string;
    challenge: string;
    new_captcha: number;
    success: number;
  }

  /**
   * @description 极验验证的请求数据
   * @since Alpha v0.2.2
   * @interface postData
   * @property {string} challenge - 极验验证 challenge
   * @property {string} validate - 极验验证 validate
   * @return postData
   */
  export interface postData {
    challenge: string;
    validate: string;
  }

  /**
   * @description 极验验证的请求方法-请求参数
   * @since Beta v0.3.3
   * @interface InitGeetestParams
   * @property {string} gt - 极验验证 gt
   * @property {string} challenge - 极验验证 challenge
   * @property {boolean} offline - 极验验证 offline
   * @property {boolean} new_captcha - 极验验证 new_captcha
   * @property {string} product - 极验验证 product
   * @property {string} width - 极验验证 width
   * @property {boolean} https - 极验验证 https
   * @return InitGeetestParams
   */
  export interface InitGeetestParams {
    gt: string;
    challenge: string;
    offline: boolean;
    new_captcha: boolean;
    product: string;
    width: string;
    https: boolean;
  }

  /**
   * @description Geetest 插件 captchaObj
   * @since Beta v0.3.3
   * @todo 完善
   * @interface GeetestCaptcha
   * @property {string} getValidate
   * @property {Function} onReady
   * @property {Function} onRefresh
   * @property {Function} onSuccess
   * @property {Function} onError
   * @property {Function} onClose
   * @return GeetestCaptcha
   */
  export interface GeetestCaptcha {
    appendTo: (selector: string) => void;
    getValidate: () => GeetestValidate;
    onReady: (callback: () => void) => GeetestCaptcha;
    onRefresh: (callback: () => void) => GeetestCaptcha;
    onSuccess: (callback: () => void) => GeetestCaptcha;
    onError: (callback: () => void) => GeetestCaptcha;
    onClose: (callback: () => void) => GeetestCaptcha;
  }

  /**
   * @description Geetest 插件 validate
   * @since Beta v0.3.3
   * @interface GeetestValidate
   * @property {string} geetest_challenge
   * @property {string} geetest_validate
   * @property {string} geetest_seccode
   * @return GeetestValidate
   */
  export interface GeetestValidate {
    geetest_challenge: string;
    geetest_validate: string;
    geetest_seccode: string;
  }
}
