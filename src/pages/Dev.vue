<template>
	<h1>开发</h1>
	<v-card>
		<v-list>
			<v-list-item @click="initDev()" prepend-icon="mdi-refresh">
				<v-list-item-title>初始化开发</v-list-item-title>
			</v-list-item>
		</v-list>
	</v-card>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import useDevStore from "../store/modules/dev";

export default defineComponent({
	name: "Dev",
	methods: {
		initDev() {
			const devStore = useDevStore();
			devStore.showDev = false;
			devStore.magicCount = 0;
		},
	},
});
</script>

<style lang="css"></style>
