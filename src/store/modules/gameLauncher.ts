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
  cancelGamePackageVerify,
  getGamePackageVerifyStatus,
  listGamePackageTasks,
  recoverGamePackageTask,
  startGamePackageTask,
  verifyGamePackage,
} from "@utils/TGGameLauncher.js";
import { defineStore } from "pinia";
import { shallowRef } from "vue";

const useGameLauncherStore = defineStore("gameLauncher", () => {
  const tasksByInstallation = shallowRef<Record<string, TGApp.Game.Package.TaskSummary>>({});
  const verifyByInstallation = shallowRef<Record<string, TGApp.Game.Package.VerifySummary>>({});
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

  function setPending(key: string, pending: boolean): void {
    const next = { ...pendingActions.value };
    if (pending) next[key] = true;
    else delete next[key];
    pendingActions.value = next;
  }

  function mergeVerify(summary: TGApp.Game.Package.VerifySummary): void {
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

  async function hydrateTasks(installationId?: string): Promise<void> {
    const tasks = await listGamePackageTasks(installationId);
    for (const task of tasks) mergeTask(task);
  }

  async function hydrateVerify(installationId: string): Promise<void> {
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

  async function cancelTask(taskId: string): Promise<void> {
    setPending(taskId, true);
    try {
      await cancelGamePackageTask(taskId);
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
    startVerify,
    applyTask,
    applySwitch,
    cancelTask,
    cancelVerify,
    recoverTask,
    startListening,
    stopListening,
  };
});

export default useGameLauncherStore;
