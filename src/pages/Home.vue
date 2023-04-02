<template>
	<t-pool v-if="homeStore.pool.show" />
	<t-position v-if="homeStore.position.show" />
	<t-calendar v-if="homeStore.calendar.show" />
</template>

<script lang="ts" setup>
// vue
import TPool from "../components/t-pool.vue";
import TPosition from "../components/t-position.vue";
import TCalendar from "../components/t-calendar.vue";
// store
import useHomeStore from "../store/modules/home";

const homeStore = useHomeStore();
</script>
