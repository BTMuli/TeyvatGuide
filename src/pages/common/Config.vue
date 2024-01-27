<template>
  <!-- todo ui 优化 -->
  <ToLoading v-model="loading" :title="loadingTitle" :subtitle="loadingSub" />
  <div class="config-box">
    <TcInfo />
    <v-list class="config-list">
      <v-list-subheader :inset="true" class="config-header" title="设置" />
      <v-divider :inset="true" class="border-opacity-75" />
      <v-list-item prepend-icon="mdi-database-export" title="数据备份" @click="confirmBackup" />
      <v-list-item prepend-icon="mdi-database-import" title="数据恢复" @click="confirmRestore" />
      <v-list-item prepend-icon="mdi-database-arrow-up" title="数据更新" @click="confirmUpdate()" />
      <v-list-subheader :inset="true" class="config-header" title="调试" @click="tryShowReset" />
      <v-divider :inset="true" class="border-opacity-75" />
      <v-list-item
        v-if="isDevEnv"
        title="调试模式"
        subtitle="开启后将显示调试信息"
        prepend-icon="mdi-bug-play"
      >
        <template #append>
          <v-switch
            v-model="appStore.devMode"
            :label="appStore.devMode ? '开启' : '关闭'"
            :inset="true"
            color="#FAC51E"
            @click="submitDevMode"
          />
        </template>
      </v-list-item>
      <v-list-item prepend-icon="mdi-refresh">
        <v-list-item-title @click="confirmUpdateDevice()">刷新设备信息</v-list-item-title>
        <template #append>
          <v-icon @click="confirmUpdateDevice(true)">mdi-bug</v-icon>
        </template>
      </v-list-item>
      <v-list-item prepend-icon="mdi-database-remove" title="清除缓存" @click="confirmDelCache" />
      <v-list-item
        v-show="showReset"
        title="重置数据库"
        prepend-icon="mdi-database-settings"
        @click="confirmResetDB()"
      />
      <v-list-item prepend-icon="mdi-cog-sync" title="恢复默认设置" @click="confirmResetApp" />
    </v-list>
    <TcDataDir />
  </div>
  <div class="config-right">
    <TcAppBadge />
    <TcUserBadge @loadOuter="loadHandle" />
  </div>
</template>

<script lang="ts" setup>
import { dialog, fs, invoke, process as TauriProcess } from "@tauri-apps/api";
import { onMounted, ref } from "vue";

import TcAppBadge from "../../components/config/tc-appBadge.vue";
import TcDataDir from "../../components/config/tc-dataDir.vue";
import TcInfo from "../../components/config/tc-info.vue";
import TcUserBadge from "../../components/config/tc-userBadge.vue";
import showConfirm from "../../components/func/confirm";
import showSnackbar from "../../components/func/snackbar";
import ToLoading from "../../components/overlay/to-loading.vue";
import TGSqlite from "../../plugins/Sqlite";
import { useAchievementsStore } from "../../store/modules/achievements";
import { useAppStore } from "../../store/modules/app";
import { useHomeStore } from "../../store/modules/home";
import { backUpUserData, restoreUserData } from "../../utils/dataBS";
import { getBuildTime } from "../../utils/TGBuild";
import TGLogger from "../../utils/TGLogger";
import { bytesToSize, getCacheDir, getDeviceInfo, getRandomString } from "../../utils/toolFunc";
import TGRequest from "../../web/request/TGRequest";

// Store
const appStore = useAppStore();
const homeStore = useHomeStore();
const achievementsStore = useAchievementsStore();

const isDevEnv = ref<boolean>(import.meta.env.MODE === "development");

// loading
const loading = ref<boolean>(true);
const loadingTitle = ref<string>("正在加载...");
const loadingSub = ref<string>("");
const showReset = ref<boolean>(false);

onMounted(async () => {
  await TGLogger.Info("[Config] 打开设置页面");
  loading.value = false;
});

// 备份数据
async function confirmBackup(): Promise<void> {
  const res = await showConfirm({
    title: "是否备份到默认路径",
    text: "取消则自选路径，点击外部不做处理",
  });
  if (res === undefined) {
    showSnackbar({
      color: "cancel",
      text: "已取消备份",
    });
    return;
  }
  let saveDir = appStore.userDir;
  if (res === false) {
    const dir = await dialog.open({
      directory: true,
      defaultPath: saveDir,
      multiple: false,
    });
    if (dir === null) {
      showSnackbar({
        color: "error",
        text: "路径不能为空!",
      });
      return;
    }
    await TGLogger.Info(`[Config][confirmBackup] 选择备份路径 ${dir.toString()}`);
    if (typeof dir !== "string") {
      showSnackbar({
        color: "error",
        text: "路径错误!",
      });
      return;
    }
    saveDir = dir;
  } else {
    await TGLogger.Info(`[Config][confirmBackup] 备份到默认路径 ${saveDir}`);
  }
  loadingTitle.value = "正在备份数据...";
  loading.value = true;
  loadingSub.value = "祈愿数据需单独备份";
  await backUpUserData(saveDir);
  loading.value = false;
  showSnackbar({ text: "数据已备份!" });
  await TGLogger.Info("[Config][confirmBackup] 备份完成");
}

