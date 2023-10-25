/**
 * @file utils/TGClient.ts
 * @desc 负责米游社客户端的 callback 处理
 * @since Beta v0.3.4
 */

import { event, invoke } from "@tauri-apps/api";
import type { Event } from "@tauri-apps/api/event";
import { WebviewWindow } from "@tauri-apps/api/window";

import { getDeviceID } from "./toolFunc";
import { useUserStore } from "../store/modules/user";
import TGConstant from "../web/constant/TGConstant";
import TGRequest from "../web/request/TGRequest";
import { getDS4JS } from "../web/utils/getRequestHeader";

// 正常 arg 参数
interface NormalArg {
  method: string;
  payload: any;
  callback: string;
}

// invoke 参数
interface InvokeArg {
  func: string;
}

/**
 * @class TGClient
 * @since Beta v0.3.4
 * @description 米游社客户端
 */
class TGClient {
  /**
   * @private 监听实例
   * @since Beta v0.3.3
   * @type {EventEmitter}
   * @memberof TGClient
   */
  private listener: any;

  /**
   * @private 窗口实例
   * @since Beta v0.3.4
   * @type {WebviewWindow}
   * @memberof TGClient
   */
  private window: WebviewWindow | null;

  /**
   * @private 模拟路由
   * @since Beta v0.3.4
   * @type {string[]}
   * @memberof TGClient
   */
  private route: string[] = [];

  /**
   * @constructor
   * @since Beta v0.3.4
   * @description 构造函数
   * @memberof TGClient
   */
  constructor() {
    try {
      this.window = WebviewWindow.getByLabel("mhy_client");
    } catch (error) {
      this.window = null;
    }
    this.route = [];
    this.listener = undefined;
  }

  /**
   * @func run
   * @since Beta v0.3.4
   * @desc 运行米游社客户端
   * @returns {void} - 无返回值
   */
  async run(): Promise<void> {
    if (this.listener === undefined) {
      this.listener = await event.listen("post_mhy_client", async (arg: Event<string>) => {
        await this.handleCallback(arg);
      });
    }
  }

  /**
   * @func hideSideBar
   * @since Beta v0.3.4
   * @desc 隐藏侧边栏
   * @returns {void} - 无返回值
   */
  async hideSideBar(): Promise<void> {
    const executeJS =
      "javascript:(function(){" +
      "let st = document.createElement('style');" +
      "st.innerHTML = '::-webkit-scrollbar{display:none}';" +
      "document.querySelector('body').appendChild(st);" +
      "})();";
    await invoke("execute_js", { label: "mhy_client", js: executeJS });
  }

  /**
   * @func getUrl
   * @since Beta v0.3.4
   * @desc 获取 url
   * @param {string} func - 方法名
   * @returns {string} - url
   */
  getUrl(func: string): string {
    switch (func) {
      case "sign_in":
        return "https://webstatic.mihoyo.com/bbs/event/signin-ys/index.html?act_id=e202009291139501";
      case "game_record":
        return "https://webstatic.mihoyo.com/app/community-game-records/index.html?bbs_presentation_style=fullscreen";
      default:
        return "";
    }
  }

  /**
   * @func open
   * @since Beta v0.3.4
   * @desc 打开米游社客户端
   * @param {string} func - 方法名
   * @param {string} url - url
   * @returns {void} - 无返回值
   */
  async open(func: string, url?: string): Promise<void> {
    if (this.window !== null) {
      await this.window.close();
    }
    if (url === undefined) {
      url = this.getUrl(func);
      this.route = [url];
    } else if (func !== "closePage") {
      this.route.push(url);
    }
    console.log(`[open] ${url}`);
    await invoke<InvokeArg>("create_mhy_client", { func, url });
    this.window = WebviewWindow.getByLabel("mhy_client");
    await this.window?.show();
  }

