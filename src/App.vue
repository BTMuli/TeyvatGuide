<template>
	<div v-if="isMain">
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
	</div>
	<div v-else>
		<v-layout>
			<!-- 主体内容 -->
			<v-main>
				<v-container fluid>
					<router-view />
				</v-container>
			</v-main>
		</v-layout>
	</div>
</template>

<script lang="ts" setup>
// vue
import { onMounted, ref } from "vue";
import TSidebar from "./components/t-sidebar.vue";
// tauri
import { fs,window } from "@tauri-apps/api";
// store
import useAppStore from "./store/modules/app";
// utils
import { InitTGData, DeleteTGData, WriteTGData } from "./utils/TGIndex";
// data
import { TGAppDataList, TGGetDataList } from "./data";

const appStore = useAppStore();
const isMain = ref(true as boolean);

onMounted(async () => {
	// 获取当前窗口
	const win = await window.getCurrent();
	isMain.value = win.label === "tauri-genshin";
	if (isMain.value) {
		await checkLoad();
	}
});

async function checkLoad() {
	await appStore.check();
	if (appStore.loading) {
		console.log("数据已加载！");
		return;
	}
	DeleteTGData();
	await createDataDir();
	await writeData();
	await writeIndex();
	appStore.loading = true;
	console.log("数据加载完成！");
}
// 创建数据文件夹
async function createDataDir() {
	console.log("开始创建数据文件夹...");
	await fs.createDir("appData", { dir: fs.BaseDirectory.AppLocalData, recursive: true });
	await fs.createDir("userData", { dir: fs.BaseDirectory.AppLocalData, recursive: true });
	await fs.createDir("tempData", { dir: fs.BaseDirectory.AppLocalData, recursive: true });
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
	TGGetDataList.map(async item => {
		await WriteTGData(item.name, item.data);
	});
	console.log("IndexedDB 写入完成！");
}
</script>
