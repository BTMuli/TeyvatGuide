/**
 * @file utils/TGShell.ts
 * @description Shell工具
 * @since Beta v0.4.4
 */

import { os, shell } from "@tauri-apps/api";

/**
 * @description Shell工具
 * @since Beta v0.4.4
 */
class TGShell {
  /**
   * @description 打开文件
   * @since Beta v0.4.4
   * @param {string} path - 文件路径
   * @returns {Promise<void>} 无返回值
   */
  async openPath(path: string): Promise<void> {
    const platform = await os.platform();
    let command: string;
    if (platform === "win32") command = "win_open";
    else command = "mac_open";
    await new shell.Command(command, [path]).execute();
  }
}

export default new TGShell();
