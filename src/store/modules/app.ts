/**
 * @file store modules app.ts
 * @description App store module
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha
 */

import { defineStore } from "pinia";
import { path } from "@tauri-apps/api";

// 用于存储原生数据的路径
const appDataDir = `${await path.appLocalDataDir()}appData`;
// 用于存储用户数据的路径
const userDataDir = `${await path.appLocalDataDir()}userData`;
// 用于各种临时数据的路径
const tempDataDir = `${await path.appLocalDataDir()}tempData`;

const useAppStore = defineStore({
	id: "app",
	state: () => {
		return {
			// 是否加载数据
			loading: false,
			// 侧边栏设置
			sidebar: {
				// 是否折叠
				collapse: false,
				// 是否显示
				submenu: {
					database: false,
				},
			},
			// 开发者模式
			devMode: false,
			// 数据路径
			dataPath: {
				app: appDataDir,
				user: userDataDir,
				temp: tempDataDir,
			},
			// 应用数据路径
			appPath: {
				achievements: `${appDataDir}\\achievements.json`,
				achievementSeries: `${appDataDir}\\achievementSeries.json`,
				nameCards: `${appDataDir}\\nameCards.json`,
			},
			// 用户数据路径
			userPath: {
				achievements: `${userDataDir}\\achievements.json`,
			},
		};
	},
	actions: {
		// 检测 store 数据兼容，主要是 sideBar 数据
		async check() {
			if (this.sidebar === undefined) {
				this.sidebar = {
					collapse: false,
					submenu: {
						database: false,
					},
				};
			} else {
				if (this.sidebar.collapse === undefined) this.sidebar.collapse = false;
				if (this.sidebar.submenu === undefined) this.sidebar.submenu = { database: false };
				if (this.sidebar.submenu.database === undefined) this.sidebar.submenu.database = false;
			}
		},
		// 初始化配置
		async init() {
			// 初始化侧边栏设置
			this.sidebar = {
				collapse: false,
				submenu: {
					database: false,
				},
			};
			// 初始化加载状态
			this.loading = false;
			// 初始化开发者模式
			this.devMode = false;
			// 初始化用户数据路径
			this.userPath = {
				achievements: `${userDataDir}\\achievements.json`,
			};
		},
		// 获取折叠
		getSubmenu() {
			let open = [];
			if (this.sidebar.submenu.database) open.push("database");
			return open;
		},
	},
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
});

export default useAppStore;
