<template>
	<div class="loading-div">
		<div class="loading-content">
			<div class="loading-title">
				{{ props.title }}
				<v-progress-circular indeterminate color="#f4d8a8" v-show="!props.empty" />
			</div>
			<div class="loading-subtitle" v-show="props.subtitle">{{ props.subtitle }}</div>
			<div class="loading-img" v-if="!props.empty">
				<img src="/source/UI/loading.webp" alt="loading" />
			</div>
			<div class="loading-img" v-else>
				<img src="/source/UI/empty.webp" alt="empty" />
			</div>
			<div class="loading-text" v-show="props.content">{{ props.content }}</div>
		</div>
	</div>
</template>
<script lang="ts" setup>
const props = defineProps({
	title: {
		type: String,
		default: "加载中",
	},
	subtitle: {
		type: String,
	},
	content: {
		type: String,
	},
	empty: {
		type: Boolean,
		default: false,
	},
});
</script>
<style lang="css">
.loading-div {
	position: fixed;
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
	font-family: Genshin, serif;
}

.loading-title {
	font-size: 2rem;
	font-weight: 600;
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
