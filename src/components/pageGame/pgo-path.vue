<!-- 选择游戏路径浮层：自动发现或手动指定安装目录 -->
<template>
  <TopOverlay
    v-model="visible"
    :showShare="false"
    :titleId
    closeAriaLabel="关闭路径选择"
    contentMaxHeight="none"
    panelWidth="720px"
    topOffset="64px"
  >
    <template #header>
      <div class="pgop-heading">
        <h2 :id="titleId">选择游戏路径</h2>
        <p>自动发现或手动选择本机安装，确认后才会设为当前安装。</p>
      </div>
    </template>

    <div class="pgop-body">
      <div class="pgop-methods">
        <button
          :aria-pressed="method === 'auto'"
          :class="{ selected: method === 'auto' }"
          :disabled="registering || discovering"
          class="pgop-method"
          type="button"
          @click="handleRescan"
        >
          <div class="pgop-method-icon">
            <v-icon>mdi-magnify</v-icon>
          </div>
          <div class="pgop-method-copy">
            <strong>自动识别</strong>
            <span>{{ autoDetectHint }}</span>
          </div>
        </button>
        <button
          :aria-pressed="method === 'manual'"
          :class="{ selected: method === 'manual' }"
          :disabled="registering"
          class="pgop-method"
          type="button"
          @click="pickExecutable"
        >
          <div class="pgop-method-icon">
            <v-icon>mdi-folder-open</v-icon>
          </div>
          <div class="pgop-method-copy">
            <strong>手动选择</strong>
            <span>指定国服 YuanShen.exe</span>
          </div>
        </button>
      </div>

      <PgNotice v-if="degradedHint !== null" :text="degradedHint" tone="warning" />

      <section
        v-if="discoveredCandidates.length > 0"
        aria-label="发现的安装候选"
        class="pgop-candidates"
      >
        <header class="pgop-candidates-title">发现的安装</header>
        <ul class="pgop-candidate-list">
          <li v-for="candidate in discoveredCandidates" :key="candidate.installation.id">
            <button
              :aria-pressed="isSelected(candidate)"
              :class="{ selected: isSelected(candidate) }"
              class="pgop-candidate"
              type="button"
              @click="selectCandidate(candidate)"
            >
              <span class="pgop-candidate-path">{{ candidate.installation.executablePath }}</span>
              <span class="pgop-candidate-meta">
                <v-chip size="small" variant="tonal">
                  {{ gameEnum.installation.schemeDesc(candidate.installation.schemeId) }}
                </v-chip>
                <v-chip size="small" variant="tonal">
                  {{ candidate.installation.version ?? "未读取版本" }}
                </v-chip>
                <v-chip
                  :color="statusColor(candidate.installation.status)"
                  size="small"
                  variant="tonal"
                >
                  {{ statusDesc(candidate.installation.status) }}
                </v-chip>
                <v-chip size="small" variant="tonal">{{ sourceDesc(candidate.sources) }}</v-chip>
              </span>
            </button>
          </li>
        </ul>
      </section>

      <p v-else-if="showEmptyState" class="pgop-empty">
        未发现本地安装，可重新扫描或手动选择国服 YuanShen.exe
      </p>

      <section class="pgop-detail" aria-label="选中路径">
        <header class="pgop-detail-title">选中路径</header>
        <p v-if="pendingPath === null && !inspecting" class="pgop-detail-empty">
          {{ discovering ? "正在查找本地安装…" : "尚未选择路径" }}
        </p>
        <div v-else class="pgop-detail-body">
          <p v-if="pendingPath !== null" class="pgop-detail-path">{{ pendingPath }}</p>
          <div v-if="inspecting" class="pgop-detail-empty">
            <v-progress-circular indeterminate size="20" width="2" />
            <span>正在检测安装…</span>
          </div>
          <template v-else-if="pendingInstall !== null">
            <div class="pgop-detail-meta">
              <v-chip size="small" variant="tonal">
                {{ gameEnum.installation.schemeDesc(pendingInstall.schemeId) }}
              </v-chip>
              <v-chip size="small" variant="tonal">
                {{ pendingInstall.version ?? "未读取版本" }}
              </v-chip>
              <v-chip :color="statusColor(pendingInstall.status)" size="small" variant="tonal">
                {{ statusDesc(pendingInstall.status) }}
              </v-chip>
            </div>
            <PgNotice
              v-if="pendingInstall.status !== knownStatus"
              :text="pendingInstall.statusMessage"
              tone="warning"
            />
          </template>
        </div>
      </section>
    </div>

    <template #footer>
      <span class="pgop-footer-hint">确认后才会登记为当前安装</span>
      <div class="pgop-actions">
        <v-btn :disabled="registering" class="pgop-cancel" variant="text" @click="onCancel">
          取消
        </v-btn>
        <v-btn
          :disabled="!canConfirm"
          :loading="registering"
          class="pgop-confirm"
          prepend-icon="mdi-check"
          variant="flat"
          @click="onConfirm"
        >
          确认
        </v-btn>
      </div>
    </template>
  </TopOverlay>
