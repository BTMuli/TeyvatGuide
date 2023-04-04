<template>
	<v-overlay v-model="propsConfirm.show">
		<div class="confirm-div" v-if="propsConfirm.show">
			<div class="confirm-box">
				<div class="confirm-title">{{ propsConfirm.title }}</div>
				<div class="confirm-btn-box">
					<button class="confirm-btn" @click="setCancel">
						<img class="btn-icon" src="../assets/icons/circle-cancel.svg" alt="cancel" />
						<span class="btn-text">{{ propsConfirm.cancel }}</span>
					</button>
					<button class="confirm-btn" @click="setConfirm">
						<img class="btn-icon" src="../assets/icons/circle-check.svg" alt="confirm" />
						<span class="btn-text">{{ propsConfirm.confirm }}</span>
					</button>
				</div>
			</div>
		</div>
	</v-overlay>
</template>
<script lang="ts" setup>
// vue
import { defineProps, defineEmits } from "vue";

// props
const propsConfirm = defineProps({
	show: {
		type: Boolean,
		required: true,
		default: false,
	},
	title: {
		type: String,
		required: true,
	},
	cancel: {
		type: String,
		default: "取消",
	},
	confirm: {
		type: String,
		default: "确定",
	},
	value: {
		type: Boolean,
		required: true,
	},
});

// emits
const emitConfirm = defineEmits(["update:value", "update:show"]);

// methods
async function setCancel() {
	await emitConfirm("update:show", false);
	await emitConfirm("update:value", false);
}

async function setConfirm() {
	await emitConfirm("update:show", false);
	await emitConfirm("update:value", true);
}
</script>
<style lang="css" scoped>
.confirm-div {
	width: 40vw;
	height: 20vh;
	margin-top: 40vh;
	margin-left: 30vw;
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
