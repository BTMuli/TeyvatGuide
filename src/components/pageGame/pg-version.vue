<template>
  <section class="version-panel" aria-label="游戏资源版本">
    <div class="version-heading">
      <div>
        <span>资源版本</span>
        <p>只读检查官方分支；评估不会修改游戏目录。</p>
      </div>
      <v-btn
        :disabled="planningTarget !== null || taskActive"
        :loading="loading"
        aria-label="刷新远端版本"
        icon="mdi-refresh"
        size="small"
        variant="text"
        @click="refreshSnapshot"
      />
    </div>

    <div v-if="loading && snapshot === null" class="version-loading">
      <v-progress-linear indeterminate rounded />
      <span>正在读取 HoyoPlay 分支…</span>
    </div>
    <v-alert
      v-if="errorMessage !== null"
      :text="errorMessage"
      density="compact"
      type="warning"
      variant="tonal"
    />
    <template v-if="snapshot !== null">
      <div :class="{ 'has-preview': snapshot.preDownload !== null }" class="version-route">
        <div class="version-node current">
          <span>本地</span>
          <strong>{{ snapshot.localVersion ?? "未知" }}</strong>
        </div>
        <v-icon aria-hidden="true" size="18">mdi-chevron-right</v-icon>
        <div :class="{ current: !snapshot.updateAvailable }" class="version-node">
          <span>正式版本</span>
          <strong>{{ snapshot.main.tag }}</strong>
        </div>
        <template v-if="snapshot.preDownload !== null">
          <v-icon aria-hidden="true" size="18">mdi-chevron-right</v-icon>
          <div class="version-node preview">
            <span>预下载</span>
            <strong>{{ snapshot.preDownload.tag }}</strong>
          </div>
        </template>
      </div>

      <div class="version-actions">
        <span v-if="!snapshot.updateAvailable && !snapshot.preDownloadAvailable">
          当前已是最新正式版本
        </span>
        <v-btn
          v-if="snapshot.updateAvailable"
          :disabled="planningTarget !== null || taskActive"
          :loading="planningTarget === gameEnum.package.planTarget.MAIN"
          prepend-icon="mdi-file-tree-outline"
          size="small"
          variant="outlined"
          @click="createPlan(gameEnum.package.planTarget.MAIN)"
        >
          评估正式更新
        </v-btn>
        <v-btn
          v-if="snapshot.preDownloadAvailable"
          :disabled="planningTarget !== null || taskActive"
          :loading="planningTarget === gameEnum.package.planTarget.PRE_DOWNLOAD"
          prepend-icon="mdi-cloud-download-outline"
          size="small"
          variant="tonal"
          @click="createPlan(gameEnum.package.planTarget.PRE_DOWNLOAD)"
        >
          评估预下载
        </v-btn>
      </div>
    </template>

    <div v-if="plan !== null" class="plan-summary" aria-live="polite">
      <div class="plan-title">
        <div>
          <span>计划已固化</span>
          <strong>{{ plan.sourceTag }} → {{ plan.targetTag }}</strong>
        </div>
        <v-chip
          :color="plan.hasSufficientSpace ? 'success' : 'warning'"
          size="small"
          variant="tonal"
        >
          {{ plan.hasSufficientSpace ? "空间充足" : "空间不足" }}
        </v-chip>
      </div>
      <dl>
        <div>
          <dt>差异方式</dt>
          <dd>{{ gameEnum.package.planStrategyDesc(plan.strategy) }}</dd>
        </div>
        <div>
          <dt>预计下载</dt>
          <dd>{{ formatBytes(plan.downloadBytes - plan.cacheHitBytes) }}</dd>
        </div>
        <div>
          <dt>安装写入</dt>
          <dd>{{ formatBytes(plan.installBytes) }}</dd>
        </div>
        <div>
          <dt>缓存命中</dt>
          <dd>{{ formatBytes(plan.cacheHitBytes) }}</dd>
        </div>
        <div>
          <dt>磁盘空间</dt>
          <dd>
            需要 {{ formatBytes(plan.requiredFreeBytes) }} · 可用
            {{ formatBytes(plan.availableFreeBytes) }}
          </dd>
        </div>
        <div>
          <dt>文件变化</dt>
          <dd>
            {{ plan.addCount }} 新增 · {{ plan.modifyCount }} 修改 · {{ plan.deleteCount }} 删除
          </dd>
        </div>
      </dl>
      <p>下载只写入应用缓存；不会在此阶段修改游戏目录。</p>
    </div>
    <PgTask
      :actionPending="taskActionPending"
      :plan
      :targetPublished
      :task="currentTask"
      @apply-requested="handleApplyRequested"
      @cancel-requested="handleCancelRequested"
      @recover-requested="handleRecoverRequested"
      @start-requested="handleStartRequested"
    />
  </section>
