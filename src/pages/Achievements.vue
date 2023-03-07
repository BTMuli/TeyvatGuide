<template>
	<!-- 顶部操作栏 -->
	<v-app-bar app>
		<template v-slot:prepend>
			<!-- 标题 -->
			<v-card-text class="text-h5">{{ title }}</v-card-text>
		</template>
		<template v-slot:append>
			<!-- 导入按钮 -->
			<v-btn @click="importJson" prepend-icon="mdi-import" class="bg-green-accent-2">
				导入
			</v-btn>
			<!-- 导出按钮 -->
			<v-btn @click="exportJson" prepend-icon="mdi-export" class="ms-2 bg-green-accent-2">
				导出
			</v-btn>
		</template>
	</v-app-bar>
	<!-- 主体内容 -->
	<!-- 侧边成就系列列表 -->
	<v-layout>
		<!-- 成就列表 -->
		<!-- todo 样式 -->
		<v-container fluid>
			<v-card>
				<v-card-title>成就列表</v-card-title>
				<v-card-text>
					<v-list>
						<v-list-item v-for="item in achievementsTrans" :key="item.id">
							<v-divider></v-divider>
							<v-list-item-title>成就 ID：{{ item.id }}</v-list-item-title>
							<v-list-item-subtitle
								>成就完成时间： {{ item.time }}</v-list-item-subtitle
							>
						</v-list-item>
					</v-list>
				</v-card-text>
			</v-card>
		</v-container>
	</v-layout>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { dialog, fs } from "@tauri-apps/api";
import { AchievementsType, UIAF_AchievementType } from "../interface/Achievements";

export default defineComponent({
	name: "Achievements",
	data() {
		return {
			title: "成就",
			achievementsRaw: {} as UIAF_AchievementType[],
			achievementsTrans: {},
		};
	},
	methods: {
		// 导入
		async importJson() {
			// 文件选择对话框
			const selectedJson = await dialog.open({
				multiple: false,
				filters: [
					{
						name: "JsonFile",
						extensions: ["json"],
					},
				],
			});
			if (selectedJson !== null) {
				// 读取文件
				const fileData: string = await fs.readTextFile(<string>selectedJson, {});
				await this.loadJson(fileData);
			}
		},
		// 解析数据
		async loadJson(data: string) {
			const fileJson: AchievementsType = JSON.parse(data);
			try {
				this.achievementsRaw = fileJson.list;
				// 解析数据
				this.achievementsTrans = this.transJson(this.achievementsRaw);
				this.title = "成就 - " + this.achievementsRaw.length + " 个";
				await dialog.message("导入成功");
			} catch (error) {
				console.log(error);
				await dialog.message("导入失败");
			}
		},
		// 解析数据
		transJson(data: UIAF_AchievementType[]) {
			const dataTrans: any[] = [];
			data.map(async item => {
				dataTrans.push({
					id: item.id,
					time: new Date(Number(item.timestamp * 1000)).toLocaleString(),
				});
			});
			return dataTrans;
		},
		// 导出
		exportJson() {
			dialog
				.save({
					filters: [
						{
							name: "JsonFile",
							extensions: ["json"],
						},
					],
				})
				.then(res => {
					if (res !== null) {
						fs.writeTextFile(<string>res, JSON.stringify(this.achievementsRaw)).then(
							() => {
								dialog.message("导出成功");
							}
						);
					}
				});
		},
	},
});
</script>

<style lang="css"></style>
