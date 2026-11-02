/**
 * 游戏资源任务投影对账与乱序事件回归测试。
 * @since Beta v0.13.0
 */

import useGameLauncherStore from "@store/gameLauncher.js";
import type { EventCallback, UnlistenFn } from "@tauri-apps/api/event";
import { createPinia, disposePinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  listTasks: vi.fn<() => Promise<Array<TGApp.Game.Package.TaskSummary>>>(),
  startTask: vi.fn<() => Promise<TGApp.Game.Package.TaskSummary>>(),
  listen:
    vi.fn<
      (name: string, callback: EventCallback<TGApp.Game.Package.TaskSummary>) => Promise<UnlistenFn>
    >(),
  listeners: new Map<string, EventCallback<TGApp.Game.Package.TaskSummary>>(),
}));

vi.mock("@utils/game/TGGameLauncher.js", () => ({
  listGamePackageTasks: mocks.listTasks,
  startGamePackageTask: mocks.startTask,
}));
vi.mock("@tauri-apps/api/event", () => ({
  listen: mocks.listen,
}));

let pinia: ReturnType<typeof createPinia>;
let store: ReturnType<typeof useGameLauncherStore>;

/**
 * 创建完整且独立的任务快照。
 * @since Beta v0.13.0
 */
function createTask(
  changes: Partial<TGApp.Game.Package.TaskSummary> = {},
): TGApp.Game.Package.TaskSummary {
  return {
    revision: 1,
    taskId: "task-a",
    planId: "task-a",
    installationId: "install-a",
    target: "main",
    sourceScheme: "cn_official",
    targetScheme: "cn_official",
    installRoot: null,
    audioLanguages: ["zh-cn"],
    sourceAudioLanguages: ["zh-cn"],
    targetAudioLanguages: ["zh-cn"],
    sourceTag: "1.0.0",
    targetTag: "2.0.0",
    manifestDigest: "manifest",
    state: "downloading",
    downloadedBytes: 0,
    totalBytes: 100,
    completedCount: 0,
    totalCount: 1,
    fallbackAssetCount: 0,
    fallbackDownloadBytes: 0,
    requiresFullVerification: false,
    assemblyCompletedCount: 0,
    assemblyTotalCount: 1,
    assemblyCompletedBytes: 0,
    assemblyTotalBytes: 100,
    activeAssemblyCount: 0,
    commitCompletedCount: 0,
    commitTotalCount: 1,
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
    updatedAt: "2026-11-02T00:00:00.000Z",
    ...changes,
  };
}

/**
 * 通过真实监听入口交付后端事件。
 * @since Beta v0.13.0
 */
function emitTask(task: TGApp.Game.Package.TaskSummary, progress = false): void {
  const name = progress ? "game-package://progress" : "game-package://state";
  const callback = mocks.listeners.get(name);
  if (callback === undefined) throw new Error(`未注册任务监听：${name}`);
  callback({ event: name, id: 1, payload: task });
}

beforeEach(async () => {
  vi.useFakeTimers();
  vi.stubGlobal("window", globalThis);
  mocks.listTasks.mockReset();
  mocks.startTask.mockReset();
  mocks.listen.mockReset();
  mocks.listen.mockImplementation(async (name, callback) => {
    mocks.listeners.set(name, callback);
    return () => {
      if (mocks.listeners.get(name) === callback) mocks.listeners.delete(name);
    };
  });
  mocks.listeners.clear();
  pinia = createPinia();
  setActivePinia(pinia);
  store = useGameLauncherStore();
  await store.startListening();
});

