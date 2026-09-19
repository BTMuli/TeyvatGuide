<template>
  <TcConfigSection title="路径" icon="mdi-folder-multiple-outline" :columns="1">
    <TcConfigItem :subtitle="externalUserDir" title="用户数据目录" icon="mdi-folder-key">
      <template #append>
        <v-btn
          aria-label="修改用户数据目录"
          icon="mdi-pencil"
          size="28"
          title="修改用户数据目录"
          variant="text"
          @click="confirmCUD()"
        />
        <v-btn
          aria-label="打开用户数据目录"
          icon="mdi-folder-open"
          size="28"
          title="打开用户数据目录"
          variant="text"
          @click="openDataPath('user')"
        />
        <v-btn
          aria-label="复制用户数据目录路径"
          icon="mdi-content-copy"
          size="28"
          title="复制用户数据目录路径"
          variant="text"
          @click="copyPath('user')"
        />
      </template>
    </TcConfigItem>
    <TcConfigItem :subtitle="externalDbPath" title="应用数据库路径" icon="mdi-folder-account">
      <template #append>
        <v-btn
          aria-label="打开数据库目录"
          icon="mdi-folder-open"
          size="28"
          title="打开数据库目录"
          variant="text"
          @click="openDataPath('db')"
        />
        <v-btn
          aria-label="复制数据库目录路径"
          icon="mdi-content-copy"
          size="28"
          title="复制数据库目录路径"
          variant="text"
          @click="copyPath('db')"
        />
      </template>
    </TcConfigItem>
    <TcConfigItem :subtitle="externalLogDir" title="日志目录" icon="mdi-folder-multiple">
      <template #append>
        <v-btn
          aria-label="清理日志文件"
          icon="mdi-delete"
          color="var(--tgc-od-red)"
          size="28"
          title="清理日志文件"
          variant="text"
          @click="confirmCLD()"
        />
        <v-btn
          aria-label="打开日志目录"
          icon="mdi-folder-open"
          size="28"
          title="打开日志目录"
          variant="text"
          @click="openDataPath('log')"
        />
        <v-btn
          aria-label="复制日志目录路径"
          icon="mdi-content-copy"
          size="28"
          title="复制日志目录路径"
          variant="text"
          @click="copyPath('log')"
        />
      </template>
    </TcConfigItem>
  </TcConfigSection>
</template>
<script lang="ts" setup>
import showDialog from "@comp/func/dialog.js";
import showLoading from "@comp/func/loading.js";
import showSnackbar from "@comp/func/snackbar.js";
import TGSqlite from "@Sql/index.js";
import useAppStore from "@store/app.js";
import { core, path } from "@tauri-apps/api";
import { open } from "@tauri-apps/plugin-dialog";
import { readDir, remove } from "@tauri-apps/plugin-fs";
import { openPath } from "@tauri-apps/plugin-opener";
import { backUpUserData } from "@utils/dataBS.js";
import TGLogger from "@utils/TGLogger.js";
import { storeToRefs } from "pinia";
import { onMounted, ref } from "vue";

import TcConfigItem from "./tc-config-item.vue";
import TcConfigSection from "./tc-config-section.vue";

const { dbPath, logDir, userDir } = storeToRefs(useAppStore());
const externalUserDir = ref<string>(userDir.value);
const externalDbDir = ref<string>("");
const externalDbPath = ref<string>(dbPath.value);
const externalLogDir = ref<string>(logDir.value);

onMounted(async () => {
  const [logDirRaw, dbDirRaw] = await Promise.all([path.appLogDir(), path.appConfigDir()]);
  const dbPathGet = `${dbDirRaw}${path.sep()}TeyvatGuide.db`;
  const [externalUserDirGet, externalDbDirGet, logDirGet] = await Promise.all([
    resolveExternalPath(userDir.value),
    resolveExternalPath(dbDirRaw),
    resolveExternalPath(logDirRaw),
  ]);
  externalUserDir.value = externalUserDirGet;
  externalDbDir.value = externalDbDirGet;
  externalDbPath.value = `${externalDbDir.value}${path.sep()}TeyvatGuide.db`;
  externalLogDir.value = logDirGet;
  let message = "";
  if (dbPath.value !== dbPathGet) {
    dbPath.value = dbPathGet;
    await TGSqlite.saveAppData("dbPath", dbPathGet);
    message += "数据库路径 ";
  }
  if (logDir.value !== logDirRaw) {
    logDir.value = logDirRaw;
    message += "日志路径 ";
  }
  if (message !== "") showSnackbar.success(`${message}已更新!`);
});

