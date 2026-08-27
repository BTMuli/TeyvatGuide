/**
 * 游戏资源页性能基线采集器。
 *
 * 记录页面发起的 IPC 调用、资源任务事件与投影替换频率，并汇总 Rust 侧
 * journal/缓存/spool 计数。模块加载后暴露 `window.TGPerf`，可在 devtools
 * 控制台于安装里程碑点执行 `TGPerf.dump()` 导出快照。
 * @since Beta v0.11.5
 */

import { invoke } from "@tauri-apps/api/core";

/** 单类计数的逐秒速率摘要。 */
export type PerfRateSummary = {
  /** 累计次数。 */
  total: number;
  /** 任意 1 秒窗口的最大次数（保留最近 1 小时）。 */
  maxPerSecond: number;
  /** 有事件的秒数。 */
  activeSeconds: number;
  /** 事件活跃期间的平均每秒次数。 */
  avgPerSecond: number;
};

/** 前端性能基线快照。 */
export type TGPerfSnapshot = {
  /** 快照生成时间。 */
  capturedAt: string;
  window: {
    /** 采集窗口开始时间。 */
    startedAt: string;
    /** 距模块加载的毫秒数。 */
    elapsedMs: number;
  };
  ipc: {
    total: number;
    byCommand: Record<string, number>;
    maxPerSecond: number;
    avgPerSecond: number;
  };
  events: {
    state: PerfRateSummary;
    progress: PerfRateSummary;
    verify: PerfRateSummary;
  };
  projection: {
    flushes: PerfRateSummary;
    flushReplaces: PerfRateSummary;
    stateReplaces: PerfRateSummary;
    hydrates: PerfRateSummary;
    droppedProgress: PerfRateSummary;
    replaces: PerfRateSummary;
  };
  /** Rust 侧 journal/缓存/spool 计数，读取失败时为 null。 */
  rust: Record<string, number> | null;
};

/** 一次里程碑快照记录。 */
export type TGMilestoneRecord = {
  /** 里程碑键，如 `m1`、`m5`。 */
  key: string;
  /** 里程碑说明。 */
  label: string;
  /** 记录时间。 */
  capturedAt: string;
  /** 该时点的完整快照。 */
  snapshot: TGPerfSnapshot;
};

/** `window.TGPerf` 暴露的采集 API。 */
export type TGPerfApi = {
  snapshot(): TGPerfSnapshot;
  reset(): Promise<void>;
  dump(): Promise<TGPerfSnapshot>;
  milestone(key: string, label?: string): Promise<TGMilestoneRecord>;
  dumpAll(): Promise<Array<TGMilestoneRecord>>;
};

/** 采集控制器：记录函数与窗口导出。 */
export type TGPerfController = TGPerfApi & {
  recordIpc(command: string): void;
  recordEvent(kind: "state" | "progress" | "verify"): void;
  recordFlush(): void;
  recordFlushReplace(): void;
  recordStateReplace(): void;
  recordHydrate(): void;
  recordProgressDropped(): void;
  recordTaskState(task: TGApp.Game.Package.TaskSummary): void;
  recordTaskProgress(task: TGApp.Game.Package.TaskSummary): void;
  recordCacheStatusRead(): void;
  recordCacheClear(): void;
};

/** 按 1 秒分桶的速率跟踪器。 */
class PerfRateTracker {
  private readonly buckets: Array<number>;
  private readonly bucketCount: number;
  private bucketIndex = 0;
  private bucketStartedAt = 0;
  private readonly bucketSize = 1000;
  total = 0;

  constructor(bucketCount = 3600) {
    this.bucketCount = bucketCount;
    this.buckets = new Array<number>(bucketCount).fill(0);
  }

  record(now = performance.now()): void {
    this.advance(now);
    this.buckets[this.bucketIndex] += 1;
    this.total += 1;
  }

  summary(): PerfRateSummary {
    const now = performance.now();
    this.advance(now);
    let maxPerSecond = 0;
    let activeSeconds = 0;
    for (const value of this.buckets) {
      if (value === 0) continue;
      activeSeconds += 1;
      if (value > maxPerSecond) maxPerSecond = value;
    }
    return {
      total: this.total,
      maxPerSecond,
      activeSeconds,
      avgPerSecond: activeSeconds > 0 ? this.total / activeSeconds : 0,
    };
  }

  reset(): void {
    this.total = 0;
    this.bucketIndex = 0;
    this.bucketStartedAt = 0;
    this.buckets.fill(0);
  }

