<template>
	<v-overlay v-model="showVal">
		<div class="confirm-div">
			<div class="confirm-box">
				<div class="confirm-title">{{ title }}</div>
				<div class="confirm-btn-box">
					<button class="confirm-btn" @click="setCancel">
						<img class="btn-icon" src="../assets/icons/circle-cancel.svg" alt="cancel" />
						<span class="btn-text">{{ cancel }}</span>
					</button>
					<button class="confirm-btn" @click="setConfirm">
						<img class="btn-icon" src="../assets/icons/circle-check.svg" alt="confirm" />
						<span class="btn-text">{{ confirm }}</span>
					</button>
				</div>
			</div>
		</div>
	</v-overlay>
</template>
<script lang="ts" setup>
// vue
import { defineEmits, ref } from "vue";

withDefaults(
	defineProps<{
		title: string;
		cancel?: string;
		confirm?: string;
		value: boolean;
	}>(),
	{
		title: "确认",
		cancel: "取消",
		confirm: "确定",
		value: false,
	}
);

const showVal = ref(false);

// emits
const emitConfirm = defineEmits(["update:value"]);

// expose
defineExpose({
	showConfirm,
});

// methods
function showConfirm() {
	showVal.value = true;
}

function setCancel() {
	emitConfirm("update:value", false);
	showVal.value = false;
}

function setConfirm() {
	emitConfirm("update:value", true);
	showVal.value = false;
}
</script>
<style lang="css" scoped>
.confirm-div {
	position: absolute;
	width: 40vw;
	height: 20vh;
	top: 40vh;
	left: 30vw;
	background: #ffffff;
	border-radius: 10px;
	padding: 10px;
	display: flex;
	flex-direction: column;
	align-items: center;
}

.confirm-box {
	border-radius: 10px;
	width: 100%;
	height: 100%;
}

.confirm-title {
	font-family: Genshin, serif;
	text-align: center;
	height: 20%;
	width: 100%;
	color: #393b40;
	margin: 20px;
	font-size: 30px;
}

.confirm-btn-box {
	height: 60%;
	width: 100%;
	display: flex;
	justify-content: space-around;
	align-items: center;
}

.confirm-btn {
	width: 30%;
	min-width: 150px;
	min-height: 30px;
	background: #4a5366;
	color: #faf7e8;
	border-radius: 50px;
	display: flex;
	align-items: center;
}

.btn-icon {
	margin: 5px;
	width: 25px;
	height: 25px;
}

.btn-text {
	width: calc(100% - 70px);
	text-align: center;
	font-family: Genshin-Light, serif;
	font-size: 20px;
}
</style>
