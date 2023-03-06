<template>
	<!-- todo 侧边栏宽度调整 -->
	<v-navigation-drawer permanent :rail="rail">
		<!-- todo 选中没有高亮 -->
		<v-list>
			<!-- 第一个图标，负责返回上一个页面 -->
			<!-- todo 如果没有上一个页面，则灰色不可点击 -->
			<v-list-item @click="back">
				<v-list-item-action>
					<v-icon>mdi-arrow-left</v-icon>
				</v-list-item-action>
			</v-list-item>
			<!-- 第二个图标，负责收缩侧边栏 -->
			<v-list-item @click="collapse">
				<v-list-item-action>
					<v-icon>mdi-menu</v-icon>
				</v-list-item-action>
			</v-list-item>
			<!-- 菜单项 -->
			<v-list-subheader>
				<v-icon>mdi-bug-outline</v-icon>
				<span v-show="!rail"> 测试功能 </span>
			</v-list-subheader>
			<v-list-item link href="/news">
				<template v-slot:prepend>
					<v-icon>mdi-calendar-text-outline</v-icon>
				</template>
				<v-list-item-title v-show="!rail"> 咨讯 </v-list-item-title>
			</v-list-item>
			<v-list-subheader>
				<v-icon>mdi-cog-outline</v-icon>
				<span v-show="!rail"> 开发功能 </span>
			</v-list-subheader>
			<v-list-item link href="/config">
				<template v-slot:prepend>
					<v-icon>mdi-cog-outline</v-icon>
				</template>
				<v-list-item-title v-show="!rail"> 设置 </v-list-item-title>
			</v-list-item>

			<v-list-subheader>
				<v-icon>mdi-rocket-outline</v-icon>
				<span v-show="!rail"> 预期功能 </span>
			</v-list-subheader>
		</v-list>
	</v-navigation-drawer>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { useRouter } from "vue-router";

export default defineComponent({
	name: "TSidebar",
	data() {
		return {
			rail: true,
			router: useRouter(),
		};
	},
	methods: {
		back() {
			this.router.go(-1);
		},
		collapse() {
			this.rail = !this.rail;
		},
	},
});
</script>

<style lang="css"></style>
