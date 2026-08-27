<!-- 全新安装向导浮层：渠道、安装路径、语音包与安装计划 -->
<template>
  <TopOverlay
    v-model="visible"
    :outerClose="false"
    :showShare="false"
    :titleId
    closeAriaLabel="关闭安装"
    contentMaxHeight="none"
    panelWidth="720px"
    topOffset="64px"
    @close="handleOverlayClose"
  >
    <template #header>
      <div class="install-header">
        <div class="install-heading">
          <div class="install-heading-main">
            <div aria-hidden="true" class="install-heading-icon">
              <div class="install-heading-icon-wrap">
                <img alt="" class="install-heading-icon-main" src="/platforms/mhy/launcher.webp" />
                <span class="install-heading-icon-badge">
                  <v-icon icon="mdi-download" size="12" />
                </span>
              </div>
            </div>
            <div class="install-heading-copy">
              <h2 :id="titleId">{{ currentStepTitle }}</h2>
              <p class="install-step-description">{{ currentStepDescription }}</p>
              <p v-if="headingHint !== ''" class="install-note">
                <v-icon icon="mdi-information-outline" size="16" />
                <span>{{ headingHint }}</span>
              </p>
            </div>
          </div>
        </div>
        <v-stepper v-model="step" alt-labels class="install-stepper" flat>
          <v-stepper-header>
            <template v-for="item in steps" :key="item.id">
              <v-stepper-item
                :complete="step > item.id"
                :disabled="item.id > step"
                :title="item.label"
                :value="item.id"
              />
              <v-divider v-if="item.id < steps.length" />
            </template>
          </v-stepper-header>
        </v-stepper>
      </div>
    </template>

    <div class="install-body">
      <section v-if="step === 1" class="install-section">
        <div class="install-options">
          <button
            v-for="item in schemes"
            :key="item.value"
            :aria-pressed="scheme === item.value"
            :class="{ selected: scheme === item.value }"
            class="install-option"
            type="button"
            @click="scheme = item.value"
          >
            <v-icon :icon="scheme === item.value ? 'mdi-check-circle' : 'mdi-circle-outline'" />
            <span class="install-option-copy">
              <span class="install-option-title">
                <strong>{{ item.label }}</strong>
                <v-chip
                  v-if="installedSchemeValues.includes(item.value)"
                  class="install-option-tag"
                  size="x-small"
                  variant="tonal"
                >
                  已安装
                </v-chip>
              </span>
              <small>{{ item.hint }}</small>
            </span>
          </button>
        </div>
      </section>

      <section v-else-if="step === 2" class="install-section">
        <div class="install-location">
          <v-icon icon="mdi-folder-outline" />
          <div class="install-location-copy">
            <span>{{ installRoot ?? "尚未选择目录" }}</span>
          </div>
          <v-chip
            v-if="locationSummary !== null"
            :color="locationColor"
            size="small"
            variant="tonal"
          >
            {{ locationStatusLabel }}
          </v-chip>
          <v-btn
            :disabled="busy"
            aria-label="选择安装目录"
            class="install-location-action"
            size="small"
            title="选择安装目录"
            variant="tonal"
            @click="pickInstallRoot"
          >
            <v-icon icon="mdi-folder-open" />
          </v-btn>
        </div>
        <PgNotice
          v-if="locationSummary?.kind === locationKind.OCCUPIED"
          :text="locationSummary.message ?? '当前目录不可用于安装'"
          tone="warning"
        />
        <PgNotice
          v-else-if="existingInstallation !== null && !existingInstallUsable"
          :text="existingInstallation.statusMessage"
          tone="warning"
        />
      </section>

      <section v-else-if="step === 3 && !isExistingInstall" class="install-section">
        <div class="audio-options">
          <button
            v-for="item in audioOptions"
            :key="item.value"
            :aria-pressed="audioLanguages.includes(item.value)"
            :class="{ selected: audioLanguages.includes(item.value) }"
            class="audio-option"
            :disabled="busy"
            type="button"
            @click="toggleAudio(item.value)"
          >
            <v-icon
              :icon="
                audioLanguages.includes(item.value)
                  ? 'mdi-checkbox-marked'
                  : 'mdi-checkbox-blank-outline'
              "
              size="22"
            />
            <span>{{ item.label }}</span>
          </button>
        </div>
      </section>

      <section v-else-if="step === 3" class="install-section install-review">
        <div v-if="existingInstallation !== null" class="review-facts">
          <div><span>操作</span><strong>完整性校验</strong></div>
          <div>
            <span>渠道</span>
            <strong>{{ gameEnum.installation.schemeDesc(existingInstallation.schemeId) }}</strong>
          </div>
          <div>
            <span>游戏版本</span><strong>{{ existingInstallation.version ?? "未读取版本" }}</strong>
          </div>
          <div>
            <span>已安装语音</span>
            <div v-if="installedAudioLabels.length > 0" class="review-fact-tags">
              <v-chip
                v-for="label in installedAudioLabels"
                :key="label"
                size="x-small"
                variant="tonal"
              >
                {{ label }}
              </v-chip>
            </div>
            <strong v-else>未读取</strong>
          </div>
          <div class="review-fact-wide">
            <span>安装位置</span><strong>{{ planLocation }}</strong>
          </div>
        </div>
      </section>

      <section v-else class="install-section install-review">
        <div v-if="plan === null && busy" aria-live="polite" class="install-evaluation-loading">
          <v-progress-circular color="var(--tgc-od-orange)" indeterminate size="24" width="2" />
          <div>
            <strong>
              正在评估安装
              <template v-if="planProgress !== null">
                · {{ planProgress.step }} / {{ planProgress.total }}
              </template>
            </strong>
            <span>{{ planProgress?.message ?? "正在准备安装评估…" }}</span>
          </div>
        </div>
        <div v-else-if="plan !== null" class="review-facts">
          <div>
            <span>渠道</span><strong>{{ gameEnum.installation.schemeDesc(scheme) }}</strong>
          </div>
          <div>
            <span>语音包</span><strong>{{ selectedAudioLabel }}</strong>
          </div>
          <div class="review-fact-wide">
            <span>安装位置</span><strong>{{ planLocation }}</strong>
          </div>
          <div>
            <span>预计下载</span>
            <strong>{{ formatBytes(Math.max(0, plan.downloadBytes - plan.cacheHitBytes)) }}</strong>
          </div>
          <div>
            <span>已命中缓存</span><strong>{{ formatBytes(plan.cacheHitBytes) }}</strong>
          </div>
          <div>
            <span>安装后占用（估算）</span><strong>{{ formatBytes(plan.installBytes) }}</strong>
          </div>
          <div>
            <span>需预留空间</span><strong>{{ formatBytes(plan.installRequiredFreeBytes) }}</strong>
          </div>
          <div>
            <span>任务临时空间（峰值）</span
            ><strong>{{ formatBytes(plan.cacheRequiredFreeBytes) }}</strong>
          </div>
          <div>
            <span>完成后预计释放</span>
            <strong>{{ formatBytes(Math.max(0, plan.downloadBytes - plan.cacheHitBytes)) }}</strong>
          </div>
          <div>
            <span>任务临时空间可用</span
            ><strong>{{ formatBytes(plan.cacheAvailableFreeBytes) }}</strong>
          </div>
          <div>
            <span>安装盘可用</span
            ><strong>{{ formatBytes(plan.installAvailableFreeBytes) }}</strong>
          </div>
          <div>
            <span>缓存与安装磁盘</span><strong>{{ plan.sameVolume ? "同一卷" : "不同卷" }}</strong>
          </div>
          <p class="review-space-note">
            临时空间按并发队列内最大的资源工作集估算，包含 256 MiB 基础窗口与 1 GiB
            安全余量；资源完成组装后会滚动释放。
          </p>
        </div>
        <div v-if="plan !== null" class="install-preserve-cache">
          <v-checkbox
            v-model="preserveChunks"
            :disabled="busy"
            :hide-details="true"
            class="install-preserve-cache-toggle"
            density="compact"
            label="组装完成后保留下载分片到共享缓存"
          />
          <p class="install-preserve-cache-hint">
            勾选后，已下载分片在组装完成后会转入共享缓存，供后续更新或重新安装复用；需要应用缓存目录所在磁盘额外预留约
            {{ formatBytes(preserveCacheRequiredBytes) }} 空间。
          </p>
          <PgNotice
            v-if="preserveChunks && !preserveCacheSpaceSufficient"
            :text="preserveCacheSpaceGuidance"
            tone="warning"
          />
        </div>
        <PgNotice
          v-if="plan !== null && !plan.hasSufficientSpace"
          :text="spaceGuidance"
          tone="warning"
        />
        <PgNotice v-if="errorMessage !== null" :text="errorMessage" tone="error" />
      </section>
    </div>

    <template #footer>
      <span class="install-footer-hint">{{ footerHint }}</span>
      <div class="install-actions">
        <v-btn :disabled="busy" variant="text" @click="onCancel">取消</v-btn>
        <v-btn v-if="step > 1" :disabled="busy" variant="text" @click="goBack">上一步</v-btn>
        <v-btn
          :disabled="!canContinue"
          :loading="busy"
          class="install-confirm"
          color="var(--tgc-od-orange)"
          variant="flat"
          @click="onContinue"
        >
          {{ continueLabel }}
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
import TSGameInstallation from "@Sqlm/gameInstallation.js";
import useGameLauncherStore from "@store/gameLauncher.js";
import { open } from "@tauri-apps/plugin-dialog";
import {
  addGameInstallDefenderExclusions,
  cancelGameInstallDraft,
  createGameInstallDraft,
  createGameInstallPlan,
  getGameInstallDraftDirs,
  inspectGameInstallLocation,
  removeGameInstallDefenderExclusions,
} from "@utils/TGGameLauncher.js";
import { computed, ref, useId, watch } from "vue";

