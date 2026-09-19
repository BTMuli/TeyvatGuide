<template>
  <TcConfigSection title="数据相关" icon="mdi-database-outline" :columns="3">
    <TcConfigItem
      subtitle="备份用户数据到本地目录"
      title="数据备份"
      icon="mdi-database-export"
      @activate="confirmBackup()"
    />
    <TcConfigItem
      subtitle="从本地备份恢复用户数据"
      title="数据恢复"
      icon="mdi-database-import"
      @activate="confirmRestore()"
    />
    <TcConfigItem
      subtitle="更新数据库到最新版本"
      title="数据更新"
      icon="mdi-database-arrow-up"
      @activate="confirmUpdate()"
    />
    <TcConfigItem
      title="设备信息"
      icon="mdi-cellphone-information"
      @activate="confirmUpdateDevice()"
    >
      <template #subtitle>
        <!-- @ts-expect-error eslint-disable-next-line Deprecated symbol used -->
        {{ deviceInfo.device_name }}({{ deviceInfo.product }}) - {{ deviceInfo.device_fp }}
      </template>
      <template #append>
        <v-btn
          aria-label="强制刷新设备信息"
          title="强制刷新设备信息"
          icon="mdi-bug"
          color="var(--tgc-od-red)"
          size="28"
          variant="text"
          @click="confirmUpdateDevice(true)"
        />
      </template>
    </TcConfigItem>
    <TcConfigItem
      :subtitle="`当前缓存大小：${fmtUtil.size(cacheSize)}`"
      title="清除缓存"
      icon="mdi-delete-sweep"
      @activate="confirmDelCache"
    />
    <TcConfigItem
      subtitle="重置应用配置为默认值"
      title="恢复默认设置"
      icon="mdi-cog-sync"
      @activate="confirmResetApp"
    />
  </TcConfigSection>
</template>
<script lang="ts" setup>
import showDialog from "@comp/func/dialog.js";
import showLoading from "@comp/func/loading.js";
import showSnackbar from "@comp/func/snackbar.js";
import OtherApi from "@req/otherReq.js";
import TGSqlite from "@Sql/index.js";
import useAppStore from "@store/app.js";
import useHomeStore from "@store/home.js";
import { core } from "@tauri-apps/api";
import { open } from "@tauri-apps/plugin-dialog";
import { exit, relaunch } from "@tauri-apps/plugin-process";
import { backUpUserData, restoreUserData } from "@utils/dataBS.js";
import fmtUtil from "@utils/fmtUtil.js";
import TGLogger from "@utils/TGLogger.js";
import { getCacheDir, getDeviceInfo, getRandomString } from "@utils/toolFunc.js";
import { storeToRefs } from "pinia";
import { onMounted, ref } from "vue";

import TcConfigItem from "./tc-config-item.vue";
import TcConfigSection from "./tc-config-section.vue";

const appStore = useAppStore();
const { deviceInfo, userDir, buildTime } = storeToRefs(appStore);
const homeStore = useHomeStore();
// @ts-expect-error import.meta
const isDevEnv = ref<boolean>(import.meta.env.MODE === "development");
const cacheSize = ref<number>(0);
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return `${error}`;
}

function isDirectorySelectionCancelled(error: unknown): boolean {
  return getErrorMessage(error).toLowerCase().includes("os error 1223");
}

async function selectDirectory(
  defaultPath: string,
  operation: "confirmBackup" | "confirmRestore",
): Promise<string | null> {
  try {
    const dir = await open({
      directory: true,
      defaultPath,
      multiple: false,
    });
    if (dir === null) {
      showSnackbar.cancel("已取消目录选择");
      await TGLogger.Info(`[Config][${operation}] 已取消目录选择`);
      return null;
    }
    return dir;
  } catch (error) {
    if (isDirectorySelectionCancelled(error)) {
      showSnackbar.cancel("已取消目录选择");
      await TGLogger.Info(`[Config][${operation}] 已取消目录选择`);
      return null;
    }
    await TGLogger.Error(`[Config][${operation}] 打开目录选择失败 ${getErrorMessage(error)}`);
    showSnackbar.error("打开目录选择失败，请稍后重试");
    return null;
  }
}