</template>

<script lang="ts" setup>
import TopOverlay from "@comp/app/top-overlay.vue";
import showSnackbar from "@comp/func/snackbar.js";
import gameEnum from "@enum/game.js";
import TSGameInstallation from "@Sqlm/gameInstallation.js";
import { open } from "@tauri-apps/plugin-dialog";
import { inspectGameInstallation, locateGameInstallations } from "@utils/TGGameLauncher.js";
import { computed, ref, useId, watch } from "vue";

import PgNotice from "./pg-notice.vue";

type SelectMethod = "auto" | "manual";

/** 当前选中项的来源；current 表示浮层打开时已登记的当前安装。 */
type SelectionOrigin = SelectMethod | "current";

type Props = {
  currentPath?: string | null;
};

const { currentPath = null } = defineProps<Props>();
const emit = defineEmits<{ selected: [] }>();
const visible = defineModel<boolean>({ required: true });
const titleId = useId();
const knownStatus = gameEnum.installation.status.KNOWN;
const unsupportedStatus = gameEnum.installation.status.UNSUPPORTED;
const discovering = ref<boolean>(false);
const inspecting = ref<boolean>(false);
const registering = ref<boolean>(false);
const discovery = ref<TGApp.Game.Installation.DiscoveryResult | null>(null);
const method = ref<SelectMethod | null>(null);
const selectionOrigin = ref<SelectionOrigin | null>(null);
const pendingPath = ref<string | null>(null);
const pendingInstall = ref<TGApp.Game.Installation.Item | null>(null);
let discoveryRequestId = 0;
let inspectionRequestId = 0;

const discoveredCandidates = computed<Array<TGApp.Game.Installation.DiscoveryCandidate>>(
  () => discovery.value?.candidates ?? [],
);
const degradedHint = computed<string | null>(() => {
  if (discovering.value || discovery.value === null || discovery.value.notices.length === 0) {
    return null;
  }
  return "部分位置无法读取，结果可能不完整";
});
const showEmptyState = computed<boolean>(
  () => !discovering.value && discovery.value !== null && discoveredCandidates.value.length === 0,
);
const canConfirm = computed<boolean>(() => {
  const installation = pendingInstall.value;
  if (installation === null || registering.value || inspecting.value) return false;
  return installation.status !== unsupportedStatus;
});
const autoDetectHint = computed<string>(() => {
  if (discovering.value) return "正在查找本地安装";
  if (discovery.value === null) return "从 HoYoPlay 登记与游戏日志中查找";
  const count = discovery.value.candidates.length;
  if (count === 0) return "未发现本地安装，点击重新扫描";
  return `已发现 ${count} 处安装，点击重新扫描`;
});

function normalizePath(path: string): string {
  return path.replaceAll("/", "\\").toLowerCase();
}

function statusDesc(status: TGApp.Game.Installation.StatusEnum): string {
  switch (status) {
    case gameEnum.installation.status.KNOWN:
      return "可用";
    case gameEnum.installation.status.INCONSISTENT:
      return "状态不一致";
    case gameEnum.installation.status.UNSUPPORTED:
      return "不支持";
  }
}

function statusColor(status: TGApp.Game.Installation.StatusEnum): string {
  switch (status) {
    case gameEnum.installation.status.KNOWN:
      return "success";
    case gameEnum.installation.status.INCONSISTENT:
      return "warning";
    case gameEnum.installation.status.UNSUPPORTED:
      return "error";
  }
}

function sourceDesc(sources: Array<TGApp.Game.Installation.DiscoverySourceEnum>): string {
  return sources.map((source) => gameEnum.installation.discoverySourceDesc(source)).join(" + ");
}

