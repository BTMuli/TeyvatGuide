<template>
  <transition name="func-confirm-outer">
    <div v-show="show" class="confirm-overlay" @click.self.prevent="handleOuter">
      <transition name="func-confirm-inner">
        <div class="confirm-box">
          <div class="confirm-title">
            {{ data.title ?? "" }}
          </div>
          <div v-if="data?.text !== '' && data.mode === 'confirm'" class="confirm-subtitle">
            {{ data.text }}
          </div>
          <div v-if="data?.text !== '' && data.mode === 'input'" class="confirm-input">
            <div class="confirm-input-label">
              {{ data.text }}
            </div>
            <input v-model="inputVal" class="confirm-input-box" />
          </div>
          <div class="confirm-btn-box">
            <button class="confirm-btn" @click="handleCancel">
              <img class="btn-icon" src="../../assets/icons/circle-cancel.svg" alt="cancel" />
              <span class="btn-text"> 取消 </span>
            </button>
            <button class="confirm-btn" @click="handleConfirm">
              <img class="btn-icon" src="../../assets/icons/circle-check.svg" alt="confirm" />
              <span class="btn-text"> 确定 </span>
            </button>
          </div>
        </div>
      </transition>
    </div>
  </transition>
</template>

<script lang="ts" setup>
// vue
import { onMounted, reactive, ref, type UnwrapRef } from "vue";

interface ConfirmProps {
  title: string;
  text?: string;
  mode: "confirm" | "input";
  otcancel?: boolean;
  onCancel?: () => void;
  onConfirm: (val?: boolean | string) => void;
}

const props = withDefaults(defineProps<ConfirmProps>(), {
  title: "",
  text: "",
  mode: "confirm",
  onConfirm: () => {
    console.log("confirm");
  },
  onCancel: () => {
    console.log("cancel");
  },
});

// 组件参数
const data = reactive({
  title: "",
  text: "",
  mode: "confirm",
  otcancel: false,
  onCancel: () => {},
  onConfirm: (value?: UnwrapRef<boolean | string>) => {},
});
const show = ref<boolean>(false);
const confirmVal = ref<boolean | string>(false);
const inputVal = ref<string>("");

onMounted(() => {
  displayBox(props);
});

function displayBox(props: TGApp.Component.Confirm.Params): void {
  data.title = props.title;
  data.text = props.text ?? "";
  data.mode = props.mode ?? "confirm";
  data.otcancel = props.otcancel ?? true;
  data.onCancel =
    props.onCancel ??
    (() => {
      console.log("cancel");
    });
  data.onConfirm =
    props.onConfirm ??
    ((param?: boolean | string) => {
      console.log("confirm");
    });
  show.value = true;
}

// 点击确认事件
function handleConfirm(): void {
  if (data.mode === "input") {
    confirmVal.value = inputVal.value;
    inputVal.value = "";
  } else {
    confirmVal.value = true;
  }
  data.onConfirm(confirmVal.value);
  show.value = false;
}

// 点击取消事件
function handleCancel(): void {
  data.onCancel();
  show.value = false;
}

// 点击外部事件
function handleOuter(): void {
  if (data.otcancel) {
    handleCancel();
  }
}

defineExpose({
  displayBox,
});
</script>

<style scoped>
.confirm-overlay {
  position: fixed;
  z-index: 100;
  top: 0;
  left: 0;
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(3px);
  background: rgb(0 0 0 / 50%);
}

.confirm-box {
  display: flex;
  width: 40vw;
  height: 20vh;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  padding: 10px;
  border-radius: 10px;
  background: var(--content-bg-2);
  box-shadow: 0 0 10px var(--common-shadow-2);
}

.confirm-title {
  width: 100%;
  border-bottom: 1px solid var(--btn-bg-2);
  color: var(--content-text-2);
  font-family: var(--font-title);
  font-size: 30px;
  text-align: center;
}

.confirm-subtitle {
  width: 100%;
  color: var(--content-text-2);
  font-family: var(--font-text);
  font-size: 20px;
  text-align: center;
}

.confirm-input {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: center;
  color: var(--content-text-2);
  font-family: Genshin-Light, serif;
  font-size: 20px;
  gap: 10px;
}

.confirm-input-box {
  width: 50%;
  height: 100%;
  padding: 5px;
  border-radius: 5px;
  background: var(--btn-bg-3);
  color: var(--btn-text-1);
}

.confirm-btn-box {
  display: flex;
  width: 100%;
  align-items: flex-end;
  justify-content: space-around;
}

.confirm-btn {
  position: relative;
  display: flex;
  width: 30%;
  min-width: 150px;
  min-height: 30px;
  align-items: center;
  border-radius: 50px;
  background: var(--btn-bg-2);
  color: var(--btn-text-1);
  font-family: var(--font-text);
}

.btn-icon {
  width: 20px;
  height: 20px;
  margin: 5px;
}

.btn-text {
  position: absolute;
  width: 100%;
  text-align: center;
}
</style>
