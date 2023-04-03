/**
 * @file store modules home.ts
 * @description Home store module
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.2
 */

import { defineStore } from "pinia";
import { Map } from "../../interface/Base";

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
			poolCover: {} as Map<string>,
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
				poolCover: {},
			};
		},
		getShowItem() {
			const defaultList = ["素材日历", "限时祈愿", "近期活动"];
			defaultList.sort((a, b) => {
				return this.getItemOrder(a) - this.getItemOrder(b);
			});
			return defaultList;
		},
		getShowValue() {
			let showValue = [];
			if (this.calendar.show) showValue.push("素材日历");
			if (this.pool.show) showValue.push("限时祈愿");
			if (this.position.show) showValue.push("近期活动");
			showValue.sort((a, b) => {
				return this.getItemOrder(a) - this.getItemOrder(b);
			});
			return showValue;
		},
		getItemOrder(item: string) {
			switch (item) {
				case "素材日历":
					return this.calendar.order;
				case "限时祈愿":
					return this.pool.order;
				case "近期活动":
					return this.position.order;
				default:
					return 4;
			}
		},
		setShowValue(value: string[]) {
			let order = 1;
			// 遍历 value
			value.forEach(item => {
				if (!this.getShowItem().includes(item)) {
					throw new Error("传入的值不在可选范围内");
				}
				switch (item) {
					case "素材日历":
						this.calendar.order = order;
						this.calendar.show = true;
						order++;
						break;
					case "限时祈愿":
						this.pool.order = order;
						this.pool.show = true;
						order++;
						break;
					case "近期活动":
						this.position.order = order;
						this.position.show = true;
						order++;
						break;
					default:
						break;
				}
				// 没有显示的 item
				if (!value.includes("素材日历")) {
					this.calendar.show = false;
					this.calendar.order = order;
					order++;
				}
				if (!value.includes("限时祈愿")) {
					this.pool.show = false;
					this.pool.order = order;
					order++;
				}
				if (!value.includes("近期活动")) {
					this.position.show = false;
					this.position.order = order;
					order++;
				}
			});
		},
	},
	persist: true,
});

export default useHomeStore;
