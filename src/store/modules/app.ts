import { defineStore } from "pinia";
import { path } from "@tauri-apps/api";

const appDataDir = `${await path.appLocalDataDir()}appData`;
const userDataDir = `${await path.appLocalDataDir()}userData`;

const useAppStore = defineStore({
	id: "app",
	state: () => {
		return {
			// 侧边栏设置
			sidebar: {
				expand: true,
			},
			dataPath: {
				app: appDataDir,
				user: userDataDir,
			},
		};
	},
	persist: true,
});

export default useAppStore;
