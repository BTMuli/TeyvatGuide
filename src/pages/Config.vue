<template>
	<v-card>
		<v-card-title>配置</v-card-title>
		<v-list>
			<v-list-item @click="checkData" prepend-icon="mdi-folder">
				<v-list-item-title>检测数据</v-list-item-title>
			</v-list-item>
			<v-list-item @click="setAppData" prepend-icon="mdi-folder">
				<v-list-item-title>导入数据</v-list-item-title>
			</v-list-item>
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
import { dialog, fs, path, notification } from "@tauri-apps/api";
import { BaseDirectory } from "@tauri-apps/api/fs";
import TauriGenshinData from "../data";
export default defineComponent({
	name: "Config",
	data() {
		return {
			source: "本地",
		};
	},
	methods: {
		// 检测本地数据
		async checkData() {
			if (await this.checkDir()) {
				await notification.sendNotification("数据目录不为空，检测成功");
			} else {
				await notification.sendNotification("数据目录为空，正在导入数据...");
				await this.setAppData();
			}
		},
		// 检查数据目录是否为空
		async checkDir() {
			const appStore = useAppStore();
			try {
				await fs.readDir(`${appStore.dataPath.app}`);
				await fs.readDir(`${appStore.dataPath.user}`);
				return true;
			} catch (e) {
				await fs.createDir("appData", { dir: BaseDirectory.AppLocalData });
				await fs.createDir("userData", { dir: BaseDirectory.AppLocalData });
				return false;
			}
		},
		// 导入数据
		async setAppData() {
			const appStore = useAppStore();
			TauriGenshinData.appData.map(async item => {
				await fs.writeFile(`${appStore.dataPath.app}\\${item.name}`, item.data);
			});
			TauriGenshinData.userData.map(async item => {
				await fs.writeFile(`${appStore.dataPath.user}\\${item.name}`, item.data);
			});
			await dialog.message("数据导入成功");
		},
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
				await dialog.message("用户数据已删除!");
				await fs.createDir("userData", { dir: BaseDirectory.AppLocalData });
			}
		},
		// 恢复默认配置
		async setDefaultConfig() {
			const res = await dialog.confirm("确定要恢复默认配置吗?");
			if (res) {
				const appStore = useAppStore();
				const appLocalDataDir = await path.appLocalDataDir();
				appStore.dataPath = {
					app: `${appLocalDataDir}appData`,
					user: `${appLocalDataDir}userData`,
				};
				await dialog.message("已恢复默认配置!");
			}
		},
	},
});
</script>

<style lang="css"></style>
