<template>
  <TopOverlay
    v-model="visible"
    class="import-overlay"
    :closeDisabled="busy"
    :showShare="false"
    :titleId
    panelWidth="760px"
    closeAriaLabel="关闭胡桃数据导入"
  >
    <template #header>
      <div class="import-heading">
        <img class="hutao-icon" src="/platforms/other/hutao.webp" alt="" />
        <div class="import-heading-text">
          <h2 :id="titleId">胡桃数据导入</h2>
          <p>选择特定导出工具生成的 JSON 数组文件，不适用于本应用备份。</p>
        </div>
      </div>
    </template>
    <template #actions>
      <v-btn
        :disabled="busy"
        icon="mdi-help-circle-outline"
        aria-label="查看导出说明"
        title="查看导出说明"
        size="32"
        variant="text"
        @click="openHelp"
      />
      <v-btn
        :disabled="busy"
        icon="mdi-close"
        aria-label="关闭胡桃数据导入"
        title="关闭胡桃数据导入"
        size="32"
        variant="text"
        @click="visible = false"
      />
    </template>
    <div class="import-content">
      <div v-for="row in rows" :key="row.type" class="import-row">
        <h3 class="import-title"><img :src="row.icon" alt="" />{{ row.label }}</h3>
        <p class="import-file" :title="row.path">
          <v-icon class="import-file-icon" icon="mdi-file-document-outline" size="16" />
          <span>{{ fileName(row.path) }}</span>
        </p>
        <div class="import-status" :class="row.status" role="status" aria-live="polite">
          <v-icon :icon="statusIcon(row.status)" size="16" />
          <span>{{ row.message || "请选择 JSON 文件" }}</span>
        </div>
        <div class="import-actions">
          <v-btn :disabled="busy" height="24" size="small" variant="tonal" @click="selectFile(row)">
            {{ row.path ? "更换文件" : "选择文件" }}
          </v-btn>
          <v-btn
            :disabled="busy || !row.path"
            color="var(--tgc-od-red)"
            height="24"
            size="small"
            variant="tonal"
            @click="clearFile(row)"
          >
            清除
          </v-btn>
          <v-btn
            :disabled="busy || !row.prepared"
            height="24"
            size="small"
            variant="tonal"
            @click="runImport([row])"
          >
            导入
          </v-btn>
        </div>
      </div>
    </div>
    <template #footer>
      <div class="import-footer">
        <v-btn :disabled="busy" variant="text" @click="visible = false">关闭</v-btn>
        <v-btn v-if="needsRefresh" :disabled="busy" variant="outlined" @click="refreshApp">
          刷新应用
        </v-btn>
        <v-btn
          :disabled="busy || selectedRows.length === 0"
          :loading="busy"
          color="var(--tgc-btn-1)"
          variant="flat"
          @click="runImport(selectedRows)"
        >
          导入已选文件
        </v-btn>
      </div>
    </template>
  </TopOverlay>
</template>
<script lang="ts" setup>
import TopOverlay from "@comp/app/top-overlay.vue";
import showSnackbar from "@comp/func/snackbar.js";
import HutaoImport from "@Hutao/utils/importData.js";
import { open } from "@tauri-apps/plugin-dialog";
import { openUrl } from "@tauri-apps/plugin-opener";
import TGLogger from "@utils/TGLogger.js";
import { computed, ref, useId } from "vue";

type ImportRow = {
  type: TGApp.Plugins.Hutao.Import.Type;
  label: string;
  icon: string;
  status: "idle" | "pending" | "success" | "error";
  path: string;
  message: string;
  prepared?: TGApp.Plugins.Hutao.Import.PreparedImport;
};

const visible = defineModel<boolean>({ default: false });
const busy = ref<boolean>(false);
const needsRefresh = ref<boolean>(false);
const titleId = useId();
const rows = ref<Array<ImportRow>>([
  {
    type: "abyss",
    label: "深境螺旋",
    icon: "/UI/nav/userAbyss.webp",
    status: "idle",
    path: "",
    message: "",
  },
  {
    type: "combat",
    label: "幻想真境剧诗",
    icon: "/UI/nav/userCombat.webp",
    status: "idle",
    path: "",
    message: "",
  },
  {
    type: "challenge",
    label: "幽境危战",
    icon: "/UI/nav/userChallenge.webp",
    status: "idle",
    path: "",
    message: "",
  },
]);
const selectedRows = computed<Array<ImportRow>>(() => rows.value.filter((row) => row.prepared));

function fileName(path: string): string {
  return path.split(/[\\/]/u).pop() || "请选择文件";
}

function statusIcon(status: ImportRow["status"]): string {
  switch (status) {
    case "pending":
      return "mdi-progress-clock";
    case "success":
      return "mdi-check-circle-outline";
    case "error":
      return "mdi-alert-circle-outline";
    default:
      return "mdi-information-outline";
  }
}

