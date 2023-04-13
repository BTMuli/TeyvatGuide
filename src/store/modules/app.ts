/**
 * @file store modules app.ts
 * @description App store module
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.3
 */

// vue
import { reactive, ref } from "vue";
// pinia
import { defineStore } from "pinia";
// tauri
import { path } from "@tauri-apps/api";

// 用于存储原生数据的路径
const appDataDir = `${await path.appLocalDataDir()}appData`;
// 用于存储用户数据的路径
const userDataDir = `${await path.appLocalDataDir()}userData`;
// 用于各种临时数据的路径
const tempDataDir = `${await path.appLocalDataDir()}tempData`;

export const useAppStore = defineStore(
  "app",
  () => {
    // 应用加载状态
    const loading = ref(false);
    // 侧边栏设置
    const sidebar = reactive({
      // 是否折叠
      collapse: true,
      // 是否显示
      submenu: {
        // 米游社
        mihoyo: false,
        // 数据库
        database: false,
      },
    });
    // 开发者模式
    const devMode = ref(false);

    const dataPath = reactive({
      appDataDir,
      userDataDir,
      tempDataDir,
    });

    // 应用数据路径
    const appPath = ref({
      achievements: `${dataPath.appDataDir}/achievements.json`,
      achievementSeries: `${dataPath.appDataDir}/achievementSeries.json`,
      nameCards: `${dataPath.appDataDir}/nameCards.json`,
    });
      // 用户数据路径
    const userPath = ref({
      achievements: `${dataPath.userDataDir}/achievements.json`,
    });

    // 初始化
    function init (): void {
      loading.value = false;
      devMode.value = false;
    }

    function getSubmenu (): string[] {
      const open = [];
      if (sidebar.submenu.database) open.push("database");
      if (sidebar.submenu.mihoyo) open.push("mihoyo");
      return open;
    }

    return {
      loading,
      sidebar,
      devMode,
      dataPath,
      appPath,
      userPath,
      init,
      getSubmenu,
    };
  },
  {
    persist: [
      {
        key: "appPath",
        storage: window.localStorage,
        paths: ["dataPath", "appPath", "userPath"],
      },
      {
        key: "app",
        storage: window.localStorage,
        paths: ["devMode", "loading"],
      },
      {
        key: "sidebar",
        storage: window.localStorage,
        paths: ["sidebar"],
      },
    ],
  },
);
