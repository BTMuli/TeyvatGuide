<!-- 资源任务列表浮层：扫描、筛选与清除磁盘任务记录 -->
<template>
  <TopOverlay
    v-model="visible"
    :titleId
    closeAriaLabel="关闭任务列表"
    contentMaxHeight="min(560px, calc(100vh - 200px))"
    panelMaxHeight="calc(100vh - 96px)"
    panelWidth="720px"
    :showShare="false"
    topOffset="64px"
  >
    <template #header>
      <div class="task-history-heading">
        <div aria-hidden="true" class="task-history-heading-icon">
          <v-icon icon="mdi-clipboard-text-clock-outline" size="24" />
        </div>
        <div class="task-history-heading-copy">
          <div class="task-history-heading-title">
            <h2 :id="titleId">任务列表</h2>
            <p>查看任务目录中的全部游戏资源任务</p>
          </div>
          <div v-if="records.length > 0" class="task-history-filter">
            <v-btn-toggle
              v-model="selectedFilter"
              :mandatory="true"
              aria-label="按任务状态筛选"
              class="task-history-toggle"
              color="var(--tgc-od-orange)"
              density="compact"
              variant="outlined"
            >
              <v-btn
                v-for="option in taskFilterOptions"
                :key="option.value"
                :aria-label="`${option.label}任务 ${option.count} 条`"
                size="small"
                :value="option.value"
              >
                {{ option.label }}
                <span class="task-history-filter-count">{{ option.count }}</span>
              </v-btn>
            </v-btn-toggle>
          </div>
        </div>
      </div>
    </template>

    <template #actions>
      <v-btn
        :disabled="clearingAll || removingAny"
        :loading="loading"
        aria-label="刷新任务列表"
        density="comfortable"
        icon="mdi-refresh"
        title="刷新任务列表"
        variant="text"
        @click="loadTasks"
      />
      <v-btn
        :loading="openingTaskDir"
        aria-label="打开任务目录"
        density="comfortable"
        icon="mdi-folder-open"
        title="打开任务目录"
        variant="text"
        @click="openTaskDirectory"
      />
      <v-btn
        aria-label="关闭任务列表"
        density="comfortable"
        icon="mdi-close"
        title="关闭任务列表"
        variant="text"
        @click="closeOverlay"
      />
    </template>

    <div v-if="loading && records.length === 0" class="task-history-state" role="status">
      <v-progress-circular indeterminate size="28" width="3" />
      <strong>正在扫描任务目录…</strong>
      <span>正在读取任务目录中的全部条目</span>
    </div>

    <div v-else-if="loadError !== null && records.length === 0" class="task-history-state">
      <v-icon color="error" icon="mdi-alert-circle-outline" size="32" />
      <strong>任务列表读取失败</strong>
      <span role="alert">{{ loadError }}</span>
      <v-btn prepend-icon="mdi-refresh" size="small" variant="tonal" @click="loadTasks">
        重新加载
      </v-btn>
    </div>

    <div v-else-if="records.length === 0" class="task-history-state">
      <v-icon icon="mdi-clipboard-text-clock-outline" size="36" />
      <strong>任务目录中没有任务</strong>
      <span>开始下载、更新或安装后，任务记录会显示在这里</span>
    </div>

    <template v-else>
      <div
        v-if="filteredRecords.length === 0"
        class="task-history-state task-history-state-filtered"
      >
        <v-icon icon="mdi-filter-off-outline" size="32" />
        <strong>没有{{ selectedFilterLabel }}任务</strong>
        <span>可以切换状态查看其他任务记录</span>
      </div>

      <div v-else class="task-history-list" aria-label="资源任务列表" role="list">
        <article
          v-for="record in filteredRecords"
          :key="record.taskId"
          class="task-history-item"
          role="listitem"
        >
          <div class="task-history-item-main">
            <div aria-hidden="true" class="task-history-item-icon">
              <v-icon :icon="recordIcon(record)" size="22" />
            </div>
            <div class="task-history-item-copy">
              <div class="task-history-item-title">
                <strong>{{ recordTitle(record) }}</strong>
                <v-chip :color="recordStatusColor(record)" size="x-small" variant="tonal">
                  {{ recordStatus(record) }}
                </v-chip>
              </div>
              <template v-if="record.task !== null">
                <span
                  v-if="record.task.target === gameEnum.package.planTarget.AUDIO"
                  class="task-history-audio-target"
                >
                  <PgAudioLangTags
                    size="x-small"
                    :sourceLanguages="record.task.sourceAudioLanguages"
                    :targetLanguages="record.task.targetAudioLanguages"
                  />
                  <span class="task-history-item-target">{{ record.task.targetTag }}</span>
                </span>
                <span v-else class="task-history-item-target">
                  {{ taskTarget(record.task) }}
                </span>
              </template>
              <span v-else class="task-history-item-target">任务 ID · {{ record.taskId }}</span>
            </div>
            <v-btn
              v-if="recordCanRemove(record)"
              :aria-label="`清除${recordTitle(record)}记录`"
              :disabled="clearingAll || loading"
              :loading="taskRemoving(record.taskId)"
              class="task-history-remove"
              color="error"
              density="comfortable"
              icon="mdi-delete-outline"
              :title="`清除${recordTitle(record)}记录`"
              variant="text"
              @click="handleRemoveRecord(record)"
            />
          </div>

          <div class="task-history-facts">
            <span v-for="fact in recordFacts(record)" :key="fact.text" class="task-history-fact">
              <v-icon :icon="fact.icon" size="14" />
              <span>{{ fact.text }}</span>
            </span>
          </div>

          <p v-if="recordError(record) !== null" class="task-history-error">
            <v-icon icon="mdi-alert-outline" size="16" />
            <span>{{ recordError(record) }}</span>
          </p>
        </article>
      </div>
    </template>

    <p
      v-if="loadError !== null && records.length > 0"
      class="task-history-inline-error"
      role="alert"
    >
      <v-icon icon="mdi-alert-circle-outline" size="16" />
      <span>刷新失败，当前仍显示上次扫描的记录：{{ loadError }}</span>
    </p>

    <template #footer>
      <span class="task-history-footer-hint">
        扫描任务目录全部条目；清除记录不会影响游戏文件或共享缓存
      </span>
      <div class="task-history-actions">
        <v-btn variant="text" @click="closeOverlay">关闭</v-btn>
        <v-btn
          :disabled="terminalTasks.length === 0 || loading || removingAny"
          :loading="clearingAll"
          color="error"
          prepend-icon="mdi-delete-sweep-outline"
          variant="tonal"
          @click="handleClearAll"
        >
          清除已结束
        </v-btn>
      </div>
    </template>
  </TopOverlay>
