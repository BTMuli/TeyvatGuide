/**
 * 游戏安装与启动命令适配。
 * @since Beta v0.11.5
 */

import { Channel, invoke } from "@tauri-apps/api/core";

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
 * 读取游戏安装目录的实际文件占用。
 * @since Beta v0.11.5
 * @param rootPath - 游戏根目录
 * @returns 目录内全部文件的字节数
 */
export async function getGameInstallationSize(rootPath: string): Promise<number> {
  return await invoke<number>("get_dir_size", { path: rootPath });
}

/**
 * 从 Unity 日志静默定位国服 YuanShen.exe。
 * @since Beta v0.11.5
 * @returns 磁盘上仍存在的可执行文件路径
 */
export async function locateGameInstallations(): Promise<Array<string>> {
  return await invoke<Array<string>>("game_installation_locate");
}

/**
 * 检查新安装向导选定的安装目录。
 * @since Beta v0.11.5
 * @param installRoot - 用户选定的直接安装目录
 * @returns 空目录、已有游戏目录或被占用目录的识别结果
 */
export async function inspectGameInstallLocation(
  installRoot: string,
): Promise<TGApp.Game.Installation.InstallLocationSummary> {
  return await invoke<TGApp.Game.Installation.InstallLocationSummary>(
    "game_install_location_inspect",
    { installRoot },
  );
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
 * 检测国服客户端 YuanShen.exe 是否仍在运行。
 * @since Beta v0.11.5
 * @returns 是否仍在运行
 */
export async function isGameRunning(): Promise<boolean> {
  return await invoke<boolean>("game_is_running");
}

/**
 * 结束国服客户端进程；未在运行时直接成功。
 * @since Beta v0.11.5
 */
export async function stopGame(): Promise<void> {
  await invoke("game_stop");
}

/**
 * 卸载已登记的游戏安装：删除游戏根目录全部内容（保留空目录），并删除数据库登记。
 * @since Beta v0.11.5
 * @param installationId - 已登记安装 ID
 * @returns 卸载结果
 */
export async function uninstallGameInstallation(
  installationId: string,
): Promise<TGApp.Game.Installation.UninstallSummary> {
  return await invoke<TGApp.Game.Installation.UninstallSummary>("game_installation_uninstall", {
    installationId,
  });
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
 * @param onProgress - 后端评估步骤更新
 * @returns 不含内部下载地址的计划摘要
 */
export async function createGamePackagePlan(
  installationId: string,
  target: TGApp.Game.Package.PlanTargetEnum,
  onProgress?: (progress: TGApp.Game.Package.PlanProgress) => void,
): Promise<TGApp.Game.Package.PlanSummary> {
  const progressChannel = new Channel<TGApp.Game.Package.PlanProgress>((progress) => {
    onProgress?.(progress);
  });
  return await invoke<TGApp.Game.Package.PlanSummary>("game_package_plan", {
    installationId,
    target,
    onProgress: progressChannel,
  });
}

/**
 * 评估当前正式版本的官方语音包新增、删除或替换。
 * @since Beta v0.11.4
 * @param installationId - 已登记安装 ID
 * @param targetAudioLanguages - 目标语音语言集合
 * @param onProgress - 后端评估步骤更新
 * @returns 不含内部下载地址的计划摘要
 */
export async function createGamePackageAudioPlan(
  installationId: string,
  targetAudioLanguages: Array<string>,
  onProgress?: (progress: TGApp.Game.Package.PlanProgress) => void,
): Promise<TGApp.Game.Package.PlanSummary> {
  const progressChannel = new Channel<TGApp.Game.Package.PlanProgress>((progress) => {
    onProgress?.(progress);
  });
  return await invoke<TGApp.Game.Package.PlanSummary>("game_package_audio_plan", {
    installationId,
    targetAudioLanguages,
    onProgress: progressChannel,
  });
}

export async function createGameInstallDraft(
  installRoot: string,
  scheme: TGApp.Game.Installation.SchemeEnum,
  audioLanguages: Array<string>,
): Promise<TGApp.Game.Installation.InstallDraftSummary> {
  return await invoke<TGApp.Game.Installation.InstallDraftSummary>("game_install_draft_create", {
    installRoot,
    scheme,
    audioLanguages,
  });
}

/**
 * 读取所有仍需恢复或取消的全新安装草稿。
 * @since Beta v0.11.5
 * @returns 未完成安装草稿列表
 */
export async function listGameInstallDrafts(): Promise<
  Array<TGApp.Game.Installation.InstallDraftSummary>
> {
  return await invoke<Array<TGApp.Game.Installation.InstallDraftSummary>>(
    "game_install_draft_list",
  );
}

/**
 * 取消只完成评估、尚未启动任务的安装草稿。
 * @since Beta v0.11.5
 * @param installId - 安装身份
 * @returns 已取消的草稿摘要
 */
export async function cancelGameInstallDraft(
  installId: string,
): Promise<TGApp.Game.Installation.InstallDraftSummary> {
  return await invoke<TGApp.Game.Installation.InstallDraftSummary>("game_install_draft_cancel", {
    installId,
  });
}

export async function createGameInstallPlan(
  installId: string,
  onProgress?: (progress: TGApp.Game.Package.PlanProgress) => void,
): Promise<TGApp.Game.Package.PlanSummary> {
  const progressChannel = new Channel<TGApp.Game.Package.PlanProgress>((progress) => {
    onProgress?.(progress);
  });
  return await invoke<TGApp.Game.Package.PlanSummary>("game_install_plan", {
    installId,
    onProgress: progressChannel,
  });
}

export async function startGameInstall(
  installId: string,
  planId: string,
  options?: TGApp.Game.Package.TaskOptions,
): Promise<TGApp.Game.Package.TaskSummary> {
  return await invoke<TGApp.Game.Package.TaskSummary>("game_install_start", {
    installId,
    planId,
    options,
  });
}

export async function getGameInstallStatus(
  installId: string,
): Promise<TGApp.Game.Package.TaskSummary | null> {
  return await invoke<TGApp.Game.Package.TaskSummary | null>("game_install_status", { installId });
}

export async function recoverGameInstall(
  taskId: string,
  installId: string,
  action: TGApp.Game.Package.RecoveryActionEnum,
): Promise<TGApp.Game.Package.TaskSummary> {
  return await invoke<TGApp.Game.Package.TaskSummary>("game_install_recover", {
    taskId,
    installId,
    action,
  });
}

export async function cancelGameInstall(
  taskId: string,
  installId: string,
): Promise<TGApp.Game.Package.TaskSummary> {
  return await invoke<TGApp.Game.Package.TaskSummary>("game_install_cancel", {
    taskId,
    installId,
  });
}

/**
 * 暂停全新安装的资源下载。
 * @since Beta v0.11.5
 * @param taskId - 安装任务 ID
 * @param installId - 安装身份
 * @returns 已暂停的任务投影
 */
export async function pauseGameInstall(
  taskId: string,
  installId: string,
): Promise<TGApp.Game.Package.TaskSummary> {
  return await invoke<TGApp.Game.Package.TaskSummary>("game_install_pause", {
    taskId,
    installId,
  });
}

/**
 * 评估官服与 B 服之间的同资源家族渠道转换；不会修改游戏目录。
 * @since Beta v0.11.5
 * @param installationId - 已登记安装 ID
 * @returns 不含 SDK 下载地址的换服计划摘要
 */
export async function createGamePackageSwitchPlan(
  installationId: string,
): Promise<TGApp.Game.Package.SwitchSummary> {
  return await invoke<TGApp.Game.Package.SwitchSummary>("game_package_switch_plan", {
    installationId,
  });
}

/**
 * 执行已评估的官服与 B 服渠道转换。
 * @since Beta v0.11.5
 * @param planId - 已固化换服计划 ID
 * @returns 换服任务投影
 */
export async function applyGamePackageSwitch(
  planId: string,
): Promise<TGApp.Game.Package.TaskSummary> {
  return await invoke<TGApp.Game.Package.TaskSummary>("game_package_switch", { planId });
}

/**
 * 读取应用数据目录中的资源分片与渠道 SDK 缓存占用。
 * @since Beta v0.11.5
 * @returns 缓存占用摘要
 */
export async function getGamePackageCacheStatus(): Promise<TGApp.Game.Package.CacheSummary> {
  return await invoke<TGApp.Game.Package.CacheSummary>("game_package_cache_status");
}

type CacheClearTarget = "chunks" | "sdk" | "all";

/**
 * 清理指定的资源分片、渠道 SDK 或全部缓存；进行中或待恢复任务会阻止删除。
 * @since Beta v0.11.5
 * @param target - 要清理的缓存范围，默认为全部缓存
 * @returns 清理后的缓存占用摘要
 */
export async function clearGamePackageCache(
  target: CacheClearTarget = "all",
): Promise<TGApp.Game.Package.CacheSummary> {
  return await invoke<TGApp.Game.Package.CacheSummary>("game_package_cache_clear", { target });
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
 * 清除完整性校验进度：停止正在运行的扫描，并删除可恢复会话。
 * @since Beta v0.11.5
 * @param installationId - 已登记安装 ID
 */
export async function clearGamePackageVerify(installationId: string): Promise<void> {
  await invoke("game_package_verify_clear", { installationId });
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
 * 读取后端确认可清理的近期资源任务历史。
 * @since Beta v0.11.4
 * @returns 已结束且不在活动任务集合中的任务列表
 */
export async function listGamePackageTaskHistory(): Promise<Array<TGApp.Game.Package.TaskSummary>> {
  return await invoke<Array<TGApp.Game.Package.TaskSummary>>("game_package_task_history_list");
}

/**
 * 清除指定的已结束资源任务记录；不会删除共享缓存或未完成任务。
 * @since Beta v0.11.4
 * @param taskId - 资源任务 ID
 * @returns 清理结果
 */
export async function removeGamePackageTask(
  taskId: string,
): Promise<TGApp.Game.Package.TaskCleanupSummary> {
  return await invoke<TGApp.Game.Package.TaskCleanupSummary>("game_package_task_remove", {
    taskId,
  });
}

/**
 * 清理所有已结束的资源任务日志；不会删除共享缓存或未完成任务。
 * @since Beta v0.11.5
 */
export async function cleanupGamePackageTasks(): Promise<TGApp.Game.Package.TaskCleanupSummary> {
  return await invoke<TGApp.Game.Package.TaskCleanupSummary>("game_package_task_cleanup");
}

/**
 * 恢复中断下载或回滚任务私有临时文件。
 * @since Beta v0.11.5
 * @param taskId - 资源任务 ID
 * @param action - 恢复动作
 * @param onProgress - 恢复准备进度回调
 * @returns 更新后的任务投影
 */
export async function recoverGamePackageTask(
  taskId: string,
  action: TGApp.Game.Package.RecoveryActionEnum,
  onProgress?: (progress: TGApp.Game.Package.RecoveryProgress) => void,
): Promise<TGApp.Game.Package.TaskSummary> {
  const progressChannel = new Channel<TGApp.Game.Package.RecoveryProgress>((progress) => {
    onProgress?.(progress);
  });
  return await invoke<TGApp.Game.Package.TaskSummary>("game_package_recover", {
    taskId,
    action,
    onProgress: progressChannel,
  });
}
