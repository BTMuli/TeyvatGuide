<template>
  <TcConfigSection title="调试" icon="mdi-bug-outline" icon-clickable @icon-click="tryShowReset">
    <template #titleAction>
      <button v-if="showReset" class="reset-db" type="button" @click="confirmResetDB()">
        <v-icon size="14" icon="mdi-database-settings" />
        <span>重置数据库</span>
      </button>
    </template>
    <TcConfigSwitch
      v-if="isDevEnv"
      :model-value="devMode"
      icon="mdi-bug-play"
      subtitle="开启后将显示调试信息"
      title="调试模式"
      @toggle="switchDevMode"
    />
    <TcConfigSwitch
      :model-value="isNeedResize"
      icon="mdi-window-restore"
      subtitle="根据分辨率动态调整窗体大小"
      title="窗口回正"
      @toggle="switchResize"
    />
    <TcConfigSwitch
      :model-value="closeToTray"
      icon="mdi-tray-arrow-down"
      subtitle="关闭窗口时最小化到系统托盘而不是退出应用"
      title="关闭到托盘"
      @toggle="switchTray"
    />
    <TcConfigSwitch
      :model-value="incognito"
      icon="mdi-incognito"
      subtitle="关闭后将记录帖子浏览记录"
      title="无痕浏览"
      @toggle="switchIncognito"
    />
    <TcConfigSwitch
      :model-value="useProxy"
      icon="mdi-lan-connect"
      subtitle="关闭时请求直连，不经过系统代理；商店版开启后需解除回环限制"
      title="使用系统代理"
      @toggle="switchUseProxy"
    />
    <TcConfigSwitch
      :model-value="showFeedback"
      icon="mdi-lightbulb-on-outline"
      subtitle="右下反馈按钮显隐，页面刷新后生效"
      title="用户反馈"
      @toggle="switchFeedback"
    />
    <TcConfigItem
      v-if="isWindows"
      title="分享设置"
      icon="mdi-share-variant"
      @activate="showShareSetting = true"
    >
      <template #subtitle>默认保存到剪贴板，超过{{ shareDefaultFile }}MB时保存到文件</template>
    </TcConfigItem>
    <TcConfigItem
      title="图片质量调整"
      icon="mdi-image-auto-adjust"
      @activate="showImgQuality = true"
    >
      <template #subtitle>当前图像质量：{{ imageQualityPercent }}%</template>
    </TcConfigItem>
  </TcConfigSection>
  <TcoImgQuality v-model="showImgQuality" />
  <TcoShareSetting v-model="showShareSetting" />
</template>
<script lang="ts" setup>
import showDialog from "@comp/func/dialog.js";
import showLoading from "@comp/func/loading.js";
import showSnackbar from "@comp/func/snackbar.js";
import TGSqlite from "@Sql/index.js";
import useAppStore from "@store/app.js";
import { core, event } from "@tauri-apps/api";
import { emit as emitTauri } from "@tauri-apps/api/event";
import { platform } from "@tauri-apps/plugin-os";
import TGLogger from "@utils/TGLogger.js";
import { storeToRefs } from "pinia";
import { ref } from "vue";

import TcConfigItem from "./tc-config-item.vue";
import TcConfigSection from "./tc-config-section.vue";
import TcConfigSwitch from "./tc-config-switch.vue";
import TcoImgQuality from "./tco-imgQuality.vue";
import TcoShareSetting from "./tco-shareSetting.vue";

const appStore = useAppStore();
const {
  needResize,
  devMode,
  shareDefaultFile,
  imageQualityPercent,
  incognito,
  closeToTray,
  showFeedback,
  useProxy,
} = storeToRefs(appStore);

// @ts-expect-error import.meta
const isDevEnv = ref<boolean>(import.meta.env.MODE === "development");
const isNeedResize = ref<boolean>(needResize.value !== "false");
const isWindows = platform() === "windows";
const showReset = ref<boolean>(false);
const showImgQuality = ref<boolean>(false);
const showShareSetting = ref<boolean>(false);

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

function switchDevMode(): void {
  devMode.value = !devMode.value;
  if (!devMode.value) {
    showSnackbar.success("已关闭 dev 模式!");
    return;
  }
  showSnackbar.success("已开启 dev 模式!");
}