function isSelected(candidate: TGApp.Game.Installation.DiscoveryCandidate): boolean {
  if (pendingInstall.value !== null) {
    return pendingInstall.value.id === candidate.installation.id;
  }
  return (
    pendingPath.value !== null &&
    normalizePath(pendingPath.value) === normalizePath(candidate.installation.executablePath)
  );
}

function resetDraft(): void {
  discoveryRequestId += 1;
  inspectionRequestId += 1;
  discovering.value = false;
  inspecting.value = false;
  registering.value = false;
  discovery.value = null;
  method.value = null;
  selectionOrigin.value = null;
  pendingPath.value = null;
  pendingInstall.value = null;
}

/** 打开浮层：当前路径检测与自动发现并行执行，互不阻塞。 */
function prepareOverlay(): void {
  discoveryRequestId += 1;
  inspectionRequestId += 1;
  discovery.value = null;
  method.value = null;
  selectionOrigin.value = currentPath === null ? null : "current";
  pendingInstall.value = null;
  pendingPath.value = currentPath;
  if (currentPath !== null) void inspectPending(currentPath);
  void runDiscovery();
}

async function runDiscovery(): Promise<void> {
  const requestId = ++discoveryRequestId;
  discovering.value = true;
  try {
    const result = await locateGameInstallations();
    if (requestId !== discoveryRequestId) return;
    // 扫描成功后原子替换候选列表，保留已选路径与详情
    discovery.value = result;
    applyAutoPreselection();
  } catch (error) {
    if (requestId !== discoveryRequestId) return;
    showSnackbar.error(`定位游戏安装失败：${error}`);
  } finally {
    if (requestId === discoveryRequestId) discovering.value = false;
  }
}

/**
 * 唯一有效候选自动预选；多候选与已有选择时不自动切换。
 * 预选只展示检测快照，不写数据库，确认仍需用户点击。
 */
function applyAutoPreselection(): void {
  if (selectionOrigin.value !== null) return;
  const candidates = discoveredCandidates.value;
  const usable = candidates.filter(
    (candidate) => candidate.installation.status !== unsupportedStatus,
  );
  if (usable.length === 1) {
    selectCandidate(usable[0]);
    return;
  }
  if (usable.length === 0 && candidates.length === 1) {
    selectCandidate(candidates[0]);
  }
}

function selectCandidate(candidate: TGApp.Game.Installation.DiscoveryCandidate): void {
  if (registering.value) return;
  method.value = "auto";
  selectionOrigin.value = "auto";
  // 发现候选已带检测快照，直接展示；确认时会重新检测
  inspecting.value = false;
  pendingPath.value = candidate.installation.executablePath;
  pendingInstall.value = candidate.installation;
}

function handleRescan(): void {
  if (registering.value || discovering.value) return;
  void runDiscovery();
}

async function inspectPending(executablePath: string): Promise<void> {
  const requestId = ++inspectionRequestId;
  inspecting.value = true;
  pendingInstall.value = null;
  try {
    const installation = await inspectGameInstallation(executablePath);
    if (requestId !== inspectionRequestId || pendingPath.value !== executablePath) return;
    pendingInstall.value = installation;
  } catch (error) {
    if (requestId !== inspectionRequestId || pendingPath.value !== executablePath) return;
    showSnackbar.error(`检测游戏安装失败：${error}`);
  } finally {
    if (requestId === inspectionRequestId && pendingPath.value === executablePath) {
      inspecting.value = false;
    }
  }
}

async function selectPath(executablePath: string, nextMethod: SelectMethod): Promise<void> {
  if (registering.value) return;
  method.value = nextMethod;
  selectionOrigin.value = nextMethod;
  pendingPath.value = executablePath;
  await inspectPending(executablePath);
}

async function pickExecutable(): Promise<void> {
  if (registering.value) return;
  const file: string | null = await open({
    defaultPath: pendingPath.value ?? currentPath ?? undefined,
    filters: [{ name: "原神国服客户端", extensions: ["exe"] }],
    multiple: false,
  });
  if (file === null) return;
  if (!file.toLowerCase().endsWith("yuanshen.exe")) {
    showSnackbar.warn("仅支持国服游戏本体 YuanShen.exe");
    return;
  }
  await selectPath(file, "manual");
}

function onCancel(): void {
  visible.value = false;
}

