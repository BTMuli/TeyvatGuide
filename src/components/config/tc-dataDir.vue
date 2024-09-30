<template>
  <v-list class="config-list">
    <v-list-subheader :inset="true" class="config-header" title="路径" />
    <v-divider :inset="true" class="border-opacity-75" />
    <v-list-item title="用户数据目录" :subtitle="appStore.userDir.value">
      <template #prepend>
        <div class="config-icon">
          <v-icon>mdi-folder-key</v-icon>
        </div>
      </template>
      <template #append>
        <div class="config-opers">
          <v-icon @click="confirmCUD()" title="修改用户数据目录"> mdi-pencil </v-icon>
          <v-icon @click="openPath('user')" title="打开用户数据目录"> mdi-folder-open </v-icon>
          <v-icon @click="copyPath('user')" title="复制用户数据目录路径"> mdi-content-copy </v-icon>
        </div>
      </template>
    </v-list-item>
    <v-list-item title="应用数据库路径" :subtitle="appStore.dbPath.value">
      <template #prepend>
        <div class="config-icon">
          <v-icon>mdi-folder-account</v-icon>
        </div>
      </template>
      <template #append>
        <div class="config-opers">
          <v-icon @click="openPath('db')" title="打开数据库目录"> mdi-folder-open </v-icon>
          <v-icon @click="copyPath('db')" title="复制数据库目录路径"> mdi-content-copy </v-icon>
        </div>
      </template>
    </v-list-item>
    <v-list-item title="游戏安装目录" :subtitle="appStore.gameDir.value">
      <template #prepend>
        <div class="config-icon">
          <v-icon>mdi-gamepad</v-icon>
        </div>
      </template>
      <template #append>
        <div class="config-opers">
          <v-icon @click="confirmCGD()" title="修改游戏安装目录"> mdi-pencil </v-icon>
          <v-icon @click="openPath('game')" title="打开游戏安装目录"> mdi-folder-open </v-icon>
          <v-icon @click="copyPath('game')" title="复制游戏安装目录"> mdi-content-copy </v-icon>
        </div>
      </template>
    </v-list-item>
    <v-list-item title="日志目录" :subtitle="appStore.logDir.value">
      <template #prepend>
        <div class="config-icon">
          <v-icon>mdi-folder-multiple</v-icon>
        </div>
      </template>
      <template #append>
        <div class="config-opers">
          <v-icon @click="confirmCLD()" title="清理日志文件"> mdi-delete </v-icon>
          <v-icon @click="openPath('log')" title="打开日志目录"> mdi-folder-open </v-icon>
          <v-icon @click="copyPath('log')" title="复制日志目录路径"> mdi-content-copy </v-icon>
        </div>
      </template>
    </v-list-item>
  </v-list>
</template>
<script lang="ts" setup>
import { path } from "@tauri-apps/api";
import { open } from "@tauri-apps/plugin-dialog";
import { exists, readDir, remove } from "@tauri-apps/plugin-fs";
import { platform } from "@tauri-apps/plugin-os";
import { storeToRefs } from "pinia";
import { onMounted } from "vue";

import TGSqlite from "../../plugins/Sqlite/index.js";
import { useAppStore } from "../../store/modules/app.js";
import { backUpUserData } from "../../utils/dataBS.js";
import TGShell from "../../utils/TGShell.js";
import showConfirm from "../func/confirm.js";
import showSnackbar from "../func/snackbar.js";

const appStore = storeToRefs(useAppStore());

onMounted(async () => {
  const logDir = await path.appLogDir();
  const dbPath = `${await path.appConfigDir()}${path.sep()}TeyvatGuide.db`;
  let message = "";
  if (appStore.dbPath.value !== dbPath) {
    appStore.dbPath.value = dbPath;
    await TGSqlite.saveAppData("dbPath", dbPath);
    message += "数据库路径 ";
  }
  if (appStore.logDir.value !== logDir) {
    appStore.logDir.value = logDir;
    message += "日志路径 ";
  }
  if (message !== "") {
    showSnackbar({ text: `${message}已更新!`, color: "success" });
  }
});

