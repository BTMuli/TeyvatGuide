<template>
	<div v-if="loading">
		<t-loading :empty="loadingEmpty" :title="loadingTitle" />
	</div>
	<div v-else class="dev-json">
		<div class="anno-title">活动列表 JSON</div>
		<json-viewer :value="jsonList" copyable boxed />
		<div class="anno-title">活动内容 JSON</div>
		<json-viewer :value="jsonContent" copyable boxed />
	</div>
</template>
<script lang="ts" setup>
// vue
import { ref, onMounted, reactive } from "vue";
import { useRoute } from "vue-router";
import TLoading from "../components/t-loading.vue";
// plugins
import GenshinOper from "../plugins/Genshin";
// interface
import { AnnoListItem, Announcement } from "../plugins/Genshin/interface/announcement";

// loading
const loading = ref(true as boolean);
const loadingTitle = ref("正在加载");
const loadingEmpty = ref(false as boolean);

// 数据
const anno_id = Number(useRoute().params.anno_id);
let jsonList = reactive({});
let jsonContent = reactive({});

onMounted(async () => {
	// 检查数据
	if (!anno_id) {
		loadingEmpty.value = true;
		loadingTitle.value = "未找到数据";
		return;
	}
	// 获取数据
	loadingTitle.value = "正在获取数据...";
	const listData = await GenshinOper.Announcement.getList();
	listData.list.map((item: Announcement) => {
		return item.list.map((single: AnnoListItem) => {
			if (single.ann_id === anno_id) {
				jsonList = single;
				return;
			}
		});
	});
	jsonContent = await GenshinOper.Announcement.getContent(anno_id);
	setInterval(() => {
		loading.value = false;
	}, 200);
});
</script>
<style lang="css" scoped>
.anno-title {
	font-size: 20px;
	color: #546d8b;
	font-family: Genshin-Light, serif;
	font-weight: 600;
	margin: 20px 0;
}
</style>
