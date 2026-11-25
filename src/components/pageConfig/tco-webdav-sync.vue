<template>
  <TopOverlay
    v-model="visible"
    :closeDisabled="busy"
    :contentMaxHeight="conflictsExpanded ? 'min(640px, calc(100vh - 160px))' : undefined"
    :showShare="false"
    :titleId
    closeAriaLabel="关闭跨设备同步"
    panelWidth="560px"
  >
    <template #header>
      <h2 :id="titleId">跨设备同步</h2>
    </template>

    <div class="sync-content">
      <p class="sync-description">
        <span v-if="isWindows">上传本机的原神祈愿、深渊、剧诗与危战记录，不含颂愿或登录信息。</span>
        拉取只导入本机缺少的祈愿与高难记录，不覆盖冲突，也不同步删除。
      </p>
      <v-text-field
        v-model="address"
        :disabled="busy"
        autocomplete="off"
        density="compact"
        label="WebDAV 目录地址"
        placeholder="https://example.com/dav/"
        variant="outlined"
      />
      <v-text-field
        v-model="username"
        :disabled="busy"
        autocomplete="username"
        density="compact"
        label="WebDAV 用户名"
        variant="outlined"
      />
      <v-text-field
        v-model="password"
        :disabled="busy"
        autocomplete="off"
        density="compact"
        label="WebDAV 密码"
        type="password"
        variant="outlined"
      />
      <p class="sync-hint">地址和用户名仅保存在本机，密码不会保存。</p>
      <v-checkbox
        v-if="isHttp"
        v-model="unsafeHttp"
        :disabled="busy"
        density="compact"
        hide-details
        label="允许使用未加密的 HTTP"
      />
      <p v-if="isHttp" class="sync-warning">
        HTTP 会明文传输账号、密码和记录，仅应在可信网络中使用。
      </p>
      <v-text-field
        v-model="historyId"
        :aria-label="HistoryIdLabel"
        :disabled="busy"
        :label="HistoryIdLabel"
        autocomplete="off"
        density="compact"
        placeholder="留空使用最新快照"
        variant="outlined"
      />
      <div v-if="statusText" role="status">
        <p class="sync-result">{{ statusText }}</p>
        <p v-if="publishedId" class="sync-result">
          快照 ID：<code>{{ publishedId }}</code>
        </p>
      </div>
      <div v-if="conflictDetails.length > 0 || omittedConflicts > 0" class="sync-conflicts">
        <button
          :aria-controls="conflictDetailsId"
          :aria-expanded="conflictsExpanded"
          :disabled="busy"
          class="sync-conflict-toggle"
          type="button"
          @click="conflictsExpanded = !conflictsExpanded"
        >
          {{ conflictsExpanded ? "收起冲突详情" : "查看冲突详情" }}
        </button>
        <div v-show="conflictsExpanded" :id="conflictDetailsId">
          <template v-if="conflictsExpanded">
            <ul v-if="conflictDetails.length > 0" class="sync-conflict-list" role="list">
              <li
                v-for="conflict in conflictDetails"
                :key="`${conflict.table}:${conflict.uid}:${conflict.id}`"
                class="sync-conflict-record"
              >
                <h3>{{ conflictTableLabel(conflict.table) }}</h3>
                <p class="sync-conflict-meta">
                  <span>{{ conflictFieldLabel(conflict.table, "id") }}：{{ conflict.id }}</span>
                  <span>快照 UID：{{ conflict.uid }}</span>
                  <span>{{ formatConflictTime(conflict) }}</span>
                </p>
                <table class="sync-conflict-fields">
                  <thead>
                    <tr>
                      <th scope="col">不同的字段</th>
                      <th scope="col">本机（已保留）</th>
                      <th scope="col">快照</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="change in conflict.changes" :key="change.field">
                      <th scope="row">{{ conflictFieldLabel(conflict.table, change.field) }}</th>
                      <template v-if="change.values !== undefined">
                        <td>{{ formatConflictValue(change.values.local) }}</td>
                        <td>{{ formatConflictValue(change.values.snapshot) }}</td>
                      </template>
                      <td v-else class="sync-conflict-hidden-value" colspan="2">不展示具体内容</td>
                    </tr>
                  </tbody>
                </table>
              </li>
            </ul>
            <p v-if="omittedConflicts > 0" class="sync-conflict-omitted">
              另有 {{ omittedConflicts }} 条冲突未展示详情。
            </p>
          </template>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="sync-actions">
        <v-btn :disabled="busy" type="button" variant="text" @click="visible = false">关闭</v-btn>
        <v-btn
          :disabled="busy"
          :loading="busyOperation === 'pull'"
          :variant="isWindows ? 'outlined' : 'flat'"
          color="var(--tgc-btn-1)"
          type="button"
          @click="sync('pull')"
        >
          拉取记录
        </v-btn>
        <v-btn
          v-if="isWindows"
          :disabled="busy"
          :loading="busyOperation === 'publish'"
          color="var(--tgc-btn-1)"
          type="button"
          variant="flat"
          @click="sync('publish')"
        >
          上传记录
        </v-btn>
      </div>
    </template>
  </TopOverlay>
