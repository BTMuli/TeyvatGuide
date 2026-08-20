<template>
  <v-list class="config-list">
    <v-list-subheader :inset="true" class="config-header" title="路径" />
    <v-divider :inset="true" class="border-opacity-75" />
    <v-list-item :subtitle="userDir" title="用户数据目录">
      <template #prepend>
        <div class="config-icon">
          <v-icon>mdi-folder-key</v-icon>
        </div>
      </template>
      <template #append>
        <div class="config-opers">
          <v-icon title="修改用户数据目录" @click="confirmCUD()"> mdi-pencil</v-icon>
          <v-icon title="打开用户数据目录" @click="openDataPath('user')"> mdi-folder-open</v-icon>
          <v-icon title="复制用户数据目录路径" @click="copyPath('user')"> mdi-content-copy</v-icon>
        </div>
      </template>
    </v-list-item>
    <v-list-item :subtitle="dbPath" title="应用数据库路径">
      <template #prepend>
        <div class="config-icon">
          <v-icon>mdi-folder-account</v-icon>
        </div>
      </template>
      <template #append>
        <div class="config-opers">
          <v-icon title="打开数据库目录" @click="openDataPath('db')"> mdi-folder-open</v-icon>
          <v-icon title="复制数据库目录路径" @click="copyPath('db')"> mdi-content-copy</v-icon>
        </div>
      </template>
    </v-list-item>
    <v-list-item :subtitle="logDir" title="日志目录">
      <template #prepend>
        <div class="config-icon">
          <v-icon>mdi-folder-multiple</v-icon>
        </div>
      </template>
      <template #append>
        <div class="config-opers">
          <v-icon title="清理日志文件" @click="confirmCLD()"> mdi-delete</v-icon>
          <v-icon title="打开日志目录" @click="openDataPath('log')"> mdi-folder-open</v-icon>
          <v-icon title="复制日志目录路径" @click="copyPath('log')"> mdi-content-copy</v-icon>
        </div>
      </template>
    </v-list-item>
  </v-list>
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
import { onMounted } from "vue";

const { dbPath, logDir, userDir } = storeToRefs(useAppStore());

onMounted(async () => {
  const logDirGet = await path.appLogDir();
  const dbPathGet = `${await path.appConfigDir()}${path.sep()}TeyvatGuide.db`;
  let message = "";
  if (dbPath.value !== dbPathGet) {
    dbPath.value = dbPathGet;
    await TGSqlite.saveAppData("dbPath", dbPathGet);
    message += "数据库路径 ";
  }
  if (logDir.value !== logDirGet) {
    logDir.value = logDirGet;
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
  const dir: string | null = await open({ directory: true, defaultPath: oriDir, multiple: false });
  if (dir === null) {
    showSnackbar.warn("路径不能为空!");
    return;
  }
  if (dir === oriDir) {
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
      targetPath = dbPath.value;
      targetName = "数据库";
      break;
    case "user":
      targetPath = userDir.value;
      targetName = "用户数据";
      break;
    case "log":
      targetPath = logDir.value;
      targetName = "日志";
  }
  navigator.clipboard.writeText(targetPath);
  showSnackbar.success(`${targetName}路径已复制!`);
}

async function openDataPath(type: "db" | "user" | "log"): Promise<void> {
  let targetPath: string;
  switch (type) {
    case "db":
      targetPath = await path.appConfigDir();
      break;
    case "user":
      targetPath = userDir.value;
      break;
    case "log":
      targetPath = logDir.value;
      break;
  }
  await openPath(targetPath);
}
</script>
<style lang="css" scoped>
.config-header {
  margin-top: 10px;
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: large;
}

.config-icon {
  display: flex;
  width: 40px;
  height: 40px;
  align-items: center;
  justify-content: center;
  padding: 5px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 5px;
  margin-right: 15px;
  background: var(--box-bg-2);
  color: var(--box-text-2);
}

.config-opers {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  column-gap: 10px;
}
</style>
