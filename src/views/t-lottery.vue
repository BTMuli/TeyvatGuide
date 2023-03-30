<template>
	<div v-if="loading">
		<t-loading :empty="loadingEmpty" :title="loadingTitle" />
	</div>
	<div v-else class="mys-post-body">
		<v-card title="抽奖详情" class="lottery-card">
			<v-list>
				<v-list-item>
					<template v-slot:prepend>
						<v-avatar>
							<v-img :src="lotteryCard.creator.avatar_url" />
						</v-avatar>
					</template>
					{{ lotteryCard.creator.nickname }}
					<v-list-item-subtitle>{{ lotteryCard.creator.introduce }}</v-list-item-subtitle>
					<template v-slot:append>发起人</template>
				</v-list-item>
				<v-list-item>
					<v-list-item-title>{{ lotteryCard.participantWay }}</v-list-item-title>
					<v-list-item-subtitle>{{ lotteryCard.id }}</v-list-item-subtitle>
					<template v-slot:append>抽奖 ID</template>
				</v-list-item>
			</v-list>
			<v-card-actions>
				<v-btn class="lottery-back" @click="backPost">返回</v-btn>
			</v-card-actions>
		</v-card>
		<v-card title="中奖名单" class="lottery-card">
			<v-card v-for="reward in lotteryCard.rewards">
				<v-list>
					<v-list-item>
						<v-list-item-title>{{ reward.rewardName }}</v-list-item-title>
						<template v-slot:append>
							<v-list-item-subtitle>中奖人数：{{ reward.winnerNumber }}</v-list-item-subtitle>
						</template>
					</v-list-item>
					<v-list-item v-for="user in reward.users" width="50%">
						<template v-slot:prepend>
							<v-avatar>
								<v-img :src="user.avatar_url" />
							</v-avatar>
						</template>
						{{ user.nickname }}
					</v-list-item>
				</v-list>
			</v-card>
		</v-card>
	</div>
</template>
<script lang="ts" setup>
// vue
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import TLoading from "../components/t-loading.vue";
// plugins
import MysOper from "../plugins/Mys";
// interface
import { LotteryCard } from "../plugins/Mys/interface/lottery";

// loading
const loading = ref(true as boolean);
const loadingTitle = ref("正在加载");
const loadingEmpty = ref(false as boolean);

// 数据
const lottery_id = useRoute().params.lottery_id as string;
const lotteryCard = ref({} as LotteryCard);

function backPost() {
	window.history.back();
}

onMounted(async () => {
	// 检查数据
	if (!lottery_id) {
		loadingEmpty.value = true;
		loadingTitle.value = "未找到数据";
		return;
	}
	// 获取数据
	loadingTitle.value = "正在获取数据...";
	const lotteryData = await MysOper.Lottery.get(lottery_id);
	if (!lotteryData) {
		loadingEmpty.value = true;
		loadingTitle.value = "未找到数据";
		return;
	}
	loadingTitle.value = "正在渲染数据...";
	lotteryCard.value = MysOper.Lottery.card.lottery(lotteryData);
	setInterval(() => {
		loading.value = false;
	}, 200);
});
</script>
<style lang="css">
.lottery-card {
	margin: 10px;
}

.lottery-back {
	margin: 10px;
	background: #5c6474 !important;
	color: #f4d8a8 !important;
}
</style>
