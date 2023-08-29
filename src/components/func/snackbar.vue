<template>
  <transition name="func-snackbar">
    <div v-show="show" class="func-snackbar" :style="{ backgroundColor: color }">
      <slot name="text">
        <span class="func-snackbar-text">{{ text }}</span>
      </slot>
    </div>
  </transition>
</template>
<script lang="ts" setup>
// vue
import { ref, reactive, onMounted } from "vue";

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
  color: "success",
  timeout: 1500,
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
      return "#41b883";
    case "error":
      return "#ff4d4f";
    case "warn":
      return "#faad14";
    case "info":
      return "#1890ff";
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
  transform: translateX(-50%) translateY(20px);
}

.func-snackbar-enter-to,
.func-snackbar-leave-from {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}

.func-snackbar {
  position: fixed;
  z-index: 999;
  bottom: 20px;
  left: 50%;
  display: flex;
  min-width: 200px;
  height: 40px;
  align-items: center;
  justify-content: center;
  padding: 10px 20px;
  border-radius: 5px;
  box-shadow: 0 0 10px rgb(0 0 0 / 20%);
  transform: translateX(-50%);
}

.func-snackbar .func-snackbar-text {
  color: #fff;
  font-size: 16px;
  font-weight: 500;
}
</style>
