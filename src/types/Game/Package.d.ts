/**
 * 游戏资源快照与不可变计划类型。
 * @since Beta v0.11.5
 */

declare namespace TGApp.Game.Package {
  /** 可生成计划的目标分支。 */
  const PlanTarget = <const>{
    MAIN: "main",
    PRE_DOWNLOAD: "pre_download",
  };

  /** 目标分支值。 */
  type PlanTargetEnum = (typeof PlanTarget)[keyof typeof PlanTarget];

  /** 计划使用的差异策略。 */
  const PlanStrategy = <const>{
    PATCH: "patch",
    MANIFEST_DIFF: "manifest_diff",
  };

  /** 差异策略值。 */
  type PlanStrategyEnum = (typeof PlanStrategy)[keyof typeof PlanStrategy];

  /** 不含密码与下载地址的远端版本。 */
  type RemoteVersion = {
    tag: string;
    diffTags: Array<string>;
  };

  /** 本地安装与 HoyoPlay 远端版本快照。 */
  type Snapshot = {
    installationId: string;
    localVersion: string | null;
    main: RemoteVersion;
    preDownload: RemoteVersion | null;
    updateAvailable: boolean;
    preDownloadAvailable: boolean;
  };

  /** 已持久化不可变计划的安全摘要。 */
  type PlanSummary = {
    planId: string;
    installationId: string;
    target: PlanTargetEnum;
    sourceTag: string;
    targetTag: string;
    manifestDigest: string;
    strategy: PlanStrategyEnum;
    downloadBytes: number;
    installBytes: number;
    cacheHitBytes: number;
    requiredFreeBytes: number;
    availableFreeBytes: number;
    hasSufficientSpace: boolean;
    downloadCount: number;
    addCount: number;
    modifyCount: number;
    deleteCount: number;
  };

  /** 可恢复资源任务状态。 */
  const TaskState = <const>{
    QUEUED: "queued",
    DOWNLOADING: "downloading",
    READY_TO_APPLY: "ready_to_apply",
    ASSEMBLING: "assembling",
    COMMIT_PREPARED: "commit_prepared",
    COMMITTING: "committing",
    VERIFYING: "verifying",
    ROLLING_BACK: "rolling_back",
    COMPLETED: "completed",
    RECOVERY_REQUIRED: "recovery_required",
    FAILED: "failed",
    CANCELED: "canceled",
  };

  /** 可恢复资源任务状态值。 */
  type TaskStateEnum = (typeof TaskState)[keyof typeof TaskState];

  /** 中断任务允许的恢复动作。 */
  const RecoveryAction = <const>{
    RESUME: "resume",
    ROLLBACK: "rollback",
  };

  /** 中断任务恢复动作值。 */
  type RecoveryActionEnum = (typeof RecoveryAction)[keyof typeof RecoveryAction];

  /** 启动资源任务时允许覆盖的受限下载参数。 */
  type TaskOptions = {
    concurrency?: number;
    maxBytesPerSecond?: number;
  };

  /** 可通过命令重新读取的资源任务投影。 */
  type TaskSummary = {
    revision: number;
    taskId: string;
    planId: string;
    installationId: string;
    target: PlanTargetEnum;
    sourceTag: string;
    targetTag: string;
    manifestDigest: string;
    state: TaskStateEnum;
    downloadedBytes: number;
    totalBytes: number;
    completedCount: number;
    totalCount: number;
    currentFile: string | null;
    bytesPerSecond: number;
    etaSeconds: number | null;
    errorMessage: string | null;
    updatedAt: string;
  };
}