async function switchResize(): Promise<void> {
  isNeedResize.value = !isNeedResize.value;
  needResize.value = isNeedResize.value.toString();
  await emitTauri("needResize", needResize.value);
  if (isNeedResize.value) {
    showSnackbar.success("已关闭窗口回正!");
    return;
  }
  showSnackbar.success("已开启窗口回正!");
}

async function switchTray(): Promise<void> {
  closeToTray.value = !closeToTray.value;
  if (closeToTray.value) {
    showSnackbar.success("关闭应用时将最小化到系统托盘");
    return;
  }
  showSnackbar.success("关闭应用时直接退出");
}

async function switchIncognito(): Promise<void> {
  incognito.value = !incognito.value;
  await event.emitTo("Sub_window", "switchIncognito");
  if (incognito.value) {
    showSnackbar.success("已开启无痕浏览!");
    return;
  }
  showSnackbar.success("已关闭无痕浏览!");
}

async function switchUseProxy(): Promise<void> {
  useProxy.value = !useProxy.value;
  await core.invoke("game_http_proxy_configure", { useSystemProxy: useProxy.value });
  if (!useProxy.value) {
    showSnackbar.success("已切换为直连模式");
    return;
  }
  const isMsix = await core.invoke<boolean>("is_msix");
  if (isMsix) {
    try {
      const resp = await core.invoke<TGApp.App.Command.LoopbackExemptResp>(
        "enable_loopback_exemption",
      );
      if (resp.success) {
        showSnackbar.success(resp.message);
      } else {
        const copy = await showDialog.checkF({
          title: "解除回环限制失败",
          text:
            `${resp.message}\n` +
            "请以管理员身份执行（或使用代理软件的 Enable Loopback Exemption）：\n" +
            resp.command,
          confirmLabel: "复制命令",
        });
        if (copy) {
          try {
            await navigator.clipboard.writeText(resp.command);
            showSnackbar.success("命令已复制到剪贴板");
          } catch (error) {
            const errMsg = error instanceof Error ? error.message : String(error);
            await TGLogger.Error(`[Config][switchUseProxy] 复制命令失败：${errMsg}`);
            showSnackbar.error("复制失败，请稍后重试");
          }
        }
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      await TGLogger.Error(`[Config][switchUseProxy] 回环豁免命令异常：${errMsg}`);
      await showDialog.checkF({
        title: "解除回环限制失败",
        text:
          "未能获取回环豁免信息，商店版开启代理后可能出现登录报错 -100。\n" +
          "请以管理员身份手动执行：\n" +
          `CheckNetIsolation.exe LoopbackExempt -a -n=<PackageFamilyName>\n${errMsg}`,
      });
    }
  }
  showSnackbar.success("已开启使用系统代理");
}

async function switchFeedback(): Promise<void> {
  showFeedback.value = !showFeedback.value;
  if (showFeedback.value) {
    showSnackbar.success("显示反馈入口");
    return;
  }
  showSnackbar.success("隐藏反馈入口");
}

async function confirmResetDB(): Promise<void> {
  await TGLogger.Info("[Config][confirmResetDB] 开始重置数据库");
  const resetCheck = await showDialog.check("确认重置数据库吗？", "请确认已经备份关键数据");
  if (!resetCheck) {
    showSnackbar.cancel("已取消重置数据库");
    await TGLogger.Info("[Config][confirmResetDB] 取消重置数据库");
    return;
  }
  await showLoading.start("正在重置数据库");
  try {
    await TGSqlite.reset();
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    await TGLogger.Error(`[Config][confirmResetDB] 重置失败 ${errMsg}`);
    return;
  } finally {
    await showLoading.end();
  }
  await TGLogger.Info("[Config][confirmResetDB] 数据库重置完成");
  showSnackbar.success("数据库已重置!即将刷新页面");
  await new Promise<void>((resolve) => setTimeout(resolve, 1500));
  window.location.reload();
}
</script>
<style lang="scss" scoped>
.reset-db {
  display: flex;
  align-items: center;
  padding: 4px 8px;
  border: unset;
  border-radius: 2px;
  margin-left: auto;
  background: var(--common-shadow-1);
  color: var(--tgc-od-red);
  cursor: pointer;
  font-family: var(--font-text);
  font-size: 12px;
}

.reset-db:hover {
  background: var(--box-bg-3);
}

.reset-db:focus-visible {
  outline: 2px solid var(--common-text-title);
  outline-offset: 2px;
}
</style>