async function onConfirm(): Promise<void> {
  if (!canConfirm.value || pendingInstall.value === null) return;
  registering.value = true;
  try {
    const installation = await inspectGameInstallation(pendingInstall.value.executablePath);
    if (installation.status === gameEnum.installation.status.UNSUPPORTED) {
      pendingInstall.value = installation;
      showSnackbar.warn(installation.statusMessage);
      return;
    }
    await TSGameInstallation.save(installation);
    visible.value = false;
    emit("selected");
    if (installation.status === gameEnum.installation.status.INCONSISTENT) {
      showSnackbar.warn(`已选择安装，但暂不可启动：${installation.statusMessage}`);
      return;
    }
    showSnackbar.success("已设为当前安装");
  } catch (error) {
    showSnackbar.error(`选择游戏路径失败：${error}`);
  } finally {
    registering.value = false;
  }
}

watch(
  () => visible.value,
  (open) => {
    if (!open) {
      resetDraft();
      return;
    }
    prepareOverlay();
  },
);
</script>

<style lang="scss" scoped>
.pgop-heading {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 4px;

  h2 {
    margin: 0;
    color: var(--common-text-title);
    font-family: var(--font-title);
    font-size: 20px;
    font-weight: normal;
    line-height: 26px;
  }

  p {
    margin: 0;
    color: var(--box-text-2);
    font-size: 12px;
    line-height: 16px;
  }
}

.pgop-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.pgop-methods {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.pgop-method {
  display: flex;
  min-width: 0;
  align-items: center;
  padding: 16px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--box-bg-1);
  color: var(--box-text-4);
  cursor: pointer;
  gap: 12px;
  text-align: left;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.64;
  }

  &.selected {
    border-color: var(--tgc-od-orange);
    background: var(--box-bg-2);
  }
}

.pgop-method-icon {
  display: flex;
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--common-shadow-1);
  border-radius: 5px;
  background: var(--box-bg-2);
  color: var(--box-text-2);
}

.pgop-method-copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 4px;

  strong {
    color: var(--common-text-title);
    font-family: var(--font-title);
    font-size: 16px;
    font-weight: normal;
    line-height: 22px;
  }

  span {
    color: var(--box-text-2);
    font-size: 12px;
    line-height: 16px;
  }
}

.pgop-candidates {
  display: flex;
  flex-direction: column;
  padding: 16px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--box-bg-2);
  gap: 12px;
}

.pgop-candidates-title {
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 14px;
  font-weight: normal;
  line-height: 20px;
}

.pgop-candidate-list {
  display: flex;
  flex-direction: column;
  padding: 0;
  margin: 0;
  gap: 8px;
  list-style: none;
}

.pgop-candidate {
  display: flex;
  width: 100%;
  flex-direction: column;
  padding: 10px 12px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 6px;
  background: var(--box-bg-1);
  color: var(--box-text-4);
  cursor: pointer;
  gap: 8px;
  text-align: left;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.64;
  }

  &.selected {
    border-color: var(--tgc-od-orange);
    background: var(--box-bg-2);
  }
}

.pgop-candidate-path {
  color: var(--box-text-4);
  font-family: var(--font-text);
  font-size: 13px;
  line-height: 20px;
  overflow-wrap: anywhere;
}

.pgop-candidate-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.pgop-empty {
  padding: 24px 16px;
  border: 1px dashed var(--common-shadow-1);
  border-radius: 8px;
  margin: 0;
  background: var(--box-bg-2);
  color: var(--box-text-2);
  font-size: 13px;
  line-height: 18px;
  text-align: center;
}

.pgop-detail {
  display: flex;
  min-height: 128px;
  flex-direction: column;
  padding: 16px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--box-bg-2);
  gap: 12px;
}

.pgop-detail-title {
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 14px;
  font-weight: normal;
  line-height: 20px;
}

.pgop-detail-empty {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  color: var(--box-text-2);
  font-size: 13px;
  gap: 8px;
  line-height: 18px;
}

.pgop-detail-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.pgop-detail-path {
  margin: 0;
  color: var(--box-text-4);
  font-family: var(--font-text);
  font-size: 13px;
  line-height: 20px;
  overflow-wrap: anywhere;
}

.pgop-detail-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.pgop-footer-hint {
  color: var(--box-text-4);
  font-size: 12px;
  line-height: 16px;
  opacity: 0.72;
}

.pgop-actions {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  column-gap: 8px;
}

.pgop-cancel,
.pgop-confirm {
  border-radius: 4px;
  font-family: var(--font-text);
}

.pgop-cancel {
  color: var(--box-text-2);
}

.pgop-confirm {
  background: var(--tgc-btn-1);
  color: var(--box-text-1);
}
</style>
