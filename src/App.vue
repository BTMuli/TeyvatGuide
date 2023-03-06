<template>
	<v-card>
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