  /**
   * @func handleCallback
   * @since Beta v0.3.4
   * @desc 处理米游社客户端的 callback
   * @param {Event<string>} arg - 事件参数
   * @returns {any} - 返回值
   */
  async handleCallback(arg: Event<string>): Promise<any> {
    console.log(`[${arg.windowLabel}] ${arg.payload}`);
    const { method, payload, callback } = <NormalArg>JSON.parse(arg.payload);
    switch (method) {
      case "getStatusBarHeight":
        await this.getStatusBarHeight(callback);
        break;
      case "getCookieInfo":
        await this.getCookieInfo(payload, callback);
        break;
      case "getCookieToken":
        await this.getCookieToken(callback);
        break;
      case "getActionTicket":
        await this.getActionTicket(payload, callback);
        await this.hideSideBar();
        break;
      case "getHTTPRequestHeaders":
        await this.getHTTPRequestHeaders(callback);
        break;
      case "getDS":
        await this.getDS(1, callback, payload);
        break;
      case "getDS2":
        await this.getDS(2, callback, payload);
        break;
      case "getUserInfo":
        await this.getUserInfo(callback);
        break;
      case "configure_share":
        break;
      case "pushPage":
        await this.pushPage(payload);
        break;
      case "closePage":
        await this.closePage();
        break;
      case "login":
        await this.nullCallback(arg);
        break;
      // getNotificationSettings
      default:
        console.warn(`[${arg.windowLabel}] ${arg.payload}`);
        await this.hideSideBar();
    }
  }

  /**
   * @func callback
   * @since Beta v0.3.4
   * @desc 回调函数
   * @param {string} callback - 回调函数名
   * @param {object} data - 回调数据
   * @returns {void} - 无返回值
   */
  async callback(callback: string, data: object): Promise<void> {
    const response: TGApp.BBS.Response.Base = {
      retcode: 0,
      message: "success",
      data: data ?? {},
    };
    const js = `javascript:mhyWebBridge("${callback}", ${JSON.stringify(response)});`;
    console.info(`[callback] ${js}`);
    await invoke("create_mhy_client", { func: "execute_js", url: "" });
    await invoke("execute_js", { label: "mhy_client", js });
  }

  /**
   * @func getStatusBarHeight
   * @since Beta v0.3.4
   * @desc 获取状态栏高度
   * @param {string} callback - 回调函数名
   * @returns {void} - 无返回值
   */
  async getStatusBarHeight(callback: string): Promise<void> {
    const data = {
      statusBarHeight: 0,
    };
    await this.callback(callback, data);
  }

  /**
   * @func getCookieInfo
   * @since Beta v0.3.4
   * @desc 获取米游社客户端的 cookie
   * @param {unknown} payload - 请求参数
   * @param {string} callback - 回调函数名
   * @returns {void} - 无返回值
   */
  async getCookieInfo(payload: unknown, callback: string): Promise<void> {
    const user = useUserStore();
    const data = {
      ltoken: user.cookie.ltoken,
      ltuid: user.cookie.ltuid,
      login_ticket: "",
    };
    await this.callback(callback, data);
  }

  /**
   * @func getCookieToken
   * @since Beta v0.3.4
   * @todo 待完善
   * @desc 获取米游社客户端的 cookie_token
   * @param {string} callback - 回调函数名
   * @returns {void} - 无返回值
   */
  async getCookieToken(callback: string): Promise<void> {
    const user = useUserStore();
    const executeJS =
      "javascript:(function(){" +
      `document.cookie = "account_id=${user.cookie.account_id};domain=.mihoyo.com;path=/;expires=Fri, 31 Dec 9999 23:59:59 GMT;";` +
      `document.cookie = "cookie_token=${user.cookie.cookie_token};domain=.mihoyo.com;path=/;expires=Fri, 31 Dec 9999 23:59:59 GMT;";` +
      `document.cookie = "ltoken=${user.cookie.ltoken};domain=.mihoyo.com;path=/;expires=Fri, 31 Dec 9999 23:59:59 GMT;";` +
      `document.cookie = "ltuid=${user.cookie.ltuid};domain=.mihoyo.com;path=/;expires=Fri, 31 Dec 9999 23:59:59 GMT;";` +
      `document.cookie = "stuid=${user.cookie.stuid};domain=.mihoyo.com;path=/;expires=Fri, 31 Dec 9999 23:59:59 GMT;";` +
      `document.cookie = "stoken=${user.cookie.stoken};domain=.mihoyo.com;path=/;expires=Fri, 31 Dec 9999 23:59:59 GMT;";` +
      `document.cookie = "mid=${user.cookie.mid};domain=.mihoyo.com;path=/;expires=Fri, 31 Dec 9999 23:59:59 GMT;";` +
      "})();";
    console.info(`[getCookieToken] ${executeJS}`);
    await invoke("execute_js", { label: "mhy_client", js: executeJS });
    // callback
    const data = {
      cookie_token: user.cookie.cookie_token,
    };
    await this.callback(callback, data);
  }