import PgNotice from "./pg-notice.vue";

const visible = defineModel<boolean>({ required: true });
const emit = defineEmits<{ completed: [] }>();
const titleId = useId();
const taskStore = useGameLauncherStore();

type Scheme = TGApp.Game.Installation.SchemeEnum;
type Step = 1 | 2 | 3 | 4;
type InstallInitialConfig = {
  scheme: Scheme;
  installRoot: string | null;
  audioLanguages: Array<string>;
  taskId: string;
  installationId: string;
};
type Props = {
  installedSchemes?: Array<Scheme>;
  initialConfig?: InstallInitialConfig | null;
};

const props = defineProps<Props>();
const installedSchemes = computed<Array<Scheme>>(() => props.installedSchemes ?? []);

const stepDefinitions: Array<{ id: Step; label: string; marker: string }> = [
  { id: 1, label: "渠道", marker: "①" },
  { id: 2, label: "位置", marker: "②" },
  { id: 3, label: "语音", marker: "③" },
  { id: 4, label: "安装", marker: "④" },
];
const schemes: Array<{ value: Scheme; label: string; hint: string }> = [
  {
    value: gameEnum.installation.scheme.CN_OFFICIAL,
    label: "国服官服",
    hint: "使用官方客户端渠道",
  },
  {
    value: gameEnum.installation.scheme.CN_BILIBILI,
    label: "国服 B 服",
    hint: "安装并写入 B 服渠道 SDK",
  },
];
const audioOptions: Array<{ value: string; label: string }> = [
  { value: "zh-cn", label: "中文" },
  { value: "en-us", label: "英语" },
  { value: "ja-jp", label: "日语" },
  { value: "ko-kr", label: "韩语" },
];
const locationKind = gameEnum.installation.locationKind;
const step = ref<Step>(1);
const scheme = ref<Scheme>(props.initialConfig?.scheme ?? resolveDefaultScheme());
const installRoot = ref<string | null>(props.initialConfig?.installRoot ?? null);
const audioLanguages = ref<Array<string>>(
  props.initialConfig === null || props.initialConfig === undefined
    ? ["zh-cn"]
    : [...props.initialConfig.audioLanguages],
);
const locationSummary = ref<TGApp.Game.Installation.InstallLocationSummary | null>(null);
const draft = ref<TGApp.Game.Installation.InstallDraftSummary | null>(null);
const plan = ref<TGApp.Game.Package.PlanSummary | null>(null);
const planProgress = ref<TGApp.Game.Package.PlanProgress | null>(null);
const preserveChunks = ref<boolean>(false);
const busy = ref<boolean>(false);
const errorMessage = ref<string | null>(null);
const editingTaskRolledBack = ref<boolean>(false);
const existingInstallation = computed<TGApp.Game.Installation.Item | null>(() => {
  if (locationSummary.value?.kind !== locationKind.EXISTING) return null;
  return locationSummary.value.installation;
});
const installedSchemeValues = computed<Array<Scheme>>(() => {
  const values = [...installedSchemes.value];
  const detectedScheme = existingInstallation.value?.schemeId;
  if (detectedScheme !== null && detectedScheme !== undefined && !values.includes(detectedScheme)) {
    values.push(detectedScheme);
  }
  return values;
});
const isExistingLocation = computed<boolean>(
  () => locationSummary.value?.kind === locationKind.EXISTING,
);
const existingInstallUsable = computed<boolean>(
  () => existingInstallation.value?.status === gameEnum.installation.status.KNOWN,
);
const isExistingInstall = computed<boolean>(
  () => isExistingLocation.value && existingInstallUsable.value,
);
const steps = computed<Array<{ id: Step; label: string; marker: string }>>(() => {
  if (!isExistingInstall.value) return stepDefinitions;
  return stepDefinitions
    .filter((item) => item.id !== 4)
    .map((item) => (item.id === 3 ? { ...item, label: "校验" } : item));
});
const planLocation = computed<string>(() => installRoot.value ?? "未选择");
const selectedAudioLabel = computed<string>(() => {
  const labels = audioOptions
    .filter((item) => audioLanguages.value.includes(item.value))
    .map((item) => item.label);
  return labels.join("、") || "未选择";
});
const installedAudioLabels = computed<Array<string>>(() => {
  const languages = existingInstallation.value?.audioLanguages ?? [];
  return audioOptions.filter((item) => languages.includes(item.value)).map((item) => item.label);
});
const locationStatusLabel = computed<string>(() => {
  switch (locationSummary.value?.kind) {
    case locationKind.EMPTY:
      return "空目录";
    case locationKind.EXISTING:
      return existingInstallUsable.value ? "已有游戏" : "需处理";
    case locationKind.OCCUPIED:
      return "目录被占用";
    default:
      return "未检测";
  }
});
const locationColor = computed<string>(() => {
  if (locationSummary.value?.kind === locationKind.EMPTY) return "success";
  if (isExistingInstall.value) return "info";
  return "warning";
});
const currentStepTitle = computed<string>(() => {
  const item = steps.value.find((stepItem) => stepItem.id === step.value);
  if (item === undefined) return "安装游戏本体";
  let title = item.label;
  if (step.value === 1) title = "选择渠道";
  if (step.value === 2) title = "选择安装目录";
  if (step.value === 3) title = isExistingInstall.value ? "确认完整性校验" : "选择语音包";
  if (step.value === 4) title = plan.value === null ? "评估安装" : "确认安装";
  return `安装游戏本体 - ${item.marker}${title}`;
});
const currentStepDescription = computed<string>(() => {
  if (step.value === 1) return "选择要安装的客户端渠道。";
  if (step.value === 2 && isExistingInstall.value) {
    return "已检测到完整游戏目录，下一步将直接进行完整性评估。";
  }
  if (step.value === 2) return "选择空目录直接安装，或选择已有游戏目录执行完整性校验。";
  if (step.value === 3) {
    if (isExistingInstall.value) return "确认现有游戏目录后，继续读取远端清单校验本地文件。";
    return "至少选择一个语音包，安装后仍可通过官方客户端补充其他语音。";
  }
  if (plan.value === null) return "正在读取远端资源清单并计算安装所需空间，请稍候。";
  return "将下载主分支完整资源，并在目标磁盘完成原子发布。";
});
const headingHint = computed<string>(() => {
  if (isExistingInstall.value) return "选择已有游戏目录后，会登记为本地游戏并执行完整性校验。";
  return "";
});
const canContinue = computed<boolean>(() => {
  if (busy.value) return false;
  if (step.value === 1) return true;
  if (step.value === 2) {
    return (
      locationSummary.value !== null &&
      (locationSummary.value.kind === locationKind.EMPTY || existingInstallUsable.value)
    );
  }
  if (step.value === 3) return isExistingInstall.value || audioLanguages.value.length > 0;
  if (plan.value === null) {
    return errorMessage.value !== null && locationSummary.value?.kind === locationKind.EMPTY;
  }
  return (
    plan.value !== null &&
    plan.value.hasSufficientSpace &&
    (!preserveChunks.value || preserveCacheSpaceSufficient.value)
  );
});
const continueLabel = computed<string>(() => {
  if (step.value === 3 && isExistingInstall.value) return "开始完整性校验";
  if (step.value === 3) return "评估安装";
  if (step.value === 4 && plan.value === null) return "重新评估";
  if (step.value === 4) return "开始安装";
  return "继续";
});
const footerHint = computed<string>(() => {
  if (step.value === 3 && isExistingInstall.value) return "完整性校验不会删除或覆盖现有游戏文件";
  if (step.value === 4 && plan.value === null) return "评估期间不会修改游戏目录";
  if (step.value === 4) return "计划会同时校验缓存盘与安装盘空间";
  return "安装完成前不会修改或登记现有游戏";
});
const spaceGuidance = computed<string>(() => {
  if (plan.value === null || plan.value.hasSufficientSpace) return "";
  const cacheShortage = Math.max(
    0,
    plan.value.cacheRequiredFreeBytes - plan.value.cacheAvailableFreeBytes,
  );
  const installShortage = Math.max(
    0,
    plan.value.installRequiredFreeBytes - plan.value.installAvailableFreeBytes,
  );
  const parts: Array<string> = [];
  if (cacheShortage > 0) parts.push(`缓存盘还需 ${formatBytes(cacheShortage)}`);
  if (installShortage > 0) parts.push(`安装盘还需 ${formatBytes(installShortage)}`);
  if (parts.length === 0) {
    return "当前磁盘峰值空间不足，请释放缓存或安装盘空间后重新评估。";
  }
  return `${parts.join("；")}。请释放空间后重新评估。`;
});
const preserveCacheRequiredBytes = computed<number>(() => {
  if (plan.value === null) return 0;
  return Math.max(0, plan.value.downloadBytes - plan.value.cacheHitBytes) + 1024 * 1024 * 1024;
});
const preserveCacheSpaceSufficient = computed<boolean>(() => {
  if (plan.value === null) return true;
  return plan.value.cacheStorageAvailableFreeBytes >= preserveCacheRequiredBytes.value;
});
const preserveCacheSpaceGuidance = computed<string>(() => {
  if (plan.value === null) return "";
  const shortage = Math.max(
    0,
    preserveCacheRequiredBytes.value - plan.value.cacheStorageAvailableFreeBytes,
  );
  return `应用缓存目录所在磁盘可用空间不足：保留分片需要约 ${formatBytes(
    preserveCacheRequiredBytes.value,
  )}，当前仅 ${formatBytes(
    plan.value.cacheStorageAvailableFreeBytes,
  )}，还需 ${formatBytes(shortage)}。请释放应用缓存磁盘空间或取消勾选。`;
});

