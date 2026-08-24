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
  recoverGamePackageTask,
  recoverGameInstall,
  startGameInstall,
  startGamePackageTask,
  verifyGamePackage,
} from "@utils/TGGameLauncher.js";
import { defineStore } from "pinia";
import { shallowRef } from "vue";

const useGameLauncherStore = defineStore("gameLauncher", () => {
  const tasksByInstallation = shallowRef<Record<string, TGApp.Game.Package.TaskSummary>>({});
  const verifyByInstallation = shallowRef<Record<string, TGApp.Game.Package.VerifySummary>>({});
  const dismissedVerifyInstallations = shallowRef<Set<string>>(new Set());
  const pendingActions = shallowRef<Record<string, boolean>>({});
  let unlisteners: Array<UnlistenFn> = [];
  let listenerPromise: Promise<void> | null = null;
  let listenerGeneration = 0;

  function mergeTask(task: TGApp.Game.Package.TaskSummary): void {
    const current = tasksByInstallation.value[task.installationId];
    if (
      current !== undefined &&
      ((current.taskId === task.taskId && current.revision > task.revision) ||
        (current.taskId === task.taskId &&
          current.revision === task.revision &&
          current.updatedAt > task.updatedAt) ||
        (current.taskId !== task.taskId && current.updatedAt > task.updatedAt))
    ) {
      return;
    }
    tasksByInstallation.value = {
      ...tasksByInstallation.value,
      [task.installationId]: task,
    };
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
      commitCompletedCount: 0,
      commitTotalCount: 0,
      commitCurrentStep: null,
      verificationCompletedCount: 0,
      verificationTotalCount: 0,
      spoolBytes: 0,
      releasedBytes: 0,
      assemblyCompletedBytesTotal: 0,
      currentFile: null,
      downloadCurrentFile: null,
      assemblyCurrentFile: null,
      bytesPerSecond: 0,
      etaSeconds: null,
      assemblyBytesPerSecond: 0,
      assemblyEtaSeconds: null,
      elapsedMs: 0,
      errorMessage: null,
      updatedAt: new Date().toISOString(),
    };
  }

  function removeTaskProjection(task: TGApp.Game.Package.TaskSummary): void {
    if (tasksByInstallation.value[task.installationId] !== task) return;
    const next = { ...tasksByInstallation.value };
    delete next[task.installationId];
    tasksByInstallation.value = next;
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
    for (const task of tasks) mergeTask(task);
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
  ): Promise<TGApp.Game.Package.TaskSummary> {
    const startingTask = createStartingInstallTask(draft, plan);
    mergeTask(startingTask);
    setPending(plan.planId, true);
    try {
      const task = await startGameInstall(draft.installId, plan.planId);
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
    try {
      const task = await recoverGamePackageTask(taskId, action);
      mergeTask(task);
      return task;
    } finally {
      setPending(taskId, false);
    }
  }

  async function recoverInstall(
    taskId: string,
    installId: string,
    action: TGApp.Game.Package.RecoveryActionEnum,
  ): Promise<TGApp.Game.Package.TaskSummary> {
    setPending(taskId, true);
    try {
      const task = await recoverGameInstall(taskId, installId, action);
      mergeTask(task);
      return task;
    } finally {
      setPending(taskId, false);
    }
  }

  async function cleanupTasks(): Promise<TGApp.Game.Package.TaskCleanupSummary> {
    setPending("task-cleanup", true);
    try {
      const summary = await cleanupGamePackageTasks();
      const next = { ...tasksByInstallation.value };
      for (const [installationId, task] of Object.entries(next)) {
        if (
          task.state === gameEnum.package.taskState.COMPLETED ||
          task.state === gameEnum.package.taskState.FAILED ||
          task.state === gameEnum.package.taskState.CANCELED
        ) {
          delete next[installationId];
        }
      }
      tasksByInstallation.value = next;
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
          mergeTask(event.payload);
        }),
        listen<TGApp.Game.Package.TaskSummary>("game-package://progress", (event) => {
          mergeTask(event.payload);
        }),
        listen<TGApp.Game.Package.VerifySummary>("game-package://verify", (event) => {
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
  }

  return {
    tasksByInstallation,
    verifyByInstallation,
    pendingActions,
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
    cancelInstall,
    pauseInstall,
    cancelVerify,
    clearVerify,
    dismissVerify,
    recoverTask,
    recoverInstall,
    cleanupTasks,
    startListening,
    stopListening,
  };
});

export default useGameLauncherStore;
