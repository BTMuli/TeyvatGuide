<template>
  <TopOverlay
    v-model="visible"
    :outerClose="!busy"
    :showShare="false"
    :titleId
    closeAriaLabel="关闭配音包管理"
    contentMaxHeight="520px"
    panelWidth="640px"
    topOffset="64px"
    @close="handleClose"
  >
    <template #header>
      <div class="audio-header">
        <div aria-hidden="true" class="audio-header-icon">
          <v-icon icon="mdi-volume-high" size="24" />
        </div>
        <div class="audio-header-copy">
          <h2 :id="titleId">管理配音包</h2>
          <p>选择要保留在 {{ installation.version ?? "当前版本" }} 中的官方配音。</p>
          <div v-if="gameRunning" class="audio-running-warning" role="status">
            <v-icon icon="mdi-alert-circle-outline" size="14" />
            <span>游戏正在运行，确认修改时需要先退出游戏</span>
          </div>
        </div>
      </div>
    </template>

    <div class="audio-body">
      <div class="audio-options" aria-label="目标配音包">
        <button
          v-for="item in audioOptions"
          :key="item.value"
          :aria-pressed="selectedLanguages.includes(item.value)"
          :class="audioOptionState(item.value)"
          class="audio-option"
          :disabled="busy"
          type="button"
          @click="toggleAudio(item.value)"
        >
          <v-icon :icon="audioOptionIcon(item.value)" size="22" />
          <span>
            <strong>{{ item.label }}</strong>
            <small>{{ audioOptionLabel(item.value) }}</small>
          </span>
        </button>
      </div>

      <div v-if="busy && plan === null" class="audio-evaluating" role="status">
        <v-progress-circular color="var(--tgc-od-orange)" indeterminate size="24" width="2" />
        <div>
          <strong>{{ planProgress?.message ?? "正在准备语音资源评估…" }}</strong>
          <span v-if="planProgress !== null">
            步骤 {{ planProgress.step }} / {{ planProgress.total }}
          </span>
        </div>
      </div>

      <div v-if="plan !== null" class="audio-plan" aria-live="polite">
        <div class="audio-plan-heading">
          <div class="audio-plan-title">
            <span>语音变更计划已固化</span>
            <strong>{{ targetAudioLabel }}</strong>
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
          <div
            class="audio-plan-row audio-plan-row-primary"
            :class="{ 'audio-plan-row-wide': plan.deleteBytes > 0 }"
          >
            <div>
              <dt>预计下载</dt>
              <dd>{{ formatBytes(plan.downloadBytes - plan.cacheHitBytes) }}</dd>
            </div>
            <div>
              <dt>缓存命中</dt>
              <dd>{{ formatBytes(plan.cacheHitBytes) }}</dd>
            </div>
            <div>
              <dt>安装写入</dt>
              <dd>{{ formatBytes(plan.installBytes) }}</dd>
            </div>
            <div v-if="plan.deleteBytes > 0">
              <dt>删除占用</dt>
              <dd>{{ formatBytes(plan.deleteBytes) }}</dd>
            </div>
          </div>
          <div class="audio-plan-row audio-plan-row-secondary">
            <div>
              <dt>文件变化</dt>
              <dd>
                {{ plan.addCount }} 新增 · {{ plan.modifyCount }} 修改 · {{ plan.deleteCount }} 删除
              </dd>
            </div>
            <div>
              <dt>磁盘空间</dt>
              <dd>
                {{ formatBytes(plan.requiredFreeBytes) }} /
                {{ formatBytes(plan.availableFreeBytes) }}
              </dd>
            </div>
            <div>
              <dt>空间变更</dt>
              <dd :class="`space-change-${spaceChangeTone}`">
                {{ formatSignedBytes(spaceChangeBytes) }}
              </dd>
            </div>
          </div>
        </dl>
      </div>

      <PgNotice
        text="删除只涉及官方源清单独占、且目标清单不再引用的文件；不会按目录猜测或清理未知文件。"
        tone="info"
      />
      <PgNotice v-if="errorMessage !== null" :text="errorMessage" tone="error" />
    </div>

    <template #footer>
      <span class="audio-footer-hint">
        确认后会下载并自动应用；检测到游戏运行时将先询问是否退出。
      </span>
      <div class="audio-actions">
        <v-btn :disabled="busy" variant="text" @click="visible = false">取消</v-btn>
        <v-btn
          v-if="plan === null"
          :disabled="!selectionChanged || selectedLanguages.length === 0"
          :loading="busy"
          class="audio-confirm"
          color="var(--tgc-od-orange)"
          variant="flat"
          @click="evaluatePlan"
        >
          评估变更
        </v-btn>
        <v-btn
          v-else
          :disabled="!plan.hasSufficientSpace"
          :loading="busy"
          class="audio-confirm"
          color="var(--tgc-od-orange)"
          prepend-icon="mdi-check"
          variant="flat"
          @click="startTask"
        >
          确认修改
        </v-btn>
      </div>
    </template>
  </TopOverlay>
</template>

