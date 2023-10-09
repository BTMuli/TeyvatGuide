/**
 * @file types BBS Geetest.d.ts
 * @description BBS 极验相关类型定义文件
 * @since Beta v0.3.3
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
   * @property {string} area - 极验验证 area
   * @return InitGeetestParams
   */
  export interface InitGeetestParams {
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
   * @since Beta v0.3.3
   * @interface GeetestCaptcha
   * @property {Function} appendTo
   * @property {Function} getValidate
   * @property {Function} onSuccess
   * @property {Function} onClose
   * @return GeetestCaptcha
   */
  export interface GeetestCaptcha {
    appendTo: (selector: string) => void;
    getValidate: () => GeetestValidate;
    onSuccess: (callback: () => void) => void;
    onClose: (callback: () => void) => void;
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

/**
 * @description 设置全局 initGeetest 方法
 * @param {TGApp.BBS.Geetest.InitGeetestParams} params 极验验证的请求方法-请求参数
 * @param callback 极验验证的请求方法-回调函数
 * @return {void}
 */
declare function initGeetest(
  params: TGApp.BBS.Geetest.InitGeetestParams,
  callback: (captchaObj: TGApp.BBS.Geetest.GeetestCaptcha) => void,
): void;
