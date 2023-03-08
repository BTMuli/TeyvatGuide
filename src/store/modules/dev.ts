import { defineStore } from "pinia";

const useDevStore = defineStore({
	id: "dev",
	state() {
		return {
			showDev: false,
			magicCount: 0,
		};
	},
	actions: {
		addMagic() {
			if (!this.showDev) {
				this.magicCount++;
				if (this.magicCount >= 5) {
					this.toggleDev();
				}
			}
		},
		toggleDev() {
			this.showDev = !this.showDev;
			this.magicCount = 0;
		},
	},
	persist: false,
});

export default useDevStore;