</template>

<script lang="ts" setup>
import TopOverlay from "@comp/app/top-overlay.vue";
import showDialog from "@comp/func/dialog.js";
import showSnackbar from "@comp/func/snackbar.js";
import gameEnum from "@enum/game.js";
import useGameLauncherStore from "@store/gameLauncher.js";
import { path } from "@tauri-apps/api";
import { exists } from "@tauri-apps/plugin-fs";
import { openPath } from "@tauri-apps/plugin-opener";
import fmtUtil from "@utils/fmtUtil.js";
import { listGamePackageTaskRecords } from "@utils/TGGameLauncher.js";
import { computed, ref, useId, watch } from "vue";

import PgAudioLangTags from "./pg-audio-lang-tags.vue";

const visible = defineModel<boolean>({ required: true });
const taskStore = useGameLauncherStore();
const titleId = useId();
const TaskFilter = <const>{
  COMPLETED: "completed",
  PENDING: "pending",
  ABNORMAL: "abnormal",
  ALL: "all",
};
type TaskFilterEnum = (typeof TaskFilter)[keyof typeof TaskFilter];
type TaskFilterOption = {
  value: TaskFilterEnum;
  label: string;
  count: number;
};
const records = ref<Array<TGApp.Game.Package.TaskRecord>>([]);
const selectedFilter = ref<TaskFilterEnum>(TaskFilter.COMPLETED);
const loading = ref<boolean>(false);
const loadError = ref<string | null>(null);
const openingTaskDir = ref<boolean>(false);
let requestSequence = 0;

