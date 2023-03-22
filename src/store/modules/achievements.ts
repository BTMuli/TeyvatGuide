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
			// 这个数据用于说明当前的数据版本，不会被渲染
			last_version: "v3.5",
			UIAF_Version: "v1.1",
			// 显示用，避免重复计算
			title: "成就完成数：0/899 完成率：0%",
		};
	},
	actions: {
		init() {
			this.total_achievements = 899;
			this.fin_achievements = 0;
			this.title = this.getTitle();
		},
		flushData(total: number, fin: number) {
			this.total_achievements = total;
			this.fin_achievements = fin;
			this.title = this.getTitle();
		},
		getTitle() {
			return `成就完成数：${this.fin_achievements}/${this.total_achievements} 完成率：${(
				(this.fin_achievements / this.total_achievements) *
				100
			).toFixed(2)}%`;
		},
	},
	persist: true,
});

export default useAchievementsStore;