</template>

<script lang="ts" setup>
import TopOverlay from "@comp/app/top-overlay.vue";
import showDialog from "@comp/func/dialog.js";
import showSnackbar from "@comp/func/snackbar.js";
import TGSqlite from "@Sql/index.js";
import useAppStore from "@store/app.js";
import { invoke } from "@tauri-apps/api/core";
import { platform } from "@tauri-apps/plugin-os";
import { computed, ref, shallowRef, useId, watch } from "vue";

const ConflictTableLabel = {
  GachaRecords: "祈愿记录",
  SpiralAbyss: "深境螺旋",
  RoleCombat: "幻想真境剧诗",
  HardChallenge: "幽境危战",
};

const ConflictFieldLabel = {
  id: "期次",
  uid: "游戏 UID",
  gachaType: "祈愿卡池",
  uigfType: "归并卡池",
  time: "祈愿时间",
  itemId: "物品 ID",
  name: "期次名称",
  type: "物品类型",
  rank: "稀有度",
  count: "数量",
  startTime: "开始时间",
  endTime: "结束时间",
  totalBattleTimes: "总战斗次数",
  totalWinTimes: "总胜利次数",
  maxFloor: "最深抵达",
  totalStar: "总星数",
  isUnlock: "是否解锁",
  revealRank: "出战次数排行",
  defeatRank: "最多击败排行",
  damageRank: "最强一击排行",
  takeDamageRank: "最多承伤排行",
  normalSkillRank: "元素战技排行",
  energySkillRank: "元素爆发排行",
  floors: "楼层详情",
  skippedFloor: "跳过楼层",
  hasData: "有战绩",
  hasDetailData: "有战绩详情",
  stat: "战绩概况",
  detail: "战斗详情",
  single: "单人战绩",
  mp: "联机战绩",
  blings: "赋光角色",
};

type SyncConflictTable = keyof typeof ConflictTableLabel;
type SyncConflictField = keyof typeof ConflictFieldLabel;
type SyncConflictValue = string | number | boolean | null;

/**
 * 冲突记录的快照身份与本机/快照差异；不含原始详情。
 * @since Beta v0.14.1
 */
type SyncConflictDetail = {
  table: SyncConflictTable;
  uid: string;
  id: string;
  time: string;
  endTime: string | null;
  changes: Array<{
    field: SyncConflictField;
    values?: { local: SyncConflictValue; snapshot: SyncConflictValue };
  }>;
};

type SyncCount = {
  inserted: number;
  identical: number;
  conflicts: number;
};

/**
 * 拉取结果，以及仅用于本机展示的有界冲突明细。
 * @since Beta v0.14.1
 */
type SyncImportStats = {
  gachaRecords: SyncCount;
  spiralAbyss: SyncCount;
  roleCombat: SyncCount;
  hardChallenge: SyncCount;
  conflictDetails: Array<SyncConflictDetail>;
  omittedConflicts: number;
};

/**
 * 手动同步的操作方向。
 * @since Beta v0.14.1
 */
