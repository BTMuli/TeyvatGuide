/**
 * 应用状态管理
 * @since Beta v0.9.1
 */

import bbsEnum from "@enum/bbs.js";
import gameEnum from "@enum/game.js";
import { path } from "@tauri-apps/api";
import { getInitDeviceInfo } from "@utils/toolFunc.js";
import { defineStore } from "pinia";
import { ref } from "vue";

/** 用于存储用户数据的路径 */
const userDataDir: Readonly<string> = `${await path.appLocalDataDir()}${path.sep()}userData`;
/** 用于存放数据库的路径 */
const dbDataPath: Readonly<string> = `${await path.appConfigDir()}${path.sep()}TeyvatGuide.db`;
/** 用于存放日志的路径 */
const logDataDir: Readonly<string> = await path.appLogDir();

const useAppStore = defineStore(
  "app",
  () => {
    /** 应用打包时间 */
    const buildTime = ref<string>("");
    /** 侧边栏设置 */
    const sidebar = ref({ collapse: true });
    /** 开发者模式 */
    const devMode = ref<boolean>(false);
    /** 应用主题 */
    const theme = ref<string>("default");
    /** 是否登录 */
    const isLogin = ref<boolean>(false);
    /** 用户数据目录 */
    const userDir = ref<string>(userDataDir);
    /** 数据库路径 */
    const dbPath = ref<Readonly<string>>(dbDataPath);
    /** 日志目录 */
    const logDir = ref<string>(logDataDir);
    /** 游戏安装目录 */
    const gameDir = ref<string>("未设置");
    /** 设备信息 */
    const deviceInfo = ref<TGApp.App.Device.DeviceInfo>(getInitDeviceInfo());
    /** 服务器 */
    const server = ref<TGApp.Game.Base.ServerTypeEnum>(gameEnum.server.CN_QD01);
    /** 语言 */
    const lang = ref<TGApp.Game.Anno.AnnoLangEnum>(gameEnum.anno.lang.CHS);
    /** 最近的资讯类型 */
    const recentNewsType = ref<TGApp.BBS.Post.NewsTypeEnum>(bbsEnum.post.newsType.NOTICE);
    /** 是否开启分辨率回正 */
    const needResize = ref<string>("true");
    /**
     * 分享图生成默认设置
     * @example
     * 0 - 默认保存到文件
     * 10 - 当大小超过10MB时保存到文件，否则保存到剪贴板
     */
    const shareDefaultFile = ref<number>(10);
    /** 图像压缩质量 */
    const imageQualityPercent = ref<number>(80);
    /** 无痕浏览 */
    const incognito = ref<boolean>(true);
    /** 帖子宽窄视图 */
    const postViewWide = ref<boolean>(true);
    /** 是否取消点赞 */
    const cancelLike = ref<boolean>(true);
    /** 关闭窗口时最小化到托盘 */
    const closeToTray = ref<boolean>(false);

    /**
     * 初始化应用状态
     * @since Beta v0.9.1
     * @remarks 用于首次运行或重置应用状态
     * @returns 无返回值
     */
    function init(): void {
      devMode.value = false;
      theme.value = "default";
      isLogin.value = false;
      sidebar.value.collapse = true;
      server.value = "cn_gf01";
      lang.value = "zh-cn";
      recentNewsType.value = bbsEnum.post.newsType.NOTICE;
      needResize.value = "true";
      gameDir.value = "未设置";
      shareDefaultFile.value = 10;
      imageQualityPercent.value = 10;
      incognito.value = true;
      postViewWide.value = true;
      cancelLike.value = true;
      closeToTray.value = false;
      initDevice();
    }

    /**
     * 切换应用主题
     * @since Beta v0.9.1
     * @returns 无返回值
     */
    function changeTheme(): void {
      if (theme.value === "default") theme.value = "dark";
      else theme.value = "default";
    }

    /**
     * 初始化设备信息
     * @since Beta v0.9.1
     * @returns 无返回值
     */
    function initDevice(): void {
      deviceInfo.value = getInitDeviceInfo();
    }

    /**
     * 获取图片压缩后的URL
     * @since Beta v0.9.1
     * @param url - 图片原始URL
     * @param fmt - 图片格式，可选参数
     * @returns 压缩后的图片URL
     */
    function getImageUrl(url: string, fmt?: string): string {
      let check = true;
      if (fmt && !["jpg", "png", "webp", "gif", "jpeg"].includes(fmt.toLowerCase())) check = false;
      if (url.endsWith(".gif") || (check && imageQualityPercent.value === 100)) return url;
      return `${url}?x-oss-process=image/format,png/quality,Q_${imageQualityPercent.value}`;
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
      postViewWide,
      cancelLike,
      closeToTray,
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
          "postViewWide",
          "cancelLike",
          "closeToTray",
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
