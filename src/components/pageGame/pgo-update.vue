<!-- 正式更新评估浮层：生成主版本计划并启动自动应用资源任务 -->
<template>
  <TopOverlay
    v-model="visible"
    :outerClose="!busy"
    :showShare="false"
    :titleId
    closeAriaLabel="关闭正式更新评估"
    contentMaxHeight="none"
    panelWidth="720px"
    topOffset="64px"
    @close="handleClose"
  >
    <template #header>
      <div class="update-header">
        <div aria-hidden="true" class="update-header-icon">
          <v-icon icon="mdi-update" size="24" />
        </div>
        <div class="update-header-copy">
          <h2 :id="titleId">{{ occupyingTask === null ? "评估正式更新" : "资源任务进行中" }}</h2>
          <p>
            {{
              occupyingTask === null
                ? "读取正式版本资源清单，计算下载、组装与应用所需空间。"
                : "当前安装已有资源任务，完成或停止后才能重新评估正式更新。"
            }}
          </p>
        </div>
      </div>
    </template>

    <div class="update-body">
      <section v-if="occupyingTask !== null" aria-live="polite" class="update-existing-task">
        <PgNotice text="该安装已有资源任务，已为你显示当前任务状态；无需重新评估。" tone="info" />
        <PgTask
          :actionPending="false"
          :plan="null"
          :recoveryProgress="null"
          :targetPublished="occupyingTask.target === gameEnum.package.planTarget.MAIN"
          :task="occupyingTask"
          readOnly
        />
      </section>

      <div v-else-if="busy && plan === null" aria-live="polite" class="update-evaluating">
        <v-progress-circular color="var(--tgc-od-orange)" indeterminate size="24" width="2" />
        <div>
          <strong>
            正在评估正式更新
            <template v-if="planProgress !== null">
              · {{ planProgress.step }} / {{ planProgress.total }}
            </template>
          </strong>
          <span>{{ planProgress?.message ?? "正在准备正式更新评估…" }}</span>
        </div>
      </div>

      <section v-else-if="plan !== null" aria-live="polite" class="update-review">
        <div class="review-facts">
          <div>
            <span>目标版本</span><strong>{{ plan.sourceTag }} → {{ plan.targetTag }}</strong>
          </div>
          <div>
            <span>差异方式</span
            ><strong>{{ gameEnum.package.planStrategyDesc(plan.strategy) }}</strong>
          </div>
          <div class="review-fact-row">
            <div>
              <span>预计下载</span>
              <strong>{{
                formatBytes(Math.max(0, plan.downloadBytes - plan.cacheHitBytes))
              }}</strong>
            </div>
            <div>
              <span>已命中缓存</span><strong>{{ formatBytes(plan.cacheHitBytes) }}</strong>
            </div>
            <div>
              <span>安装写入</span><strong>{{ formatBytes(plan.installBytes) }}</strong>
            </div>
          </div>
          <div class="review-fact-row">
            <div>
              <span>缓存所需</span>
              <strong>{{ formatBytes(plan.cacheRequiredFreeBytes) }}</strong>
            </div>
            <div>
              <span>游戏盘所需</span>
              <strong>{{ formatBytes(plan.installRequiredFreeBytes) }}</strong>
            </div>
            <div>
              <span>空间状态</span>
              <strong>{{ plan.hasSufficientSpace ? "充足" : "不足" }}</strong>
            </div>
          </div>
          <div class="review-fact-wide">
            <span>文件变化</span>
            <strong>
              {{ plan.addCount }} 新增 · {{ plan.modifyCount }} 修改 · {{ plan.deleteCount }} 删除
            </strong>
          </div>
          <p class="review-space-note">
            下载阶段会边下边组装到事务目录；组装完成后自动应用，全部校验通过后才更新版本号。
          </p>
        </div>
        <PgNotice v-if="!plan.hasSufficientSpace" :text="spaceGuidance" tone="warning" />
      </section>

      <PgNotice v-if="errorMessage !== null" :text="errorMessage" tone="error" />
    </div>

    <template #footer>
      <span class="update-footer-hint">
        {{ occupyingTask === null ? "评估期间不会修改游戏目录" : "任务状态已与主页面同步" }}
      </span>
      <div class="update-actions">
        <v-btn :disabled="busy" variant="text" @click="visible = false">
          {{ occupyingTask === null ? "取消" : "关闭" }}
        </v-btn>
        <v-btn
          v-if="occupyingTask !== null"
          :disabled="busy"
          :loading="busy"
          color="var(--tgc-od-orange)"
          prepend-icon="mdi-refresh"
          variant="flat"
          @click="refreshOccupyingTask"
        >
          刷新任务
        </v-btn>
        <v-btn
          v-else-if="plan === null"
          :disabled="busy"
          :loading="busy"
          color="var(--tgc-od-orange)"
          variant="flat"
          @click="evaluatePlan"
        >
          重新评估
        </v-btn>
        <v-btn
          v-else
          :disabled="!plan.hasSufficientSpace"
          :loading="busy"
          color="var(--tgc-od-orange)"
          prepend-icon="mdi-download"
          variant="flat"
          @click="startTask"
        >
          下载并更新
        </v-btn>
      </div>
    </template>
  </TopOverlay>
