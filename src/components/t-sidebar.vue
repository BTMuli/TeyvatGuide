<template>
	<!-- todo 侧边栏宽度调整 -->
	<v-navigation-drawer permanent :rail="rail">
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
			<v-list-item value="home" title="首页" @click="toPage('home')">
				<template v-slot:prepend>
					<img src="/source/UI/paimon.webp" alt="homeIcon" class="sideIcon" />
				</template>
			</v-list-item>
			<v-list-item title="咨讯" value="news" @click="toPage('news')">
				<template v-slot:prepend>
					<img src="../assets/icons/board.svg" alt="newsIcon" class="sideIcon" />
				</template>
			</v-list-item>
			<v-list-item title="成就" value="achievements" @click="toPage('achievements')">
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
				<v-list-item title="GCG" value="GCG" @click="toPage('GCG')">
					<template v-slot:prepend>
						<img src="../assets/icons/GCG.svg" alt="gcgIcon" class="sideIcon" />
					</template>
				</v-list-item>
			</v-list-group>
			<v-divider></v-divider>
			<v-list-item title="设置" value="config" @click="toPage('config')">
				<template v-slot:prepend>
					<img src="../assets/icons/setting.svg" alt="setting" class="sideIcon" />
				</template>
			</v-list-item>
		</v-list>
	</v-navigation-drawer>
</template>

<script lang="ts" setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import useAppStore from "../store/modules/app";

const router = useRouter();
const appStore = useAppStore();

const rail = ref(appStore.sidebar);
const open = ref(["database"]);

function collapse() {
	rail.value = !rail.value;
	appStore.sidebar = rail.value;
}

function toPage(link: string) {
	router.push(link);
}
</script>

<style lang="css">
.sideList {
	font-family: "Genshin", serif;
}

.sideIcon {
	width: 24px;
	height: 24px;
	margin-right: 32px;
}
</style>