const clearingAll = computed<boolean>(() => taskStore.pendingActions["task-cleanup"] === true);
const removingAny = computed<boolean>(() => {
  return Object.entries(taskStore.pendingActions).some(
    ([key, pending]) => key.startsWith("task-history-remove:") && pending,
  );
});
const terminalTasks = computed<Array<TGApp.Game.Package.TaskSummary>>(() => {
  return records.value.flatMap((record) => {
    return record.task !== null && isTerminalTask(record.task) ? [record.task] : [];
  });
});
const taskFilterOptions = computed<Array<TaskFilterOption>>(() => {
  const completedCount = records.value.filter(
    (record) => record.task?.state === gameEnum.package.taskState.COMPLETED,
  ).length;
  const pendingCount = records.value.filter(
    (record) => record.task !== null && !isTerminalTask(record.task),
  ).length;
  const abnormalCount = records.value.filter(isAbnormalRecord).length;
  return [
    { value: TaskFilter.COMPLETED, label: "已完成", count: completedCount },
    { value: TaskFilter.PENDING, label: "未完成", count: pendingCount },
    { value: TaskFilter.ABNORMAL, label: "失败/已取消/异常", count: abnormalCount },
    { value: TaskFilter.ALL, label: "全部", count: records.value.length },
  ];
});
const selectedFilterLabel = computed<string>(() => {
  return (
    taskFilterOptions.value.find((option) => option.value === selectedFilter.value)?.label ?? ""
  );
});
const filteredRecords = computed<Array<TGApp.Game.Package.TaskRecord>>(() => {
  return records.value.filter((record) => recordMatchesFilter(record, selectedFilter.value));
});

function isTerminalTask(task: TGApp.Game.Package.TaskSummary): boolean {
  return (
    task.state === gameEnum.package.taskState.COMPLETED ||
    task.state === gameEnum.package.taskState.FAILED ||
    task.state === gameEnum.package.taskState.CANCELED
  );
}

function isAbnormalRecord(record: TGApp.Game.Package.TaskRecord): boolean {
  return (
    record.kind === gameEnum.package.taskRecordKind.INVALID ||
    record.task?.state === gameEnum.package.taskState.FAILED ||
    record.task?.state === gameEnum.package.taskState.CANCELED
  );
}

function recordMatchesFilter(
  record: TGApp.Game.Package.TaskRecord,
  filter: TaskFilterEnum,
): boolean {
  switch (filter) {
    case TaskFilter.COMPLETED:
      return record.task?.state === gameEnum.package.taskState.COMPLETED;
    case TaskFilter.PENDING:
      return record.task !== null && !isTerminalTask(record.task);
    case TaskFilter.ABNORMAL:
      return isAbnormalRecord(record);
    case TaskFilter.ALL:
      return true;
  }
}

function recordTitle(record: TGApp.Game.Package.TaskRecord): string {
  if (record.task !== null) return taskType(record.task);
  return "异常任务记录";
}

function recordIcon(record: TGApp.Game.Package.TaskRecord): string {
  if (record.task !== null) return taskIcon(record.task);
  return "mdi-file-alert-outline";
}

function recordStatus(record: TGApp.Game.Package.TaskRecord): string {
  if (record.task !== null) return gameEnum.package.taskStateDesc(record.task.state);
  return "异常";
}

function recordStatusColor(record: TGApp.Game.Package.TaskRecord): string | undefined {
  if (record.task !== null) return taskStatusColor(record.task.state);
  return "error";
}

function recordCanRemove(record: TGApp.Game.Package.TaskRecord): boolean {
  return record.task !== null && isTerminalTask(record.task);
}

