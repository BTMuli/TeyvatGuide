<template>
	<v-layout>
		<!-- 侧边栏菜单 -->
		<t-sidebar />
		<!-- 主体内容 -->
		<v-main>
			<v-container fluid>
				<router-view />
			</v-container>
		</v-main>
	</v-layout>
</template>

<script lang="ts" setup>
import TSidebar from "./components/t-sidebar.vue";
import useAppStore from "./store/modules/app";
import { TGAppDataList } from "./data";
import { getDataList } from "./data/init";
import { fs } from "@tauri-apps/api";
import { BaseDirectory } from "@tauri-apps/api/fs";
import { onMounted } from "vue";
import { InitTGData, DeleteTGData, WriteTGData } from "./utils/TGIndex";

const appStore = useAppStore();

onMounted(async () => {
	await checkLoad();
});
async function checkLoad() {
	if (appStore.loading) {
		console.log("数据已加载！");
		return;
	}
	await DeleteTGData();
	await createDataDir();
	await writeData();
	await writeIndex();
	appStore.loading = true;
	console.log("数据加载完成！");
}
// 创建数据文件夹
async function createDataDir() {
	console.log("开始创建数据文件夹...");
	await fs.createDir("appData", { dir: BaseDirectory.AppLocalData, recursive: true });
	await fs.createDir("userData", { dir: BaseDirectory.AppLocalData, recursive: true });
	await fs.createDir("tempData", { dir: BaseDirectory.AppLocalData, recursive: true });
	console.log("数据文件夹创建完成！");
}
// 将数据写入文件夹
async function writeData() {
	console.log("开始写入数据...");
	TGAppDataList.map(async item => {
		await fs.writeFile(`${appStore.dataPath.app}\\${item.name}`, JSON.stringify(item.data));
	});
	console.log("数据写入完成！");
}
// 写入 IndexedDB
async function writeIndex() {
	console.log("开始写入 IndexedDB...");
	await InitTGData();
	getDataList.map(async item => {
		await WriteTGData(item.name, item.data);
	});
	console.log("IndexedDB 写入完成！");
}
</script>
