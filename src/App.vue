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

<script lang="ts">
import { defineComponent } from "vue";
import TSidebar from "./components/t-sidebar.vue";
import useAppStore from "./store/modules/app";
import TGAppData from "./data";
import { fs } from "@tauri-apps/api";
import { BaseDirectory } from "@tauri-apps/api/fs";

export default defineComponent({
	name: "App",
	components: {
		TSidebar,
	},
	async mounted() {
		const appStore = useAppStore();
		if (!appStore.loading) {
			try {
				await fs.readDir(`${appStore.dataPath.app}`);
				await fs.readDir(`${appStore.dataPath.user}`);
			} catch (e) {
				await fs.createDir("appData", { dir: BaseDirectory.AppLocalData });
				await fs.createDir("userData", { dir: BaseDirectory.AppLocalData });
			}
			await console.log("检测到数据未加载，开始加载数据...");
			TGAppData.map(async item => {
				await fs.writeFile(
					`${appStore.dataPath.app}\\${item.name}`,
					JSON.stringify(item.data, null, 2)
				);
			});
			appStore.loading = true;
			await console.log("数据加载完成！");
		}
	},
});
</script>
