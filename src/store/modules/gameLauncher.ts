/**
 * 游戏资源长任务的非权威前端投影。
 * @since Beta v0.11.5
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
} from "@utils/TGGameLauncher.js";
import { TGPerf } from "@utils/TGPerf.js";
import { defineStore } from "pinia";
import { nextTick, shallowRef } from "vue";

const useGameLauncherStore = defineStore("gameLauncher", () => {
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
  let progressFrame: number | null = null;

  function shouldReplaceTask(
    current: TGApp.Game.Package.TaskSummary | undefined,
    task: TGApp.Game.Package.TaskSummary,
  ): boolean {
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
      task.state === gameEnum.package.taskState.CANCELED
    );
  }

  function scheduleCompletedAudioRemoval(task: TGApp.Game.Package.TaskSummary): void {
    if (
      task.target !== gameEnum.package.planTarget.AUDIO ||
      task.state !== gameEnum.package.taskState.COMPLETED
    ) {
      return;
    }
    void nextTick(() => removeTaskProjection(task));
  }

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
    TGPerf.recordStateReplace();
    scheduleCompletedAudioRemoval(task);
  }

  function flushTaskProgress(): void {
    TGPerf.recordFlush();
    progressFrame = null;
    if (pendingProgressByInstallation.size === 0) return;
    const next = { ...tasksByInstallation.value };
    const completedAudioTasks: Array<TGApp.Game.Package.TaskSummary> = [];
    let changed = false;
    for (const task of pendingProgressByInstallation.values()) {
      if (!shouldReplaceTask(next[task.installationId], task)) continue;
      next[task.installationId] = task;
      changed = true;
      if (
        task.target === gameEnum.package.planTarget.AUDIO &&
        task.state === gameEnum.package.taskState.COMPLETED
      ) {
        completedAudioTasks.push(task);
      }
    }
    pendingProgressByInstallation.clear();
    if (!changed) return;
    tasksByInstallation.value = next;
    TGPerf.recordFlushReplace();
    for (const task of completedAudioTasks) scheduleCompletedAudioRemoval(task);
  }

  function queueTaskProgress(task: TGApp.Game.Package.TaskSummary): void {
    const pending = pendingProgressByInstallation.get(task.installationId);
    const current = pending ?? tasksByInstallation.value[task.installationId];
    if (!shouldReplaceTask(current, task)) {
      TGPerf.recordProgressDropped();
      return;
    }
    pendingProgressByInstallation.set(task.installationId, task);
    if (progressFrame !== null) return;
    progressFrame = window.requestAnimationFrame(flushTaskProgress);
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

  async function hydrateTasks(installationId?: string): Promise<void> {
    const tasks = await listGamePackageTasks(installationId);
    const next = { ...tasksByInstallation.value };
    const completedAudioTasks: Array<TGApp.Game.Package.TaskSummary> = [];
    let changed = false;
    for (const task of tasks) {
      const pending = pendingProgressByInstallation.get(task.installationId);
      if (!shouldReplaceTask(pending ?? next[task.installationId], task)) continue;
      if (pending !== undefined) pendingProgressByInstallation.delete(task.installationId);
      next[task.installationId] = task;
      changed = true;
      if (
        task.target === gameEnum.package.planTarget.AUDIO &&
        task.state === gameEnum.package.taskState.COMPLETED
      ) {
        completedAudioTasks.push(task);
      }
    }
    if (!changed) return;
    tasksByInstallation.value = next;
    TGPerf.recordHydrate();
    for (const task of completedAudioTasks) scheduleCompletedAudioRemoval(task);
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
    await TGPerf.reset();
    await TGPerf.milestone("m0");
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
        await TGPerf.reset();
        await TGPerf.milestone("m0");
        const plan = await createGameInstallPlan(draft.installId);
        const task = await startGameInstall(draft.installId, plan.planId);
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

  async function cancelInstallDraft(
    draft: TGApp.Game.Installation.InstallDraftSummary,
  ): Promise<TGApp.Game.Installation.InstallDraftSummary> {
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

  async function startListening(): Promise<void> {
    if (unlisteners.length > 0) return;
    if (listenerPromise !== null) return await listenerPromise;
    const generation = ++listenerGeneration;
    listenerPromise = (async () => {
      const created = await Promise.all([
        listen<TGApp.Game.Package.TaskSummary>("game-package://state", (event) => {
          TGPerf.recordEvent("state");
          TGPerf.recordTaskState(event.payload);
          mergeTask(event.payload);
        }),
        listen<TGApp.Game.Package.TaskSummary>("game-package://progress", (event) => {
          TGPerf.recordEvent("progress");
          TGPerf.recordTaskProgress(event.payload);
          queueTaskProgress(event.payload);
        }),
        listen<TGApp.Game.Package.VerifySummary>("game-package://verify", (event) => {
          TGPerf.recordEvent("verify");
          mergeVerify(event.payload);
        }),
      ]);
      if (generation !== listenerGeneration) {
        for (const unlisten of created) unlisten();
        return;
      }
      unlisteners = created;
    })();
    try {
      await listenerPromise;
    } finally {
      listenerPromise = null;
    }
  }

  function stopListening(): void {
    listenerGeneration += 1;
    for (const unlisten of unlisteners) unlisten();
    unlisteners = [];
    pendingProgressByInstallation.clear();
    if (progressFrame !== null) window.cancelAnimationFrame(progressFrame);
    progressFrame = null;
  }

  return {
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
    startListening,
    stopListening,
  };
});

export default useGameLauncherStore;
