<template>
	<div v-if="loading">
		<t-loading :empty="loadingEmpty" :title="loadingTitle" />
	</div>
	<div v-else v-html="postHtml" class="mys-post-body" />
</template>
<script lang="ts" setup>
// vue
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import TLoading from "../components/t-loading.vue";
// plugins
import MysOper from "../plugins/Mys";

// loading
const loading = ref(true as boolean);
const loadingTitle = ref("正在加载");
const loadingEmpty = ref(false as boolean);

// 数据
const post_id = Number(useRoute().params.post_id);
const postHtml = ref("");

onMounted(async () => {
	// 检查数据
	if (!post_id) {
		loadingEmpty.value = true;
		loadingTitle.value = "未找到数据";
		return;
	}
	// 获取数据
	loadingTitle.value = "正在获取数据...";
	try {
		const postData = await MysOper.Post.get(post_id);
		loadingTitle.value = "正在渲染数据...";
		postHtml.value = MysOper.Post.parser(postData);
	} catch (error) {
		loadingEmpty.value = true;
		loadingTitle.value = "帖子不存在或解析失败";
		return;
	}
	setInterval(() => {
		loading.value = false;
	}, 200);
});
</script>
<style lang="css" scoped>
@import "../assets/css/post-parser.css";
</style>
