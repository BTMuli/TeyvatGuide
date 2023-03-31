<template>
	<div v-if="loading">
		<t-loading />
	</div>
	<div v-else>
		<v-list class="config-list">
			<v-list-subheader inset class="config-header">关于</v-list-subheader>
			<v-divider inset class="border-opacity-75" />
			<v-list-item>
				<template v-slot:prepend>
					<img class="config-icon" src="/icon.webp" alt="App" />
				</template>
				<v-list-item-title>
					应用版本
					<v-btn
						class="card-btn"
						size="small"
						@click="toOuter('https://github.com/BTMuli/Tauri.Genshin/releases/latest')"
						>Alpha</v-btn
					>
				</v-list-item-title>
				<template v-slot:append>
					<v-list-item-subtitle>{{ versionApp }}</v-list-item-subtitle>
				</template>
			</v-list-item>
			<v-list-item title="Tauri 版本" @click="toOuter('https://next--tauri.netlify.app/')">
				<template v-slot:prepend>
					<img class="config-icon" src="/tauri.webp" alt="Tauri" />
				</template>
				<template v-slot:append>
					<v-list-item-subtitle>{{ versionTauri }}</v-list-item-subtitle>
				</template>
			</v-list-item>
			<v-list-item title="成就版本">
				<template v-slot:prepend>
					<img class="config-icon" src="../assets/icons/achievements.svg" alt="Achievements" />
				</template>
				<template v-slot:append>
					<v-list-item-subtitle>{{ achievementsStore.last_version }}</v-list-item-subtitle>
				</template>
			</v-list-item>
			<v-list-subheader inset class="config-header">设置</v-list-subheader>
			<v-divider inset class="border-opacity-75" />
			<v-list-item @click="openMergeData" prepend-icon="mdi-folder" title="打开用户数据目录" />
			<v-list-item @click="deleteData" prepend-icon="mdi-delete" title="清除用户缓存" />
			<v-list-item @click="deleteTemp" prepend-icon="mdi-delete" title="清除临时数据" />
			<v-list-item @click="setDefaultConfig" prepend-icon="mdi-cog" title="恢复默认设置" />
			<v-list-subheader inset class="config-header">调试</v-list-subheader>
			<v-divider inset class="border-opacity-75" />
			<v-list-item title="开发者模式" subtitle="开启后将显示调试信息">
				<template v-slot:prepend>
					<v-icon>mdi-bug</v-icon>
				</template>
				<template v-slot:append>
					<v-switch
						:label="appStore.devMode ? '开启' : '关闭'"
						inset
						v-model="appStore.devMode"
						color="#FAC51E"
					/>
				</template>
			</v-list-item>
			<v-list-subheader inset class="config-header">路径</v-list-subheader>
			<v-divider inset class="border-opacity-75" />
			<v-list-item prepend-icon="mdi-folder">
				<v-list-item-title>本地应用数据路径</v-list-item-title>
				<v-list-item-subtitle>{{ appStore.dataPath.app }}</v-list-item-subtitle>
			</v-list-item>
			<v-list-item prepend-icon="mdi-folder">
				<v-list-item-title>本地用户数据路径</v-list-item-title>
				<v-list-item-subtitle>{{ appStore.dataPath.user }}</v-list-item-subtitle>
			</v-list-item>
		</v-list>
	</div>
</template>

<script lang="ts" setup>
// vue
import { onMounted, ref } from "vue";
import TLoading from "../components/t-loading.vue";
// tauri
import { dialog, fs, app } from "@tauri-apps/api";
// store
import useAppStore from "../store/modules/app";
import useAchievementsStore from "../store/modules/achievements";
// utils
import { WriteTGData } from "../utils/TGIndex";
// data
import { getDataList } from "../data/init";

// Store
const appStore = useAppStore();
const achievementsStore = useAchievementsStore();

// About
const loading = ref(true);
const versionApp = ref("");
const versionTauri = ref("");

// load version
onMounted(async () => {
	versionApp.value = await app.getVersion();
	versionTauri.value = await app.getTauriVersion();
	setInterval(() => {
		loading.value = false;
	}, 1000);
});

// 打开外部链接
function toOuter(url: string) {
	window.open(url);
}

// 打开用户数据目录
async function openMergeData() {
	await dialog.open({
		defaultPath: appStore.dataPath.user,
		filters: [],
	});
}
// 删除本地数据
async function deleteData() {
	const res = await dialog.confirm("确定要删除用户数据吗?");
	if (res) {
		await fs.removeDir("userData", {
			dir: fs.BaseDirectory.AppLocalData,
			recursive: true,
		});
		await fs.removeDir("tempData", {
			dir: fs.BaseDirectory.AppLocalData,
			recursive: true,
		});
		getDataList.map(async item => {
			await WriteTGData(item.name, item.data);
		});
		await dialog.message("用户数据已删除!");
		await achievementsStore.init();
		await fs.createDir("userData", { dir: fs.BaseDirectory.AppLocalData });
		await fs.createDir("tempData", { dir: fs.BaseDirectory.AppLocalData });
	}
}
// 删除临时数据
async function deleteTemp() {
	const res = await dialog.confirm("确定要删除临时数据吗?");
	if (res) {
		await fs.removeDir("tempData", {
			dir: fs.BaseDirectory.AppLocalData,
			recursive: true,
		});
		await fs.createDir("tempData", { dir: fs.BaseDirectory.AppLocalData });
		await dialog.message("临时数据已删除!");
	}
}
// 恢复默认配置
async function setDefaultConfig() {
	const res = await dialog.confirm("确定要初始化数据吗?");
	if (res) {
		await appStore.init();
		await achievementsStore.init();
		dialog.message("已恢复默认配置!").then(() => {
			window.location.reload();
		});
	}
}
</script>

<style lang="css">
.config-list {
	margin: 10px;
	font-family: "Genshin-Light", serif;
	background: #faf7e8;
	color: #546d8b;
	border-radius: 10px;
}

.config-header {
	margin-top: 10px;
	font-family: Genshin, serif;
	background: #faf7e8;
	color: #fec90b;
	font-size: large;
}

.config-icon {
	width: 40px;
	height: 40px;
	margin-right: 15px;
	padding: 5px;
	background: #5b738f;
	border-radius: 10px;
}
</style>