  private advance(now: number): void {
    if (this.bucketStartedAt === 0) {
      this.bucketStartedAt = now;
      return;
    }
    const elapsed = now - this.bucketStartedAt;
    if (elapsed < this.bucketSize) return;
    const steps = Math.min(Math.floor(elapsed / this.bucketSize), this.bucketCount);
    for (let index = 0; index < steps; index += 1) {
      this.bucketIndex = (this.bucketIndex + 1) % this.bucketCount;
      this.buckets[this.bucketIndex] = 0;
    }
    this.bucketStartedAt += steps * this.bucketSize;
  }
}

let startedAt = new Date();
const ipcByCommand: Record<string, number> = {};
const ipcRates = new PerfRateTracker();
const eventTrackers: Record<"state" | "progress" | "verify", PerfRateTracker> = {
  state: new PerfRateTracker(),
  progress: new PerfRateTracker(),
  verify: new PerfRateTracker(),
};
const projectionTrackers = {
  flushes: new PerfRateTracker(),
  flushReplaces: new PerfRateTracker(),
  stateReplaces: new PerfRateTracker(),
  hydrates: new PerfRateTracker(),
  droppedProgress: new PerfRateTracker(),
  replaces: new PerfRateTracker(),
};
let milestones: Array<TGMilestoneRecord> = [];
const taskStates = new Map<string, string>();
const capturedPhases = new Set<string>();
const pendingCaptures = new Set<Promise<unknown>>();

const milestoneLabels: Record<string, string> = {
  m0: "M0 安装前页面就绪",
  m1: "M1 开始下载",
  m2: "M2 下载约 30%",
  m3: "M3 进入装配",
  m4: "M4 提交/校验",
  m5: "M5 安装完成",
  m6: "M6 缓存状态读取",
  m7: "M7 缓存清理",
};

function milestonePhaseFor(state: string): string | null {
  switch (state) {
    case "downloading":
      return "m1";
    case "assembling":
      return "m3";
    case "committing":
    case "verifying":
      return "m4";
    case "completed":
      return "m5";
    default:
      return null;
  }
}

function isInstallTask(task: TGApp.Game.Package.TaskSummary): boolean {
  return task.target === "install";
}

function buildSnapshot(rust: Record<string, number> | null): TGPerfSnapshot {
  return {
    capturedAt: new Date().toISOString(),
    window: {
      startedAt: startedAt.toISOString(),
      elapsedMs: Math.round(performance.now()),
    },
    ipc: {
      total: ipcRates.total,
      byCommand: { ...ipcByCommand },
      maxPerSecond: ipcRates.summary().maxPerSecond,
      avgPerSecond: ipcRates.summary().avgPerSecond,
    },
    events: {
      state: eventTrackers.state.summary(),
      progress: eventTrackers.progress.summary(),
      verify: eventTrackers.verify.summary(),
    },
    projection: {
      flushes: projectionTrackers.flushes.summary(),
      flushReplaces: projectionTrackers.flushReplaces.summary(),
      stateReplaces: projectionTrackers.stateReplaces.summary(),
      hydrates: projectionTrackers.hydrates.summary(),
      droppedProgress: projectionTrackers.droppedProgress.summary(),
      replaces: projectionTrackers.replaces.summary(),
    },
    rust,
  };
}

function recordIpc(command: string): void {
  ipcByCommand[command] = (ipcByCommand[command] ?? 0) + 1;
  ipcRates.record();
}

function recordEvent(kind: "state" | "progress" | "verify"): void {
  eventTrackers[kind].record();
}

function recordFlush(): void {
  projectionTrackers.flushes.record();
}

function recordFlushReplace(): void {
  projectionTrackers.flushReplaces.record();
  projectionTrackers.replaces.record();
}

function recordStateReplace(): void {
  projectionTrackers.stateReplaces.record();
  projectionTrackers.replaces.record();
}

function recordHydrate(): void {
  projectionTrackers.hydrates.record();
  projectionTrackers.replaces.record();
}

function recordProgressDropped(): void {
  projectionTrackers.droppedProgress.record();
}

