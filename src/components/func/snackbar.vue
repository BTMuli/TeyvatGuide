<template>
  <transition name="func-snackbar">
    <div class="func-snackbar-container" v-show="show">
      <div class="func-snackbar" :style="{ backgroundColor: data.color }">
        <slot name="text">
          <span class="func-snackbar-text">{{ data.text }}</span>
        </slot>
      </div>
    </div>
  </transition>
</template>
<script lang="ts" setup>
import { onMounted, reactive, ref } from "vue";

interface SnackbarProps {
  text: string;
  color?: string;
  timeout?: number;
}

const props = withDefaults(defineProps<SnackbarProps>(), {
  text: "",
  color: "success",
  timeout: 1500,
});

// 组件参数
const data = reactive<TGApp.Component.Snackbar.Params>({
  text: "",
});
const show = ref<boolean>(false);
let timer: NodeJS.Timeout;

onMounted(() => {
  displayBox(props);
});

// 根据输入的颜色转换为 hex 格式
function transColor(color: string): string {
  if (color.startsWith("#")) {
    return color;
  }
  switch (color) {
    case "success":
      return "#7ebd21";
    case "error":
      return "#e63f5a";
    case "warn":
      return "#ecb349";
    case "cancel":
      return "#2C313C";
    default:
      return color;
  }
}

function displayBox(params: TGApp.Component.Snackbar.Params): void {
  data.text = params.text;
  data.color = transColor(params.color ?? "success");
  data.timeout = params.timeout ?? 1500;
  show.value = true;
  clearTimeout(timer);
  timer = setTimeout(() => {
    show.value = false;
  }, data.timeout);
}

defineExpose({
  displayBox,
});
</script>
<style lang="css" scoped>
.func-snackbar-enter-active,
.func-snackbar-leave-active {
  transition: all 0.3s;
}

.func-snackbar-enter-from,
.func-snackbar-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

.func-snackbar-enter-to,
.func-snackbar-leave-from {
  opacity: 1;
  transform: translateY(0);
}

.func-snackbar-container {
  position: fixed;
  z-index: 999;
  bottom: 0;
  left: 0;
  display: flex;
  width: 100%;
  height: 80px;
  align-items: center;
  justify-content: center;
}

.func-snackbar {
  display: flex;
  min-width: 200px;
  height: 40px;
  align-items: center;
  justify-content: center;
  padding: 10px 20px;
  border-radius: 5px;
  box-shadow: 0 0 10px rgb(0 0 0 / 20%);
}

.func-snackbar-text {
  color: #fff;
  font-size: 16px;
  font-weight: 500;
}
</style>