// 恢复数据
async function confirmRestore(): Promise<void> {
  const resConfirm = await showConfirm({
    title: "是否从默认路径恢复",
    text: "取消则自选路径，点击外部不做处理",
  });
  if (resConfirm === undefined) {
    showSnackbar({
      color: "cancel",
      text: "已取消恢复",
    });
    return;
  }
  let saveDir = appStore.userDir;
  if (resConfirm === false) {
    const dir = await dialog.open({
      directory: true,
      defaultPath: saveDir,
      multiple: false,
    });
    if (dir === null) {
      showSnackbar({
        color: "error",
        text: "路径不能为空!",
      });
      return;
    }
    await TGLogger.Info(`[Config][confirmRestore] 选择恢复路径 ${dir.toString()}`);
    if (typeof dir !== "string") {
      showSnackbar({
        color: "error",
        text: "路径错误!",
      });
      return;
    }
    saveDir = dir;
  } else {
    await TGLogger.Info(`[Config][confirmRestore] 恢复到默认路径 ${saveDir}`);
  }
  loadingTitle.value = "正在恢复数据...";
  loading.value = true;
  loadingSub.value = "祈愿数据需单独恢复";
  await restoreUserData(saveDir);
  loading.value = false;
  showSnackbar({ text: "数据已恢复!" });
  await TGLogger.Info("[Config][confirmRestore] 恢复完成");
}

// 更新数据
async function confirmUpdate(title?: string): Promise<void> {
  const res = await showConfirm({
    title: title ?? "确认更新数据吗？",
    text: "请确保存在备份数据",
  });
  if (!res) {
    showSnackbar({
      color: "cancel",
      text: "已取消更新数据库",
    });
    return;
  }
  loadingTitle.value = "正在更新数据库...";
  loading.value = true;
  await TGSqlite.update();
  achievementsStore.lastVersion = await TGSqlite.getLatestAchievementVersion();
  appStore.buildTime = getBuildTime();
  loading.value = false;
  showSnackbar({
    text: "数据库已更新!",
  });
  await TGLogger.Info("[Config][confirmUpdate] 数据库更新完成");
  // 刷新
  window.location.reload();
}

// 更新设备信息
async function confirmUpdateDevice(force?: boolean): Promise<void> {
  if (force !== undefined && force) {
    await TGLogger.Info("[Config][confirmUpdateDevice][force] 开始强制更新设备信息");
    const resF = await showConfirm({
      title: "确认强制更新设备信息吗？",
      text: `DeviceFp:${appStore.deviceInfo.device_fp}`,
    });
    if (!resF) {
      showSnackbar({
        text: "已取消强制更新设备信息",
        color: "cancel",
      });
      await TGLogger.Info("[Config][confirmUpdateDevice][force] 取消强制更新设备信息");
      return;
    }
    appStore.deviceInfo = await TGRequest.Device.getFp();
    if (appStore.deviceInfo.device_fp === "0000000000000") {
      appStore.deviceInfo.device_fp = getRandomString(13, "hex");
      showSnackbar({
        text: `设备信息获取失败!已使用随机值 ${appStore.deviceInfo.device_fp} 代替`,
        color: "warn",
      });
      await TGLogger.Warn("[Config][confirmUpdateDevice][force] 设备信息获取失败!已使用随机值代替");
    } else {
      showSnackbar({
        text: "设备信息已更新! DeviceFp: " + appStore.deviceInfo.device_fp,
      });
    }
    await TGSqlite.saveAppData("deviceInfo", JSON.stringify(appStore.deviceInfo));
    await TGLogger.Info("[Config][confirmUpdateDevice][force] 设备信息更新完成");
    return;
  }
  await TGLogger.Info("[Config][confirmUpdateDevice] 开始更新设备信息");
  const localFp = getDeviceInfo("device_fp");
  if (localFp !== "0000000000000") {
    const res = await showConfirm({
      title: "确认更新设备信息吗？",
      text: `DeviceFp:${localFp}`,
    });
    if (!res) {
      showSnackbar({
        text: "已取消更新设备信息",
        color: "cancel",
      });
      await TGLogger.Info("[Config][confirmUpdateDevice] 取消更新设备信息");
      return;
    }
  }
  console.log(appStore.deviceInfo);
  appStore.deviceInfo = await TGRequest.Device.getFp(appStore.deviceInfo);
  console.log(appStore.deviceInfo);
  if (appStore.deviceInfo.device_fp === "0000000000000") {
    appStore.deviceInfo.device_fp = getRandomString(13, "hex");
    showSnackbar({
      text: "设备信息获取失败!已使用随机值代替",
    });
    await TGLogger.Warn("[Config][confirmUpdateDevice] 设备信息获取失败!已使用随机值代替");
    return;
  }
  showSnackbar({
    text: "设备信息已更新! DeviceFp: " + appStore.deviceInfo.device_fp,
  });
  await TGSqlite.saveAppData("deviceInfo", JSON.stringify(appStore.deviceInfo));
  await TGLogger.Info("[Config][confirmUpdateDevice] 设备信息更新完成");
}