async function captureMilestone(
  key: string,
  label = milestoneLabels[key] ?? key,
): Promise<TGMilestoneRecord> {
  const capture = (async (): Promise<TGMilestoneRecord> => {
    let rust: Record<string, number> | null = null;
    try {
      rust = await invoke<Record<string, number>>("game_perf_snapshot");
    } catch (error) {
      console.warn("[TGPerf] 读取 Rust 计数器失败", error);
    }
    const record: TGMilestoneRecord = {
      key,
      label,
      capturedAt: new Date().toISOString(),
      snapshot: buildSnapshot(rust),
    };
    milestones.push(record);
    console.log(`[TGPerf] 已记录里程碑 ${label}`, record.snapshot);
    return record;
  })();
  pendingCaptures.add(capture);
  try {
    return await capture;
  } finally {
    pendingCaptures.delete(capture);
  }
}

function recordTaskState(task: TGApp.Game.Package.TaskSummary): void {
  if (!isInstallTask(task)) return;
  const taskKey = `${task.installationId}:${task.taskId}`;
  const previous = taskStates.get(taskKey);
  taskStates.set(taskKey, task.state);
  if (previous === task.state) return;
  const phase = milestonePhaseFor(task.state);
  if (phase === null || capturedPhases.has(phase)) return;
  capturedPhases.add(phase);
  void captureMilestone(phase);
}

function recordTaskProgress(task: TGApp.Game.Package.TaskSummary): void {
  if (!isInstallTask(task) || capturedPhases.has("m2") || task.totalBytes <= 0) return;
  if (task.downloadedBytes / task.totalBytes < 0.3) return;
  capturedPhases.add("m2");
  void captureMilestone("m2");
}

function recordCacheStatusRead(): void {
  void captureMilestone("m6");
}

function recordCacheClear(): void {
  void captureMilestone("m7");
}

async function resetCounters(): Promise<void> {
  startedAt = new Date();
  milestones = [];
  taskStates.clear();
  capturedPhases.clear();
  ipcByCommandCleanup();
  ipcRates.reset();
  for (const tracker of Object.values(eventTrackers)) tracker.reset();
  for (const tracker of Object.values(projectionTrackers)) tracker.reset();
  try {
    await invoke("game_perf_reset");
  } catch (error) {
    console.warn("[TGPerf] 重置 Rust 计数器失败", error);
  }
}

function ipcByCommandCleanup(): void {
  for (const command of Object.keys(ipcByCommand)) delete ipcByCommand[command];
}

async function dumpSnapshot(): Promise<TGPerfSnapshot> {
  let rust: Record<string, number> | null = null;
  try {
    rust = await invoke<Record<string, number>>("game_perf_snapshot");
  } catch (error) {
    console.warn("[TGPerf] 读取 Rust 计数器失败", error);
  }
  const snapshot = buildSnapshot(rust);
  console.log("[TGPerf] 基线快照", snapshot);
  console.table(snapshot.ipc.byCommand);
  try {
    await navigator.clipboard.writeText(JSON.stringify(snapshot, null, 2));
    console.log("[TGPerf] 快照已复制到剪贴板");
  } catch {
    console.log(`[TGPerf] 剪贴板不可用，JSON：\n${JSON.stringify(snapshot, null, 2)}`);
  }
  return snapshot;
}

async function dumpMilestones(): Promise<Array<TGMilestoneRecord>> {
  await Promise.allSettled([...pendingCaptures]);
  const records = [...milestones].sort((left, right) =>
    left.capturedAt.localeCompare(right.capturedAt),
  );
  console.log(`[TGPerf] 里程碑记录 ${records.length} 条`, records);
  try {
    const exportedPath = await invoke<string>("game_perf_export", {
      contents: JSON.stringify(records, null, 2),
    });
    console.log(`[TGPerf] 已导出到 ${exportedPath}`);
  } catch (error) {
    console.warn("[TGPerf] 导出性能基线文件失败", error);
  }
  try {
    await navigator.clipboard.writeText(JSON.stringify(records, null, 2));
    console.log("[TGPerf] 全部里程碑已复制到剪贴板");
  } catch {
    console.log(`[TGPerf] 剪贴板不可用，JSON：\n${JSON.stringify(records, null, 2)}`);
  }
  return records;
}

export const TGPerf: TGPerfController = {
  recordIpc,
  recordEvent,
  recordFlush,
  recordFlushReplace,
  recordStateReplace,
  recordHydrate,
  recordProgressDropped,
  recordTaskState,
  recordTaskProgress,
  recordCacheStatusRead,
  recordCacheClear,
  snapshot: () => buildSnapshot(null),
  reset: resetCounters,
  dump: dumpSnapshot,
  milestone: captureMilestone,
  dumpAll: dumpMilestones,
};

type TGPerfWindow = Window & { TGPerf?: TGPerfApi };

(<TGPerfWindow>window).TGPerf = TGPerf;
