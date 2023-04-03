<template>
	<div v-if="loading">
		<t-loading :empty="loadingEmpty" :title="loadingTitle" />
	</div>
	<div v-else>
		<div class="lottery-div">
			<div class="lottery-title">抽奖详情</div>
			<v-list class="lottery-list">
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
			<v-btn class="lottery-back" @click="backPost">返回</v-btn>
		</div>
		<div class="lottery-div">
			<div class="lottery-title">奖品详情</div>
			<div v-for="reward in lotteryCard.rewards">
				<v-list class="lottery-list">
					<v-list-item :title="reward.rewardName" :subtitle="'中奖人数' + reward.winnerNumber" />
				</v-list>
				<div class="lottery-grid">
					<v-list v-for="user in reward.users" class="lottery-sub-list">
						<v-list-item>
							<template v-slot:prepend>
								<v-avatar>
									<v-img :src="user.avatar_url" />
								</v-avatar>
							</template>
							{{ user.nickname }}
						</v-list-item>
					</v-list>
				</div>
			</div>
		</div>
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
	setTimeout(() => {
		loading.value = false;
	}, 200);
});
</script>
<style lang="css">
.lottery-div {
	background: #546d8b;
	border-radius: 10px;
	margin: 10px;
	padding: 10px;
}

.lottery-title {
	font-family: Genshin, serif;
	font-size: 20px;
	color: #faf7e8;
	margin: 10px;
}

.lottery-list {
	background: #faf7e8;
	border-radius: 10px;
	margin: 10px;
	color: #546d8b;
	font-family: Genshin-Light, serif;
}

.lottery-sub-list {
	background: #546d8b;
	border-radius: 10px;
	margin: 10px;
	color: #faf7e8;
	font-family: Genshin-Light, serif;
}

.lottery-back {
	margin: 10px;
	font-family: Genshin, serif;
	color: #546d8b !important;
	background: #faf7e8 !important;
}

.lottery-grid {
	background: #faf7e8;
	border-radius: 10px;
	margin: 10px;
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
	grid-gap: 10px;
}
</style>