type SyncOperation = "publish" | "pull";

const AddressKey = "teyvatGuideSyncAddress";
const UsernameKey = "teyvatGuideSyncUsername";
const HistoryIdLabel = "历史快照 ID（仅拉取，可选）";
const visible = defineModel<boolean>({ default: false });
const titleId = useId();
const conflictDetailsId = useId();
const isWindows = computed<boolean>(() => platform() === "windows");
const appStore = useAppStore();
const address = ref<string>(localStorage.getItem(AddressKey) ?? "");
const username = ref<string>(localStorage.getItem(UsernameKey) ?? "");
const password = ref<string>("");
const historyId = ref<string>("");
const unsafeHttp = ref<boolean>(false);
const busyOperation = ref<SyncOperation | null>(null);
const busy = computed<boolean>(() => busyOperation.value !== null);
const resultText = ref<string>("");
const publishedId = ref<string>("");
const pullStats = shallowRef<SyncImportStats | null>(null);
const conflictsExpanded = ref<boolean>(false);
const conflictDetails = computed<Array<SyncConflictDetail>>(
  () => pullStats.value?.conflictDetails ?? [],
);
const omittedConflicts = computed<number>(() => pullStats.value?.omittedConflicts ?? 0);
const statusText = computed<string>(() => {
  const stats = pullStats.value;
  return stats === null ? resultText.value : summarize(stats);
});
const isHttp = computed<boolean>(() => address.value.trim().toLowerCase().startsWith("http://"));

watch(visible, (isVisible) => {
  if (!isVisible) {
    password.value = "";
    unsafeHttp.value = false;
    resetPullResult();
  }
});

watch(address, () => {
  unsafeHttp.value = false;
});

function getSettings(): { address: string; username: string } | null {
  const value = address.value.trim();
  const account = username.value.trim();
  try {
    const parsed = new URL(value);
    if (
      !["http:", "https:"].includes(parsed.protocol) ||
      parsed.username ||
      parsed.password ||
      parsed.search ||
      parsed.hash ||
      !account ||
      !password.value
    ) {
      return null;
    }
    if (parsed.protocol === "http:" && !unsafeHttp.value) return null;
  } catch {
    return null;
  }
  return { address: value, username: account };
}

function describeFailure(error: unknown): string {
  if (typeof error === "string" && (error.startsWith("WEBDAV_") || error.startsWith("SYNC_"))) {
    return error;
  }
  return "同步失败，请检查 WebDAV 配置、网络和数据后重试。";
}

function conflictTableLabel(table: SyncConflictTable): string {
  return ConflictTableLabel[table];
}

function conflictFieldLabel(table: SyncConflictTable, field: SyncConflictField): string {
  if (table === "GachaRecords") {
    if (field === "id") return "祈愿 ID";
    if (field === "name") return "祈愿名称";
  }
  return ConflictFieldLabel[field];
}

function formatConflictTime(conflict: SyncConflictDetail): string {
  if (conflict.table === "GachaRecords") return `快照祈愿时间：${conflict.time}`;
  const time =
    conflict.endTime === null ? conflict.time : `${conflict.time} 至 ${conflict.endTime}`;
  return `快照时间：${time}`;
}

function formatConflictValue(value: SyncConflictValue): string {
  if (value === null) return "无值";
  if (value === "") return "空文本";
  if (typeof value === "boolean") return value ? "是" : "否";
  return String(value);
}

function resetPullResult(): void {
  conflictsExpanded.value = false;
  pullStats.value = null;
}

function resetResult(): void {
  resultText.value = "";
  publishedId.value = "";
  resetPullResult();
}

function summarize(stats: SyncImportStats): string {
  const rows = [
    { label: "祈愿", ...stats.gachaRecords },
    { label: "深渊", ...stats.spiralAbyss },
    { label: "剧诗", ...stats.roleCombat },
    { label: "危战", ...stats.hardChallenge },
  ];
  const inserted = rows.reduce((sum, row) => sum + row.inserted, 0);
  const identical = rows.reduce((sum, row) => sum + row.identical, 0);
  const skipped = rows.filter((row) => row.conflicts > 0);
  const summary = `新增 ${inserted} 条，已有相同记录 ${identical} 条。`;
  if (skipped.length === 0) return summary;
  const conflicts = skipped.map((row) => `${row.label} ${row.conflicts} 条`).join("、");
  return `${summary} 以下冲突已保留本机版本：${conflicts}。`;
}

