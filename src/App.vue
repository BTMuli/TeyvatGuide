<template>
	<v-card>
		<v-layout>
			<!-- 顶部导航栏 -->
			<!-- todo 写个组件 -->
			<v-app-bar title="App Bar" />
			<!-- 侧边栏菜单 -->
			<t-sidebar />
			<!-- 主体内容 -->
			<v-main>
				<v-container fluid>
					<router-view />
				</v-container>
			</v-main>
		</v-layout>
	</v-card>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import TSidebar from "./components/t-sidebar.vue";

export default defineComponent({
	name: "App",
	components: {
		TSidebar,
	},
});
</script>
