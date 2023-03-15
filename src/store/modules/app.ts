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
// 用于开发者模式的路径
const devDataDir = `${await path.resolve("../")}\\src\\data`;

const useAppStore = defineStore({
	id: "app",
	state: () => {
		return {
			// 是否加载数据
			loading: false,
			// 侧边栏设置
			sidebar: true,
			// 咨讯页渲染模式
			structureRender: true, // 是否采用结构化渲染，否则采用 raw 渲染
			// 数据路径
			dataPath: {
				app: appDataDir,
				user: userDataDir,
				dev: devDataDir,
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
			// 开发者模式
			devPath: {
				app: `${devDataDir}\\app`,
				merge: `${devDataDir}\\merge`,
			},
		};
	},
	actions: {
		// 初始化配置
		async init() {
			// 初始化加载状态
			this.loading = false;
			// 初始化咨讯页渲染模式
			this.structureRender = true;
			// 初始化用户数据路径
			this.userPath = {
				achievements: `${userDataDir}\\achievements.json`,
			};
			// 初始化开发者模式
			this.devPath = {
				app: `${devDataDir}\\app`,
				merge: `${devDataDir}\\merge`,
			};
		},
	},
	persist: true,
});

export default useAppStore;
