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
}