<script lang="ts" setup>
import TopOverlay from "@comp/app/top-overlay.vue";
import showDialog from "@comp/func/dialog.js";
import showSnackbar from "@comp/func/snackbar.js";
import useGameLauncherStore from "@store/gameLauncher.js";
import { createGamePackageAudioPlan, isGameRunning, stopGame } from "@utils/TGGameLauncher.js";
import { computed, ref, useId, watch } from "vue";

import PgNotice from "./pg-notice.vue";

type Props = {
  installation: TGApp.Game.Installation.Item;
};

type AudioOptionState = "added" | "available" | "installed" | "removed";

const { installation } = defineProps<Props>();
const emit = defineEmits<{ taskStarted: [] }>();
const visible = defineModel<boolean>({ required: true });
const titleId = useId();
const taskStore = useGameLauncherStore();
const audioOptions: Array<{ value: string; label: string }> = [
  { value: "zh-cn", label: "中文" },
  { value: "en-us", label: "英语" },
  { value: "ja-jp", label: "日语" },
  { value: "ko-kr", label: "韩语" },
];
const installedLanguages = computed<Array<string>>(() => [...installation.audioLanguages].sort());
const selectedLanguages = ref<Array<string>>([]);
const plan = ref<TGApp.Game.Package.PlanSummary | null>(null);
const planProgress = ref<TGApp.Game.Package.PlanProgress | null>(null);
const busy = ref<boolean>(false);
const errorMessage = ref<string | null>(null);
const gameRunning = ref<boolean>(false);

const selectionChanged = computed<boolean>(() => {
  return selectedLanguages.value.join("|") !== installedLanguages.value.join("|");
});
const targetAudioLabel = computed<string>(() => {
  return audioOptions
    .filter((item) => selectedLanguages.value.includes(item.value))
    .map((item) => item.label)
    .join("、");
});
const spaceChangeBytes = computed<number>(() => {
  if (plan.value === null) return 0;
  return plan.value.installBytes - plan.value.deleteBytes;
});
const spaceChangeTone = computed<"down" | "flat" | "up">(() => {
  if (spaceChangeBytes.value > 0) return "up";
  if (spaceChangeBytes.value < 0) return "down";
  return "flat";
});

function audioOptionState(language: string): AudioOptionState {
  const installed = installedLanguages.value.includes(language);
  const selected = selectedLanguages.value.includes(language);
  if (installed && selected) return "installed";
  if (!installed && selected) return "added";
  if (installed) return "removed";
  return "available";
}

function audioOptionIcon(language: string): string {
  switch (audioOptionState(language)) {
    case "added":
      return "mdi-plus-circle";
    case "installed":
      return "mdi-check-circle";
    case "removed":
      return "mdi-minus-circle-outline";
    default:
      return "mdi-circle-outline";
  }
}

function audioOptionLabel(language: string): string {
  switch (audioOptionState(language)) {
    case "added":
      return "将新增";
    case "installed":
      return "已安装";
    case "removed":
      return "将删除";
    default:
      return "未安装";
  }
}

function toggleAudio(language: string): void {
  if (selectedLanguages.value.includes(language)) {
    if (selectedLanguages.value.length === 1) return;
    selectedLanguages.value = selectedLanguages.value.filter((item) => item !== language);
  } else {
    selectedLanguages.value = [...selectedLanguages.value, language].sort();
  }
  plan.value = null;
  errorMessage.value = null;
}

async function evaluatePlan(): Promise<void> {
  if (!selectionChanged.value || selectedLanguages.value.length === 0 || busy.value) return;
  busy.value = true;
  plan.value = null;
  planProgress.value = null;
  errorMessage.value = null;
  try {
    plan.value = await createGamePackageAudioPlan(
      installation.id,
      selectedLanguages.value,
      (progress) => {
        planProgress.value = progress;
      },
    );
  } catch (error) {
    errorMessage.value = `评估配音包变更失败：${error}`;
  } finally {
    busy.value = false;
    planProgress.value = null;
  }
}

async function startTask(): Promise<void> {
  if (plan.value === null || !plan.value.hasSufficientSpace || busy.value) return;
  busy.value = true;
  errorMessage.value = null;
  try {
    gameRunning.value = await isGameRunning();
    if (gameRunning.value) {
      const confirmed = await showDialog.checkF({
        title: "退出游戏并修改配音包？",
        text: "检测到游戏正在运行。退出游戏后将立即开始本次配音包修改；取消则不安装。",
        confirmLabel: "退出游戏",
        cancelLabel: "取消安装",
        otcancel: true,
      });
      if (confirmed !== true) return;
      await stopGame();
      gameRunning.value = false;
    }
    await taskStore.startTask(plan.value);
    showSnackbar.success("配音包修改任务已开始");
    emit("taskStarted");
    visible.value = false;
  } catch (error) {
    errorMessage.value = `确认配音包修改失败：${error}`;
  } finally {
    busy.value = false;
  }
}

function reset(): void {
  selectedLanguages.value = [...installedLanguages.value];
  plan.value = null;
  planProgress.value = null;
  busy.value = false;
  errorMessage.value = null;
  gameRunning.value = false;
}

