<template>
  <transition name="func-confirm-outer">
    <div v-show="show || showOuter" class="confirm-overlay" @click.self.prevent="handleOuter">
      <transition name="func-confirm-inner">
        <div v-show="showInner" class="confirm-box">
          <div class="confirm-title">{{ data.title }}</div>
          <div
            v-show="data?.text !== '' && data.mode === 'confirm'"
            class="confirm-subtitle"
            :title="data.text"
          >
            {{ data.text }}
          </div>
          <div v-show="data?.text !== '' && data.mode === 'input'" class="confirm-input">
            <div class="confirm-input-label">{{ data.text }}</div>
            <input
              v-model="inputVal"
              class="confirm-input-box"
              ref="inputRef"
              @keydown.enter="handleClick(true)"
            />
          </div>
          <div class="confirm-btn-box">
            <button class="confirm-btn no-btn" @click="handleClick(false)">取消</button>
            <button class="confirm-btn ok-btn" @click="handleClick(true)">确定</button>
          </div>
        </div>
      </transition>
    </div>
  </transition>
</template>

<script lang="ts" setup>
import { nextTick, onMounted, reactive, ref, watch } from "vue";

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
const inputRef = ref<HTMLInputElement>();

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
    nextTick(() => {
      if (data.mode === "input") {
        // 等待确认框打开，聚焦输入框
        setTimeout(() => {
          inputRef.value?.focus();
        }, 100);
      }
    });
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
  backdrop-filter: blur(10px);

  /* 颜色变量 */
  --confirm-title: var(--tgc-dark-7);
  --confirm-bg: var(--tgc-white-1);
}

/* 深色模式 */
.dark .confirm-overlay {
  --confirm-title: var(--tgc-white-1);
  --confirm-bg: var(--tgc-dark-7);
}

.confirm-box {
  display: flex;
  width: 520px;
  height: 240px;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  padding: 10px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 15px;
  background: var(--confirm-bg);
  box-shadow: 0 0 10px var(--common-shadow-t-1);
  color: var(--tgc-yellow-3);
}

.confirm-title {
  width: 100%;
  border-bottom: 1px solid var(--confirm-title);
  color: var(--confirm-title);
  font-family: var(--font-title);
  font-size: 30px;
  text-align: center;
}

.confirm-subtitle {
  overflow: hidden;
  width: 100%;
  font-family: var(--font-text);
  font-size: 20px;
  text-align: center;
  text-overflow: ellipsis;
  white-space: normal;
  word-break: break-all;
}

.confirm-input {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: center;
  font-family: var(--font-text);
  font-size: 16px;
  gap: 10px;
}

.confirm-input-box {
  width: 50%;
  height: 100%;
  padding: 5px;
  border: 1px solid var(--confirm-title);
  border-radius: 5px;
  background: inherit;
  color: var(--confirm-title);
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
  width: 180px;
  height: 60px;
  align-items: center;
  justify-content: center;
  border-radius: 15px;
  cursor: pointer;
  font-family: var(--font-title);
  font-size: 20px;
}

.no-btn {
  border: 1px solid var(--tgc-yellow-1);
}

.ok-btn {
  background: var(--confirm-title);
}
</style>
