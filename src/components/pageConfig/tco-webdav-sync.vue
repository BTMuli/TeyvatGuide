<template>
  <TopOverlay
    v-model="visible"
    :closeDisabled="busy"
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
        {{
          isWindows
            ? "上传本机的原神祈愿、深渊、剧诗与危战记录，不含颂愿或登录信息。"
            : "只导入本机缺少的祈愿与高难记录，不覆盖冲突，也不同步删除。"
        }}
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
        v-if="!isWindows"
        v-model="snapshotId"
        :disabled="busy"
        autocomplete="off"
        density="compact"
        label="历史快照 ID（可选）"
        placeholder="留空使用最新快照"
        variant="outlined"
      />
      <div v-if="resultText" role="status">
        <p class="sync-result">{{ resultText }}</p>
        <p v-if="publishedId" class="sync-result">
          快照 ID：<code>{{ publishedId }}</code>
        </p>
      </div>
    </div>

    <template #footer>
      <div class="sync-actions">
        <v-btn :disabled="busy" type="button" variant="text" @click="visible = false">关闭</v-btn>
        <v-btn
          :disabled="busy"
          :loading="busy"
          color="var(--tgc-btn-1)"
          type="button"
          variant="flat"
          @click="sync"
        >
          {{ isWindows ? "上传记录" : "从 Windows 同步" }}
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
import { computed, ref, useId, watch } from "vue";

type SyncCount = {
  inserted: number;
  identical: number;
  conflicts: number;
};

type SyncImportStats = {
  gachaRecords: SyncCount;
  spiralAbyss: SyncCount;
  roleCombat: SyncCount;
  hardChallenge: SyncCount;
};

const AddressKey = "teyvatGuideSyncAddress";
const UsernameKey = "teyvatGuideSyncUsername";
const visible = defineModel<boolean>({ default: false });
const titleId = useId();
const isWindows = computed<boolean>(() => platform() === "windows");
const appStore = useAppStore();
const address = ref<string>(localStorage.getItem(AddressKey) ?? "");
const username = ref<string>(localStorage.getItem(UsernameKey) ?? "");
const password = ref<string>("");
const snapshotId = ref<string>("");
const unsafeHttp = ref<boolean>(false);
const busy = ref<boolean>(false);
const resultText = ref<string>("");
const publishedId = ref<string>("");
const isHttp = computed<boolean>(() => address.value.trim().toLowerCase().startsWith("http://"));

watch(visible, (isVisible) => {
  if (!isVisible) {
    password.value = "";
    unsafeHttp.value = false;
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

async function sync(): Promise<void> {
  if (busy.value) return;
  const settings = getSettings();
  if (!settings) {
    resultText.value = "";
    publishedId.value = "";
    showSnackbar.error("请检查 WebDAV 地址、用户名、密码和 HTTP 安全选项。");
    return;
  }

  busy.value = true;
  try {
    if (isWindows.value) {
      const confirmed = await showDialog.check(
        "上传 Windows 记录？",
        "游戏 UID 和记录会保存到你指定的 WebDAV 目录。",
      );
      if (!confirmed) return;
    }

    resultText.value = "";
    publishedId.value = "";
    localStorage.setItem(AddressKey, settings.address);
    localStorage.setItem(UsernameKey, settings.username);
    await TGSqlite.getDB();
    const connection = {
      ...settings,
      password: password.value,
      useProxy: appStore.useProxy,
      unsafeHttp: unsafeHttp.value,
    };
    if (isWindows.value) {
      publishedId.value = await invoke<string>("plugin:record-sync|publish", { connection });
      resultText.value = "上传完成。现在可以在 Mac 上拉取记录。";
    } else {
      const stats = await invoke<SyncImportStats>("plugin:record-sync|pull", {
        connection,
        snapshotId: snapshotId.value.trim() || null,
      });
      resultText.value = summarize(stats);
    }
  } catch (error) {
    resultText.value = describeFailure(error);
  } finally {
    busy.value = false;
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

.sync-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
