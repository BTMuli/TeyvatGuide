<template>
  <transition name="func-confirm-outer">
    <div v-show="show || showOuter" class="confirm-overlay" @click.self.prevent="handleOuter">
      <transition name="func-confirm-inner">
        <div v-show="showInner" class="confirm-box">
          <div class="confirm-title">
            {{ data.title }}
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
            <button class="confirm-btn" @click="handleClick(false)">
              <img class="btn-icon" src="../../assets/icons/circle-cancel.svg" alt="cancel" />
              <span class="btn-text"> 取消 </span>
            </button>
            <button class="confirm-btn" @click="handleClick(true)">
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
import { onMounted, reactive, ref, watch } from "vue";

interface ConfirmProps {
  title: string;
  text?: string;
  mode?: "confirm" | "input";
  otcancel?: boolean;
}

const props = withDefaults(defineProps<ConfirmProps>(), {
  title: "",
  text: "",
  mode: "confirm",
  otcancel: false,
});

// 组件参数
const data = reactive<TGApp.Component.Confirm.Params>({
  title: "",
});
const show = ref<boolean>(false);
const showOuter = ref<boolean>(false);
const showInner = ref<boolean>(false);
const confirmVal = ref<boolean | string>(false);
const inputVal = ref<string>("");

watch(show, () => {
  if (show.value) {
    showOuter.value = true;
    setTimeout(() => {
      showInner.value = true;
    }, 100);
  } else {
    setTimeout(() => {
      showInner.value = false;
    }, 100);
    setTimeout(() => {
      showOuter.value = false;
    }, 300);
  }
});

onMounted(async () => {
  await displayBox(props);
});

async function displayBox(params: TGApp.Component.Confirm.Params): Promise<string | boolean> {
  data.title = params.title;
  data.text = params.text ?? "";
  data.mode = params.mode ?? "confirm";
  data.otcancel = params.otcancel ?? true;
  show.value = true;
  // 等待确认框关闭，返回关闭后的confirmVal
  return await new Promise<string | boolean>((resolve) => {
    watch(show, () => {
      // 等 0.5s 动画
      setTimeout(() => {
        resolve(confirmVal.value);
      }, 500);
    });
  });
}

// 点击确认事件
function handleClick(status: boolean): void {
  let res;
  if (!status) {
    res = false;
  } else {
    if (data.mode === "input") {
      res = inputVal.value;
      inputVal.value = "";
    } else {
      res = true;
    }
  }
  show.value = false;
  confirmVal.value = res;
}

// 点击外部事件
function handleOuter(): void {
  if (data.otcancel) {
    handleClick(false);
  }
}

defineExpose({
  displayBox,
});
</script>

<style scoped>
.func-confirm-outer-enter-active,
.func-confirm-outer-leave-active,
.func-confirm-inner-enter-active {
  transition: all 0.3s;
}

.func-confirm-inner-leave-active {
  transition: all 0.5s ease-in-out;
}

.func-confirm-inner-enter-from {
  opacity: 0;
  transform: scale(1.5);
}

.func-confirm-inner-enter-to,
.func-confirm-inner-leave-from {
  opacity: 1;
  transform: scale(1);
}

.func-confirm-outer-enter-to,
.func-confirm-outer-leave-from {
  opacity: 1;
}

.func-confirm-outer-enter-from,
.func-confirm-outer-leave-to {
  opacity: 0;
}

.func-confirm-inner-leave-to {
  opacity: 0;
  transform: scale(0);
}

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