</template>

<script lang="ts" setup>
import TopOverlay from "@comp/app/top-overlay.vue";
import showSnackbar from "@comp/func/snackbar.js";
import gameEnum from "@enum/game.js";
import useGameLauncherStore from "@store/gameLauncher.js";
import { createGamePackagePlan } from "@utils/TGGameLauncher.js";
import { storeToRefs } from "pinia";
import { computed, ref, useId, watch } from "vue";

import PgNotice from "./pg-notice.vue";
import PgTask from "./pg-task.vue";

type Props = {
  installation: TGApp.Game.Installation.Item;
};

const { installation } = defineProps<Props>();
const emit = defineEmits<{ taskStarted: [] }>();
const visible = defineModel<boolean>({ required: true });
const titleId = useId();
const taskStore = useGameLauncherStore();
const { tasksByInstallation } = storeToRefs(taskStore);
const plan = ref<TGApp.Game.Package.PlanSummary | null>(null);
const planProgress = ref<TGApp.Game.Package.PlanProgress | null>(null);
const busy = ref<boolean>(false);
const errorMessage = ref<string | null>(null);
const occupyingTask = computed<TGApp.Game.Package.TaskSummary | null>(() => {
  const task = tasksByInstallation.value[installation.id];
  if (
    task === undefined ||
    task.target === gameEnum.package.planTarget.SWITCH ||
    !gameEnum.package.taskOccupying(task.state)
  ) {
    return null;
  }
  return task;
});

