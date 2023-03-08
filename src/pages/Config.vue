<template>
	<v-card>
		<v-card-title>配置</v-card-title>
		<v-list>
			<v-list-item @click="openUserData" prepend-icon="mdi-folder">
				<v-list-item-title>打开用户数据目录</v-list-item-title>
			</v-list-item>
			<v-list-item @click="deleteUserData" prepend-icon="mdi-delete">
				<v-list-item-title>删除用户数据</v-list-item-title>
			</v-list-item>
			<v-list-item @click="setDefaultConfig" prepend-icon="mdi-cog">
				<v-list-item-title>恢复默认配置</v-list-item-title>
			</v-list-item>
		</v-list>
	</v-card>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import useAppStore from "../store/modules/app";
import { dialog, fs } from "@tauri-apps/api";
import { BaseDirectory } from "@tauri-apps/api/fs";
export default defineComponent({
	name: "Config",
	data() {
		return {
			source: "本地",
			appStore: useAppStore(),
		};
	},
	methods: {
		// 打开数据文件夹
		async openUserData() {
			const appStore = useAppStore();
			const appDataPath = appStore.dataPath.user;
			await dialog.open({
				defaultPath: appDataPath,
				filters: [],
			});
		},
		// 删除数据
		async deleteUserData() {
			const res = await dialog.confirm("确定要删除用户数据吗?");
			if (res) {
				await fs.removeDir("userData", {
					dir: BaseDirectory.AppLocalData,
					recursive: true,
				});
				await fs.removeDir("mergeData", {
					dir: BaseDirectory.AppLocalData,
					recursive: true,
				});
				await dialog.message("用户数据已删除!");
				await fs.createDir("userData", { dir: BaseDirectory.AppLocalData });
				await fs.createDir("mergeData", { dir: BaseDirectory.AppLocalData });
			}
		},
		// 恢复默认配置
		async setDefaultConfig() {
			const res = await dialog.confirm("确定要恢复默认配置吗?");
			if (res) {
				const appStore = useAppStore();
				await appStore.init();
				await dialog.message("已恢复默认配置!");
			}
		},
	},
});
</script>

<style lang="css"></style>