function resolveDefaultScheme(): Scheme {
  for (const item of schemes) {
    if (!installedSchemes.value.includes(item.value)) return item.value;
  }
  return schemes[0].value;
}

function formatBytes(value: number): string {
  if (value < 1024) return `${value} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let size = value;
  let unit = -1;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[unit]}`;
}

function toggleAudio(language: string): void {
  if (audioLanguages.value.includes(language)) {
    if (audioLanguages.value.length <= 1) return;
    audioLanguages.value = audioLanguages.value.filter((item) => item !== language);
    return;
  }
  audioLanguages.value = [...audioLanguages.value, language];
}

async function pickInstallRoot(): Promise<void> {
  if (busy.value) return;
  const selected = await open({ directory: true, multiple: false });
  if (typeof selected !== "string") return;
  busy.value = true;
  errorMessage.value = null;
  try {
    const summary = await inspectGameInstallLocation(selected);
    installRoot.value = selected;
    locationSummary.value = summary;
    draft.value = null;
    plan.value = null;
    if (summary.installation !== null) {
      audioLanguages.value = [...summary.installation.audioLanguages];
    } else {
      audioLanguages.value = ["zh-cn"];
    }
  } catch (error) {
    installRoot.value = selected;
    locationSummary.value = null;
    errorMessage.value = String(error);
    showSnackbar.error(`检查安装目录失败：${error}`);
  } finally {
    busy.value = false;
  }
}

