<!-- Dialog 组件 -->
<template>
  <transition name="func-dialog-outer">
    <div v-show="show || showOuter" class="dialog-overlay" @click.self.prevent="handleOuter">
      <transition name="func-dialog-inner">
        <div v-show="showInner" class="dialog-box">
          <div class="dialog-title">{{ data.title }}</div>
          <div
            v-show="data?.text !== '' && data.mode === 'check'"
            :title="data.text"
            class="dialog-subtitle"
          >
            {{ data.text }}
          </div>
          <div v-show="data.mode === 'input'" class="dialog-input">
            <div v-show="data?.text !== ''" class="dialog-input-label">{{ data.text }}</div>
            <input
              ref="inputRef"
              v-model="inputDefault"
              :type="inputType"
              class="dialog-input-box"
              @keydown.enter="handleConfirm"
            />
          </div>
          <div class="dialog-btn-box">
            <button class="dialog-btn no-btn" @click="handleCancel">
              <span>></span>
              <span>{{ data.cancelLabel }}</span>
            </button>
            <button class="dialog-btn ok-btn" @click="handleConfirm">
              <span>></span>
              <span>{{ data.confirmLabel }}</span>
            </button>
          </div>
          <div v-if="!!data.otcancel" class="dialog-close-btn" title="关闭" @click="handleOuter">
            x
          </div>
        </div>
      </transition>
    </div>
  </transition>
</template>
<script lang="ts" setup>
import { computed, onMounted, ref, shallowRef, useTemplateRef, watch } from "vue";

import type { DialogCheckParams, DialogInputParams, DialogParams } from "./dialog.js";

const defaultProp: DialogParams = {
  title: "",
  text: "",
  mode: "check",
  otcancel: false,
  cancelLabel: "取消",
  confirmLabel: "确认",
};
const props = defineProps<DialogParams>();

// 组件参数
const data = shallowRef<DialogParams>(defaultProp);
const show = ref<boolean>(false);
const showOuter = ref<boolean>(false);
const showInner = ref<boolean>(false);
const dialogVal = ref<boolean | string | undefined>();

const inputDefault = ref<string>("");
const inputEl = useTemplateRef<HTMLInputElement>("inputRef");
const inputType = ref<string>("text");

const checkVal = computed<boolean | undefined>(() => {
  if (typeof dialogVal.value === "string") return dialogVal.value !== "";
  return dialogVal.value;
});
const inputVal = computed<string | false | undefined>(() => {
  if (typeof dialogVal.value === "string") return dialogVal.value;
  if (dialogVal.value === undefined) return undefined;
  return false;
});

watch(
  () => show.value,
  async () => {
    if (show.value) {
      showOuter.value = true;
      await new Promise<void>((resolve) => setTimeout(resolve, 100));
      showInner.value = true;
      return;
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 100));
    showInner.value = false;
    await new Promise<void>((resolve) => setTimeout(resolve, 300));
    showOuter.value = false;
  },
);

onMounted(async () => {
  if (props.mode === "input") {
    const param: DialogInputParams = {
      mode: "input",
      title: props.title,
      text: props.text,
      input: props.input,
      otcancel: props.otcancel,
      type: props.type,
    };
    await displayInputBox(param);
  } else {
    const param: DialogCheckParams = {
      mode: "check",
      title: props.title,
      text: props.text,
      otcancel: props.otcancel,
    };
    await displayCheckBox(param);
  }
});

async function displayCheckBox(params: DialogCheckParams): Promise<boolean | undefined> {
  data.value = {
    title: params.title,
    text: params.text ?? "",
    mode: "check",
    otcancel: params.otcancel ?? true,
    confirmLabel: params.confirmLabel ?? defaultProp.confirmLabel,
    cancelLabel: params.cancelLabel ?? defaultProp.cancelLabel,
  };
  show.value = true;
  return await new Promise<boolean | undefined>((resolve) => {
    watch(
      () => show.value,
      async () => {
        await new Promise<void>((res) => setTimeout(res, 500));
        resolve(checkVal.value);
      },
    );
  });
}

async function displayInputBox(params: DialogInputParams): Promise<string | false | undefined> {
  data.value = {
    title: params.title,
    text: params.text ?? "",
    mode: "input",
    otcancel: params.otcancel ?? true,
    confirmLabel: params.confirmLabel ?? defaultProp.confirmLabel,
    cancelLabel: params.cancelLabel ?? defaultProp.cancelLabel,
  };
  inputDefault.value = params.input ?? "";
  inputType.value = params.type ?? "text";
  show.value = true;
  return await new Promise<string | false | undefined>((resolve) => {
    setTimeout(() => inputEl.value?.focus(), 100);
    watch(
      () => show.value,
      async () => {
        await new Promise<void>((res) => setTimeout(res, 500));
        resolve(inputVal.value);
      },
    );
  });
}

