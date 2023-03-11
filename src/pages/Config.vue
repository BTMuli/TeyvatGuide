<template>
	<v-card style="margin-bottom: 10px">
		<v-card-title>配置</v-card-title>
	</v-card>
	<v-card style="margin-bottom: 10px">
		<v-list>
			<v-list-item @click="openMergeData" prepend-icon="mdi-folder">
				<v-list-item-title>打开用户数据目录</v-list-item-title>
			</v-list-item>
			<v-list-item @click="deleteData" prepend-icon="mdi-delete">
				<v-list-item-title>删除用户数据</v-list-item-title>
			</v-list-item>
			<v-list-item @click="deleteTemp" prepend-icon="mdi-delete">
				<v-list-item-title>删除临时数据</v-list-item-title>
			</v-list-item>
			<v-list-item @click="setDefaultConfig" prepend-icon="mdi-cog">
				<v-list-item-title>恢复默认配置</v-list-item-title>
			</v-list-item>
		</v-list>
	</v-card>
	<v-card style="margin-bottom: 10px">
		<v-list>
			<v-list-item prepend-icon="mdi-folder">
				<v-list-item-title>本地应用数据路径</v-list-item-title>
				<v-list-item-subtitle>{{ appStore.devPath.app }}</v-list-item-subtitle>
			</v-list-item>
			<v-list-item prepend-icon="mdi-folder">
				<v-list-item-title>本地用户数据路径</v-list-item-title>
				<v-list-item-subtitle>{{ appStore.devPath.merge }}</v-list-item-subtitle>
			</v-list-item>
		</v-list>
	</v-card>
</template>

<script lang="ts" setup>
import useAppStore from "../store/modules/app";
import { dialog, fs } from "@tauri-apps/api";
import { BaseDirectory } from "@tauri-apps/api/fs";
import { TGAppDataList } from "../data";

// Store
const appStore = useAppStore();

// 打开用户数据目录
async function openMergeData() {
	await dialog.open({
		defaultPath: appStore.dataPath.merge,
		filters: [],
	});
}
// 删除本地数据
async function deleteData() {
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
		await fs.removeDir("tempData", {
			dir: BaseDirectory.AppLocalData,
			recursive: true,
		});
		await dialog.message("用户数据已删除!");
		await fs.createDir("userData", { dir: BaseDirectory.AppLocalData });
		await fs.createDir("mergeData", { dir: BaseDirectory.AppLocalData });
		await fs.createDir("tempData", { dir: BaseDirectory.AppLocalData });
		TGAppDataList.MergeData.map(async item => {
			await fs.writeFile(
				`${appStore.dataPath.merge}\\${item.name}`,
				JSON.stringify(item.data, null, 4)
			);
		});
	}
}
// 删除临时数据
async function deleteTemp() {
	const res = await dialog.confirm("确定要删除临时数据吗?");
	if (res) {
		await fs.removeDir("tempData", {
			dir: BaseDirectory.AppLocalData,
			recursive: true,
		});
		await fs.createDir("tempData", { dir: BaseDirectory.AppLocalData });
		await dialog.message("临时数据已删除!");
	}
}
// 恢复默认配置
async function setDefaultConfig() {
	const res = await dialog.confirm("确定要恢复默认配置吗?");
	if (res) {
		await appStore.init();
		await dialog.message("已恢复默认配置!");
	}
}
</script>

<style lang="css"></style>
