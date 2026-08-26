<!-- 资源任务历史浮层：查看与清除最近 7 天已结束任务 -->
<template>
  <TopOverlay
    v-model="visible"
    :titleId
    closeAriaLabel="关闭任务历史"
    contentMaxHeight="min(560px, calc(100vh - 200px))"
    panelMaxHeight="calc(100vh - 96px)"
    panelWidth="720px"
    :showShare="false"
    topOffset="64px"
  >
    <template #header>
      <div class="task-history-heading">
        <div aria-hidden="true" class="task-history-heading-icon">
          <v-icon icon="mdi-history" size="24" />
        </div>
        <div class="task-history-heading-copy">
          <h2 :id="titleId">任务历史</h2>
          <p>查看最近 7 天已结束的游戏资源任务</p>
        </div>
      </div>
    </template>

    <template #actions>
      <v-btn
        :disabled="clearingAll || removingAny"
        :loading="loading"
        aria-label="刷新任务历史"
        density="comfortable"
        icon="mdi-refresh"
        title="刷新任务历史"
        variant="text"
        @click="loadHistory"
      />
      <v-btn
        aria-label="关闭任务历史"
        density="comfortable"
        icon="mdi-close"
        title="关闭任务历史"
        variant="text"
        @click="closeOverlay"
      />
    </template>

    <div v-if="loading && history.length === 0" class="task-history-state" role="status">
      <v-progress-circular indeterminate size="28" width="3" />
      <strong>正在读取任务历史…</strong>
      <span>任务记录只保留最近 7 天</span>
    </div>

    <div v-else-if="loadError !== null && history.length === 0" class="task-history-state">
      <v-icon color="error" icon="mdi-alert-circle-outline" size="32" />
      <strong>任务历史读取失败</strong>
      <span role="alert">{{ loadError }}</span>
      <v-btn prepend-icon="mdi-refresh" size="small" variant="tonal" @click="loadHistory">
        重新加载
      </v-btn>
    </div>

    <div v-else-if="history.length === 0" class="task-history-state">
      <v-icon icon="mdi-history" size="36" />
      <strong>最近 7 天没有已结束任务</strong>
      <span>完成、失败或取消的资源任务会显示在这里</span>
    </div>

    <div v-else class="task-history-list" aria-label="已结束任务列表" role="list">
      <article v-for="task in history" :key="task.taskId" class="task-history-item" role="listitem">
        <div class="task-history-item-main">
          <div aria-hidden="true" class="task-history-item-icon">
            <v-icon :icon="taskIcon(task)" size="22" />
          </div>
          <div class="task-history-item-copy">
            <div class="task-history-item-title">
              <strong>{{ taskType(task) }}</strong>
              <v-chip :color="taskStatusColor(task.state)" size="x-small" variant="tonal">
                {{ gameEnum.package.taskStateDesc(task.state) }}
              </v-chip>
            </div>
            <span
              v-if="task.target === gameEnum.package.planTarget.AUDIO"
              class="task-history-audio-target"
            >
              <PgAudioLangTags
                size="x-small"
                :sourceLanguages="task.sourceAudioLanguages"
                :targetLanguages="task.targetAudioLanguages"
              />
              <span class="task-history-item-target">{{ task.targetTag }}</span>
            </span>
            <span v-else class="task-history-item-target">{{ taskTarget(task) }}</span>
          </div>
          <v-btn
            :aria-label="`清除${taskType(task)}记录`"
            :disabled="clearingAll || loading"
            :loading="taskRemoving(task.taskId)"
            class="task-history-remove"
            color="error"
            density="comfortable"
            icon="mdi-delete-outline"
            :title="`清除${taskType(task)}记录`"
            variant="text"
            @click="handleRemoveTask(task)"
          />
        </div>

        <div class="task-history-facts">
          <span v-for="fact in taskFacts(task)" :key="fact.text" class="task-history-fact">
            <v-icon :icon="fact.icon" size="14" />
            <span>{{ fact.text }}</span>
          </span>
        </div>

        <p v-if="task.errorMessage !== null" class="task-history-error">
          <v-icon icon="mdi-alert-outline" size="16" />
          <span>{{ task.errorMessage }}</span>
        </p>
      </article>
    </div>

    <p
      v-if="loadError !== null && history.length > 0"
      class="task-history-inline-error"
      role="alert"
    >
      <v-icon icon="mdi-alert-circle-outline" size="16" />
      <span>刷新失败，当前仍显示上次读取的记录：{{ loadError }}</span>
    </p>

    <template #footer>
      <span class="task-history-footer-hint">
        记录最多保留 7 天，清除不会影响游戏文件或共享缓存
      </span>
      <div class="task-history-actions">
        <v-btn variant="text" @click="closeOverlay">关闭</v-btn>
        <v-btn
          :disabled="history.length === 0 || loading || removingAny"
          :loading="clearingAll"
          color="error"
          prepend-icon="mdi-delete-sweep-outline"
          variant="tonal"
          @click="handleClearAll"
        >
          清除全部
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
import fmtUtil from "@utils/fmtUtil.js";
import { listGamePackageTaskHistory } from "@utils/TGGameLauncher.js";
import { computed, ref, useId, watch } from "vue";

