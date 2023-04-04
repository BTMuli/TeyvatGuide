<template>
	<div class="loading-div">
		<div class="loading-content">
			<div class="loading-title">
				{{ title }}
				<v-progress-circular indeterminate color="#f4d8a8" v-show="!empty" />
			</div>
			<div class="loading-subtitle" v-show="subtitle">{{ subtitle }}</div>
			<div class="loading-img" v-if="!empty">
				<img src="/source/UI/loading.webp" alt="loading" />
			</div>
			<div class="loading-img" v-else>
				<img src="/source/UI/empty.webp" alt="empty" />
			</div>
			<div class="loading-text" v-show="content">{{ content }}</div>
		</div>
	</div>
</template>
<script lang="ts" setup>
withDefaults(
	defineProps<{
		title?: string;
		subtitle?: string;
		content?: string;
		empty?: boolean;
		position?: string;
	}>(),
	{
		title: "加载中",
		empty: false,
		position: "absolute",
	}
);
</script>
<style lang="css" scoped>
.loading-div {
	position: v-bind(position);
	display: flex;
	top: 25%;
	left: 25%;
	width: 50%;
	height: 50%;
	background: rgba(57, 59, 64, 0.5);
	backdrop-filter: blur(10px);
	border-radius: 20px;
}

.loading-content {
	width: 100%;
	margin: 20px;
	display: flex;
	border: #f4d8a8 1px solid;
	border-radius: 20px;
	flex-direction: column;
	justify-content: center;
	align-items: center;
}

.loading-title {
	font-size: 2rem;
	font-family: Genshin, serif;
	font-weight: 600;
	color: #f4d8a8;
}

.loading-subtitle {
	font-size: 1rem;
	font-family: Genshin-Light, serif;
	color: #f4d8a8;
}

.loading-img {
	width: 256px;
	height: 256px;
	display: flex;
	justify-content: center;
	align-items: center;
}
</style>