onMounted(async () => {
  await showLoading.start("正在加载设置页面", "正在获取缓存大小");
  await TGLogger.Info("[Config] 打开设置页面");
  const cacheDir = await getCacheDir();
  if (cacheDir === false) {
    await showLoading.end();
    return;
  }
  let cacheBSize: number = 0;
  for (const dir of cacheDir) {
    const size: number = await core.invoke("get_dir_size", { path: dir });
    cacheBSize += size;
  }
  await showLoading.update(`缓存大小：${fmtUtil.size(cacheBSize)}`);
  cacheSize.value = cacheBSize;
  await showLoading.end();
});

// 备份数据
async function confirmBackup(): Promise<void> {
  const bcCheck = await showDialog.checkF({
    title: "是否备份到默认路径",
    text: `${userDir.value}`,
    cancelLabel: "自选路径",
  });
  if (bcCheck === undefined) {
    showSnackbar.cancel("已取消备份");
    return;
  }
  let saveDir = userDir.value;
  if (!bcCheck) {
    const dir = await selectDirectory(saveDir, "confirmBackup");
    if (dir === null) return;
    await TGLogger.Info(`[Config][confirmBackup] 选择备份路径 ${dir}`);
    saveDir = dir;
  } else await TGLogger.Info(`[Config][confirmBackup] 备份到默认路径 ${saveDir}`);
  await showLoading.start("正在备份数据");
  try {
    await backUpUserData(saveDir);
  } catch (error) {
    await TGLogger.Error(`[Config][confirmBackup] 备份失败 ${getErrorMessage(error)}`);
    showSnackbar.error("备份失败，请检查目录后重试");
    return;
  } finally {
    await showLoading.end();
  }
  showSnackbar.success("数据已备份!");
  await TGLogger.Info("[Config][confirmBackup] 备份完成");
}

// 恢复数据
async function confirmRestore(): Promise<void> {
  const rsCheck = await showDialog.checkF({
    title: "是否从默认路径恢复",
    text: userDir.value,
    cancelLabel: "自选恢复目录",
  });
  if (rsCheck === undefined) {
    showSnackbar.cancel("已取消恢复");
    return;
  }
  let saveDir = userDir.value;
  if (!rsCheck) {
    const dir = await selectDirectory(saveDir, "confirmRestore");
    if (dir === null) return;
    await TGLogger.Info(`[Config][confirmRestore] 选择恢复路径 ${dir}`);
    saveDir = dir;
  } else await TGLogger.Info(`[Config][confirmRestore] 恢复到默认路径 ${saveDir}`);
  await showLoading.start("正在恢复数据");
  try {
    const restored = await restoreUserData(saveDir);
    if (!restored) return;
  } catch (error) {
    await TGLogger.Error(`[Config][confirmRestore] 恢复失败 ${getErrorMessage(error)}`);
    showSnackbar.error("恢复失败，请检查备份目录后重试");
    return;
  } finally {
    await showLoading.end();
  }
  showSnackbar.success("数据已恢复!");
  await TGLogger.Info("[Config][confirmRestore] 恢复完成");
}

// 更新数据
async function confirmUpdate(title?: string): Promise<void> {
  const updateCheck = await showDialog.check(title ?? "确认更新数据吗？");
  if (!updateCheck) {
    showSnackbar.cancel("已取消更新数据库");
    return;
  }
  await showLoading.start("正在更新数据库", "");
  // @ts-expect-error import.meta
  await TGSqlite.update(import.meta.env.VITE_BUILD_TIME);
  // @ts-expect-error import.meta
  buildTime.value = import.meta.env.VITE_BUILD_TIME;
  await showLoading.end();
  showSnackbar.success("数据库已更新!即将刷新页面");
  await TGLogger.Info("[Config][confirmUpdate] 数据库更新完成");
  await new Promise<void>((resolve) => setTimeout(resolve, 1500));
  window.location.reload();
}