function taskType(task: TGApp.Game.Package.TaskSummary): string {
  switch (task.target) {
    case gameEnum.package.planTarget.INSTALL:
      return "游戏安装";
    case gameEnum.package.planTarget.MAIN:
      return task.sourceTag === task.targetTag ? "完整性修复" : "游戏更新";
    case gameEnum.package.planTarget.PRE_DOWNLOAD:
      return "预下载";
    case gameEnum.package.planTarget.AUDIO:
      return "语音包";
    case gameEnum.package.planTarget.SWITCH:
      return "换服";
  }
}

function taskIcon(task: TGApp.Game.Package.TaskSummary): string {
  switch (task.target) {
    case gameEnum.package.planTarget.INSTALL:
      return "mdi-download-box-outline";
    case gameEnum.package.planTarget.MAIN:
      return task.sourceTag === task.targetTag ? "mdi-tools" : "mdi-update";
    case gameEnum.package.planTarget.PRE_DOWNLOAD:
      return "mdi-cloud-download-outline";
    case gameEnum.package.planTarget.AUDIO:
      return "mdi-volume-high";
    case gameEnum.package.planTarget.SWITCH:
      return "mdi-swap-horizontal";
  }
}

function taskTarget(task: TGApp.Game.Package.TaskSummary): string {
  if (task.target === gameEnum.package.planTarget.SWITCH) {
    return `${gameEnum.installation.schemeDesc(task.sourceScheme)} → ${gameEnum.installation.schemeDesc(task.targetScheme)}`;
  }
  if (task.target === gameEnum.package.planTarget.INSTALL) {
    return `${gameEnum.installation.schemeDesc(task.targetScheme)} · ${task.targetTag}`;
  }
  if (task.sourceTag === null || task.sourceTag === task.targetTag) return task.targetTag;
  return `${task.sourceTag} → ${task.targetTag}`;
}

function taskStatusColor(state: TGApp.Game.Package.TaskStateEnum): string | undefined {
  if (state === gameEnum.package.taskState.COMPLETED) return "success";
  if (state === gameEnum.package.taskState.FAILED) return "error";
  return undefined;
}

function formatDuration(elapsedMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
  if (totalSeconds === 0) return "不足 1 秒";
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const parts: Array<string> = [];
  if (days > 0) parts.push(`${days} 天`);
  if (hours > 0) parts.push(`${hours} 小时`);
  if (minutes > 0) parts.push(`${minutes} 分钟`);
  if (parts.length === 0) parts.push(`${seconds} 秒`);
  return parts.slice(0, 2).join(" ");
}

function formatUpdatedAt(updatedAt: string): string {
  const timestamp = Date.parse(updatedAt);
  return Number.isFinite(timestamp) ? fmtUtil.dateTime(timestamp) : "时间未知";
}

type TaskHistoryFact = {
  icon: string;
  text: string;
};

function taskFacts(task: TGApp.Game.Package.TaskSummary): Array<TaskHistoryFact> {
  const facts = [
    { icon: "mdi-calendar-clock-outline", text: formatUpdatedAt(task.updatedAt) },
    { icon: "mdi-timer-outline", text: formatDuration(task.elapsedMs) },
  ];
  if (task.totalBytes > 0 || task.downloadedBytes > 0) {
    facts.push({
      icon: "mdi-download-outline",
      text: `${fmtUtil.size(task.downloadedBytes)} / ${fmtUtil.size(task.totalBytes)}`,
    });
  }
  if (task.totalCount > 0) {
    facts.push({
      icon: "mdi-file-multiple-outline",
      text: `${task.completedCount} / ${task.totalCount}`,
    });
  }
  return facts;
}

function recordFacts(record: TGApp.Game.Package.TaskRecord): Array<TaskHistoryFact> {
  if (record.task !== null) return taskFacts(record.task);
  const facts = [{ icon: "mdi-calendar-clock-outline", text: formatUpdatedAt(record.updatedAt) }];
  if (record.planBytes > 0) {
    facts.push({ icon: "mdi-file-outline", text: `plan.json · ${fmtUtil.size(record.planBytes)}` });
  }
  return facts;
}

function recordError(record: TGApp.Game.Package.TaskRecord): string | null {
  return record.task?.errorMessage ?? record.issueMessage;
}

function taskRemoving(taskId: string): boolean {
  return taskStore.pendingActions[`task-history-remove:${taskId}`] === true;
}

