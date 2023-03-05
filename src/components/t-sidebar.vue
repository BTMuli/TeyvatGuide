<template>
	<a-layout-sider v-model:collapsed="collpased" collapsible :theme="theme">
		<a-menu
			v-model:selected-keys="selectedKeys"
			:theme="theme"
			mode="inline"
			@select="selectMenu"
		>
			<a-menu-item key="home">
				<HomeOutlined />
				<span>首页</span>
			</a-menu-item>
			<a-menu-item key="news">
				<ScheduleOutlined />
				<span>咨讯</span>
			</a-menu-item>
			<a-menu-item key="config">
				<SettingOutlined />
				<span>设置</span>
			</a-menu-item>
		</a-menu>
	</a-layout-sider>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { HomeOutlined, ScheduleOutlined, SettingOutlined } from "@ant-design/icons-vue";
import { useRouter } from "vue-router";

export default defineComponent({
	name: "TSidebar",
	components: {
		HomeOutlined,
		ScheduleOutlined,
		SettingOutlined,
	},
	data() {
		return {
			router: useRouter(),
			collpased: false,
			selectedKeys: ["home"],
			theme: "dark",
		};
	},
	methods: {
		selectMenu({ key }: { key: string }) {
			this.selectedKeys = [key];
			this.router.push(key);
		},
	},
});
</script>

<style lang="css"></style>
