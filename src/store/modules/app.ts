import { defineStore } from "pinia";

const useAppStore = defineStore({
	id: "app",
	state: () => {
		return {
			// 侧边栏设置
			sidebar: {
				expand: true,
			},
			dataPath: "",
		};
	},
	actions: {
		setDataPath(path: string) {
			this.dataPath = path;
		},
	},
	persist: true,
});

export default useAppStore;
