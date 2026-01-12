<!-- 基础悬浮窗组件 -->
<template>
  <transition enter-from-class="tolo-enter-from" name="tolo">
    <div v-if="showTolo" class="tolo-box" @click.self.prevent="toClick()">
      <transition enter-from-class="toli-enter-from" name="toli">
        <slot v-if="showToli" />
      </transition>
    </div>
  </transition>
</template>
<script lang="ts" setup>
import { ref, watch } from "vue";

type TolProps = {
  /** 背景 blur */
  blurVal?: string;
  /** 点击外部关闭 */
  outerClose?: boolean;
  /** zIndex */
  zIndex?: number;
};

const props = withDefaults(defineProps<TolProps>(), {
  blurVal: "20px",
  outerClose: false,
  zIndex: 100,
});

const model = defineModel<boolean>({ default: false });
const showTolo = ref<boolean>(false);
const showToli = ref<boolean>(false);

watch(
  () => model.value,
  async () => {
    if (model.value) {
      showTolo.value = true;
      showToli.value = true;
      return;
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 100));
    showToli.value = false;
    await new Promise<void>((resolve) => setTimeout(resolve, 300));
    showTolo.value = false;
  },
);

function toClick(): void {
  if (props.outerClose !== undefined && props.outerClose) return;
  model.value = false;
}
</script>
<style lang="css" scoped>
.tolo-enter-active,
.tolo-leave-active,
.toli-enter-active {
  transition: all 0.3s;
}

.toli-leave-active {
  transition: all 0.5s ease-in-out;
}

.tolo-enter-from,
.toli-enter-from {
  opacity: 0;
  transform: scale(1.5);
}

.tolo-enter-to,
.toli-enter-to {
  opacity: 1;
  transform: scale(1);
}

.tolo-leave-from {
  opacity: 1;
}

.tolo-leave-to {
  opacity: 0;
}

.toli-leave-from {
  opacity: 1;
  transform: scale(1);
}

.toli-leave-to {
  opacity: 0;
  transform: scale(0);
}

.tolo-box {
  position: fixed;
  z-index: v-bind(zIndex); /* stylelint-disable-line value-keyword-case */
  top: 0;
  left: 0;
  display: flex;
  overflow: hidden;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  -webkit-backdrop-filter: blur(v-bind(blurVal)); /* stylelint-disable-line value-keyword-case */
  backdrop-filter: blur(v-bind(blurVal)); /* stylelint-disable-line value-keyword-case */
  background: #00000080;
}
</style>
