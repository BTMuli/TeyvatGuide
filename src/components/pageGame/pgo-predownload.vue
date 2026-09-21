<!-- 预下载评估浮层：生成缓存计划并启动预下载资源任务 -->
<template>
  <TopOverlay
    v-model="visible"
    :outerClose="!busy"
    :showShare="false"
    :titleId
    closeAriaLabel="关闭预下载评估"
    contentMaxHeight="none"
    panelWidth="720px"
    topOffset="64px"
    @close="handleClose"
  >
    <template #header>
      <div class="predownload-header">
        <div aria-hidden="true" class="predownload-header-icon">
          <v-icon icon="mdi-cloud-download-outline" size="24" />
        </div>
        <div class="predownload-header-copy">
          <h2 :id="titleId">评估预下载</h2>
          <p>读取远端资源清单，计算下载量与应用缓存所需空间。</p>
        </div>
      </div>
    </template>

    <div class="predownload-body">
      <div v-if="busy && plan === null" aria-live="polite" class="predownload-evaluating">
        <v-progress-circular color="var(--tgc-od-orange)" indeterminate size="24" width="2" />
        <div>
          <strong>
            正在评估预下载
            <template v-if="planProgress !== null">
              · {{ planProgress.step }} / {{ planProgress.total }}
            </template>
          </strong>
          <span>{{ planProgress?.message ?? "正在准备预下载评估…" }}</span>
        </div>
      </div>

      <section v-else-if="plan !== null" aria-live="polite" class="predownload-review">
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
              <span>正式更新写入</span><strong>{{ formatBytes(plan.installBytes) }}</strong>
            </div>
          </div>
          <div class="review-fact-row">
            <div>
              <span>任务临时空间</span>
              <strong>{{ formatBytes(plan.cacheRequiredFreeBytes) }}</strong>
            </div>
            <div>
              <span>任务缓存可用</span>
              <strong>{{ formatBytes(plan.cacheAvailableFreeBytes) }}</strong>
            </div>
            <div>
              <span>缓存空间</span>
              <strong>{{ plan.cacheHasSufficientSpace ? "充足" : "不足" }}</strong>
            </div>
          </div>
          <div class="review-fact-wide">
            <span>文件变化</span>
            <strong>
              {{ plan.addCount }} 新增 · {{ plan.modifyCount }} 修改 · {{ plan.deleteCount }} 删除
            </strong>
          </div>
          <p class="review-space-note">
            预下载仅写入应用缓存，不修改游戏目录；正式发布后需单独评估更新，已缓存分片可复用。
          </p>
        </div>
        <PgNotice v-if="!plan.cacheHasSufficientSpace" :text="spaceGuidance" tone="warning" />
      </section>

      <PgNotice v-if="errorMessage !== null" :text="errorMessage" tone="error" />
    </div>

    <template #footer>
      <span class="predownload-footer-hint">评估期间不会修改游戏目录</span>
      <div class="predownload-actions">
        <v-btn :disabled="busy" variant="text" @click="visible = false">取消</v-btn>
        <v-btn
          v-if="plan === null"
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
          :disabled="!plan.cacheHasSufficientSpace"
          :loading="busy"
          color="var(--tgc-od-orange)"
          prepend-icon="mdi-download"
          variant="flat"
          @click="startTask"
        >
          开始预下载
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
import { computed, ref, useId, watch } from "vue";

import PgNotice from "./pg-notice.vue";

type Props = {
  installation: TGApp.Game.Installation.Item;
};

const { installation } = defineProps<Props>();
const emit = defineEmits<{ taskStarted: [] }>();
const visible = defineModel<boolean>({ required: true });
const titleId = useId();
const taskStore = useGameLauncherStore();
const plan = ref<TGApp.Game.Package.PlanSummary | null>(null);
const planProgress = ref<TGApp.Game.Package.PlanProgress | null>(null);
const busy = ref<boolean>(false);
const errorMessage = ref<string | null>(null);

const spaceGuidance = computed<string>(() => {
  if (plan.value === null || plan.value.cacheHasSufficientSpace) return "";
  const shortage = Math.max(
    0,
    plan.value.cacheRequiredFreeBytes - plan.value.cacheAvailableFreeBytes,
  );
  return shortage > 0
    ? `应用缓存所在磁盘还需 ${formatBytes(shortage)}，请释放空间后重新评估。`
    : "应用缓存所在磁盘空间不足，请释放空间后重新评估。";
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
    plan.value = await createGamePackagePlan(
      installation.id,
      gameEnum.package.planTarget.PRE_DOWNLOAD,
      (progress) => {
        planProgress.value = progress;
      },
    );
  } catch (error) {
    errorMessage.value = `评估预下载失败：${error}`;
  } finally {
    busy.value = false;
    planProgress.value = null;
  }
}

async function startTask(): Promise<void> {
  if (plan.value === null || busy.value || !plan.value.cacheHasSufficientSpace) return;
  busy.value = true;
  errorMessage.value = null;
  try {
    await taskStore.startTask(plan.value);
    showSnackbar.success("预下载任务已开始");
    emit("taskStarted");
    visible.value = false;
  } catch (error) {
    errorMessage.value = `启动预下载失败：${error}`;
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
  // 首次打开预下载时组件才挂载，且 v-model 已为 true；无 immediate 则不会自动评估。
  { immediate: true },
);
</script>

<style lang="scss" scoped>
.predownload-header,
.predownload-body,
.predownload-header-copy,
.predownload-review {
  display: flex;
}

.predownload-header {
  min-width: 0;
  flex: 1;
  align-items: center;
  gap: 12px;
}

.predownload-header-icon {
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

.predownload-header-copy,
.predownload-body,
.predownload-review {
  min-width: 0;
  flex-direction: column;
}

.predownload-header-copy {
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

.predownload-body,
.predownload-review {
  gap: 8px;
}

.predownload-evaluating {
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

.predownload-review {
  padding: 12px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--box-bg-1);
}

.review-facts {
  display: grid;
  gap: 6px;
  grid-template-columns: repeat(2, minmax(0, 1fr));

  > div:not(.review-fact-row),
  .review-fact-row > div {
    display: flex;
    min-width: 0;
    flex-direction: column;
    padding: 8px;
    border: 1px solid var(--common-shadow-1);
    border-radius: 6px;
    background: var(--box-bg-2);
    gap: 3px;
  }

  .review-fact-wide {
    grid-column: 1 / -1;
  }

  .review-fact-row {
    display: grid;
    min-width: 0;
    gap: 6px;
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
  margin: 2px 4px 0;
  color: var(--box-text-2);
  font-size: 11px;
  grid-column: 1 / -1;
  line-height: 16px;
}

.predownload-footer-hint {
  color: var(--box-text-2);
  font-size: 12px;
}

.predownload-actions {
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