async function restoreInitialInstallLocation(root: string): Promise<void> {
  busy.value = true;
  errorMessage.value = null;
  try {
    const summary = await inspectGameInstallLocation(root);
    if (installRoot.value === root) locationSummary.value = summary;
  } catch (error) {
    errorMessage.value = String(error);
    showSnackbar.error(`检查原安装目录失败：${error}`);
  } finally {
    busy.value = false;
  }
}

async function onContinue(): Promise<void> {
  if (!canContinue.value) return;
  errorMessage.value = null;
  if (step.value < steps.value.length) {
    if (step.value === 3 && !isExistingInstall.value) {
      await createPlan();
      return;
    }
    step.value = <Step>(step.value + 1);
    return;
  }
  if (isExistingInstall.value) {
    await startIntegrityCheck();
    return;
  }
  if (plan.value === null) {
    await createPlan();
    return;
  }
  await startInstall();
}

async function goBack(): Promise<void> {
  if (busy.value || step.value <= 1) return;
  if (draft.value !== null) {
    busy.value = true;
    try {
      await cancelGameInstallDraft(draft.value.installId);
      draft.value = null;
      plan.value = null;
      emit("completed");
    } catch (error) {
      errorMessage.value = String(error);
      showSnackbar.error(`清理安装评估失败：${error}`);
      return;
    } finally {
      busy.value = false;
    }
  }
  step.value = <Step>(step.value - 1);
}

