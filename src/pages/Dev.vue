<template>
	<h1>开发</h1>
	<v-card>
		<v-list>
			<v-list-item @click="initDev()" prepend-icon="mdi-refresh">
				<v-list-item-title>初始化开发</v-list-item-title>
			</v-list-item>
			<v-list-item @click="parseAchievement()" prepend-icon="mdi-export">
				<v-list-item-title>解析成就数据</v-list-item-title>
			</v-list-item>
			<v-list-item @click="mergeAchievement()" prepend-icon="mdi-export">
				<v-list-item-title>合并成就数据</v-list-item-title>
			</v-list-item>
		</v-list>
	</v-card>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import useDevStore from "../store/modules/dev";
import { updateMergeData, updateAppData } from "../utils/merge";

export default defineComponent({
	name: "Dev",
	data() {
		return {
			originRaw: {
				Hutao: "" as string,
				Paimon: "" as string,
			},
		};
	},
	methods: {
		initDev() {
			const devStore = useDevStore();
			devStore.showDev = false;
			devStore.magicCount = 0;
		},
		// 以下两功能不更改数据目录的文件，更改的是应用数据的文件
		parseAchievement() {
			updateAppData();
		},
		mergeAchievement() {
			updateMergeData();
		},
	},
});
</script>

<style lang="css"></style>
