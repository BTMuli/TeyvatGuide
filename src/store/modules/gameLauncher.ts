/**
 * 游戏资源长任务的非权威前端投影。
 * @since Beta v0.13.0
 */

import gameEnum from "@enum/game.js";
import type { UnlistenFn } from "@tauri-apps/api/event";
import { listen } from "@tauri-apps/api/event";
import {
  applyGamePackageSwitch,
  applyGamePackageTask,
  cancelGamePackageTask,
  cleanupGamePackageTasks,
  cancelGamePackageVerify,
  cancelGameInstallDraft,
  clearGamePackageVerify,
  cancelGameInstall,
  createGameInstallPlan,
  getGamePackageVerifyStatus,
  listGamePackageTasks,
  pauseGameInstall,
  pauseGamePackageTask,
  recoverGamePackageTask,
  recoverGameInstall,
  removeGamePackageTask,
  startGameInstall,
  startGamePackageTask,
  verifyGamePackage,
} from "@utils/game/TGGameLauncher.js";
import { defineStore } from "pinia";
import { nextTick, ref, shallowRef } from "vue";

const useGameLauncherStore = defineStore("gameLauncher", () => {
  const launchRequested = ref<boolean>(false);
  const tasksByInstallation = shallowRef<Record<string, TGApp.Game.Package.TaskSummary>>({});
  const verifyByInstallation = shallowRef<Record<string, TGApp.Game.Package.VerifySummary>>({});
  const dismissedVerifyInstallations = shallowRef<Set<string>>(new Set());
  const pendingActions = shallowRef<Record<string, boolean>>({});
  const recoveryProgressByTask = shallowRef<Record<string, TGApp.Game.Package.RecoveryProgress>>(
    {},
  );
  let unlisteners: Array<UnlistenFn> = [];
  let listenerPromise: Promise<void> | null = null;
  let listenerGeneration = 0;
  const pendingProgressByInstallation = new Map<string, TGApp.Game.Package.TaskSummary>();
  // 投影隐藏后仍保留修订号；离页或重连时，取消前发出的列表请求仍可能返回。
  const hiddenTaskRevisions = new Map<string, number>();
  const PROGRESS_FLUSH_MS = 150;
  let progressTimer: number | null = null;
  const completedInstallHideTimers = new Map<string, number>();
  const completedInstallHideMs = 5000;

  function requestLaunch(): void {
    launchRequested.value = true;
  }

  function consumeLaunchRequest(): boolean {
    if (!launchRequested.value) return false;
    launchRequested.value = false;
    return true;
  }

  /**
   * 按修订号和更新时间拒绝迟到的任务快照。
   * @since Beta v0.13.0
   */
  function shouldReplaceTask(
    current: TGApp.Game.Package.TaskSummary | undefined,
    task: TGApp.Game.Package.TaskSummary,
  ): boolean {
    const hiddenRevision = hiddenTaskRevisions.get(task.taskId);
    if (hiddenRevision !== undefined && task.revision <= hiddenRevision) return false;
    return !(
      current !== undefined &&
      ((current.taskId === task.taskId && current.revision > task.revision) ||
        (current.taskId === task.taskId &&
          current.revision === task.revision &&
          current.updatedAt > task.updatedAt) ||
        (current.taskId !== task.taskId && current.updatedAt > task.updatedAt))
    );
  }

  function isTerminalTask(task: TGApp.Game.Package.TaskSummary): boolean {
    return (
      task.state === gameEnum.package.taskState.COMPLETED ||
      task.state === gameEnum.package.taskState.FAILED ||
      task.state === gameEnum.package.taskState.CANCELED ||
      task.state === gameEnum.package.taskState.ABANDONED
    );
  }

  function isDelayedDismissTarget(task: TGApp.Game.Package.TaskSummary): boolean {
    return (
      task.target === gameEnum.package.planTarget.INSTALL ||
      task.target === gameEnum.package.planTarget.MAIN ||
      task.target === gameEnum.package.planTarget.PRE_DOWNLOAD
    );
  }

  function shouldHideAbandonedTask(task: TGApp.Game.Package.TaskSummary): boolean {
    return task.state === gameEnum.package.taskState.ABANDONED;
  }

  /**
   * 判断任务是否不再进入任务面板。
   *
   * 全新安装取消时草稿与暂存目录已被删除，没有可恢复内容；继续保留投影会渲染出
   * 依赖安装草稿的恢复与放弃入口。
   * @since Beta v0.13.0
   * @param task - 资源任务投影
   * @returns 是否从任务面板隐藏
   */
  function shouldHideTask(task: TGApp.Game.Package.TaskSummary): boolean {
    if (shouldHideAbandonedTask(task)) return true;
    return (
      task.target === gameEnum.package.planTarget.INSTALL &&
      task.state === gameEnum.package.taskState.CANCELED
    );
  }

  /**
   * 保留已隐藏任务的最新修订号，避免迟到快照重新建立投影。
   * @since Beta v0.13.0
   * @param task - 已隐藏的资源任务快照
   */
  function rememberHiddenTask(task: TGApp.Game.Package.TaskSummary): void {
    const revision = hiddenTaskRevisions.get(task.taskId);
    if (revision === undefined || task.revision > revision) {
      hiddenTaskRevisions.set(task.taskId, task.revision);
    }
  }

  function scheduleCompletedTaskRemoval(task: TGApp.Game.Package.TaskSummary): void {
    if (task.state !== gameEnum.package.taskState.COMPLETED) return;
    if (task.target === gameEnum.package.planTarget.AUDIO) {
      void nextTick(() => removeTaskProjection(task));
      return;
    }
    if (!isDelayedDismissTarget(task)) return;
    if (completedInstallHideTimers.has(task.taskId)) return;
    const timer = window.setTimeout(() => {
      completedInstallHideTimers.delete(task.taskId);
      const current = tasksByInstallation.value[task.installationId];
      if (
        current === undefined ||
        current.taskId !== task.taskId ||
        current.state !== gameEnum.package.taskState.COMPLETED
      ) {
        return;
      }
      removeTaskProjection(current);
    }, completedInstallHideMs);
    completedInstallHideTimers.set(task.taskId, timer);
  }

  function shouldOmitCompletedInstall(task: TGApp.Game.Package.TaskSummary): boolean {
    return (
      isDelayedDismissTarget(task) &&
      task.state === gameEnum.package.taskState.COMPLETED &&
      !completedInstallHideTimers.has(task.taskId)
    );
  }

  function clearCompletedInstallHideTimers(): void {
    for (const timer of completedInstallHideTimers.values()) window.clearTimeout(timer);
    completedInstallHideTimers.clear();
  }

  /**
   * 合并单条任务快照；已结束的任务不写入投影。
   * @since Beta v0.13.0
   * @param task - 资源任务投影
   */
  function mergeTask(task: TGApp.Game.Package.TaskSummary): void {
    const pending = pendingProgressByInstallation.get(task.installationId);
    if (pending !== undefined) {
      if (!shouldReplaceTask(pending, task)) return;
      pendingProgressByInstallation.delete(task.installationId);
    }
    const current = tasksByInstallation.value[task.installationId];
    if (!shouldReplaceTask(current, task)) return;
    tasksByInstallation.value = {
      ...tasksByInstallation.value,
      [task.installationId]: task,
    };
    if (shouldHideTask(task)) {
      rememberHiddenTask(task);
      removeTaskProjection(task);
      return;
    }
    scheduleCompletedTaskRemoval(task);
  }

  function shouldFlushProgressImmediately(task: TGApp.Game.Package.TaskSummary): boolean {
    return task.state !== gameEnum.package.taskState.DOWNLOADING;
  }

  function clearProgressTimer(): void {
    if (progressTimer === null) return;
    window.clearTimeout(progressTimer);
    progressTimer = null;
  }

  /**
   * 把缓冲的进度快照写入投影，跳过已结束的任务。
   * @since Beta v0.13.0
   */
  function flushTaskProgress(): void {
    progressTimer = null;
    if (pendingProgressByInstallation.size === 0) return;
    const next = { ...tasksByInstallation.value };
    const completedTasks: Array<TGApp.Game.Package.TaskSummary> = [];
    let changed = false;
    for (const task of pendingProgressByInstallation.values()) {
      if (shouldHideTask(task)) continue;
      if (!shouldReplaceTask(next[task.installationId], task)) continue;
      next[task.installationId] = task;
      changed = true;
      if (task.state === gameEnum.package.taskState.COMPLETED) completedTasks.push(task);
    }
    pendingProgressByInstallation.clear();
    if (!changed) return;
    tasksByInstallation.value = next;
    for (const task of completedTasks) scheduleCompletedTaskRemoval(task);
  }

  /**
   * 缓冲下载进度；隐藏终态立即合并，以清理投影并保留修订号。
   * @since Beta v0.13.0
   * @param task - 资源任务进度快照
   */
  function queueTaskProgress(task: TGApp.Game.Package.TaskSummary): void {
    if (shouldHideTask(task)) {
      mergeTask(task);
      return;
    }
    const pending = pendingProgressByInstallation.get(task.installationId);
    const current = pending ?? tasksByInstallation.value[task.installationId];
    if (!shouldReplaceTask(current, task)) return;
    pendingProgressByInstallation.set(task.installationId, task);
    if (shouldFlushProgressImmediately(task)) {
      clearProgressTimer();
      flushTaskProgress();
      return;
    }
    if (progressTimer !== null) return;
    progressTimer = window.setTimeout(flushTaskProgress, PROGRESS_FLUSH_MS);
  }

  function setRecoveryProgress(
    taskId: string,
    progress: TGApp.Game.Package.RecoveryProgress | null,
  ): void {
    const next = { ...recoveryProgressByTask.value };
    if (progress === null) delete next[taskId];
    else next[taskId] = progress;
    recoveryProgressByTask.value = next;
  }

  function createStartingInstallTask(
    draft: TGApp.Game.Installation.InstallDraftSummary,
    plan: TGApp.Game.Package.PlanSummary,
  ): TGApp.Game.Package.TaskSummary {
    return {
      revision: 0,
      taskId: plan.planId,
      planId: plan.planId,
      installationId: draft.installId,
      target: gameEnum.package.planTarget.INSTALL,
      sourceScheme: draft.scheme,
      targetScheme: draft.scheme,
      installRoot: draft.installRoot,
      audioLanguages: [...draft.audioLanguages],
      sourceAudioLanguages: [],
      targetAudioLanguages: [...draft.audioLanguages],
      sourceTag: null,
      targetTag: plan.targetTag,
      manifestDigest: plan.manifestDigest,
      state: gameEnum.package.taskState.QUEUED,
      downloadedBytes: 0,
      totalBytes: plan.downloadBytes,
      completedCount: 0,
      totalCount: plan.downloadCount,
      fallbackAssetCount: 0,
      fallbackDownloadBytes: 0,
      requiresFullVerification: false,
      assemblyCompletedCount: 0,
      assemblyTotalCount: 0,
      assemblyCompletedBytes: 0,
      assemblyTotalBytes: 0,
      activeAssemblyCount: 0,
      commitCompletedCount: 0,
      commitTotalCount: 0,
      commitCurrentStep: null,
      verificationCompletedCount: 0,
      verificationTotalCount: 0,
      verificationCompletedBytes: 0,
      verificationTotalBytes: 0,
      spoolBytes: 0,
      releasedBytes: 0,
      assemblyCompletedBytesTotal: 0,
      deleteTotalBytes: 0,
      deleteCompletedBytes: 0,
      currentFile: null,
      downloadCurrentFile: null,
      assemblyCurrentFile: null,
      bytesPerSecond: 0,
      etaSeconds: null,
      assemblyBytesPerSecond: 0,
      assemblyEtaSeconds: null,
      elapsedMs: 0,
      errorMessage: null,
      autoRetryMessage: null,
      updatedAt: new Date().toISOString(),
    };
  }

  function removeTaskProjection(task: TGApp.Game.Package.TaskSummary): void {
    if (tasksByInstallation.value[task.installationId] !== task) return;
    const next = { ...tasksByInstallation.value };
    delete next[task.installationId];
    tasksByInstallation.value = next;
  }

  function removeTaskProjections(removedTaskIds: ReadonlySet<string>): void {
    const next = { ...tasksByInstallation.value };
    let changed = false;
    for (const [installationId, task] of Object.entries(next)) {
      if (!removedTaskIds.has(task.taskId) || !isTerminalTask(task)) continue;
      delete next[installationId];
      changed = true;
    }
    for (const [installationId, task] of pendingProgressByInstallation) {
      if (removedTaskIds.has(task.taskId) && isTerminalTask(task)) {
        pendingProgressByInstallation.delete(installationId);
      }
    }
    if (changed) tasksByInstallation.value = next;
  }

  function setPending(key: string, pending: boolean): void {
    const next = { ...pendingActions.value };
    if (pending) next[key] = true;
    else delete next[key];
    pendingActions.value = next;
  }

  function mergeVerify(summary: TGApp.Game.Package.VerifySummary): void {
    if (dismissedVerifyInstallations.value.has(summary.installationId)) return;
    const current = verifyByInstallation.value[summary.installationId];
    if (
      current !== undefined &&
      current.sessionId === summary.sessionId &&
      current.hashedBytes > summary.hashedBytes &&
      current.state === summary.state
    ) {
      return;
    }
    verifyByInstallation.value = {
      ...verifyByInstallation.value,
      [summary.installationId]: summary,
    };
  }

  function dismissVerify(installationId: string): void {
    const nextDismissed = new Set(dismissedVerifyInstallations.value);
    nextDismissed.add(installationId);
    dismissedVerifyInstallations.value = nextDismissed;
    if (verifyByInstallation.value[installationId] === undefined) return;
    const next = { ...verifyByInstallation.value };
    delete next[installationId];
    verifyByInstallation.value = next;
  }

  function revealVerify(installationId: string): void {
    if (!dismissedVerifyInstallations.value.has(installationId)) return;
    const next = new Set(dismissedVerifyInstallations.value);
    next.delete(installationId);
    dismissedVerifyInstallations.value = next;
  }

  /**
   * 用后端任务列表对账，保留查询期间到达的新事件和仍在启动的任务。
   * @since Beta v0.13.0
   */
  async function hydrateTasks(installationId?: string): Promise<void> {
    const previous = tasksByInstallation.value;
    const previousPending = new Map(pendingProgressByInstallation);
    const tasks = await listGamePackageTasks(installationId);
    const next = { ...tasksByInstallation.value };
    const selected = new Map<string, TGApp.Game.Package.TaskSummary>();
    const latest = new Map<string, TGApp.Game.Package.TaskSummary>();
    const completedTasks: Array<TGApp.Game.Package.TaskSummary> = [];
    // 后端按更新时间倒序返回：每个安装只投影最新的「需要展示」任务。
    for (const task of tasks) {
      if (!latest.has(task.installationId)) latest.set(task.installationId, task);
      if (selected.has(task.installationId)) continue;
      if (
        shouldHideTask(task) ||
        shouldOmitCompletedInstall(task) ||
        !shouldReplaceTask(undefined, task)
      )
        continue;
      selected.set(task.installationId, task);
    }
    let changed = false;
    const installationIds = new Set([
      ...Object.keys(next),
      ...latest.keys(),
      ...pendingProgressByInstallation.keys(),
    ]);
    for (const id of installationIds) {
      if (installationId !== undefined && installationId !== id) continue;
      const current = next[id];
      const pending = pendingProgressByInstallation.get(id);
      const task = selected.get(id);
      const updatedDuringRequest = current !== previous[id] || pending !== previousPending.get(id);
      if (task === undefined) {
        if (
          updatedDuringRequest ||
          pendingActions.value[id] ||
          (current !== undefined && pendingActions.value[current.taskId])
        )
          continue;
        const terminal = latest.get(id);
        if (terminal !== undefined && !shouldReplaceTask(pending ?? current, terminal)) continue;
        pendingProgressByInstallation.delete(id);
        if (current === undefined) continue;
        delete next[id];
      } else {
        const existing = pending ?? current;
        if (
          (updatedDuringRequest || existing?.taskId === task.taskId) &&
          !shouldReplaceTask(existing, task)
        )
          continue;
        pendingProgressByInstallation.delete(id);
        next[id] = task;
        if (task.state === gameEnum.package.taskState.COMPLETED) completedTasks.push(task);
      }
      changed = true;
    }
    // 先完成终态对账，再记录修订号，避免当前响应被自身的隐藏记录拦截。
    for (const task of tasks) {
      if (shouldHideTask(task)) rememberHiddenTask(task);
    }
    if (!changed) return;
    tasksByInstallation.value = next;
    for (const task of completedTasks) scheduleCompletedTaskRemoval(task);
  }

  async function hydrateVerify(installationId: string): Promise<void> {
    if (dismissedVerifyInstallations.value.has(installationId)) return;
    const status = await getGamePackageVerifyStatus(installationId);
    if (status === null) return;
    mergeVerify(status);
    if (status.state !== gameEnum.package.verifyState.SCANNING) return;
    try {
      mergeVerify(await verifyGamePackage(installationId));
    } catch {
      // 保留磁盘快照；若安装正被资源任务占用，后台扫描无法立刻恢复。
    }
  }

  async function startVerify(installationId: string): Promise<TGApp.Game.Package.VerifySummary> {
    revealVerify(installationId);
    setPending(`verify:${installationId}`, true);
    try {
      const summary = await verifyGamePackage(installationId);
      mergeVerify(summary);
      return summary;
    } finally {
      setPending(`verify:${installationId}`, false);
    }
  }

  async function cancelVerify(installationId: string): Promise<void> {
    setPending(`verify:${installationId}`, true);
    try {
      await cancelGamePackageVerify(installationId);
    } finally {
      setPending(`verify:${installationId}`, false);
    }
  }

  async function clearVerify(installationId: string): Promise<void> {
    setPending(`verify-clear:${installationId}`, true);
    try {
      await clearGamePackageVerify(installationId);
    } finally {
      setPending(`verify-clear:${installationId}`, false);
    }
  }

  /**
   * 启动游戏资源任务。
   * @since Beta v0.13.0
   * @param plan - 已固化的资源计划
   * @returns 启动后的任务投影
   */
  async function startTask(
    plan: TGApp.Game.Package.PlanSummary,
  ): Promise<TGApp.Game.Package.TaskSummary> {
    setPending(plan.installationId, true);
    try {
      const task = await startGamePackageTask(plan.planId);
      mergeTask(task);
      return task;
    } finally {
      setPending(plan.installationId, false);
    }
  }

  async function startInstall(
    draft: TGApp.Game.Installation.InstallDraftSummary,
    plan: TGApp.Game.Package.PlanSummary,
    options?: TGApp.Game.Package.TaskOptions,
  ): Promise<TGApp.Game.Package.TaskSummary> {
    const startingTask = createStartingInstallTask(draft, plan);
    mergeTask(startingTask);
    setPending(plan.planId, true);
    try {
      const task = await startGameInstall(draft.installId, plan.planId, options);
      mergeTask(task);
      return task;
    } catch (error) {
      removeTaskProjection(startingTask);
      throw error;
    } finally {
      setPending(plan.planId, false);
    }
  }

  async function resumeInstallDraft(
    draft: TGApp.Game.Installation.InstallDraftSummary,
  ): Promise<TGApp.Game.Package.TaskSummary> {
    setPending(draft.draftId, true);
    try {
      if (
        draft.state === gameEnum.installation.draftState.CREATED ||
        draft.state === gameEnum.installation.draftState.PLANNED
      ) {
        const planId = draft.planId ?? (await createGameInstallPlan(draft.installId)).planId;
        const task = await startGameInstall(draft.installId, planId);
        mergeTask(task);
        return task;
      }
      if (draft.planId === null) throw new Error("安装草稿缺少可恢复的安装计划");
      const task = await recoverGameInstall(
        draft.planId,
        draft.installId,
        gameEnum.package.recoveryAction.RESUME,
      );
      mergeTask(task);
      return task;
    } finally {
      setPending(draft.draftId, false);
    }
  }

  /**
   * 取消未启动的安装草稿；草稿已被取消清理时同样视为完成。
   * @since Beta v0.13.0
   * @param draft - 安装草稿摘要
   * @returns 已取消的草稿摘要；草稿已被取消清理时为 null
   */
  async function cancelInstallDraft(
    draft: TGApp.Game.Installation.InstallDraftSummary,
  ): Promise<TGApp.Game.Installation.InstallDraftSummary | null> {
    setPending(draft.draftId, true);
    try {
      return await cancelGameInstallDraft(draft.installId);
    } finally {
      setPending(draft.draftId, false);
    }
  }

  async function cancelTask(taskId: string): Promise<void> {
    setPending(taskId, true);
    try {
      await cancelGamePackageTask(taskId);
    } finally {
      setPending(taskId, false);
    }
  }

  async function pauseTask(taskId: string): Promise<TGApp.Game.Package.TaskSummary> {
    setPending(taskId, true);
    try {
      const task = await pauseGamePackageTask(taskId);
      mergeTask(task);
      return task;
    } finally {
      setPending(taskId, false);
    }
  }

  async function cancelInstall(
    taskId: string,
    installId: string,
  ): Promise<TGApp.Game.Package.TaskSummary> {
    setPending(taskId, true);
    try {
      const task = await cancelGameInstall(taskId, installId);
      mergeTask(task);
      return task;
    } finally {
      setPending(taskId, false);
    }
  }

  async function pauseInstall(
    taskId: string,
    installId: string,
  ): Promise<TGApp.Game.Package.TaskSummary> {
    setPending(taskId, true);
    try {
      const task = await pauseGameInstall(taskId, installId);
      mergeTask(task);
      return task;
    } finally {
      setPending(taskId, false);
    }
  }

  /**
   * 应用已下载的游戏资源任务。
   * @since Beta v0.13.0
   * @param taskId - 资源任务 ID
   * @returns 应用开始后的任务投影
   */
  async function applyTask(taskId: string): Promise<TGApp.Game.Package.TaskSummary> {
    setPending(taskId, true);
    try {
      const task = await applyGamePackageTask(taskId);
      mergeTask(task);
      return task;
    } finally {
      setPending(taskId, false);
    }
  }

  async function applySwitch(planId: string): Promise<TGApp.Game.Package.TaskSummary> {
    setPending(planId, true);
    try {
      const task = await applyGamePackageSwitch(planId);
      mergeTask(task);
      return task;
    } finally {
      setPending(planId, false);
    }
  }

  /**
   * 恢复游戏资源任务。
   * @since Beta v0.13.0
   * @param taskId - 资源任务 ID
   * @param action - 恢复动作
   * @returns 恢复后的任务投影
   */
  async function recoverTask(
    taskId: string,
    action: TGApp.Game.Package.RecoveryActionEnum,
  ): Promise<TGApp.Game.Package.TaskSummary> {
    setPending(taskId, true);
    setRecoveryProgress(taskId, null);
    try {
      const task = await recoverGamePackageTask(taskId, action, (progress) => {
        setRecoveryProgress(taskId, progress);
      });
      mergeTask(task);
      return task;
    } finally {
      setRecoveryProgress(taskId, null);
      setPending(taskId, false);
    }
  }

  async function recoverInstall(
    taskId: string,
    installId: string,
    action: TGApp.Game.Package.RecoveryActionEnum,
    keepDownloads = false,
  ): Promise<TGApp.Game.Package.TaskSummary> {
    setPending(taskId, true);
    try {
      const task = await recoverGameInstall(taskId, installId, action, keepDownloads);
      mergeTask(task);
      return task;
    } finally {
      setPending(taskId, false);
    }
  }

  async function removeTaskHistory(taskId: string): Promise<TGApp.Game.Package.TaskCleanupSummary> {
    const pendingKey = `task-history-remove:${taskId}`;
    setPending(pendingKey, true);
    try {
      const summary = await removeGamePackageTask(taskId);
      if (summary.removedTaskIds.includes(taskId)) {
        removeTaskProjections(new Set([taskId]));
      }
      return summary;
    } finally {
      setPending(pendingKey, false);
    }
  }

  async function cleanupTasks(): Promise<TGApp.Game.Package.TaskCleanupSummary> {
    setPending("task-cleanup", true);
    try {
      const summary = await cleanupGamePackageTasks();
      removeTaskProjections(new Set(summary.removedTaskIds));
      return summary;
    } finally {
      setPending("task-cleanup", false);
    }
  }

  /**
   * 注册全部后端事件监听，并在部分注册失败时清理已成功注册的监听。
   * @param generation - 本次监听生命周期的代数。
   * @since Beta v0.13.0
   */
  async function createListeners(generation: number): Promise<Array<UnlistenFn>> {
    const results = await Promise.allSettled([
      listen<TGApp.Game.Package.TaskSummary>("game-package://state", (event) => {
        if (generation !== listenerGeneration) return;
        mergeTask(event.payload);
      }),
      listen<TGApp.Game.Package.TaskSummary>("game-package://progress", (event) => {
        if (generation !== listenerGeneration) return;
        queueTaskProgress(event.payload);
      }),
      listen<TGApp.Game.Package.VerifySummary>("game-package://verify", (event) => {
        if (generation !== listenerGeneration) return;
        mergeVerify(event.payload);
      }),
    ]);
    const created: Array<UnlistenFn> = [];
    let failure: { reason: unknown } | undefined;
    for (const result of results) {
      if (result.status === "fulfilled") created.push(result.value);
      else if (failure === undefined) failure = result;
    }
    if (failure !== undefined) {
      clearListeners(created);
      throw failure.reason;
    }
    return created;
  }

  /**
   * 清理一组后端事件监听。
   * @since Beta v0.13.0
   */
  function clearListeners(listeners: ReadonlyArray<UnlistenFn>): void {
    for (const unlisten of listeners) unlisten();
  }

  /**
   * 启动后端事件监听；每次生命周期只接受本轮注册结果。
   * @since Beta v0.13.0
   */
  async function startListening(): Promise<void> {
    if (unlisteners.length > 0) return;
    if (listenerPromise !== null) return await listenerPromise;
    const generation = ++listenerGeneration;
    const promise = (async () => {
      const created = await createListeners(generation);
      if (generation !== listenerGeneration) {
        clearListeners(created);
        return;
      }
      unlisteners = created;
    })();
    listenerPromise = promise;
    try {
      await promise;
    } catch (error) {
      if (generation === listenerGeneration) listenerGeneration += 1;
      throw error;
    } finally {
      if (listenerPromise === promise) listenerPromise = null;
    }
  }

  /**
   * 停止当前监听生命周期，并使尚未完成的注册结果失效。
   * @since Beta v0.13.0
   */
  function stopListening(): void {
    listenerGeneration += 1;
    listenerPromise = null;
    clearListeners(unlisteners);
    unlisteners = [];
    pendingProgressByInstallation.clear();
    clearProgressTimer();
    clearCompletedInstallHideTimers();
  }

  return {
    launchRequested,
    tasksByInstallation,
    verifyByInstallation,
    pendingActions,
    recoveryProgressByTask,
    hydrateTasks,
    hydrateVerify,
    startTask,
    startInstall,
    resumeInstallDraft,
    cancelInstallDraft,
    startVerify,
    applyTask,
    applySwitch,
    cancelTask,
    pauseTask,
    cancelInstall,
    pauseInstall,
    cancelVerify,
    clearVerify,
    dismissVerify,
    recoverTask,
    recoverInstall,
    removeTaskHistory,
    cleanupTasks,
    requestLaunch,
    consumeLaunchRequest,
    startListening,
    stopListening,
  };
});

export default useGameLauncherStore;
