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

/**
 * 获取已登记安装的本地与远端版本快照。
 * @since Beta v0.11.5
 * @param installationId - 已登记安装 ID
 * @returns 不含分支密码和下载地址的版本快照
 */
export async function getGamePackageSnapshot(
  installationId: string,
): Promise<TGApp.Game.Package.Snapshot> {
  return await invoke<TGApp.Game.Package.Snapshot>("game_package_snapshot", { installationId });
}

/**
 * 生成并持久化不可变的游戏资源计划。
 * @since Beta v0.11.5
 * @param installationId - 已登记安装 ID
 * @param target - 主分支或预下载分支
 * @returns 不含内部下载地址的计划摘要
 */
export async function createGamePackagePlan(
  installationId: string,
  target: TGApp.Game.Package.PlanTargetEnum,
): Promise<TGApp.Game.Package.PlanSummary> {
  return await invoke<TGApp.Game.Package.PlanSummary>("game_package_plan", {
    installationId,
    target,
  });
}
