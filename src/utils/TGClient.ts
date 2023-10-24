/**
 * @file utils/TGClient.ts
 * @desc 负责米游社客户端的 callback 处理
 * @since Beta v0.3.4
 */

import { event, invoke } from "@tauri-apps/api";
import type { Event } from "@tauri-apps/api/event";
import { WebviewWindow } from "@tauri-apps/api/window";
import Md5 from "js-md5";

import { getDeviceID } from "./toolFunc";
import { useUserStore } from "../store/modules/user";
import TGConstant from "../web/constant/TGConstant";
import TGRequest from "../web/request/TGRequest";
import TGUtils from "../web/utils/TGUtils";

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
   * @func open
   * @since Beta v0.3.4
   * @desc 打开米游社客户端
   * @param {string} func - 方法名
   * @returns {void} - 无返回值
   */
  async open(func: string): Promise<void> {
    if (this.window !== null) {
      await this.window.close();
    }
    await invoke<InvokeArg>("create_mhy_client", { func });
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
      case "getActionTicket":
        await this.getActionTicket(payload, callback);
        await this.hideSideBar();
        break;
      case "getHTTPRequestHeaders":
        await this.getHTTPRequestHeaders(callback);
        break;
      case "getDS":
        await this.getDS(callback);
        break;
      case "getDS2":
        await this.getDS2(payload, callback);
        break;
      case "getUserInfo":
        await this.getUserInfo(callback);
        break;
      case "configure_share":
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
    await invoke("create_mhy_client", { func: "execute_js" });
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
   * @param {string} callback - 回调函数名
   * @returns {void} - 无返回值
   */
  async getDS(callback: string): Promise<void> {
    const salt = TGConstant.Salt.LK2;
    const time = Math.floor(Date.now() / 1000).toString();
    const random = TGUtils.Tools.getRandomString(6);
    const check = Md5.md5.update(`salt=${salt}&t=${time}&r=${random}`).hex();
    const data = {
      DS: `${time},${random},${check}`,
    };
    await this.callback(callback, data);
  }

  /**
   * @func getDS2
   * @since Beta v0.3.4
   * @desc 获取米游社客户端的 DS 参数
   * @param {unknown} payload - 请求参数
   * @param {string} callback - 回调函数名
   * @returns {void} - 无返回值
   */
  async getDS2(payload: any, callback: string): Promise<void> {
    const { query, body } = payload;
    const salt = TGConstant.Salt.X4;
    const time = Math.floor(Date.now() / 1000).toString();
    const random = TGUtils.Tools.getRandomNumber(100001, 200000).toString();
    const dataB = TGUtils.Tools.transParams(body);
    const dataQ = TGUtils.Tools.transParams(query);
    const check = Md5.md5.update(`salt=${salt}&t=${time}&r=${random}&b=${dataB}&q=${dataQ}`).hex();
    const data = {
      DS: `${time},${random},${check}`,
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
    // const data = {
    //   id: userInfo.uid,
    //   gender: userInfo.gender,
    //   nickname: userInfo.nickname,
    //   introduce: userInfo.introduce,
    //   avatar_url: userInfo.avatar_url,
    // };
    await this.callback(callback, userInfo);
  }
}

const mhyClient = new TGClient();

export default mhyClient;