// 更新设备信息
async function confirmUpdateDevice(force?: boolean): Promise<void> {
  if (force !== undefined && force) {
    await TGLogger.Info("[Config][confirmUpdateDevice][force] 开始强制更新设备信息");
    const forceCheck = await showDialog.check(
      "确认强制更新设备信息吗？",
      `DeviceFp:${deviceInfo.value.device_fp}`,
    );
    if (!forceCheck) {
      showSnackbar.cancel("已取消强制更新设备信息");
      await TGLogger.Info("[Config][confirmUpdateDevice][force] 取消强制更新设备信息");
      return;
    }
    deviceInfo.value = await OtherApi.fp();
    if (deviceInfo.value.device_fp === "0000000000000") {
      deviceInfo.value.device_fp = getRandomString(13, "hex");
      showSnackbar.warn(`设备信息获取失败!已使用随机值${deviceInfo.value.device_fp}代替`);
      await TGLogger.Warn("[Config][confirmUpdateDevice][force] 设备信息获取失败!已使用随机值代替");
    } else showSnackbar.success(`设备信息已更新! DeviceFp: ${deviceInfo.value.device_fp}`);
    await TGSqlite.saveAppData("deviceInfo", JSON.stringify(deviceInfo.value));
    await TGLogger.Info("[Config][confirmUpdateDevice][force] 设备信息更新完成");
    return;
  }
  await TGLogger.Info("[Config][confirmUpdateDevice] 开始更新设备信息");
  const localFp = getDeviceInfo("device_fp");
  if (localFp !== "0000000000000") {
    const updateCheck = await showDialog.check("确认更新设备信息吗？", `DeviceFp:${localFp}`);
    if (!updateCheck) {
      showSnackbar.cancel("已取消更新设备信息");
      await TGLogger.Info("[Config][confirmUpdateDevice] 取消更新设备信息");
      return;
    }
  }
  deviceInfo.value = await OtherApi.fp(deviceInfo.value);
  if (deviceInfo.value.device_fp === "0000000000000") {
    deviceInfo.value.device_fp = getRandomString(13, "hex");
    showSnackbar.warn(`设备信息获取失败!已使用随机值${deviceInfo.value.device_fp}代替`);
    await TGLogger.Warn("[Config][confirmUpdateDevice] 设备信息获取失败!已使用随机值代替");
    return;
  }
  showSnackbar.success(`设备信息已更新! DeviceFp: ${deviceInfo.value.device_fp}`);
  await TGSqlite.saveAppData("deviceInfo", JSON.stringify(deviceInfo.value));
  await TGLogger.Info("[Config][confirmUpdateDevice] 设备信息更新完成");
}

// 清除用户缓存
async function confirmDelCache(): Promise<void> {
  await TGLogger.Info("[Config][confirmDelCache] 开始清除缓存");
  const CacheDir = await getCacheDir();
  if (CacheDir === false) {
    showSnackbar.error("不支持的平台!");
    return;
  }
  const delCheck = await showDialog.check(
    "确认清除缓存吗？",
    `当前缓存大小为 ${fmtUtil.size(cacheSize.value)}`,
  );
  if (!delCheck) {
    showSnackbar.cancel("已取消清除缓存");
    await TGLogger.Info("[Config][confirmDelCache] 取消清除缓存");
    return;
  }
  await showLoading.start("正在清除缓存");
  try {
    await core.invoke("clear_app_cache");
  } catch (e) {
    await TGLogger.Error(`[Config][confirmDelCache] 清除缓存失败 ${CacheDir.join(", ")} ${e}`);
    showSnackbar.error(`${e}`);
    await showLoading.end();
    return;
  }
  await showLoading.end();
  await TGLogger.Info("[Config][confirmDelCache] 缓存清除完成");
  showSnackbar.success("缓存已清除!即将重启...");
  await new Promise<void>((resolve) => setTimeout(resolve, 1500));
  if (isDevEnv.value) await exit();
  else await relaunch();
}

// 恢复默认设置
async function confirmResetApp(): Promise<void> {
  await TGLogger.Info("[Config][confirmResetApp] 开始恢复默认设置");
  const resetCheck = await showDialog.check("确认恢复默认设置吗？");
  if (!resetCheck) {
    showSnackbar.cancel("已取消恢复默认设置");
    await TGLogger.Info("[Config][confirmResetApp] 取消恢复默认设置");
    return;
  }
  appStore.init();
  homeStore.init();
  await TGLogger.Info("[Config][confirmResetApp] 恢复默认设置完成");
  showSnackbar.success("已恢复默认配置!即将刷新页面");
  await new Promise<void>((resolve) => setTimeout(resolve, 1500));
  window.location.reload();
}
</script>
