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

/**
 * 启动或恢复安装完整性校验；扫描在后台继续，刷新页面后可重连进度。
 * @since Beta v0.11.5
 * @param installationId - 已登记安装 ID
 * @returns 当前校验进度
 */
export async function verifyGamePackage(
  installationId: string,
): Promise<TGApp.Game.Package.VerifySummary> {
  return await invoke<TGApp.Game.Package.VerifySummary>("game_package_verify", { installationId });
}

/**
 * 读取已持久化或正在运行的完整性校验进度。
 * @since Beta v0.11.5
 * @param installationId - 已登记安装 ID
 * @returns 校验进度；从未校验时为空
 */
export async function getGamePackageVerifyStatus(
  installationId: string,
): Promise<TGApp.Game.Package.VerifySummary | null> {
  return await invoke<TGApp.Game.Package.VerifySummary | null>("game_package_verify_status", {
    installationId,
  });
}

/**
 * 请求停止正在运行的完整性校验。
 * @since Beta v0.11.5
 * @param installationId - 已登记安装 ID
 */
export async function cancelGamePackageVerify(installationId: string): Promise<void> {
  await invoke("game_package_verify_cancel", { installationId });
}

/**
 * 按不可变计划启动游戏资源下载任务；正式更新与预下载均只写入应用缓存。
 * @since Beta v0.11.5
 * @param planId - 已持久化计划 ID
 * @param options - 可选并发与带宽限制
 * @returns 当前任务投影
 */
export async function startGamePackageTask(
  planId: string,
  options?: TGApp.Game.Package.TaskOptions,
): Promise<TGApp.Game.Package.TaskSummary> {
  return await invoke<TGApp.Game.Package.TaskSummary>("game_package_start", { planId, options });
}

/**
 * 应用已完成下载并复验的游戏资源任务；正式更新可立即应用，预下载需目标已转正。
 * @since Beta v0.11.5
 * @param taskId - 资源任务 ID
 * @returns 应用开始后的任务投影
 */
export async function applyGamePackageTask(
  taskId: string,
): Promise<TGApp.Game.Package.TaskSummary> {
  return await invoke<TGApp.Game.Package.TaskSummary>("game_package_apply", { taskId });
}

/**
 * 请求在安全边界取消游戏资源任务。
 * @since Beta v0.11.5
 * @param taskId - 资源任务 ID
 */
export async function cancelGamePackageTask(taskId: string): Promise<void> {
  await invoke("game_package_cancel", { taskId });
}

/**
 * 读取 journal 中的资源任务投影。
 * @since Beta v0.11.5
 * @param installationId - 可选安装 ID 过滤
 * @returns 任务投影列表
 */
export async function listGamePackageTasks(
  installationId?: string,
): Promise<Array<TGApp.Game.Package.TaskSummary>> {
  return await invoke<Array<TGApp.Game.Package.TaskSummary>>("game_package_task_list", {
    installationId,
  });
}

/**
 * 恢复中断下载或回滚任务私有临时文件。
 * @since Beta v0.11.5
 * @param taskId - 资源任务 ID
 * @param action - 恢复动作
 * @returns 更新后的任务投影
 */
export async function recoverGamePackageTask(
  taskId: string,
  action: TGApp.Game.Package.RecoveryActionEnum,
): Promise<TGApp.Game.Package.TaskSummary> {
  return await invoke<TGApp.Game.Package.TaskSummary>("game_package_recover", { taskId, action });
}
