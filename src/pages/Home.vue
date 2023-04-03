<template>
	<component v-for="item in components" :is="item" :key="item" />
</template>

<script lang="ts" setup>
// vue
import { shallowRef, onMounted } from "vue";
import TPool from "../components/t-pool.vue";
import TPosition from "../components/t-position.vue";
import TCalendar from "../components/t-calendar.vue";
// store
import useHomeStore from "../store/modules/home";

const homeStore = useHomeStore();
const showItems = homeStore.getShowValue();
const components = shallowRef([] as any[]);

onMounted(() => {
	showItems.map(item => {
		switch (item) {
			case "限时祈愿":
				components.value.push(TPool);
				break;
			case "近期活动":
				components.value.push(TPosition);
				break;
			case "素材日历":
				components.value.push(TCalendar);
				break;
			default:
				break;
		}
	});
});
</script>
