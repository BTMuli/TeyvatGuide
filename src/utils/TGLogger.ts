/**
 * @file utils/TGLogger.ts
 * @description 日志工具
 * @since Beta v0.4.4
 */

import { info, warn, error, attachConsole } from "tauri-plugin-log-api";

/**
 * @description 日志工具
 * @since Beta v0.4.4
 */
class TGLogger {
  constructor() {
    if (import.meta.env.MODE === "development") {
      void attachConsole().then(() => {
        console.log("Console attached");
      });
    }
  }

  /**
   * @description 输出日志-信息
   * @since Beta v0.4.2
   * @param {string} message 日志信息
   * @param {boolean} [write] 是否写入日志文件，默认为 true
   * @returns {Promise<void>} 无返回值
   */
  async Info(message: string, write: boolean = true): Promise<void> {
    if (write) await info(message);
    console.info(message);
  }

  /**
   * @description 输出日志-警告
   * @since Beta v0.4.2
   * @param {string} message 日志信息
   * @param {boolean} [write] 是否写入日志文件，默认为 true
   * @returns {Promise<void>} 无返回值
   */
  async Warn(message: string, write: boolean = true): Promise<void> {
    if (write) await warn(message);
    console.warn(message);
  }

  /**
   * @description 输出日志-错误
   * @since Beta v0.4.2
   * @param {string} message 日志信息
   * @param {boolean} [write] 是否写入日志文件，默认为 true
   * @returns {Promise<void>} 无返回值
   */
  async Error(message: string, write: boolean = true): Promise<void> {
    if (write) await error(message);
    console.error(message);
  }
}

export default new TGLogger();
