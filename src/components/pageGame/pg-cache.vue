<template>
  <section class="cache-panel" aria-label="下载缓存">
    <div class="cache-top">
      <span class="cache-title">下载缓存</span>
      <div class="cache-acts">
        <v-btn
          :disabled="loading || clearing"
          :loading="loading"
          aria-label="刷新缓存占用"
          icon="mdi-refresh"
          size="small"
          title="刷新缓存占用"
          variant="text"
          @click="refreshStatus(true)"
        />
        <v-btn
          :disabled="loading || clearing"
          :loading="clearing"
          prepend-icon="mdi-database-remove"
          size="small"
          variant="tonal"
          @click="clearCache"
        >
          清理缓存
        </v-btn>
      </div>
      <p class="cache-hint">更新、预下载与换服会先下载到这里，不占用游戏安装盘。</p>
      <p class="cache-hint cache-hint-act">
        进行中或待恢复任务会阻止清理；未应用的预下载分片会保留。
      </p>
    </div>

    <v-alert
      v-if="errorMessage !== null"
      :text="errorMessage"
      density="compact"
      type="warning"
      variant="tonal"
    />

    <div v-if="summary !== null" class="cache-facts">
      <div class="cache-fact">
        <span>资源分片</span>
        <strong>{{ fmtUtil.size(summary.chunkBytes) }} · {{ summary.chunkCount }} 个</strong>
      </div>
      <div class="cache-fact">
        <span>渠道 SDK</span>
        <strong>{{ fmtUtil.size(summary.sdkBytes) }} · {{ summary.sdkCount }} 个</strong>
      </div>
      <div class="cache-fact">
        <span>合计</span>
        <strong>{{ fmtUtil.size(summary.totalBytes) }}</strong>
      </div>
    </div>
  </section>
</template>

<script lang="ts" setup>
import showDialog from "@comp/func/dialog.js";
import showSnackbar from "@comp/func/snackbar.js";
import gameEnum from "@enum/game.js";
import useGameLauncherStore from "@store/gameLauncher.js";
import fmtUtil from "@utils/fmtUtil.js";
import { clearGamePackageCache, getGamePackageCacheStatus } from "@utils/TGGameLauncher.js";
import { storeToRefs } from "pinia";
import { computed, onMounted, onWatcherCleanup, ref, watch } from "vue";

const taskStore = useGameLauncherStore();
const { tasksByInstallation } = storeToRefs(taskStore);
const loading = ref<boolean>(false);
const clearing = ref<boolean>(false);
const summary = ref<TGApp.Game.Package.CacheSummary | null>(null);
const errorMessage = ref<string | null>(null);
let statusBusy = false;
let statusQueued = false;

const predlSignature = computed<string>(() => {
  const parts: Array<string> = [];
  for (const task of Object.values(tasksByInstallation.value)) {
    if (task.target !== gameEnum.package.planTarget.PRE_DOWNLOAD) continue;
    if (
      task.state !== gameEnum.package.taskState.QUEUED &&
      task.state !== gameEnum.package.taskState.DOWNLOADING
    ) {
      continue;
    }
    parts.push(`${task.taskId}:${task.completedCount}:${task.downloadedBytes}`);
  }
  return parts.join("|");
});

async function refreshStatus(notify: boolean = false, silent: boolean = false): Promise<void> {
  if (clearing.value) return;
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
    errorMessage.value = `读取游戏缓存失败：${error}`;
    if (notify) showSnackbar.error(`读取游戏缓存失败：${error}`);
  } finally {
    statusBusy = false;
    if (!silent) loading.value = false;
    if (statusQueued) {
      statusQueued = false;
      void refreshStatus(false, true);
    }
  }
}

async function clearCache(): Promise<void> {
  if (loading.value || clearing.value) return;
  const occupied = summary.value === null ? "未知" : fmtUtil.size(summary.value.totalBytes);
  const confirmed = await showDialog.check(
    "确认清理游戏缓存吗？",
    `当前占用 ${occupied}。将删除未被未完成任务引用的资源分片与渠道 SDK 缓存，不影响游戏目录。`,
  );
  if (confirmed !== true) return;
  clearing.value = true;
  errorMessage.value = null;
  try {
    summary.value = await clearGamePackageCache();
    showSnackbar.success("游戏缓存已清理");
  } catch (error) {
    errorMessage.value = `${error}`;
    showSnackbar.warn(`${error}`);
  } finally {
    clearing.value = false;
  }
}

onMounted(() => {
  void refreshStatus();
});

watch(predlSignature, (signature) => {
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
  display: grid;
  align-items: center;
  gap: 4px 8px;
  grid-template-columns: minmax(0, 1fr) auto;
}

.cache-title {
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: large;
  font-weight: normal;
}

.cache-hint {
  min-width: 0;
  margin: 0;
  color: var(--box-text-2);
  font-size: 12px;
  line-height: 16px;
}

.cache-hint-act {
  text-align: end;
}

.cache-acts {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 4px;
  justify-self: end;
}

.cache-facts {
  display: grid;
  gap: 12px;
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

  span {
    color: var(--box-text-2);
    font-size: 12px;
    line-height: 16px;
  }

  strong {
    color: var(--common-text-title);
    font-family: var(--font-title);
    font-size: 14px;
    font-weight: normal;
    line-height: 20px;
    overflow-wrap: anywhere;
  }
}
</style>
