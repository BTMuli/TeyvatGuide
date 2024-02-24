/**
 * @file store/modules/app.ts
 * @description App store module
 * @since Beta v0.4.4
 */

import { path } from "@tauri-apps/api";
import { defineStore } from "pinia";
import { reactive, ref } from "vue";

import type { AnnoLang } from "../../pages/common/Announcements.vue";
import { getInitDeviceInfo } from "../../utils/toolFunc";
import { SERVER } from "../../web/request/getAnno";

// 用于存储用户数据的路径
const userDataDir = `${await path.appLocalDataDir()}userData`;
// 用于存放数据库的路径
const dbDataPath = `${await path.appConfigDir()}TeyvatGuide.db`;
// 用于存放日志的路径
const logDataDir = `${await path.appConfigDir()}logs`;

export const useAppStore = defineStore(
  "app",
  () => {
    // 应用加载状态
    const loading = ref(false);
    // 应用打包时间
    const buildTime = ref("");
    // 侧边栏设置
    const sidebar = reactive({
      // 是否折叠
      collapse: true,
    });
    // 开发者模式
    const devMode = ref(false);
    // 应用主题
    const theme = ref("default");
    // 是否登录
    const isLogin = ref(false);
    // 用户数据目录
    const userDir = ref(userDataDir);
    // 数据库路径
    const dbPath = ref(dbDataPath);
    // 日志目录
    const logDir = ref(logDataDir);
    // 设备信息
    const deviceInfo = ref<TGApp.App.Device.DeviceInfo>(getInitDeviceInfo());
    // 服务器
    const server = ref<SERVER>(SERVER.CN_ISLAND);
    // 语言
    const lang = ref<AnnoLang>("zh-cn");
    // 最近的咨讯类型
    const recentNewsType = ref("notice");

    // 初始化
    function init(): void {
      loading.value = false;
      devMode.value = false;
      theme.value = "default";
      isLogin.value = false;
      sidebar.collapse = true;
      server.value = SERVER.CN_ISLAND;
      lang.value = "zh-cn";
      recentNewsType.value = "notice";
      initDevice();
    }

    function changeTheme(): void {
      if (theme.value === "default") theme.value = "dark";
      else theme.value = "default";
    }

    function initDevice(): void {
      deviceInfo.value = getInitDeviceInfo();
    }

    return {
      theme,
      loading,
      buildTime,
      sidebar,
      devMode,
      deviceInfo,
      isLogin,
      userDir,
      dbPath,
      logDir,
      server,
      lang,
      recentNewsType,
      init,
      changeTheme,
    };
  },
  {
    persist: [
      {
        key: "appPath",
        storage: window.localStorage,
        paths: ["userDir", "dbPath", "logDir"],
      },
      {
        key: "app",
        storage: window.localStorage,
        paths: ["devMode", "loading", "buildTime", "isLogin"],
      },
      {
        key: "sidebar",
        storage: window.localStorage,
        paths: ["sidebar"],
      },
      {
        key: "theme",
        storage: window.localStorage,
        paths: ["theme", "server", "lang", "recentNewsType"],
      },
      {
        key: "deviceInfo",
        storage: window.localStorage,
        paths: ["deviceInfo"],
      },
    ],
  },
);