async function confirmCUD(): Promise<void> {
  const oriDir = userDir.value;
  const changeCheck = await showDialog.check("确认修改用户数据路径吗？", "请选取空目录");
  if (!changeCheck) {
    showSnackbar.cancel("已取消修改");
    return;
  }
  const dir: string | null = await open({
    directory: true,
    defaultPath: externalUserDir.value,
    multiple: false,
  });
  if (dir === null) {
    showSnackbar.warn("路径不能为空!");
    return;
  }
  if (dir === oriDir || dir === externalUserDir.value) {
    showSnackbar.warn("路径未修改!");
    return;
  }
  const dirRead = await readDir(dir);
  if (dirRead.length !== 0) {
    showSnackbar.warn("请选择空目录");
    return;
  }
  await TGLogger.Info(`[TcDataDir] 修改用户数据目录： ${userDir.value} → ${dir}`);
  userDir.value = dir;
  externalUserDir.value = await resolveExternalPath(dir);
  await TGSqlite.saveAppData("userDir", dir);
  await backUpUserData(dir);
  showSnackbar.success("已修改用户数据路径!");
  const delCheck = await showDialog.check("是否删除原用户数据目录？");
  if (!delCheck) {
    showSnackbar.cancel(`取消删除原数据目录`);
    return;
  }
  const delDirRead = await readDir(oriDir);
  if (delDirRead.some((i) => i.isDirectory)) {
    const check = await showDialog.check(`检测到子目录，确定删除？`, oriDir);
    if (!check) {
      showSnackbar.cancel(`取消删除原数据目录`);
      return;
    }
  }
  const delCheck2 = await showDialog.check("无法通过回收站恢复，确认删除？", oriDir);
  if (!delCheck2) {
    showSnackbar.cancel(`取消删除原数据目录`);
    return;
  }
  try {
    await remove(oriDir, { recursive: true });
  } catch (err) {
    if (err instanceof Error) {
      showSnackbar.error(err.message);
    } else showSnackbar.error(`${err}`);
    return;
  }
  showSnackbar.success("已删除原用户数据目录!");
}

type ClearAppLogsResult = {
  removed: number;
  failed: number;
};

async function confirmCLD(): Promise<void> {
  const delCheck = await showDialog.check("确认清理日志文件吗？", "将保留一周内的日志文件");
  if (!delCheck) {
    showSnackbar.cancel("已取消清理");
    return;
  }
  await showLoading.start("正在清理日志文件...");
  try {
    const result = await core.invoke<ClearAppLogsResult>("clear_app_logs");
    if (result.removed === 0 && result.failed === 0) {
      showSnackbar.warn("无需清理!");
      return;
    }
    if (result.removed === 0) {
      showSnackbar.error("清理日志文件失败");
      return;
    }
    if (result.failed > 0) {
      showSnackbar.warn(`已清理 ${result.removed} 个日志文件，${result.failed} 个未能删除`);
      return;
    }
    showSnackbar.success(`已清理 ${result.removed} 个日志文件!`);
  } catch (error) {
    showSnackbar.error(`清理日志失败：${error}`);
    await TGLogger.Error(`[TcDataDir] 清理日志失败：${error}`);
  } finally {
    await showLoading.end();
  }
}

function copyPath(type: "db" | "user" | "log"): void {
  let targetPath: string, targetName: string;
  switch (type) {
    case "db":
      targetPath = externalDbPath.value;
      targetName = "数据库";
      break;
    case "user":
      targetPath = externalUserDir.value;
      targetName = "用户数据";
      break;
    case "log":
      targetPath = externalLogDir.value;
      targetName = "日志";
  }
  navigator.clipboard.writeText(targetPath);
  showSnackbar.success(`${targetName}路径已复制!`);
}

async function openDataPath(type: "db" | "user" | "log"): Promise<void> {
  let targetPath: string;
  switch (type) {
    case "db":
      targetPath = externalDbDir.value;
      break;
    case "user":
      targetPath = externalUserDir.value;
      break;
    case "log":
      targetPath = externalLogDir.value;
      break;
  }
  await openPath(targetPath);
}

async function resolveExternalPath(targetPath: string): Promise<string> {
  return await core.invoke<string>("resolve_external_path", { path: targetPath });
}
</script>