  /**
   * @func getActionTicket
   * @since Beta v0.3.4
   * @desc 获取米游社客户端的 action_ticket\
   * @param {unknown} payload - 请求参数
   * @param {string} callback - 回调函数名
   * @returns {void} - 无返回值
   */
  async getActionTicket(payload: any, callback: string): Promise<void> {
    const actionType = payload.action_type;
    const user = useUserStore();
    const uid = user.getCurAccount().gameUid;
    const mid = user.cookie.mid;
    const stoken = user.cookie.stoken;
    const ActionTicket = await TGRequest.User.bySToken.getActionTicket(
      actionType,
      stoken,
      mid,
      uid,
    );
    await this.callback(callback, ActionTicket.data);
  }

  /**
   * @func getHTTPRequestHeaders
   * @since Beta v0.3.4
   * @desc 获取米游社客户端的 HTTP 请求头
   * @param {string} callback - 回调函数名
   * @returns {void} - 无返回值
   */
  async getHTTPRequestHeaders(callback: string): Promise<void> {
    const data = {
      "x-rpc-client_type": "5",
      "x-rpc-device_id": getDeviceID(),
      "x-rpc-app_version": TGConstant.BBS.VERSION,
    };
    await this.callback(callback, data);
  }

  /**
   * @func getDS
   * @since Beta v0.3.4
   * @desc 获取米游社客户端的 DS 参数
   * @param {number} dsType - DS 类型
   * @param {string} callback - 回调函数名
   * @param {unknown} payload - 请求参数
   * @returns {void} - 无返回值
   */
  async getDS(dsType: 1, callback: string, payload: undefined): Promise<void>;
  async getDS(dsType: 2, callback: string, payload: any): Promise<void>;
  async getDS(dsType: 1 | 2, callback: string, payload?: any): Promise<void> {
    const saltType = dsType === 1 ? "lk2" : "common";
    let ds: string;
    if (dsType === 2) {
      const { body, query } = payload;
      ds = getDS4JS(saltType, dsType, body, query);
    } else {
      ds = getDS4JS(saltType, dsType, undefined, undefined);
    }
    const data = {
      DS: ds,
    };
    await this.callback(callback, data);
  }

  /**
   * @func getUserInfo
   * @since Beta v0.3.4
   * @desc 获取米游社客户端的用户信息
   * @param {string} callback - 回调函数名
   * @returns {void} - 无返回值
   */
  async getUserInfo(callback: string): Promise<void> {
    const user = useUserStore();
    const cookieToken = user.cookie.cookie_token;
    const accountId = user.cookie.account_id;
    const userInfo = await TGRequest.User.byCookie.getUserInfo(cookieToken, accountId, true);
    if ("retcode" in userInfo) {
      console.error(`[${callback}] ${userInfo.message}`);
      return;
    }
    await this.callback(callback, userInfo);
  }

  /**
   * @func pushPage
   * @since Beta v0.3.4
   * @desc 打开米游社客户端的页面
   * @param {unknown} payload - 请求参数
   * @returns {void} - 无返回值
   */
  async pushPage(payload: any): Promise<void> {
    const url = payload.page;
    await this.open("pushPage", url);
  }

  /**
   * @func closePage
   * @since Beta v0.3.4
   * @desc 关闭米游社客户端的页面
   * @returns {void} - 无返回值
   */
  async closePage(): Promise<void> {
    this.route.pop();
    if (this.route.length === 0) {
      await this.window?.hide();
      return;
    }
    const url = this.route[this.route.length - 1];
    await this.open("closePage", url);
  }

  /**
   * @func nullCallback
   * @since Beta v0.3.4
   * @desc 空回调函数
   * @param {Event<string>} arg - 回调参数
   * @returns {void} - 无返回值
   */
  async nullCallback(arg: Event<string>): Promise<void> {
    console.warn(`[${arg.windowLabel}] ${arg.payload}`);
    const { callback } = <NormalArg>JSON.parse(arg.payload);
    await this.callback(callback, {});
  }
}

const mhyClient = new TGClient();

export default mhyClient;
