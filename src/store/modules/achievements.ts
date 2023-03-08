/**
 * @file store modules achievements.ts
 * @description Achievements store module
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha
 */

import { defineStore } from "pinia";

const useAchievementsStore = defineStore({
	id: "achievements",
	state() {
		return {
			total_achievements: 899,
			fin_achievements: 0,
			last_version: "v3.5",
			UIAF_Version: "v1.1",
		};
	},
	persist: true,
});

export default useAchievementsStore;
