<template>
	<!-- todo 侧边栏宽度调整 -->
	<v-navigation-drawer permanent :rail="rail">
		<!-- todo 选中没有高亮 -->
		<v-list>
			<!-- 第一个图标，负责返回上一个页面 -->
			<!-- todo 如果没有上一个页面，则灰色不可点击 -->
			<v-list-item @click="back">
				<v-list-item-action>
					<v-icon color="rgb(205, 182, 145)">mdi-arrow-left</v-icon>
				</v-list-item-action>
			</v-list-item>
			<!-- 第二个图标，负责收缩侧边栏 -->
			<v-list-item @click="collapse">
				<v-list-item-action>
					<v-icon color="rgb(205, 182, 145)">mdi-menu</v-icon>
				</v-list-item-action>
			</v-list-item>
			<!-- 菜单项 -->
			<v-list-item link href="/" title="首页">
				<template v-slot:prepend>
					<img src="/source/UI/paimon.webp" alt="homeIcon" class="sideIcon" />
				</template>
			</v-list-item>
			<v-list-item link href="/news" title="咨讯">
				<template v-slot:prepend>
					<img src="/source/UI/news.svg" alt="newsIcon" class="sideIcon" />
				</template>
			</v-list-item>
			<v-list-item link href="/achievements" title="成就">
				<template v-slot:prepend>
					<img src="/source/UI/achievements.webp" alt="achievementsIcon" class="sideIcon" />
				</template>
			</v-list-item>
			<v-list-item link href="/config" title="设置">
				<template v-slot:prepend>
					<v-icon color="rgb(205, 182, 145)">mdi-cog-outline</v-icon>
				</template>
			</v-list-item>
			<v-list-item link href="/dev" v-show="showDev" title="开发">
				<template v-slot:prepend>
					<v-icon>mdi-bug-outline</v-icon>
				</template>
			</v-list-item>
		</v-list>
	</v-navigation-drawer>
</template>

<script lang="ts" setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import useAppStore from "../store/modules/app";
import useDevStore from "../store/modules/dev";

const router = useRouter();
const appStore = useAppStore();
const devStore = useDevStore();

const rail = ref(appStore.sidebar);
const showDev = ref(devStore.showDev);

const back = () => {
	try {
		router.back();
	} catch (e) {
		console.error(e);
	}
};
function collapse() {
	rail.value = !rail.value;
	appStore.sidebar = rail.value;
}
function magicClick() {
	// 打包的时候不显示开发功能
	// if (!showDev.value) {
	// 	devStore.magicCount++;
	// 	if (devStore.magicCount >= 10) {
	// 		showDev.value = true;
	// 		devStore.showDev = true;
	// 	}
	// }
}
</script>

<style lang="css">
.sideIcon {
	width: 24px;
	height: 24px;
	margin-right: 32px;
}
</style>
