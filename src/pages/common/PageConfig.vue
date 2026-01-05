<template>
  <div class="pc-page">
    <div class="config-box">
      <TcInfo />
      <v-list class="config-list">
        <v-list-subheader :inset="true" class="config-header" title="数据相关" />
        <v-divider :inset="true" class="border-opacity-75" />
        <v-list-item title="数据备份" @click="confirmBackup()">
          <template #prepend>
            <div class="config-icon">
              <v-icon>mdi-database-export</v-icon>
            </div>
          </template>
        </v-list-item>
        <v-list-item title="数据恢复" @click="confirmRestore()">
          <template #prepend>
            <div class="config-icon">
              <v-icon>mdi-database-import</v-icon>
            </div>
          </template>
        </v-list-item>
        <v-list-item title="数据更新" @click="confirmUpdate()">
          <template #prepend>
            <div class="config-icon">
              <v-icon>mdi-database-arrow-up</v-icon>
            </div>
          </template>
        </v-list-item>
        <v-list-item>
          <template #prepend>
            <div class="config-icon">
              <v-icon>mdi-refresh</v-icon>
            </div>
          </template>
          <v-list-item-title @click="confirmUpdateDevice()">刷新设备信息</v-list-item-title>
          <v-list-item-subtitle>
            <!-- @ts-expect-error eslint-disable-next-line Deprecated symbol used -->
            {{ deviceInfo.device_name }}({{ deviceInfo.product }}) - {{ deviceInfo.device_fp }}
          </v-list-item-subtitle>
          <template #append>
            <v-icon title="强制刷新设备信息" @click="confirmUpdateDevice(true)">mdi-bug</v-icon>
          </template>
        </v-list-item>
        <v-list-item title="清除缓存" @click="confirmDelCache">
          <template #prepend>
            <div class="config-icon">
              <v-icon>mdi-database-remove</v-icon>
            </div>
          </template>
          <template #append>{{ bytesToSize(cacheSize) }}</template>
        </v-list-item>
        <v-list-item v-show="showReset" title="重置数据库" @click="confirmResetDB()">
          <template #prepend>
            <div class="config-icon">
              <v-icon>mdi-database-settings</v-icon>
            </div>
          </template>
        </v-list-item>
        <v-list-item title="恢复默认设置" @click="confirmResetApp">
          <template #prepend>
            <div class="config-icon">
              <v-icon>mdi-cog-sync</v-icon>
            </div>
          </template>
        </v-list-item>
        <v-list-subheader :inset="true" class="config-header" title="调试" @click="tryShowReset" />
        <v-divider :inset="true" class="border-opacity-75" />
        <v-list-item v-if="isDevEnv" subtitle="开启后将显示调试信息" title="调试模式">
          <template #prepend>
            <div class="config-icon">
              <v-icon>mdi-bug-play</v-icon>
            </div>
          </template>
          <template #append>
            <v-switch
              v-model="devMode"
              :inset="true"
              :label="devMode ? '开启' : '关闭'"
              class="config-switch"
              color="#FAC51E"
              @click="submitDevMode"
            />
          </template>
        </v-list-item>
        <v-list-item subtitle="根据分辨率动态调整窗体大小" title="窗口回正">
          <template #prepend>
            <div class="config-icon">
              <v-icon>mdi-window-restore</v-icon>
            </div>
          </template>
          <template #append>
            <v-switch
              v-model="isNeedResize"
              :inset="true"
              :label="isNeedResize ? '开启' : '关闭'"
              class="config-switch"
              color="#FAC51E"
              @click="submitResize"
            />
          </template>
        </v-list-item>
        <v-list-item subtitle="关闭窗口时最小化到系统托盘而不是退出应用" title="关闭到托盘">
          <template #prepend>
            <div class="config-icon">
              <v-icon>mdi-tray-arrow-down</v-icon>
            </div>
          </template>
          <template #append>
            <v-switch
              v-model="closeToTray"
              :inset="true"
              :label="closeToTray ? '开启' : '关闭'"
              class="config-switch"
              color="#FAC51E"
            />
          </template>
        </v-list-item>
        <v-list-item subtitle="关闭后将记录帖子浏览记录" title="无痕浏览">
          <template #prepend>
            <div class="config-icon">
              <v-icon>mdi-incognito</v-icon>
            </div>
          </template>
          <template #append>
            <v-switch
              v-model="appStore.incognito"
              :inset="true"
              :label="appStore.incognito ? '开启' : '关闭'"
              class="config-switch"
              color="#FAC51E"
              @click="switchIncognito"
            />
          </template>
        </v-list-item>
        <v-list-item v-if="platform() === 'windows'" title="分享设置">
          <template #subtitle>默认保存到剪贴板，超过{{ shareDefaultFile }}MB时保存到文件</template>
          <template #prepend>
            <div class="config-icon">
              <v-icon>mdi-share-variant</v-icon>
            </div>
          </template>
          <template #append>
            <v-icon @click="confirmShare()">mdi-cog</v-icon>
          </template>
        </v-list-item>
        <v-list-item title="图片质量调整">
          <template #subtitle>当前图像质量：{{ imageQualityPercent }}%</template>
          <template #prepend>
            <div class="config-icon">
              <v-icon>mdi-image-filter-vintage</v-icon>
            </div>
          </template>
          <template #append>
            <v-icon @click="confirmImgQuality()">mdi-cog</v-icon>
          </template>
        </v-list-item>
      </v-list>
      <TcDataDir />
    </div>
    <div class="config-right">
      <TcAppBadge />
      <TcUserBadge />
      <TcGameBadge v-if="platform() === 'windows'" />
      <TcHutaoBadge />
    </div>
  </div>
  <TcoImgQuality v-model="showImgQuality" />
