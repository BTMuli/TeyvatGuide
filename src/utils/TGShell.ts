/**
 * @file utils/TGShell.ts
 * @description Shell工具
 * @since Beta v0.5.0
 */

import showSnackbar from "@comp/func/snackbar.js";
import { platform } from "@tauri-apps/plugin-os";
import { Command } from "@tauri-apps/plugin-shell";

/**
 * @description Shell工具
 * @since Beta v0.5.0
 */
class Shell {
  private constructor() {}

  private static instance: Shell | null = null;

  static getInstance(): Shell {
    if (this.instance === null) this.instance = new Shell();
    return this.instance;
  }

  /**
   * @description 打开文件
   * @since Beta v0.5.0
   * @param {string} path - 文件路径
   * @returns {Promise<void>} 无返回值
   */
  async openPath(path: string): Promise<void> {
    const plat = platform();
    let command: string;
    if (plat !== "windows" && plat !== "macos") {
      showSnackbar.warn("暂不支持该平台");
      return;
    }
    if (plat === "windows") command = "win_open";
    else command = "mac_open";
    await Command.create(command, [path]).execute();
  }
}

const TGShell = Shell.getInstance();

export default TGShell;
