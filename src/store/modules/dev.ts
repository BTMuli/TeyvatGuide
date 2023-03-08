import { defineStore } from "pinia";

const useDevStore = defineStore({
	id: "dev",
	state() {
		return {
			showDev: false,
			magicCount: 0,
		};
	},
	persist: true,
});

export default useDevStore;
