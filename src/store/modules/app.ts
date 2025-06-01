/**
 * @file store/modules/app.ts
 * @description App store module
 * @since Beta v0.7.7
 */

import { AnnoLangEnum, AnnoServerEnum } from "@enum/anno.js";
import { path } from "@tauri-apps/api";
import { getInitDeviceInfo } from "@utils/toolFunc.js";
import { defineStore } from "pinia";
import { ref } from "vue";

// 用于存储用户数据的路径
const userDataDir: Readonly<string> = `${await path.appLocalDataDir()}${path.sep()}userData`;
// 用于存放数据库的路径
const dbDataPath: Readonly<string> = `${await path.appConfigDir()}${path.sep()}TeyvatGuide.db`;
// 用于存放日志的路径
const logDataDir: Readonly<string> = await path.appLogDir();

export type NewsType = "notice" | "activity" | "news";

const useAppStore = defineStore(
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
    const server = ref<TGApp.BBS.Announcement.AnnoServerEnum>(AnnoServerEnum.CN_QD01);
    // 语言
    const lang = ref<TGApp.BBS.Announcement.AnnoLangEnum>(AnnoLangEnum.CHS);
    // 最近的咨讯类型
    const recentNewsType = ref<NewsType>("notice");
    // 是否开启分辨率回正
    const needResize = ref<string>("true");
    // 分享图生成默认设置，为0表示默认保存到文件，为数字表示当大小超过xMB时保存到文件，否则保存到剪贴板
    const shareDefaultFile = ref<number>(10);
    // 图像压缩质量
    const imageQualityPercent = ref<number>(80);
    // 无痕浏览
    const incognito = ref<boolean>(true);

    // 初始化
    function init(): void {
      devMode.value = false;
      theme.value = "default";
      isLogin.value = false;
      sidebar.value.collapse = true;
      server.value = "cn_gf01";
      lang.value = "zh-cn";
      recentNewsType.value = "notice";
      needResize.value = "true";
      gameDir.value = "未设置";
      shareDefaultFile.value = 10;
      imageQualityPercent.value = 10;
      incognito.value = true;
      initDevice();
    }

    function changeTheme(): void {
      if (theme.value === "default") theme.value = "dark";
      else theme.value = "default";
    }

    function initDevice(): void {
      deviceInfo.value = getInitDeviceInfo();
    }

    function getImageUrl(url: string): string {
      if (url.endsWith(".gif") || imageQualityPercent.value === 100) return url;
      return `${url}?x-oss-process=image/format,jpg/quality,Q_${imageQualityPercent.value}`;
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
      imageQualityPercent,
      incognito,
      init,
      changeTheme,
      getImageUrl,
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
        pick: [
          "devMode",
          "loading",
          "buildTime",
          "isLogin",
          "needResize",
          "shareDefaultFile",
          "imageQualityPercent",
          "incognito",
          "sidebar",
        ],
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

export default useAppStore;
