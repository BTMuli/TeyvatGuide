<template>
  <section class="cache-panel" aria-label="下载缓存">
    <div class="cache-top">
      <div class="cache-heading">
        <span class="cache-title">下载缓存</span>
        <v-btn
          :disabled="loading || clearingTarget !== null"
          :loading="loading"
          class="cache-refresh-btn"
          density="compact"
          prepend-icon="mdi-refresh"
          size="small"
          title="刷新缓存占用"
          variant="text"
          @click="refreshStatus(true)"
        >
          刷新
        </v-btn>
      </div>
      <div class="cache-hints">
        <p class="cache-hint">更新、预下载与换服会先下载到这里，不占用游戏安装盘。</p>
        <p class="cache-hint cache-hint-act">SDK 可单独清理；任务仍使用的缓存会自动保留。</p>
      </div>
    </div>

    <v-alert
      v-if="errorMessage !== null"
      :text="errorMessage"
      density="compact"
      title="缓存操作未完成"
      type="warning"
      variant="tonal"
    />

    <div v-if="summary !== null" class="cache-facts">
      <div class="cache-fact">
        <div class="cache-fact-head">
          <span>资源分片</span>
          <v-btn
            :disabled="isClearDisabled('chunks')"
            :loading="clearingTarget === 'chunks'"
            aria-label="清理资源分片缓存"
            class="cache-clear-btn"
            density="compact"
            icon="mdi-delete-outline"
            size="small"
            title="清理资源分片缓存"
            variant="text"
            @click="clearCache('chunks')"
          />
        </div>
        <strong>{{ fmtUtil.size(summary.chunkBytes) }} · {{ summary.chunkCount }} 个</strong>
        <span class="cache-fact-meta">
          受保护 {{ fmtUtil.size(summary.chunkProtectedBytes) }} · 可回收
          {{ fmtUtil.size(summary.chunkBytes - summary.chunkProtectedBytes) }}
        </span>
      </div>
      <div class="cache-fact">
        <div class="cache-fact-head">
          <span>渠道 SDK</span>
          <v-btn
            :disabled="isClearDisabled('sdk')"
            :loading="clearingTarget === 'sdk'"
            aria-label="清理渠道 SDK 缓存"
            class="cache-clear-btn"
            density="compact"
            icon="mdi-delete-outline"
            size="small"
            title="清理渠道 SDK 缓存"
            variant="text"
            @click="clearCache('sdk')"
          />
        </div>
        <strong>{{ fmtUtil.size(summary.sdkBytes) }} · {{ summary.sdkCount }} 个</strong>
        <span class="cache-fact-meta">
          受保护 {{ fmtUtil.size(summary.sdkProtectedBytes) }} · 可回收
          {{ fmtUtil.size(summary.sdkBytes - summary.sdkProtectedBytes) }}
        </span>
      </div>
      <div class="cache-fact">
        <div class="cache-fact-head">
          <span>合计</span>
          <v-btn
            :disabled="isClearDisabled('all')"
            :loading="clearingTarget === 'all'"
            aria-label="清理全部游戏缓存"
            class="cache-clear-btn"
            density="compact"
            icon="mdi-delete-outline"
            size="small"
            title="清理全部游戏缓存"
            variant="text"
            @click="clearCache('all')"
          />
        </div>
        <strong>{{ fmtUtil.size(summary.totalBytes) }}</strong>
        <span class="cache-fact-meta">
          受保护 {{ fmtUtil.size(summary.totalBytes - summary.reclaimableBytes) }} · 可回收
          {{ fmtUtil.size(summary.reclaimableBytes) }}
        </span>
      </div>
    </div>
  </section>
</template>

<script lang="ts" setup>
import showDialog from "@comp/func/dialog.js";
import showSnackbar from "@comp/func/snackbar.js";
import useGameLauncherStore from "@store/gameLauncher.js";
import fmtUtil from "@utils/fmtUtil.js";
import { clearGamePackageCache, getGamePackageCacheStatus } from "@utils/TGGameLauncher.js";
import { storeToRefs } from "pinia";
import { computed, onMounted, onWatcherCleanup, ref, watch } from "vue";

type CacheClearTarget = "chunks" | "sdk" | "all";

const taskStore = useGameLauncherStore();
const { tasksByInstallation } = storeToRefs(taskStore);
const loading = ref<boolean>(false);
const clearingTarget = ref<CacheClearTarget | null>(null);
const summary = ref<TGApp.Game.Package.CacheSummary | null>(null);
const errorMessage = ref<string | null>(null);
let statusBusy = false;
let statusQueued = false;

const taskSignature = computed<string>(() => {
  const parts: Array<string> = [];
  for (const task of Object.values(tasksByInstallation.value)) {
    parts.push(`${task.taskId}:${task.state}:${task.completedCount}:${task.downloadedBytes}`);
  }
  return parts.join("|");
});