// 清除用户缓存
async function confirmDelCache(): Promise<void> {
  await TGLogger.Info("[Config][confirmDelCache] 开始清除缓存");
  const CacheDir = await getCacheDir();
  if (CacheDir === false) {
    showSnackbar({
      color: "error",
      text: "不支持的平台!",
    });
    return;
  }
  let cacheBSize: number = 0;
  loadingTitle.value = "正在检测缓存...";
  loadingSub.value = "耗时较久，请稍作等候";
  loading.value = true;
  const timeStart = Date.now();
  for (const dir of CacheDir) {
    const size: number = await invoke("get_dir_size", { path: dir });
    cacheBSize += size;
  }
  const cacheSize = bytesToSize(cacheBSize);
  await TGLogger.Info(`[Config][confirmDelCache] 当前缓存大小为 ${cacheSize}`);
  loading.value = false;
  const timeEnd = Date.now();
  const res = await showConfirm({
    title: "确认清除缓存吗？",
    text: `当前缓存大小为 ${cacheSize}，耗时 ${timeEnd - timeStart} 毫秒`,
  });
  if (!res) {
    showSnackbar({
      color: "cancel",
      text: "已取消清除缓存",
    });
    await TGLogger.Info("[Config][confirmDelCache] 取消清除缓存");
    return;
  }
  for (const dir of CacheDir) {
    await fs.removeDir(dir, { recursive: true });
  }
  showSnackbar({
    text: "缓存已清除!请重新启动应用！",
  });
  await TGLogger.Info("[Config][confirmDelCache] 缓存清除完成");
  await TauriProcess.exit();
}

// 恢复默认设置
async function confirmResetApp(): Promise<void> {
  await TGLogger.Info("[Config][confirmResetApp] 开始恢复默认设置");
  const res = await showConfirm({
    title: "确认恢复默认设置吗？",
  });
  if (!res) {
    showSnackbar({
      color: "cancel",
      text: "已取消恢复默认设置",
    });
    await TGLogger.Info("[Config][confirmResetApp] 取消恢复默认设置");
    return;
  }
  appStore.init();
  homeStore.init();
  achievementsStore.init();
  await TGLogger.Info("[Config][confirmResetApp] 恢复默认设置完成");
  showSnackbar({ text: "已恢复默认配置!即将刷新页面..." });
  setTimeout(() => {
    window.location.reload();
  }, 1500);
}

// 前置
async function tryShowReset(): Promise<void> {
  const res = await showConfirm({
    title: "请输入验证 Code",
    text: "请联系开发者获取",
    mode: "input",
  });
  if (!res) {
    showSnackbar({
      color: "cancel",
      text: "已取消",
    });
    return;
  }
  const time = getBuildTime();
  const code = time.startsWith("dev.") ? "dev" : time;
  if (res === code || res === "reset1128") {
    showReset.value = true;
    showSnackbar({
      text: "已开启重置数据库选项",
    });
  } else {
    showSnackbar({
      color: "error",
      text: "验证失败",
    });
  }
}

// 重置数据库
async function confirmResetDB(title?: string): Promise<void> {
  await TGLogger.Info("[Config][confirmResetDB] 开始重置数据库");
  const res = await showConfirm({
    title: title ?? "确认重置数据库吗？",
    text: "请确认已经备份关键数据",
  });
  if (!res) {
    showSnackbar({
      color: "cancel",
      text: "已取消重置数据库",
    });
    await TGLogger.Info("[Config][confirmResetDB] 取消重置数据库");
    return;
  }
  loadingTitle.value = "正在重置数据库...";
  loading.value = true;
  await TGSqlite.reset();
  await TGLogger.Info("[Config][confirmResetDB] 数据库重置完成");
  loading.value = false;
  showSnackbar({
    text: "数据库已重置!请进行再次检查。",
  });
  setTimeout(() => {
    window.location.reload();
  }, 1500);
}

// 开启 dev 模式
function submitDevMode(): void {
  appStore.devMode
    ? showSnackbar({ text: "已关闭 dev 模式!" })
    : showSnackbar({ text: "已开启 dev 模式!" });
}

// 通过子组件的事件来控制 loading
function loadHandle(params: TGApp.Component.Loading.EmitParams): void {
  loading.value = params.show;
  if (params.title) {
    loadingTitle.value = params.title;
  }
  if (params.text) {
    loadingSub.value = params.text;
  }
}
</script>
<style lang="css" scoped>
.config-box {
  position: relative;
  display: flex;
  flex-direction: column;
  row-gap: 10px;
}

.config-list {
  border-radius: 10px;
  margin-right: 260px;
  background: var(--box-bg-1);
  color: var(--box-text-4);
  font-family: var(--font-text);
}

.config-header {
  margin-top: 10px;
  color: var(--common-text-title);
  font-family: Genshin, serif;
  font-size: large;
}

.config-right {
  position: fixed;
  top: 16px;
  right: 10px;
  display: flex;
  width: 256px;
  flex-direction: column;
  row-gap: 15px;
}
</style>