</template>

<script lang="ts" setup>
import showDialog from "@comp/func/dialog.js";
import showSnackbar from "@comp/func/snackbar.js";
import PgTask from "@comp/pageGame/pg-task.vue";
import gameEnum from "@enum/game.js";
import useGameLauncherStore from "@store/gameLauncher.js";
import { createGamePackagePlan, getGamePackageSnapshot } from "@utils/TGGameLauncher.js";
import { storeToRefs } from "pinia";
import { computed, ref, watch } from "vue";

type Props = {
  installation: TGApp.Game.Installation.Item;
};

const { installation } = defineProps<Props>();
const taskStore = useGameLauncherStore();
const { pendingActions, tasksByInstallation } = storeToRefs(taskStore);
const snapshot = ref<TGApp.Game.Package.Snapshot | null>(null);
const plan = ref<TGApp.Game.Package.PlanSummary | null>(null);
const loading = ref<boolean>(false);
const planningTarget = ref<TGApp.Game.Package.PlanTargetEnum | null>(null);
const errorMessage = ref<string | null>(null);
let requestSequence = 0;

const currentTask = computed<TGApp.Game.Package.TaskSummary | null>(() => {
  return tasksByInstallation.value[installation.id] ?? null;
});
const targetPublished = computed<boolean>(() => {
  return (
    currentTask.value !== null &&
    snapshot.value !== null &&
    snapshot.value.main.tag === currentTask.value.targetTag
  );
});
const taskActive = computed<boolean>(() => {
  return currentTask.value !== null && gameEnum.package.taskActive(currentTask.value.state);
});
const taskActionPending = computed<boolean>(() => {
  const taskId = currentTask.value?.taskId;
  return (
    pendingActions.value[installation.id] === true ||
    (taskId !== undefined && pendingActions.value[taskId] === true)
  );
});

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KiB", "MiB", "GiB", "TiB"];
  let value = bytes / 1024;
  let unit = units[0];
  for (const candidate of units.slice(1)) {
    if (value < 1024) break;
    value /= 1024;
    unit = candidate;
  }
  return `${value.toFixed(value >= 10 ? 1 : 2)} ${unit}`;
}

async function refreshSnapshot(): Promise<void> {
  const sequence = ++requestSequence;
  loading.value = true;
  errorMessage.value = null;
  try {
    const result = await getGamePackageSnapshot(installation.id);
    if (sequence !== requestSequence) return;
    snapshot.value = result;
    if (
      plan.value !== null &&
      plan.value.targetTag !== result.main.tag &&
      result.preDownload?.tag !== plan.value.targetTag
    ) {
      plan.value = null;
    }
  } catch (error) {
    if (sequence !== requestSequence) return;
    errorMessage.value = `读取远端版本失败：${error}`;
  } finally {
    if (sequence === requestSequence) loading.value = false;
  }
}

async function createPlan(target: TGApp.Game.Package.PlanTargetEnum): Promise<void> {
  if (planningTarget.value !== null) return;
  planningTarget.value = target;
  errorMessage.value = null;
  try {
    plan.value = await createGamePackagePlan(installation.id, target);
  } catch (error) {
    errorMessage.value = `生成资源计划失败：${error}`;
  } finally {
    planningTarget.value = null;
  }
}