function removeTaskItems(taskIds: Array<string>): void {
  if (taskIds.length === 0) return;
  const removedIds = new Set(taskIds);
  records.value = records.value.filter((record) => !removedIds.has(record.taskId));
}

async function loadTasks(): Promise<void> {
  if (loading.value || clearingAll.value || removingAny.value) return;
  const sequence = ++requestSequence;
  loading.value = true;
  loadError.value = null;
  try {
    const taskRecords = await listGamePackageTaskRecords();
    if (!visible.value || sequence !== requestSequence) return;
    records.value = taskRecords
      .filter((record) => record.kind !== gameEnum.package.taskRecordKind.PLAN_ONLY)
      .toSorted((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  } catch (error) {
    if (!visible.value || sequence !== requestSequence) return;
    loadError.value = error instanceof Error ? error.message : String(error);
    showSnackbar.error("读取任务列表失败，请稍后重试");
  } finally {
    if (sequence === requestSequence) loading.value = false;
  }
}

async function handleRemoveRecord(record: TGApp.Game.Package.TaskRecord): Promise<void> {
  if (!recordCanRemove(record) || clearingAll.value || taskRemoving(record.taskId)) return;
  const confirmed = await showDialog.checkF({
    title: "清除任务记录？",
    text: `将清除“${recordTitle(record)}”记录，不会删除游戏文件或共享缓存。`,
    confirmLabel: "清除记录",
    cancelLabel: "取消",
  });
  if (confirmed !== true) return;
  try {
    const summary = await taskStore.removeTaskHistory(record.taskId);
    removeTaskItems(summary.removedTaskIds);
    if (summary.removedCount === 0) {
      showSnackbar.info("记录已不存在或已被清理");
      await loadTasks();
      return;
    }
    showSnackbar.success(
      `已清除 ${summary.removedCount} 条任务记录，释放 ${fmtUtil.size(summary.removedBytes)}`,
    );
  } catch (error) {
    showSnackbar.error(`清除任务记录失败：${error}`);
  }
}

async function handleClearAll(): Promise<void> {
  if (terminalTasks.value.length === 0 || loading.value || clearingAll.value || removingAny.value) {
    return;
  }
  const confirmed = await showDialog.checkF({
    title: "清除已结束任务记录？",
    text: `将清除全部已结束任务记录（当前 ${terminalTasks.value.length} 条），不会删除游戏文件或共享缓存。`,
    confirmLabel: "清除已结束",
    cancelLabel: "取消",
  });
  if (confirmed !== true) return;
  try {
    const summary = await taskStore.cleanupTasks();
    removeTaskItems(summary.removedTaskIds);
    if (summary.removedCount === 0) {
      showSnackbar.info("没有可清除的已结束任务");
      await loadTasks();
      return;
    }
    showSnackbar.success(
      `已清除 ${summary.removedCount} 条任务记录，释放 ${fmtUtil.size(summary.removedBytes)}`,
    );
  } catch (error) {
    showSnackbar.error(`清除全部任务记录失败：${error}`);
  }
}

async function openTaskDirectory(): Promise<void> {
  if (openingTaskDir.value) return;
  openingTaskDir.value = true;
  try {
    const taskDir = await path.join(await path.appDataDir(), "game-tasks");
    if (!(await exists(taskDir))) {
      showSnackbar.warn("任务目录尚不存在");
      return;
    }
    await openPath(taskDir);
  } catch (error) {
    showSnackbar.error(`打开任务目录失败：${error}`);
  } finally {
    openingTaskDir.value = false;
  }
}

function closeOverlay(): void {
  visible.value = false;
}

watch(
  visible,
  (open) => {
    requestSequence += 1;
    if (!open) {
      loading.value = false;
      loadError.value = null;
      return;
    }
    selectedFilter.value = TaskFilter.COMPLETED;
    void loadTasks();
  },
  { immediate: true },
);
</script>

<style lang="scss" scoped>
.task-history-heading {
  display: flex;
  overflow: hidden;
  width: 100%;
  min-width: 0;
  align-items: center;
  gap: 12px;
}

.task-history-heading-icon,
.task-history-item-icon {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--common-shadow-1);
  background: var(--box-bg-2);
  color: var(--box-text-2);
}

.task-history-heading-icon {
  width: 44px;
  height: 44px;
  border-radius: 8px;
}

.task-history-heading-copy,
.task-history-item-copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
}

