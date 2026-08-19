/**
 * 游戏资源长任务的非权威前端投影。
 * @since Beta v0.11.5
 */

import type { UnlistenFn } from "@tauri-apps/api/event";
import { listen } from "@tauri-apps/api/event";
import {
  cancelGamePackageTask,
  listGamePackageTasks,
  recoverGamePackageTask,
  startGamePackageTask,
} from "@utils/TGGameLauncher.js";
import { defineStore } from "pinia";
import { shallowRef } from "vue";

const useGameLauncherStore = defineStore("gameLauncher", () => {
  const tasksByInstallation = shallowRef<Record<string, TGApp.Game.Package.TaskSummary>>({});
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

  async function hydrateTasks(installationId?: string): Promise<void> {
    const tasks = await listGamePackageTasks(installationId);
    for (const task of tasks) mergeTask(task);
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
    pendingActions,
    hydrateTasks,
    startTask,
    cancelTask,
    recoverTask,
    startListening,
    stopListening,
  };
});

export default useGameLauncherStore;