async function refreshStatus(notify: boolean = false, silent: boolean = false): Promise<void> {
  if (clearingTarget.value !== null) {
    if (silent) statusQueued = true;
    return;
  }
  if (statusBusy) {
    if (silent) statusQueued = true;
    return;
  }
  if (!silent && loading.value) return;
  statusBusy = true;
  if (!silent) {
    loading.value = true;
    errorMessage.value = null;
  }
  try {
    summary.value = await getGamePackageCacheStatus();
    if (notify) {
      showSnackbar.success(`缓存占用已刷新，合计 ${fmtUtil.size(summary.value.totalBytes)}`);
    }
  } catch (error) {
    if (silent) return;
    const message = cacheErrorText(error, "读取游戏缓存");
    errorMessage.value = message;
    if (notify) showSnackbar.error(message);
  } finally {
    statusBusy = false;
    if (!silent) loading.value = false;
    if (statusQueued) {
      statusQueued = false;
      void refreshStatus(false, true);
    }
  }
}

function cacheClearLabel(target: CacheClearTarget): string {
  if (target === "chunks") return "资源分片";
  if (target === "sdk") return "渠道 SDK";
  return "游戏缓存";
}

function cacheClearBytes(target: CacheClearTarget): number | null {
  if (summary.value === null) return null;
  if (target === "chunks") {
    return summary.value.chunkBytes - summary.value.chunkProtectedBytes;
  }
  if (target === "sdk") return summary.value.sdkBytes - summary.value.sdkProtectedBytes;
  return summary.value.reclaimableBytes;
}

function isClearDisabled(target: CacheClearTarget): boolean {
  const bytes = cacheClearBytes(target);
  return loading.value || clearingTarget.value !== null || bytes === null || bytes === 0;
}

function cacheClearText(target: CacheClearTarget, occupied: string): string {
  if (target === "all") {
    return `当前可回收缓存占用 ${occupied}。将清理未被任务使用的资源分片与渠道 SDK，不影响游戏目录。`;
  }
  return `当前可回收${cacheClearLabel(target)}占用 ${occupied}。仍被任务使用的文件会保留，不影响游戏目录。`;
}

function cacheErrorText(error: unknown, action: string): string {
  const message = String(error);
  if (message.includes("游戏仍在运行")) return "请先关闭游戏，再清理缓存。";
  if (message.includes("还有任务正在使用")) {
    return "还有任务正在使用这类缓存，请等待任务完成后再试。";
  }
  return `${action}失败，请稍后重试。`;
}

async function clearCache(target: CacheClearTarget): Promise<void> {
  const bytes = cacheClearBytes(target);
  if (loading.value || clearingTarget.value !== null || bytes === null || bytes === 0) return;
  const label = cacheClearLabel(target);
  const occupied = fmtUtil.size(bytes);
  const confirmed = await showDialog.checkF({
    title: `确认清理${label}？`,
    text: cacheClearText(target, occupied),
    confirmLabel: `清理${label}`,
    cancelLabel: "取消",
  });
  if (confirmed !== true) return;
  clearingTarget.value = target;
  errorMessage.value = null;
  try {
    summary.value = await clearGamePackageCache(target);
    showSnackbar.success(`${label}已清理，释放 ${occupied}`);
  } catch (error) {
    const message = cacheErrorText(error, `清理${label}`);
    errorMessage.value = message;
    showSnackbar.warn(message);
  } finally {
    clearingTarget.value = null;
    if (statusQueued) {
      statusQueued = false;
      void refreshStatus(false, true);
    }
  }
}

onMounted(() => {
  void refreshStatus();
});

watch(taskSignature, (signature) => {
  const timer = window.setTimeout(
    () => {
      void refreshStatus(false, true);
    },
    signature === "" ? 400 : 1000,
  );
  onWatcherCleanup(() => {
    window.clearTimeout(timer);
  });
});
</script>

<style lang="scss" scoped>
.cache-panel {
  display: flex;
  width: 100%;
  box-sizing: border-box;
  flex-direction: column;
  padding: 12px 16px 16px;
  border-radius: 8px;
  background: var(--box-bg-1);
  color: var(--box-text-1);
  gap: 12px;
}

.cache-top {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 4px;
}

.cache-heading {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 4px;
}

.cache-title {
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: large;
  font-weight: normal;
}

.cache-hint {
  overflow: hidden;
  min-width: 0;
  flex: 1 1 0;
  margin: 0;
  color: var(--box-text-2);
  font-size: 12px;
  line-height: 16px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cache-hints {
  display: flex;
  min-width: 0;
  flex-wrap: nowrap;
  align-items: center;
  gap: 16px;
}

.cache-hint-act {
  text-align: end;
}

.cache-refresh-btn {
  padding-inline: 4px;
}

.cache-facts {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.cache-fact {
  display: flex;
  min-width: 0;
  flex-direction: column;
  padding: 12px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--box-bg-2);
  gap: 4px;
}

.cache-fact-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;

  span {
    color: var(--box-text-2);
    font-size: 12px;
    line-height: 16px;
  }
}

.cache-fact strong {
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 14px;
  font-weight: normal;
  line-height: 20px;
  overflow-wrap: anywhere;
}

.cache-fact-meta {
  color: var(--box-text-2);
  font-size: 12px;
  line-height: 16px;
  overflow-wrap: anywhere;
}

.cache-clear-btn {
  flex-shrink: 0;
  padding: 4px;
}
</style>