.task-history-heading-copy {
  overflow: hidden;
  gap: 8px;

  .task-history-heading-title {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  h2,
  p {
    margin: 0;
  }

  h2 {
    color: var(--common-text-title);
    font-family: var(--font-title);
    font-size: 20px;
    font-weight: normal;
    line-height: 26px;
  }

  p {
    color: var(--box-text-2);
    font-size: 12px;
    line-height: 16px;
  }
}

.task-history-state {
  display: flex;
  min-height: 240px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--box-text-2);
  gap: 8px;
  text-align: center;

  strong {
    color: var(--common-text-title);
    font-size: 16px;
    line-height: 22px;
  }

  span {
    max-width: 480px;
    font-size: 12px;
    line-height: 18px;
    overflow-wrap: anywhere;
  }
}

.task-history-state-filtered {
  min-height: 200px;
}

.task-history-filter {
  max-width: 100%;
  overflow-x: auto;
}

.task-history-toggle {
  min-width: max-content;
  border-radius: 4px;
}

.task-history-filter-count {
  min-width: 18px;
  padding: 0 4px;
  border-radius: 2px;
  background: var(--box-bg-2);
  color: var(--box-text-2);
  font-size: 10px;
  line-height: 16px;
  text-align: center;
}

.task-history-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.task-history-item {
  display: flex;
  flex-direction: column;
  padding: 16px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--box-bg-1);
  color: var(--box-text-4);
  gap: 12px;
}

.task-history-item-main {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 12px;
}

.task-history-item-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
}

.task-history-item-copy {
  gap: 2px;
}

.task-history-item-title {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;

  strong {
    color: var(--common-text-title);
    font-size: 15px;
    line-height: 20px;
  }
}

.task-history-item-target {
  color: var(--box-text-4);
  font-size: 11px;
  line-height: 16px;
  overflow-wrap: anywhere;
}

.task-history-audio-target {
  display: flex;
  overflow: hidden;
  min-width: 0;
  flex-wrap: nowrap;
  align-items: center;
  gap: 6px;

  .task-history-item-target {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.task-history-remove {
  flex-shrink: 0;
  border-radius: 4px;
}

.task-history-error,
.task-history-inline-error {
  display: flex;
  margin: 0;
  color: var(--tgc-od-red);
  font-size: 12px;
  gap: 8px;
  line-height: 18px;

  .v-icon {
    flex-shrink: 0;
    margin-top: 1px;
  }

  span {
    overflow-wrap: anywhere;
  }
}

.task-history-error {
  max-height: 72px;
  padding: 8px 12px;
  border-radius: 4px;
  background: var(--common-shadow-t-2);
  overflow-y: auto;
}

.task-history-inline-error {
  align-items: center;
  padding: 8px 12px;
  border-radius: 4px;
  background: var(--common-shadow-t-2);
}

.task-history-facts {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;

  .task-history-fact {
    display: inline-flex;
    align-items: center;
    padding: 4px 8px;
    border-radius: 4px;
    background: var(--box-bg-2);
    color: var(--box-text-2);
    font-size: 12px;
    gap: 5px;
    line-height: 16px;

    .v-icon {
      flex-shrink: 0;
    }
  }
}

.task-history-footer-hint {
  min-width: 0;
  color: var(--box-text-2);
  font-size: 12px;
  line-height: 16px;
}

.task-history-actions {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 8px;

  .v-btn {
    border-radius: 4px;
  }
}

@media (width <= 720px) {
  .task-history-item {
    padding: 12px;
  }

  .task-history-facts {
    flex-direction: column;

    span {
      width: 100%;
    }
  }

  .task-history-footer-hint {
    display: none;
  }

  .task-history-actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