</template>
<script lang="ts" setup>
import showDialog from "@comp/func/dialog.js";
import showLoading from "@comp/func/loading.js";
import showSnackbar from "@comp/func/snackbar.js";
import TcAppBadge from "@comp/pageConfig/tc-appBadge.vue";
import TcDataDir from "@comp/pageConfig/tc-dataDir.vue";
import TcGameBadge from "@comp/pageConfig/tc-gameBadge.vue";
import TcHutaoBadge from "@comp/pageConfig/tc-hutaoBadge.vue";
import TcInfo from "@comp/pageConfig/tc-info.vue";
import TcUserBadge from "@comp/pageConfig/tc-userBadge.vue";
import TcoImgQuality from "@comp/pageConfig/tco-imgQuality.vue";
import OtherApi from "@req/otherReq.js";
import TGSqlite from "@Sql/index.js";
import useAppStore from "@store/app.js";
import useHomeStore from "@store/home.js";
import { core, event } from "@tauri-apps/api";
import { emit } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";
import { remove } from "@tauri-apps/plugin-fs";
import { platform } from "@tauri-apps/plugin-os";
import { relaunch } from "@tauri-apps/plugin-process";
import { backUpUserData, restoreUserData } from "@utils/dataBS.js";
import TGLogger from "@utils/TGLogger.js";
import { bytesToSize, getCacheDir, getDeviceInfo, getRandomString } from "@utils/toolFunc.js";
import { storeToRefs } from "pinia";
import { onMounted, ref } from "vue";

const appStore = useAppStore();
const {
  needResize,
  devMode,
  deviceInfo,
  shareDefaultFile,
  userDir,
  buildTime,
  imageQualityPercent,
  incognito,
  closeToTray,
} = storeToRefs(appStore);
const homeStore = useHomeStore();

// @ts-expect-error-next-line
const isDevEnv = ref<boolean>(import.meta.env.MODE === "development");
const showReset = ref<boolean>(false);
const isNeedResize = ref<boolean>(needResize.value !== "false");
const cacheSize = ref<number>(0);

const showImgQuality = ref<boolean>(false);

onMounted(async () => {
  await showLoading.start("正在加载设置页面", "正在获取缓存大小");
  await TGLogger.Info("[Config] 打开设置页面");
  const cacheDir = await getCacheDir();
  if (cacheDir === false) return;
  let cacheBSize: number = 0;
  for (const dir of cacheDir) {
    const size: number = await core.invoke("get_dir_size", { path: dir });
    cacheBSize += size;
  }
  await showLoading.update(`缓存大小：${bytesToSize(cacheBSize)}`);
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
    const dir: string | null = await open({
      directory: true,
      defaultPath: saveDir,
      multiple: false,
    });
    if (dir === null) {
      showSnackbar.error("路径不能为空!");
      return;
    }
    await TGLogger.Info(`[Config][confirmBackup] 选择备份路径 ${dir.toString()}`);
    saveDir = dir;
  } else await TGLogger.Info(`[Config][confirmBackup] 备份到默认路径 ${saveDir}`);
  await showLoading.start("正在备份数据");
  await backUpUserData(saveDir);
  await showLoading.end();
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
    const dir: string | null = await open({
      directory: true,
      defaultPath: saveDir,
      multiple: false,
    });
    if (dir === null) {
      showSnackbar.error("路径不能为空!");
      return;
    }
    await TGLogger.Info(`[Config][confirmRestore] 选择恢复路径 ${dir.toString()}`);
    saveDir = dir;
  } else await TGLogger.Info(`[Config][confirmRestore] 恢复到默认路径 ${saveDir}`);
  await showLoading.start("正在恢复数据");
  await restoreUserData(saveDir);
  await showLoading.end();
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
  await TGSqlite.update();
  // @ts-expect-error import.meta
  buildTime.value = import.meta.env.VITE_BUILD_TIME;
  await showLoading.end();
  showSnackbar.success("数据库已更新!即将刷新页面");
  await TGLogger.Info("[Config][confirmUpdate] 数据库更新完成");
  await new Promise<void>((resolve) => setTimeout(resolve, 1500));
  window.location.reload();
}

