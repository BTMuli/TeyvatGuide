<template>
  <v-list class="config-list">
    <v-list-subheader :inset="true" class="config-header" title="路径" />
    <v-divider :inset="true" class="border-opacity-75" />
    <v-list-item title="用户数据目录" :subtitle="appStore.userDir">
      <template #prepend>
        <div class="config-icon">
          <v-icon>mdi-folder-key</v-icon>
        </div>
      </template>
      <template #append>
        <v-icon @click="confirmCUD()" style="cursor: pointer" title="修改用户数据目录"
          >mdi-pencil
        </v-icon>
        &emsp;
        <v-icon @click="openPath('user')" style="cursor: pointer" title="打开用户数据目录"
          >mdi-folder-open
        </v-icon>
        &emsp;
        <v-icon @click="copyPath('user')" style="cursor: pointer" title="复制用户数据目录路径"
          >mdi-content-copy
        </v-icon>
      </template>
    </v-list-item>
    <v-list-item title="应用数据库路径" :subtitle="appStore.dbPath">
      <template #prepend>
        <div class="config-icon">
          <v-icon>mdi-folder-account</v-icon>
        </div>
      </template>
      <template #append>
        <v-icon @click="openPath('db')" style="cursor: pointer" title="打开数据库目录"
          >mdi-folder-open
        </v-icon>
        &emsp;
        <v-icon @click="copyPath('db')" style="cursor: pointer" title="复制数据库目录路径"
          >mdi-content-copy
        </v-icon>
      </template>
    </v-list-item>
    <v-list-item title="日志目录" :subtitle="appStore.logDir">
      <template #prepend>
        <div class="config-icon">
          <v-icon>mdi-folder-multiple</v-icon>
        </div>
      </template>
      <template #append>
        <v-icon @click="confirmCLD()" style="cursor: pointer" title="清理日志文件"
          >mdi-delete
        </v-icon>
        &emsp;
        <v-icon @click="openPath('log')" style="cursor: pointer" title="打开日志目录"
          >mdi-folder-open
        </v-icon>
        &emsp;
        <v-icon @click="copyPath('log')" style="cursor: pointer" title="复制日志目录路径"
          >mdi-content-copy
        </v-icon>
      </template>
    </v-list-item>
  </v-list>
</template>
<script lang="ts" setup>
import { path } from "@tauri-apps/api";
import { open } from "@tauri-apps/plugin-dialog";
import { readDir, remove } from "@tauri-apps/plugin-fs";
import { onMounted } from "vue";

import TGSqlite from "../../plugins/Sqlite/index.js";
import { useAppStore } from "../../store/modules/app.js";
import { backUpUserData } from "../../utils/dataBS.js";
import TGShell from "../../utils/TGShell.js";
import showConfirm from "../func/confirm.js";
import showSnackbar from "../func/snackbar.js";

const appStore = useAppStore();

onMounted(async () => {
  const logDir = await path.appLogDir();
  const dbPath = `${await path.appConfigDir()}${path.sep()}TeyvatGuide.db`;
  let message = "";
  if (appStore.dbPath !== dbPath) {
    appStore.dbPath = dbPath;
    await TGSqlite.saveAppData("dbPath", dbPath);
    message += "数据库路径 ";
  }
  if (appStore.logDir !== logDir) {
    appStore.logDir = logDir;
    message += "日志路径 ";
  }
  if (message !== "") {
    showSnackbar({
      text: `${message}已更新!`,
      color: "success",
    });
  }
});

async function confirmCUD(): Promise<void> {
  const oriDir = appStore.userDir;
  const check = await showConfirm({ title: "确认修改用户数据路径吗？" });
  if (!check) {
    showSnackbar({
      color: "cancel",
      text: "已取消修改",
    });
    return;
  }
  const dir: string | null = await open({
    directory: true,
    defaultPath: oriDir,
    multiple: false,
  });
  if (dir === null) {
    showSnackbar({
      color: "error",
      text: "路径不能为空!",
    });
    return;
  }
  if (dir === oriDir) {
    showSnackbar({
      color: "warn",
      text: "路径未修改!",
    });
    return;
  }
  appStore.userDir = dir;
  await TGSqlite.saveAppData("userDir", dir);
  await backUpUserData(dir);
  showSnackbar({
    text: "已重新备份数据!",
    color: "success",
  });
  const confirm = await showConfirm({
    title: "是否删除原用户数据目录？",
    text: "删除后不可恢复!",
  });
  if (confirm) {
    await remove(oriDir, { recursive: true });
    showSnackbar({
      text: "已删除原用户数据目录!",
      color: "success",
    });
  }
  setTimeout(() => {
    window.location.reload();
  }, 4000);
}

// 判断是否超过一周
function isOverWeek(date: string): boolean {
  const nowTs = Date.now();
  const checkTs = new Date(date).getTime();
  const weekTs = 7 * 24 * 60 * 60 * 1000;
  return nowTs - checkTs >= weekTs;
}

async function confirmCLD(): Promise<void> {
  const check = await showConfirm({
    title: "确认清理日志文件吗？",
    text: "将保留一周内的日志文件",
  });
  if (!check) {
    showSnackbar({
      color: "cancel",
      text: "已取消清理",
    });
    return;
  }
  const logDir = appStore.logDir;
  const files = await readDir(logDir);
  const delFiles = files.filter((file) => {
    // yyyy-mm-dd.log
    const reg = /(\d{4}-\d{2}-\d{2}\.log)/;
    const match = file.name.match(reg);
    if (!Array.isArray(match) || match.length < 1) return false;
    const date = match[1].replace(".log", "");
    return isOverWeek(date);
  });
  if (delFiles.length < 1) {
    showSnackbar({
      color: "warn",
      text: "无需清理!",
    });
    return;
  }
  for (const file of delFiles) {
    const filePath = `${logDir}/${file.name}`;
    await remove(filePath);
  }
  showSnackbar({
    text: `已清理 ${delFiles.length} 个日志文件!`,
  });
}

function copyPath(type: "db" | "user" | "log"): void {
  let targetPath: string, targetName: string;
  switch (type) {
    case "db":
      targetPath = appStore.dbPath;
      targetName = "数据库";
      break;
    case "user":
      targetPath = appStore.userDir;
      targetName = "用户数据";
      break;
    case "log":
      targetPath = appStore.logDir;
      targetName = "日志";
      break;
  }
  navigator.clipboard.writeText(targetPath);
  showSnackbar({
    text: `${targetName}路径已复制!`,
  });
}

async function openPath(type: "db" | "user" | "log"): Promise<void> {
  let targetPath: string;
  switch (type) {
    case "db":
      targetPath = await path.appConfigDir();
      break;
    case "user":
      targetPath = appStore.userDir;
      break;
    case "log":
      targetPath = appStore.logDir;
      break;
  }
  await TGShell.openPath(targetPath);
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
</style>
