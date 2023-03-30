<template>
	<div v-if="loading">
		<t-loading :empty="loadingEmpty" :title="loadingTitle" />
	</div>
	<div v-else>
		<h1>{{ lottery_id }}</h1>
		{{ lottery }}
	</div>
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
const lottery_id = useRoute().params.lottery_id as string;
const lottery = ref({} as any);

onMounted(async () => {
	// 检查数据
	if (!lottery_id) {
		loadingEmpty.value = true;
		loadingTitle.value = "未找到数据";
		return;
	}
	// 获取数据
	loadingTitle.value = "正在获取数据...";
	lottery.value = await MysOper.Lottery.get(lottery_id);
	setInterval(() => {
		loading.value = false;
	}, 200);
});
</script>
<style></style>