async function createPlan(): Promise<void> {
  if (installRoot.value === null || locationSummary.value?.kind !== locationKind.EMPTY) return;
  step.value = 4;
  busy.value = true;
  planProgress.value = null;
  try {
    if (draft.value === null) {
      const initialConfig = props.initialConfig;
      if (initialConfig !== null && initialConfig !== undefined && !editingTaskRolledBack.value) {
        await taskStore.recoverInstall(
          initialConfig.taskId,
          initialConfig.installationId,
          gameEnum.package.recoveryAction.ROLLBACK,
          true,
        );
        editingTaskRolledBack.value = true;
        emit("completed");
      }
      draft.value = await createGameInstallDraft(
        installRoot.value,
        scheme.value,
        audioLanguages.value,
      );
      emit("completed");
    }
    plan.value = await createGameInstallPlan(draft.value.installId, (progress) => {
      planProgress.value = progress;
    });
    step.value = 4;
  } catch (error) {
    errorMessage.value = String(error);
    showSnackbar.error(`创建安装计划失败：${error}`);
  } finally {
    busy.value = false;
    planProgress.value = null;
  }
}

async function startInstall(): Promise<void> {
  if (draft.value === null || plan.value === null) return;
  const currentDraft = draft.value;
  const currentPlan = plan.value;
  let dirs: TGApp.Game.Installation.InstallDraftDirs;
  try {
    dirs = await getGameInstallDraftDirs(currentDraft.installId);
  } catch (error) {
    errorMessage.value = String(error);
    showSnackbar.error(`读取安装目录失败：${error}`);
    return;
  }
  const exclusionText = [
    "为避免 Defender 实时防护扫描导致安装磁盘 I/O 停滞，开始安装前将临时把以下目录加入排除列表，安装完成后自动移出：",
    `目标目录：${dirs.targetRoot}`,
    `临时 spool：${dirs.spoolRoot}`,
    `下载缓存：${dirs.downloadRoot}`,
    "",
    "此操作需要 UAC 管理员授权。",
  ].join("\n");
  const confirmed = await showDialog.checkF({
    title: "添加 Windows Defender 排除",
    text: exclusionText,
    confirmLabel: "添加排除并开始安装",
  });
  if (confirmed !== true) return;
  busy.value = true;
  errorMessage.value = null;
  try {
    await addGameInstallDefenderExclusions(currentDraft.installId, currentPlan.planId);
  } catch (error) {
    errorMessage.value = String(error);
    showSnackbar.error(`添加 Defender 排除失败：${error}`);
    busy.value = false;
    return;
  }
  visible.value = false;
  emit("completed");
  try {
    await taskStore.startInstall(currentDraft, currentPlan, {
      preserveChunks: preserveChunks.value,
    });
    reset();
    showSnackbar.success("已开始安装，进度可在游戏安装页查看");
  } catch (error) {
    void removeGameInstallDefenderExclusions(currentPlan.planId).catch(() => {});
    showSnackbar.error(`启动游戏安装失败：${error}`);
  } finally {
    busy.value = false;
  }
}

