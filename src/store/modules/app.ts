/**
 * @file store/modules/app.ts
 * @description App store module
 * @since Beta v0.6.4
 */

import { path } from "@tauri-apps/api";
import { defineStore } from "pinia";
import { ref } from "vue";

import { getInitDeviceInfo } from "@/utils/toolFunc.js";
import { type AnnoLang, AnnoServer } from "@/web/request/hk4eReq.js";

// 用于存储用户数据的路径
const userDataDir: Readonly<string> = `${await path.appLocalDataDir()}${path.sep()}userData`;
// 用于存放数据库的路径
const dbDataPath: Readonly<string> = `${await path.appConfigDir()}${path.sep()}TeyvatGuide.db`;
// 用于存放日志的路径
const logDataDir: Readonly<string> = await path.appLogDir();

export enum NewsTypeEnum {
  notice = "1",
  activity = "2",
  news = "3",
}

export type NewsType = keyof typeof NewsTypeEnum;

export const useAppStore = defineStore(
  "app",
  () => {
    // 应用打包时间
    const buildTime = ref<string>("");
    // 侧边栏设置
    const sidebar = ref({ collapse: true });
    // 开发者模式
    const devMode = ref<boolean>(false);
    // 应用主题
    const theme = ref<string>("default");
    // 是否登录
    const isLogin = ref<boolean>(false);
    // 用户数据目录
    const userDir = ref<string>(userDataDir);
    // 数据库路径
    const dbPath = ref<Readonly<string>>(dbDataPath);
    // 日志目录
    const logDir = ref<string>(logDataDir);
    // 游戏安装目录
    const gameDir = ref<string>("未设置");
    // 设备信息
    const deviceInfo = ref<TGApp.App.Device.DeviceInfo>(getInitDeviceInfo());
    // 服务器
    const server = ref<AnnoServer>(AnnoServer.CN_ISLAND);
    // 语言
    const lang = ref<AnnoLang>("zh-cn");
    // 最近的咨讯类型
    const recentNewsType = ref<NewsType>("notice");
    // 是否开启分辨率回正
    const needResize = ref<string>("true");
    // 分享图生成默认设置，为0表示默认保存到文件，为数字表示当大小超过xMB时保存到文件，否则保存到剪贴板
    const shareDefaultFile = ref<number>(10);

    // 初始化
    function init(): void {
      devMode.value = false;
      theme.value = "default";
      isLogin.value = false;
      sidebar.value.collapse = true;
      server.value = AnnoServer.CN_ISLAND;
      lang.value = "zh-cn";
      recentNewsType.value = "notice";
      needResize.value = "true";
      gameDir.value = "未设置";
      shareDefaultFile.value = 10;
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
      needResize,
      gameDir,
      shareDefaultFile,
      init,
      changeTheme,
    };
  },
  {
    persist: [
      {
        key: "appPath",
        storage: window.localStorage,
        pick: ["userDir", "dbPath", "logDir", "gameDir"],
      },
      {
        key: "app",
        storage: window.localStorage,
        pick: ["devMode", "loading", "buildTime", "isLogin", "needResize", "shareDefaultFile"],
      },
      {
        key: "sidebar",
        storage: window.localStorage,
        pick: ["sidebar"],
      },
      {
        key: "theme",
        storage: window.localStorage,
        pick: ["theme", "server", "lang", "recentNewsType"],
      },
      {
        key: "deviceInfo",
        storage: window.localStorage,
        pick: ["deviceInfo"],
      },
    ],
  },
);
