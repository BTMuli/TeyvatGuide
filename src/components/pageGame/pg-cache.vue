<template>
  <section class="cache-panel" aria-label="游戏资源缓存">
    <div class="cache-heading">
      <div>
        <span>应用缓存</span>
        <p>资源分片与渠道 SDK 缓存在应用数据目录，不占用游戏安装盘；清理不影响已安装文件。</p>
      </div>
      <v-btn
        :disabled="loading || clearing"
        :loading="loading"
        aria-label="刷新缓存占用"
        icon="mdi-refresh"
        size="small"
        variant="text"
        @click="refreshStatus"
      />
    </div>

    <v-alert
      v-if="errorMessage !== null"
      :text="errorMessage"
      density="compact"
      type="warning"
      variant="tonal"
    />

    <div v-if="summary !== null" class="cache-facts">
      <div>
        <span>资源分片</span>
        <strong>{{ bytesToSize(summary.chunkBytes) }}</strong>
        <span>{{ summary.chunkCount }} 个</span>
      </div>
      <div>
        <span>渠道 SDK</span>
        <strong>{{ bytesToSize(summary.sdkBytes) }}</strong>
        <span>{{ summary.sdkCount }} 个</span>
      </div>
      <div>
        <span>合计</span>
        <strong>{{ bytesToSize(summary.totalBytes) }}</strong>
      </div>
    </div>

    <div class="cache-actions">
      <v-btn
        :disabled="loading || clearing"
        :loading="clearing"
        prepend-icon="mdi-database-remove"
        size="small"
        variant="outlined"
        @click="clearCache"
      >
        清理缓存
      </v-btn>
      <span>进行中或待恢复任务会阻止清理；未应用的预下载分片会保留。</span>
    </div>
  </section>
</template>

<script lang="ts" setup>
import showDialog from "@comp/func/dialog.js";
import showSnackbar from "@comp/func/snackbar.js";
import { clearGamePackageCache, getGamePackageCacheStatus } from "@utils/TGGameLauncher.js";
import { bytesToSize } from "@utils/toolFunc.js";
import { onMounted, ref } from "vue";

const loading = ref<boolean>(false);
const clearing = ref<boolean>(false);
const summary = ref<TGApp.Game.Package.CacheSummary | null>(null);
const errorMessage = ref<string | null>(null);

async function refreshStatus(): Promise<void> {
  if (loading.value || clearing.value) return;
  loading.value = true;
  errorMessage.value = null;
  try {
    summary.value = await getGamePackageCacheStatus();
  } catch (error) {
    errorMessage.value = `读取游戏缓存失败：${error}`;
  } finally {
    loading.value = false;
  }
}

async function clearCache(): Promise<void> {
  if (loading.value || clearing.value) return;
  const occupied = summary.value === null ? "未知" : bytesToSize(summary.value.totalBytes);
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

onMounted(refreshStatus);
</script>

<style lang="scss" scoped>
.cache-panel {
  display: grid;
  padding: 20px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--box-bg-1);
  gap: 16px;
}

.cache-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;

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

.cache-facts {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(3, minmax(0, 1fr));

  div {
    display: grid;
    padding: 12px;
    border-radius: 4px;
    background: var(--box-bg-4);
    gap: 4px;
  }

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
}

.cache-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;

  span {
    color: var(--box-text-2);
    font-size: 12px;
    line-height: 16px;
  }
}

@media (width <= 720px) {
  .cache-facts {
    grid-template-columns: 1fr;
  }
}
</style>
