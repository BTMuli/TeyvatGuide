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
        <p>先自动识别或手动选择，确认后才会设为当前安装。</p>
      </div>
    </template>

    <div class="pgop-body">
      <div class="pgop-methods">
        <v-menu :disabled="discovered.length <= 1 || busy" location="bottom">
          <template #activator="{ props: menuProps }">
            <button
              v-bind="discovered.length > 1 ? menuProps : undefined"
              :aria-pressed="method === 'auto'"
              :class="{ selected: method === 'auto' }"
              :disabled="busy"
              class="pgop-method"
              type="button"
              @click="handleAutoDetect"
            >
              <div class="pgop-method-icon">
                <v-icon>mdi-magnify</v-icon>
              </div>
              <div class="pgop-method-copy">
                <strong>自动识别</strong>
                <span>{{ autoDetectHint }}</span>
              </div>
            </button>
          </template>
          <v-list class="pgop-menu" density="compact">
            <v-list-item
              v-for="path in discovered"
              :key="path"
              :subtitle="path"
              title="已发现的安装"
              @click="selectPath(path, 'auto')"
            />
          </v-list>
        </v-menu>
        <button
          :aria-pressed="method === 'manual'"
          :class="{ selected: method === 'manual' }"
          :disabled="busy"
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

      <section class="pgop-detail" aria-label="选中路径">
        <header class="pgop-detail-title">选中路径</header>
        <p v-if="pendingPath === null && !inspecting" class="pgop-detail-empty">尚未选择路径</p>
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
            <v-alert
              v-if="pendingInstall.status !== knownStatus"
              :text="pendingInstall.statusMessage"
              density="compact"
              type="warning"
              variant="tonal"
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
import { computed, onWatcherCleanup, ref, useId, watch } from "vue";

type SelectMethod = "auto" | "manual";

type Props = {
  currentPath?: string | null;
};

const { currentPath = null } = defineProps<Props>();
const emit = defineEmits<{ selected: [] }>();
const visible = defineModel<boolean>({ required: true });
const titleId = useId();
const knownStatus = gameEnum.installation.status.KNOWN;
const loading = ref<boolean>(false);
const inspecting = ref<boolean>(false);
const registering = ref<boolean>(false);
const discovered = ref<Array<string>>([]);
const method = ref<SelectMethod | null>(null);
const pendingPath = ref<string | null>(null);
const pendingInstall = ref<TGApp.Game.Installation.Item | null>(null);

const busy = computed<boolean>(() => loading.value || inspecting.value || registering.value);
const canConfirm = computed<boolean>(() => {
  const installation = pendingInstall.value;
  if (installation === null || busy.value) return false;
  return installation.status !== gameEnum.installation.status.UNSUPPORTED;
});
const autoDetectHint = computed<string>(() => {
  if (loading.value) return "正在定位本地安装";
  if (discovered.value.length === 0) return "未发现本地安装";
  if (discovered.value.length === 1) return "已发现 1 处安装";
  return `已发现 ${discovered.value.length} 处安装`;
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

function resetDraft(): void {
  loading.value = false;
  inspecting.value = false;
  registering.value = false;
  discovered.value = [];
  method.value = null;
  pendingPath.value = null;
  pendingInstall.value = null;
}

async function prepareOverlay(isCanceled: () => boolean): Promise<void> {
  loading.value = true;
  discovered.value = [];
  method.value = null;
  pendingInstall.value = null;
  pendingPath.value = currentPath;
  try {
    const located = await locateGameInstallations();
    if (isCanceled()) return;
    discovered.value = located;
    const initial = currentPath;
    if (initial === null) return;
    if (located.some((path) => normalizePath(path) === normalizePath(initial))) {
      method.value = "auto";
    }
    await inspectPending(initial);
  } catch (error) {
    if (isCanceled()) return;
    showSnackbar.error(`定位游戏安装失败：${error}`);
  } finally {
    if (!isCanceled()) loading.value = false;
  }
}

async function inspectPending(executablePath: string): Promise<void> {
  inspecting.value = true;
  pendingInstall.value = null;
  try {
    const installation = await inspectGameInstallation(executablePath);
    if (!visible.value || pendingPath.value !== executablePath) return;
    pendingInstall.value = installation;
  } catch (error) {
    if (!visible.value || pendingPath.value !== executablePath) return;
    showSnackbar.error(`检测游戏安装失败：${error}`);
  } finally {
    if (visible.value && pendingPath.value === executablePath) inspecting.value = false;
  }
}

async function selectPath(executablePath: string, nextMethod: SelectMethod): Promise<void> {
  if (registering.value) return;
  method.value = nextMethod;
  pendingPath.value = executablePath;
  await inspectPending(executablePath);
}

function handleAutoDetect(): void {
  if (busy.value) return;
  if (discovered.value.length === 0) {
    showSnackbar.warn("未发现本地安装，请手动选择路径");
    return;
  }
  if (discovered.value.length > 1) return;
  void selectPath(discovered.value[0], "auto");
}

async function pickExecutable(): Promise<void> {
  if (busy.value) return;
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
    let canceled = false;
    onWatcherCleanup(() => {
      canceled = true;
    });
    void prepareOverlay(() => canceled);
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

.pgop-menu {
  background: var(--box-bg-1);
  color: var(--box-text-4);
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
  color: var(--btn-text);
}
</style>