function clearFile(row: ImportRow): void {
  if (busy.value) return;
  row.path = "";
  row.message = "";
  row.status = "idle";
  row.prepared = undefined;
}

async function selectFile(row: ImportRow): Promise<void> {
  if (busy.value) return;
  busy.value = true;
  try {
    const path = await open({
      multiple: false,
      directory: false,
      title: `选择胡桃${row.label} JSON 文件`,
      filters: [{ name: "JSON 文件", extensions: ["json"] }],
    });
    if (path === null) return;
    row.path = path;
    row.prepared = undefined;
    row.message = "正在读取并验证文件…";
    row.status = "pending";
    const prepared = await HutaoImport.prepareImport(row.type, path);
    row.prepared = prepared;
    row.status = "success";
    row.message = `验证通过：${prepared.records.length} 条记录，${new Set(prepared.records.map((item) => item.uid)).size} 个 UID`;
  } catch (error) {
    row.status = "error";
    row.message = error instanceof Error ? error.message : `${error}`;
  } finally {
    busy.value = false;
  }
}

async function runImport(targets: Array<ImportRow>): Promise<void> {
  if (busy.value) return;
  busy.value = true;
  try {
    for (const row of targets) {
      if (!row.prepared) continue;
      row.status = "pending";
      const result = await HutaoImport.executeImport(row.prepared, (completed, total) => {
        row.message = `已保存 ${completed} / ${total} 条`;
      });
      if (result.mayHaveWrites) needsRefresh.value = true;
      row.status = result.error ? "error" : "success";
      row.message = result.error
        ? `导入失败：已完成 ${result.completed} / ${result.total} 条，可能已有部分记录保存。${result.error}`
        : `导入完成：已保存 ${result.completed} 条记录`;
      if (!result.error) row.prepared = undefined;
    }
  } finally {
    busy.value = false;
  }
}

async function openHelp(): Promise<void> {
  try {
    await openUrl("https://app.btmuli.ink/docs/TeyvatGuide/import-hutao-db.html");
  } catch (error) {
    showSnackbar.error("打开导出说明失败，请稍后重试");
    await TGLogger.Error(`[HutaoImport] 打开导出说明失败：${error}`);
  }
}

function refreshApp(): void {
  if (!busy.value) window.location.reload();
}
</script>
<style lang="scss" scoped>
.import-heading {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;

  h2 {
    margin: 0;
    color: var(--common-text-title);
    font-family: var(--font-title);
    font-size: 18px;
    font-weight: normal;
    line-height: 20px;
  }

  p {
    overflow: hidden;
    margin: 0;
    color: var(--box-text-2);
    font-size: 12px;
    line-height: 14px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.import-heading-text {
  display: flex;
  min-width: 0;
  height: 48px;
  flex-direction: column;
  justify-content: center;
  gap: 0;
}

.hutao-icon {
  width: 48px;
  height: 48px;
  flex-shrink: 0;
  object-fit: contain;
}

.import-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.import-row {
  display: grid;
  align-items: center;
  padding: 16px;
  border-radius: 8px;
  background: var(--box-bg-1);
  gap: 12px;
  grid-template-columns: minmax(0, 1fr) auto;
}

.import-title {
  display: flex;
  min-width: 0;
  align-items: center;
  margin: 0;
  font-size: 16px;
  gap: 8px;
  grid-column: 1;
  grid-row: 1;
  line-height: 24px;
  overflow-wrap: anywhere;

  img {
    width: 24px;
    height: 24px;
    object-fit: contain;
  }
}

.import-status {
  display: flex;
  align-items: flex-start;
  padding: 8px;
  border-radius: 4px;
  background: var(--box-bg-2);
  color: var(--box-text-2);
  font-size: 12px;
  gap: 8px;
  grid-column: 1 / -1;
  line-height: 16px;

  .v-icon {
    flex-shrink: 0;
  }

  &.success .v-icon {
    color: var(--tgc-od-green);
  }

  &.error .v-icon {
    color: var(--tgc-od-red);
  }

  &.pending .v-icon {
    color: var(--tgc-od-blue);
  }
}

.import-file {
  display: flex;
  min-width: 0;
  align-items: center;
  margin: 0;
  color: var(--box-text-2);
  font-size: 12px;
  gap: 8px;
  grid-column: 1 / -1;
  line-height: 16px;

  .import-file-icon {
    flex-shrink: 0;
  }

  span {
    overflow: hidden;
    min-width: 0;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.import-actions {
  grid-column: 2;
  grid-row: 1;
}

.import-actions,
.import-footer {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.import-footer {
  width: 100%;
}

@media (width <= 640px) {
  .import-row {
    grid-template-columns: minmax(0, 1fr);
  }

  .import-actions {
    justify-content: flex-start;
    grid-column: 1;
    grid-row: 4;
  }
}
</style>
