/**
 * @file store modules app.ts
 * @description App store module
 * @author BTMuli <bt-muli@outlook.com>
 * @since Beta v0.3.3
 */

// vue
import { reactive, ref } from "vue";
// pinia
import { defineStore } from "pinia";
// tauri
import { path } from "@tauri-apps/api";

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
      // 是否显示
      submenu: {
        // 数据库
        wiki: false,
      },
    });
    // 开发者模式
    const devMode = ref(false);
    // 应用主题
    const theme = ref("default");

    const dataPath = reactive({
      userDataDir,
      dbDataPath,
    });
    // 用户数据路径
    const userPath = ref({
      UIAF: `${dataPath.userDataDir}/UIAF.json`,
    });

    // 初始化
    function init(): void {
      loading.value = false;
      devMode.value = false;
      sidebar.submenu = {
        wiki: false,
      };
      theme.value = "default";
    }

    function getSubmenu(): string[] {
      const open = [];
      if (sidebar.submenu.wiki) open.push("wiki");
      return open;
    }

    function changeTheme(): void {
      if (theme.value === "default") theme.value = "dark";
      else theme.value = "default";
    }

    return {
      theme,
      loading,
      buildTime,
      sidebar,
      devMode,
      dataPath,
      userPath,
      init,
      getSubmenu,
      changeTheme,
    };
  },
  {
    persist: [
      {
        key: "appPath",
        storage: window.localStorage,
        paths: ["dataPath", "userPath"],
      },
      {
        key: "app",
        storage: window.localStorage,
        paths: ["devMode", "loading", "buildTime"],
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
    ],
  },
);