const spaceGuidance = computed<string>(() => {
  const summary = plan.value;
  if (summary === null || summary.hasSufficientSpace) return "";
  if (!summary.cacheHasSufficientSpace) {
    const shortage = Math.max(0, summary.cacheRequiredFreeBytes - summary.cacheAvailableFreeBytes);
    return shortage > 0
      ? `应用缓存所在磁盘还需 ${formatBytes(shortage)}，请释放空间后重新评估。`
      : "应用缓存所在磁盘空间不足，请释放空间后重新评估。";
  }
  const shortage = Math.max(
    0,
    summary.installRequiredFreeBytes - summary.installAvailableFreeBytes,
  );
  return shortage > 0
    ? `游戏所在磁盘还需 ${formatBytes(shortage)}，请释放空间后重新评估。`
    : "游戏所在磁盘空间不足，请释放空间后重新评估。";
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

async function evaluatePlan(): Promise<void> {
  if (busy.value) return;
  busy.value = true;
  plan.value = null;
  planProgress.value = null;
  errorMessage.value = null;
  try {
    await taskStore.hydrateTasks(installation.id);
    if (occupyingTask.value !== null) return;
    plan.value = await createGamePackagePlan(
      installation.id,
      gameEnum.package.planTarget.MAIN,
      (progress) => {
        planProgress.value = progress;
      },
    );
  } catch (error) {
    try {
      await taskStore.hydrateTasks(installation.id);
    } catch {
      // 保留原始评估错误，任务补水失败不应覆盖更直接的失败原因。
    }
    if (occupyingTask.value === null) errorMessage.value = `评估正式更新失败：${error}`;
  } finally {
    busy.value = false;
    planProgress.value = null;
  }
}

async function refreshOccupyingTask(): Promise<void> {
  if (busy.value) return;
  busy.value = true;
  errorMessage.value = null;
  try {
    await taskStore.hydrateTasks(installation.id);
  } catch (error) {
    errorMessage.value = `刷新资源任务失败：${error}`;
  } finally {
    busy.value = false;
  }
}

async function startTask(): Promise<void> {
  if (plan.value === null || busy.value || !plan.value.hasSufficientSpace) return;
  busy.value = true;
  errorMessage.value = null;
  try {
    await taskStore.startTask(plan.value);
    showSnackbar.success("正式更新任务已开始，组装完成后将自动应用");
    emit("taskStarted");
    visible.value = false;
  } catch (error) {
    errorMessage.value = `启动正式更新失败：${error}`;
  } finally {
    busy.value = false;
  }
}

function handleClose(): void {
  if (busy.value) visible.value = true;
}

watch(
  visible,
  (open) => {
    if (!open) return;
    plan.value = null;
    planProgress.value = null;
    errorMessage.value = null;
    void evaluatePlan();
  },
  { immediate: true },
);
</script>

<style lang="scss" scoped>
.update-header,
.update-body,
.update-header-copy,
.update-review {
  display: flex;
}

.update-header {
  min-width: 0;
  flex: 1;
  align-items: center;
  gap: 12px;
}

.update-header-icon {
  display: flex;
  width: 48px;
  height: 48px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: var(--common-shadow-t-2);
  color: var(--tgc-od-orange);
}

.update-header-copy,
.update-body,
.update-review,
.update-existing-task {
  min-width: 0;
  flex-direction: column;
}

.update-header-copy {
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
    line-height: 18px;
  }
}

.update-body,
.update-review,
.update-existing-task {
  gap: 8px;
}

.update-evaluating {
  display: flex;
  min-height: 96px;
  align-items: center;
  padding: 8px 4px;
  gap: 12px;

  div {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  strong {
    color: var(--common-text-title);
    font-size: 14px;
    font-weight: 600;
    line-height: 20px;
  }

  span {
    color: var(--box-text-2);
    font-size: 12px;
    line-height: 16px;
  }
}

.update-review {
  padding: 12px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--box-bg-1);
}

.review-facts {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(2, minmax(0, 1fr));

  > div:not(.review-fact-row),
  .review-fact-row > div {
    display: flex;
    min-width: 0;
    flex-direction: column;
    padding: 8px;
    border: 1px solid var(--common-shadow-1);
    border-radius: 4px;
    background: var(--box-bg-2);
    gap: 4px;
  }

  .review-fact-wide {
    grid-column: 1 / -1;
  }

  .review-fact-row {
    display: grid;
    min-width: 0;
    gap: 8px;
    grid-column: 1 / -1;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  span {
    color: var(--box-text-2);
    font-size: 12px;
  }

  strong {
    color: var(--common-text-title);
    font-size: 13px;
    font-weight: normal;
    overflow-wrap: anywhere;
  }
}

.review-space-note {
  margin: 4px 4px 0;
  color: var(--box-text-2);
  font-size: 11px;
  grid-column: 1 / -1;
  line-height: 16px;
}

.update-footer-hint {
  color: var(--box-text-2);
  font-size: 12px;
}

.update-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

@media (width <= 640px) {
  .review-facts,
  .review-facts .review-fact-row {
    grid-template-columns: 1fr;
  }

  .review-facts .review-fact-wide,
  .review-space-note {
    grid-column: auto;
  }
}
</style>
