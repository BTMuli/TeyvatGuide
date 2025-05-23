<template>
  <v-list class="config-list">
    <v-list-subheader :inset="true" class="config-header" title="路径" />
    <v-divider :inset="true" class="border-opacity-75" />
    <v-list-item title="用户数据目录" :subtitle="userDir">
      <template #prepend>
        <div class="config-icon">
          <v-icon>mdi-folder-key</v-icon>
        </div>
      </template>
      <template #append>
        <div class="config-opers">
          <v-icon @click="confirmCUD()" title="修改用户数据目录"> mdi-pencil</v-icon>
          <v-icon @click="openDataPath('user')" title="打开用户数据目录"> mdi-folder-open</v-icon>
          <v-icon @click="copyPath('user')" title="复制用户数据目录路径"> mdi-content-copy</v-icon>
        </div>
      </template>
    </v-list-item>
    <v-list-item title="应用数据库路径" :subtitle="dbPath">
      <template #prepend>
        <div class="config-icon">
          <v-icon>mdi-folder-account</v-icon>
        </div>
      </template>
      <template #append>
        <div class="config-opers">
          <v-icon @click="openDataPath('db')" title="打开数据库目录"> mdi-folder-open</v-icon>
          <v-icon @click="copyPath('db')" title="复制数据库目录路径"> mdi-content-copy</v-icon>
        </div>
      </template>
    </v-list-item>
    <v-list-item title="游戏安装目录" :subtitle="gameDir" v-if="platform() === 'windows'">
      <template #prepend>
        <div class="config-icon">
          <v-icon>mdi-gamepad</v-icon>
        </div>
      </template>
      <template #append>
        <div class="config-opers">
          <v-icon @click="confirmCGD()" title="修改游戏安装目录"> mdi-pencil</v-icon>
          <v-icon @click="openDataPath('game')" title="打开游戏安装目录"> mdi-folder-open</v-icon>
          <v-icon @click="copyPath('game')" title="复制游戏安装目录"> mdi-content-copy</v-icon>
        </div>
      </template>
    </v-list-item>
    <v-list-item title="日志目录" :subtitle="logDir">
      <template #prepend>
        <div class="config-icon">
          <v-icon>mdi-folder-multiple</v-icon>
        </div>
      </template>
      <template #append>
        <div class="config-opers">
          <v-icon @click="confirmCLD()" title="清理日志文件"> mdi-delete</v-icon>
          <v-icon @click="openDataPath('log')" title="打开日志目录"> mdi-folder-open</v-icon>
          <v-icon @click="copyPath('log')" title="复制日志目录路径"> mdi-content-copy</v-icon>
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
import { path } from "@tauri-apps/api";
import { sep } from "@tauri-apps/api/path";
import { open } from "@tauri-apps/plugin-dialog";
import { exists, readDir, remove } from "@tauri-apps/plugin-fs";
import { openPath } from "@tauri-apps/plugin-opener";
import { platform } from "@tauri-apps/plugin-os";
import { backUpUserData } from "@utils/dataBS.js";
import { storeToRefs } from "pinia";
import { onMounted } from "vue";

const { dbPath, logDir, userDir, gameDir } = storeToRefs(useAppStore());

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
  const changeCheck = await showDialog.check("确认修改用户数据路径吗？");
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
  userDir.value = dir;
  await TGSqlite.saveAppData("userDir", dir);
  await backUpUserData(dir);
  showSnackbar.success("已修改用户数据路径!");
  const delCheck = await showDialog.check("是否删除原用户数据目录？");
  if (delCheck) {
    await remove(oriDir, { recursive: true });
    showSnackbar.success("已删除原用户数据目录!");
  }
  showSnackbar.info("即将刷新页面...");
  await new Promise<void>((resolve) => setTimeout(resolve, 1500));
  window.location.reload();
}

async function confirmCGD(): Promise<void> {
  if (platform() !== "windows") {
    showSnackbar.warn("不支持的平台！");
    return;
  }
  const oriEmpty = gameDir.value === "未设置";
  const editCheck = await showDialog.check(
    oriEmpty ? "确认设置游戏目录？" : "确认修改游戏目录？",
    oriEmpty ? "请选择启动器所在目录" : `当前：${gameDir.value}`,
  );
  if (!editCheck) {
    showSnackbar.cancel(oriEmpty ? "已取消设置" : "已取消修改");
    return;
  }
  const dir: string | null = await open({
    directory: true,
    defaultPath: oriEmpty ? undefined : gameDir.value,
    multiple: false,
  });
  if (dir === null) {
    showSnackbar.warn("路径不能为空!");
    return;
  }
  if (!oriEmpty && gameDir.value === dir) {
    showSnackbar.warn("路径未修改！");
    return;
  }
  // 校验是否存在游戏本体
  if (!(await exists(`${dir}${path.sep()}YuanShen.exe`))) {
    showSnackbar.warn("未检测到游戏本体");
    return;
  }
  gameDir.value = dir;
  showSnackbar.success(oriEmpty ? "成功设置游戏目录" : "成功修改游戏目录");
}

// 判断是否超过一周
function isOverWeek(date: string): boolean {
  const nowTs = Date.now();
  const checkTs = new Date(date).getTime();
  const weekTs = 7 * 24 * 60 * 60 * 1000;
  return nowTs - checkTs >= weekTs;
}

async function confirmCLD(): Promise<void> {
  const delCheck = await showDialog.check("确认清理日志文件吗？", "将保留一周内的日志文件");
  if (!delCheck) {
    showSnackbar.cancel("已取消清理");
    return;
  }
  const files = await readDir(logDir.value);
  const delFiles = files.filter((file) => {
    // yyyy-mm-dd.log
    const reg = /(\d{4}-\d{2}-\d{2}\.log)/;
    const match = file.name.match(reg);
    if (!Array.isArray(match) || match.length < 1) return false;
    const date = match[1].replace(".log", "");
    return isOverWeek(date);
  });
  if (delFiles.length < 1) {
    showSnackbar.warn("无需清理!");
    return;
  }
  await showLoading.start("正在清理日志文件...");
  for (const file of delFiles) {
    await showLoading.update(`正在清理 ${file.name}`);
    const filePath = `${logDir.value}${sep()}${file.name}`;
    await remove(filePath);
  }
  await new Promise<void>((resolve) => setTimeout(resolve, 1000));
  await showLoading.end();
  showSnackbar.success(`已清理 ${delFiles.length} 个日志文件!`);
}

function copyPath(type: "db" | "user" | "log" | "game"): void {
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
      break;
    case "game":
      if (gameDir.value === "未设置") {
        showSnackbar.warn("未设置游戏目录！");
        return;
      }
      targetPath = gameDir.value;
      targetName = "游戏安装目录";
  }
  navigator.clipboard.writeText(targetPath);
  showSnackbar.success(`${targetName}路径已复制!`);
}

async function openDataPath(type: "db" | "user" | "log" | "game"): Promise<void> {
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
    case "game":
      if (gameDir.value === "未设置") {
        showSnackbar.warn("未设置游戏目录！");
        return;
      }
      targetPath = gameDir.value;
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