afterEach(() => {
  store.stopListening();
  disposePinia(pinia);
  setActivePinia(undefined);
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("游戏任务状态对账", () => {
  it.each(<const>["completed", "abandoned"])("清除离页期间已%s的旧任务", async (state) => {
    emitTask(createTask({ state: "verifying" }));
    store.stopListening();
    mocks.listTasks.mockResolvedValue([createTask({ state, revision: 2 })]);
    await store.startListening();
    await store.hydrateTasks();
    expect(store.tasksByInstallation["install-a"]).toBeUndefined();
  });

  it("按安装范围移除后端已不存在的任务", async () => {
    emitTask(createTask());
    emitTask(createTask({ installationId: "install-b", taskId: "task-b" }));
    mocks.listTasks.mockResolvedValue([]);
    await store.hydrateTasks("install-a");
    expect(store.tasksByInstallation["install-a"]).toBeUndefined();
    expect(store.tasksByInstallation["install-b"]?.taskId).toBe("task-b");
  });

  it("忽略旧的中断状态并接受同一时刻更高修订号的恢复", () => {
    emitTask(createTask({ revision: 10 }));
    emitTask(createTask({ state: "paused", revision: 2 }));
    expect(store.tasksByInstallation["install-a"]?.state).toBe("downloading");
    emitTask(createTask({ state: "paused", revision: 11 }));
    emitTask(createTask({ revision: 12 }));
    expect(store.tasksByInstallation["install-a"]?.state).toBe("downloading");
  });

  it("旧列表响应不覆盖查询期间到达的新事件", async () => {
    emitTask(createTask());
    let resolveList: (tasks: Array<TGApp.Game.Package.TaskSummary>) => void = () => {};
    mocks.listTasks.mockReturnValue(
      new Promise((resolve) => {
        resolveList = resolve;
      }),
    );
    const hydration = store.hydrateTasks();
    emitTask(createTask({ revision: 10 }));
    resolveList([createTask({ state: "paused", revision: 2 })]);
    await hydration;
    expect(store.tasksByInstallation["install-a"]?.revision).toBe(10);
  });

  it("空列表不清除查询期间到达的缓冲进度", async () => {
    emitTask(createTask());
    let resolveList: (tasks: Array<TGApp.Game.Package.TaskSummary>) => void = () => {};
    mocks.listTasks.mockReturnValue(
      new Promise((resolve) => {
        resolveList = resolve;
      }),
    );
    const hydration = store.hydrateTasks();
    emitTask(createTask({ revision: 2, downloadedBytes: 50 }), true);
    resolveList([]);
    await hydration;
    vi.advanceTimersByTime(150);
    expect(store.tasksByInstallation["install-a"]?.downloadedBytes).toBe(50);
  });

  it("移除旧缓冲进度，避免刷新后重新出现已删除任务", async () => {
    emitTask(createTask(), true);
    mocks.listTasks.mockResolvedValue([]);
    await store.hydrateTasks();
    vi.advanceTimersByTime(150);
    expect(store.tasksByInstallation["install-a"]).toBeUndefined();
  });

  it("隐藏最新终态后仍展示更早的待恢复任务", async () => {
    emitTask(createTask({ state: "completed", revision: 2 }));
    store.stopListening();
    mocks.listTasks.mockResolvedValue([
      createTask({ state: "completed", revision: 2 }),
      createTask({ taskId: "older-task", state: "paused", updatedAt: "2026-11-01T00:00:00Z" }),
    ]);
    await store.hydrateTasks();
    expect(store.tasksByInstallation["install-a"]?.taskId).toBe("older-task");
  });

  it("仍会自动隐藏监听期间完成的任务", () => {
    emitTask(createTask({ state: "completed" }));
    vi.advanceTimersByTime(5000);
    expect(store.tasksByInstallation["install-a"]).toBeUndefined();
  });

  it("监听初始化部分失败时清理已注册的监听", async () => {
    store.stopListening();
    mocks.listen.mockRejectedValueOnce(new Error("state listen failed"));

    await expect(store.startListening()).rejects.toThrow("state listen failed");
    expect(mocks.listeners.size).toBe(0);
  });

  it("监听初始化失败后忽略已排队回调", async () => {
    store.stopListening();
    mocks.listen.mockRejectedValueOnce(new Error("state listen failed"));
    const callsBeforeStart = mocks.listen.mock.calls.length;
    await expect(store.startListening()).rejects.toThrow("state listen failed");
    const staleProgress = mocks.listen.mock.calls[callsBeforeStart + 1][1];
    staleProgress({
      event: "game-package://progress",
      id: 1,
      payload: createTask({ state: "paused" }),
    });
    expect(store.tasksByInstallation["install-a"]).toBeUndefined();
  });

  it("停止后立即重新启动不会复用旧初始化结果", async () => {
    store.stopListening();
    let resolveFirstListen: (unlisten: UnlistenFn) => void = () => {};
    const firstListen = new Promise<UnlistenFn>((resolve) => {
      resolveFirstListen = resolve;
    });
    mocks.listen.mockImplementationOnce(() => firstListen);

    const firstStart = store.startListening();
    await Promise.resolve();
    store.stopListening();

    const secondStart = store.startListening();
    await Promise.resolve();
    const listenCallsBeforeFirstResolve = mocks.listen.mock.calls.length;

    resolveFirstListen(() => {});
    await firstStart;
    await secondStart;
    expect(listenCallsBeforeFirstResolve).toBe(9);
    expect(mocks.listeners.size).toBe(3);
  });

  it("旧监听初始化完成后不会清空新一轮初始化Promise", async () => {
    store.stopListening();
    let resolveFirstListen: (unlisten: UnlistenFn) => void = () => {};
    const firstListen = new Promise<UnlistenFn>((resolve) => {
      resolveFirstListen = resolve;
    });
    mocks.listen.mockImplementationOnce(() => firstListen);

    const firstStart = store.startListening();
    await Promise.resolve();
    store.stopListening();

    let resolveSecondListen: (unlisten: UnlistenFn) => void = () => {};
    const secondListen = new Promise<UnlistenFn>((resolve) => {
      resolveSecondListen = resolve;
    });
    mocks.listen.mockImplementationOnce(() => secondListen);
    const secondStart = store.startListening();
    await Promise.resolve();
    const listenCallsBeforeFirstResolve = mocks.listen.mock.calls.length;

    resolveFirstListen(() => {});
    await firstStart;
    const thirdStart = store.startListening();
    await Promise.resolve();
    expect(mocks.listen).toHaveBeenCalledTimes(listenCallsBeforeFirstResolve);

    resolveSecondListen(() => {});
    await secondStart;
    await thirdStart;
  });

  it("停止后的迟到旧回调不会写入新生命周期投影", async () => {
    const oldStateListener = mocks.listeners.get("game-package://state");
    if (oldStateListener === undefined) throw new Error("旧任务监听未注册");

    store.stopListening();
    await store.startListening();
    const newStateListener = mocks.listeners.get("game-package://state");
    if (newStateListener === undefined) throw new Error("新任务监听未注册");

    oldStateListener({
      event: "game-package://state",
      id: 1,
      payload: createTask({ revision: 10 }),
    });
    expect(store.tasksByInstallation["install-a"]).toBeUndefined();

    newStateListener({
      event: "game-package://state",
      id: 2,
      payload: createTask({ revision: 11 }),
    });
    expect(store.tasksByInstallation["install-a"]?.revision).toBe(11);
  });
});