async function startIntegrityCheck(): Promise<void> {
  const installation = existingInstallation.value;
  if (installation === null || !existingInstallUsable.value) return;
  const confirmed = await showDialog.checkF({
    title: "开始完整性校验？",
    text: "会对照当前安装版本清单扫描本地文件，可能需要较长时间。游戏可以继续运行。",
    confirmLabel: "开始校验",
  });
  if (confirmed !== true) return;
  busy.value = true;
  try {
    await TSGameInstallation.save(installation);
    await taskStore.startVerify(installation.id);
    emit("completed");
    reset();
    visible.value = false;
    showSnackbar.success("已开始完整性校验");
  } catch (error) {
    errorMessage.value = String(error);
    showSnackbar.error(`启动完整性校验失败：${error}`);
  } finally {
    busy.value = false;
  }
}

async function onCancel(): Promise<void> {
  if (busy.value) return;
  if (props.initialConfig !== null && props.initialConfig !== undefined) {
    const decision = await showDialog.checkF({
      title: "取消修改安装配置？",
      text: "保持原有修改会继续保留当前安装任务。",
      confirmLabel: "保持原有修改",
      cancelLabel: "取消本次安装",
    });
    if (decision !== false) {
      visible.value = true;
      return;
    }
    busy.value = true;
    try {
      if (draft.value !== null) {
        await cancelGameInstallDraft(draft.value.installId);
        draft.value = null;
      }
      const initialConfig = props.initialConfig;
      if (!editingTaskRolledBack.value) {
        await taskStore.recoverInstall(
          initialConfig.taskId,
          initialConfig.installationId,
          gameEnum.package.recoveryAction.ROLLBACK,
          true,
        );
        editingTaskRolledBack.value = true;
      }
      emit("completed");
      reset();
      visible.value = false;
    } catch (error) {
      errorMessage.value = String(error);
      showSnackbar.error(`取消安装失败：${error}`);
      visible.value = true;
    } finally {
      busy.value = false;
    }
    return;
  }
  const confirmed = await showDialog.check("取消安装", "确认取消安装？");
  if (confirmed !== true) {
    visible.value = true;
    return;
  }
  if (draft.value !== null) {
    busy.value = true;
    try {
      await cancelGameInstallDraft(draft.value.installId);
      emit("completed");
    } catch (error) {
      errorMessage.value = String(error);
      showSnackbar.error(`取消安装评估失败：${error}`);
      visible.value = true;
      return;
    } finally {
      busy.value = false;
    }
  }
  reset();
  visible.value = false;
}

