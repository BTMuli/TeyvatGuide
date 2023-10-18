/**
 * @file utils/TGClient.ts
 * @desc 负责米游社客户端的 callback 处理
 * @since Beta v0.3.3
 */

import { event, invoke } from "@tauri-apps/api";
import type { Event } from "@tauri-apps/api/event";

// 正常 arg 参数
interface NormalArg {
  method: string;
  payload: any;
  callback: string;
}

/**
 * @class TGClient
 * @since Beta v0.3.3
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
   * @func run
   * @since Beta v0.3.3
   * @desc 运行米游社客户端
   * @returns {void} - 无返回值
   */
  async run(): Promise<void> {
    if (this.listener === undefined) {
      this.listener = await event.listen("post_mhy_client", (arg: Event<string>) => {
        this.handleCallback(arg);
      });
    } else {
      console.log("已经监听了");
    }
  }

  /**
   * @func open
   * @since Beta v0.3.3
   * @desc 打开米游社客户端
   * @param {string} func - 方法名
   * @param {string} params - 参数
   * @returns {void} - 无返回值
   */
  async open(func: string, params: string): Promise<void> {
    await invoke("create_mhy_client", { func, arg: params });
  }

  /**
   * @func handleCallback
   * @since Beta v0.3.3
   * @desc 处理米游社客户端的 callback
   * @param {Event<string>} arg - 事件参数
   * @returns {any} - 返回值
   */
  handleCallback(arg: Event<string>): any {
    console.log(`[${arg.windowLabel}] ${arg.payload}`);
    const { method, payload, callback } = <NormalArg>JSON.parse(arg.payload);
    console.log(method, payload, callback);
    switch (method) {
      case "getStatusBarHeight":
        return 0;
      case "getCookieInfo":
        this.getCookieInfo(callback);
    }
  }

  /**
   * @func getCookieInfo
   * @since Beta v0.3.3
   * @desc 获取米游社客户端的 cookie
   * @param {string} callback - 回调函数名
   * @returns {void} - 无返回值
   */
  getCookieInfo(callback: string): void {
    console.log("getCookieInfo");
    console.log(callback);
  }
}

const mhyClient = new TGClient();

export default mhyClient;
