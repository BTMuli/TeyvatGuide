/**
 * 游戏资源快照与不可变计划类型。
 * @since Beta v0.11.5
 */

declare namespace TGApp.Game.Package {
  /** 可生成计划的目标分支。 */
  const PlanTarget = <const>{
    MAIN: "main",
    PRE_DOWNLOAD: "pre_download",
    AUDIO: "audio",
    SWITCH: "switch",
    INSTALL: "install",
  };

  /** 目标分支值。 */
  type PlanTargetEnum = (typeof PlanTarget)[keyof typeof PlanTarget];

  /** 计划使用的差异策略。 */
  const PlanStrategy = <const>{
    PATCH: "patch",
    MANIFEST_DIFF: "manifest_diff",
    FULL: "full",
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
    sourceTag: string | null;
    targetTag: string;
    manifestDigest: string;
    strategy: PlanStrategyEnum;
    downloadBytes: number;
    installBytes: number;
    deleteBytes: number;
    cacheHitBytes: number;
    requiredFreeBytes: number;
    availableFreeBytes: number;
    hasSufficientSpace: boolean;
    cacheRequiredFreeBytes: number;
    installRequiredFreeBytes: number;
    cacheAvailableFreeBytes: number;
    installAvailableFreeBytes: number;
    sameVolume: boolean;
    downloadCount: number;
    addCount: number;
    modifyCount: number;
    deleteCount: number;
    sourceAudioLanguages: Array<string>;
    targetAudioLanguages: Array<string>;
  };

  /** 后端生成资源计划时上报的真实步骤。 */
  type PlanProgress = {
    step: number;
    total: number;
    message: string;
  };

  /** 恢复资源任务时的计划复验与缓存核对进度。 */
  type RecoveryProgress = {
    taskId: string;
    step: number;
    totalSteps: number;
    scannedObjects: number;
    totalObjects: number;
    confirmedBytes: number;
    message: string;
  };

  /** 安装完整性校验任务状态。 */
  const VerifyState = <const>{
    SCANNING: "scanning",
    COMPLETED: "completed",
    FAILED: "failed",
    CANCELED: "canceled",
  };

  /** 完整性校验任务状态值。 */
  type VerifyStateEnum = (typeof VerifyState)[keyof typeof VerifyState];

  /** 安装完整性校验进度与结果；不健康完成时附带可执行的修复计划。 */
  type VerifySummary = {
    sessionId: string;
    installationId: string;
    version: string;
    state: VerifyStateEnum;
    healthy: boolean | null;
    issueCount: number;
    plan: PlanSummary | null;
    totalFiles: number;
    completedFiles: number;
    totalBytes: number;
    hashedBytes: number;
    currentFile: string | null;
    bytesPerSecond: number;
    etaSeconds: number | null;
    elapsedMs: number;
    totalElapsedMs: number;
    errorMessage: string | null;
    updatedAt: string;
  };

  /** 可恢复资源任务状态。 */
  const TaskState = <const>{
    QUEUED: "queued",
    DOWNLOADING: "downloading",
    PAUSED: "paused",
    READY_TO_APPLY: "ready_to_apply",
    ASSEMBLING: "assembling",
    COMMIT_PREPARED: "commit_prepared",
    COMMITTING: "committing",
    VERIFYING: "verifying",
    PUBLISH_PENDING: "publish_pending",
    PUBLISHED: "published",
    VERIFIED: "verified",
    REGISTRATION_PENDING: "registration_pending",
    REPAIR_REQUIRED: "repair_required",
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
    sourceScheme: TGApp.Game.Installation.SchemeEnum;
    targetScheme: TGApp.Game.Installation.SchemeEnum;
    installRoot: string | null;
    audioLanguages: Array<string>;
    sourceAudioLanguages: Array<string>;
    targetAudioLanguages: Array<string>;
    sourceTag: string | null;
    targetTag: string;
    manifestDigest: string;
    state: TaskStateEnum;
    downloadedBytes: number;
    totalBytes: number;
    completedCount: number;
    totalCount: number;
    assemblyCompletedCount: number;
    assemblyTotalCount: number;
    assemblyCompletedBytes: number;
    assemblyTotalBytes: number;
    activeAssemblyCount: number;
    commitCompletedCount: number;
    commitTotalCount: number;
    commitCurrentStep: string | null;
    verificationCompletedCount: number;
    verificationTotalCount: number;
    /** 当前复验阶段已经确认的文件字节数。 */
    verificationCompletedBytes: number;
    /** 当前复验阶段需要确认的文件总字节数。 */
    verificationTotalBytes: number;
    spoolBytes: number;
    releasedBytes: number;
    assemblyCompletedBytesTotal: number;
    deleteTotalBytes: number;
    deleteCompletedBytes: number;
    currentFile: string | null;
    downloadCurrentFile: string | null;
    assemblyCurrentFile: string | null;
    bytesPerSecond: number;
    etaSeconds: number | null;
    assemblyBytesPerSecond: number;
    assemblyEtaSeconds: number | null;
    elapsedMs: number;
    errorMessage: string | null;
    updatedAt: string;
  };

  /** 同资源家族渠道转换的只读计划摘要。 */
  type SwitchSummary = {
    planId: string;
    installationId: string;
    sourceScheme: TGApp.Game.Installation.SchemeEnum;
    targetScheme: TGApp.Game.Installation.SchemeEnum;
    sourceChannel: number;
    sourceSubChannel: number;
    targetChannel: number;
    targetSubChannel: number;
    sdkRequired: boolean;
    sdkVersion: string | null;
    downloadBytes: number;
    installBytes: number;
    cacheHitBytes: number;
    deleteCount: number;
    deleteFiles: Array<string>;
    requiredFreeBytes: number;
    availableFreeBytes: number;
    hasSufficientSpace: boolean;
  };

  /** 应用数据目录中游戏资源缓存的占用摘要；不含计划与校验会话。 */
  type CacheSummary = {
    chunkBytes: number;
    chunkCount: number;
    chunkProtectedBytes: number;
    chunkProtectedCount: number;
    sdkBytes: number;
    sdkCount: number;
    sdkProtectedBytes: number;
    sdkProtectedCount: number;
    totalBytes: number;
    reclaimableBytes: number;
  };

  /** 缓存清理进度事件载荷（`game-cache://progress`）。 */
  type CacheClearProgress = {
    completed: number;
    total: number;
    current: string | null;
  };

  /** 放弃安装时转存分片的进度事件载荷（`game-install://abandon-progress`）。 */
  type InstallAbandonProgress = {
    completed: number;
    total: number;
    current: string | null;
  };

  /** 清理已结束游戏资源任务后的统计。 */
  type TaskCleanupSummary = {
    removedCount: number;
    removedBytes: number;
    removedTaskIds: Array<string>;
  };
}