async function refreshGameRunningStatus(): Promise<void> {
  try {
    gameRunning.value = await isGameRunning();
  } catch (error) {
    errorMessage.value = `读取游戏运行状态失败：${error}`;
  }
}

function handleClose(): void {
  if (busy.value) visible.value = true;
}

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

function formatSignedBytes(bytes: number): string {
  if (bytes === 0) return formatBytes(0);
  return `${bytes > 0 ? "+" : "-"}${formatBytes(Math.abs(bytes))}`;
}

watch(
  visible,
  (value) => {
    if (value) {
      reset();
      void refreshGameRunningStatus();
    }
  },
  { immediate: true },
);
</script>

<style lang="scss" scoped>
.audio-header,
.audio-option,
.audio-plan-heading,
.audio-actions,
.audio-evaluating {
  display: flex;
  align-items: center;
}

.audio-header {
  min-width: 0;
  gap: 12px;

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

.audio-header-copy {
  display: grid;
  min-width: 0;
  gap: 2px;
}

.audio-running-warning {
  display: flex;
  align-items: center;
  color: var(--tgc-od-orange);
  font-size: 12px;
  gap: 4px;
  line-height: 18px;
}

.audio-header-icon {
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

.audio-body {
  display: grid;
  padding: 4px;
  gap: 16px;
}

.audio-options {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.audio-option {
  min-width: 0;
  padding: 12px;
  border: 1px solid var(--common-shadow-2);
  border-radius: 8px;
  background: var(--box-bg-2);
  color: var(--box-text-2);
  cursor: pointer;
  gap: 12px;
  text-align: left;

  &.installed {
    border-color: var(--tgc-od-green);
    color: var(--common-text-title);

    > .v-icon {
      color: var(--tgc-od-green);
    }
  }

  &.added {
    border-color: var(--tgc-od-orange);
    box-shadow: inset 0 0 0 1px var(--tgc-od-orange);
    color: var(--common-text-title);

    > .v-icon {
      color: var(--tgc-od-orange);
    }
  }

  &.removed {
    border-color: var(--tgc-od-red);
    box-shadow: inset 0 0 0 1px var(--tgc-od-red);
    color: var(--tgc-od-red);

    > .v-icon {
      color: var(--tgc-od-red);
    }
  }

  &:disabled {
    cursor: default;
    opacity: 0.6;
  }

  &:hover:not(:disabled) {
    background: var(--box-bg-4);
  }

  > span {
    display: grid;
    min-width: 0;
    gap: 2px;
  }

  strong {
    font-size: 14px;
    line-height: 20px;
  }

  small {
    color: var(--box-text-2);
    font-size: 12px;
    line-height: 16px;
  }
}

.audio-evaluating {
  padding: 16px;
  border-radius: 8px;
  background: var(--box-bg-2);
  gap: 12px;

  > div {
    display: grid;
    gap: 2px;
  }

  strong {
    color: var(--common-text-title);
    font-size: 14px;
    line-height: 20px;
  }

  span {
    color: var(--box-text-2);
    font-size: 12px;
    line-height: 16px;
  }
}

.audio-plan {
  display: grid;
  padding: 12px;
  border-radius: 8px;
  background: var(--box-bg-2);
  gap: 12px;

  dl {
    display: grid;
    margin: 0;
    gap: 8px;
  }

  dl div,
  dt,
  dd {
    margin: 0;
  }

  .audio-plan-row {
    display: grid;
    gap: 8px;

    > div {
      display: grid;
      min-width: 0;
      padding: 8px;
      border: 1px solid var(--common-shadow-1);
      border-radius: 4px;
      background: var(--box-bg-1);
      gap: 3px;
    }
  }

  .audio-plan-row-primary {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .audio-plan-row-primary.audio-plan-row-wide {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .audio-plan-row-secondary {
    grid-template-columns: auto minmax(0, 1fr) minmax(0, 1fr);
  }

  dt,
  dd {
    font-size: 12px;
    line-height: 16px;
  }

  dt {
    color: var(--box-text-2);
  }

  dd {
    color: var(--common-text-title);
    font-weight: 600;
    overflow-wrap: anywhere;
  }

  dd.space-change-up {
    color: var(--tgc-od-orange);
  }

  dd.space-change-down {
    color: var(--tgc-od-green);
  }
}

.audio-plan-heading {
  justify-content: space-between;
  gap: 8px;

  .audio-plan-title {
    display: grid;
    gap: 2px;
  }

  span {
    color: var(--box-text-2);
    font-size: 12px;
    line-height: 16px;
  }

  strong {
    color: var(--common-text-title);
    font-family: var(--font-title);
    font-size: 16px;
    font-weight: normal;
    line-height: 22px;
  }
}

.audio-footer-hint {
  color: var(--box-text-2);
  font-size: 12px;
  line-height: 16px;
}

.audio-actions {
  flex-shrink: 0;
  gap: 8px;
}

.audio-confirm {
  color: var(--box-text-1);
}

@media (width <= 560px) {
  .audio-options {
    grid-template-columns: 1fr;
  }

  .audio-plan {
    .audio-plan-row-primary,
    .audio-plan-row-secondary {
      grid-template-columns: 1fr;
    }
  }
}
</style>