function handleOverlayClose(): void {
  visible.value = true;
  void onCancel();
}

function reset(): void {
  const initialConfig = props.initialConfig;
  step.value = 1;
  scheme.value = initialConfig?.scheme ?? resolveDefaultScheme();
  installRoot.value = initialConfig?.installRoot ?? null;
  audioLanguages.value =
    initialConfig === null || initialConfig === undefined
      ? ["zh-cn"]
      : [...initialConfig.audioLanguages];
  locationSummary.value = null;
  draft.value = null;
  plan.value = null;
  planProgress.value = null;
  preserveChunks.value = false;
  busy.value = false;
  errorMessage.value = null;
  editingTaskRolledBack.value = false;
}

watch(
  visible,
  (value) => {
    if (!value) return;
    reset();
    const root = props.initialConfig?.installRoot;
    if (root !== null && root !== undefined) void restoreInitialInstallLocation(root);
  },
  { immediate: true },
);
</script>

<style lang="scss" scoped>
.install-header,
.install-heading,
.install-section {
  display: flex;
  flex-direction: column;
}

.install-header {
  min-width: 0;
  flex: 1;
  gap: 8px;
}

.install-heading {
  min-width: 0;
  gap: 4px;

  h2,
  p {
    margin: 0;
  }

  h2 {
    overflow: hidden;
    min-width: 0;
    color: var(--common-text-title);
    font-family: var(--font-title);
    font-size: 20px;
    font-weight: normal;
    line-height: 26px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.install-heading-main {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 12px;
}

.install-heading-icon {
  display: flex;
  width: 48px;
  height: 48px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: var(--common-shadow-t-2);
}

.install-heading-icon-wrap {
  position: relative;
  width: 32px;
  height: 32px;
}

.install-heading-icon-main {
  width: 32px;
  height: 32px;
  border-radius: 4px;
  filter: var(--icon-filter);
  object-fit: contain;
}

.install-heading-icon-badge {
  position: absolute;
  right: -4px;
  bottom: -4px;
  display: flex;
  width: 16px;
  height: 16px;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--dialog-header-bg);
  border-radius: 50%;
  background: var(--tgc-od-orange);
  color: var(--app-page-bg);
}

.install-heading-copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 2px;

  p {
    color: var(--box-text-2);
    font-size: 12px;
    line-height: 18px;
  }
}

.install-note {
  display: flex;
  max-width: 100%;
  align-items: center;
  align-self: flex-end;
  justify-content: flex-end;
  color: var(--box-text-2);
  font-size: 12px;
  gap: 4px;
  line-height: 16px;
  text-align: end;

  .v-icon {
    flex-shrink: 0;
  }
}

