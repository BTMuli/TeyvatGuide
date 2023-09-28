/**
 * @file src types Plugins Geetest.d.ts
 * @description Geetest 插件类型声明文件
 * @author BTMuli <bt-muli@outlook.com>
 * @since 3.0.0
 */

/**
 * @description 因为引入 gt.js，其 initGeetest 挂载到 window 上，所以需要声明 window
 * @since 3.0.0
 * @interface window
 * @return window
 */
type window = Window & typeof globalThis;

globalThis.window = globalThis.window || globalThis;

declare global {
  interface Window {
    initGeetest: InitGeetest;
  }
}

/**
 * @description Geetest 插件初始化函数
 * @since 3.0.0
 * @interface InitGeetest
 * @return InitGeetest
 */
export type InitGeetest = (
  initGeetestOptions: InitGeetestOptions,
  initGeetestCallback: InitGeetestCallback,
) => void;

/**
 * @description Geetest 插件初始化函数参数
 * @since 3.0.0
 * @todo 完善
 * @interface InitGeetestOptions
 * @property {string} gt Geetest ID
 * @property {string} challenge Geetest challenge
 * @property {boolean} offline Geetest offline
 * @property {boolean} new_captcha Geetest new_captcha
 * @property {string} product Geetest product
 * @property {string} width Geetest width
 * @property {boolean} https Geetest https
 * @return InitGeetestOptions
 */
export interface InitGeetestOptions {
  gt: string;
  challenge: string;
  offline: boolean;
  new_captcha: boolean;
  product: string;
  width: string;
  https: boolean;
}

/**
 * @description Geetest 插件初始化函数回调
 * @since 3.0.0
 * @todo 完善
 * @interface InitGeetestCallback
 * @return InitGeetestCallback
 */
export type InitGeetestCallback = (captchaObj: GeetestCaptcha) => void;

/**
 * @description Geetest 插件 captchaObj
 * @since 3.0.0
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
  getValidate: () => string;
  onReady: (callback: () => void) => void;
  onRefresh: (callback: () => void) => void;
  onSuccess: (callback: () => void) => void;
  onError: (callback: () => void) => void;
  onClose: (callback: () => void) => void;
}