// 分享设置
async function confirmShare(): Promise<void> {
  const input = await showDialog.input(
    "请输入分享文件大小阈值(MB)",
    "阈值：",
    shareDefaultFile.value.toString(),
  );
  if (!input) {
    showSnackbar.cancel("已取消修改分享设置");
    return;
  }
  if (input === "") {
    showSnackbar.error("阈值不能为空!");
    return;
  }
  if (isNaN(Number(input))) {
    showSnackbar.error("阈值必须为数字!");
    return;
  }
  if (Number(input) === shareDefaultFile.value) {
    showSnackbar.cancel("未修改分享设置");
    return;
  }
  if (Number(input) > 2000) {
    showSnackbar.error("阈值不能大于2000MB!");
    return;
  }
  const check = await showDialog.check(
    "确认修改分享设置吗？",
    `新阈值为${input}MB，超过将保存到文件`,
  );
  if (!check) {
    showSnackbar.cancel("已取消修改分享设置");
    return;
  }
  shareDefaultFile.value = Number(input);
  showSnackbar.success(`成功修改分享设置!新阈值为${input}MB`);
}

// 图片质量调整
async function confirmImgQuality(): Promise<void> {
  showImgQuality.value = true;
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
    `当前缓存大小为 ${bytesToSize(cacheSize.value)}`,
  );
  if (!delCheck) {
    showSnackbar.cancel("已取消清除缓存");
    await TGLogger.Info("[Config][confirmDelCache] 取消清除缓存");
    return;
  }
  await showLoading.start("正在清除缓存");
  for (const dir of CacheDir) {
    try {
      await showLoading.update(dir);
      await remove(dir, { recursive: true });
    } catch (e) {
      await TGLogger.Error(`[Config][confirmDelCache] 清除缓存失败 ${dir} ${e}`);
    }
  }
  await showLoading.end();
  await TGLogger.Info("[Config][confirmDelCache] 缓存清除完成");
  showSnackbar.success("缓存已清除!即将重启...");
  await new Promise<void>((resolve) => setTimeout(resolve, 1500));
  await relaunch();
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

// 前置
async function tryShowReset(): Promise<void> {
  const codeInput = await showDialog.input("请输入验证 Code", "请联系开发者获取");
  if (!codeInput) {
    showSnackbar.cancel("已取消");
    return;
  }
  // @ts-expect-error import.meta
  if (codeInput === import.meta.env.VITE_SENTRY_RELEASE || codeInput === "reset1128") {
    showReset.value = true;
    showSnackbar.success("已开启重置数据库选项");
    return;
  }
  showSnackbar.error("验证失败");
}

// 重置数据库
async function confirmResetDB(title?: string): Promise<void> {
  await TGLogger.Info("[Config][confirmResetDB] 开始重置数据库");
  const resetCheck = await showDialog.check(
    title ?? "确认重置数据库吗？",
    "请确认已经备份关键数据",
  );
  if (!resetCheck) {
    showSnackbar.cancel("已取消重置数据库");
    await TGLogger.Info("[Config][confirmResetDB] 取消重置数据库");
    return;
  }
  await showLoading.start("正在重置数据库");
  await TGSqlite.reset();
  await showLoading.end();
  await TGLogger.Info("[Config][confirmResetDB] 数据库重置完成");
  showSnackbar.success("数据库已重置!即将刷新页面");
  await new Promise<void>((resolve) => setTimeout(resolve, 1500));
  window.location.reload();
}

// 开启 dev 模式
function submitDevMode(): void {
  if (appStore.devMode) {
    showSnackbar.success("已关闭 dev 模式!");
    return;
  }
  showSnackbar.success("已开启 dev 模式!");
}

// 开启窗口回正
async function submitResize(): Promise<void> {
  needResize.value = (!isNeedResize.value).toString();
  if (isNeedResize.value) showSnackbar.success("已关闭窗口回正!");
  else showSnackbar.success("已开启窗口回正!");
  await emit("needResize", needResize.value);
}

// 开启无痕浏览
async function switchIncognito(): Promise<void> {
  await event.emitTo("Sub_window", "switchIncognito");
  if (incognito.value) {
    showSnackbar.success("已开启无痕浏览!");
    return;
  }
  showSnackbar.success("已关闭无痕浏览!");
}
</script>
<style lang="scss" scoped>
.pc-page {
  position: relative;
  display: flex;
  height: calc(100vh - 32px);
  align-items: stretch;
  column-gap: 8px;
}

.config-box {
  position: relative;
  display: flex;
  width: 100%;
  height: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding-right: 8px;
  overflow-y: auto;
  row-gap: 8px;
}

.config-list {
  position: relative;
  width: 100%;
  flex-shrink: 0;
  border-radius: 8px;
  background: var(--box-bg-1);
  color: var(--box-text-4);
  font-family: var(--font-text);
}

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

.config-switch {
  height: 40px;
}

.config-right {
  position: relative;
  display: flex;
  overflow: hidden auto;
  width: 256px;
  height: 100%;
  box-sizing: border-box;
  flex-direction: column;
  flex-shrink: 0;
  justify-content: flex-start;
  row-gap: 8px;
}
</style>