async function handleStartRequested(): Promise<void> {
  if (plan.value === null || taskActive.value) return;
  const confirmed = await showDialog.checkF({
    title: "开始资源下载？",
    text: `目标版本 ${plan.value.targetTag}，还需下载 ${formatBytes(
      plan.value.downloadBytes - plan.value.cacheHitBytes,
    )}。下载只写入应用缓存。`,
    confirmLabel: "开始下载",
  });
  if (confirmed !== true) return;
  try {
    await taskStore.startTask(plan.value);
    showSnackbar.success("资源下载任务已开始");
  } catch (error) {
    showSnackbar.error(`启动资源下载失败：${error}`);
  }
}

async function handleApplyRequested(): Promise<void> {
  const task = currentTask.value;
  const repairing = task?.state === gameEnum.package.taskState.REPAIR_REQUIRED;
  if (task === null) return;
  if (
    !repairing &&
    (task.state !== gameEnum.package.taskState.READY_TO_APPLY || !targetPublished.value)
  ) {
    return;
  }
  const confirmed = await showDialog.checkF({
    title: repairing ? "修复未变化文件？" : "应用游戏更新？",
    text: repairing
      ? "会下载并替换缺失或损坏的未变化文件，全部通过后再写入版本号。请先完全退出游戏，游戏运行时无法修复。"
      : "应用会修改游戏文件。请先完全退出游戏，游戏运行时无法应用更新。",
    confirmLabel: repairing ? "修复并完成" : "应用更新",
  });
  if (confirmed !== true) return;
  try {
    const updatedTask = await taskStore.applyTask(task.taskId);
    showSnackbar.success(repairing ? "已开始修复未变化文件" : "已开始应用游戏更新");
    if (updatedTask.state === gameEnum.package.taskState.COMPLETED) await refreshSnapshot();
  } catch (error) {
    showSnackbar.error(`${repairing ? "修复未变化文件" : "应用游戏更新"}失败：${error}`);
  }
}

async function handleCancelRequested(): Promise<void> {
  const task = currentTask.value;
  if (task === null || !taskActive.value) return;
  const applying = gameEnum.package.taskApplying(task.state);
  const confirmed = await showDialog.checkF({
    title: applying ? "取消资源提交？" : "取消资源下载？",
    text: applying
      ? "会在当前安全检查点停止，并尝试把游戏文件回滚到提交前的状态。已校验的共享下载缓存会保留。若回滚无法证明安全，需要先恢复后才能启动游戏。"
      : "已校验完成的共享缓存会保留，当前下载对象会在安全边界停止。",
    confirmLabel: "请求取消",
  });
  if (confirmed !== true) return;
  try {
    await taskStore.cancelTask(task.taskId);
    if (applying) {
      showSnackbar.info("已请求取消，请等待提交回滚到安全状态");
    } else {
      showSnackbar.info("已请求取消，请等待当前下载对象停止");
    }
  } catch (error) {
    showSnackbar.error(`${applying ? "取消资源提交" : "取消资源下载"}失败：${error}`);
  }
}

