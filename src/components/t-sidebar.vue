<template>
	<v-navigation-drawer permanent :rail="rail">
		<v-list>
			<!-- 第一个图标，负责收缩侧边栏 -->
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
			<v-list-item @click="toPage('/news')">
				<template v-slot:prepend>
					<v-icon>mdi-calendar-text-outline</v-icon>
				</template>
				<v-list-item-title v-show="!rail"> 咨讯 </v-list-item-title>
			</v-list-item>
			<v-list-subheader>
				<v-icon>mdi-cog-outline</v-icon>
				<span v-show="!rail"> 开发功能 </span>
			</v-list-subheader>
			<v-list-item @click="toPage('/config')">
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
		collapse() {
			this.rail = !this.rail;
		},
		toPage(path: string) {
			if (this.router.currentRoute.path !== path) {
				this.router.push(path);
			}
		},
	},
});
</script>

<style lang="css"></style>
