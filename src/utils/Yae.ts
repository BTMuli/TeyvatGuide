/**
 * Yae 成就数据导入工具
 *
 * @since Beta v0.8.7
 */

import showSnackbar from "@comp/func/snackbar.js";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

import TGLogger from "./TGLogger.js";

/**
 * 启动 Yae 监听器
 *
 * @since Beta v0.8.7
 * @returns 是否启动成功
 */
export async function startYaeListener(): Promise<boolean> {
  try {
    await invoke("start_yae_listener");
    await TGLogger.Info("Yae 监听器已启动");
    showSnackbar.success("Yae 监听器已启动，等待 Yae 连接...");
    return true;
  } catch (error) {
    await TGLogger.Error(`启动 Yae 监听器失败: ${error}`);
    showSnackbar.error(`启动 Yae 监听器失败: ${error}`);
    return false;
  }
}

/**
 * 停止 Yae 监听器
 *
 * @since Beta v0.8.7
 * @returns 是否停止成功
 */
export async function stopYaeListener(): Promise<boolean> {
  try {
    await invoke("stop_yae_listener");
    await TGLogger.Info("Yae 监听器已停止");
    showSnackbar.success("Yae 监听器已停止");
    return true;
  } catch (error) {
    await TGLogger.Error(`停止 Yae 监听器失败: ${error}`);
    showSnackbar.error(`停止 Yae 监听器失败: ${error}`);
    return false;
  }
}

/**
 * 监听 Yae 数据接收事件
 *
 * @since Beta v0.8.7
 * @param callback - 接收到数据时的回调函数
 * @returns 取消监听的函数
 */
export async function onYaeDataReceived(
  callback: (data: TGApp.Plugins.UIAF.Data) => void,
): Promise<() => void> {
  return await listen<string>("yae_data_received", (event) => {
    try {
      const data = <TGApp.Plugins.UIAF.Data>JSON.parse(event.payload);
      callback(data);
    } catch (error) {
      TGLogger.Error(`解析 Yae 数据失败: ${error}`);
      showSnackbar.error(`解析 Yae 数据失败: ${error}`);
    }
  });
}
