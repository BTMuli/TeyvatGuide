import { defineStore } from "pinia";

export const useAppStore = defineStore({
	id: "app",
	state: () => {
		return {
			// 侧边栏设置
			sidebar: {
				expand: true,
			},
		};
	},
	persist: true,
});