.install-step-description {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.install-stepper {
  width: 100%;
  background: transparent;
  box-shadow: none;

  :deep(.v-stepper-header) {
    overflow: visible;
    min-height: 56px;
    padding: 0;
    box-shadow: none;
  }

  :deep(.v-stepper-item) {
    min-width: 0;
    flex: 1 1 0;
    flex-basis: 0;
    padding: 0 8px 4px;
  }

  :deep(.v-stepper-header .v-divider) {
    flex: 1 1 auto;
    margin: 12px 0 0;
  }

  :deep(.v-stepper-item__avatar.v-avatar) {
    background: var(--box-bg-2);
    color: var(--box-text-2);
  }

  :deep(.v-stepper-item--selected .v-stepper-item__avatar.v-avatar),
  :deep(.v-stepper-item--complete .v-stepper-item__avatar.v-avatar) {
    background: var(--tgc-od-orange);
    color: var(--app-page-bg);
  }

  :deep(.v-stepper-item__title) {
    color: var(--box-text-2);
    font-size: 12px;
    line-height: 16px;
  }

  :deep(.v-stepper-item--selected .v-stepper-item__title),
  :deep(.v-stepper-item--complete .v-stepper-item__title) {
    color: var(--common-text-title);
  }
}

.install-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.install-section {
  gap: 8px;
}

.install-evaluation-loading {
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

.install-review {
  padding: 12px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--box-bg-1);
}

.install-options {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.install-option,
.install-location {
  display: flex;
  min-width: 0;
  align-items: center;
  padding: 12px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--box-bg-1);
  color: var(--box-text-4);
  gap: 8px;
  text-align: start;
}

.install-option {
  cursor: pointer;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.64;
  }

  &.selected {
    border-color: var(--tgc-od-orange);
    background: color-mix(in srgb, var(--tgc-od-orange) 10%, var(--box-bg-1));
  }
}

.install-option-copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 3px;
}

.install-option-title {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
}

.install-option-title strong {
  overflow: hidden;
  min-width: 0;
  color: var(--common-text-title);
  font-size: 14px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.install-option-copy small {
  color: var(--box-text-2);
  font-size: 12px;
}

.install-option-tag {
  flex-shrink: 0;
}

.install-location {
  align-items: center;
}

.install-location-copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 3px;

  span {
    color: var(--common-text-title);
    font-size: 14px;
    line-height: 20px;
    overflow-wrap: anywhere;
  }
}

.install-location-action {
  min-width: 36px;
  flex-shrink: 0;
  padding: 0;
  border-radius: 4px;
}

.audio-options {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 16px;
}

.audio-option {
  display: flex;
  min-width: 0;
  min-height: 40px;
  flex: 1 1 0;
  align-items: center;
  justify-content: center;
  padding: 4px 8px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--box-bg-1);
  color: var(--box-text-4);
  cursor: pointer;
  gap: 6px;

  &.selected {
    border-color: var(--tgc-od-orange);
    background: color-mix(in srgb, var(--tgc-od-orange) 10%, var(--box-bg-1));
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.64;
  }
}

.install-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.review-facts {
  display: grid;
  gap: 6px;
  grid-template-columns: repeat(2, minmax(0, 1fr));

  > div {
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

.review-fact-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.review-space-note {
  margin: 2px 4px 0;
  color: var(--box-text-2);
  font-size: 11px;
  grid-column: 1 / -1;
  line-height: 16px;
}

.install-preserve-cache {
  display: flex;
  flex-direction: column;
  padding: 8px 10px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 6px;
  margin-top: 8px;
  background: var(--box-bg-2);
  gap: 2px;
}

.install-preserve-cache-toggle {
  align-self: flex-start;
  color: var(--common-text-title);
}

.install-preserve-cache-hint {
  margin: 0 2px;
  color: var(--box-text-2);
  font-size: 11px;
  line-height: 16px;
}

.install-footer-hint {
  min-width: 0;
  color: var(--box-text-2);
  font-size: 12px;
}

.install-actions {
  flex-shrink: 0;
}

.install-confirm {
  color: var(--box-text-1);
}

@media (width <= 640px) {
  .install-options,
  .review-facts {
    grid-template-columns: 1fr;
  }

  .review-facts .review-fact-wide {
    grid-column: auto;
  }

  .review-space-note {
    grid-column: auto;
  }

  .audio-options {
    flex-wrap: wrap;
    justify-content: flex-start;
  }

  .install-stepper :deep(.v-stepper-item) {
    padding: 0 2px;
  }

  .install-stepper :deep(.v-stepper-item__title) {
    font-size: 11px;
  }
}
</style>