async function confirmCUD(): Promise<void> {
  const oriDir = appStore.userDir.value;
  const check = await showConfirm({ title: "确认修改用户数据路径吗？" });
  if (!check) {
    showSnackbar({ color: "cancel", text: "已取消修改" });
    return;
  }
  const dir: string | null = await open({
    directory: true,
    defaultPath: oriDir,
    multiple: false,
  });
  if (dir === null) {
    showSnackbar({ color: "error", text: "路径不能为空!" });
    return;
  }
  if (dir === oriDir) {
    showSnackbar({ color: "warn", text: "路径未修改!" });
    return;
  }
  appStore.userDir.value = dir;
  await TGSqlite.saveAppData("userDir", dir);
  await backUpUserData(dir);
  showSnackbar({ text: "已重新备份数据!", color: "success" });
  const confirm = await showConfirm({ title: "是否删除原用户数据目录？", text: "删除后不可恢复!" });
  if (confirm) {
    await remove(oriDir, { recursive: true });
    showSnackbar({ text: "已删除原用户数据目录!", color: "success" });
  }
  setTimeout(() => {
    window.location.reload();
  }, 4000);
}

async function confirmCGD(): Promise<void> {
  if (platform() !== "windows") {
    showSnackbar({ text: "不支持的平台！", color: "warning" });
    return;
  }
  const oriEmpty = appStore.gameDir.value === "未设置";
  const editConfirm = await showConfirm({
    title: oriEmpty ? "确认设置目录？" : "确认修改目录？",
    text: oriEmpty ? "请选择启动器所在目录" : `当前：${appStore.gameDir.value}`,
  });
  if (!editConfirm) {
    showSnackbar({ text: oriEmpty ? "取消设置启动器目录" : "取消修改启动器目录", color: "cancel" });
    return;
  }
  const dir: string | null = await open({
    directory: true,
    defaultPath: oriEmpty ? undefined : appStore.gameDir.value,
    multiple: false,
  });
  if (dir === null) {
    showSnackbar({ text: "路径不能为空!", color: "error" });
    return;
  }
  if (!oriEmpty && appStore.gameDir.value === dir) {
    showSnackbar({ text: "路径未修改！", color: "warn" });
    return;
  }
  // 校验是否存在游戏本体
  if (!(await exists(`${dir}${path.sep()}YuanShen.exe`))) {
    showSnackbar({ text: "未检测到游戏本体", color: "error" });
    return;
  }
  appStore.gameDir.value = dir;
  showSnackbar({ text: oriEmpty ? "成功设置游戏目录" : "成功修改游戏目录" });
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
    showSnackbar({ color: "cancel", text: "已取消清理" });
    return;
  }
  const logDir = appStore.logDir.value;
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
    showSnackbar({ color: "warn", text: "无需清理!" });
    return;
  }
  for (const file of delFiles) {
    const filePath = `${logDir}/${file.name}`;
    await remove(filePath);
  }
  showSnackbar({ text: `已清理 ${delFiles.length} 个日志文件!` });
}

function copyPath(type: "db" | "user" | "log" | "game"): void {
  let targetPath: string, targetName: string;
  switch (type) {
    case "db":
      targetPath = appStore.dbPath.value;
      targetName = "数据库";
      break;
    case "user":
      targetPath = appStore.userDir.value;
      targetName = "用户数据";
      break;
    case "log":
      targetPath = appStore.logDir.value;
      targetName = "日志";
      break;
    case "game":
      if (appStore.gameDir.value === "未设置") {
        showSnackbar({ text: "未设置游戏目录！", color: "warn" });
        return;
      }
      targetPath = appStore.gameDir.value;
      targetName = "游戏安装目录";
  }
  navigator.clipboard.writeText(targetPath);
  showSnackbar({ text: `${targetName}路径已复制!` });
}

async function openPath(type: "db" | "user" | "log" | "game"): Promise<void> {
  let targetPath: string;
  switch (type) {
    case "db":
      targetPath = await path.appConfigDir();
      break;
    case "user":
      targetPath = appStore.userDir.value;
      break;
    case "log":
      targetPath = appStore.logDir.value;
      break;
    case "game":
      if (appStore.gameDir.value === "未设置") {
        showSnackbar({ text: "未设置游戏目录！", color: "warn" });
        return;
      }
      targetPath = appStore.gameDir.value;
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

.config-opers {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  column-gap: 10px;
}
</style>
