/**
 * @file utils/TGClient.ts
 * @desc 负责米游社客户端的 callback 处理
 * @since Beta v0.3.4
 */

import { event, invoke } from "@tauri-apps/api";
import type { Event } from "@tauri-apps/api/event";
import { WebviewWindow } from "@tauri-apps/api/window";

import TGSqlite from "../plugins/Sqlite";

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
    console.log(method, payload, callback);
    switch (method) {
      case "getStatusBarHeight":
        this.getStatusBarHeight(callback);
        break;
      case "getCookieInfo":
        await this.getCookieInfo(callback);
        break;
    }
  }

  /**
   * @func callback
   * @since Beta v0.3.4
   * @desc 回调函数
   * @param {string} callback - 回调函数名
   * @param {string} payload - 回调函数参数
   * @returns {void} - 无返回值
   */
  async callback(callback: string, payload?: string): Promise<void> {
    const js = `javascript:mhyWebBridge("${callback}", ${payload ?? ""})`;
    await invoke("create_mhy_client");
    await invoke("execute_js", { label: "mhy_client", js });
  }

  /**
   * @func getStatusBarHeight
   * @since Beta v0.3.4
   * @desc 获取状态栏高度
   * @param {string} callback - 回调函数名
   * @returns {void} - 无返回值
   */
  getStatusBarHeight(callback: string): void {
    console.log("getStatusBarHeight");
    console.log(callback);
  }

  /**
   * @func getCookieInfo
   * @since Beta v0.3.3
   * @desc 获取米游社客户端的 cookie
   * @param {string} callback - 回调函数名
   * @returns {void} - 无返回值
   */
  async getCookieInfo(callback: string): Promise<void> {
    console.log("getCookieInfo");
    const cookie = await TGSqlite.getCookie();
    await this.callback(callback, JSON.stringify(cookie));
  }
}

const mhyClient = new TGClient();

export default mhyClient;
