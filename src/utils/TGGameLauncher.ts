/**
 * 游戏安装与启动命令适配。
 * @since Beta v0.11.5
 */

import { invoke } from "@tauri-apps/api/core";

/**
 * 检测国服游戏安装。
 * @since Beta v0.11.5
 * @param executablePath - YuanShen.exe 完整路径
 * @returns 安装磁盘状态
 */
export async function inspectGameInstallation(
  executablePath: string,
): Promise<TGApp.Game.Installation.Item> {
  return await invoke<TGApp.Game.Installation.Item>("game_installation_inspect", {
    executablePath,
  });
}

/**
 * 获取全部已登记游戏安装及最新磁盘状态。
 * @since Beta v0.11.5
 * @returns 游戏安装列表
 */
export async function listGameInstallations(): Promise<Array<TGApp.Game.Installation.Item>> {
  return await invoke<Array<TGApp.Game.Installation.Item>>("game_installation_list");
}

/**
 * 通过可信安装 ID 启动游戏。
 * @since Beta v0.11.5
 * @param installationId - 已登记安装 ID
 * @param ticket - 官服登录 ticket；B 服不传
 */
export async function launchGameInstallation(
  installationId: string,
  ticket?: string,
): Promise<void> {
  await invoke("game_launch", { installationId, ticket });
}