import PgAudioLangTags from "./pg-audio-lang-tags.vue";

const visible = defineModel<boolean>({ required: true });
const taskStore = useGameLauncherStore();
const titleId = useId();
const history = ref<Array<TGApp.Game.Package.TaskSummary>>([]);
const loading = ref<boolean>(false);
const loadError = ref<string | null>(null);
let requestSequence = 0;

const clearingAll = computed<boolean>(() => taskStore.pendingActions["task-cleanup"] === true);
const removingAny = computed<boolean>(() => {
  return Object.entries(taskStore.pendingActions).some(
    ([key, pending]) => key.startsWith("task-history-remove:") && pending,
  );
});

function isTerminalTask(task: TGApp.Game.Package.TaskSummary): boolean {
  return (
    task.state === gameEnum.package.taskState.COMPLETED ||
    task.state === gameEnum.package.taskState.FAILED ||
    task.state === gameEnum.package.taskState.CANCELED
  );
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

function taskRemoving(taskId: string): boolean {
  return taskStore.pendingActions[`task-history-remove:${taskId}`] === true;
}

function removeHistoryItems(taskIds: Array<string>): void {
  if (taskIds.length === 0) return;
  const removedIds = new Set(taskIds);
  history.value = history.value.filter((task) => !removedIds.has(task.taskId));
}

async function loadHistory(): Promise<void> {
  if (loading.value || clearingAll.value || removingAny.value) return;
  const sequence = ++requestSequence;
  loading.value = true;
  loadError.value = null;
  try {
    const tasks = await listGamePackageTaskHistory();
    if (!visible.value || sequence !== requestSequence) return;
    history.value = tasks
      .filter(isTerminalTask)
      .toSorted((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  } catch (error) {
    if (!visible.value || sequence !== requestSequence) return;
    loadError.value = error instanceof Error ? error.message : String(error);
    showSnackbar.error("读取任务历史失败，请稍后重试");
  } finally {
    if (sequence === requestSequence) loading.value = false;
  }
}

async function handleRemoveTask(task: TGApp.Game.Package.TaskSummary): Promise<void> {
  if (clearingAll.value || taskRemoving(task.taskId)) return;
  const confirmed = await showDialog.checkF({
    title: "清除任务记录？",
    text: `将清除“${taskType(task)}”记录，不会删除游戏文件或共享缓存。`,
    confirmLabel: "清除记录",
    cancelLabel: "取消",
  });
  if (confirmed !== true) return;
  try {
    const summary = await taskStore.removeTaskHistory(task.taskId);
    removeHistoryItems(summary.removedTaskIds);
    if (summary.removedCount === 0) {
      showSnackbar.info("记录已不存在或已被清理");
      await loadHistory();
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
  if (history.value.length === 0 || loading.value || clearingAll.value || removingAny.value) return;
  const confirmed = await showDialog.checkF({
    title: "清除全部任务记录？",
    text: `将清除全部已结束任务记录（当前 ${history.value.length} 条），不会删除游戏文件或共享缓存。`,
    confirmLabel: "清除全部",
    cancelLabel: "取消",
  });
  if (confirmed !== true) return;
  try {
    const summary = await taskStore.cleanupTasks();
    removeHistoryItems(summary.removedTaskIds);
    if (summary.removedCount === 0) {
      showSnackbar.info("没有可清除的已结束任务");
      await loadHistory();
      return;
    }
    showSnackbar.success(
      `已清除 ${summary.removedCount} 条任务记录，释放 ${fmtUtil.size(summary.removedBytes)}`,
    );
  } catch (error) {
    showSnackbar.error(`清除全部任务记录失败：${error}`);
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
    void loadHistory();
  },
  { immediate: true },
);
</script>

<style lang="scss" scoped>
.task-history-heading {
  display: flex;
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
  gap: 2px;

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
