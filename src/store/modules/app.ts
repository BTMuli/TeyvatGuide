import { defineStore } from "pinia";
import { path } from "@tauri-apps/api";

const appDataDir = `${await path.appLocalDataDir()}appData`;
const userDataDir = `${await path.appLocalDataDir()}userData`;

const useAppStore = defineStore({
	id: "app",
	state: () => {
		return {
			// 是否加载数据
			loading: false,
			// 侧边栏设置
			sidebar: {
				expand: true,
			},
			// 数据路径
			dataPath: {
				app: appDataDir,
				user: userDataDir,
			},
			// 应用数据路径
			appPath: {
				achievements: `${appDataDir}\\achievements.json`,
				achievementSeries: `${appDataDir}\\achievementSeries.json`,
			},
		};
	},
	actions: {
		// 初始化配置
		async init() {
			// 初始化加载状态
			this.loading = false;
			// 初始化侧边栏设置
			this.sidebar = {
				expand: true,
			};
			// 初始化数据路径
			this.dataPath = {
				app: appDataDir,
				user: userDataDir,
			};
			// 初始化应用数据路径
			this.appPath = {
				achievements: `${appDataDir}\\achievements.json`,
				achievementSeries: `${appDataDir}\\achievementSeries.json`,
			};
		},
	},
	persist: true,
});

export default useAppStore;
