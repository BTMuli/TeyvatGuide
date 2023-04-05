<template>
	<v-navigation-drawer permanent :rail="rail" style="background: #485466; color: #faf7e8">
		<v-list class="sideList" density="compact" v-model:opened="open" nav>
			<!-- 负责收缩侧边栏 -->
			<v-list-item @click="collapse">
				<template v-slot:prepend v-if="rail">
					<v-list-item-action>
						<v-icon color="rgb(205, 182, 145)">mdi-chevron-right</v-icon>
					</v-list-item-action>
				</template>
				<template v-slot:append v-else>
					<v-list-item-action>
						<v-icon color="rgb(205, 182, 145)">mdi-chevron-left</v-icon>
					</v-list-item-action>
				</template>
			</v-list-item>
			<!-- 菜单项 -->
			<v-list-item value="home" title="首页" link href="/">
				<template v-slot:prepend>
					<img src="/source/UI/paimon.webp" alt="homeIcon" class="sideIcon" />
				</template>
			</v-list-item>
			<v-list-item title="公告" value="announcements" link href="/announcements">
				<template v-slot:prepend>
					<img src="../assets/icons/board.svg" alt="annoIcon" class="sideIcon" />
				</template>
			</v-list-item>
			<v-divider></v-divider>
			<v-list-group value="mihoyo" fluid>
				<template v-slot:activator="{ props }">
					<v-list-item title="米游社" v-bind="props">
						<template v-slot:prepend>
							<img src="/platforms/mhy/mys.webp" alt="mihoyo" class="sideIcon" />
						</template>
					</v-list-item>
				</template>
				<v-list-item title="原神" value="mhy-ys" link href="/news/2">
					<template v-slot:prepend>
						<img src="/platforms/mhy/ys.webp" alt="ys" class="sideIcon" />
					</template>
				</v-list-item>
				<v-list-item title="崩坏3" value="mhy-bh3" link href="/news/1">
					<template v-slot:prepend>
						<img src="/platforms/mhy/bh3.webp" alt="bh3" class="sideIcon" />
					</template>
				</v-list-item>
				<v-list-item title="崩坏2" value="mhy-bh2" link href="/news/3">
					<template v-slot:prepend>
						<img src="/platforms/mhy/bh2.webp" alt="bh2" class="sideIcon" />
					</template>
				</v-list-item>
				<v-list-item title="未定事件簿" value="mhy-wd" link href="/news/4">
					<template v-slot:prepend>
						<img src="/platforms/mhy/wd.webp" alt="wd" class="sideIcon" />
					</template>
				</v-list-item>
				<v-list-item title="星穹铁道" value="mhy-sr" link href="/news/6">
					<template v-slot:prepend>
						<img src="/platforms/mhy/sr.webp" alt="sr" class="sideIcon" />
					</template>
				</v-list-item>
				<v-list-item title="绝区零" value="mhy-zzz" link href="/news/8">
					<template v-slot:prepend>
						<img src="/platforms/mhy/zzz.webp" alt="zzz" class="sideIcon" />
					</template>
				</v-list-item>
				<v-list-item title="大别野" value="mhy-dby" link href="/news/5">
					<template v-slot:prepend>
						<img src="/platforms/mhy/dby.webp" alt="dby" class="sideIcon" />
					</template>
				</v-list-item>
			</v-list-group>
			<v-divider></v-divider>
			<v-list-item title="成就" value="achievements" link href="/achievements">
				<template v-slot:prepend>
					<img src="../assets/icons/achievements.svg" alt="achievementsIcon" class="sideIcon" />
				</template>
			</v-list-item>
			<v-divider></v-divider>
			<v-list-group value="database" fluid>
				<template v-slot:activator="{ props }">
					<v-list-item title="数据库" v-bind="props">
						<template v-slot:prepend>
							<v-icon color="rgb(205, 182, 145)">mdi-database</v-icon>
						</template>
					</v-list-item>
				</template>
				<v-list-item title="GCG" value="db-GCG" link href="/GCG">
					<template v-slot:prepend>
						<img src="../assets/icons/GCG.svg" alt="gcgIcon" class="sideIcon" />
					</template>
				</v-list-item>
			</v-list-group>
			<v-divider></v-divider>
			<v-list-item title="设置" value="config" link href="/config">
				<template v-slot:prepend>
					<img src="../assets/icons/setting.svg" alt="setting" class="sideIcon" />
				</template>
			</v-list-item>
		</v-list>
	</v-navigation-drawer>
</template>

<script lang="ts" setup>
// vue
import { computed, ref } from "vue";
// store
import useAppStore from "../store/modules/app";

const appStore = useAppStore();

const rail = ref(appStore.sidebar.collapse);
const open = computed({
	get() {
		return appStore.getSubmenu();
	},
	set(value: string[]) {
		appStore.sidebar.submenu.mihoyo = value.includes("mihoyo");
		appStore.sidebar.submenu.database = value.includes("database");
	},
});

function collapse() {
	rail.value = !rail.value;
	appStore.sidebar.collapse = rail.value;
}
</script>

<style lang="css" scoped>
.sideList {
	font-family: "Genshin-Light", serif;
}

.sideIcon {
	width: 24px;
	height: 24px;
	margin-right: 32px;
	border-radius: 5px;
}
</style>
