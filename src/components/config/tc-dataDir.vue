<template>
  <v-list class="config-list">
    <v-list-subheader :inset="true" class="config-header" title="路径" />
    <v-divider :inset="true" class="border-opacity-75" />
    <v-list-item prepend-icon="mdi-folder-key">
      <v-list-item-title style="cursor: pointer" @click="confirmCUD"
        >用户数据目录</v-list-item-title
      >
      <v-list-item-subtitle @click="openPath('user')">{{ appStore.userDir }}</v-list-item-subtitle>
      <template #append>
        <v-icon @click="copyPath('user')">mdi-content-copy</v-icon>
      </template>
    </v-list-item>
    <v-list-item prepend-icon="mdi-folder-account" title="应用数据库路径">
      <v-list-item-subtitle @click="openPath('db')">{{ appStore.dbPath }}</v-list-item-subtitle>
      <template #append>
        <v-icon @click="copyPath('db')">mdi-content-copy</v-icon>
      </template>
    </v-list-item>
    <v-list-item prepend-icon="mdi-folder-multiple">
      <v-list-item-title style="cursor: pointer" @click="confirmCLD">日志目录</v-list-item-title>
      <v-list-item-subtitle @click="openPath('log')">{{ appStore.logDir }} </v-list-item-subtitle>
      <template #append>
        <v-icon @click="copyPath('log')">mdi-content-copy</v-icon>
      </template>
    </v-list-item>
  </v-list>
</template>
<script lang="ts" setup>
import { dialog, fs, path } from "@tauri-apps/api";

import TGSqlite from "../../plugins/Sqlite";
import { useAppStore } from "../../store/modules/app";
import { backUpUserData } from "../../utils/dataBS";
import showConfirm from "../func/confirm";
import showSnackbar from "../func/snackbar";

const appStore = useAppStore();

async function confirmCUD(): Promise<void> {
  const oriDir = appStore.userDir;
  const check = await showConfirm({
    title: "确认修改用户数据路径吗？",
    text: "祈愿数据需修改后重新手动备份！",
  });
  if (!check) {
    showSnackbar({
      color: "cancel",
      text: "已取消修改",
    });
    return;
  }
  const dir = await dialog.open({
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
  if (typeof dir !== "string") {
    showSnackbar({
      color: "error",
      text: "路径错误!",
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
  await fs.removeDir(oriDir, { recursive: true });
  showSnackbar({
    text: "已重新备份数据!即将刷新页面！",
    timeout: 3000,
  });
  setTimeout(() => {
    window.location.reload();
  }, 4000);
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
  const now = new Date();
  const nowDate = `${now.getFullYear()}${now.getMonth() + 1}${now.getDate()}`;
  const logDir = appStore.logDir;
  const files = await fs.readDir(logDir);
  const delFiles = files.filter((file) => {
    const fileName = file.path.split(path.sep).pop()?.replace(".log", "");
    if (fileName === undefined) return false;
    const fileDate = parseInt(fileName.replace(/-/g, ""));
    return fileDate < parseInt(nowDate) - 7;
  });
  if (delFiles.length < 1) {
    showSnackbar({
      color: "warn",
      text: "无需清理!",
    });
    return;
  }
  for (const file of delFiles) {
    await fs.removeFile(file.path);
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
      targetPath = appStore.dbPath;
      break;
    case "user":
      targetPath = appStore.userDir;
      break;
    case "log":
      targetPath = appStore.logDir;
      break;
  }
  await dialog.open({
    directory: type !== "db",
    defaultPath: targetPath,
    multiple: false,
  });
}
</script>
<style lang="css" scoped>
.config-header {
  margin-top: 10px;
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: large;
}
</style>
