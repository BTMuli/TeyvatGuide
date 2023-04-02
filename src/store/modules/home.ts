/**
 * @file store modules home.ts
 * @description Home store module
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.1
 */

import { defineStore } from "pinia";

const useHomeStore = defineStore({
	id: "home",
	state: () => {
		return {
			calendar: {
				show: true,
				order: 3,
			},
			pool: {
				show: true,
				order: 1,
			},
			position: {
				show: true,
				order: 2,
			},
		};
	},
	actions: {
		async init() {
			this.$state = {
				calendar: {
					show: true,
					order: 3,
				},
				pool: {
					show: true,
					order: 1,
				},
				position: {
					show: true,
					order: 2,
				},
			};
		},
		getShowItem() {
			return ["素材日历", "限时祈愿", "近期活动"];
		},
		getShowValue() {
			let showValue = [];
			if (this.calendar.show) showValue.push("素材日历");
			if (this.pool.show) showValue.push("限时祈愿");
			if (this.position.show) showValue.push("近期活动");
			return showValue;
		},
		setShowValue(value: string[]) {
			this.calendar.show = value.includes("素材日历");
			this.pool.show = value.includes("限时祈愿");
			this.position.show = value.includes("近期活动");
		},
	},
	persist: true,
});

export default useHomeStore;
