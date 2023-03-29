<template>
	<div>TEST {{ $route.meta.isMain }}</div>
</template>
<script lang="ts" setup>
// 获取路由传参
import { useRoute } from "vue-router";

const route = useRoute();

// 获取路由参数
const id = route.params.post_id;
console.log(id);
</script>
<style lang="css"></style>
