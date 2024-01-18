/**
 * @file store/modules/app.ts
 * @description App store module
 * @since Beta v0.4.1
 */

import { path } from "@tauri-apps/api";
import { defineStore } from "pinia";
import { reactive, ref } from "vue";

import { getInitDeviceInfo } from "../../utils/toolFunc";

// 用于存储用户数据的路径
const userDataDir = `${await path.appLocalDataDir()}userData`;
// 用于存放数据库的路径
const dbDataPath = `${await path.appConfigDir()}TeyvatGuide.db`;

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
    // 设备信息
    const deviceInfo = ref<TGApp.App.Device.DeviceInfo>(getInitDeviceInfo());

    // 初始化
    function init(): void {
      loading.value = false;
      devMode.value = false;
      theme.value = "default";
      isLogin.value = false;
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
      init,
      changeTheme,
    };
  },
  {
    persist: [
      {
        key: "appPath",
        storage: window.localStorage,
        paths: ["userDir", "dbPath"],
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
        paths: ["theme"],
      },
      {
        key: "deviceInfo",
        storage: window.localStorage,
        paths: ["deviceInfo"],
      },
    ],
  },
);
