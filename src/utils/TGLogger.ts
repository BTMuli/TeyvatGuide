/**
 * @file utils/TGLogger.ts
 * @description 日志工具
 * @since Beta v0.7.0
 */

import { event } from "@tauri-apps/api";
import { attachConsole, debug, error, info, warn } from "@tauri-apps/plugin-log";

import { timestampToDate } from "@/utils/toolFunc.js";

/**
 * @description 日志工具
 * @since Beta v0.4.4
 */
class Logger {
  private constructor() {
    if (import.meta.env.MODE === "development") {
      void attachConsole().then(() => console.log("Console attached"));
    }
  }

  private static instance: Logger | null = null;

  static getInstance(): Logger {
    if (this.instance === null) this.instance = new Logger();
    return this.instance;
  }

  /**
   * @description 输出日志-调试
   * @since Beta v0.6.8
   * @param {string} message 日志信息
   * @param {boolean} [write] 是否写入日志文件，默认为 true
   * @returns {Promise<void>} 无返回值
   */
  async Debug(message: string, write: boolean = true): Promise<void> {
    if (write) await debug(message);
    console.debug(message);
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

  /**
   * @description 输出日志-脚本
   * @since Beta v0.7.0
   * @param {string} message 日志信息
   * @returns {Promise<void>} 无返回值
   */
  async Script(message: string): Promise<void> {
    const timeNow = timestampToDate(new Date().getTime());
    const msg = `[${timeNow}]${message}`;
    await event.emitTo("TeyvatGuide", "userScriptLog", msg);
  }

  /**
   * @description 输出日志-脚本分隔符
   * @since Beta v0.7.0
   * @param {string} label 标签
   * @param {boolean} [start] 是否为开始，默认为 true
   * @returns {Promise<void>} 无返回值
   */
  async ScriptSep(label: string, start: boolean = true): Promise<void> {
    const midStr = `${label} ${start ? "START" : "END--"}`;
    const msg = `//--------------------${midStr}--------------------//`;
    await event.emitTo("TeyvatGuide", "userScriptLog", msg);
    if (!start) await event.emitTo("TeyvatGuide", "userScriptLog", "");
  }
}

const TGLogger = Logger.getInstance();

export default TGLogger;
