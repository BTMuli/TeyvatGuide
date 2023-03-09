/**
 * @file store modules achievements.ts
 * @description Achievements store module
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha
 */

import { defineStore } from "pinia";
import TGMap from "../../utils/TGMap";
import { SeriesMap } from "../../interface/Achievements";

const useAchievementsStore = defineStore({
	id: "achievements",
	state() {
		return {
			total_achievements: 899,
			fin_achievements: 0,
			// 这个数据用于说明当前的数据版本，不会被渲染
			last_version: "v3.5",
			UIAF_Version: "v1.1",
		};
	},
	actions: {
		flushData(seriesMap: TGMap<SeriesMap>) {
			let total = 0;
			let fin = 0;
			seriesMap.forEach(series => {
				total += series.total_count;
				fin += series.completed_count;
			});
			this.total_achievements = total;
			this.fin_achievements = fin;
		},
	},
	persist: true,
});

export default useAchievementsStore;