/**
 * 串行执行用户选择的同步操作，仅上传前需要确认。
 * @since Beta v0.14.1
 * @param operation - 同步操作方向
 */
async function sync(operation: SyncOperation): Promise<void> {
  if (busy.value || (operation === "publish" && !isWindows.value)) return;
  const settings = getSettings();
  if (!settings) {
    resetResult();
    showSnackbar.error("请检查 WebDAV 地址、用户名、密码和 HTTP 安全选项。");
    return;
  }

  busyOperation.value = operation;
  try {
    if (operation === "publish") {
      const confirmed = await showDialog.checkF({
        title: "上传 Windows 记录？",
        text: "游戏 UID 和记录会保存到你指定的 WebDAV 目录。",
        confirmLabel: "确定",
      });
      if (!confirmed) return;
    }

    resetResult();
    localStorage.setItem(AddressKey, settings.address);
    localStorage.setItem(UsernameKey, settings.username);
    await TGSqlite.getDB();
    const connection = {
      ...settings,
      password: password.value,
      useProxy: appStore.useProxy,
      unsafeHttp: unsafeHttp.value,
    };
    if (operation === "publish") {
      publishedId.value = await invoke<string>("plugin:record-sync|publish", { connection });
      resultText.value = "上传完成。可以在其他设备上拉取记录。";
    } else {
      const stats = await invoke<SyncImportStats>("plugin:record-sync|pull", {
        connection,
        snapshotId: historyId.value.trim() || null,
      });
      if (visible.value) pullStats.value = stats;
    }
  } catch (error) {
    resultText.value = describeFailure(error);
  } finally {
    busyOperation.value = null;
  }
}
</script>

<style lang="scss" scoped>
.sync-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sync-description,
.sync-hint,
.sync-warning,
.sync-result {
  margin: 0;
}

.sync-hint {
  color: var(--box-text-4);
  font-size: 12px;
}

.sync-warning {
  color: var(--tgc-od-red);
}

.sync-conflicts {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sync-conflict-toggle {
  align-self: flex-start;
  padding: 8px 12px;
  border: 1px solid var(--common-shadow-2);
  border-radius: 4px;
  color: var(--app-page-content);
  cursor: pointer;
  font-size: 14px;
  line-height: 20px;
}

.sync-conflict-toggle:focus-visible {
  outline: 2px solid currentcolor;
  outline-offset: 2px;
}

.sync-conflict-toggle:hover:not(:disabled),
.sync-conflict-toggle[aria-expanded="true"] {
  background: var(--box-bg-4);
}

.sync-conflict-list {
  display: grid;
  padding: 0;
  margin: 0;
  gap: 8px;
  list-style: none;
}

.sync-conflict-record {
  padding: 12px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--box-bg-1);
  color: var(--box-text-1);
  overflow-wrap: anywhere;
}

.sync-conflict-record h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  line-height: 22px;
}

.sync-conflict-meta {
  display: flex;
  flex-wrap: wrap;
  margin: 4px 0 8px;
  color: var(--box-text-4);
  font-size: 12px;
  gap: 4px 12px;
  line-height: 16px;
}

.sync-conflict-fields {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
  line-height: 20px;
  table-layout: fixed;
}

.sync-conflict-fields th,
.sync-conflict-fields td {
  padding: 4px 8px;
  border-bottom: 1px solid var(--common-shadow-1);
  text-align: start;
  vertical-align: top;
}

.sync-conflict-fields thead {
  background: var(--box-bg-4);
}

.sync-conflict-hidden-value,
.sync-conflict-omitted {
  color: var(--box-text-4);
  font-size: 12px;
  line-height: 16px;
}

.sync-conflict-omitted {
  margin: 8px 0 0;
}

.sync-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