async function handleRecoverRequested(
  action: TGApp.Game.Package.RecoveryActionEnum,
): Promise<void> {
  const task = currentTask.value;
  if (task === null || taskActive.value) return;
  const rollback = action === gameEnum.package.recoveryAction.ROLLBACK;
  const abandonReady = rollback && task.state === gameEnum.package.taskState.READY_TO_APPLY;
  const abandonRepair = rollback && task.state === gameEnum.package.taskState.REPAIR_REQUIRED;
  let title = "安全恢复资源任务？";
  let text = "恢复会重新校验缓存；若提交曾中断，会先安全回滚到源版本再重新应用。";
  let confirmLabel = "开始恢复";
  if (abandonRepair) {
    title = "放弃更新并回滚？";
    text =
      "已提交的新增、修改和删除会回滚到源版本。未完成的修复会先还原；已经修好的未变化文件会保留。已校验缓存不会删除。";
    confirmLabel = "放弃并回滚";
  } else if (abandonReady) {
    const predownload = task.target === gameEnum.package.planTarget.PRE_DOWNLOAD;
    title = predownload ? "放弃预下载任务？" : "放弃资源任务？";
    text = "放弃不会修改游戏目录，也不会删除已校验的共享缓存。之后可以重新评估并下载。";
    confirmLabel = "放弃任务";
  } else if (rollback) {
    title = "回滚资源任务？";
    text = "若任务已进入文件提交，会先恢复备份；已校验的共享下载缓存不会删除。";
    confirmLabel = "安全回滚";
  }
  const confirmed = await showDialog.checkF({ title, text, confirmLabel });
  if (confirmed !== true) return;
  try {
    await taskStore.recoverTask(task.taskId, action);
    showSnackbar.success(rollback ? "资源任务已放弃" : "已开始恢复资源任务");
  } catch (error) {
    showSnackbar.error(`${rollback ? "放弃" : "恢复"}资源任务失败：${error}`);
  }
}

watch(
  () => [installation.id, installation.version],
  () => void refreshSnapshot(),
  { immediate: true },
);

watch(
  () => [currentTask.value?.taskId, currentTask.value?.state],
  ([taskId, state]) => {
    if (taskId !== undefined && state === gameEnum.package.taskState.COMPLETED) {
      void refreshSnapshot();
    }
  },
);
</script>

<style lang="scss" scoped>
.version-panel {
  display: grid;
  padding-top: 16px;
  border-top: 1px solid var(--common-shadow-1);
  gap: 16px;
}

.version-heading,
.plan-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.version-heading {
  span {
    color: var(--common-text-title);
    font-size: 16px;
    font-weight: 600;
    line-height: 22px;
  }

  p {
    margin: 2px 0 0;
    color: var(--box-text-2);
    font-size: 12px;
    line-height: 16px;
  }
}

.version-loading {
  display: grid;
  color: var(--box-text-2);
  font-size: 12px;
  gap: 8px;
}

.version-route {
  display: grid;
  align-items: center;
  gap: 8px;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);

  &.has-preview {
    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr) auto minmax(0, 1fr);
  }

  > .v-icon {
    color: var(--box-text-2);
  }
}

.version-node {
  display: grid;
  min-width: 0;
  padding: 12px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
  background: var(--box-bg-4);
  gap: 4px;

  span {
    color: var(--box-text-2);
    font-size: 12px;
    line-height: 16px;
  }

  strong {
    color: var(--box-text-1);
    font-size: 14px;
    line-height: 20px;
  }

  &.current {
    border-color: var(--tgc-yellow-3);
  }

  &.preview {
    border-style: dashed;
  }
}

.version-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  color: var(--box-text-2);
  font-size: 12px;
  gap: 8px;
}

.plan-summary {
  display: grid;
  padding: 16px;
  border-radius: 8px;
  background: var(--box-bg-4);
  gap: 12px;

  p {
    margin: 0;
    color: var(--box-text-2);
    font-size: 12px;
    line-height: 16px;
  }

  dl {
    display: grid;
    margin: 0;
    gap: 8px 16px;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  dl div {
    display: grid;
    gap: 2px;
  }

  dt {
    color: var(--box-text-2);
    font-size: 12px;
    line-height: 16px;
  }

  dd {
    margin: 0;
    color: var(--box-text-1);
    font-size: 14px;
    font-weight: 600;
    line-height: 20px;
  }
}

.plan-title {
  span,
  strong {
    display: block;
  }

  span {
    color: var(--box-text-2);
    font-size: 12px;
    line-height: 16px;
  }

  strong {
    color: var(--common-text-title);
    font-size: 16px;
    line-height: 22px;
  }
}

@media (width <= 720px) {
  .version-route {
    grid-template-columns: 1fr;

    > .v-icon {
      justify-self: center;
      transform: rotate(90deg);
    }
  }

  .plan-summary dl {
    grid-template-columns: 1fr;
  }
}
</style>
