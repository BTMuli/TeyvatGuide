<template>
	<a-layout style="min-height: 100vh">
		<!-- 侧边栏 -->
		<t-sidebar />
		<!-- 内容区 -->
		<a-layout-content class="app-content">
			<!-- 路由组件 -->
			<router-view></router-view>
		</a-layout-content>
	</a-layout>
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

<style lang="css">
.app-content {
	padding: 10px;
	min-height: 100%;
}
</style>