// 确认
function handleConfirm(): void {
  if (data.value.mode === "input") {
    dialogVal.value = inputDefault.value;
    inputDefault.value = "";
    inputType.value = "text";
  } else dialogVal.value = true;
  show.value = false;
}

// 取消
function handleCancel(): void {
  dialogVal.value = false;
  show.value = false;
}

// 点击外部事件
function handleOuter(): void {
  if (data.value.otcancel) {
    dialogVal.value = undefined;
    show.value = false;
  }
}

defineExpose({ displayInputBox, displayCheckBox });
</script>
<style lang="scss" scoped>
.func-dialog-outer-enter-active,
.func-dialog-outer-leave-active,
.func-dialog-inner-enter-active {
  transition: all 0.3s;
}

.func-dialog-inner-leave-active {
  transition: all 0.5s ease-in-out;
}

.func-dialog-inner-enter-from {
  opacity: 0;
  transform: scale(1.5);
}

.func-dialog-inner-enter-to,
.func-dialog-inner-leave-from {
  opacity: 1;
  transform: scale(1);
}

.func-dialog-outer-enter-to,
.func-dialog-outer-leave-from {
  opacity: 1;
}

.func-dialog-outer-enter-from,
.func-dialog-outer-leave-to {
  opacity: 0;
}

.func-dialog-inner-leave-to {
  opacity: 0;
  transform: scale(0);
}

.dialog-overlay {
  /* 颜色变量 */
  --dialog-title: var(--tgc-dark-7);
  --dialog-bg: var(--tgc-white-1);

  position: fixed;
  z-index: var(--tgi-dialog);
  top: 0;
  left: 0;
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
}

/* 深色模式 */

.dark .dialog-overlay {
  --dialog-title: var(--tgc-white-1);
  --dialog-bg: var(--tgc-dark-7);
}

.dialog-box {
  position: relative;
  display: flex;
  min-width: 400px;
  max-width: 560px;
  min-height: 160px;
  max-height: 240px;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  padding: 8px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--dialog-bg);
  box-shadow: 0 0 10px var(--common-shadow-t-2);
  color: var(--tgc-yellow-3);
}

.dialog-title {
  width: 100%;
  padding-bottom: 4px;
  border-bottom: 1px solid var(--dialog-title);
  color: var(--dialog-title);
  font-family: var(--font-title);
  font-size: 24px;
  text-align: center;
}

.dialog-subtitle {
  overflow: hidden;
  width: 100%;
  font-family: var(--font-text);
  font-size: 16px;
  text-align: center;
  text-overflow: ellipsis;
  white-space: pre-wrap;
  word-break: break-all;
}

.dialog-input {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: center;
  font-family: var(--font-text);
  font-size: 16px;
  gap: 10px;
}

.dialog-input-box {
  width: 50%;
  height: 100%;
  padding: 5px;
  border: 1px solid var(--dialog-title);
  border-radius: 4px;
  background: inherit;
  color: var(--dialog-title);

  &:focus {
    border: 1px solid var(--tgc-yellow-3);
    outline: none;
  }
}

.dialog-btn-box {
  position: relative;
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: flex-end;
  margin-left: auto;
  column-gap: 12px;
}

.dialog-btn {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px 8px;
  border: unset;
  border-radius: 4px;
  background: unset;
  column-gap: 8px;
  cursor: pointer;
  font-size: 14px;

  span:first-child {
    font-weight: bold;
  }
}

.dialog-close-btn {
  position: absolute;
  right: 50%;
  bottom: -40px;
  display: flex;
  width: 24px;
  height: 24px;
  align-items: center;
  justify-content: center;
  padding-bottom: 3px;
  padding-left: 1px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 50%;
  background: var(--dialog-bg);
  color: var(--tgc-yellow-3);
  cursor: pointer;
  font-family: var(--font-title);
  font-size: 16px;
  line-height: 24px;
  transform: translateX(50%);
  user-select: none;
}

.no-btn {
  color: var(--tgc-od-white);

  &:hover {
    background: var(--common-shadow-1);
  }
}

.ok-btn {
  color: var(--box-text-1);

  &:hover {
    background: var(--common-shadow-2);
  }
}
</style>
